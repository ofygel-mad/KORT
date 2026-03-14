import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Settings, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile } from '../model/types';
import styles from './Workspace.module.css';

interface Props {
  tile: WorkspaceTile;
  snapshot?: WorkspaceSnapshot;
}

const SIZE_OPTIONS = [
  { value: 'compact', label: 'Компактное' },
  { value: 'default', label: 'Стандартное' },
  { value: 'wide',    label: 'Широкое' },
] as const;

// Find where the tile currently sits in the DOM for origin animation
function getTileRect(id: string): DOMRect | null {
  const el = document.querySelector(`[data-tile-id="${id}"]`);
  return el ? el.getBoundingClientRect() : null;
}

export function WorkspaceTileModal({ tile, snapshot }: Props) {
  const minimizeTile  = useWorkspaceStore((s) => s.minimizeTile);
  const openSettings  = useWorkspaceStore((s) => s.openSettings);
  const closeSettings = useWorkspaceStore((s) => s.closeSettings);
  const settingsTileId = useWorkspaceStore((s) => s.settingsTileId);
  const renameTile    = useWorkspaceStore((s) => s.renameTile);
  const resizeModal   = useWorkspaceStore((s) => s.resizeModal);
  const reloadTile    = useWorkspaceStore((s) => s.reloadTile);
  const removeTile    = useWorkspaceStore((s) => s.removeTile);

  const definition    = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon          = definition.icon;
  const [draft, setDraft] = useState(tile.title);
  const settingsOpen  = settingsTileId === tile.id;

  const sizeClass =
    tile.modalSize === 'compact' ? styles.tileModalCompact :
    tile.modalSize === 'wide'    ? styles.tileModalWide :
    styles.tileModalDefault;

  const modalContent = (
    <>
      {/* Backdrop */}
      <motion.div
        className={styles.tileModalBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={minimizeTile}
      />

      {/* Centering shell — always fixed full-screen */}
      <div className={styles.tileModalShell}>
        <motion.section
          className={`${styles.tileModal} ${sizeClass}`}
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.82, y: 16 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.75 }}
          role="dialog"
          aria-modal="true"
          aria-label={tile.title}
        >
          {/* Header */}
          <div className={styles.tileModalHeader}>
            <div className={styles.tileIdentity}>
              <span className={styles.tileIconLg}><Icon size={20} /></span>
              <div>
                <div className={styles.tileModalTitle}>{tile.title}</div>
                <div className={styles.tileModalSubtitle}>Рабочее окно плитки</div>
              </div>
            </div>
            <button className={styles.tileModalClose} onClick={minimizeTile} aria-label="Свернуть">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.tileModalMonitor}>
            <div className={styles.tileModalContent}>
              {definition.render(snapshot, tile.version)}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.tileModalFooter}>
            <button
              className={styles.tileSettingsButton}
              onClick={() => settingsOpen ? closeSettings() : openSettings(tile.id)}
              aria-label="Настройки"
            >
              <Settings size={15} />
            </button>
          </div>

          {/* Settings popover */}
          {settingsOpen && (
            <div className={styles.tileSettingsPopover}>
              <div className={styles.tileSettingsHeader}>Настройки плитки</div>

              <label className={styles.tileSettingsField}>
                <span>Переименовать</span>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => renameTile(tile.id, draft)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { renameTile(tile.id, draft); e.currentTarget.blur(); }
                  }}
                />
              </label>

              <div className={styles.tileSettingsField}>
                <span>Размер окна</span>
                <div className={styles.tileSettingsSegmented}>
                  {SIZE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={`${styles.tileSettingsSegment} ${tile.modalSize === opt.value ? styles.tileSettingsSegmentActive : ''}`}
                      onClick={() => resizeModal(tile.id, opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className={styles.tileSettingsAction} onClick={() => reloadTile(tile.id)}>
                <RotateCcw size={14} /> Перезагрузить
              </button>

              <button
                className={`${styles.tileSettingsAction} ${styles.tileSettingsDanger}`}
                onClick={() => removeTile(tile.id)}
              >
                Удалить плитку
              </button>
            </div>
          )}
        </motion.section>
      </div>
    </>
  );

  // Use portal so modal is ALWAYS a direct child of <body>, never inside workspace
  return createPortal(modalContent, document.body);
}
