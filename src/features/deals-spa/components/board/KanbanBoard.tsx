import { useState, useMemo } from 'react';
import { useDealsStore } from '../../model/deals.store';
import type { Deal, DealStage } from '../../api/types';
import { STAGE_LABEL, STAGE_ACCENT, ACTIVE_STAGES } from '../../api/types';
import { DealCard } from './DealCard';
import s from './Board.module.css';

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'М ₸';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'к ₸';
  return n + ' ₸';
}

interface Props { deals: Deal[]; onOpenDrawer: (id: string) => void; onOpenLostModal: (id: string) => void; onOpenWonModal: (id: string) => void }

export function DealKanbanBoard({ deals, onOpenDrawer, onOpenLostModal, onOpenWonModal }: Props) {
  const moveStage = useDealsStore(st => st.moveStage);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<DealStage | null>(null);

  // Show active stages. Won/Lost are handled separately.
  const columns = ACTIVE_STAGES;

  const handleDrop = (stage: DealStage, dealId: string) => {
    if (stage !== get(dealId)?.stage) moveStage(dealId, stage);
    setDragId(null); setOverCol(null);
  };

  const get = (id: string) => deals.find(d => d.id === id);

  // Pre-group deals by stage — avoids N×M filter calls on every render
  const dealsByStage = useMemo(() => {
    const map: Record<string, { deals: Deal[]; value: number }> = {};
    for (const stage of columns) {
      map[stage] = { deals: [], value: 0 };
    }
    for (const deal of deals) {
      const bucket = map[deal.stage];
      if (bucket) {
        bucket.deals.push(deal);
        bucket.value += deal.value * (deal.probability / 100);
      }
    }
    return map;
  }, [deals, columns]);

  return (
    <div className={s.board}>
      {columns.map(stage => {
        const { deals: colDeals, value: colValue } = dealsByStage[stage];
        const isOver   = overCol === stage;

        return (
          <div
            key={stage}
            className={`${s.column} ${isOver ? s.columnOver : ''}`}
            style={{ '--col-accent': STAGE_ACCENT[stage] } as React.CSSProperties}
            onDragOver={e => { e.preventDefault(); setOverCol(stage); }}
            onDragLeave={() => setOverCol(null)}
            onDrop={e => { e.preventDefault(); if (dragId) handleDrop(stage, dragId); }}
          >
            <div className={s.colHeader}>
              <span className={s.colDot} />
              <span className={s.colLabel}>{STAGE_LABEL[stage]}</span>
              <span className={s.colCount}>{colDeals.length}</span>
            </div>
            {colValue > 0 && (
              <div style={{ padding: '0 4px 6px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span className={s.colValue}>~{fmt(colValue)} взвеш.</span>
              </div>
            )}
            <div className={s.colCards}>
              {colDeals.length === 0
                ? <div className={s.colEmpty}>Перетащите сюда</div>
                : colDeals.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onOpenDrawer={onOpenDrawer}
                    onOpenLostModal={onOpenLostModal}
                    onOpenWonModal={onOpenWonModal}
                  />
                ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
}
