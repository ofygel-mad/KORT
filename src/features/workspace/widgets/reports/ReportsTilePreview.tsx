import { useAuthStore } from '../../../../shared/stores/auth';
import { formatMoney, formatNumber } from '../../../../shared/utils/format';
import type { WorkspaceSnapshot } from '../../model/types';
import styles from '../../components/Workspace.module.css';

export function ReportsTilePreview({ snapshot }: { snapshot?: WorkspaceSnapshot }) {
  const currency = useAuthStore((s) => s.org?.currency ?? 'KZT');

  return (
    <div className={styles.metricsPreview}>
      <div className={styles.metricMiniCard}>
        <span>Клиенты</span>
        <strong>{formatNumber(snapshot?.customersCount ?? 0)}</strong>
      </div>
      <div className={styles.metricMiniCard}>
        <span>Сделки</span>
        <strong>{formatNumber(snapshot?.dealsCount ?? 0)}</strong>
      </div>
      <div className={styles.metricMiniCard}>
        <span>Задачи</span>
        <strong>{formatNumber(snapshot?.tasksCount ?? 0)}</strong>
      </div>
      <div className={styles.metricMiniWide}>
        <span>Выручка за месяц</span>
        <strong>{formatMoney(snapshot?.revenueMonth ?? 0, currency)}</strong>
      </div>
    </div>
  );
}
