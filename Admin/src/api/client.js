import { getAdminFriendlyError } from './errorMessage';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function getAdminToken() {
  return localStorage.getItem('adminToken');
}

export async function apiRequest(path, options = {}) {
  const token = options.skipAuth ? null : getAdminToken();
  const { skipAuth, ...requestOptions } = options;
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestOptions.headers || {}),
      },
    });
  } catch {
    throw {
      message:
        'Unable to connect to the server. Check your connection and try again.',
    };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw {
      ...data,
      message: getAdminFriendlyError(response.status, data),
      status: response.status,
    };
  }
  return data;
}
