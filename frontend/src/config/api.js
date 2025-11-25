// Remove trailing slash from API URL to prevent double slashes
const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');

export default API_BASE_URL;
