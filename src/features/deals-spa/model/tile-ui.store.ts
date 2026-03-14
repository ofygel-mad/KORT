import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';

type NavTab = 'pipeline' | 'all';

export interface TileDealsUIState {
  activeId: string | null;
  drawerOpen: boolean;
  lostModalId: string | null;
  wonModalId: string | null;
  deleteConfirmId: string | null;
  currentTab: NavTab;

  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openLostModal: (id: string) => void;
  closeLostModal: () => void;
  openWonModal: (id: string) => void;
  closeWonModal: () => void;
  openDeleteConfirm: (id: string) => void;
  closeDeleteConfirm: () => void;
  setTab: (tab: NavTab) => void;
}

const cache = new Map<string, StoreApi<TileDealsUIState>>();

function createTileDealsUI(): StoreApi<TileDealsUIState> {
  return createStore<TileDealsUIState>()((set) => ({
    activeId: null,
    drawerOpen: false,
    lostModalId: null,
    wonModalId: null,
    deleteConfirmId: null,
    currentTab: 'pipeline',

    openDrawer: (id) => set({ activeId: id, drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false, activeId: null }),
    openLostModal: (id) => set({ lostModalId: id }),
    closeLostModal: () => set({ lostModalId: null }),
    openWonModal: (id) => set({ wonModalId: id }),
    closeWonModal: () => set({ wonModalId: null }),
    openDeleteConfirm: (id) => set({ deleteConfirmId: id }),
    closeDeleteConfirm: () => set({ deleteConfirmId: null }),
    setTab: (tab) => set({ currentTab: tab }),
  }));
}

function getTileDealsUI(tileId: string): StoreApi<TileDealsUIState> {
  if (!cache.has(tileId)) cache.set(tileId, createTileDealsUI());
  return cache.get(tileId)!;
}

export function useTileDealsUI(tileId: string): TileDealsUIState {
  return useStore(getTileDealsUI(tileId));
}

export function clearTileDealsUI(tileId: string): void {
  cache.delete(tileId);
}
