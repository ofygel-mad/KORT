import { X } from 'lucide-react';
import { WORKSPACE_WIDGETS } from '../registry';
import type { WorkspaceWidgetKind } from '../model/types';
import styles from './Workspace.module.css';

interface WorkspaceAddMenuProps {
  open: boolean;
  onClose: () => void;
  onSelect: (kind: WorkspaceWidgetKind) => void;
}

export function WorkspaceAddMenu({ open, onClose, onSelect }: WorkspaceAddMenuProps) {
  if (!open) return null;

  return (
    <>
      <button className={styles.menuOverlay} onClick={onClose} aria-label="Закрыть меню выбора плиток" />
      <div className={styles.menuPanel} role="dialog" aria-modal="true" aria-label="Добавить плитку на рабочее поле">
        <div className={styles.menuHeader}>
          <div>
            <div className={styles.menuEyebrow}>Конструктор рабочего поля</div>
            <h2 className={styles.menuTitle}>Что поставить на экран</h2>
          </div>
          <button className={styles.menuClose} onClick={onClose} aria-label="Закрыть">
            <X size={16} />
          </button>
        </div>

        <div className={styles.menuGrid}>
          {WORKSPACE_WIDGETS.map((widget) => {
            const Icon = widget.icon;
            return (
              <button
                key={widget.kind}
                className={styles.menuCard}
                onClick={() => onSelect(widget.kind)}
              >
                <span className={styles.menuCardIcon}><Icon size={18} /></span>
                <span className={styles.menuCardCopy}>
                  <strong>{widget.title}</strong>
                  <span>{widget.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
