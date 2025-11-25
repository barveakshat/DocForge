from fastapi import FastAPI, HTTPException, Depends, Header, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional, List
import os

from models import (
    ProjectCreate, ProjectResponse, GenerateOutlineRequest,
    GenerateRequest, GenerateResponse, VersionCreate, VersionResponse,
    CommentCreate, CommentResponse, FeedbackRequest, ExportRequest,
    AuthVerifyResponse, DocumentGenerateRequest, DocumentGenerateResponse,
    StructuredDocumentRequest, SectionResponse, ProjectContentResponse,
    RefineRequest, SectionFeedbackRequest, SectionCommentRequest, ExportDocumentRequest
)
from firestore_client import firestore_db
from ai_client import ai_client as gemini_client
from exporter import exporter
from filters import sanitize_content
from config import FRONTEND_URL

app = FastAPI(title="DocForge API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def get_current_user(authorization: Optional[str] = Header(None)):
    """Verify Firebase token and extract user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    try:
        token = authorization.replace("Bearer ", "")
        decoded_token = await firestore_db.verify_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

@app.get("/")
async def root():
    return {"message": "DocForge API is running", "version": "1.0.0"}

@app.post("/auth/verify", response_model=AuthVerifyResponse)
async def verify_auth(user = Depends(get_current_user)):
    """Verify Firebase authentication token"""
    return AuthVerifyResponse(
        uid=user['uid'],
        email=user.get('email'),
        message="Token verified successfully"
    )

@app.post("/projects/generate-outline")
async def generate_outline(
    request: GenerateOutlineRequest,
    user = Depends(get_current_user)
):
    """Generate document outline or slide structure"""
    try:
        outline = await gemini_client.generate_outline(request.description, request.type)
        return {"outline": outline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate,
    user = Depends(get_current_user)
):
    """Create a new project"""
    try:
        project_data = project.dict()
        if project_data.get('outline'):
            project_data['outline'] = sanitize_content(project_data['outline'])
        
        project_id = await firestore_db.create_project(user['uid'], project_data)
        created_project = await firestore_db.get_project(project_id)
        return created_project
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects", response_model=List[ProjectResponse])
async def get_projects(user = Depends(get_current_user)):
    """Get all projects for the current user"""
    try:
        projects = await firestore_db.get_user_projects(user['uid'])
        return projects
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user = Depends(get_current_user)
):
    """Get a specific project"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/generate", response_model=GenerateResponse)
async def generate_content(
    project_id: str,
    request: GenerateRequest,
    user = Depends(get_current_user)
):
    """Generate content for a project section"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        result = await gemini_client.generate_text(request.prompt, request.context)
        
        generated_text = sanitize_content(result['text'])
        
        return GenerateResponse(
            generated_text=generated_text,
            model=result['model']
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/versions", response_model=VersionResponse)
async def save_version(
    project_id: str,
    version: VersionCreate,
    user = Depends(get_current_user)
):
    """Save a new version of the project"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        sanitized_content = sanitize_content(version.content)
        
        metadata = {
            'user_id': user['uid'],
            'email': user.get('email'),
            'model': 'gemini-pro'
        }
        
        version_id = await firestore_db.create_version(project_id, sanitized_content, metadata)
        
        await firestore_db.update_project(project_id, {'content': sanitized_content})
        
        saved_version = await firestore_db.get_version(project_id, version_id)
        return saved_version
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/versions", response_model=List[VersionResponse])
async def get_versions(
    project_id: str,
    user = Depends(get_current_user)
):
    """Get all versions of a project"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        versions = await firestore_db.get_versions(project_id)
        return versions
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/versions/{version_id}", response_model=VersionResponse)
async def get_version(
    project_id: str,
    version_id: str,
    user = Depends(get_current_user)
):
    """Get a specific version"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        version = await firestore_db.get_version(project_id, version_id)
        if not version:
            raise HTTPException(status_code=404, detail="Version not found")
        
        return version
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/comments", response_model=CommentResponse)
async def add_comment(
    project_id: str,
    comment: CommentCreate,
    user = Depends(get_current_user)
):
    """Add a comment to a project"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        sanitized_text = sanitize_content(comment.text)
        
        comment_id = await firestore_db.create_comment(project_id, user['uid'], sanitized_text)
        
        saved_comment = {
            'id': comment_id,
            'text': sanitized_text,
            'user_id': user['uid'],
            'created_at': None
        }
        
        return saved_comment
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/comments", response_model=List[CommentResponse])
async def get_comments(
    project_id: str,
    user = Depends(get_current_user)
):
    """Get all comments for a project"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        comments = await firestore_db.get_comments(project_id)
        return comments
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/feedback")
async def save_feedback(
    project_id: str,
    feedback: FeedbackRequest,
    user = Depends(get_current_user)
):
    """Save user feedback (like/dislike)"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        await firestore_db.save_feedback(project_id, user['uid'], feedback.type, feedback.content)
        
        return {"message": "Feedback saved successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/export")
async def export_project(
    project_id: str,
    export_request: ExportRequest,
    user = Depends(get_current_user)
):
    """Export project to .docx or .pptx"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        if project['type'] == 'docx':
            filepath = exporter.export_docx(
                project['title'],
                export_request.content,
                project.get('outline')
            )
        elif project['type'] == 'pptx':
            filepath = exporter.export_pptx(
                project['title'],
                export_request.content,
                project.get('outline')
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid project type")
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Export failed")
        
        return FileResponse(
            filepath,
            media_type='application/octet-stream',
            filename=os.path.basename(filepath)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-outline")
async def generate_outline_simple(
    request: dict,
    user = Depends(get_current_user)
):
    """Generate document outline from prompt (simplified endpoint)"""
    try:
        prompt = request.get('prompt')
        document_type = request.get('document_type', 'docx')
        
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        # Generate outline using AI
        outline = await gemini_client.generate_outline(
            description=prompt,
            doc_type=document_type
        )
        
        return {"outline": outline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-document", response_model=DocumentGenerateResponse)
async def generate_document(
    request: DocumentGenerateRequest,
    user = Depends(get_current_user)
):
    """Generate a complete document from prompt"""
    try:
        # Generate full document using Gemini
        result = await gemini_client.generate_full_document(
            prompt=request.prompt,
            doc_type=request.document_type,
            outline=request.outline
        )
        
        # Sanitize content
        sanitized_content = sanitize_content(result['content'])
        
        # Create preview text (first 500 chars)
        preview_text = sanitized_content[:500] + "..." if len(sanitized_content) > 500 else sanitized_content
        
        return DocumentGenerateResponse(
            content=sanitized_content,
            outline_used=result['outline'],
            preview_text=preview_text,
            document_type=request.document_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/export-document")
async def export_generated_document(
    title: str,
    content: str,
    document_type: str,
    outline: Optional[str] = None,
    user = Depends(get_current_user)
):
    """Export generated document to file"""
    try:
        if document_type == 'docx':
            filepath = exporter.export_docx(title, content, outline)
        elif document_type == 'pptx':
            filepath = exporter.export_pptx(title, content, outline)
        else:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Export failed")
        
        return FileResponse(
            filepath,
            media_type='application/octet-stream',
            filename=os.path.basename(filepath)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# New endpoints for structured workflow
@app.post("/generate-structured-document")
async def generate_structured_document(
    request: StructuredDocumentRequest,
    user = Depends(get_current_user)
):
    """Generate document section-by-section based on user-defined structure"""
    try:
        # Create project
        project_data = {
            'title': request.prompt[:100],  # Use first 100 chars as title
            'description': request.prompt,
            'type': request.document_type,
            'structure': request.structure
        }
        project_id = await firestore_db.create_project(user['uid'], project_data)
        
        # Generate content for each section/slide
        if request.document_type == 'docx':
            sections = request.structure.get('sections', [])
            for idx, section in enumerate(sections):
                content = await gemini_client.generate_section_content(
                    section['title'],
                    'docx',
                    request.prompt
                )
                section_data = {
                    'title': section['title'],
                    'content': content,
                    'order': idx,
                    'feedback': None,
                    'comments': []
                }
                await firestore_db.create_section(project_id, section_data)
        else:  # pptx
            slides = request.structure.get('slides', [])
            for idx, slide in enumerate(slides):
                content = await gemini_client.generate_section_content(
                    slide['title'],
                    'pptx',
                    request.prompt
                )
                section_data = {
                    'title': slide['title'],
                    'content': content,
                    'order': idx,
                    'feedback': None,
                    'comments': []
                }
                await firestore_db.create_section(project_id, section_data)
        
        return {'project_id': project_id, 'status': 'success'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/content", response_model=ProjectContentResponse)
async def get_project_content(
    project_id: str,
    user = Depends(get_current_user)
):
    """Get all sections for a project"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        sections = await firestore_db.get_sections(project_id)
        
        # Convert comments to simple list of strings
        section_responses = []
        for section in sections:
            comments_list = []
            if 'comments' in section and section['comments']:
                for comment in section['comments']:
                    if isinstance(comment, dict):
                        comments_list.append(comment.get('text', ''))
                    else:
                        comments_list.append(str(comment))
            
            section_responses.append(SectionResponse(
                id=section['id'],
                title=section['title'],
                content=section['content'],
                order=section['order'],
                feedback=section.get('feedback'),
                comments=comments_list
            ))
        
        return ProjectContentResponse(sections=section_responses)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/sections/{section_id}/refine")
async def refine_section(
    project_id: str,
    section_id: str,
    request: RefineRequest,
    user = Depends(get_current_user)
):
    """Refine a specific section using AI"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        section = await firestore_db.get_section(project_id, section_id)
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
        
        # Use AI to refine content
        refined_content = await gemini_client.refine_section_content(
            section['content'],
            request.refinement_prompt,
            project['type']
        )
        
        # Update section
        await firestore_db.update_section(project_id, section_id, {
            'content': refined_content
        })
        
        return {'content': refined_content, 'status': 'success'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/sections/{section_id}/feedback")
async def save_section_feedback(
    project_id: str,
    section_id: str,
    request: SectionFeedbackRequest,
    user = Depends(get_current_user)
):
    """Save like/dislike feedback for a section"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        await firestore_db.update_section(project_id, section_id, {
            'feedback': request.feedback
        })
        
        return {'status': 'success'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/projects/{project_id}/sections/{section_id}/comment")
async def save_section_comment(
    project_id: str,
    section_id: str,
    request: SectionCommentRequest,
    user = Depends(get_current_user)
):
    """Save a comment on a section"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        await firestore_db.add_section_comment(project_id, section_id, request.comment)
        
        return {'status': 'success'}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/projects/{project_id}/export/{document_type}")
async def export_project(
    project_id: str,
    document_type: str,
    user = Depends(get_current_user)
):
    """Export project with all sections to document"""
    try:
        project = await firestore_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        if project['user_id'] != user['uid']:
            raise HTTPException(status_code=403, detail="Access denied")
        
        sections = await firestore_db.get_sections(project_id)
        
        # Combine all sections into content
        content_parts = []
        for section in sections:
            content_parts.append(f"## {section['title']}\n\n{section['content']}\n\n")
        
        content = "\n".join(content_parts)
        
        # Extract title from project description or use default
        title = project.get('title', 'Generated Document')
        
        # Export to file
        if document_type == 'docx':
            filepath = exporter.export_docx(title, content, None)
        elif document_type == 'pptx':
            filepath = exporter.export_pptx(title, content, None)
        else:
            raise HTTPException(status_code=400, detail="Invalid document type")
        
        if not os.path.exists(filepath):
            raise HTTPException(status_code=500, detail="Export failed")
        
        return FileResponse(
            filepath,
            media_type='application/octet-stream',
            filename=os.path.basename(filepath)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

