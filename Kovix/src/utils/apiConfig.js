export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl && envUrl !== 'http://backend:8080') {
    return envUrl;
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return 'http://localhost:8080';
};

export const getApiRootUrl = () => {
  return `${getApiBaseUrl()}/api`;
};

export const getWebSocketUrl = () => {
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
