# pip install google-cloud-language google-cloud-vision firebase-admin python-dotenv

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import BackgroundTasks
from typing import Optional
import asyncio
from content_verifier import ContentVerifier
import tempfile
import os
import json
from pydantic import BaseModel
from typing import List

app = FastAPI(
    title="Content Verification API",
    description="API for verifying post content",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize verifier once
content_verifier = ContentVerifier()

class ContentGuideline(BaseModel):
    description: str

class GuidelinesResponse(BaseModel):
    guidelines: List[ContentGuideline]

@app.post("/api/content-verification")
async def verify_content(
    background_tasks: BackgroundTasks,
    image: Optional[UploadFile] = File(None),
    title: Optional[str] = Form(None),
    caption: Optional[str] = Form(None)
):
    """
    Verify post content including image, title, and caption.
    Returns verification result with approval status.
    """
    background_tasks.add_task(content_verifier.process_pending)
    tmp_path = None  # Ensure defined for finally block
    try:
        if title:
            text_res = await content_verifier._check_text(title)
            if not text_res["is_safe"]:
                return {"approved": False, "message": "Title unsafe", "details": text_res["unsafe_reasons"]}
        if caption:
            text_res = await content_verifier._check_text(caption)
            if not text_res["is_safe"]:
                return {"approved": False, "message": "Caption unsafe", "details": text_res["unsafe_reasons"]}
        if image:
            buf = await image.read()
            suffix = os.path.splitext(image.filename)[1] or ".jpg"
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                tmp.write(buf)
                tmp_path = tmp.name
            img_safe = await content_verifier._check_image_safety(f"file://{tmp_path}")
            os.unlink(tmp_path)
            if not img_safe["is_safe"]:
                return {"approved": False, "message": "Image unsafe", "details": img_safe["unsafe_reasons"]}
            if img_safe["image_ai"]:
                return {"approved": True, "content_label": "AI GENERATED IMAGE"}
        return {"approved": True, "message": "Content approved"}
    except Exception as e:
        print(f"Error in content verification: {str(e)}")
        return {
            "approved": False,
            "message": "Error in content verification",
            "details": [str(e)]
        }
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

@app.get("/api/content-verification/guidelines", response_model=GuidelinesResponse)
async def get_guidelines():
    """
    Get content guidelines for posts.
    """
    guidelines = [
        ContentGuideline(description="No explicit or adult content"),
        ContentGuideline(description="No hate speech or discriminatory content"),
        ContentGuideline(description="No violence or graphic content"),
        ContentGuideline(description="No harassment or bullying"),
        ContentGuideline(description="No spam or misleading content"),
        ContentGuideline(description="AI-generated images must be labeled as such"),
        ContentGuideline(description="Content must be appropriate for all ages"),
        ContentGuideline(description="No illegal content or promotion of illegal activities")
    ]
    return GuidelinesResponse(guidelines=guidelines)

# Continuous verifier background task
@app.on_event("startup")
async def start_verifier_loop():
    async def verifier_loop():
        while True:
            try:
                await content_verifier.process_pending()
            except Exception as e:
                print(f"[VerifierLoop] Error: {e}")
            await asyncio.sleep(10)  # run every 10 seconds

    asyncio.create_task(verifier_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8080)
    
