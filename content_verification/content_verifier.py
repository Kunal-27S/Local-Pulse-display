import os
import time
import asyncio
from typing import Dict, Any, List
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud import language_v1, vision_v1
from google.oauth2 import service_account
from concurrent.futures import ThreadPoolExecutor


class ContentVerifier:
    def __init__(self) -> None:
        load_dotenv()

        cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "firebase-credentials.json")

        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(cred_path))
        self.db = firestore.client()

        gcp_credentials = service_account.Credentials.from_service_account_file(cred_path)

        self.gcp_nl = language_v1.LanguageServiceClient(credentials=gcp_credentials)
        self.vision_client = vision_v1.ImageAnnotatorClient(credentials=gcp_credentials)

        self.min_delay = 1.0
        self._last_api_call = 0.0

    async def _rate_limit(self) -> None:
        diff = time.time() - self._last_api_call
        if diff < self.min_delay:
            await asyncio.sleep(self.min_delay - diff)
        self._last_api_call = time.time()

    async def _check_text(self, text: str) -> Dict[str, Any]:
        def analyze():
            document = language_v1.Document(content=text, type_=language_v1.Document.Type.PLAIN_TEXT)
            sentiment = self.gcp_nl.analyze_sentiment(request={"document": document}).document_sentiment

            categories = []
            try:
                cat_resp = self.gcp_nl.classify_text(request={"document": document})
                categories = [c.name for c in cat_resp.categories]
            except Exception:
                pass

            reasons = []
            if sentiment.score < -0.5 and sentiment.magnitude > 1.5:
                reasons.append(f"Negative sentiment ({sentiment.score:.2f})")

            for cat in categories:
                low = cat.lower()
                if any(k in low for k in ("adult", "violence", "hate", "expletive", "drug", "crime")):
                    reasons.append(f"Category: {cat}")

            return reasons

        loop = asyncio.get_event_loop()
        reasons = await loop.run_in_executor(ThreadPoolExecutor(), analyze)
        return {"is_safe": not reasons, "unsafe_reasons": reasons}

    async def _check_image_safety(self, image_url: str) -> Dict[str, Any]:
        def analyze():
            image = vision_v1.Image()
            image.source.image_uri = image_url

            safe_search_response = self.vision_client.safe_search_detection(image=image)
            ss = safe_search_response.safe_search_annotation

            unsafe = []
            for attr in ("adult", "violence", "racy", "medical"):
                level = getattr(ss, attr, None)
                if level in (vision_v1.Likelihood.LIKELY, vision_v1.Likelihood.VERY_LIKELY):
                    unsafe.append(attr)

            '''
            ai_generated = ss.spoof in (
                vision_v1.Likelihood.POSSIBLE,
                vision_v1.Likelihood.LIKELY,
                vision_v1.Likelihood.VERY_LIKELY,
            )

            label_response = self.vision_client.label_detection(image=image)
            labels = [label.description.lower() for label in label_response.label_annotations]
            ai_keywords = {"ai", "artificial", "synthetic", "generated", "rendering", "cg", "digital art", "fake"}
            if any(any(word in label for word in ai_keywords) for label in labels):
                ai_generated = True
            '''
            
            ai_generated = False

            return unsafe, ai_generated

        loop = asyncio.get_event_loop()
        unsafe_reasons, ai_flag = await loop.run_in_executor(ThreadPoolExecutor(), analyze)
        return {
            "is_safe": not unsafe_reasons,
            "unsafe_reasons": unsafe_reasons,
            "image_ai": ai_flag,
        }

    async def _process_post(self, post_id: str, post: Dict[str, Any]) -> None:
        updates: Dict[str, Any] = {}
        rejected_reasons: List[str] = []

        combined_text = f"{post.get('title','')}\n{post.get('caption') or post.get('description','')}".strip()
        if self._should_run_field_local(post, "text_safe"):
            if combined_text:
                tr = await self._check_text(combined_text)
                updates["text_safe"] = tr["is_safe"]
                if not tr["is_safe"]:
                    rejected_reasons.extend(tr["unsafe_reasons"])
            else:
                updates["text_safe"] = True
        else:
            updates["text_safe"] = post.get("text_safe", False)

        image_url = post.get("imageUrl")
        if self._should_run_field_local(post, "image_safe") and image_url:
            ir = await self._check_image_safety(image_url)
            updates["image_safe"] = ir["is_safe"]
            updates["image_ai"] = ir["image_ai"]
            if not ir["is_safe"]:
                rejected_reasons.extend(ir["unsafe_reasons"])
        else:
            updates["image_safe"] = post.get("image_safe", True)
            updates["image_ai"] = post.get("image_ai", False)

        if rejected_reasons:
            updates.update({
                "verification_status": "Rejected",
                "is_visible": False,
                "rejected_reason": rejected_reasons,
            })
        else:
            updates.update({
                "verification_status": "Approved",
                "is_visible": True,
            })

        updates["last_verified"] = firestore.SERVER_TIMESTAMP
        self.db.collection("posts").document(post_id).update(updates)
        print(f"[Verifier] {post_id} -> {updates['verification_status']} | Reasons: {rejected_reasons}")

    def _should_run_field_local(self, post: Dict[str, Any], field: str) -> bool:
        status = post.get(field, "not_processed")
        if status == "not_processed":
            return True
        if status == "cooldown":
            cooldown_until = post.get(f"{field}_cooldown_until")
            if not cooldown_until:
                return True
            if hasattr(cooldown_until, "timestamp"):
                import datetime as _dt
                return _dt.datetime.utcnow() >= _dt.datetime.utcfromtimestamp(cooldown_until.timestamp())
            return True
        return False

    async def process_pending(self) -> None:
        pending_cursor = (
            self.db.collection("posts")
            .where("verification_status", "in", ["None", "pending", None])
            .stream()
        )
        for doc in pending_cursor:
            post = doc.to_dict()
            if not any(self._should_run_field_local(post, f) for f in ["text_safe", "image_safe", "image_ai"]):
                continue
            await self._process_post(doc.id, post)
