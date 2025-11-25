# DocForge AI - Intelligent Document Generation Platform

<div align="center">

![DocForge AI](https://img.shields.io/badge/DocForge-AI%20Powered-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-2.0.0-green?style=for-the-badge)

**Create professional documents and presentations with AI-powered section-by-section generation**

[Features](#-features) • [Installation](#-installation) • [Usage](#-usage) • [Deployment](#-deployment)

</div>

---

## 🎯 Overview

DocForge AI is a cutting-edge document generation platform that revolutionizes how you create professional Word documents and PowerPoint presentations. Using **Meta Llama 3.3 70B Instruct** via OpenRouter, it provides intelligent, section-by-section content generation with advanced editing capabilities.

### Why DocForge AI?

- ✨ **AI-Powered Generation** - Leverages state-of-the-art Llama 3.3 70B model
- 📝 **Section-by-Section Control** - Generate and refine individual sections independently
- 🎨 **Professional Formatting** - Export polished Word docs and PowerPoint slides
- 🔄 **Iterative Refinement** - Improve content with natural language instructions
- 💬 **Collaboration Features** - Comments, feedback, and revision tracking
- 🎯 **AI Template Suggestions** - Let AI suggest document structure based on your topic
- 🔐 **Secure & Private** - Firebase authentication with Google Sign-In support

---

## ✨ Features

### Core Capabilities

#### 1. **Intelligent Document Creation**

- **Word Documents (.docx)** - Professional reports, articles, and documentation
- **PowerPoint Presentations (.pptx)** - Engaging slides with structured content
- **AI-Suggested Outlines** - One-click template generation from your topic
- **Manual Structure Control** - Define sections/slides before generation

#### 2. **Advanced Editing Suite**

- **AI Refinement** - Improve sections with prompts like:
  - "Make this more formal and professional"
  - "Convert to bullet points"
  - "Add specific examples and statistics"
  - "Shorten to 150 words"
- **Feedback System** - Like/dislike tracking for quality control
- **Comments** - Add notes and feedback on individual sections
- **Database Persistence** - All changes stored in Firestore

#### 3. **Professional Export**

- **Word Documents** - Proper heading styles, bullet points, bold/italic formatting
- **PowerPoint Slides** - Title slides, section dividers, professional layouts
- **Markdown Support** - Full markdown parsing in exports
- **Quality Output** - Publication-ready documents

#### 4. **Project Management**

- **Dashboard** - View all your projects at a glance
- **History** - Access previous projects with all edits preserved
- **Resume Editing** - Continue where you left off
- **Multi-User Support** - Secure user authentication

---

## 🛠️ Tech Stack

### Frontend

- React 18, Vite, TailwindCSS
- Firebase SDK, Axios, React Router
- Lucide Icons

### Backend

- FastAPI (Python), Firebase Admin SDK
- Google Firestore (NoSQL Database)
- OpenRouter API (Llama 3.3 70B)
- python-docx, python-pptx

---

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- Firebase Project (Firestore + Authentication)
- OpenRouter API Key
- Git

---

## 🔧 Installation

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/docforge-ai.git
cd docforge-ai
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

Create `backend/.env`:

```env
OPENROUTER_API_KEY=your_openrouter_api_key
FIREBASE_SERVICE_ACCOUNT_JSON=path/to/serviceAccount.json
FIRESTORE_PROJECT_ID=your-firebase-project-id
FRONTEND_URL=http://localhost:5173
```

### 3. Firebase Configuration

1. Create Firebase project at [console.firebase.google.com](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication (Email/Password + Google)
4. Generate service account key → Save as `backend/serviceAccount.json`

### 4. Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_API_BASE_URL=http://localhost:8000
```

### 5. Get OpenRouter API Key

1. Visit [openrouter.ai](https://openrouter.ai/)
2. Sign up and add credits
3. Generate API key
4. Add to `backend/.env`

---

## 🎮 Usage

### Start Development Servers

**Terminal 1 - Backend:**

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Creating Your First Document

1. **Sign Up / Login**
2. **Dashboard** → "Generate New Document"
3. **Enter Topic** (e.g., "Market Analysis of Electric Vehicles")
4. **Select Format** (Document or Presentation)
5. **Click "✨ AI-Suggest Outline"** (or manually define structure)
6. **Generate** - AI creates content section-by-section
7. **Refine** - Improve sections with AI assistance
8. **Export** - Download professional document

---

## 📦 Project Structure

```
DocForge/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── models.py            # Pydantic models
│   ├── ai_client.py        # Llama integration
│   ├── firestore_client.py # Database operations
│   ├── exporter.py         # Document export
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Dependencies
│   └── .env                # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Generate.jsx
│   │   │   ├── Editor.jsx
│   │   │   └── Login.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── config/
│   │   │   ├── api.js
│   │   │   └── firebase.js
│   │   └── App.jsx
│   ├── package.json
│   └── .env
├── .gitignore
└── README.md
```

---

## 🚀 Deployment

### Backend (Render, Railway, Fly.io)

1. Set environment variables:

   ```
   OPENROUTER_API_KEY=...
   FIREBASE_SERVICE_ACCOUNT_JSON=...
   FIRESTORE_PROJECT_ID=...
   FRONTEND_URL=https://your-domain.com
   ```

2. Start command:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```

3. Update CORS in `main.py` with production URL

### Frontend (Vercel, Netlify)

1. Build:

   ```bash
   npm run build
   ```

2. Set environment variables (all VITE\_\* vars)

3. Deploy `dist` folder

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{projectId} {
      allow read, write: if request.auth != null &&
                         resource.data.user_id == request.auth.uid;

      match /sections/{sectionId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}
```

---

## 📊 API Endpoints

### Authentication

- `POST /auth/verify` - Verify token

### Projects

- `GET /projects` - List projects
- `POST /projects` - Create project
- `GET /projects/{id}` - Get project
- `GET /projects/{id}/content` - Get sections

### Generation

- `POST /generate-structured-document` - Generate with structure
- `POST /projects/generate-outline` - AI-suggest outline

### Sections

- `POST /projects/{id}/sections/{sid}/refine` - Refine section
- `POST /projects/{id}/sections/{sid}/feedback` - Like/dislike
- `POST /projects/{id}/sections/{sid}/comment` - Add comment

### Export

- `GET /projects/{id}/export/{type}` - Export document

---

## 🔒 Security

- Firebase Auth with JWT tokens
- User-based access control
- Environment variables for secrets
- CORS configuration
- Pydantic input validation
- Firestore security rules

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- Meta AI - Llama 3.3 70B
- OpenRouter - AI model access
- Firebase - Auth & database
- FastAPI, React, TailwindCSS

---

## 🗺️ Roadmap

- [ ] PDF export
- [ ] Real-time collaboration
- [ ] Image upload
- [ ] Custom templates
- [ ] Mobile app
- [ ] Multi-language support
- [ ] Voice input

---

<div align="center">

**Built with ❤️ for modern document creation**

[⭐ Star on GitHub](https://github.com/yourusername/docforge-ai)

</div>
