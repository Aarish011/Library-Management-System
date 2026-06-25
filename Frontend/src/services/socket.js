import { io } from 'socket.io-client';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:5000/api';

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, '');

let socket = null;
let activeToken = null;

export function getNotificationSocket() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  if (socket && activeToken !== token) {
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    activeToken = token;
    socket = io(SOCKET_URL, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
}

export function disconnectNotificationSocket() {
  if (socket) socket.disconnect();
  socket = null;
  activeToken = null;
}
