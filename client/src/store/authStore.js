import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  loading: false,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.data.accessToken);
    set({ user: data.data.user, token: data.data.accessToken });
    return data;
  },

  register: async (fullName, username, email, password) => {
    const { data } = await api.post('/auth/register', { fullName, username, email, password });
    localStorage.setItem('token', data.data.accessToken);
    set({ user: data.data.user, token: data.data.accessToken });
    return data;
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data });
      return data.data;
    } catch {
      localStorage.removeItem('token');
      set({ user: null, token: null });
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
    api.post('/auth/logout').catch(() => {});
    window.location.href = '/login';
  },
}));
