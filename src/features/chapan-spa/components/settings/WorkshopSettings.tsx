import { useState } from 'react';
import { UserPlus, Trash2, Users, Package, Layers } from 'lucide-react';
import { useChapanStore } from '../../model/chapan.store';
import { PRODUCT_CATALOG, FABRIC_CATALOG } from '../../api/types';
import s from './WorkshopSettings.module.css';

export function WorkshopSettings() {
  const { workers, addWorker, removeWorker, orders } = useChapanStore();
  const [newWorkerName, setNewWorkerName] = useState('');

  const handleAddWorker = () => {
    const name = newWorkerName.trim();
    if (!name) return;
    addWorker(name);
    setNewWorkerName('');
  };

  // Stats
  const totalOrders     = orders.length;
  const activeOrders    = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;

  // Worker load: count active tasks per worker
  const workerLoad: Record<string, number> = {};
  for (const o of orders) {
    if (o.status === 'cancelled' || o.status === 'completed') continue;
    for (const t of o.productionTasks) {
      if (t.assignedTo && t.status !== 'done') {
        workerLoad[t.assignedTo] = (workerLoad[t.assignedTo] ?? 0) + 1;
      }
    }
  }

  return (
    <div className={s.root}>

      {/* ── Stats summary ── */}
      <div className={s.statsRow}>
        <div className={s.statCard}>
          <div className={s.statVal}>{activeOrders}</div>
          <div className={s.statLbl}>Активных заказов</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statVal}>{workers.length}</div>
          <div className={s.statLbl}>Сотрудников</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statVal}>{completedOrders}</div>
          <div className={s.statLbl}>Выполнено</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statVal}>{totalOrders}</div>
          <div className={s.statLbl}>Всего заказов</div>
        </div>
      </div>

      {/* ── Workers ── */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <Users size={15} className={s.sectionIcon} />
          <span className={s.sectionTitle}>Сотрудники цеха</span>
          <span className={s.sectionCount}>{workers.length}</span>
        </div>

        <div className={s.addRow}>
          <input
            className={s.addInput}
            placeholder="Имя сотрудника (напр. Айгуль М.)"
            value={newWorkerName}
            onChange={e => setNewWorkerName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddWorker()}
          />
          <button className={s.addBtn} onClick={handleAddWorker} disabled={!newWorkerName.trim()}>
            <UserPlus size={14} />
            Добавить
          </button>
        </div>

        <div className={s.workerList}>
          {workers.map(w => (
            <div key={w} className={s.workerRow}>
              <div className={s.workerAvatar}>
                {w.split(' ')[0][0] ?? '?'}
              </div>
              <div className={s.workerBody}>
                <span className={s.workerName}>{w}</span>
                {workerLoad[w] ? (
                  <span className={s.workerLoad}>{workerLoad[w]} задания в работе</span>
                ) : (
                  <span className={s.workerFree}>Свободен</span>
                )}
              </div>
              <button
                className={s.removeBtn}
                onClick={() => removeWorker(w)}
                title="Удалить сотрудника"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Products catalog ── */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <Package size={15} className={s.sectionIcon} />
          <span className={s.sectionTitle}>Каталог изделий</span>
          <span className={s.sectionCount}>{PRODUCT_CATALOG.length}</span>
        </div>
        <div className={s.tagGrid}>
          {PRODUCT_CATALOG.map(p => (
            <span key={p} className={s.tag}>{p}</span>
          ))}
        </div>
        <div className={s.catalogNote}>
          Каталог изделий редактируется в конфигурации воркзоны
        </div>
      </section>

      {/* ── Fabrics catalog ── */}
      <section className={s.section}>
        <div className={s.sectionHead}>
          <Layers size={15} className={s.sectionIcon} />
          <span className={s.sectionTitle}>Ткани</span>
          <span className={s.sectionCount}>{FABRIC_CATALOG.length}</span>
        </div>
        <div className={s.tagGrid}>
          {FABRIC_CATALOG.map(f => (
            <span key={f} className={s.tag}>{f}</span>
          ))}
        </div>
        <div className={s.catalogNote}>
          Каталог тканей редактируется в конфигурации воркзоны
        </div>
      </section>

    </div>
  );
}
