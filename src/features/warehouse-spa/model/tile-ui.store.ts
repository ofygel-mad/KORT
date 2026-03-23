// features/warehouse-spa/model/tile-ui.store.ts

import { create } from 'zustand';

export type WarehouseTab = 'stock' | 'movements' | 'alerts' | 'bom';

interface TileUIState {
  tileStates: Record<string, {
    activeTab: WarehouseTab;
    openItemId: string | null;
    addItemOpen: boolean;
    addMovementItemId: string | null; // which item to add movement for
    addLotItemId: string | null;
  }>;
  setTab: (tileId: string, tab: WarehouseTab) => void;
  openItem: (tileId: string, id: string | null) => void;
  setAddItemOpen: (tileId: string, v: boolean) => void;
  setAddMovementItemId: (tileId: string, id: string | null) => void;
  setAddLotItemId: (tileId: string, id: string | null) => void;
}

function defaultTileState() {
  return {
    activeTab: 'stock' as WarehouseTab,
    openItemId: null,
    addItemOpen: false,
    addMovementItemId: null,
    addLotItemId: null,
  };
}

export const useTileWarehouseUI = create<TileUIState>()((set) => ({
  tileStates: {},

  setTab: (tileId, tab) =>
    set((s) => ({
      tileStates: {
        ...s.tileStates,
        [tileId]: { ...(s.tileStates[tileId] ?? defaultTileState()), activeTab: tab },
      },
    })),

  openItem: (tileId, id) =>
    set((s) => ({
      tileStates: {
        ...s.tileStates,
        [tileId]: { ...(s.tileStates[tileId] ?? defaultTileState()), openItemId: id },
      },
    })),

  setAddItemOpen: (tileId, v) =>
    set((s) => ({
      tileStates: {
        ...s.tileStates,
        [tileId]: { ...(s.tileStates[tileId] ?? defaultTileState()), addItemOpen: v },
      },
    })),

  setAddMovementItemId: (tileId, id) =>
    set((s) => ({
      tileStates: {
        ...s.tileStates,
        [tileId]: { ...(s.tileStates[tileId] ?? defaultTileState()), addMovementItemId: id },
      },
    })),

  setAddLotItemId: (tileId, id) =>
    set((s) => ({
      tileStates: {
        ...s.tileStates,
        [tileId]: { ...(s.tileStates[tileId] ?? defaultTileState()), addLotItemId: id },
      },
    })),
}));

// Selector helpers
export function useTileWarehouseState(tileId: string) {
  const state = useTileWarehouseUI((s) => s.tileStates[tileId] ?? defaultTileState());
  const actions = useTileWarehouseUI((s) => ({
    setTab: (tab: WarehouseTab) => s.setTab(tileId, tab),
    openItem: (id: string | null) => s.openItem(tileId, id),
    setAddItemOpen: (v: boolean) => s.setAddItemOpen(tileId, v),
    setAddMovementItemId: (id: string | null) => s.setAddMovementItemId(tileId, id),
    setAddLotItemId: (id: string | null) => s.setAddLotItemId(tileId, id),
  }));
  return { ...state, ...actions };
}
