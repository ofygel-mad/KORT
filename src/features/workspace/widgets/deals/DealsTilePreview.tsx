import { formatMoney } from '../../../../shared/utils/format';
import { useAuthStore } from '../../../../shared/stores/auth';
import type { WorkspaceSnapshot } from '../../model/types';
import styles from '../../components/Workspace.module.css';

export function DealsTilePreview({ snapshot }: { snapshot?: WorkspaceSnapshot }) {
  const currency = useAuthStore((s) => s.org?.currency ?? 'KZT');
  const rows = snapshot?.stalledDeals ?? [];

  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewHeaderRow}>
        <span>Сделка</span>
        <span>Этап</span>
        <span>Сумма</span>
      </div>
      <div className={styles.previewBody}>
        {rows.length === 0 ? (
          <div className={styles.previewEmpty}>Когда сделки появятся, здесь будет превью рабочего потока.</div>
        ) : rows.map((row) => (
          <div key={row.id} className={styles.tableRow3}>
            <strong>{row.title}</strong>
            <span>{row.stage} · {row.customerName}</span>
            <span>{formatMoney(row.amount, currency)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
