import { create } from 'zustand';
import { notificationsApi } from '../api/client';
import type { Notification } from '../api/types';

interface NotifState {
  items: Notification[];
  load: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  unreadCount: () => number;
}

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  load: async () => { const items = await notificationsApi.getAll(); set({ items }); },
  markRead: async (id) => {
    set(s => ({ items: s.items.map(n => n.id === id ? { ...n, read: true } : n) }));
    await notificationsApi.markRead(id);
  },
  unreadCount: () => get().items.filter(n => !n.read).length,
}));
