import styles from '../../components/Workspace.module.css';
import type { WorkspaceSnapshot } from '../../model/types';

const STAGE_LABEL: Record<string, string> = {
  new: 'Новый', in_progress: 'В работе', thinking: 'Думает',
  meeting_set: 'Встреча', no_answer: 'Недозвон', junk: 'Брак',
};

export function LeadsTilePreview({ snapshot }: { snapshot?: WorkspaceSnapshot }) {
  const rows = snapshot?.recentCustomers ?? [];
  return (
    <div className={styles.previewFrame}>
      <div className={styles.previewHeaderRow}>
        <span>Лид</span>
        <span>Компания</span>
        <span>Стадия</span>
      </div>
      <div className={styles.previewBody}>
        {rows.length === 0
          ? <div className={styles.previewEmpty}>Лиды загружаются...</div>
          : rows.map(row => (
            <div key={row.id} className={styles.tableRow3}>
              <strong>{row.fullName}</strong>
              <span>{row.companyName || '—'}</span>
              <span>{STAGE_LABEL[row.status] ?? 'В работе'}</span>
            </div>
          ))
        }
      </div>
    </div>
  );
}
