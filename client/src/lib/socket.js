import { io } from 'socket.io-client';

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io('/', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket.id));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.warn('[Socket] Error:', err.message));

  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinProject(projectId) {
  socket?.emit('project:join', { projectId });
}

export function leaveProject(projectId) {
  socket?.emit('project:leave', { projectId });
}

export function joinFile(fileId) {
  socket?.emit('file:join', { fileId });
}

export function leaveFile(fileId) {
  socket?.emit('file:leave', { fileId });
}

export function sendCursor(projectId, fileId, cursor) {
  socket?.emit('cursor:move', { projectId, fileId, cursor });
}
