import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';

type NavTab = 'qualifier' | 'closer' | 'all';

export interface TileLeadsUIState {
  activeLeadId: string | null;
  drawerOpen: boolean;
  handoffLeadId: string | null;
  currentTab: NavTab;
  searchQuery: string;
  createPanelOpen: boolean;

  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openHandoff: (id: string) => void;
  closeHandoff: () => void;
  setTab: (tab: NavTab) => void;
  setSearch: (q: string) => void;
  setCreatePanelOpen: (open: boolean) => void;
}

const cache = new Map<string, StoreApi<TileLeadsUIState>>();

function createTileLeadsUI(): StoreApi<TileLeadsUIState> {
  return createStore<TileLeadsUIState>()((set) => ({
    activeLeadId: null,
    drawerOpen: false,
    handoffLeadId: null,
    currentTab: 'qualifier',
    searchQuery: '',
    createPanelOpen: false,

    openDrawer: (id) => set({ activeLeadId: id, drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false, activeLeadId: null }),
    openHandoff: (id) => set({ handoffLeadId: id }),
    closeHandoff: () => set({ handoffLeadId: null }),
    setTab: (tab) => set({ currentTab: tab }),
    setSearch: (q) => set({ searchQuery: q }),
    setCreatePanelOpen: (open) => set({ createPanelOpen: open }),
  }));
}

function getTileLeadsUI(tileId: string): StoreApi<TileLeadsUIState> {
  if (!cache.has(tileId)) cache.set(tileId, createTileLeadsUI());
  return cache.get(tileId)!;
}

export function useTileLeadsUI(tileId: string): TileLeadsUIState {
  return useStore(getTileLeadsUI(tileId));
}

export function clearTileLeadsUI(tileId: string): void {
  cache.delete(tileId);
}


export function setTileLeadsCreatePanelOpen(tileId: string, open: boolean): void {
  getTileLeadsUI(tileId).setState({ createPanelOpen: open });
}
