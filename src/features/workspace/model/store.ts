import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { WorkspaceTile, WorkspaceViewport, WorkspaceWidgetKind } from './types';

const WORLD_FACTOR = 2;

const DEFAULT_TILE_SIZE = {
  customers: { width: 460, height: 300 },
  deals: { width: 460, height: 300 },
  tasks: { width: 460, height: 300 },
  reports: { width: 420, height: 280 },
  imports: { width: 420, height: 260 },
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
  addTile: (kind: WorkspaceWidgetKind) => void;
  setTilePosition: (id: string, x: number, y: number) => void;
  removeTile: (id: string) => void;
  setViewport: (x: number, y: number) => void;
  initializeViewport: (width: number, height: number) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createTile(kind: WorkspaceWidgetKind, index: number): WorkspaceTile {
  const size = DEFAULT_TILE_SIZE[kind];
  const column = index % 3;
  const row = Math.floor(index / 3);

  return {
    id: nanoid(),
    kind,
    title: TITLES[kind],
    x: 100 + column * 500,
    y: 120 + row * 340,
    width: size.width,
    height: size.height,
    createdAt: new Date().toISOString(),
  };
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      tiles: [],
      viewport: { x: 0, y: 0 },
      viewportReady: false,
      addTile: (kind) => set((state) => ({
        tiles: [...state.tiles, createTile(kind, state.tiles.length)],
      })),
      setTilePosition: (id, x, y) => set((state) => ({
        tiles: state.tiles.map((tile) => (tile.id === id ? { ...tile, x, y } : tile)),
      })),
      removeTile: (id) => set((state) => ({
        tiles: state.tiles.filter((tile) => tile.id !== id),
      })),
      setViewport: (x, y) => set(() => ({ viewport: { x, y } })),
      initializeViewport: (width, height) => {
        if (get().viewportReady) return;
        const minX = -(width * (WORLD_FACTOR - 1));
        const minY = -(height * (WORLD_FACTOR - 1));
        set({
          viewport: {
            x: clamp(-width * 0.2, minX, 0),
            y: clamp(-height * 0.12, minY, 0),
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
