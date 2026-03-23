import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Copy, Minimize2, RotateCcw, Settings } from 'lucide-react';
import { createPortal } from 'react-dom';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile } from '../model/types';
import { useCompanyAccess } from '../../../shared/hooks/useCompanyAccess';
import { CompanyAccessGate } from '../../../shared/ui/CompanyAccessGate';
import styles from './Workspace.module.css';

interface Props {
  tile: WorkspaceTile;
  snapshot?: WorkspaceSnapshot;
}

const SIZE_OPTIONS = [
  { value: 'compact', label: 'Компактное' },
  { value: 'default', label: 'Стандартное' },
  { value: 'wide', label: 'Широкое' },
] as const;

function getTileRect(id: string): DOMRect | null {
  return document.querySelector<HTMLElement>(`[data-tile-id="${id}"]`)?.getBoundingClientRect() ?? null;
}

export function WorkspaceTileModal({ tile, snapshot }: Props) {
  const navigate = useNavigate();
  const access = useCompanyAccess();
  const minimizeTile = useWorkspaceStore((state) => state.minimizeTile);
  const openSettings = useWorkspaceStore((state) => state.openSettings);
  const closeSettings = useWorkspaceStore((state) => state.closeSettings);
  const settingsTileId = useWorkspaceStore((state) => state.settingsTileId);
  const renameTile = useWorkspaceStore((state) => state.renameTile);
  const resizeModal = useWorkspaceStore((state) => state.resizeModal);
  const reloadTile = useWorkspaceStore((state) => state.reloadTile);
  const removeTile = useWorkspaceStore((state) => state.removeTile);
  const duplicateTile = useWorkspaceStore((state) => state.duplicateTile);
  const definition = WORKSPACE_WIDGET_MAP[tile.kind];
  const [draft, setDraft] = useState(tile.title);
  const settingsOpen = settingsTileId === tile.id;
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsBtnRef = useRef<HTMLButtonElement>(null);

  if (!definition) {
    return null;
  }

  const Icon = definition.icon;

  useEffect(() => {
    setDraft(tile.title);
  }, [tile.title]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const handler = (event: MouseEvent) => {
      if (
        settingsRef.current?.contains(event.target as Node)
        || settingsBtnRef.current?.contains(event.target as Node)
      ) {
        return;
      }

      closeSettings();
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handler);
    };
  }, [closeSettings, settingsOpen]);

  const tileRect = getTileRect(tile.id);
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const originX = tileRect ? `${((tileRect.left + tileRect.width / 2) / viewportWidth * 100).toFixed(1)}%` : '50%';
  const originY = tileRect ? `${((tileRect.top + tileRect.height / 2) / viewportHeight * 100).toFixed(1)}%` : '50%';

  const sizeClass =
    tile.modalSize === 'compact' ? styles.tileModalCompact
      : tile.modalSize === 'wide' ? styles.tileModalWide
        : styles.tileModalDefault;

  const getPopoverStyle = (): CSSProperties => {
    if (!settingsBtnRef.current) {
      return { position: 'fixed', top: 80, right: 20, zIndex: 9999 };
    }

    const rect = settingsBtnRef.current.getBoundingClientRect();
    return {
      position: 'fixed',
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
      zIndex: 9999,
    };
  };

  const modalContent = (
    <>
      <motion.div
        className={styles.tileModalBackdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={minimizeTile}
      />

      <div className={styles.tileModalShell}>
        <motion.section
          className={`${styles.tileModal} ${sizeClass}`}
          initial={{ opacity: 0, scale: 0.12, transformOrigin: `${originX} ${originY}` }}
          animate={{ opacity: 1, scale: 1, transformOrigin: `${originX} ${originY}` }}
          exit={{ opacity: 0, scale: 0.1, transformOrigin: `${originX} ${originY}` }}
          transition={{
            opacity: { duration: 0.2 },
            scale: { type: 'spring', stiffness: 320, damping: 32, mass: 0.8 },
          }}
          role="dialog"
          aria-modal="true"
          aria-label={tile.title}
        >
          <div className={styles.tileModalHeader}>
            <div className={styles.tileIdentity}>
              <span className={styles.tileIconLg}><Icon size={19} /></span>
              <div>
                <div className={styles.tileModalTitle}>{tile.title}</div>
                <div className={styles.tileModalSubtitle}>{definition.description}</div>
              </div>
            </div>

            <div className={styles.tileModalActions}>
              <button
                ref={settingsBtnRef}
                className={`${styles.tileModalAction} ${settingsOpen ? styles.tileModalActionActive : ''}`}
                onClick={() => (settingsOpen ? closeSettings() : openSettings(tile.id))}
                aria-label="Настройки плитки"
              >
                <Settings size={14} />
              </button>
              <button
                className={`${styles.tileModalAction} ${styles.tileModalActionClose}`}
                onClick={minimizeTile}
                aria-label="Свернуть"
              >
                <Minimize2 size={14} />
              </button>
            </div>
          </div>

          <div className={styles.tileModalMonitor}>
            {definition.requiresCompanyAccess && !access.hasCompanyAccess ? (
              <div className={styles.tileModalGate}>
                <CompanyAccessGate
                  compact
                  actionLabel={access.needsApproval ? 'Открыть статус доступа' : 'Подключить компанию'}
                  action={() => navigate('/settings/company-access')}
                  extra={(
                    <div className={styles.tileModalGateHint}>
                      Плитка уже находится в рабочем пространстве, но данные и полноценный SPA
                      станут доступны только после подтверждения доступа к компании.
                    </div>
                  )}
                />
              </div>
            ) : (
              definition.renderSPA(snapshot, tile.version, tile.id)
            )}
          </div>
        </motion.section>
      </div>
    </>
  );

  const settingsPortal = createPortal(
    <AnimatePresence>
      {settingsOpen && (
        <motion.div
          key="settings-popover"
          ref={settingsRef}
          className={styles.tileSettingsPopover}
          style={getPopoverStyle()}
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
        >
          <div className={styles.tileSettingsHeader}>Настройки плитки</div>

          <label className={styles.tileSettingsField}>
            <span>Переименовать</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => renameTile(tile.id, draft)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  renameTile(tile.id, draft);
                  event.currentTarget.blur();
                }
              }}
            />
          </label>

          <div className={styles.tileSettingsField}>
            <span>Размер окна</span>
            <div className={styles.tileSettingsSegmented}>
              {SIZE_OPTIONS.map((option) => (
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

          <button
            className={styles.tileSettingsAction}
            onClick={() => {
              duplicateTile(tile.id);
              closeSettings();
              minimizeTile();
            }}
          >
            <Copy size={13} /> Дублировать плитку
          </button>

          <button
            className={styles.tileSettingsAction}
            onClick={() => reloadTile(tile.id)}
          >
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
    </AnimatePresence>,
    document.body,
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {settingsPortal}
    </>
  );
}
