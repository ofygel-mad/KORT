/**
 * Generic Kanban board. Each column is a stage bucket.
 * Uses pointer-capture drag (no external DnD lib).
 */
import { useMemo, useState } from 'react';
import { useLeadsStore } from '../../model/leads.store';
import type { Lead, LeadStage } from '../../api/types';
import type { LeadTone } from '../../model/stage-meta';
import { LeadCard } from './LeadCard';
import s from './Board.module.css';

export interface KanbanColumn {
  stage: LeadStage;
  pipeline: 'qualifier' | 'closer';
  label: string;
  tone?: LeadTone;
}

interface Props {
  columns: KanbanColumn[];
  leads: Lead[];
  onOpenDrawer: (id: string) => void;
  onOpenHandoff: (id: string) => void;
}

export function KanbanBoard({ columns, leads, onOpenDrawer, onOpenHandoff }: Props) {
  const moveStage = useLeadsStore(st => st.moveStage);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LeadStage | null>(null);

  const handleDrop = (stage: LeadStage, pipeline: 'qualifier' | 'closer', leadId: string) => {
    if (stage === 'meeting_set' && pipeline === 'qualifier') {
      // Trigger handoff modal instead of moving directly
      onOpenHandoff(leadId);
    } else {
      moveStage(leadId, stage, pipeline);
    }
    setDragId(null);
    setOverCol(null);
  };

  // Pre-group leads by stage — avoids N×M filter calls on every render
  const leadsByStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    for (const col of columns) {
      map[col.stage] = [];
    }
    for (const lead of leads) {
      const bucket = map[lead.stage];
      if (bucket) bucket.push(lead);
    }
    return map;
  }, [leads, columns]);

  return (
    <div className={s.board}>
      {columns.map(col => {
        const colLeads = leadsByStage[col.stage] ?? [];
        const isOver = overCol === col.stage;
        return (
          <div
            key={col.stage}
            className={`${s.column} ${isOver ? s.columnOver : ''}`}
            data-tone={col.tone ?? 'muted'}
            onDragOver={e => { e.preventDefault(); setOverCol(col.stage); }}
            onDragLeave={() => setOverCol(null)}
            onDrop={e => {
              e.preventDefault();
              if (dragId) handleDrop(col.stage, col.pipeline, dragId);
            }}
          >
            <div className={s.colHeader}>
              <span className={s.colDot} />
              <span className={s.colLabel}>{col.label}</span>
              <span className={s.colCount}>{colLeads.length}</span>
            </div>
            <div className={s.colCards}>
              {colLeads.length === 0 ? (
                <div className={s.colEmpty}>
                  <span className={s.colEmptyTitle}>Пусто</span>
                  <span className={s.colEmptyHint}>Перетащите лид в эту колонку</span>
                </div>
              ) : (
                colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null); }}
                    onOpenDrawer={onOpenDrawer}
                    onOpenHandoff={onOpenHandoff}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
