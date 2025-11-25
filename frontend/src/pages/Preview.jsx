import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { FileText, Presentation, Download, ArrowLeft, LogOut, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

export default function Preview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, getAuthHeaders } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(100);

  const { generatedData, prompt, documentType } = location.state || {};
  const [exportType, setExportType] = useState(documentType || 'docx');

  useEffect(() => {
    if (!generatedData) {
      navigate('/generate');
    }
    // Set export type based on document type from generation
    if (documentType) {
      setExportType(documentType);
    }
  }, [generatedData, navigate, documentType]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      const headers = await getAuthHeaders();
      
      // Extract title from first heading in content (this is the proper document title)
      let title = 'Generated Document';
      const lines = generatedData.content.split('\n');
      for (const line of lines) {
        if (line.startsWith('# ')) {
          title = line.substring(2).trim();
          break;
        } else if (line.startsWith('## ')) {
          // Use H2 if no H1 found
          if (title === 'Generated Document') {
            title = line.substring(3).trim();
          }
          break;
        }
      }
      
      const response = await axios.post(
        `${API_BASE_URL}/export-document`,
        null,
        {
          params: {
            title: title,
            content: generatedData.content,
            document_type: exportType,
            outline: generatedData.outline_used
          },
          headers,
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `document_${Date.now()}.${exportType}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export document');
    } finally {
      setDownloading(false);
    }
  };

  if (!generatedData) {
    return null;
  }

  const wordCount = generatedData.content.split(/\s+/).length;
  const charCount = generatedData.content.length;

  // Parse inline markdown formatting (bold, italic, code)
  const parseInlineMarkdown = (text) => {
    const parts = [];
    let lastIndex = 0;
    
    // Regex for bold (**text**), italic (*text*), and code (`text`)
    const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add formatted text
      if (match[1]) { // Bold
        parts.push(<strong key={match.index}>{match[2]}</strong>);
      } else if (match[3]) { // Italic
        parts.push(<em key={match.index}>{match[4]}</em>);
      } else if (match[5]) { // Code
        parts.push(<code key={match.index} className="bg-gray-100 px-1 rounded text-sm font-mono">{match[6]}</code>);
      }
      
      lastIndex = regex.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  // Format content with proper headings
  const formatContent = (content) => {
    return content.split('\n').map((line, index) => {
      // Main headings (# )
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-3xl font-bold text-gray-900 mt-8 mb-4">{parseInlineMarkdown(line.substring(2))}</h1>;
      }
      // Subheadings (## )
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-2xl font-semibold text-gray-800 mt-6 mb-3">{parseInlineMarkdown(line.substring(3))}</h2>;
      }
      // Sub-subheadings (### )
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-xl font-semibold text-gray-800 mt-5 mb-2">{parseInlineMarkdown(line.substring(4))}</h3>;
      }
      // Bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        const text = line.substring(line.indexOf(' ') + 1);
        return <li key={index} className="ml-6 mb-2 text-gray-700">{parseInlineMarkdown(text)}</li>;
      }
      // Regular paragraphs
      if (line.trim()) {
        return <p key={index} className="mb-4 text-gray-700 leading-relaxed">{parseInlineMarkdown(line)}</p>;
      }
      // Empty lines
      return <div key={index} className="h-2"></div>;
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* PDF-style Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/generate')}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <div className="h-6 w-px bg-gray-700"></div>
          <h1 className="text-white font-semibold text-sm">
            {prompt?.substring(0, 60) || 'Document Preview'}
            {prompt?.length > 60 ? '...' : ''}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 bg-gray-700 rounded px-2 py-1">
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="p-1 text-gray-300 hover:text-white transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-gray-300 text-xs font-medium min-w-[3rem] text-center">
              {zoom}%
            </span>
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="p-1 text-gray-300 hover:text-white transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Export Type Display (no toggle, just shows current type) */}
          <div className="flex items-center gap-2 bg-gray-700 rounded px-3 py-2">
            {exportType === 'docx' ? (
              <div className="flex items-center gap-2 text-blue-400">
                <FileText className="w-4 h-4" />
                <span className="text-xs font-medium">Word Document</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-purple-400">
                <Presentation className="w-4 h-4" />
                <span className="text-xs font-medium">PowerPoint</span>
              </div>
            )}
          </div>

          {/* Download Button */}
          <button
            onClick={handleExport}
            disabled={downloading}
            className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-colors ${
              downloading
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download
              </>
            )}
          </button>

          <div className="h-6 w-px bg-gray-700"></div>

          {/* User Menu */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Viewer Area */}
      <div className="flex-1 overflow-auto bg-gray-500 p-8">
        <div className="max-w-5xl mx-auto">
          {/* PDF-style Document Container */}
          <div
            className="bg-white shadow-2xl mx-auto"
            style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              transition: 'transform 0.2s ease',
              minHeight: '100vh',
            }}
          >
            {/* Document Content */}
            <div className="px-20 py-16">
              {/* Title Section */}
              <div className="mb-12 pb-8 border-b-2 border-gray-200">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {prompt?.split('\n')[0] || 'Generated Document'}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Generated by DocForge AI</span>
                  <span>•</span>
                  <span>Llama 3.3 70B</span>
                  <span>•</span>
                  <span>{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Main Content */}
              <div className="prose prose-lg max-w-none">
                <div className="text-gray-800 leading-relaxed">
                  {formatContent(generatedData.content)}
                </div>
              </div>

              {/* Document Footer */}
              <div className="mt-16 pt-8 border-t-2 border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div>
                    <span className="font-semibold">{wordCount.toLocaleString()}</span> words
                    <span className="mx-2">•</span>
                    <span className="font-semibold">{charCount.toLocaleString()}</span> characters
                  </div>
                  <div>
                    Page 1
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom spacing */}
          <div className="h-8"></div>
        </div>
      </div>
    </div>
  );
}
