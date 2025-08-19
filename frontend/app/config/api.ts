// API Configuration
// Automatically determines the correct backend URL based on the current environment

const getBackendUrl = (): string => {
  // Check if we're in development mode
  if (process.env.NODE_ENV === 'development') {
    // Check if we're accessing from a mobile device (not localhost)
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      
      // If accessing via IP address (mobile), use the same IP for backend
      if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        return `http://${hostname}:8000`;
      }
    }
    
    // Default to localhost for desktop development
    return 'http://localhost:8000';
  }
  
  // Production - you can set this to your production backend URL
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};

export const API_BASE_URL = getBackendUrl();

// Helper function to get full API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`;
};

