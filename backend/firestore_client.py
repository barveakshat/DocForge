import firebase_admin
from firebase_admin import credentials, firestore, auth
from config import FIREBASE_SERVICE_ACCOUNT, FIRESTORE_PROJECT_ID
from datetime import datetime
from typing import Optional, List, Dict, Any

# Initialize Firebase with the parsed credentials (dict)
try:
    cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT)
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"WARNING: Firebase initialization failed: {e}")
    raise

db = firestore.client()

class FirestoreDB:
    def __init__(self):
        self.db = db
    
    async def verify_token(self, token: str) -> dict:
        """Verify Firebase ID token"""
        try:
            decoded_token = auth.verify_id_token(token)
            return decoded_token
        except Exception as e:
            raise Exception(f"Token verification failed: {str(e)}")
    
    async def create_project(self, user_id: str, data: dict) -> str:
        """Create a new project"""
        project_ref = self.db.collection('projects').document()
        project_data = {
            **data,
            'user_id': user_id,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow(),
            'content': ''
        }
        project_ref.set(project_data)
        return project_ref.id
    
    async def get_project(self, project_id: str) -> Optional[dict]:
        """Get project by ID"""
        doc = self.db.collection('projects').document(project_id).get()
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    async def get_user_projects(self, user_id: str) -> List[dict]:
        """Get all projects for a user"""
        projects = []
        docs = self.db.collection('projects').where('user_id', '==', user_id).stream()
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            projects.append(data)
        return projects
    
    async def update_project(self, project_id: str, data: dict) -> None:
        """Update project"""
        self.db.collection('projects').document(project_id).update({
            **data,
            'updated_at': datetime.utcnow()
        })
    
    async def create_version(self, project_id: str, content: str, metadata: dict = None) -> str:
        """Save a version of the project"""
        versions_ref = self.db.collection('projects').document(project_id).collection('versions')
        
        existing_versions = versions_ref.stream()
        version_number = len(list(existing_versions)) + 1
        
        version_ref = versions_ref.document()
        version_data = {
            'version_number': version_number,
            'content': content,
            'created_at': datetime.utcnow(),
            'metadata': metadata or {}
        }
        version_ref.set(version_data)
        return version_ref.id
    
    async def get_versions(self, project_id: str) -> List[dict]:
        """Get all versions for a project"""
        versions = []
        docs = (self.db.collection('projects').document(project_id)
                .collection('versions').order_by('created_at', direction=firestore.Query.DESCENDING).stream())
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            versions.append(data)
        return versions
    
    async def get_version(self, project_id: str, version_id: str) -> Optional[dict]:
        """Get a specific version"""
        doc = (self.db.collection('projects').document(project_id)
               .collection('versions').document(version_id).get())
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    async def create_comment(self, project_id: str, user_id: str, text: str) -> str:
        """Add a comment to a project"""
        comment_ref = (self.db.collection('projects').document(project_id)
                       .collection('comments').document())
        comment_data = {
            'user_id': user_id,
            'text': text,
            'created_at': datetime.utcnow()
        }
        comment_ref.set(comment_data)
        return comment_ref.id
    
    async def get_comments(self, project_id: str) -> List[dict]:
        """Get all comments for a project"""
        comments = []
        docs = (self.db.collection('projects').document(project_id)
                .collection('comments').order_by('created_at', direction=firestore.Query.DESCENDING).stream())
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            comments.append(data)
        return comments
    
    async def save_feedback(self, project_id: str, user_id: str, feedback_type: str, content: str) -> None:
        """Save user feedback (like/dislike)"""
        feedback_ref = (self.db.collection('projects').document(project_id)
                        .collection('feedback').document())
        feedback_data = {
            'user_id': user_id,
            'type': feedback_type,
            'content': content,
            'created_at': datetime.utcnow()
        }
        feedback_ref.set(feedback_data)
    
    # New methods for section-by-section workflow
    async def create_section(self, project_id: str, section_data: dict) -> str:
        """Create a new section in a project"""
        section_ref = (self.db.collection('projects').document(project_id)
                       .collection('sections').document())
        section_data['created_at'] = datetime.utcnow()
        section_data['updated_at'] = datetime.utcnow()
        section_ref.set(section_data)
        return section_ref.id
    
    async def get_sections(self, project_id: str) -> List[dict]:
        """Get all sections for a project, ordered by order field"""
        sections = []
        docs = (self.db.collection('projects').document(project_id)
                .collection('sections').order_by('order').stream())
        for doc in docs:
            data = doc.to_dict()
            data['id'] = doc.id
            sections.append(data)
        return sections
    
    async def get_section(self, project_id: str, section_id: str) -> Optional[dict]:
        """Get a specific section"""
        doc = (self.db.collection('projects').document(project_id)
               .collection('sections').document(section_id).get())
        if doc.exists:
            data = doc.to_dict()
            data['id'] = doc.id
            return data
        return None
    
    async def update_section(self, project_id: str, section_id: str, data: dict) -> None:
        """Update section content and metadata"""
        self.db.collection('projects').document(project_id).collection('sections').document(section_id).update({
            **data,
            'updated_at': datetime.utcnow()
        })
    
    async def add_section_comment(self, project_id: str, section_id: str, comment: str) -> None:
        """Add a comment to a section"""
        section_ref = (self.db.collection('projects').document(project_id)
                       .collection('sections').document(section_id))
        section_doc = section_ref.get()
        if section_doc.exists:
            current_comments = section_doc.to_dict().get('comments', [])
            current_comments.append({
                'text': comment,
                'created_at': datetime.utcnow()
            })
            section_ref.update({
                'comments': current_comments,
                'updated_at': datetime.utcnow()
            })

firestore_db = FirestoreDB()

