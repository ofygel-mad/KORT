// features/warehouse-spa/api/types.ts

export type MovementType = 'in' | 'out' | 'adjustment' | 'write_off' | 'return' | 'reserved' | 'reservation_released';
export type AlertType = 'low_stock' | 'shortage_for_order' | 'predicted_shortage' | 'expired_lot';
export type AlertStatus = 'open' | 'resolved' | 'snoozed';
export type ReservationStatus = 'active' | 'released' | 'fulfilled';

export interface WarehouseCategory {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface WarehouseLocation {
  id: string;
  name: string;
}

export interface WarehouseItem {
  id: string;
  orgId: string;
  categoryId: string | null;
  locationId: string | null;
  sku: string | null;
  name: string;
  unit: string;
  qty: number;
  qtyReserved: number;
  qtyMin: number;
  qtyMax: number | null;
  costPrice: number | null;
  tags: string[];
  notes: string | null;
  qrCode: string | null;
  createdAt: string;
  updatedAt: string;
  category?: WarehouseCategory | null;
  location?: WarehouseLocation | null;
  lots?: WarehouseLot[];
}

export interface WarehouseMovement {
  id: string;
  itemId: string;
  type: MovementType;
  qty: number;
  qtyBefore: number;
  qtyAfter: number;
  sourceId: string | null;
  sourceType: string | null;
  reason: string | null;
  author: string;
  createdAt: string;
  item?: { name: string; unit: string; sku: string | null };
}

export interface WarehouseAlert {
  id: string;
  itemId: string;
  type: AlertType;
  sourceId: string | null;
  qtyNeed: number | null;
  qtyHave: number | null;
  status: AlertStatus;
  createdAt: string;
  resolvedAt: string | null;
  item?: { name: string; unit: string; sku: string | null };
}

export interface WarehouseLot {
  id: string;
  itemId: string;
  lotNumber: string;
  qty: number;
  supplier: string | null;
  receivedAt: string;
  expiresAt: string | null;
  notes: string | null;
}

export interface BOMLine {
  id: string;
  productKey: string;
  itemId: string;
  qtyPerUnit: number;
  item: { id: string; name: string; unit: string; sku: string | null; qty: number; qtyReserved: number };
}

export interface ShortageItem {
  itemId: string;
  itemName: string;
  unit: string;
  needed: number;
  available: number;
  reserved: number;
  shortage: number;
}

export interface ShortageReport {
  orderId: string;
  status: 'ok' | 'partial' | 'blocked';
  items: ShortageItem[];
  reservedCount: number;
  shortageCount: number;
  checkedAt: string;
}

export interface WarehouseSummary {
  totalItems: number;
  openAlerts: number;
  lowStockCount: number;
  totalMovementsToday: number;
  lowItems: Array<{ id: string; name: string; unit: string; qty: number; qtyReserved: number; qtyMin: number }>;
}

export interface ItemsPage {
  total: number;
  page: number;
  pageSize: number;
  items: WarehouseItem[];
}

export interface MovementsPage {
  total: number;
  page: number;
  pageSize: number;
  movements: WarehouseMovement[];
}
