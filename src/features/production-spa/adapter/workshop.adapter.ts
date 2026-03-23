/**
 * features/production-spa/adapter/workshop.adapter.ts
 *
 * Adapts the WorkshopStore for WorkshopSPA.
 * Implements the same ProductionAdapter interface as ChapanAdapter.
 */

import { useWorkshopStore } from '../model/store';
import type { ProductionAdapter } from './types';
import type {
  WorkshopProfile,
  WorkshopWorker,
  WorkshopEquipment,
  ProductionStage,
  ProductionOrder,
} from '../api/types';

const DEFAULT_PROFILE: WorkshopProfile = {
  id: '',
  name: 'Цех',
  orderPrefix: 'ЦЕХ',
  mode: 'light',
};

export function useWorkshopAdapter(workshopId: string): ProductionAdapter {
  const store = useWorkshopStore();

  const orders: ProductionOrder[] = store.ordersMap[workshopId] ?? [];
  const profile: WorkshopProfile = store.profileMap[workshopId] ?? { ...DEFAULT_PROFILE, id: workshopId };
  const workers: WorkshopWorker[] = store.workersMap[workshopId] ?? [];
  const equipment: WorkshopEquipment[] = store.equipmentMap[workshopId] ?? [];
  const stages: ProductionStage[] = store.stagesMap[workshopId] ?? [];
  const loading: boolean = store.loadingMap[workshopId] ?? false;
  const error: string | null = store.errorMap[workshopId] ?? null;

  return {
    orders,
    workers,
    equipment,
    stages,
    profile,
    loading,
    error,

    load: () => store.load(workshopId),
    createOrder: (data) => store.createOrder(workshopId, data),
    moveOrderStatus: (orderId, status) => store.moveOrderStatus(workshopId, orderId, status),
    cancelOrder: (orderId, reason) => store.cancelOrder(workshopId, orderId, reason),
    moveTaskStatus: (taskId, status) => store.moveTaskStatus(workshopId, taskId, status),
    assignWorker: (taskId, worker) => store.assignWorker(workshopId, taskId, worker),
    flagTask: (taskId, reason) => store.flagTask(workshopId, taskId, reason),
    unflagTask: (taskId) => store.unflagTask(workshopId, taskId),
    checkShortage: (orderId) => store.checkShortage(workshopId, orderId),
  };
}
