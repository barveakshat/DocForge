import os
from dotenv import load_dotenv

load_dotenv()

FIREBASE_SERVICE_ACCOUNT_JSON = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
FIRESTORE_PROJECT_ID = os.getenv('FIRESTORE_PROJECT_ID')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
