import httpx
from config import OPENROUTER_API_KEY

class AIClient:
    def __init__(self):
        self.api_key = OPENROUTER_API_KEY
        self.base_url = "https://openrouter.ai/api/v1/chat/completions"
        # Using non-free version for better speed
        self.model = "meta-llama/llama-3.3-70b-instruct"
    
    async def _make_request(self, messages: list) -> str:
        """Make a request to OpenRouter API"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "DocForge AI"
        }
        
        payload = {
            "model": self.model,
            "messages": messages
        }
        
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(self.base_url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                return data['choices'][0]['message']['content']
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
            raise Exception(f"OpenRouter API error: {e.response.status_code} - {error_detail}")
        except Exception as e:
            raise Exception(f"Request failed: {str(e)}")
    
    async def generate_text(self, prompt: str, context: str = None) -> dict:
        """Generate text using Llama via OpenRouter"""
        try:
            messages = []
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Context: {context}"
                })
            
            messages.append({
                "role": "user",
                "content": prompt
            })
            
            text = await self._make_request(messages)
            
            return {
                'text': text,
                'model': self.model
            }
        except Exception as e:
            raise Exception(f"AI generation error: {str(e)}")
    
    async def generate_outline(self, description: str, doc_type: str) -> str:
        """Generate document outline or slide structure"""
        if doc_type == 'docx':
            prompt = f"""Create a detailed document outline for the following topic:

{description}

Provide a structured outline with numbered sections and subsections. Format as:
1. Section Title
   1.1 Subsection
   1.2 Subsection
2. Section Title
   2.1 Subsection
   
Keep it professional and comprehensive."""
        else:
            prompt = f"""Create a PowerPoint slide structure for the following topic:

{description}

Provide a slide-by-slide outline. Format as:
Slide 1: [Title]
  - Key point
  - Key point
Slide 2: [Title]
  - Key point
  
Keep it concise and presentation-ready."""
        
        try:
            messages = [{"role": "user", "content": prompt}]
            return await self._make_request(messages)
        except Exception as e:
            raise Exception(f"Outline generation error: {str(e)}")
    
    async def generate_embeddings(self, text: str) -> list:
        """Generate embeddings - Not supported with OpenRouter, returning empty"""
        # OpenRouter doesn't support embeddings directly
        # You would need a separate embedding service if needed
        return []
    
    async def generate_full_document(self, prompt: str, doc_type: str, outline: str = None) -> dict:
        """Generate complete document content based on prompt and optional outline"""
        try:
            # Generate or use provided outline
            if not outline:
                outline = await self.generate_outline(prompt, doc_type)
            
            # Generate full content based on outline
            if doc_type == 'docx':
                content_prompt = f"""Generate a complete, professional document based on this outline and description:

Description: {prompt}

Outline:
{outline}

IMPORTANT: Start with a proper title for the document on the first line using # heading format.
Then generate comprehensive content for each section. Include:
- A clear, descriptive title that captures the document's main topic
- Detailed explanations for each section
- Examples where appropriate
- Professional tone
- Well-structured paragraphs
- Proper transitions between sections

Format the output with:
# [Document Title Here]

Then use ## for main sections and ### for subsections.

Example format:
# The Complete Guide to Climate Change Solutions

## Introduction
[Content here...]

## Main Topic
### Subtopic
[Content here...]"""
            else:  # pptx
                content_prompt = f"""Generate complete PowerPoint presentation content based on this description and structure:

Description: {prompt}

Slide Structure:
{outline}

IMPORTANT: Start with the presentation title on the first line using # heading format.
Then for each slide, provide:
- Clear, descriptive slide title
- Concise, impactful content
- Key bullet points (3-5 per slide)
- Any relevant data or examples
- Professional presentation style

Format as:
# [Presentation Title Here]

## Slide 1: Introduction
• Key point
• Key point
• Key point

## Slide 2: Main Topic
• Key point
• Key point

Example:
# Digital Marketing Strategies for 2026

## Introduction to Digital Marketing
• Overview of modern marketing landscape
• Key trends and opportunities"""
            
            messages = [{"role": "user", "content": content_prompt}]
            content = await self._make_request(messages)
            
            return {
                'content': content,
                'outline': outline,
                'model': self.model
            }
        except Exception as e:
            raise Exception(f"Full document generation error: {str(e)}")
    
    async def generate_section_content(self, section_title: str, doc_type: str, context: str = "") -> str:
        """Generate content for a single section/slide"""
        try:
            if doc_type == 'docx':
                prompt = f"""Generate detailed, professional content for the following document section:

Section Title: {section_title}

{f"Context: {context}" if context else ""}

Requirements:
- Write comprehensive, well-structured content
- Use professional language
- Include relevant examples or details
- Format with proper paragraphs
- Aim for 150-300 words depending on the topic
- Do NOT include the section heading (it will be added separately)

Generate the content now:"""
            else:  # pptx
                prompt = f"""Generate concise, impactful content for the following presentation slide:

Slide Title: {section_title}

{f"Context: {context}" if context else ""}

Requirements:
- Provide 3-5 clear, concise bullet points
- Each bullet should be impactful and informative
- Use presentation-appropriate language
- Focus on key takeaways
- Do NOT include the slide title (it will be added separately)
- Format as bullet points starting with •

Generate the content now:"""
            
            messages = [{"role": "user", "content": prompt}]
            return await self._make_request(messages)
        except Exception as e:
            raise Exception(f"Section generation error: {str(e)}")
    
    async def refine_section_content(self, current_content: str, refinement_prompt: str, doc_type: str) -> str:
        """Refine existing section content based on user feedback"""
        try:
            prompt = f"""You are refining content for a {'document section' if doc_type == 'docx' else 'presentation slide'}.

Current content:
{current_content}

User's refinement request: {refinement_prompt}

Requirements:
- Apply the user's requested changes
- Maintain or improve the quality
- Keep the same general structure unless asked to change it
- For documents: maintain professional paragraph format
- For presentations: maintain bullet point format
- Do NOT add section/slide titles (they are separate)

Generate the refined content now:"""
            
            messages = [{"role": "user", "content": prompt}]
            return await self._make_request(messages)
        except Exception as e:
            raise Exception(f"Refinement error: {str(e)}")

# Export instance with backward-compatible name
ai_client = AIClient()
gemini_client = ai_client  # Backward compatibility

