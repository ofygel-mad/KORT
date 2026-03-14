/**
 * ReportsSPA — Executive analytics panel.
 *
 * Читает данные напрямую из Leads + Deals Zustand-сторов
 * (синглтоны — данные уже есть если открывались другие SPA,
 *  либо загружаются при первом открытии этого SPA).
 *
 * Разделы:
 *   1. Pulse  — 4 живых KPI: лиды, сделки, взвешенный пайплайн, конверсия
 *   2. Body   — Воронка лидов | Пайплайн сделок (2 колонки)
 *   3. Feed   — Последние активности по полю updatedAt
 */
import { useEffect } from 'react';
import { useLeadsStore } from '../../../../leads-spa/model/leads.store';
import { useDealsStore } from '../../../../deals-spa/model/deals.store';
import type { WorkspaceSnapshot } from '../../../model/types';
import s from './ReportsSPA.module.css';

// ── Helpers ──────────────────────────────────────────────────
function fmtNum(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(n));
}
function fmtMoney(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' млн ₸';
  if (n >= 1_000)     return Math.round(n / 1_000) + 'к ₸';
  return fmtNum(n) + ' ₸';
}
function timeSince(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1)  return `${Math.max(1, Math.floor(d / 60_000))} мин назад`;
  if (h < 24) return `${h}ч назад`;
  return `${Math.floor(h / 24)}д назад`;
}

// ── Domain maps ───────────────────────────────────────────────
const Q_STAGES  = ['new', 'in_progress', 'no_answer', 'thinking', 'meeting_set'] as const;
const D_STAGES  = ['awaiting_meeting', 'meeting_done', 'proposal', 'contract', 'awaiting_payment'] as const;

const Q_COLOR: Record<string, string> = {
  new: '#3b82f6', in_progress: '#8b5cf6', no_answer: '#f59e0b',
  thinking: '#ec4899', meeting_set: '#22c55e',
};
const Q_LABEL: Record<string, string> = {
  new: 'Новые', in_progress: 'В работе', no_answer: 'Недозвон',
  thinking: 'Думают', meeting_set: 'Встреча',
};

const D_COLOR: Record<string, string> = {
  awaiting_meeting: '#3b82f6', meeting_done: '#8b5cf6', proposal: '#f59e0b',
  contract: '#ec4899', awaiting_payment: '#f97316',
};
const D_LABEL: Record<string, string> = {
  awaiting_meeting: 'Ожидает встречи', meeting_done: 'Встреча',
  proposal: 'КП', contract: 'Договор', awaiting_payment: 'Оплата',
};
const STAGE_COLOR_ALL: Record<string, string> = {
  ...Q_COLOR,
  awaiting_meeting: '#3b82f6', meeting_done: '#8b5cf6', proposal: '#f59e0b',
  contract: '#ec4899', awaiting_payment: '#f97316',
  won: '#22c55e', lost: '#ef4444',
};
const STAGE_LABEL_ALL: Record<string, string> = {
  ...Q_LABEL, ...D_LABEL, junk: 'Брак', won: 'Успешно', lost: 'Слив',
};
const SOURCE_SHORT: Record<string, string> = {
  instagram: 'IG', site: 'WEB', referral: 'REF', ad: 'ADS',
};

// ── snapshot prop оставляем для совместимости с registry, не используем ──
interface Props { snapshot?: WorkspaceSnapshot; }

export function ReportsSPA(_: Props) {
  const { leads, loading: ll, load: loadLeads } = useLeadsStore();
  const { deals, loading: dl, load: loadDeals } = useDealsStore();

  // Загрузить если ещё нет (первое открытие)
  useEffect(() => { if (leads.length === 0 && !ll) loadLeads(); }, []);
  useEffect(() => { if (deals.length === 0 && !dl) loadDeals(); }, []);

  // ── Leads metrics ─────────────────────────────────────────
  const qualLeads  = leads.filter(l => l.pipeline === 'qualifier');
  const closeLeads = leads.filter(l => l.pipeline === 'closer');
  const convRate   = leads.length > 0
    ? Math.round((closeLeads.length / leads.length) * 100) : 0;
  const overdue    = leads.filter(
    l => (Date.now() - new Date(l.updatedAt).getTime()) / 3_600_000 > 24
  ).length;

  // ── Deals metrics ─────────────────────────────────────────
  const activeDeals = deals.filter(d => d.stage !== 'won' && d.stage !== 'lost');
  const wonDeals    = deals.filter(d => d.stage === 'won');
  const weighted    = activeDeals.reduce((a, d) => a + d.value * (d.probability / 100), 0);
  const pipeline    = activeDeals.reduce((a, d) => a + d.value, 0);

  // ── Funnel data ───────────────────────────────────────────
  const qStages = Q_STAGES.map(st => ({
    st, count: qualLeads.filter(l => l.stage === st).length,
  }));
  const qMax = Math.max(...qStages.map(x => x.count), 1);

  const dStages = D_STAGES.map(st => ({
    st,
    count:    activeDeals.filter(d => d.stage === st).length,
    weighted: activeDeals
      .filter(d => d.stage === st)
      .reduce((a, d) => a + d.value * (d.probability / 100), 0),
  }));
  const dMax = Math.max(...dStages.map(x => x.count), 1);

  // ── Recent activity ───────────────────────────────────────
  const recent = [...leads]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 6);

  return (
    <div className={s.root}>

      {/* ── 1. PULSE — 4 live KPIs ─────────────────────── */}
      <div className={s.pulse}>
        <div className={s.kpi}>
          <div className={s.kpiVal} style={{ color: '#8b5cf6' }}>{fmtNum(qualLeads.length)}</div>
          <div className={s.kpiLbl}>Лидов в работе</div>
          {overdue > 0 && (
            <div className={s.kpiAlert}>{overdue} просрочено</div>
          )}
        </div>
        <div className={s.kpiSep} />
        <div className={s.kpi}>
          <div className={s.kpiVal} style={{ color: '#3b82f6' }}>{fmtNum(activeDeals.length)}</div>
          <div className={s.kpiLbl}>Активных сделок</div>
          <div className={s.kpiNote}>{wonDeals.length} закрыто</div>
        </div>
        <div className={s.kpiSep} />
        <div className={s.kpi}>
          <div className={s.kpiVal} style={{ color: '#22c55e' }}>{fmtMoney(weighted)}</div>
          <div className={s.kpiLbl}>Взвешено</div>
          <div className={s.kpiNote}>{fmtMoney(pipeline)} общая</div>
        </div>
        <div className={s.kpiSep} />
        <div className={s.kpi}>
          <div
            className={s.kpiVal}
            style={{ color: convRate >= 30 ? '#22c55e' : '#f59e0b' }}
          >
            {convRate}%
          </div>
          <div className={s.kpiLbl}>Конверсия</div>
          <div className={s.kpiNote}>{closeLeads.length} / {leads.length}</div>
        </div>
      </div>

      {/* ── 2. BODY — воронка лидов + пайплайн сделок ─── */}
      <div className={s.body}>

        {/* Левая: воронка лидов */}
        <div className={s.panel}>
          <div className={s.panelTitle}>Воронка лидов</div>
          <div className={s.bars}>
            {qStages.map(({ st, count }) => (
              <div key={st} className={s.barRow}>
                <div className={s.barLabel}>{Q_LABEL[st]}</div>
                <div className={s.barTrack}>
                  <div
                    className={s.barFill}
                    style={{
                      width: `${(count / qMax) * 100}%`,
                      background: Q_COLOR[st],
                    }}
                  />
                </div>
                <div className={s.barNum}>{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Правая: пайплайн сделок */}
        <div className={s.panel}>
          <div className={s.panelTitle}>Пайплайн сделок</div>
          <div className={s.bars}>
            {dStages.map(({ st, count, weighted: w }) => (
              <div key={st} className={s.barRow}>
                <div className={s.pipeLabel}>
                  <span className={s.pipeDot} style={{ background: D_COLOR[st] }} />
                  {D_LABEL[st]}
                </div>
                <div className={s.barTrack}>
                  <div
                    className={s.barFill}
                    style={{
                      width: `${(count / dMax) * 100}%`,
                      background: D_COLOR[st],
                      opacity: 0.75,
                    }}
                  />
                </div>
                <div className={s.barNum}>{count}</div>
                {w > 0 && <div className={s.barVal}>{fmtMoney(w)}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. FEED — последние активности ───────────── */}
      <div className={s.feed}>
        <div className={s.feedTitle}>Последняя активность</div>
        <div className={s.feedList}>
          {recent.length === 0 ? (
            <div className={s.feedEmpty}>
              Нет данных — откройте SPA «Лиды»
            </div>
          ) : (
            recent.map(lead => (
              <div key={lead.id} className={s.feedItem}>
                <div className={s.feedAv}>{lead.fullName[0]}</div>
                <div className={s.feedBody}>
                  <span className={s.feedName}>{lead.fullName}</span>
                  <span
                    className={s.feedStage}
                    style={{ color: STAGE_COLOR_ALL[lead.stage] ?? '#6b7280' }}
                  >
                    {STAGE_LABEL_ALL[lead.stage] ?? lead.stage}
                  </span>
                </div>
                <div className={s.feedMeta}>
                  <span className={s.feedSrc}>{SOURCE_SHORT[lead.source] ?? lead.source}</span>
                  <span className={s.feedTime}>{timeSince(lead.updatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
