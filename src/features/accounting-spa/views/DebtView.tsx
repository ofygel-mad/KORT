/**
 * views/DebtView.tsx
 * Debitorka / Kreditorka — who owes what and how long.
 */

import { useQuery } from '@tanstack/react-query';
import { Clock, AlertTriangle } from 'lucide-react';
import { accountingApi } from '../api/client';
import type { DebtEntry } from '../api/client';
import s from './DebtView.module.css';

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

function urgencyClass(days: number) {
  if (days >= 21) return s.urgent;
  if (days >= 10) return s.warn;
  return '';
}

function UrgencyIcon({ days }: { days: number }) {
  if (days >= 21) return <AlertTriangle size={13} className={s.urgentIcon} />;
  if (days >= 10) return <Clock size={13} className={s.warnIcon} />;
  return null;
}

function DebtSection({ title, entries, total, emptyText }: {
  title: string;
  entries: DebtEntry[];
  total: number;
  emptyText: string;
}) {
  return (
    <div className={s.section}>
      <div className={s.sectionHead}>
        <span className={s.sectionTitle}>{title}</span>
        <span className={s.sectionTotal}>₸ {fmt(total)}</span>
      </div>

      {entries.length === 0
        ? <div className={s.empty}>{emptyText}</div>
        : (
          <div className={s.list}>
            {entries.map((e) => (
              <div key={e.id} className={`${s.card} ${urgencyClass(e.daysSince)}`}>
                <div className={s.cardMain}>
                  <div className={s.cardTop}>
                    <span className={s.counterparty}>{e.counterparty}</span>
                    <UrgencyIcon days={e.daysSince} />
                    <span className={s.amount}>₸ {fmt(e.amount)}</span>
                  </div>
                  <div className={s.cardSub}>
                    <span className={s.label}>{e.label}</span>
                    <span className={s.days}>{e.daysSince} дн.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}

export function DebtView() {
  const { data, isLoading } = useQuery({
    queryKey: ['accounting-debts'],
    queryFn: () => accountingApi.getDebts(),
  });

  if (isLoading) return <div className={s.loading}>Загрузка…</div>;
  if (!data) return null;

  const netPosition = data.totalReceivable - data.totalPayable;

  return (
    <div className={s.root}>
      {/* Net position banner */}
      <div className={`${s.netCard} ${netPosition >= 0 ? s.netPositive : s.netNegative}`}>
        <div>
          <div className={s.netLabel}>Чистая позиция (дебиторка − кредиторка)</div>
          <div className={s.netValue}>
            {netPosition >= 0 ? '+' : ''}₸ {fmt(netPosition)}
          </div>
        </div>
        <div className={s.netMeta}>
          <span>Нам должны: ₸ {fmt(data.totalReceivable)}</span>
          <span>Мы должны: ₸ {fmt(data.totalPayable)}</span>
        </div>
      </div>

      <div className={s.columns}>
        <DebtSection
          title="Дебиторка — нам должны"
          entries={data.receivable}
          total={data.totalReceivable}
          emptyText="Задолженностей нет — все заказы оплачены"
        />
        <DebtSection
          title="Кредиторка — мы должны"
          entries={data.payable}
          total={data.totalPayable}
          emptyText="Нет неоплаченных обязательств"
        />
      </div>
    </div>
  );
}
