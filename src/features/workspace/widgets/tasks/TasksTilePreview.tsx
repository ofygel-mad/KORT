import type { WorkspaceSnapshot } from '../../model/types';
import styles from '../../components/Workspace.module.css';
import { useTileTasksUI } from '../../../tasks-spa/model/tile-ui.store';
import { useTasksStore } from '../../../tasks-spa/model/tasks.store';

const PRIORITY_LABEL: Record<string, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

export function TasksTilePreview({ snapshot, tileId }: { snapshot?: WorkspaceSnapshot; tileId: string }) {
  const rows = snapshot?.todayTasks ?? [];
  const { activeId } = useTileTasksUI(tileId);
  const { tasks } = useTasksStore();
  const activeTask = tasks.find(t => t.id === activeId);

  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewHeaderRow}>
        <span>Задача</span>
        <span>Клиент</span>
        <span>Приоритет</span>
      </div>
      {activeTask && <div className={styles.previewEmpty}>📝 {activeTask.title}</div>}
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
