import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type { WorkspaceModalSize, WorkspaceTile, WorkspaceViewport, WorkspaceWidgetKind } from './types';

export const WORLD_FACTOR = 3;

const DEFAULT_TILE_SIZE: Record<WorkspaceWidgetKind, { width: number; height: number }> = {
  customers: { width: 260, height: 170 },
  deals:     { width: 260, height: 170 },
  tasks:     { width: 260, height: 170 },
  reports:   { width: 240, height: 155 },
  imports:   { width: 240, height: 155 },
  draft:     { width: 260, height: 170 },
};

const TITLES: Record<WorkspaceWidgetKind, string> = {
  customers: 'Клиенты',
  deals:     'Сделки',
  tasks:     'Задачи',
  reports:   'Сводка',
  imports:   'Импорт',
  draft:     'Черновик',
};

interface WorkspaceStore {
  tiles: WorkspaceTile[];
  viewport: WorkspaceViewport;
  viewportSize: { width: number; height: number };
  viewportReady: boolean;
  activeTileId: string | null;
  settingsTileId: string | null;
  recentTileId: string | null;
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

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      tiles: [],
      viewport: { x: 0, y: 0 },
      viewportSize: { width: 0, height: 0 },
      viewportReady: false,
      activeTileId: null,
      settingsTileId: null,
      recentTileId: null,

      addTile: (kind) => {
        const { viewport, viewportSize } = get();
        const size = DEFAULT_TILE_SIZE[kind];

        // Spawn at center of VISIBLE viewport area
        const visibleCenterX = -viewport.x + viewportSize.width / 2 - size.width / 2;
        const visibleCenterY = -viewport.y + viewportSize.height / 2 - size.height / 2;

        // Scatter slightly so multiple tiles don't stack
        const scatter = get().tiles.length;
        const offsetX = (scatter % 4) * 24 - 36;
        const offsetY = Math.floor(scatter / 4) * 24 - 12;

        const id = nanoid();
        const tile: WorkspaceTile = {
          id,
          kind,
          title: TITLES[kind],
          x: Math.max(20, visibleCenterX + offsetX),
          y: Math.max(20, visibleCenterY + offsetY),
          width: size.width,
          height: size.height,
          modalSize: 'default',
          version: 1,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({ tiles: [...state.tiles, tile], recentTileId: id }));

        // Clear glow after 3 seconds
        setTimeout(() => {
          set((s) => (s.recentTileId === id ? { recentTileId: null } : {}));
        }, 3000);
      },

      setTilePosition: (id, x, y) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, x, y } : t)),
      })),

      removeTile: (id) => set((state) => ({
        tiles: state.tiles.filter((t) => t.id !== id),
        activeTileId: state.activeTileId === id ? null : state.activeTileId,
        settingsTileId: state.settingsTileId === id ? null : state.settingsTileId,
      })),

      renameTile: (id, title) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, title: title.trim() || t.title } : t)),
      })),

      resizeModal: (id, modalSize) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, modalSize } : t)),
      })),

      reloadTile: (id) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, version: t.version + 1 } : t)),
      })),

      openTile: (id) => set({ activeTileId: id }),
      minimizeTile: () => set({ activeTileId: null, settingsTileId: null }),
      openSettings: (id) => set({ settingsTileId: id }),
      closeSettings: () => set({ settingsTileId: null }),
      setViewport: (x, y) => set({ viewport: { x, y } }),

      initializeViewport: (width, height) => {
        set((s) => ({
          viewportSize: { width, height },
          viewport: s.viewportReady ? s.viewport : { x: 0, y: 0 },
          viewportReady: true,
        }));
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
