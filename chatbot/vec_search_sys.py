import json
import os
from typing import List, Dict, Any
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
from langchain.vectorstores import FAISS
from langchain.embeddings.base import Embeddings
from langchain.docstore.document import Document
import numpy as np
from dotenv import load_dotenv

load_dotenv()
# Configuration
PROJECT_ID = os.getenv("PROJECT_ID")
REGION = "us-central1"
MODEL_ID = "text-embedding-005"
DIMENSIONALITY = 512

# Set up authentication
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'localgram-461614-74f492642d25.json'
vertexai.init(project=PROJECT_ID, location=REGION)

class VertexAIEmbeddings(Embeddings):
    """Custom LangChain Embeddings wrapper for Vertex AI"""
    
    def __init__(self, model_id: str = MODEL_ID, dimensionality: int = DIMENSIONALITY):
        self.model = TextEmbeddingModel.from_pretrained(model_id)
        self.dimensionality = dimensionality
    
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed search docs."""
        embeddings = []
        for text in texts:
            text_input = TextEmbeddingInput(text, "RETRIEVAL_DOCUMENT")
            result = self.model.get_embeddings([text_input], output_dimensionality=self.dimensionality)
            embeddings.append(result[0].values)
        return embeddings
    
    def embed_query(self, text: str) -> List[float]:
        """Embed query text."""
        text_input = TextEmbeddingInput(text, "RETRIEVAL_QUERY")
        result = self.model.get_embeddings([text_input], output_dimensionality=self.dimensionality)
        return result[0].values

class PostEmbeddingSystem:
    def __init__(self):
        self.embeddings = VertexAIEmbeddings()
        self.vectorstore = None
        self.posts_data = []
    
    def load_posts_from_json(self, json_file_path: str):
        """Load posts from JSON file"""
        with open(json_file_path, 'r', encoding='utf-8') as file:
            data = json.load(file)
            self.posts_data = data['posts']
    
    def load_posts_from_data(self, posts_data: List[Dict]):
        """Load posts from already parsed data"""
        self.posts_data = posts_data
    
    def prepare_documents(self) -> List[Document]:
        """Prepare documents for vector store"""
        documents = []
        
        for post in self.posts_data:
            # Combine caption, title, and tags into searchable text
            caption = post.get('caption', '')
            title = post.get('title', '')
            tags = ' '.join(post.get('tags', []))
            
            # Create combined text for embedding
            combined_text = f"Title: {title}\nCaption: {caption}\nTags: {tags}".strip()
            
            # Create metadata
            metadata = {
                'post_id': post.get('id', ''),
                'title': title,
                'caption': caption,
                'tags': post.get('tags', []),
                'username': post.get('username', ''),
                'likes': post.get('likes', 0),
                'comment_count': post.get('commentCount', 0),
                'created_at': post.get('createdAt', ''),
                'image_url': post.get('imageUrl', ''),
                'combined_text': combined_text
            }
            
            # Create document
            doc = Document(
                page_content=combined_text,
                metadata=metadata
            )
            documents.append(doc)
        
        return documents
    
    def create_vectorstore(self):
        """Create and populate the vector store"""
        documents = self.prepare_documents()
        print(f"Creating vector store with {len(documents)} documents...")
        
        # Create FAISS vector store
        self.vectorstore = FAISS.from_documents(
            documents=documents,
            embedding=self.embeddings
        )
        print("Vector store created successfully!")
    
    def save_vectorstore(self, path: str = "post_vectorstore"):
        """Save the vector store to disk"""
        if self.vectorstore:
            self.vectorstore.save_local(path)
            print(f"Vector store saved to {path}")
    
    def load_vectorstore(self, path: str = "post_vectorstore"):
        """Load vector store from disk"""
        try:
            self.vectorstore = FAISS.load_local(path, self.embeddings)
            print(f"Vector store loaded from {path}")
        except Exception as e:
            print(f"Could not load vector store: {e}")
    
    def search_similar_posts(self, query: str, top_k: int = 4) -> List[Dict]:
        """Search for similar posts based on query"""
        if not self.vectorstore:
            raise ValueError("Vector store not initialized. Please create it first.")
        
        print(f"Searching for: '{query}'")
        
        # Perform similarity search
        # results = self.vectorstore.similarity_search_with_score(query, k=top_k)
        
        retriever = self.vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": top_k})
        results = retriever.invoke(query)
        
        similar_posts = []
        for doc in results:
            metadata = doc.metadata
            result = {
                'post_id': metadata['post_id'],
                'title': metadata['title'],
                'caption': metadata['caption'],
                'tags': metadata['tags'],
                'username': metadata['username'],
                'likes': metadata['likes'],
                'comment_count': metadata['comment_count'],
                'created_at': metadata['created_at'],
                'image_url': metadata['image_url'],
                'similarity_score': float(100),
                'combined_text': metadata['combined_text']
            }
            similar_posts.append(result)
        
        return similar_posts
    
    def display_search_results(self, results: List[Dict]):
        """Display search results in a formatted way"""
        print(f"\n{'='*60}")
        print(f"Found {len(results)} similar posts:")
        print(f"{'='*60}")
        
        similar_posts_list = []
        for i, post in enumerate(results, 1):
            dict_post ={
                'combined_text': f"{i} {post['title']} {post['caption']} {' '.join(post['tags']) if post['tags'] else 'none'}",
                'post_id': post['post_id'],
                'similarity_score': post['similarity_score'],
                'created_at': post['created_at'],
            }
            similar_posts_list.append(dict_post)
        for i, post in enumerate(similar_posts_list, 1):
            print(f"\n{i}. Post ID: {post['post_id']}")
            print(f"   Combined Text: {post['combined_text']}")
            # print(f"\n{i}. Post ID: {post['post_id']}")
            # print(f"   Title: {post['title']}")
            # print(f"   Caption: {post['caption']}")
            # print(f"   Tags: {', '.join(post['tags']) if post['tags'] else 'None'}")
            # print(f"   Author: {post['username']}")
            # print(f"   Likes: {post['likes']} | Comments: {post['comment_count']}")
            # print(f"   Similarity Score: {post['similarity_score']:.4f}")
            # print(f"   Created: {post['created_at']}")
            # print("-" * 60)

