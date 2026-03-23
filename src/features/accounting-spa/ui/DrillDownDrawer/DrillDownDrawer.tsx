/**
 * ui/DrillDownDrawer/DrillDownDrawer.tsx
 * Side panel shown when a ledger row is selected.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { X, ExternalLink, Copy, CheckCircle2, Circle, Shield } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { accountingApi } from '../../api/client';
import type { LedgerEntry } from '../../api/client';
import s from './DrillDownDrawer.module.css';

interface Props {
  entry: LedgerEntry | null;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  income: 'Выручка', expense: 'Расход', transfer: 'Перемещение',
  adjustment: 'Корректировка', write_off: 'Списание', return: 'Возврат',
};

const SOURCE_LABELS: Record<string, string> = {
  deal: 'Сделка', order: 'Заказ Чапан', warehouse: 'Склад', manual: 'Вручную', import: 'Импорт',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Row({ label, value }: { label: string; value?: string | null | React.ReactNode }) {
  if (!value) return null;
  return (
    <div className={s.infoRow}>
      <span className={s.infoLabel}>{label}</span>
      <span className={s.infoValue}>{value}</span>
    </div>
  );
}

export function DrillDownDrawer({ entry, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const qc = useQueryClient();

  const reconcileMut = useMutation({
    mutationFn: () => accountingApi.reconcile(entry!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounting-entries'] });
      toast.success('Запись сверена');
    },
  });

  const copyHash = () => {
    if (!entry) return;
    navigator.clipboard.writeText(entry.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      {entry && (
        <motion.div
          className={s.overlay}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ type: 'spring', stiffness: 340, damping: 34 }}
        >
          {/* Header */}
          <div className={s.header}>
            <div>
              <div className={s.seq}>Запись #{entry.seq}</div>
              <div className={s.type}>{TYPE_LABELS[entry.type] ?? entry.type}</div>
            </div>
            <button className={s.closeBtn} onClick={onClose}><X size={16} /></button>
          </div>

          {/* Amount */}
          <div className={`${s.amountBlock} ${s[`amount_${entry.type}`]}`}>
            <span className={s.amountValue}>
              {entry.type === 'income' ? '+' : entry.type === 'expense' || entry.type === 'write_off' ? '−' : ''}
              {Math.abs(entry.amount).toLocaleString('ru-RU')} {entry.currency}
            </span>
          </div>

          {/* Info rows */}
          <div className={s.section}>
            <Row label="Дата" value={fmt(entry.createdAt)} />
            <Row label="Категория" value={entry.category} />
            <Row label="Счёт" value={entry.account} />
            <Row label="Контрагент" value={entry.counterparty} />
            <Row label="Автор" value={entry.author} />
            {entry.notes && <Row label="Примечание" value={entry.notes} />}
            {entry.tags.length > 0 && (
              <div className={s.infoRow}>
                <span className={s.infoLabel}>Теги</span>
                <div className={s.tags}>
                  {entry.tags.map((t) => <span key={t} className={s.tag}>{t}</span>)}
                </div>
              </div>
            )}
          </div>

          {/* Source */}
          {entry.sourceModule && (
            <div className={s.section}>
              <div className={s.sectionTitle}>Источник</div>
              <div className={s.sourceBlock}>
                <span className={s.sourceMod}>{SOURCE_LABELS[entry.sourceModule] ?? entry.sourceModule}</span>
                {entry.sourceLabel && <span className={s.sourceLabel}>{entry.sourceLabel}</span>}
                {entry.sourceId && (
                  <button className={s.goBtn} title="Перейти к источнику">
                    <ExternalLink size={13} /> Открыть
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Integrity */}
          <div className={s.section}>
            <div className={s.sectionTitle}>Целостность</div>
            <div className={s.hashRow}>
              <Shield size={13} className={s.shieldIcon} />
              <code className={s.hash}>{entry.hash.slice(0, 16)}…</code>
              <button className={s.copyBtn} onClick={copyHash} title="Скопировать хеш">
                {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
              </button>
            </div>
            {entry.prevHash && (
              <div className={s.chainNote}>↳ цепочка от #{entry.seq - 1}</div>
            )}
          </div>

          {/* Actions */}
          <div className={s.actions}>
            {!entry.isReconciled && (
              <button
                className={s.reconcileBtn}
                onClick={() => reconcileMut.mutate()}
                disabled={reconcileMut.isPending}
              >
                <Circle size={14} />
                {reconcileMut.isPending ? 'Сохранение…' : 'Отметить как сверенную'}
              </button>
            )}
            {entry.isReconciled && (
              <div className={s.reconciledNote}>
                <CheckCircle2 size={14} />
                Сверено {entry.reconciledBy ? `· ${entry.reconciledBy}` : ''}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
