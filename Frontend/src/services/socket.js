import { io } from 'socket.io-client';
import { resolveSocketUrl } from '../config/api';

const SOCKET_URL = resolveSocketUrl();

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
