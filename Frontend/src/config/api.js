const DEFAULT_LOCAL_API_URL = 'http://localhost:5000/api';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function resolveApiBaseUrl() {
  const configuredUrl = normalizeUrl(
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL
  );

  if (configuredUrl) return configuredUrl;

  if (typeof window === 'undefined') return DEFAULT_LOCAL_API_URL;

  const { protocol, hostname } = window.location;
  if (LOCAL_HOSTNAMES.has(hostname)) return DEFAULT_LOCAL_API_URL;

  if (protocol === 'http:' && isPrivateNetworkHost(hostname)) {
    return `${protocol}//${hostname}:5000/api`;
  }

  return DEFAULT_LOCAL_API_URL;
}

export function resolveSocketUrl() {
  const configuredSocketUrl = normalizeUrl(import.meta.env.VITE_SOCKET_URL);
  if (configuredSocketUrl) return configuredSocketUrl;

  return resolveApiBaseUrl().replace(/\/api\/?$/, '');
}

function isPrivateNetworkHost(hostname) {
  return (
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}
