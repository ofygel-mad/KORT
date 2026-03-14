import { Phone, MessageCircle, Clock, AlertTriangle, MoveRight } from 'lucide-react';
import { useLeadsStore } from '../../model/leads.store';
import type { Lead } from '../../api/types';
import s from './Board.module.css';

interface Props {
  lead: Lead;
  onDragStart: () => void;
  onDragEnd: () => void;
}

const SOURCE_LABEL: Record<string, string> = {
  instagram: 'Instagram', site: 'Сайт', referral: 'Реферал', ad: 'Реклама',
};

function isStaleLead(lead: Lead): boolean {
  const hoursOld = (Date.now() - new Date(lead.updatedAt).getTime()) / 3600000;
  return hoursOld > 24;
}

export function LeadCard({ lead, onDragStart, onDragEnd }: Props) {
  const openDrawer = useLeadsStore(s => s.openDrawer);
  const openHandoff = useLeadsStore(s => s.openHandoff);
  const stale = isStaleLead(lead);

  const handleWAClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = lead.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank');
  };
  const handleCallClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${lead.phone}`;
  };
  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openHandoff(lead.id);
  };

  return (
    <div
      className={`${s.card} ${stale ? s.cardStale : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => openDrawer(lead.id)}
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
            {new Intl.NumberFormat('ru-RU', { maximumFractionDigits:0 }).format(lead.budget)} ₸
          </span>
        )}
      </div>

      <div className={s.cardActions} onClick={e => e.stopPropagation()}>
        <button className={s.cardAction} onClick={handleWAClick} title="WhatsApp">
          <MessageCircle size={13} />
        </button>
        <button className={s.cardAction} onClick={handleCallClick} title="Позвонить">
          <Phone size={13} />
        </button>
        {lead.pipeline === 'qualifier' && (
          <button className={`${s.cardAction} ${s.cardActionMove}`} onClick={handleMoveClick} title="Передать">
            <MoveRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
