import type { WorkspaceSnapshot } from '../../model/types';
import styles from '../../components/Workspace.module.css';

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

export function TasksTilePreview({ snapshot }: { snapshot?: WorkspaceSnapshot }) {
  const rows = snapshot?.todayTasks ?? [];

  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewHeaderRow}>
        <span>Задача</span>
        <span>Клиент</span>
        <span>Приоритет</span>
      </div>
      <div className={styles.previewBody}>
        {rows.length === 0 ? (
          <div className={styles.previewEmpty}>Сегодня тихо. Даже машины иногда отдыхают.</div>
        ) : rows.map((row) => (
          <div key={row.id} className={styles.tableRow3}>
            <strong>{row.title}</strong>
            <span>{row.customerName || 'Без привязки'}</span>
            <span>{PRIORITY_LABEL[row.priority] ?? 'Обычный'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
