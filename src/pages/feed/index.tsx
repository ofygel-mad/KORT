import { useQuery } from '@tanstack/react-query';
import type { CSSProperties, ElementType } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, Phone, Mail, Zap, CheckSquare,
  UserPlus, Briefcase, ArrowRight, Activity,
} from 'lucide-react';
import { api } from '../../shared/api/client';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { EmptyState } from '../../shared/ui/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { listContainer, listItem } from '../../shared/motion/presets';
import { useDocumentTitle } from '../../shared/hooks/useDocumentTitle';
import s from './Feed.module.css';

/* ── Types ──────────────────────────────────────────────────── */
interface FeedItem {
  id: string; type: string; payload: Record<string, any>;
  actor: { id: string; full_name: string } | null;
  customer: { id: string; full_name: string } | null;
  deal: { id: string; title: string } | null;
  created_at: string;
}

/* ── Type metadata (icon + color per event type) ─────────────── */
const TYPE_META: Record<string, { icon: ElementType; color: string; label: string }> = {
  note:             { icon: MessageSquare, color: '#6366F1', label: 'Заметка' },
  call:             { icon: Phone,         color: '#10B981', label: 'Звонок' },
  email_sent:       { icon: Mail,          color: '#3B82F6', label: 'Email отправлен' },
  email_in:         { icon: Mail,          color: '#8B5CF6', label: 'Email получен' },
  whatsapp:         { icon: MessageSquare, color: '#25D366', label: 'WhatsApp' },
  status_change:    { icon: ArrowRight,    color: '#F59E0B', label: 'Смена статуса' },
  stage_change:     { icon: ArrowRight,    color: '#F59E0B', label: 'Смена стадии' },
  deal_created:     { icon: Briefcase,     color: '#EC4899', label: 'Сделка создана' },
  task_created:     { icon: CheckSquare,   color: '#14B8A6', label: 'Задача создана' },
  task_done:        { icon: CheckSquare,   color: '#10B981', label: 'Задача выполнена' },
  customer_created: { icon: UserPlus,      color: '#F97316', label: 'Клиент добавлен' },
};

/* ── Feed card ───────────────────────────────────────────────── */
function FeedCard({ item }: { item: FeedItem }) {
  const navigate = useNavigate();
  const meta = TYPE_META[item.type] ?? { icon: Zap, color: '#6B7280', label: item.type };
  const Icon = meta.icon;

  return (
    <motion.div className={s.feedItem} variants={listItem}>
      <div
        className={s.iconDot}
        style={{ '--feed-icon-bg': `${meta.color}18`, '--feed-icon-color': meta.color } as CSSProperties}
      >
        <Icon size={16} className={s.iconSvg} />
      </div>

      <div className={s.feedBody}>
        <div className={s.feedText}>
          <span className={s.feedActor}>{item.actor?.full_name ?? 'Система'}</span>
          {' — '}
          <span className={s.feedType}>{meta.label}</span>

          {item.customer && (
            <>
              {' для '}
              <button
                className={s.feedLink}
                onClick={() => navigate(`/customers/${item.customer!.id}`)}
              >
                {item.customer.full_name}
              </button>
            </>
          )}

          {item.deal && (
            <>
              {' по сделке '}
              <button
                className={s.feedLink}
                onClick={() => navigate(`/deals/${item.deal!.id}`)}
              >
                {item.deal.title}
              </button>
            </>
          )}
        </div>

        {item.payload?.body && (
          <div className={s.feedPreview}>{String(item.payload.body)}</div>
        )}

        <div className={s.feedTime}>
          {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Page ────────────────────────────────────────────────────── */
export default function FeedPage() {
  useDocumentTitle('Лента');

  const { data, isLoading } = useQuery<FeedItem[]>({
    queryKey: ['feed'],
    queryFn: () => api.get('/feed/'),
    refetchInterval: 30_000,
  });

  return (
    <div className={s.page}>
      <PageHeader
        title="Лента активности"
        subtitle="Все события организации в реальном времени"
      />

      {isLoading && (
        <div className={s.skeletonList}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={s.skeletonItem}>
              <div className={s.skeletonDot} />
              <div className={s.skeletonBody}>
                <div className={s.skeletonTitle}><Skeleton style={{ width: '60%', height: 14 }} /></div>
                <Skeleton style={{ width: '35%', height: 11 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <EmptyState
          icon={<Activity size={22} />}
          title="Лента пуста"
          subtitle="Активность появится после первых действий в системе"
        />
      )}

      {!isLoading && data && data.length > 0 && (
        <motion.div
          variants={listContainer}
          initial="hidden"
          animate="visible"
          className={s.feedList}
        >
          {data.map((item) => <FeedCard key={item.id} item={item} />)}
        </motion.div>
      )}
    </div>
  );
}
