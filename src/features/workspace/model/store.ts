import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { WorkspaceModalSize, WorkspaceTile, WorkspaceViewport, WorkspaceWidgetKind } from './types';

const WORLD_FACTOR = 3;

const DEFAULT_TILE_SIZE = {
  customers: { width: 248, height: 160 },
  deals: { width: 248, height: 160 },
  tasks: { width: 248, height: 160 },
  reports: { width: 228, height: 146 },
  imports: { width: 228, height: 146 },
} as const;

const TITLES: Record<WorkspaceWidgetKind, string> = {
  customers: 'Клиенты',
  deals: 'Сделки',
  tasks: 'Задачи',
  reports: 'Сводка',
  imports: 'Импорт',
};

interface WorkspaceStore {
  tiles: WorkspaceTile[];
  viewport: WorkspaceViewport;
  viewportReady: boolean;
  activeTileId: string | null;
  settingsTileId: string | null;
  addTile: (kind: WorkspaceWidgetKind) => void;
  setTilePosition: (id: string, x: number, y: number) => void;
  removeTile: (id: string) => void;
  renameTile: (id: string, title: string) => void;
  resizeModal: (id: string, size: WorkspaceModalSize) => void;
  reloadTile: (id: string) => void;
  openTile: (id: string) => void;
  minimizeTile: () => void;
  openSettings: (id: string) => void;
  closeSettings: () => void;
  setViewport: (x: number, y: number) => void;
  initializeViewport: (width: number, height: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createTile(kind: WorkspaceWidgetKind, index: number): WorkspaceTile {
  const size = DEFAULT_TILE_SIZE[kind];
  const column = index % 5;
  const row = Math.floor(index / 5);

  return {
    id: nanoid(),
    kind,
    title: TITLES[kind],
    x: 112 + column * 288,
    y: 96 + row * 196,
    width: size.width,
    height: size.height,
    modalSize: 'default',
    version: 1,
    createdAt: new Date().toISOString(),
  };
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      tiles: [],
      viewport: { x: 0, y: 0 },
      viewportReady: false,
      activeTileId: null,
      settingsTileId: null,
      addTile: (kind) => set((state) => ({
        tiles: [...state.tiles, createTile(kind, state.tiles.length)],
      })),
      setTilePosition: (id, x, y) => set((state) => ({
        tiles: state.tiles.map((tile) => (tile.id === id ? { ...tile, x, y } : tile)),
      })),
      removeTile: (id) => set((state) => ({
        tiles: state.tiles.filter((tile) => tile.id !== id),
        activeTileId: state.activeTileId === id ? null : state.activeTileId,
        settingsTileId: state.settingsTileId === id ? null : state.settingsTileId,
      })),
      renameTile: (id, title) => set((state) => ({
        tiles: state.tiles.map((tile) => (tile.id === id ? { ...tile, title: title.trim() || tile.title } : tile)),
      })),
      resizeModal: (id, modalSize) => set((state) => ({
        tiles: state.tiles.map((tile) => (tile.id === id ? { ...tile, modalSize } : tile)),
      })),
      reloadTile: (id) => set((state) => ({
        tiles: state.tiles.map((tile) => (tile.id === id ? { ...tile, version: tile.version + 1 } : tile)),
      })),
      openTile: (id) => set({ activeTileId: id }),
      minimizeTile: () => set({ activeTileId: null, settingsTileId: null }),
      openSettings: (id) => set({ settingsTileId: id }),
      closeSettings: () => set({ settingsTileId: null }),
      setViewport: (x, y) => set(() => ({ viewport: { x, y } })),
      initializeViewport: (width, height) => {
        if (get().viewportReady) return;
        const minX = -(width * (WORLD_FACTOR - 1));
        const minY = -(height * (WORLD_FACTOR - 1));
        set({
          viewport: {
            x: clamp(-width * 0.18, minX, 0),
            y: clamp(-height * 0.1, minY, 0),
          },
          viewportReady: true,
        });
      },
    }),
    {
      name: 'kort-workspace',
      partialize: (state) => ({
        tiles: state.tiles,
        viewport: state.viewport,
        viewportReady: state.viewportReady,
      }),
    },
  ),
);

export { WORLD_FACTOR };
