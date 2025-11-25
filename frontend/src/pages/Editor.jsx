import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { 
  ArrowLeft, Download, ThumbsUp, ThumbsDown, MessageSquare, 
  Sparkles, Send, Save, FileText, Presentation, Loader2 
} from 'lucide-react';

export default function Editor() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();
  const { currentUser, logout, getAuthHeaders } = useAuth();
  
  // Get projectId from either location.state or URL params
  const projectIdFromState = location.state?.projectId;
  const projectIdFromParams = params.id;
  const projectId = projectIdFromState || projectIdFromParams;
  
  const [prompt, setPrompt] = useState(location.state?.prompt || '');
  const [documentType, setDocumentType] = useState(location.state?.documentType || '');
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refining, setRefining] = useState({});
  const [refinementPrompts, setRefinementPrompts] = useState({});
  const [comments, setComments] = useState({});
  const [showCommentBox, setShowCommentBox] = useState({});

  useEffect(() => {
    if (!projectId) {
      navigate('/generate');
      return;
    }
    loadProjectContent();
  }, [projectId]);

  const loadProjectContent = async () => {
    try {
      const headers = await getAuthHeaders();
      
      // Load project details if not in state
      if (!prompt || !documentType) {
        const projectResponse = await axios.get(
          `${API_BASE_URL}/projects/${projectId}`,
          { headers }
        );
        setPrompt(projectResponse.data.description || projectResponse.data.title);
        setDocumentType(projectResponse.data.type);
      }
      
      // Load sections
      const response = await axios.get(
        `${API_BASE_URL}/projects/${projectId}/content`,
        { headers }
      );
      setSections(response.data.sections);
    } catch (error) {
      console.error('Failed to load content:', error);
      alert('Failed to load project content');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async (sectionId) => {
    const refinementPrompt = refinementPrompts[sectionId];
    if (!refinementPrompt || !refinementPrompt.trim()) {
      alert('Please enter a refinement instruction');
      return;
    }

    setRefining({ ...refining, [sectionId]: true });
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/projects/${projectId}/sections/${sectionId}/refine`,
        { refinement_prompt: refinementPrompt },
        { headers }
      );
      
      // Update section content
      setSections(sections.map(s => 
        s.id === sectionId ? { ...s, content: response.data.content } : s
      ));
      
      // Clear refinement prompt
      setRefinementPrompts({ ...refinementPrompts, [sectionId]: '' });
    } catch (error) {
      console.error('Refinement error:', error);
      alert('Failed to refine section');
    } finally {
      setRefining({ ...refining, [sectionId]: false });
    }
  };

  const handleFeedback = async (sectionId, feedback) => {
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}/projects/${projectId}/sections/${sectionId}/feedback`,
        { feedback },
        { headers }
      );
      
      // Update section feedback
      setSections(sections.map(s => 
        s.id === sectionId ? { ...s, feedback } : s
      ));
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  const handleComment = async (sectionId) => {
    const comment = comments[sectionId];
    if (!comment || !comment.trim()) return;

    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_BASE_URL}/projects/${projectId}/sections/${sectionId}/comment`,
        { comment },
        { headers }
      );
      
      // Update section comments
      setSections(sections.map(s => 
        s.id === sectionId ? { ...s, comments: [...(s.comments || []), comment] } : s
      ));
      
      // Clear comment box
      setComments({ ...comments, [sectionId]: '' });
      setShowCommentBox({ ...showCommentBox, [sectionId]: false });
    } catch (error) {
      console.error('Comment error:', error);
      alert('Failed to save comment');
    }
  };

  const handleExport = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      
      const response = await axios.get(
        `${API_BASE_URL}/projects/${projectId}/export/${documentType}`,
        { 
          headers,
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${Date.now()}.${documentType}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to export document');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
              >
                DocForge AI
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <button
                onClick={() => navigate('/generate')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-lg font-semibold text-gray-900">
                {prompt?.substring(0, 50)}{prompt?.length > 50 ? '...' : ''}
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleExport}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Exporting...</>
                ) : (
                  <><Download className="w-4 h-4" /> Export</>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center gap-2">
          {documentType === 'docx' ? (
            <FileText className="w-6 h-6 text-blue-600" />
          ) : (
            <Presentation className="w-6 h-6 text-purple-600" />
          )}
          <h2 className="text-2xl font-bold text-gray-900">
            {documentType === 'docx' ? 'Document' : 'Presentation'} Editor
          </h2>
        </div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <div key={section.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Section Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
                <h3 className="text-xl font-bold text-white">
                  {documentType === 'docx' ? `Section ${index + 1}` : `Slide ${index + 1}`}: {section.title}
                </h3>
              </div>

              {/* Section Content */}
              <div className="p-6">
                <div className="prose max-w-none mb-6 bg-gray-50 p-4 rounded-lg">
                  <div className="whitespace-pre-wrap text-gray-800">{section.content}</div>
                </div>

                {/* AI Refinement */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    AI Refinement Prompt
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refinementPrompts[section.id] || ''}
                      onChange={(e) => setRefinementPrompts({ ...refinementPrompts, [section.id]: e.target.value })}
                      placeholder="E.g., Make this more formal, Convert to bullet points, Shorten to 100 words..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => handleRefine(section.id)}
                      disabled={refining[section.id]}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {refining[section.id] ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Refining...</>
                      ) : (
                        <><Send className="w-4 h-4" /> Refine</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Feedback & Comments */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                  {/* Feedback Buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 mr-2">Feedback:</span>
                    <button
                      onClick={() => handleFeedback(section.id, 'like')}
                      className={`p-2 rounded-lg transition-colors ${
                        section.feedback === 'like' 
                          ? 'bg-green-100 text-green-600' 
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                      }`}
                    >
                      <ThumbsUp className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(section.id, 'dislike')}
                      className={`p-2 rounded-lg transition-colors ${
                        section.feedback === 'dislike' 
                          ? 'bg-red-100 text-red-600' 
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <ThumbsDown className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Comment Button */}
                  <button
                    onClick={() => setShowCommentBox({ ...showCommentBox, [section.id]: !showCommentBox[section.id] })}
                    className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm">Add Comment</span>
                    {section.comments?.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                        {section.comments.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Comment Box */}
                {showCommentBox[section.id] && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Comment
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={comments[section.id] || ''}
                        onChange={(e) => setComments({ ...comments, [section.id]: e.target.value })}
                        placeholder="Add your notes or feedback..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={() => handleComment(section.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Save className="w-4 h-4" /> Save
                      </button>
                    </div>
                    
                    {/* Display existing comments */}
                    {section.comments?.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {section.comments.map((comment, idx) => (
                          <div key={idx} className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                            💬 {comment}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
