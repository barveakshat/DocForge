import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { 
  Wand2, FileText, LogOut, Sparkles, ArrowRight, Plus, Trash2, 
  GripVertical, ChevronUp, ChevronDown, Presentation 
} from 'lucide-react';

export default function Generate() {
  const navigate = useNavigate();
  const { currentUser, logout, getAuthHeaders } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [documentType, setDocumentType] = useState('docx');
  const [step, setStep] = useState(1); // 1: prompt, 2: structure definition, 3: generating

  // For DOCX: Sections with headers
  const [sections, setSections] = useState([
    { id: 1, title: 'Introduction' },
    { id: 2, title: 'Main Content' },
    { id: 3, title: 'Conclusion' }
  ]);

  // For PPTX: Slides with titles
  const [slides, setSlides] = useState([
    { id: 1, title: 'Introduction' },
    { id: 2, title: 'Main Points' },
    { id: 3, title: 'Conclusion' }
  ]);
  
  const [numSlides, setNumSlides] = useState(3);
  const [loading, setLoading] = useState(false);
  const [suggestingOutline, setSuggestingOutline] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAISuggestOutline = async () => {
    if (!prompt.trim()) {
      alert('Please enter a topic first');
      return;
    }

    setSuggestingOutline(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/projects/generate-outline`,
        {
          description: prompt.trim(),
          type: documentType
        },
        { headers }
      );

      const outline = response.data.outline;
      
      if (documentType === 'docx') {
        // Parse outline to extract section headers
        const lines = outline.split('\n').filter(line => line.trim());
        const parsedSections = [];
        let sectionId = 1;
        
        for (const line of lines) {
          // Match numbered sections like "1. Introduction" or "1.1 Subsection"
          const match = line.match(/^\d+\.?\s*(.+)/);
          if (match) {
            // Remove markdown formatting like ** or __
            let title = match[1].trim();
            title = title.replace(/\*\*/g, '').replace(/__/g, '').trim();
            parsedSections.push({
              id: sectionId++,
              title: title
            });
          }
        }
        
        if (parsedSections.length > 0) {
          setSections(parsedSections);
        }
      } else {
        // Parse outline for slide titles
        const lines = outline.split('\n').filter(line => line.trim());
        const parsedSlides = [];
        let slideId = 1;
        
        for (const line of lines) {
          // Match "Slide X: Title" or bullet points under slides
          const slideMatch = line.match(/Slide\s+\d+:\s*(.+)/i);
          if (slideMatch) {
            // Remove markdown formatting like ** or __
            let title = slideMatch[1].trim();
            title = title.replace(/\*\*/g, '').replace(/__/g, '').trim();
            parsedSlides.push({
              id: slideId++,
              title: title
            });
          }
        }
        
        if (parsedSlides.length > 0) {
          setSlides(parsedSlides);
          setNumSlides(parsedSlides.length);
        }
      }
      
      alert(`AI generated ${documentType === 'docx' ? 'sections' : 'slides'}! You can now edit or modify them.`);
    } catch (error) {
      console.error('Outline suggestion error:', error);
      alert('Failed to generate outline suggestions. Please try again.');
    } finally {
      setSuggestingOutline(false);
    }
  };

  const handleProceedToStructure = (e) => {
    e.preventDefault();
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    setStep(2);
  };

  // Section management for DOCX
  const addSection = () => {
    const newId = Math.max(...sections.map(s => s.id), 0) + 1;
    setSections([...sections, { id: newId, title: `Section ${newId}` }]);
  };

  const removeSection = (id) => {
    if (sections.length <= 1) {
      alert('Document must have at least one section');
      return;
    }
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSectionTitle = (id, title) => {
    setSections(sections.map(s => s.id === id ? { ...s, title } : s));
  };

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newSections = [...sections];
    [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
    setSections(newSections);
  };

  const moveSectionDown = (index) => {
    if (index === sections.length - 1) return;
    const newSections = [...sections];
    [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    setSections(newSections);
  };

  // Slide management for PPTX
  const updateNumSlides = (num) => {
    const newNum = Math.max(1, Math.min(20, parseInt(num) || 1));
    setNumSlides(newNum);
    
    const newSlides = [];
    for (let i = 1; i <= newNum; i++) {
      const existing = slides.find(s => s.id === i);
      newSlides.push(existing || { id: i, title: `Slide ${i}` });
    }
    setSlides(newSlides);
  };

  const updateSlideTitle = (id, title) => {
    setSlides(slides.map(s => s.id === id ? { ...s, title } : s));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStep(3);

    try {
      const headers = await getAuthHeaders();
      
      // Format structure according to backend expectations
      const structure = documentType === 'docx' 
        ? { sections: sections.map(s => ({ title: s.title })) }
        : { slides: slides.map(s => ({ title: s.title })) };

      const response = await axios.post(
        `${API_BASE_URL}/generate-structured-document`,
        {
          prompt: prompt.trim(),
          document_type: documentType,
          structure: structure
        },
        { headers }
      );

      // Navigate to new editor page
      navigate('/editor', {
        state: {
          projectId: response.data.project_id,
          prompt: prompt.trim(),
          documentType: documentType,
          structure: structure
        }
      });
    } catch (error) {
      console.error('Generation error:', error);
      alert(error.response?.data?.detail || 'Failed to generate document');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              DocForge AI
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{currentUser?.email}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}>
              1
            </div>
            <span className="font-medium hidden sm:inline">Topic & Format</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-purple-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              step >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200'
            }`}>
              2
            </div>
            <span className="font-medium hidden sm:inline">Define Structure</span>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
          <div className={`flex items-center gap-2 ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
              step >= 3 ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              3
            </div>
            <span className="font-medium hidden sm:inline">Generate</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Topic & Format */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                  <Wand2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Step 1: What do you want to create?</h2>
                  <p className="text-sm text-gray-600">Describe your document topic and select format</p>
                </div>
              </div>

              <form onSubmit={handleProceedToStructure} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Main Topic / Prompt *
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="E.g., A market analysis of the EV industry in 2025"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={6}
                    required
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDocumentType('docx')}
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        documentType === 'docx'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                      <span className="font-medium">Document (.docx)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDocumentType('pptx')}
                      className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        documentType === 'pptx'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Presentation className="w-5 h-5" />
                      <span className="font-medium">Presentation (.pptx)</span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Continue to Structure Definition
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Structure Definition */}
          {step === 2 && !loading && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                  {documentType === 'docx' ? <FileText className="w-6 h-6 text-white" /> : <Presentation className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Step 2: Define {documentType === 'docx' ? 'Sections' : 'Slides'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {documentType === 'docx' 
                      ? 'Add, remove, and reorder section headers'
                      : 'Specify number of slides and title each one'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleGenerate} className="space-y-6">
                {/* Show original prompt */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">Your Topic:</p>
                  <p className="text-sm text-blue-700">{prompt}</p>
                </div>

                {/* AI-Suggest Outline Button */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleAISuggestOutline}
                    disabled={suggestingOutline}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {suggestingOutline ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-medium">AI is generating suggestions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span className="font-medium">✨ AI-Suggest Outline</span>
                      </>
                    )}
                  </button>
                </div>

                {documentType === 'docx' ? (
                  /* DOCX: Section Management */
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Document Sections
                      </label>
                      <button
                        type="button"
                        onClick={addSection}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Section
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sections.map((section, index) => (
                        <div key={section.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Section title"
                          />
                          <button
                            type="button"
                            onClick={() => moveSectionUp(index)}
                            disabled={index === 0}
                            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSectionDown(index)}
                            disabled={index === sections.length - 1}
                            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSection(section.id)}
                            className="p-2 text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* PPTX: Slide Management */
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Slides
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={numSlides}
                        onChange={(e) => updateNumSlides(e.target.value)}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Slide Titles
                    </label>

                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {slides.map((slide, index) => (
                        <div key={slide.id} className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg">
                          <span className="text-sm font-medium text-gray-600 w-16">Slide {slide.id}</span>
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => updateSlideTitle(slide.id, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder={`Slide ${slide.id} title`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Topic
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Wand2 className="w-5 h-5" />
                    Generate Content →
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loading Animation for Step 3 */}
          {step === 3 && loading && (
            <div className="bg-white rounded-2xl shadow-xl p-12">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 border-8 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">Generating Content</h3>
                  <p className="text-gray-600">
                    AI is creating content {documentType === 'docx' ? 'section-by-section' : 'slide-by-slide'}...
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
