import { create } from 'zustand';

export const useCollabStore = create((set, get) => ({
  connected: false,
  onlineUsers: [],
  cursors: {},
  typingUsers: [],

  setConnected: (val) => set({ connected: val }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  addUser: (user) => set((s) => {
    if (s.onlineUsers.find((u) => u.id === user.id)) return s;
    return { onlineUsers: [...s.onlineUsers, user] };
  }),

  removeUser: (userId) => set((s) => ({
    onlineUsers: s.onlineUsers.filter((u) => u.id !== userId),
  })),

  updateCursor: (userId, cursor) => set((s) => ({
    cursors: { ...s.cursors, [userId]: cursor },
  })),

  removeCursor: (userId) => set((s) => {
    const { [userId]: _, ...rest } = s.cursors;
    return { cursors: rest };
  }),

  setTypingUsers: (users) => set({ typingUsers: users }),
}));
