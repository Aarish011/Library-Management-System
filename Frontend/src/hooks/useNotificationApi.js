import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../api/notificationApi';

function mergeUniqueNotifications(current, incoming, { prepend = false } = {}) {
  const map = new Map();
  const ordered = prepend ? [...incoming, ...current] : [...current, ...incoming];

  ordered.forEach((notification) => {
    if (notification?._id && !map.has(notification._id)) {
      map.set(notification._id, notification);
    }
  });

  return Array.from(map.values());
}

export function useNotificationApi({ limit = 10 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const loadNotifications = useCallback(
    async ({ pageNumber = 1, replace = true } = {}) => {
      const setBusy = replace ? setLoading : setLoadingMore;
      try {
        setBusy(true);
        setError('');
        const response = await fetchNotifications({ page: pageNumber, limit });
        setNotifications((prev) =>
          replace
            ? mergeUniqueNotifications([], response.notifications || [])
            : mergeUniqueNotifications(prev, response.notifications || [])
        );
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (err) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setBusy(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    loadNotifications({ pageNumber: 1, replace: true });
  }, [loadNotifications]);

  const loadMore = useCallback(async () => {
    if (loadingMore || page >= totalPages) return;
    await loadNotifications({ pageNumber: page + 1, replace: false });
  }, [loadNotifications, loadingMore, page, totalPages]);

  const markNotificationRead = useCallback(async (notificationId) => {
    let previous = [];
    setNotifications((current) => {
      previous = current;
      return current.map((notification) =>
        notification._id === notificationId
          ? { ...notification, isRead: true }
          : notification
      );
    });

    try {
      await markAsRead(notificationId);
    } catch (err) {
      setNotifications(previous);
      throw err;
    }
  }, []);

  const markEveryNotificationRead = useCallback(async () => {
    let previous = [];
    setNotifications((current) => {
      previous = current;
      return current.map((notification) => ({ ...notification, isRead: true }));
    });

    try {
      await markAllAsRead();
    } catch (err) {
      setNotifications(previous);
      throw err;
    }
  }, []);

  const removeNotification = useCallback(async (notificationId) => {
    let removed = null;
    let previous = [];
    setNotifications((current) => {
      previous = current;
      removed = current.find((notification) => notification._id === notificationId);
      return current.filter((notification) => notification._id !== notificationId);
    });

    try {
      await deleteNotification(notificationId);
    } catch (err) {
      if (removed) setNotifications(previous);
      throw err;
    }
  }, []);

  const prependNotification = useCallback((notification) => {
    if (!notification?._id) return;
    setNotifications((current) =>
      mergeUniqueNotifications(current, [notification], { prepend: true })
    );
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore: page < totalPages,
    reload: () => loadNotifications({ pageNumber: 1, replace: true }),
    loadMore,
    markNotificationRead,
    markEveryNotificationRead,
    removeNotification,
    prependNotification,
  };
}

export default useNotificationApi;
