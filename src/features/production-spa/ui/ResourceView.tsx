/**
 * features/production-spa/ui/ResourceView.tsx
 *
 * Workshop resources: workers (with load), equipment (with status).
 */

import { AlertTriangle, CheckCircle, Settings, User, Wrench } from 'lucide-react';
import type { WorkshopWorker, WorkshopEquipment, ProductionOrder } from '../api/types';
import s from './ResourceView.module.css';

interface Props {
  workers: WorkshopWorker[];
  equipment: WorkshopEquipment[];
  orders: ProductionOrder[];
}

const EQUIPMENT_STATUS_LABEL: Record<WorkshopEquipment['status'], string> = {
  active: 'Работает',
  maintenance: 'ТО',
  broken: 'Не работает',
};

export function ResourceView({ workers, equipment, orders }: Props) {
  // Compute active tasks per worker
  const workerTaskCount = Object.fromEntries(
    workers.map((w) => [
      w.name,
      orders.flatMap((o) => o.tasks).filter((t) => t.assignedTo === w.name && t.status === 'in_progress').length,
    ]),
  );

  const maxLoad = Math.max(1, ...Object.values(workerTaskCount));

  return (
    <div className={s.root}>
      {/* Workers */}
      <div className={s.section}>
        <div className={s.sectionHeader}>
          <User size={14} />
          <span>Исполнители</span>
          <span className={s.count}>{workers.length}</span>
        </div>

        {workers.length === 0 && (
          <div className={s.empty}>Исполнители не добавлены</div>
        )}

        <div className={s.grid}>
          {workers.map((w) => {
            const load = workerTaskCount[w.name] ?? 0;
            const pct = maxLoad > 0 ? (load / maxLoad) * 100 : 0;
            const isActive = load > 0;

            return (
              <div key={w.id} className={s.workerCard} data-active={isActive}>
                <div className={s.workerAvatar}>
                  {w.name.split(' ').map((p) => p[0]).join('').slice(0, 2)}
                </div>
                <div className={s.workerBody}>
                  <div className={s.workerName}>{w.name}</div>
                  {w.role && <div className={s.workerRole}>{w.role}</div>}
                  <div className={s.workerLoad}>
                    <div className={s.loadTrack}>
                      <div className={s.loadFill} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={s.loadLabel}>
                      {load > 0 ? `${load} задач` : 'Свободен'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment */}
      {equipment.length > 0 && (
        <div className={s.section}>
          <div className={s.sectionHeader}>
            <Wrench size={14} />
            <span>Оборудование</span>
            <span className={s.count}>{equipment.length}</span>
          </div>

          <div className={s.grid}>
            {equipment.map((eq) => (
              <div key={eq.id} className={s.equipCard} data-status={eq.status}>
                <div className={s.equipIcon}>
                  {eq.status === 'active'
                    ? <CheckCircle size={16} />
                    : <AlertTriangle size={16} />}
                </div>
                <div className={s.equipBody}>
                  <div className={s.equipName}>{eq.name}</div>
                  {eq.type && <div className={s.equipType}>{eq.type}</div>}
                  <div className={s.equipStatus} data-status={eq.status}>
                    {EQUIPMENT_STATUS_LABEL[eq.status]}
                    {eq.nextMaintenanceAt && eq.status === 'maintenance' && (
                      <span className={s.maintenanceDate}>
                        до {new Date(eq.nextMaintenanceAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                <div className={s.equipActions}>
                  <button className={s.iconBtn} title="Настроить">
                    <Settings size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
