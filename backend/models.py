from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class ProjectCreate(BaseModel):
    title: str
    description: str
    type: str
    outline: Optional[str] = None

class ProjectResponse(BaseModel):
    id: str
    title: str
    description: str
    type: str
    outline: Optional[str] = None
    content: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    user_id: str

class GenerateOutlineRequest(BaseModel):
    description: str
    type: str

class GenerateRequest(BaseModel):
    prompt: str
    context: Optional[str] = None

class GenerateResponse(BaseModel):
    generated_text: str
    model: str

class VersionCreate(BaseModel):
    content: str

class VersionResponse(BaseModel):
    id: str
    version_number: int
    content: str
    created_at: datetime
    metadata: Optional[Dict[str, Any]] = None

class CommentCreate(BaseModel):
    text: str

class CommentResponse(BaseModel):
    id: str
    text: str
    user_id: str
    created_at: datetime

class FeedbackRequest(BaseModel):
    type: str
    content: str

class ExportRequest(BaseModel):
    content: str

class DocumentGenerateRequest(BaseModel):
    prompt: str
    outline: Optional[str] = None
    document_type: str  # 'docx' or 'pptx'

class DocumentGenerateResponse(BaseModel):
    content: str
    outline_used: Optional[str] = None
    preview_text: str
    document_type: str

class AuthVerifyResponse(BaseModel):
    uid: str
    email: Optional[str]
    message: str

# New models for structured workflow
class StructuredDocumentRequest(BaseModel):
    prompt: str
    document_type: str  # 'docx' or 'pptx'
    structure: Dict[str, Any]  # For docx: {"sections": [...]}, For pptx: {"slides": [...]}

class SectionResponse(BaseModel):
    id: str
    title: str
    content: str
    order: int
    feedback: Optional[str] = None
    comments: Optional[List[str]] = []

class ProjectContentResponse(BaseModel):
    sections: List[SectionResponse]

class RefineRequest(BaseModel):
    refinement_prompt: str

class SectionFeedbackRequest(BaseModel):
    feedback: str  # 'like' or 'dislike'

class SectionCommentRequest(BaseModel):
    comment: str

class ExportDocumentRequest(BaseModel):
    document_type: str  # 'docx' or 'pptx'

