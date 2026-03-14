/**
 * LeadsTilePreview
 * Pulls live data from the leads Zustand store — same data as inside the SPA.
 * Shows a compact mini-kanban: stage columns with dots + first few lead names.
 */
import { useEffect } from 'react';
import { useLeadsStore } from '../../../leads-spa/model/leads.store';
import s from './LeadsTilePreview.module.css';

const QUALIFIER_COLS = [
  { stage: 'new',         label: 'Новые',   accent: '#3b82f6' },
  { stage: 'in_progress', label: 'В работе',accent: '#8b5cf6' },
  { stage: 'no_answer',   label: 'Недозвон',accent: '#f59e0b' },
  { stage: 'thinking',    label: 'Думают',  accent: '#ec4899' },
  { stage: 'meeting_set', label: 'Встреча', accent: '#22c55e' },
];

const SOURCE_ICON: Record<string, string> = {
  instagram: 'IG', site: 'WEB', referral: 'REF', ad: 'ADS',
};

export function LeadsTilePreview() {
  const { leads, loading, load } = useLeadsStore();

  // Trigger load if store is empty (e.g. tile opened before main SPA)
  useEffect(() => {
    if (leads.length === 0 && !loading) load();
  }, []);

  const qualifierLeads = leads.filter(l => l.pipeline === 'qualifier');
  const closerLeads    = leads.filter(l => l.pipeline === 'closer');

  if (loading && leads.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.shimmer}>
          {[1,2,3].map(i => <div key={i} className={s.shimmerCol}><div className={s.shimmerHdr}/><div className={s.shimmerCard}/></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className={s.root}>
      {/* ── Mini stats bar ──────────────────── */}
      <div className={s.statsBar}>
        <div className={s.statChip}>
          <span className={s.statDot} style={{ background: '#8b5cf6' }} />
          <span className={s.statNum}>{qualifierLeads.length}</span>
          <span className={s.statLabel}>лидов</span>
        </div>
        <div className={s.statChip}>
          <span className={s.statDot} style={{ background: '#22c55e' }} />
          <span className={s.statNum}>{closerLeads.length}</span>
          <span className={s.statLabel}>сделок</span>
        </div>
        {leads.filter(l => (Date.now() - new Date(l.updatedAt).getTime()) / 3600000 > 24).length > 0 && (
          <div className={s.statChip}>
            <span className={s.statDot} style={{ background: '#ef4444' }} />
            <span className={s.statNum}>
              {leads.filter(l => (Date.now() - new Date(l.updatedAt).getTime()) / 3600000 > 24).length}
            </span>
            <span className={s.statLabel}>просроч.</span>
          </div>
        )}
      </div>

      {/* ── Mini kanban columns ─────────────── */}
      <div className={s.board}>
        {QUALIFIER_COLS.map(col => {
          const colLeads = qualifierLeads.filter(l => l.stage === col.stage);
          return (
            <div key={col.stage} className={s.col}>
              <div className={s.colHead}>
                <span className={s.colDot} style={{ background: col.accent }} />
                <span className={s.colLabel}>{col.label}</span>
                <span className={s.colCount}>{colLeads.length}</span>
              </div>
              <div className={s.colCards}>
                {colLeads.length === 0
                  ? <div className={s.colEmpty} />
                  : colLeads.slice(0, 2).map(lead => (
                    <div key={lead.id} className={s.card}>
                      <div className={s.cardAvatar}>{lead.fullName[0]}</div>
                      <div className={s.cardInfo}>
                        <div className={s.cardName}>{lead.fullName.split(' ')[0]}</div>
                        <span className={s.cardSrc}>{SOURCE_ICON[lead.source] ?? lead.source}</span>
                      </div>
                      {lead.budget && (
                        <span className={s.cardBudget}>
                          {(lead.budget / 1000).toFixed(0)}к
                        </span>
                      )}
                    </div>
                  ))
                }
                {colLeads.length > 2 && (
                  <div className={s.moreChip}>+{colLeads.length - 2} ещё</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
