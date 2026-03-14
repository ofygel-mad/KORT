/**
 * LeadsTilePreview
 * Живой экран-превью: отражает текущее состояние SPA внутри плитки.
 *
 * Два режима:
 *   DRAWER — drawer открыт → показываем мини-карточку лида (имя, статус, телефон, последнее событие)
 *   BOARD  — drawer закрыт → показываем мини-канбан + активный таб
 */
import { useEffect } from 'react';
import { useLeadsStore } from '../../../leads-spa/model/leads.store';
import { useTileLeadsUI } from '../../../leads-spa/model/tile-ui.store';
import s from './LeadsTilePreview.module.css';

const QUALIFIER_COLS = [
  { stage: 'new', label: 'Новые', accent: '#3b82f6' },
  { stage: 'in_progress', label: 'В работе', accent: '#8b5cf6' },
  { stage: 'no_answer', label: 'Недозвон', accent: '#f59e0b' },
  { stage: 'thinking', label: 'Думают', accent: '#ec4899' },
  { stage: 'meeting_set', label: 'Встреча', accent: '#22c55e' },
];

const STAGE_LABEL: Record<string, string> = {
  new: 'Новый', in_progress: 'В работе', no_answer: 'Недозвон',
  thinking: 'Думают', meeting_set: 'Встреча', junk: 'Мусор',
  awaiting_meeting: 'Встреча ждёт', meeting_done: 'Встреча', proposal: 'КП',
  contract: 'Договор', awaiting_payment: 'Оплата', won: 'Закрыт', lost: 'Отказ',
};

const STAGE_COLOR: Record<string, string> = {
  new: '#3b82f6', in_progress: '#8b5cf6', no_answer: '#f59e0b',
  thinking: '#ec4899', meeting_set: '#22c55e', junk: '#6b7280',
  awaiting_meeting: '#22c55e', meeting_done: '#10b981', proposal: '#f59e0b',
  contract: '#f97316', awaiting_payment: '#eab308', won: '#22c55e', lost: '#ef4444',
};

const TAB_LABELS: Record<string, string> = {
  qualifier: 'Квалиф.',
  closer: 'Клоузер',
  all: 'Все',
};

const SOURCE_ICON: Record<string, string> = {
  instagram: 'IG', site: 'WEB', referral: 'REF', ad: 'ADS',
};

export function LeadsTilePreview({ tileId }: { tileId: string }) {
  const { leads, loading, load } = useLeadsStore();
  // ↓ читаем ВСЕ нужные поля из tile-ui.store, не только activeLeadId
  const { activeLeadId, drawerOpen, currentTab } = useTileLeadsUI(tileId);
  const activeLead = leads.find(l => l.id === activeLeadId);

  useEffect(() => {
    if (leads.length === 0 && !loading) load();
  }, []);

  const qualifierLeads = leads.filter(l => l.pipeline === 'qualifier');
  const closerLeads = leads.filter(l => l.pipeline === 'closer');
  const overdueCount = leads.filter(
    l => (Date.now() - new Date(l.updatedAt).getTime()) / 3_600_000 > 24
  ).length;

  if (loading && leads.length === 0) {
    return (
      <div className={s.root}>
        <div className={s.shimmer}>
          {[1, 2, 3].map(i => (
            <div key={i} className={s.shimmerCol}>
              <div className={s.shimmerHdr} />
              <div className={s.shimmerCard} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  РЕЖИМ 1: DRAWER ОТКРЫТ — показываем мини-карточку лида
  // ══════════════════════════════════════════════════════════
  if (drawerOpen && activeLead) {
    const lastEvent = activeLead.history[activeLead.history.length - 1];
    const stageColor = STAGE_COLOR[activeLead.stage] ?? '#6b7280';
    const stageLabel = STAGE_LABEL[activeLead.stage] ?? activeLead.stage;

    return (
      <div className={s.root}>
        {/* Индикатор "экрана" — читатель сразу понимает что открыто */}
        <div className={s.screenBadge}>
          <span className={s.screenDot} />
          <span className={s.screenLabel}>Карточка лида</span>
        </div>

        <div className={s.drawerPreview}>
          {/* Шапка карточки */}
          <div className={s.drawerHeader}>
            <div className={s.drawerAvatar}>{activeLead.fullName[0]}</div>
            <div className={s.drawerMeta}>
              <div className={s.drawerName}>{activeLead.fullName}</div>
              <span
                className={s.drawerStage}
                style={{ color: stageColor, borderColor: `${stageColor}55` }}
              >
                {stageLabel}
              </span>
            </div>
          </div>

          {/* Контакт */}
          <div className={s.drawerRow}>
            <span className={s.drawerRowLabel}>Тел.</span>
            <span className={s.drawerRowValue}>{activeLead.phone}</span>
          </div>
          <div className={s.drawerRow}>
            <span className={s.drawerRowLabel}>Источник</span>
            <span className={s.drawerRowValue}>
              {SOURCE_ICON[activeLead.source] ?? activeLead.source}
            </span>
          </div>
          {activeLead.budget && (
            <div className={s.drawerRow}>
              <span className={s.drawerRowLabel}>Бюджет</span>
              <span className={s.drawerRowValue} style={{ color: 'rgba(134,239,172,0.8)' }}>
                {(activeLead.budget / 1_000).toFixed(0)} 000 ₸
              </span>
            </div>
          )}

          {/* Последнее событие из ленты */}
          {lastEvent && (
            <div className={s.drawerEvent}>
              <span className={s.drawerEventDot} />
              <span className={s.drawerEventText}>{lastEvent.action}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════
  //  РЕЖИМ 2: BOARD — мини-канбан + активный таб
  // ══════════════════════════════════════════════════════════
  return (
    <div className={s.root}>
      {/* Таб-индикатор: какой pipeline сейчас открыт в SPA */}
      <div className={s.tabBar}>
        {(['qualifier', 'closer', 'all'] as const).map(tab => (
          <span
            key={tab}
            className={`${s.tabPill} ${currentTab === tab ? s.tabPillActive : ''}`}
          >
            {TAB_LABELS[tab]}
          </span>
        ))}
      </div>

      {/* ── Мини-статистика ── */}
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
        {overdueCount > 0 && (
          <div className={s.statChip}>
            <span className={s.statDot} style={{ background: '#ef4444' }} />
            <span className={s.statNum}>{overdueCount}</span>
            <span className={s.statLabel}>просроч.</span>
          </div>
        )}
      </div>

      {/* ── Мини-канбан ── */}
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
                {colLeads.length === 0 ? (
                  <div className={s.colEmpty} />
                ) : (
                  colLeads.slice(0, 2).map(lead => (
                    <div
                      key={lead.id}
                      // ↓ подсвечиваем последнего просмотренного лида
                      className={`${s.card} ${lead.id === activeLeadId ? s.cardActive : ''}`}
                    >
                      <div className={s.cardAvatar}>{lead.fullName[0]}</div>
                      <div className={s.cardInfo}>
                        <div className={s.cardName}>{lead.fullName.split(' ')[0]}</div>
                        <span className={s.cardSrc}>{SOURCE_ICON[lead.source] ?? lead.source}</span>
                      </div>
                      {lead.budget && (
                        <span className={s.cardBudget}>
                          {(lead.budget / 1_000).toFixed(0)}к
                        </span>
                      )}
                    </div>
                  ))
                )}
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
