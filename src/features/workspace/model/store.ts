import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { useBadgeStore } from '../../shared-bus/badge.store';
import { clearTileLeadsUI } from '../../leads-spa/model/tile-ui.store';
import { clearTileDealsUI } from '../../deals-spa/model/tile-ui.store';
import { clearTileTasksUI } from '../../tasks-spa/model/tile-ui.store';
import { clearTileChapanUI } from '../../chapan-spa/model/tile-ui.store';
import type { WorkspaceModalSize, WorkspaceTile, WorkspaceViewport, WorkspaceWidgetKind } from './types';

export const WORLD_FACTOR = 3;
export const ZOOM_MIN = 0.35;
export const ZOOM_MAX = 1.8;
export const ZOOM_STEP = 0.08;

const DEFAULT_TILE_SIZE: Record<WorkspaceWidgetKind, { width: number; height: number }> = {
  customers: { width: 280, height: 175 },
  deals:     { width: 260, height: 170 },
  tasks:     { width: 260, height: 170 },
  reports:   { width: 240, height: 155 },
  imports:   { width: 240, height: 155 },
  chapan:    { width: 260, height: 170 },
};

const TITLES: Record<WorkspaceWidgetKind, string> = {
  customers: 'Лиды',
  deals:     'Сделки',
  tasks:     'Задачи',
  reports:   'Сводка',
  imports:   'Импорт',
  chapan:    'Чапан',
};

interface ContextMenuState {
  tileId: string;
  x: number;
  y: number;
}

interface WorkspaceStore {
  tiles: WorkspaceTile[];
  viewport: WorkspaceViewport;
  viewportSize: { width: number; height: number };
  viewportReady: boolean;
  activeTileId: string | null;
  settingsTileId: string | null;
  recentTileId: string | null;
  zoom: number;
  contextMenu: ContextMenuState | null;
  topZIndex: number;

  addTile: (kind: WorkspaceWidgetKind) => string;
  duplicateTile: (id: string) => string | null;
  openWorkspaceTileByKind: (kind: WorkspaceWidgetKind, opts?: { createIfMissing?: boolean }) => string | null;
  alignTilesToGrid: () => void;
  setTilePosition: (id: string, x: number, y: number) => void;
  bringToFront: (id: string) => void;
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
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  pinTile: (id: string) => void;
  openContextMenu: (tileId: string, x: number, y: number) => void;
  closeContextMenu: () => void;
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
      zoom: 1,
      contextMenu: null,
      topZIndex: 10,

      addTile: (kind) => {
        const { viewport, viewportSize, topZIndex } = get();
        const size = DEFAULT_TILE_SIZE[kind];
        const visibleCenterX = -viewport.x + viewportSize.width / 2 - size.width / 2;
        const visibleCenterY = -viewport.y + viewportSize.height / 2 - size.height / 2;
        const scatter = get().tiles.length;
        const offsetX = (scatter % 4) * 24 - 36;
        const offsetY = Math.floor(scatter / 4) * 24 - 12;
        const id = nanoid();
        const newZ = topZIndex + 1;
        const tile: WorkspaceTile = {
          id, kind, title: TITLES[kind],
          x: Math.max(20, visibleCenterX + offsetX),
          y: Math.max(20, visibleCenterY + offsetY),
          width: size.width, height: size.height,
          modalSize: (kind === 'customers' || kind === 'deals') ? 'wide' : 'default',
          version: 1, createdAt: new Date().toISOString(),
          pinned: false, zIndex: newZ,
        };
        set((state) => ({ tiles: [...state.tiles, tile], recentTileId: id, topZIndex: newZ }));
        setTimeout(() => { set((s) => (s.recentTileId === id ? { recentTileId: null } : {})); }, 3000);
        return id;
      },

      duplicateTile: (id) => {
        const state = get();
        const src = state.tiles.find(t => t.id === id);
        if (!src) return null;
        const newId = nanoid();
        const newZ = state.topZIndex + 1;
        const dup: WorkspaceTile = {
          ...src, id: newId, x: src.x + 32, y: src.y + 32,
          version: 1, createdAt: new Date().toISOString(), pinned: false, zIndex: newZ,
        };
        set((s) => ({ tiles: [...s.tiles, dup], recentTileId: newId, topZIndex: newZ }));
        setTimeout(() => { set((s) => (s.recentTileId === newId ? { recentTileId: null } : {})); }, 3000);
        return newId;
      },

      openWorkspaceTileByKind: (kind, opts) => {
        const createIfMissing = opts?.createIfMissing ?? true;
        const state = get();
        const existing = state.tiles
          .filter((tile) => tile.kind === kind)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
        if (existing) { state.openTile(existing.id); return existing.id; }
        if (!createIfMissing) return null;
        const newTileId = state.addTile(kind);
        get().openTile(newTileId);
        return newTileId;
      },

      alignTilesToGrid: () => {
        const { tiles, viewport, viewportSize } = get();
        if (!tiles.length || viewportSize.width <= 0 || viewportSize.height <= 0) return;
        const maxTileWidth = Math.max(...tiles.map((t) => t.width));
        const maxTileHeight = Math.max(...tiles.map((t) => t.height));
        const gap = 24, outerPadding = 20;
        const colWidth = maxTileWidth + gap, rowHeight = maxTileHeight + gap;
        const columns = Math.max(1, Math.floor((viewportSize.width - outerPadding * 2 + gap) / colWidth));
        const worldWidth = viewportSize.width * WORLD_FACTOR;
        const worldHeight = viewportSize.height * WORLD_FACTOR;
        const startX = clamp(-viewport.x + outerPadding, 0, Math.max(0, worldWidth - maxTileWidth));
        const startY = clamp(-viewport.y + outerPadding, 0, Math.max(0, worldHeight - maxTileHeight));
        set((state) => ({
          tiles: state.tiles.map((tile, index) => {
            const col = index % columns, row = Math.floor(index / columns);
            return {
              ...tile,
              x: clamp(startX + col * colWidth, 0, Math.max(0, worldWidth - tile.width)),
              y: clamp(startY + row * rowHeight, 0, Math.max(0, worldHeight - tile.height)),
            };
          }),
        }));
      },

      setTilePosition: (id, x, y) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, x, y } : t)),
      })),

      bringToFront: (id) => {
        const newZ = get().topZIndex + 1;
        set((state) => ({
          tiles: state.tiles.map((t) => (t.id === id ? { ...t, zIndex: newZ } : t)),
          topZIndex: newZ,
        }));
      },

      removeTile: (id) => {
        clearTileLeadsUI(id); clearTileDealsUI(id); clearTileTasksUI(id); clearTileChapanUI(id);
        set((state) => ({
          tiles: state.tiles.filter((t) => t.id !== id),
          activeTileId: state.activeTileId === id ? null : state.activeTileId,
          settingsTileId: state.settingsTileId === id ? null : state.settingsTileId,
          contextMenu: state.contextMenu?.tileId === id ? null : state.contextMenu,
        }));
      },

      renameTile: (id, title) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, title: title.trim() || t.title } : t)),
      })),

      resizeModal: (id, modalSize) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, modalSize } : t)),
      })),

      reloadTile: (id) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, version: t.version + 1 } : t)),
      })),

      openTile: (id) => {
        set({ activeTileId: id, contextMenu: null });
        const tile = get().tiles.find(t => t.id === id);
        if (tile && (tile.kind === 'customers' || tile.kind === 'deals')) {
          useBadgeStore.getState().clearBadge(tile.kind);
        }
        // bring to front visually
        get().bringToFront(id);
      },

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

      setZoom: (zoom) => set({ zoom: clamp(zoom, ZOOM_MIN, ZOOM_MAX) }),
      zoomIn:  () => set((s) => ({ zoom: clamp(+(s.zoom + ZOOM_STEP).toFixed(2), ZOOM_MIN, ZOOM_MAX) })),
      zoomOut: () => set((s) => ({ zoom: clamp(+(s.zoom - ZOOM_STEP).toFixed(2), ZOOM_MIN, ZOOM_MAX) })),
      resetZoom: () => set({ zoom: 1 }),

      pinTile: (id) => set((state) => ({
        tiles: state.tiles.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
      })),

      openContextMenu: (tileId, x, y) => set({ contextMenu: { tileId, x, y } }),
      closeContextMenu: () => set({ contextMenu: null }),
    }),
    {
      name: 'kort-workspace',
      partialize: (state) => ({
        tiles: state.tiles,
        viewport: state.viewport,
        viewportReady: state.viewportReady,
        zoom: state.zoom,
        topZIndex: state.topZIndex,
      }),
    },
  ),
);
