// useNotificationSocket.js
// Optional real-time layer — listens for the backend pushing a
// "notification:new" event over the existing Socket.io connection
// (the same one used for live seat updates) and hands new notifications
// to the caller as they arrive.
//
// Usage:
//   useNotificationSocket((notification) => {
//     setNotifications((prev) => [notification, ...prev]);
//   });
//
// Wire `getSocket()` to whatever Socket.io client instance your app
// already creates for seat availability — don't open a second connection.

import { useEffect } from 'react';

export function useNotificationSocket(onNewNotification, getSocket) {
  useEffect(() => {
    if (typeof getSocket !== 'function') return;
    const socket = getSocket();
    if (!socket) return;

    const handler = (notification) => onNewNotification(notification);
    socket.on('notification:new', handler);

    return () => {
      socket.off('notification:new', handler);
    };
  }, [onNewNotification, getSocket]);
}
