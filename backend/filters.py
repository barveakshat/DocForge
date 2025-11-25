import re
from better_profanity import profanity

profanity.load_censor_words()

def filter_profanity(text: str) -> str:
    """Remove profanity from text"""
    return profanity.censor(text)

def detect_pii(text: str) -> bool:
    """Simple PII detection - checks for common patterns"""
    patterns = [
        r'\b\d{3}-\d{2}-\d{4}\b',  # SSN
        r'\b\d{16}\b',  # Credit card
        r'\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b',  # Email (somewhat)
        r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone
    ]
    
    for pattern in patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return True
    return False

def sanitize_content(text: str) -> str:
    """Apply content filters"""
    filtered = filter_profanity(text)
    if detect_pii(filtered):
        raise ValueError("Content contains potential PII. Please review and remove sensitive information.")
    return filtered
