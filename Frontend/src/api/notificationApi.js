import api from './axiosConfig';

function notificationError(error, fallback) {
  return error.response?.data || { message: fallback };
}

export async function getNotifications(params = {}) {
  try {
    const { data } = await api.get('/notifications', { params });
    return data;
  } catch (error) {
    throw notificationError(error, 'Failed to fetch notifications');
  }
}

export async function fetchNotifications(params = {}) {
  const response = await getNotifications(params);
  return {
    notifications: response.data || [],
    unreadCount: response.meta?.unreadCount || 0,
    totalPages: response.meta?.totalPages || 1,
    page: response.meta?.page || 1,
  };
}

export async function getNotification(notificationId) {
  try {
    const { data } = await api.get(`/notifications/${notificationId}`);
    return data;
  } catch (error) {
    throw notificationError(error, 'Failed to fetch notification');
  }
}

export async function getUnreadCount() {
  try {
    const { data } = await api.get('/notifications/unread-count');
    return data;
  } catch (error) {
    throw notificationError(error, 'Failed to fetch unread count');
  }
}

export async function markAsRead(notificationId) {
  try {
    const { data } = await api.put(`/notifications/${notificationId}/read`);
    return data;
  } catch (error) {
    throw notificationError(error, 'Failed to mark notification as read');
  }
}

export async function markAllAsRead() {
  try {
    const { data } = await api.put('/notifications/read-all');
    return data;
  } catch (error) {
    throw notificationError(error, 'Failed to mark notifications as read');
  }
}

export const markAllNotificationsRead = markAllAsRead;

export async function deleteNotification(notificationId) {
  try {
    const { data } = await api.delete(`/notifications/${notificationId}`);
    return data;
  } catch (error) {
    throw notificationError(error, 'Failed to delete notification');
  }
}