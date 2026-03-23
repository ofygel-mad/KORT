/**
 * views/GapsView.tsx
 * Gap Detector: shows unresolved data inconsistencies between modules.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, XCircle, CheckCircle2, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { accountingApi } from '../api/client';
import type { AccountingGap } from '../api/client';
import s from './GapsView.module.css';

const SEVERITY_META = {
  error:   { Icon: XCircle,        cls: 'error',   label: 'Ошибка' },
  warning: { Icon: AlertTriangle,  cls: 'warning', label: 'Предупреждение' },
  info:    { Icon: Info,           cls: 'info',    label: 'Информация' },
};

const SOURCE_LABELS: Record<string, string> = {
  order: 'Заказ', deal: 'Сделка', warehouse: 'Склад', accounting: 'Учёт',
};

function GapCard({ gap, onResolve, onIgnore }: {
  gap: AccountingGap;
  onResolve: (id: string) => void;
  onIgnore: (id: string) => void;
}) {
  const meta = SEVERITY_META[gap.severity] ?? SEVERITY_META.info;
  const { Icon } = meta;

  return (
    <div className={`${s.card} ${s[`card_${meta.cls}`]}`}>
      <div className={s.cardHeader}>
        <Icon size={15} className={s[`icon_${meta.cls}`]} />
        <span className={`${s.severityBadge} ${s[`badge_${meta.cls}`]}`}>{meta.label}</span>
        <span className={s.sourceBadge}>{SOURCE_LABELS[gap.sourceModule] ?? gap.sourceModule}</span>
      </div>

      <p className={s.description}>{gap.description}</p>

      <div className={s.cardActions}>
        <button className={s.resolveBtn} onClick={() => onResolve(gap.id)}>
          <CheckCircle2 size={13} /> Исправлено
        </button>
        <button className={s.ignoreBtn} onClick={() => onIgnore(gap.id)}>
          <EyeOff size={13} /> Игнорировать
        </button>
      </div>
    </div>
  );
}

export function GapsView() {
  const qc = useQueryClient();

  const { data: gaps, isLoading } = useQuery({
    queryKey: ['accounting-gaps'],
    queryFn: () => accountingApi.getGaps(),
    refetchInterval: 30_000,
  });

  const resolveMut = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'resolve' | 'ignore' }) =>
      accountingApi.resolveGap(id, action),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['accounting-gaps'] });
      qc.invalidateQueries({ queryKey: ['accounting-summary'] });
      toast.success(action === 'resolve' ? 'Разрыв отмечен как исправленный' : 'Разрыв проигнорирован');
    },
  });

  if (isLoading) return <div className={s.loading}>Анализ разрывов…</div>;

  const errors   = (gaps ?? []).filter((g) => g.severity === 'error');
  const warnings = (gaps ?? []).filter((g) => g.severity === 'warning');
  const infos    = (gaps ?? []).filter((g) => g.severity === 'info');

  if ((gaps ?? []).length === 0) {
    return (
      <div className={s.allGood}>
        <CheckCircle2 size={32} className={s.goodIcon} />
        <span className={s.goodTitle}>Разрывов не обнаружено</span>
        <span className={s.goodSub}>Все модули синхронизированы. Следующая проверка — через 30 сек.</span>
      </div>
    );
  }

  const Section = ({ title, items }: { title: string; items: AccountingGap[] }) => {
    if (items.length === 0) return null;
    return (
      <div className={s.section}>
        <div className={s.sectionTitle}>{title} ({items.length})</div>
        {items.map((g) => (
          <GapCard
            key={g.id}
            gap={g}
            onResolve={(id) => resolveMut.mutate({ id, action: 'resolve' })}
            onIgnore={(id) => resolveMut.mutate({ id, action: 'ignore' })}
          />
        ))}
      </div>
    );
  };

  return (
    <div className={s.root}>
      <div className={s.header}>
        <span className={s.count}>Найдено разрывов: {(gaps ?? []).length}</span>
        <span className={s.note}>Система автоматически проверяет синхронизацию между модулями</span>
      </div>
      <Section title="🔴 Ошибки" items={errors} />
      <Section title="⚠ Предупреждения" items={warnings} />
      <Section title="ℹ Информация" items={infos} />
    </div>
  );
}
