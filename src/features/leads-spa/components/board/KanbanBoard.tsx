/**
 * Generic Kanban board. Each column is a stage bucket.
 * Uses pointer-capture drag (no external DnD lib).
 */
import { useRef, useState } from 'react';
import { useLeadsStore } from '../../model/leads.store';
import type { Lead, LeadStage } from '../../api/types';
import { LeadCard } from './LeadCard';
import s from './Board.module.css';

export interface KanbanColumn {
  stage: LeadStage;
  pipeline: 'qualifier' | 'closer';
  label: string;
  accent?: string;
}

interface Props {
  columns: KanbanColumn[];
  leads: Lead[];
}

export function KanbanBoard({ columns, leads }: Props) {
  const moveStage = useLeadsStore(st => st.moveStage);
  const openHandoff = useLeadsStore(st => st.openHandoff);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<LeadStage | null>(null);

  const handleDrop = (stage: LeadStage, pipeline: 'qualifier' | 'closer', leadId: string) => {
    if (stage === 'meeting_set' && pipeline === 'qualifier') {
      // Trigger handoff modal instead of moving directly
      openHandoff(leadId);
    } else {
      moveStage(leadId, stage, pipeline);
    }
    setDragId(null);
    setOverCol(null);
  };

  return (
    <div className={s.board}>
      {columns.map(col => {
        const colLeads = leads.filter(l => l.stage === col.stage);
        const isOver = overCol === col.stage;
        return (
          <div
            key={col.stage}
            className={`${s.column} ${isOver ? s.columnOver : ''}`}
            style={{ '--col-accent': col.accent ?? '#6b7280' } as React.CSSProperties}
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
              {colLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onDragStart={() => setDragId(lead.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null); }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
