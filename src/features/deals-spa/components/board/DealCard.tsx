import { Phone, MessageCircle, Trophy, XCircle, Clock, CheckSquare } from 'lucide-react';
import type { Deal } from '../../api/types';
import { STAGE_ACCENT } from '../../api/types';
import s from './Board.module.css';

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'IG', site: 'WEB', referral: 'REF', ad: 'ADS',
};

function daysInStage(deal: Deal): number {
  return Math.floor((Date.now() - new Date(deal.stageEnteredAt).getTime()) / 86400000);
}

function isStale(deal: Deal): boolean {
  return (Date.now() - new Date(deal.updatedAt).getTime()) / 86400000 > 5;
}

function nextTask(deal: Deal) {
  return deal.tasks
    .filter(t => !t.done)
    .sort((a, b) => {
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })[0] ?? null;
}

function isOverdue(dueAt?: string): boolean {
  if (!dueAt) return false;
  return new Date(dueAt).getTime() < Date.now();
}

export function DealCard({ deal, onDragStart, onDragEnd, onOpenDrawer, onOpenLostModal, onOpenWonModal }: {
  deal: Deal;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDrawer: (id: string) => void;
  onOpenLostModal: (id: string) => void;
  onOpenWonModal: (id: string) => void;
}) {
  const stale  = isStale(deal);
  const days   = daysInStage(deal);
  const task   = nextTask(deal);
  const overdueDeal = task && isOverdue(task.dueAt);
  const doneTasks  = deal.tasks.filter(t => t.done).length;
  const totalTasks = deal.tasks.length;

  const fmt = (n: number) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + ' ₸';

  return (
    <div
      className={`${s.card} ${stale ? s.cardStale : ''} ${overdueDeal ? s.cardOverdue : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDrawer(deal.id)}
    >
      {/* Header */}
      <div className={s.cardTop}>
        <div className={s.cardAvatar}>{deal.fullName[0]}</div>
        <div className={s.cardInfo}>
          <div className={s.cardName}>{deal.fullName}</div>
          <div className={s.cardPhone}>{deal.phone}</div>
        </div>
        {stale && <div className={s.staleDot} title="Без движения 5+ дней" />}
      </div>

      {/* Value + probability */}
      <div className={s.cardValue}>
        <span className={s.valueAmt}>{fmt(deal.value)}</span>
        <span className={s.valuePct}>{deal.probability}%</span>
      </div>
      <div className={s.probBar}>
        <div
          className={s.probFill}
          style={{
            width: `${deal.probability}%`,
            background: deal.probability >= 75
              ? '#22c55e'
              : deal.probability >= 45
              ? '#f59e0b'
              : '#ef4444',
          }}
        />
      </div>

      {/* Meta badges */}
      <div className={s.cardMeta}>
        <span className={s.cardSource}>{SOURCE_LABEL[deal.source] ?? deal.source}</span>
        <span className={s.cardDays} title={`${days} дней в этой стадии`}>
          <Clock size={9} /> {days}д
        </span>
        {totalTasks > 0 && (
          <span className={`${s.cardTasks} ${overdueDeal ? s.cardTasksOverdue : ''}`}>
            <CheckSquare size={9} /> {doneTasks}/{totalTasks}
          </span>
        )}
        {deal.assignedName && (
          <span className={s.cardAssignee}>{deal.assignedName.split(' ')[0]}</span>
        )}
      </div>

      {/* Next task */}
      {task && (
        <div className={`${s.cardNextTask} ${isOverdue(task.dueAt) ? s.cardNextTaskOverdue : ''}`}>
          ↳ {task.title}
        </div>
      )}

      {/* Hover actions */}
      <div className={s.cardActions} onClick={e => e.stopPropagation()}>
        <button className={s.cardAction}
          onClick={e => { e.stopPropagation(); window.location.href = `tel:${deal.phone}`; }}
          title="Позвонить">
          <Phone size={12} />
        </button>
        <button className={s.cardAction}
          onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${deal.phone.replace(/\D/g, '')}`, '_blank'); }}
          title="WhatsApp">
          <MessageCircle size={12} />
        </button>
        <button className={`${s.cardAction} ${s.cardActionWon}`}
          onClick={e => { e.stopPropagation(); onOpenWonModal(deal.id); }}
          title="Закрыть как выигранную">
          <Trophy size={12} />
        </button>
        <button className={`${s.cardAction} ${s.cardActionLost}`}
          onClick={e => { e.stopPropagation(); onOpenLostModal(deal.id); }}
          title="Отметить как проигранную">
          <XCircle size={12} />
        </button>
      </div>
    </div>
  );
}
