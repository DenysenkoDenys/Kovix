/**
 * Get the API base URL from environment variables
 * 
 * Behavior:
 * - Local development (npm run dev): uses VITE_API_BASE_URL (http://localhost:8080)
 * - Docker production (nginx proxy): uses relative protocol (//localhost or current domain)
 * - Falls back to current domain if not specified
 */
export const getApiBaseUrl = () => {
  // Check if env variable is set (local development)
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl && envUrl !== 'http://backend:8080') {
    // Use the explicit local development URL
    return envUrl;
  }
  
  // For Docker/production: use relative protocol to current host
  // This way browser requests go through Nginx proxy
  if (typeof window !== 'undefined') {
    // Use current domain so browser can reach it (either localhost:3000 or production domain)
    return window.location.origin;
  }
  
  // Fallback (shouldn't reach here in browser)
  return 'http://localhost:8080';
};

export const getApiRootUrl = () => {
  return `${getApiBaseUrl()}/api`;
};

/**
 * Get SignalR connection URL
 * Returns the HTTP(S) URL for SignalR to use
 * SignalR will automatically handle protocol upgrade to WebSocket
 */
export const getWebSocketUrl = () => {
  // Return the same base URL as API - SignalR handles the protocol upgrade
  return getApiBaseUrl();
};

export const resolveMediaUrl = (url, fallback = '') => {
  if (!url) return fallback;

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('//') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const normalizedPath = url.replace(/\\/g, '/');
  const separator = normalizedPath.startsWith('/') ? '' : '/';
  return `${getApiBaseUrl()}${separator}${normalizedPath}`;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_ROOT_URL = getApiRootUrl();
