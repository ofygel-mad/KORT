import { useChapanStore } from '../../../chapan-spa/model/chapan.store';
import { ORDER_STATUS_LABEL, ORDER_STATUS_COLOR } from '../../../chapan-spa/api/types';
import styles from '../../components/Workspace.module.css';

export function ChapanTilePreview() {
  const { orders } = useChapanStore();

  const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed');
  const recent = active.slice(0, 3);

  if (recent.length === 0) {
    return (
      <div className={styles.previewFrame}>
        <div className={styles.previewHeaderRow}>
          <span>Заказ</span><span>Статус</span><span>Сумма</span>
        </div>
        <div className={styles.previewBody}>
          <div className={styles.previewEmpty}>
            Нет активных заказов
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewHeaderRow}>
        <span>Заказ</span><span>Статус</span><span>Сумма</span>
      </div>
      <div className={styles.previewBody}>
        {recent.map(o => (
          <div key={o.id} className={styles.previewRow}>
            <span>{o.orderNumber}</span>
            <span style={{ color: ORDER_STATUS_COLOR[o.status], fontSize: 11 }}>
              {ORDER_STATUS_LABEL[o.status]}
            </span>
            <span>{(o.totalAmount / 1000).toFixed(0)}K ₸</span>
          </div>
        ))}
      </div>
    </div>
  );
}
