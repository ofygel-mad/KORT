import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Settings, X } from 'lucide-react';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile } from '../model/types';
import styles from './Workspace.module.css';

interface WorkspaceTileModalProps {
  tile: WorkspaceTile;
  snapshot?: WorkspaceSnapshot;
}

const MODAL_SIZE_OPTIONS = [
  { value: 'compact', label: 'Компактное окно' },
  { value: 'default', label: 'Стандартное окно' },
  { value: 'wide', label: 'Широкое окно' },
] as const;

export function WorkspaceTileModal({ tile, snapshot }: WorkspaceTileModalProps) {
  const minimizeTile = useWorkspaceStore((s) => s.minimizeTile);
  const openSettings = useWorkspaceStore((s) => s.openSettings);
  const closeSettings = useWorkspaceStore((s) => s.closeSettings);
  const settingsTileId = useWorkspaceStore((s) => s.settingsTileId);
  const renameTile = useWorkspaceStore((s) => s.renameTile);
  const resizeModal = useWorkspaceStore((s) => s.resizeModal);
  const reloadTile = useWorkspaceStore((s) => s.reloadTile);
  const removeTile = useWorkspaceStore((s) => s.removeTile);
  const definition = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon = definition.icon;
  const [draftTitle, setDraftTitle] = useState(tile.title);
  const settingsOpen = settingsTileId === tile.id;

  const modalSizeClass = useMemo(() => {
    if (tile.modalSize === 'compact') return styles.tileModalCompact;
    if (tile.modalSize === 'wide') return styles.tileModalWide;
    return styles.tileModalDefault;
  }, [tile.modalSize]);

  return (
    <>
      <motion.button
        type="button"
        className={styles.tileModalBackdrop}
        onClick={minimizeTile}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        aria-label="Свернуть модальное окно плитки"
      />

      <motion.section
        layoutId={`workspace-tile-${tile.id}`}
        className={`${styles.tileModal} ${modalSizeClass}`}
        initial={{ opacity: 0.6 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0.96, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26, mass: 0.92 }}
        role="dialog"
        aria-modal="true"
        aria-label={tile.title}
      >
        <div className={styles.tileModalHeader}>
          <div className={styles.tileIdentity}>
            <span className={styles.tileIcon}><Icon size={18} /></span>
            <div>
              <div className={styles.tileModalTitle}>{tile.title}</div>
              <div className={styles.tileModalSubtitle}>Плитка развернута в рабочее окно</div>
            </div>
          </div>

          <button className={styles.tileModalClose} onClick={minimizeTile} aria-label="Свернуть окно">
            <X size={18} />
          </button>
        </div>

        <div className={styles.tileModalMonitor}>
          <div className={styles.tileModalContent}>
            {definition.render(snapshot, tile.version)}
          </div>
        </div>

        <div className={styles.tileModalFooter}>
          <button
            className={styles.tileSettingsButton}
            onClick={() => (settingsOpen ? closeSettings() : openSettings(tile.id))}
            aria-label="Открыть настройки плитки"
          >
            <Settings size={17} />
          </button>
        </div>

        {settingsOpen && (
          <div className={styles.tileSettingsPopover} role="dialog" aria-modal="false" aria-label="Настройки плитки">
            <div className={styles.tileSettingsHeader}>Настройки плитки</div>

            <label className={styles.tileSettingsField}>
              <span>Переименовать</span>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={() => renameTile(tile.id, draftTitle)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    renameTile(tile.id, draftTitle);
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>

            <div className={styles.tileSettingsField}>
              <span>Размер модального окна</span>
              <div className={styles.tileSettingsSegmented}>
                {MODAL_SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.tileSettingsSegment} ${tile.modalSize === option.value ? styles.tileSettingsSegmentActive : ''}`}
                    onClick={() => resizeModal(tile.id, option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button className={styles.tileSettingsAction} onClick={() => reloadTile(tile.id)}>
              <RotateCcw size={15} />
              Перезагрузить содержимое
            </button>

            <button className={`${styles.tileSettingsAction} ${styles.tileSettingsDanger}`} onClick={() => removeTile(tile.id)}>
              Удалить плитку
            </button>
          </div>
        )}
      </motion.section>
    </>
  );
}
