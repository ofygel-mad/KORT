import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { TrendingUp, Users, Briefcase, CheckSquare, Download, Trophy, Target } from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { Button } from '../../shared/ui/Button';
import { formatMoney } from '../../shared/utils/format';
import { useIsMobile } from '../../shared/hooks/useIsMobile';
import { format, subDays, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import { listContainer, listItem } from '../../shared/motion/presets';
import s from './Reports.module.css';

/* ── Types ──────────────────────────────────────────────────── */
type Period = '7d' | '30d' | 'month' | 'quarter' | 'year' | 'custom';

interface ReportData {
  customers_count: number; customers_delta: number;
  active_deals_count: number; revenue_month: number;
  tasks_today: number; overdue_tasks: number;
  deals_by_stage: Array<{ stage: string; count: number; amount: number }>;
  customers_by_source: Array<{ source: string; count: number }>;
  revenue_by_month: Array<{ month: string; revenue: number; deals: number }>;
  manager_leaderboard: Array<{ name: string; deals: number; revenue: number }>;
  funnel: { customers: number; with_deals: number; deals: number; won: number; conversion_rate: number };
}

/* ── Constants ──────────────────────────────────────────────── */
const PERIODS: { key: Period; label: string }[] = [
  { key: '7d',      label: '7 дней' },
  { key: '30d',     label: '30 дней' },
  { key: 'month',   label: 'Месяц' },
  { key: 'quarter', label: 'Квартал' },
  { key: 'year',    label: 'Год' },
  { key: 'custom',  label: 'Свой' },
];

const COLORS = ['var(--chart-series-1)','var(--chart-series-2)','var(--chart-series-3)','var(--chart-series-4)','var(--chart-series-5)','var(--chart-series-6)','var(--fill-warning)','var(--text-tertiary)'];

function periodToDates(p: Period, custom?: { from: string; to: string }) {
  if (p === 'custom' && custom?.from && custom?.to) return { date_from: custom.from, date_to: custom.to };
  const now = new Date(), to = format(now, 'yyyy-MM-dd');
  const from = format(
    p === '7d' ? subDays(now, 7) : p === '30d' ? subDays(now, 30) :
    p === 'month' ? startOfMonth(now) : p === 'quarter' ? startOfQuarter(now) : startOfYear(now),
    'yyyy-MM-dd'
  );
  return { date_from: from, date_to: to };
}

/* ── Custom recharts tooltip ─────────────────────────────────── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className={s.tooltip}>
      <div className={s.tooltipLabel}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className={s.tooltipRow}>
          <div className={s.tooltipDot} style={{ '--tooltip-dot-color': p.color } as CSSProperties} />
          {typeof p.value === 'number' && p.value > 10000 ? formatMoney(p.value, 'KZT') : p.value}
        </div>
      ))}
    </div>
  );
}

/* ── KPI card ────────────────────────────────────────────────── */
function KpiCard({ label, value, delta, icon, isLoading }: { label: string; value: string; delta?: number; icon: React.ReactNode; isLoading: boolean }) {
  return (
    <motion.div className={s.kpiCard} variants={listItem}>
      <div className={s.kpiLabel}>{icon}{label}</div>
      {isLoading
        ? <Skeleton height={28} width="60%" />
        : <div className={s.kpiValue}>{value}</div>
      }
      {delta !== undefined && !isLoading && (
        <div className={`${s.kpiDelta} ${delta > 0 ? s.positive : delta < 0 ? s.negative : s.neutral}`}>
          {delta > 0 ? '↑' : delta < 0 ? '↓' : '—'} {Math.abs(delta)}%
        </div>
      )}
    </motion.div>
  );
}

/* ── Main ────────────────────────────────────────────────────── */
export default function ReportsPage() {
  useDocumentTitle('Отчёты');
  const isMobile = useIsMobile();
  const [period, setPeriod] = useState<Period>('month');
  const [custom, setCustom] = useState({ from: '', to: '' });

  const dates = periodToDates(period, custom);

  const { data, isLoading } = useQuery<ReportData>({
    queryKey: ['report', period, custom],
    queryFn: () => api.get('/reports/summary/', dates),
  });

  const leaderboard = data?.manager_leaderboard ?? [];
  const funnelData = data?.funnel;
  const funnelMax = funnelData?.customers ?? 1;

  return (
    <div className={s.page}>
      <PageHeader
        title="Отчёты"
        subtitle="Аналитика продаж и эффективности команды"
        actions={<Button variant="secondary" size="sm" icon={<Download size={14} />}>Экспорт</Button>}
      />

      {/* Period selector */}
      <div className={s.periodBar}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`${s.periodTab} ${period === p.key ? s.active : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className={s.customDates}>
          <input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} className={`kort-input ${s.dateInput}`} />
          <span className={s.dateDivider}>—</span>
          <input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} className={`kort-input ${s.dateInput}`} />
        </div>
      )}

      {/* KPI grid */}
      <motion.div className={s.kpiGrid} variants={listContainer} initial="hidden" animate="visible">
        <KpiCard
          label="Клиентов" icon={<Users size={13} />}
          value={isLoading ? '—' : String(data?.customers_count ?? 0)}
          delta={data?.customers_delta}
          isLoading={isLoading}
        />
        <KpiCard
          label="Активных сделок" icon={<Briefcase size={13} />}
          value={isLoading ? '—' : String(data?.active_deals_count ?? 0)}
          isLoading={isLoading}
        />
        <KpiCard
          label="Выручка за месяц" icon={<TrendingUp size={13} />}
          value={isLoading ? '—' : formatMoney(data?.revenue_month ?? 0, 'KZT')}
          isLoading={isLoading}
        />
        <KpiCard
          label="Просрочено задач" icon={<CheckSquare size={13} />}
          value={isLoading ? '—' : String(data?.overdue_tasks ?? 0)}
          isLoading={isLoading}
        />
      </motion.div>

      {/* Revenue chart + Pie */}
      <div className={s.chartGrid}>
        <div className={s.chartCard}>
          <div className={s.chartTitle}>Выручка по месяцам</div>
          {isLoading
            ? <Skeleton height={220} />
            : <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.revenue_by_month ?? []} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--chart-axis)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" fill="var(--chart-series-1)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        <div className={s.chartCard}>
          <div className={s.chartTitle}>Источники клиентов</div>
          {isLoading
            ? <Skeleton height={220} />
            : <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data?.customers_by_source ?? []} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {(data?.customers_by_source ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
          }
        </div>
      </div>

      {/* Leaderboard + Funnel */}
      <div className={s.chartGrid2}>
        <div className={s.chartCard}>
          <div className={s.chartTitle}>
            <span>Топ менеджеров</span>
            <Trophy size={15} className={s.titleIcon} />
          </div>
          {isLoading
            ? [1,2,3].map(i => <Skeleton key={i} height={40} className={s.leaderSkeleton} />)
            : leaderboard.length === 0
              ? <p className={s.emptyText}>Нет данных за период</p>
              : leaderboard.map((m, i) => (
                  <div key={m.name} className={s.leaderRow}>
                    <div className={`${s.leaderRank} ${i === 0 ? s.first : i === 1 ? s.second : i === 2 ? s.third : s.other}`}>
                      {i + 1}
                    </div>
                    <div className={s.leaderName}>{m.name}</div>
                    <div className={s.leaderStats}>
                      <div className={s.leaderRevenue}>{formatMoney(m.revenue, 'KZT')}</div>
                      <div className={s.leaderDeals}>{m.deals} сделок</div>
                    </div>
                  </div>
                ))
          }
        </div>

        <div className={s.chartCard}>
          <div className={s.chartTitle}>
            <span>Воронка конверсии</span>
            <Target size={15} className={s.titleIcon} />
          </div>
          {isLoading
            ? <Skeleton height={160} />
            : funnelData
              ? (
                  <div className={s.funnelList}>
                    {[
                      { label: 'Клиентов',   count: funnelData.customers },
                      { label: 'Со сделками', count: funnelData.with_deals },
                      { label: 'Сделок',     count: funnelData.deals },
                      { label: 'Выиграно',   count: funnelData.won },
                    ].map(row => (
                      <div key={row.label} className={s.funnelRow}>
                        <span className={s.funnelLabel}>{row.label}</span>
                        <div className={s.funnelBarTrack}>
                          <div className={s.funnelBarFill} style={{ '--funnel-width': `${(row.count / funnelMax) * 100}%` } as CSSProperties} />
                        </div>
                        <span className={s.funnelCount}>{row.count}</span>
                      </div>
                    ))}
                    <div className={s.conversionNote}>
                      Конверсия: <strong>{(funnelData.conversion_rate * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                )
              : <p className={s.emptyText}>Нет данных</p>
          }
        </div>
      </div>
    </div>
  );
}
