import { getAdminToken } from './client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function sendNotification(payload) {
  const token = getAdminToken();
  const body = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, value);
    }
  });

  const response = await fetch(`${API_BASE_URL}/admin/notifications`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw data?.message ? data : { message: 'Request failed' };
  return data;
}
