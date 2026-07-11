import { getAdminToken } from './client';
import { getAdminFriendlyError } from './errorMessage';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function notificationRequest(options = {}) {
  const token = getAdminToken();
  let response;

  try {
    response = await fetch(`${API_BASE_URL}/admin/notifications`, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
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
    };
  }
  return data;
}

export async function sendNotification(payload) {
  const body = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, value);
    }
  });

  return notificationRequest({ method: 'POST', body });
}

export async function getNotificationHistory() {
  return notificationRequest();
}
