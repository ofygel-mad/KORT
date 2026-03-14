import { Phone, MessageCircle, Clock, AlertTriangle, MoveRight } from 'lucide-react';
import type { Lead } from '../../api/types';
import s from './Board.module.css';

interface Props {
  lead: Lead;
  onDragStart: () => void;
  onDragEnd: () => void;
  onOpenDrawer: (id: string) => void;
  onOpenHandoff: (id: string) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', site: 'Сайт', referral: 'Реферал', ad: 'Реклама',
};

function isStaleLead(lead: Lead): boolean {
  return (Date.now() - new Date(lead.updatedAt).getTime()) / 3600000 > 24;
}

function getLastNote(lead: Lead): string | null {
  if (lead.comment) return lead.comment;
  const meaningful = [...lead.history]
    .reverse()
    .find(e => e.author !== 'Система' && e.action !== 'Лид создан');
  return meaningful?.comment ?? (meaningful?.action !== 'Взято в работу' ? meaningful?.action ?? null : null);
}

export function LeadCard({ lead, onDragStart, onDragEnd, onOpenDrawer, onOpenHandoff }: Props) {
  const stale   = isStaleLead(lead);
  const lastNote = getLastNote(lead);

  return (
    <div
      className={`${s.card} ${stale ? s.cardStale : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDrawer(lead.id)}
    >
      {stale && (
        <div className={s.cardStaleBadge} title="Без движения больше суток">
          <AlertTriangle size={10} />
        </div>
      )}

      <div className={s.cardTop}>
        <div className={s.cardAvatar}>{lead.fullName[0]}</div>
        <div className={s.cardInfo}>
          <div className={s.cardName}>{lead.fullName}</div>
          <div className={s.cardPhone}>{lead.phone}</div>
        </div>
      </div>

      {lastNote && (
        <div className={s.cardNote}>{lastNote}</div>
      )}

      <div className={s.cardMeta}>
        <span className={s.cardSource}>{SOURCE_LABEL[lead.source] ?? lead.source}</span>
        {lead.callbackAt && (
          <span className={s.cardCallback}>
            <Clock size={10} />
            {new Date(lead.callbackAt).toLocaleDateString('ru', { day:'2-digit', month:'short' })}
          </span>
        )}
        {lead.budget && (
          <span className={s.cardBudget}>
            {new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(lead.budget)} ₸
          </span>
        )}
      </div>

      {/* Actions — revealed only on card hover via CSS */}
      <div className={s.cardActions} onClick={e => e.stopPropagation()}>
        <button className={s.cardAction} onClick={e => { e.stopPropagation(); window.open(`https://wa.me/${lead.phone.replace(/\D/g,'')}`, '_blank'); }} title="WhatsApp">
          <MessageCircle size={13} />
        </button>
        <button className={s.cardAction} onClick={e => { e.stopPropagation(); window.location.href = `tel:${lead.phone}`; }} title="Позвонить">
          <Phone size={13} />
        </button>
        {lead.pipeline === 'qualifier' && (
          <button className={`${s.cardAction} ${s.cardActionMove}`}
            onClick={e => { e.stopPropagation(); onOpenHandoff(lead.id); }} title="Передать">
            <MoveRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
