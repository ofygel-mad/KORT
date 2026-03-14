import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Settings, X, Minimize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile } from '../model/types';
import styles from './Workspace.module.css';

interface Props { tile: WorkspaceTile; snapshot?: WorkspaceSnapshot; }

const SIZE_OPTIONS = [
  { value: 'compact', label: 'Компактное' },
  { value: 'default', label: 'Стандартное' },
  { value: 'wide',    label: 'Широкое' },
] as const;

/** Get the tile's current screen rect for FLIP origin animation */
function getTileRect(id: string): DOMRect | null {
  return document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`)?.getBoundingClientRect() ?? null;
}

export function WorkspaceTileModal({ tile, snapshot }: Props) {
  const minimizeTile   = useWorkspaceStore((s) => s.minimizeTile);
  const openSettings   = useWorkspaceStore((s) => s.openSettings);
  const closeSettings  = useWorkspaceStore((s) => s.closeSettings);
  const settingsTileId = useWorkspaceStore((s) => s.settingsTileId);
  const renameTile     = useWorkspaceStore((s) => s.renameTile);
  const resizeModal    = useWorkspaceStore((s) => s.resizeModal);
  const reloadTile     = useWorkspaceStore((s) => s.reloadTile);
  const removeTile     = useWorkspaceStore((s) => s.removeTile);
  const definition     = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon           = definition.icon;
  const [draft, setDraft] = useState(tile.title);
  const settingsOpen   = settingsTileId === tile.id;
  const settingsRef    = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        settingsRef.current?.contains(e.target as Node) ||
        settingsBtnRef.current?.contains(e.target as Node)
      ) return;
      closeSettings();
    };
    // Slight delay to avoid instant close on open
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 80);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [settingsOpen, closeSettings]);

  // FLIP: compute origin from tile position for expand animation
  const tileRect = getTileRect(tile.id);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const originX = tileRect ? `${((tileRect.left + tileRect.width/2) / vw * 100).toFixed(1)}%` : '50%';
  const originY = tileRect ? `${((tileRect.top + tileRect.height/2) / vh * 100).toFixed(1)}%` : '50%';

  const sizeClass =
    tile.modalSize === 'compact' ? styles.tileModalCompact :
    tile.modalSize === 'wide'    ? styles.tileModalWide :
    styles.tileModalDefault;

  const content = (
    <>
      {/* Backdrop */}
      <motion.div
        className={styles.tileModalBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        onClick={minimizeTile}
      />

      {/* Modal — expands from tile origin */}
      <div className={styles.tileModalShell}>
        <motion.section
          className={`${styles.tileModal} ${sizeClass}`}
          initial={{ opacity: 0, scale: 0.12, transformOrigin: `${originX} ${originY}` }}
          animate={{ opacity: 1, scale: 1, transformOrigin: `${originX} ${originY}` }}
          exit={{ opacity: 0, scale: 0.1, transformOrigin: `${originX} ${originY}` }}
          transition={{
            opacity: { duration: 0.22 },
            scale: { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 },
          }}
          role="dialog" aria-modal="true" aria-label={tile.title}
        >
          {/* Header bar */}
          <div className={styles.tileModalHeader}>
            <div className={styles.tileIdentity}>
              <span className={styles.tileIconLg}><Icon size={19} /></span>
              <div>
                <div className={styles.tileModalTitle}>{tile.title}</div>
                <div className={styles.tileModalSubtitle}>{definition.description}</div>
              </div>
            </div>
            <div className={styles.tileModalActions}>
              {/* Settings button */}
              <button
                ref={settingsBtnRef}
                className={`${styles.tileModalAction} ${settingsOpen ? styles.tileModalActionActive : ''}`}
                onClick={() => settingsOpen ? closeSettings() : openSettings(tile.id)}
                aria-label="Настройки"
              >
                <Settings size={14} />
              </button>
              {/* Close / minimize */}
              <button
                className={`${styles.tileModalAction} ${styles.tileModalActionClose}`}
                onClick={minimizeTile}
                aria-label="Свернуть"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          {/* SPA content area */}
          <div className={styles.tileModalMonitor}>
            {definition.renderSPA(snapshot, tile.version)}
          </div>

          {/* Settings popover — closes on outside click */}
          <AnimatePresence>
            {settingsOpen && (
              <motion.div
                ref={settingsRef}
                className={styles.tileSettingsPopover}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              >
                <div className={styles.tileSettingsHeader}>Настройки плитки</div>

                <label className={styles.tileSettingsField}>
                  <span>Переименовать</span>
                  <input
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={() => renameTile(tile.id, draft)}
                    onKeyDown={e => { if (e.key === 'Enter') { renameTile(tile.id, draft); e.currentTarget.blur(); }}}
                  />
                </label>

                <div className={styles.tileSettingsField}>
                  <span>Размер окна</span>
                  <div className={styles.tileSettingsSegmented}>
                    {SIZE_OPTIONS.map(opt => (
                      <button key={opt.value}
                        className={`${styles.tileSettingsSegment} ${tile.modalSize === opt.value ? styles.tileSettingsSegmentActive : ''}`}
                        onClick={() => resizeModal(tile.id, opt.value)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button className={styles.tileSettingsAction} onClick={() => reloadTile(tile.id)}>
                  <RotateCcw size={13} /> Перезагрузить
                </button>

                <button
                  className={`${styles.tileSettingsAction} ${styles.tileSettingsDanger}`}
                  onClick={() => removeTile(tile.id)}
                >
                  Удалить плитку
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
