import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, LayoutGrid, List, Briefcase,
  Clock, TrendingUp, CheckSquare,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { useAuthStore } from '../../shared/stores/auth';
import { useUIStore } from '../../shared/stores/ui';
import { formatMoney, formatNumber } from '../../shared/utils/format';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { format, differenceInDays } from 'date-fns';
import { setProductMoment } from '../../shared/utils/productMoment';
import { ru } from 'date-fns/locale';
import styles from './Deals.module.css';

interface Stage {
  id: string; name: string; order: number; type: string; color: string;
}

interface Deal {
  id: string; title: string;
  amount: number | null; currency: string;
  status: string;
  stage: Stage;
  customer: { id: string; full_name: string; company_name: string } | null;
  owner: { id: string; full_name: string } | null;
  pipeline: { id: string; name: string; stages: Stage[] };
  created_at: string;
  updated_at: string;
}

interface PipelineData {
  pipeline: { id: string; name: string; stages: Stage[] };
  deals: Deal[];
  total_open: number;
  total_amount: number;
}

type ViewMode = 'board' | 'list';

function daysSince(date: string): number {
  return differenceInDays(new Date(), new Date(date));
}

export default function DealsPage() {
  const navigate = useNavigate();
  const orgCurrency = useAuthStore(s => s.org?.currency ?? 'KZT');
  const openCreateDeal = useUIStore(s => s.openCreateDeal);
  const openAssistantPrompt = useUIStore(s => s.openAssistantPrompt);
  const { can } = useCapabilities();
  const [view, setView] = useState<ViewMode>('board');

  const { data, isLoading } = useQuery<PipelineData>({
    queryKey: ['deals-board'],
    queryFn: () => api.get('/deals/board/'),
  });

  const deals    = data?.deals ?? [];
  const stages   = data?.pipeline?.stages ?? [];
  const totalAmt = deals
    .filter(d => d.status === 'open')
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  const dealsByStage = (stage: Stage) =>
    deals.filter(d => d.stage.id === stage.id && d.status === 'open');

  return (
    <div className={styles.page}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Сделки</h1>
          <p className={styles.subtitle}>Управляйте воронкой продаж</p>
        </div>
        <div className={styles.headerActions}>
          {can('deals:write') && (
            <Button
              size="sm"
              icon={<Plus size={13} />}
              onClick={() => openCreateDeal()}
            >
              Добавить
            </Button>
          )}
        </div>
      </div>

      <div className={styles.scenarioRail}>
        <div className={styles.scenarioCopy}>
          <span className={styles.scenarioEyebrow}>Воронка продаж</span>
          <div className={styles.scenarioText}>Доска и список нужны только для одного: быстро понять, где зависла выручка, и двинуть сделку дальше.</div>
        </div>
        <div className={styles.scenarioChips}>
          <span className={styles.scenarioChip}>Доска</span>
          <span className={styles.scenarioChip}>Список</span>
          <span className={styles.scenarioChip}>Следующий шаг</span>
        </div>
      </div>

      {/* ── Pipeline stats ──────────────────────────────────── */}
      {!isLoading && (
        <div className={styles.pipelineStats}>
          <div className={styles.pipelineStat}>
            <span className={styles.pipelineStatLabel}>Открытых</span>
            <span className={styles.pipelineStatValue}>{deals.filter(d => d.status === 'open').length}</span>
          </div>
          <div className={styles.pipelineStat}>
            <span className={styles.pipelineStatLabel}>Объём</span>
            <span className={styles.pipelineStatValue}>{formatMoney(totalAmt, orgCurrency)}</span>
          </div>
          <div className={styles.pipelineStat}>
            <span className={styles.pipelineStatLabel}>Выиграно</span>
            <span className={styles.pipelineStatValue}>{deals.filter(d => d.status === 'won').length}</span>
          </div>
          <div className={styles.pipelineStat}>
            <span className={styles.pipelineStatLabel}>Этапов</span>
            <span className={styles.pipelineStatValue}>{stages.length}</span>
          </div>
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn}${view === 'board' ? ' ' + styles.viewBtnActive : ''}`}
            onClick={() => setView('board')}
          >
            <LayoutGrid size={13} />
            Доска
          </button>
          <button
            className={`${styles.viewBtn}${view === 'list' ? ' ' + styles.viewBtnActive : ''}`}
            onClick={() => setView('list')}
          >
            <List size={13} />
            Список
          </button>
        </div>
      </div>

      {/* ── Board view ──────────────────────────────────────── */}
      {view === 'board' && (
        <div className={styles.kanbanOuter}>
          {isLoading ? (
            <div className={styles.kanbanBoard}>
              {[1,2,3,4].map(i => (
                <div key={i} className={styles.kanbanCol}>
                  <div className={styles.kanbanColHeader}>
                    <Skeleton height={16} width={90} />
                    <Skeleton height={14} width={30} />
                  </div>
                  {[1,2,3].map(j => (
                    <div key={j} className={styles.kanbanSkeletonCard}>
                      <Skeleton height={80} className={styles.kanbanSkeletonBlock} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : stages.length === 0 ? (
            <div className={styles.listEmpty}>
              <EmptyState
                icon={<Briefcase size={24} />}
                title="Воронки ещё нет"
                description="Настройте этапы воронки в разделе Настройки"
              />
              <div className={styles.emptyRecoveryRail}>
                <button className={styles.emptyRecoveryBtn} onClick={() => navigate('/settings')}>Открыть настройки</button>
                {can('deals:write') && <button className={styles.emptyRecoveryBtn} onClick={() => openCreateDeal()}>Создать тестовую сделку</button>}
              </div>
            </div>
          ) : (
            <div className={styles.kanbanBoard}>
              {stages.map((stage, stageIdx) => {
                const stageDeals = dealsByStage(stage);
                const stageAmount = stageDeals.reduce((s, d) => s + (d.amount ?? 0), 0);
                const color = stage.color || '#6B7280';

                return (
                  <motion.div
                    key={stage.id}
                    className={styles.kanbanCol}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stageIdx * 0.06, duration: 0.25 }}
                  >
                    <div className={styles.kanbanColHeader}>
                      <div className={styles.kanbanColLabel}>
                        <div
                          className={styles.kanbanColIndicator}
                          style={{ background: color }}
                        />
                        <span className={styles.kanbanColName}>{stage.name}</span>
                      </div>
                      <div className={styles.kanbanColMeta}>
                        <span className={styles.kanbanColCount}>{stageDeals.length}</span>
                        {stageAmount > 0 && (
                          <span className={styles.kanbanColAmount}>
                            {formatMoney(stageAmount, orgCurrency)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className={styles.kanbanCards}>
                      {stageDeals.length === 0 ? (
                        <div className={styles.colEmpty}>Нет сделок</div>
                      ) : (
                        stageDeals.map((deal, di) => {
                          const age = daysSince(deal.updated_at);
                          const isStale   = age >= 7  && age < 14;
                          const isOverdue = age >= 14;
                          return (
                            <motion.div
                              key={deal.id}
                              className={[
                                styles.dealCard,
                                isOverdue ? styles.dealCardOverdue :
                                isStale   ? styles.dealCardStale   : '',
                              ].filter(Boolean).join(' ')}
                              onClick={() => { setProductMoment(`Вы открыли сделку «${deal.title}». Следующий шаг должен быть ближе, чем просто чтение карточки.`); navigate(`/deals/${deal.id}`); }}
                              initial={{ opacity: 0, scale: 0.97 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: di * 0.04, duration: 0.2 }}
                              whileHover={{ y: -2 }}
                            >
                              <div className={styles.dealCardTitle}>{deal.title}</div>
                              <div className={styles.dealCardMeta}>
                                <span className={styles.dealCardCustomer}>
                                  {deal.customer?.full_name ?? '—'}
                                </span>
                                {deal.amount && (
                                  <span className={styles.dealCardAmount}>
                                    {formatMoney(deal.amount, deal.currency)}
                                  </span>
                                )}
                              </div>
                              <div className={styles.dealCardFooter}>
                                <span className={styles.dealCardOwner}>
                                  {deal.owner?.full_name ?? '—'}
                                </span>
                                <span className={styles.dealCardAge}>
                                  {age}д назад
                                </span>
                              </div>
                            </motion.div>
                          );
                        })
                      )}

                      <button
                        className={styles.addDealBtn}
                        onClick={() => openCreateDeal()}
                      >
                        <Plus size={12} />
                        Добавить
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── List view ───────────────────────────────────────── */}
      {view === 'list' && (
        <div className={styles.listTable}>
          {isLoading ? (
            <div className={styles.listSkeleton}>
              {[1,2,3,4,5].map(i => (
                <div key={i} className={styles.listSkeletonRow}>
                  <Skeleton height={13} width="30%" />
                  <Skeleton height={13} width="20%" />
                  <Skeleton height={20} width={80} />
                  <Skeleton height={13} width="15%" />
                </div>
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className={styles.listEmpty}>
              <EmptyState
                icon={<Briefcase size={24} />}
                title="Сделок пока нет"
                description="Создайте первую сделку"
                action={{
                  label: 'Создать сделку',
                  onClick: () => openCreateDeal(),
                }}
              />
              <div className={styles.emptyRecoveryRail}>
                {can('customers.import') && <button className={styles.emptyRecoveryBtn} onClick={() => navigate('/imports')}>Импортировать базу</button>}
                <button className={styles.emptyRecoveryBtn} onClick={() => openAssistantPrompt('С чего начать в воронке сделок прямо сейчас?')}>Спросить Copilot</button>
              </div>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={`${styles.th} ${styles.thDeal}`}>Сделка</th>
                  <th className={`${styles.th} ${styles.thCustomer}`}>Клиент</th>
                  <th className={`${styles.th} ${styles.thStage}`}>Этап</th>
                  <th className={`${styles.th} ${styles.thAmount}`}>Сумма</th>
                  <th className={`${styles.th} ${styles.thOwner}`}>Владелец</th>
                  <th className={`${styles.th} ${styles.thCreated}`}>Создана</th>
                </tr>
              </thead>
              <tbody>
                {deals.filter(d => d.status === 'open').map((deal, idx) => (
                  <motion.tr
                    key={deal.id}
                    className={styles.tr}
                    onClick={() => { setProductMoment(`Вы открыли сделку «${deal.title}». Следующий шаг должен быть ближе, чем просто чтение карточки.`); navigate(`/deals/${deal.id}`); }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.025, duration: 0.2 }}
                  >
                    <td className={styles.td}>
                      <div className={styles.dealTitle}>{deal.title}</div>
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dealCustomer}>
                        {deal.customer?.full_name ?? '—'}
                      </div>
                    </td>
                    <td className={styles.td}>
                      <Badge variant="default" size="sm">{deal.stage.name}</Badge>
                    </td>
                    <td className={styles.td}>
                      {deal.amount
                        ? <span className={styles.dealAmountCell}>{formatMoney(deal.amount, deal.currency)}</span>
                        : <span className={styles.tdMuted}>—</span>
                      }
                    </td>
                    <td className={`${styles.td} ${styles.tdMuted}`}>
                      {deal.owner?.full_name ?? '—'}
                    </td>
                    <td className={`${styles.td} ${styles.tdMuted}`}>
                      {format(new Date(deal.created_at), 'd MMM', { locale: ru })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
