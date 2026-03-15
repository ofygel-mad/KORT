import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Expand, Copy, Pin, PinOff, RotateCcw, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '../model/store';
import styles from './Workspace.module.css';

interface Props { tileId: string; x: number; y: number; }

export function WorkspaceTileContextMenu({ tileId, x, y }: Props) {
  const menuRef        = useRef<HTMLDivElement>(null);
  const tile           = useWorkspaceStore((s) => s.tiles.find(t => t.id === tileId));
  const openTile       = useWorkspaceStore((s) => s.openTile);
  const duplicateTile  = useWorkspaceStore((s) => s.duplicateTile);
  const pinTile        = useWorkspaceStore((s) => s.pinTile);
  const reloadTile     = useWorkspaceStore((s) => s.reloadTile);
  const removeTile     = useWorkspaceStore((s) => s.removeTile);
  const closeContextMenu = useWorkspaceStore((s) => s.closeContextMenu);

  // Close on outside click or Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) closeContextMenu();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeContextMenu(); };
    const t = setTimeout(() => {
      document.addEventListener('mousedown', onDown);
      document.addEventListener('keydown',   onKey);
    }, 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown',   onKey);
    };
  }, [closeContextMenu]);

  // Clamp menu to viewport
  const menuW = 220, menuH = 220;
  const clampedX = Math.min(x, window.innerWidth  - menuW - 12);
  const clampedY = Math.min(y, window.innerHeight - menuH - 12);

  if (!tile) return null;

  const item = (Icon: React.ElementType, label: string, onClick: () => void, danger = false) => (
    <button
      className={`${styles.ctxItem} ${danger ? styles.ctxItemDanger : ''}`}
      onClick={() => { onClick(); closeContextMenu(); }}
    >
      <Icon size={13} />
      <span>{label}</span>
    </button>
  );

  return createPortal(
    <motion.div
      ref={menuRef}
      className={styles.ctxMenu}
      style={{ position: 'fixed', left: clampedX, top: clampedY, zIndex: 600 }}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1,    y: 0 }}
      exit={{ opacity: 0, scale: 0.9,     y: -4 }}
      transition={{ type: 'spring', stiffness: 480, damping: 32, mass: 0.6 }}
    >
      <div className={styles.ctxLabel}>{tile.title}</div>
      <div className={styles.ctxDivider} />
      {item(Expand,   'Открыть',          () => openTile(tileId))}
      {item(Copy,     'Дублировать',      () => duplicateTile(tileId))}
      {item(tile.pinned ? PinOff : Pin,
            tile.pinned ? 'Открепить' : 'Закрепить',
            () => pinTile(tileId))}
      {item(RotateCcw, 'Перезагрузить',   () => reloadTile(tileId))}
      <div className={styles.ctxDivider} />
      {item(Trash2,   'Удалить плитку',   () => removeTile(tileId), true)}
    </motion.div>,
    document.body,
  );
}
