import { createStore, useStore } from 'zustand';
import type { StoreApi } from 'zustand';
import type { Task, TaskStatus, TaskPriority, ViewMode, GroupBy, SortBy } from '../api/types';

export interface TileTasksUIState {
  activeId: string | null;
  drawerOpen: boolean;
  createModalOpen: boolean;
  createPreset: Partial<Task> | null;
  viewMode: ViewMode;
  groupBy: GroupBy;
  sortBy: SortBy;
  filterStatus: TaskStatus | 'all';
  filterPriority: TaskPriority | 'all';
  filterAssignee: string | 'all';
  searchQuery: string;

  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  openCreateModal: (preset?: Partial<Task>) => void;
  closeCreateModal: () => void;
  setViewMode: (m: ViewMode) => void;
  setGroupBy: (g: GroupBy) => void;
  setSortBy: (s: SortBy) => void;
  setFilterStatus: (s: TaskStatus | 'all') => void;
  setFilterPriority: (p: TaskPriority | 'all') => void;
  setFilterAssignee: (a: string | 'all') => void;
  setSearchQuery: (q: string) => void;
}

const cache = new Map<string, StoreApi<TileTasksUIState>>();

function createTileTasksUI(): StoreApi<TileTasksUIState> {
  return createStore<TileTasksUIState>()((set) => ({
    activeId: null,
    drawerOpen: false,
    createModalOpen: false,
    createPreset: null,
    viewMode: 'kanban',
    groupBy: 'status',
    sortBy: 'dueAt',
    filterStatus: 'all',
    filterPriority: 'all',
    filterAssignee: 'all',
    searchQuery: '',

    openDrawer: (id) => set({ activeId: id, drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false, activeId: null }),
    openCreateModal: (preset) => set({ createModalOpen: true, createPreset: preset ?? null }),
    closeCreateModal: () => set({ createModalOpen: false, createPreset: null }),
    setViewMode: (viewMode) => set({ viewMode }),
    setGroupBy: (groupBy) => set({ groupBy }),
    setSortBy: (sortBy) => set({ sortBy }),
    setFilterStatus: (filterStatus) => set({ filterStatus }),
    setFilterPriority: (filterPriority) => set({ filterPriority }),
    setFilterAssignee: (filterAssignee) => set({ filterAssignee }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
  }));
}

function getTileTasksUI(tileId: string): StoreApi<TileTasksUIState> {
  if (!cache.has(tileId)) cache.set(tileId, createTileTasksUI());
  return cache.get(tileId)!;
}

export function useTileTasksUI(tileId: string): TileTasksUIState {
  return useStore(getTileTasksUI(tileId));
}

export function clearTileTasksUI(tileId: string): void {
  cache.delete(tileId);
}
