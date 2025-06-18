import json
import os
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore
import math


class FirebaseDataFetcher:
    """Class to fetch data from Firebase Firestore and save as JSON"""

    def __init__(self, service_account_path="newcredential.json"):
        """Initialize the FirebaseDataFetcher with service account path"""
        self.service_account_path = service_account_path

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """
        Calculate the great circle distance between two points on the earth (specified in decimal degrees) Returns distance in kilometers"""
        R = 6371  # Radius of the earth in km
        
        # Convert decimal degrees to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Calculate differences
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Haversine formula
        a = (math.sin(dlat/2) * math.sin(dlat/2) + 
            math.cos(lat1_rad) * math.cos(lat2_rad) * 
            math.sin(dlon/2) * math.sin(dlon/2))
        
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c  # Distance in km
        
        return distance

    def fetch_firebase_data(self, user_lat, user_lon, radius_km):
        """Fetch all posts from Firebase Firestore and save as JSON"""
        
        try:
            # Check if service account file exists
            if not os.path.exists(self.service_account_path):
                print(f"❌ Service account file not found: {self.service_account_path}")
                print("💡 Please make sure the file path is correct and the file exists")
                return None
            
            # Initialize Firebase Admin SDK (check if already initialized)
            print("🔥 Initializing Firebase...")
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                print("Firebase already initialized")
            
            # Get Firestore client
            db = firestore.client()
            
            # Fetch all posts from 'posts' collection
            print("📡 Fetching posts from Firestore...")
            #fetching ordered by createdAt in descending order
            posts_ref = db.collection('posts').order_by('createdAt', direction=firestore.Query.DESCENDING)
            docs = posts_ref.stream()
            
            posts = []
            count = 0
            
            for doc in docs:
                
                data = doc.to_dict()
                
                print(f"📄 Processing document {doc.id}...")
                
                # Convert Firestore timestamps to strings if they exist
                created_at = data.get('createdAt', '')
                expires_at = data.get('expiresAt', '')
                
                if hasattr(created_at, 'isoformat'):
                    created_at = created_at.isoformat()
                elif hasattr(created_at, 'strftime'):
                    created_at = created_at.strftime('%Y-%m-%d %H:%M:%S')
                
                if hasattr(expires_at, 'isoformat'):
                    expires_at = expires_at.isoformat()
                elif hasattr(expires_at, 'strftime'):
                    expires_at = expires_at.strftime('%Y-%m-%d %H:%M:%S')
                
                # Structure the data like your Firebase schema
                location = data['location'] 
                
                post = {
                    'id': doc.id,
                    'caption': data.get('caption', ''),
                    'commentCount': data.get('commentCount', 0),
                    'createdAt': str(created_at),
                    'creatorId': data.get('creatorId', ''),
                    'description': data.get('description', ''),
                    'duration': data.get('duration', 0),
                    'expiresAt': str(expires_at),
                    'eventTimesOnly': data.get('eventTimesOnly', False),
                    'eventTimesSet': data.get('eventTimesSet', 0),
                    'imageUrl': data.get('imageUrl', ''),
                    'isAnonymous': data.get('isAnonymous', False),
                    'likedBy': data.get('likedBy', False),
                    'likes': data.get('likes', 0),
                    'location': {
                        'latitude': location.latitude,
                        'longitude': location.longitude
                        },
                    'tags': data.get('tags', []),
                    'title': data.get('title', ''),
                    'userAvatar': data.get('userAvatar', ''),
                    'username': data.get('username', ''),
                    # 'isVisible': data.get('is_visible', 0)
                    'verificationStatus': data.get('verification_status', 'Approved'),
                }
                #filter out posts by distance
                distance = self.calculate_distance(user_lat, user_lon, location.latitude, location.longitude)
                if distance <= radius_km and post['verificationStatus'] == 'Approved':
                    posts.append(post)
                    count +=1
                
                if count % 10 == 0:
                    print(f"📄 Processed {count} posts...")
            
            
            print(f"✅ Successfully fetched {len(posts)} posts")
            
            if len(posts) == 0:
                print("⚠️  No posts found in the collection. Check your collection name and permissions.")
                return {
                    'metadata': {
                    'totalPosts': len(posts),
                    'exportedAt': datetime.now().isoformat(),
                    'source': 'Firebase Firestore'
                },
                    'posts' : 'no matched post'
                }
            
            # Create output data
            output_data = {
                'metadata': {
                    'totalPosts': len(posts),
                    'exportedAt': datetime.now().isoformat(),
                    'source': 'Firebase Firestore'
                },
                'posts': posts
            }
            
            # Save to JSON file in current directory
            timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
            filename = f'firebase_posts_{timestamp}.json'
            
            # print(f"💾 Saving to file: {filename}")
            #for converting to json
            # ###############################################################################################3
            # try:
            #     with open(filename, 'w', encoding='utf-8') as f:
            #         json.dump(output_data, f, indent=2, ensure_ascii=False, default=str)
                
            #     # Verify file was created
            #     if os.path.exists(filename):
            #         file_size = os.path.getsize(filename)
            #         print(f"✅ File created successfully: {filename} ({file_size} bytes)")
            #     else:
            #         print(f"❌ File was not created: {filename}")
            #         return None
                    
            # except Exception as file_error:
            #     print(f"❌ Error writing file: {file_error}")
            #     return None
            #############################################################################################3
            
            # Print results
            print(f"\n🎉 Export completed!")
            # print(f"📁 File: {os.path.abspath(filename)}")
            print(f"📊 Total Posts: {len(posts)}")
            print(f"🖼️  Posts with Images: {len([p for p in posts if p['imageUrl']])}")
            print(f"❤️  Total Likes: {sum(p['likes'] for p in posts)}")
            print(f"💬 Total Comments: {sum(p['commentCount'] for p in posts)}")
            
            return output_data  # Return the data instead of file path for testing
            # return filename  # Uncomment this line if you want to return the filename
            
        except Exception as e:
            print(f"❌ Error: {e}")
            print(f"❌ Error type: {type(e).__name__}")
            print("\n💡 Troubleshooting checklist:")
            print("1. ✓ Check if service account key file exists and path is correct")
            print("2. ✓ Verify the service account has Firestore read permissions")
            print("3. ✓ Make sure your collection is named 'posts'")
            print("4. ✓ Check your internet connection")
            print("5. ✓ Verify Firebase project ID is correct in service account key")
            return None

    def test_firebase_connection(self):
        """Test Firebase connection and list collections"""
        
        try:
            if not os.path.exists(self.service_account_path):
                print(f"❌ Service account file not found: {self.service_account_path}")
                return False
            
            # Initialize Firebase
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.service_account_path)
                firebase_admin.initialize_app(cred)
            
            db = firestore.client()
            
            # List all collections
            print("📋 Available collections:")
            collections = db.collections()
            collection_names = []
            for collection in collections:
                collection_names.append(collection.id)
                print(f"  - {collection.id}")
            
            if 'posts' not in collection_names:
                print("⚠️  'posts' collection not found!")
                print("💡 Available collections:", collection_names)
                return False
            
            # Test reading from posts collection
            posts_ref = db.collection('posts')
            sample_docs = posts_ref.limit(1).stream()
            
            sample_count = 0
            for doc in sample_docs:
                sample_count += 1
                print(f"✅ Sample document found: {doc.id}")
                print(f"   Fields: {list(doc.to_dict().keys())}")
            
            if sample_count == 0:
                print("⚠️  'posts' collection is empty!")
                return False
            
            return True
            
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            return False

    def fetch_posts(self, curr_lat, curr_long):
        """Main method to fetch Firebase data with connection testing"""
        print("🚀 Firebase Data Fetcher - Python")
        print("⏰ Started at:", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        print("📂 Current directory:", os.getcwd())
        print("-" * 50)
        
        # First test the connection
        print("🔍 Testing Firebase connection...")
        if self.test_firebase_connection():
            print("✅ Connection test passed! Proceeding with data fetch...")
            print("-" * 50)
            
            result = self.fetch_firebase_data(curr_lat, curr_long, 50)
            
            if result:
                # print(f"\n✨ Success! Check your JSON file: {result}")
                # print(f"📍 Full path: {os.path.abspath(result)}")
                # print(result['posts'][:5])  # Print first 5 posts for verification
                return result
            else:
                print("\n💥 Export failed. Please check the error messages above.")
                return None
        else:
            print("❌ Connection test failed. Please fix the issues above before proceeding.")
            return None
# if __name__ == "__main__":
#     fetcher = FirebaseDataFetcher()
#     fetcher.fetch_posts()
        