// features/warehouse-spa/api/client.ts

import { api } from '@/shared/api/client';
import type {
  ItemsPage,
  MovementsPage,
  WarehouseAlert,
  WarehouseCategory,
  WarehouseItem,
  WarehouseLocation,
  WarehouseLot,
  WarehouseSummary,
  BOMLine,
  ShortageReport,
} from './types';

const BASE = '/warehouse';

export const warehouseApi = {
  // Summary
  getSummary: () => api.get<WarehouseSummary>(`${BASE}/summary`),

  // Categories
  listCategories: () => api.get<WarehouseCategory[]>(`${BASE}/categories`),
  createCategory: (name: string, color?: string) =>
    api.post<WarehouseCategory>(`${BASE}/categories`, { name, color }),
  deleteCategory: (id: string) => api.delete(`${BASE}/categories/${id}`),

  // Locations
  listLocations: () => api.get<WarehouseLocation[]>(`${BASE}/locations`),
  createLocation: (name: string) => api.post<WarehouseLocation>(`${BASE}/locations`, { name }),
  deleteLocation: (id: string) => api.delete(`${BASE}/locations/${id}`),

  // Items
  listItems: (params?: {
    search?: string;
    categoryId?: string;
    locationId?: string;
    lowStock?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.categoryId) qs.set('categoryId', params.categoryId);
    if (params?.locationId) qs.set('locationId', params.locationId);
    if (params?.lowStock) qs.set('lowStock', 'true');
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return api.get<ItemsPage>(`${BASE}/items${q ? `?${q}` : ''}`);
  },

  getItem: (id: string) => api.get<WarehouseItem>(`${BASE}/items/${id}`),

  createItem: (data: {
    name: string;
    sku?: string;
    unit?: string;
    qty?: number;
    qtyMin?: number;
    qtyMax?: number;
    costPrice?: number;
    categoryId?: string;
    locationId?: string;
    tags?: string[];
    notes?: string;
  }) => api.post<WarehouseItem>(`${BASE}/items`, data),

  updateItem: (
    id: string,
    data: {
      name?: string;
      sku?: string;
      unit?: string;
      qtyMin?: number;
      qtyMax?: number;
      costPrice?: number;
      categoryId?: string | null;
      locationId?: string | null;
      tags?: string[];
      notes?: string;
    },
  ) => api.patch<WarehouseItem>(`${BASE}/items/${id}`, data),

  deleteItem: (id: string) => api.delete(`${BASE}/items/${id}`),

  // Movements
  listMovements: (params?: {
    itemId?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.itemId) qs.set('itemId', params.itemId);
    if (params?.type) qs.set('type', params.type);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
    const q = qs.toString();
    return api.get<MovementsPage>(`${BASE}/movements${q ? `?${q}` : ''}`);
  },

  addMovement: (data: {
    itemId: string;
    type: 'in' | 'out' | 'adjustment' | 'write_off' | 'return';
    qty: number;
    sourceId?: string;
    sourceType?: string;
    reason?: string;
  }) => api.post<void>(`${BASE}/movements`, data),

  // BOM
  listBOMProducts: () =>
    api.get<Array<{ productKey: string; lineCount: number }>>(`${BASE}/bom/products`),
  getBOM: (productKey: string) =>
    api.get<BOMLine[]>(`${BASE}/bom/${encodeURIComponent(productKey)}`),
  setBOM: (productKey: string, lines: Array<{ itemId: string; qtyPerUnit: number }>) =>
    api.put<void>(`${BASE}/bom`, { productKey, lines }),

  // Shortage check
  checkOrder: (orderId: string, reserve = true) =>
    api.post<ShortageReport>(`${BASE}/check-order/${orderId}`, { reserve }),
  releaseOrder: (orderId: string) =>
    api.post<void>(`${BASE}/release-order/${orderId}`, {}),

  // Alerts
  listAlerts: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return api.get<WarehouseAlert[]>(`${BASE}/alerts${q}`);
  },
  resolveAlert: (id: string) => api.patch(`${BASE}/alerts/${id}/resolve`, {}),

  // Lots
  listLots: (itemId?: string) => {
    const q = itemId ? `?itemId=${itemId}` : '';
    return api.get<WarehouseLot[]>(`${BASE}/lots${q}`);
  },
  createLot: (data: {
    itemId: string;
    lotNumber: string;
    qty: number;
    supplier?: string;
    expiresAt?: string;
    notes?: string;
  }) => api.post<WarehouseLot>(`${BASE}/lots`, data),
};
