/**
 * WorkspaceSpotlight — Cmd/Ctrl+K quick launcher.
 * Killer feature: keyboard-driven tile creation & navigation
 * from anywhere on the workspace.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Search, Plus, LayoutGrid, ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import { useWorkspaceStore } from '../model/store';
import { WORKSPACE_WIDGETS } from '../registry';
import styles from './Workspace.module.css';

interface SpotlightAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  tags?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenTheme: () => void;
}

export function WorkspaceSpotlight({ open, onClose, onOpenTheme }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const store = useWorkspaceStore();

  const allActions: SpotlightAction[] = [
    // Widget creation
    ...WORKSPACE_WIDGETS.map(w => ({
      id: `create-${w.kind}`,
      label: `Создать плитку: ${w.title}`,
      description: w.description,
      icon: w.icon,
      action: () => { store.addTile(w.kind); onClose(); },
      tags: ['создать', 'плитка', w.title.toLowerCase(), w.kind],
    })),
    // Workspace actions
    {
      id: 'align',
      label: 'Выровнять плитки по сетке',
      icon: LayoutGrid,
      action: () => { store.alignTilesToGrid(); onClose(); },
      tags: ['выровнять', 'сетка', 'grid'],
    },
    {
      id: 'zoom-reset',
      label: 'Сбросить масштаб (100%)',
      icon: RotateCcw,
      action: () => { store.resetZoom(); onClose(); },
      tags: ['масштаб', 'zoom', 'сброс'],
    },
    {
      id: 'zoom-in',
      label: 'Приблизить',
      icon: ZoomIn,
      action: () => { store.zoomIn(); onClose(); },
      tags: ['увеличить', 'zoom in'],
    },
    {
      id: 'zoom-out',
      label: 'Отдалить',
      icon: ZoomOut,
      action: () => { store.zoomOut(); onClose(); },
      tags: ['уменьшить', 'zoom out'],
    },
    {
      id: 'theme',
      label: 'Сменить тему рабочего поля',
      icon: Layers,
      action: () => { onOpenTheme(); onClose(); },
      tags: ['тема', 'фон', 'theme', 'background'],
    },
    // Open existing tiles
    ...store.tiles.map(t => ({
      id: `open-${t.id}`,
      label: `Открыть: ${t.title}`,
      description: `Плитка на рабочем поле`,
      icon: WORKSPACE_WIDGETS.find(w => w.kind === t.kind)?.icon ?? Search,
      action: () => { store.openTile(t.id); onClose(); },
      tags: ['открыть', t.title.toLowerCase(), t.kind],
    })),
  ];

  const filtered = query.trim()
    ? allActions.filter(a => {
        const q = query.toLowerCase();
        return a.label.toLowerCase().includes(q) ||
               a.description?.toLowerCase().includes(q) ||
               a.tags?.some(t => t.includes(q));
      })
    : allActions.slice(0, 10);

  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => { setSelectedIdx(0); }, [query]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      filtered[selectedIdx]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [filtered, selectedIdx, onClose]);

  const content = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className={styles.spotlightOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            className={styles.spotlightPanel}
            initial={{ opacity: 0, scale: 0.95, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: 'spring', stiffness: 460, damping: 34, mass: 0.7 }}
          >
            <div className={styles.spotlightInputWrap}>
              <Search size={16} className={styles.spotlightSearchIcon} />
              <input
                ref={inputRef}
                className={styles.spotlightInput}
                placeholder="Поиск действий, плиток, команд..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
              />
              <kbd className={styles.spotlightEsc}>ESC</kbd>
            </div>

            {filtered.length > 0 ? (
              <div className={styles.spotlightList}>
                {filtered.map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      className={`${styles.spotlightItem} ${idx === selectedIdx ? styles.spotlightItemActive : ''}`}
                      onClick={action.action}
                      onMouseEnter={() => setSelectedIdx(idx)}
                    >
                      <span className={styles.spotlightItemIcon}><Icon size={15} /></span>
                      <span className={styles.spotlightItemBody}>
                        <span className={styles.spotlightItemLabel}>{action.label}</span>
                        {action.description && (
                          <span className={styles.spotlightItemDesc}>{action.description}</span>
                        )}
                      </span>
                      {idx === selectedIdx && (
                        <kbd className={styles.spotlightEnterHint}>↵</kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.spotlightEmpty}>
                Ничего не найдено по запросу «{query}»
              </div>
            )}

            <div className={styles.spotlightFooter}>
              <span><kbd>↑↓</kbd> навигация</span>
              <span><kbd>↵</kbd> выбрать</span>
              <span><kbd>Esc</kbd> закрыть</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
