import os
import json
from dotenv import load_dotenv

load_dotenv()

# Parse Firebase credentials - handle both file path (local) and JSON string (Render)
firebase_creds_env = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON')
if firebase_creds_env and firebase_creds_env.strip().startswith('{'):
    # It's a JSON string (from Render)
    FIREBASE_SERVICE_ACCOUNT = json.loads(firebase_creds_env)
elif firebase_creds_env and os.path.isfile(firebase_creds_env):
    # It's a file path (local development)
    with open(firebase_creds_env, 'r') as f:
        FIREBASE_SERVICE_ACCOUNT = json.load(f)
else:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON must be either a valid file path or a JSON string")

FIRESTORE_PROJECT_ID = os.getenv('FIRESTORE_PROJECT_ID')
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
