// features/warehouse-spa/model/warehouse.store.ts

import { create } from 'zustand';
import { warehouseApi } from '../api/client';
import { useBadgeStore } from '../../shared-bus/badge.store';
import type {
  WarehouseItem,
  WarehouseMovement,
  WarehouseAlert,
  WarehouseCategory,
  WarehouseLocation,
  WarehouseSummary,
  BOMLine,
  ShortageReport,
} from '../api/types';

interface WarehouseState {
  // Data
  items: WarehouseItem[];
  movements: WarehouseMovement[];
  alerts: WarehouseAlert[];
  categories: WarehouseCategory[];
  locations: WarehouseLocation[];
  summary: WarehouseSummary | null;
  bomByProduct: Record<string, BOMLine[]>;

  // Pagination
  itemsTotal: number;
  itemsPage: number;
  movementsTotal: number;
  movementsPage: number;

  // Filter state
  searchQuery: string;
  filterCategoryId: string | null;
  filterLocationId: string | null;
  filterLowStock: boolean;

  // UI state
  loading: boolean;
  loadingMovements: boolean;
  loadingAlerts: boolean;
  error: string | null;

  // Actions — data
  loadAll: () => Promise<void>;
  loadItems: (filters?: { search?: string; categoryId?: string; locationId?: string; lowStock?: boolean; page?: number }) => Promise<void>;
  loadMovements: (itemId?: string, page?: number) => Promise<void>;
  loadAlerts: () => Promise<void>;
  loadSummary: () => Promise<void>;

  // Item CRUD
  createItem: (data: Parameters<typeof warehouseApi.createItem>[0]) => Promise<WarehouseItem>;
  updateItem: (id: string, data: Parameters<typeof warehouseApi.updateItem>[1]) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Movement
  addMovement: (data: Parameters<typeof warehouseApi.addMovement>[0]) => Promise<void>;

  // Alerts
  resolveAlert: (id: string) => Promise<void>;

  // BOM
  getBOM: (productKey: string) => Promise<BOMLine[]>;
  setBOM: (productKey: string, lines: Array<{ itemId: string; qtyPerUnit: number }>) => Promise<void>;

  // Shortage check
  checkOrder: (orderId: string) => Promise<ShortageReport>;

  // Category/Location CRUD
  createCategory: (name: string, color?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createLocation: (name: string) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;

  // Filter helpers
  setSearch: (q: string) => void;
  setFilterCategory: (id: string | null) => void;
  setFilterLocation: (id: string | null) => void;
  setFilterLowStock: (v: boolean) => void;
  resetFilters: () => void;
}

export const useWarehouseStore = create<WarehouseState>()((set, get) => ({
  items: [],
  movements: [],
  alerts: [],
  categories: [],
  locations: [],
  summary: null,
  bomByProduct: {},
  itemsTotal: 0,
  itemsPage: 1,
  movementsTotal: 0,
  movementsPage: 1,
  searchQuery: '',
  filterCategoryId: null,
  filterLocationId: null,
  filterLowStock: false,
  loading: false,
  loadingMovements: false,
  loadingAlerts: false,
  error: null,

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const [itemsRes, categories, locations, alerts, summary] = await Promise.all([
        warehouseApi.listItems({ pageSize: 100 }),
        warehouseApi.listCategories(),
        warehouseApi.listLocations(),
        warehouseApi.listAlerts('open'),
        warehouseApi.getSummary(),
      ]);
      set({
        items: itemsRes.items,
        itemsTotal: itemsRes.total,
        categories,
        locations,
        alerts,
        summary,
        loading: false,
      });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Ошибка загрузки' });
    }
  },

  loadItems: async (filters) => {
    set({ loading: true });
    try {
      const state = get();
      const res = await warehouseApi.listItems({
        search: filters?.search ?? state.searchQuery,
        categoryId: filters?.categoryId ?? state.filterCategoryId ?? undefined,
        locationId: filters?.locationId ?? state.filterLocationId ?? undefined,
        lowStock: filters?.lowStock ?? state.filterLowStock,
        page: filters?.page ?? state.itemsPage,
        pageSize: 50,
      });
      set({ items: res.items, itemsTotal: res.total, itemsPage: res.page, loading: false });
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : 'Ошибка' });
    }
  },

  loadMovements: async (itemId, page) => {
    set({ loadingMovements: true });
    try {
      const res = await warehouseApi.listMovements({ itemId, page: page ?? 1, pageSize: 50 });
      set({ movements: res.movements, movementsTotal: res.total, movementsPage: res.page, loadingMovements: false });
    } catch {
      set({ loadingMovements: false });
    }
  },

  loadAlerts: async () => {
    set({ loadingAlerts: true });
    try {
      const alerts = await warehouseApi.listAlerts('open');
      const prev = get().alerts;
      // Badge: if new alerts appeared, increment
      const newCount = alerts.length - prev.length;
      if (newCount > 0) {
        useBadgeStore.getState().incrementBadge('warehouse', newCount);
      }
      set({ alerts, loadingAlerts: false });
    } catch {
      set({ loadingAlerts: false });
    }
  },

  loadSummary: async () => {
    try {
      const summary = await warehouseApi.getSummary();
      set({ summary });
    } catch {
      // non-critical
    }
  },

  createItem: async (data) => {
    const item = await warehouseApi.createItem(data);
    set((s) => ({ items: [item, ...s.items], itemsTotal: s.itemsTotal + 1 }));
    void get().loadSummary();
    return item;
  },

  updateItem: async (id, data) => {
    const updated = await warehouseApi.updateItem(id, data);
    set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
  },

  deleteItem: async (id) => {
    await warehouseApi.deleteItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id), itemsTotal: Math.max(0, s.itemsTotal - 1) }));
    void get().loadSummary();
  },

  addMovement: async (data) => {
    await warehouseApi.addMovement(data);
    // Refresh item and movements
    const itemRes = await warehouseApi.getItem(data.itemId);
    set((s) => ({ items: s.items.map((i) => (i.id === data.itemId ? itemRes : i)) }));
    void get().loadMovements(data.itemId);
    void get().loadAlerts();
    void get().loadSummary();
  },

  resolveAlert: async (id) => {
    await warehouseApi.resolveAlert(id);
    set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }));
    useBadgeStore.getState().decrementBadge('warehouse', 1);
    void get().loadSummary();
  },

  getBOM: async (productKey) => {
    const lines = await warehouseApi.getBOM(productKey);
    set((s) => ({ bomByProduct: { ...s.bomByProduct, [productKey]: lines } }));
    return lines;
  },

  setBOM: async (productKey, lines) => {
    await warehouseApi.setBOM(productKey, lines);
    const fresh = await warehouseApi.getBOM(productKey);
    set((s) => ({ bomByProduct: { ...s.bomByProduct, [productKey]: fresh } }));
  },

  checkOrder: async (orderId) => {
    const report = await warehouseApi.checkOrder(orderId, true);

    // Publish shortage event to shared-bus so Production tiles can react
    if (report.status !== 'ok') {
      const { useSharedBus } = await import('../../shared-bus');
      useSharedBus.getState().publishWarehouseShortage({
        orderId,
        items: report.items
          .filter((i) => i.shortage > 0)
          .map((i) => ({
            itemId: i.itemId,
            itemName: i.itemName,
            unit: i.unit,
            needed: i.needed,
            available: i.available,
            shortage: i.shortage,
          })),
        detectedAt: report.checkedAt,
      });
      // Also emit a global notif
      useSharedBus.getState().publishGlobalNotif({
        id: `wh-shortage-${orderId}-${Date.now()}`,
        title: 'Нехватка материалов',
        body: `По заказу не хватает ${report.shortageCount} позиций на складе`,
        kind: 'warning',
        createdAt: new Date().toISOString(),
        source: 'warehouse',
      });
    } else if (report.status === 'ok' && report.reservedCount > 0) {
      const { useSharedBus } = await import('../../shared-bus');
      useSharedBus.getState().publishWarehouseStockAvailable({
        orderId,
        itemIds: report.items.map((i) => i.itemId),
        resolvedAt: report.checkedAt,
      });
    }

    return report;
  },

  createCategory: async (name, color) => {
    const cat = await warehouseApi.createCategory(name, color);
    set((s) => ({ categories: [...s.categories, cat] }));
  },

  deleteCategory: async (id) => {
    await warehouseApi.deleteCategory(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  createLocation: async (name) => {
    const loc = await warehouseApi.createLocation(name);
    set((s) => ({ locations: [...s.locations, loc] }));
  },

  deleteLocation: async (id) => {
    await warehouseApi.deleteLocation(id);
    set((s) => ({ locations: s.locations.filter((l) => l.id !== id) }));
  },

  setSearch: (q) => { set({ searchQuery: q }); void get().loadItems({ search: q, page: 1 }); },
  setFilterCategory: (id) => { set({ filterCategoryId: id }); void get().loadItems({ categoryId: id ?? undefined, page: 1 }); },
  setFilterLocation: (id) => { set({ filterLocationId: id }); void get().loadItems({ locationId: id ?? undefined, page: 1 }); },
  setFilterLowStock: (v) => { set({ filterLowStock: v }); void get().loadItems({ lowStock: v, page: 1 }); },
  resetFilters: () => {
    set({ searchQuery: '', filterCategoryId: null, filterLocationId: null, filterLowStock: false });
    void get().loadItems({ page: 1 });
  },
}));
