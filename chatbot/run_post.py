import json
import os
from typing import List, Dict, Any
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput
from langchain.vectorstores import FAISS
from langchain.embeddings.base import Embeddings
from langchain.docstore.document import Document
from vec_search_sys import PostEmbeddingSystem
import vec_search_sys
from new import FirebaseDataFetcher
from dotenv import load_dotenv

class ContextFetch:
    """Class-based context fetching system for post embeddings and search"""
    
    def __init__(self):
        """Initialize the ContextFetch system with configuration"""
        load_dotenv()
        # Configuration
        self.PROJECT_ID = os.getenv("PROJECT_ID")
        self.REGION = "us-central1" 
        self.MODEL_ID = "text-embedding-005"
        self.DIMENSIONALITY = 700
        
        # Set up authentication
        os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'localgram-461614-74f492642d25.json'
        vertexai.init(project=self.PROJECT_ID, location=self.REGION)
        
        # Initialize components
        self.data_fetcher = FirebaseDataFetcher()
        self.system = PostEmbeddingSystem()
    
    def load_json_data(self, file_path: str) -> Dict:
        """Load JSON data from file"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return json.load(file)
    
    def main_with_your_data(self, my_question: str, curr_lat, curr_long):
        """Main function to run with your actual JSON data"""
        
        # Load data from firebase
        data = self.data_fetcher.fetch_posts(curr_lat, curr_long)
        
        # Load your JSON data
        # json_data = data  # Your JSON file
        posts = data['posts']
        if posts == 'no matched post':
            return "answer based on the user given query only"

        print(f"Loaded {len(posts)} posts from Firebase")

        # Initialize the system
        self.system.load_posts_from_data(posts)
        
        # Create vector store
        print("Creating embeddings and vector store...")
        self.system.create_vectorstore()
        
        # Save for future use
        self.system.save_vectorstore("post_vectorstore")
        
        # Example search queries based on your data
        # test_queries = [
        #     "some events happening",           # Should find traffic-related posts
        #     # "dangerous animal in city",         # Should find tiger post
        #     # "programming web development",      # Should find CSS/programming posts  
        #     # "weather rain clouds",              # Should find weather posts
        #     # "tree fell down danger",            # Should find tree danger post
        #     # "chemistry study difficult"         # Should find chemistry post
        # ]
        test_queries = [my_question]
        
        print("\n" + "="*80)
        print("TESTING SEARCH QUERIES")
        print("="*80)
        
        for query in test_queries:
            print(f"\n🔍 SEARCHING FOR: '{query}'")
            results = self.system.search_similar_posts(query, top_k=3)
            
            print(f"\n📋 TOP {len(results)} RESULTS:")
            print("-" * 60)
            
            similar_posts_list = []
            for i, post in enumerate(results, 1):
                dict_post = {
                    'combined_text': f"{post['title']} | {post['caption']} |{' '.join(post['tags']) if post['tags'] else 'none'}",
                    'post_id': post['post_id'],
                    'similarity_score': post['similarity_score'],
                    'created_at': post['created_at'],
                }
                similar_posts_list.append(dict_post)
            
            # for i, post in enumerate(similar_posts_list, 1):
            #     print(f"\n{i}. Post ID: {post['post_id']}")
            #     print(f"   Combined Text: {post['combined_text']}")
            # print("\n" + "="*60)
            return similar_posts_list