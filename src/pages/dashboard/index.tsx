import { useState, useRef, useCallback, useEffect } from 'react';
import { Plus, Layers, LayoutGrid, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkspaceCanvas } from '../../features/workspace/components/WorkspaceCanvas';
import { WorkspaceAddMenu } from '../../features/workspace/components/WorkspaceAddMenu';
import { WorkspaceThemeModal } from '../../features/workspace/components/WorkspaceThemeModal';
import { WorkspaceSpotlight } from '../../features/workspace/components/WorkspaceSpotlight';
import { useWorkspaceStore } from '../../features/workspace/model/store';
import { WorkspaceLock } from '../../features/auth/WorkspaceLock';
import { useAuthStore } from '../../shared/stores/auth';
import styles from './Dashboard.module.css';

const FAB_STORAGE_KEY = 'kort-fab-position';

function getInitialFabPos(): { x: number; y: number } | null {
  try {
    const raw = localStorage.getItem(FAB_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export default function DashboardPage() {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [themeOpen,    setThemeOpen]    = useState(false);
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const addTile          = useWorkspaceStore((s) => s.addTile);
  const alignTilesToGrid = useWorkspaceStore((s) => s.alignTilesToGrid);
  const isUnlocked       = useAuthStore((s) => s.isUnlocked);

  // Draggable FAB
  const [fabPos, setFabPos] = useState<{ x: number; y: number } | null>(getInitialFabPos);
  const fabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (fabPos) localStorage.setItem(FAB_STORAGE_KEY, JSON.stringify(fabPos));
  }, [fabPos]);

  // Cmd/Ctrl+K → spotlight
  useEffect(() => {
    if (!isUnlocked) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlightOpen((v) => !v);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isUnlocked]);

  const startFabDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    e.stopPropagation();

    const el = fabRef.current!;
    const rect = el.getBoundingClientRect();
    const startX  = e.clientX;
    const startY  = e.clientY;
    const originX = rect.left;
    const originY = rect.top;

    el.setPointerCapture(e.pointerId);

    const onMove = (me: PointerEvent) => {
      const newX = Math.max(8, Math.min(originX + (me.clientX - startX), window.innerWidth  - rect.width  - 8));
      const newY = Math.max(8, Math.min(originY + (me.clientY - startY), window.innerHeight - rect.height - 8));
      setFabPos({ x: newX, y: newY });
    };
    const onUp = () => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    el.addEventListener('pointermove',   onMove);
    el.addEventListener('pointerup',     onUp);
    el.addEventListener('pointercancel', onUp);
  }, []);

  const fabStyle = fabPos
    ? { position: 'fixed' as const, left: fabPos.x, top: fabPos.y, right: 'unset', bottom: 'unset' }
    : undefined;

  return (
    <div className={styles.dashRoot}>
      <WorkspaceCanvas />

      {/* Lock overlay — shown until user authenticates */}
      {!isUnlocked && <WorkspaceLock onUnlocked={() => {}} />}

      {/* Floating control panel — draggable, only visible when unlocked */}
      {isUnlocked && <div
        ref={fabRef}
        className={styles.fabGroup}
        style={fabStyle}
        onPointerDown={startFabDrag}
        title="Потяните для перемещения"
      >
        <div className={styles.fabDragHandle} />

        <div className={styles.fabRow}>
          {/* Theme */}
          <motion.button
            className={styles.fabIcon}
            onClick={() => setThemeOpen(true)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            title="Тема рабочего окружения"
          >
            <Layers size={16} />
          </motion.button>

          {/* Spotlight search */}
          <motion.button
            className={styles.fabIcon}
            onClick={() => setSpotlightOpen(true)}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.93 }}
            title="Поиск и команды (Ctrl+K)"
          >
            <Search size={15} />
          </motion.button>

          <div className={styles.fabStack}>
            <motion.button
              className={styles.fab}
              onClick={alignTilesToGrid}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Выровнять"
            >
              <span style={{ display: 'flex' }}>
                <LayoutGrid size={17} strokeWidth={2.5} />
              </span>
              <span className={styles.fabLabel}>Выровнять</span>
            </motion.button>

            <motion.button
              className={`${styles.fab} ${menuOpen ? styles.fabActive : ''}`}
              onClick={() => setMenuOpen((v) => !v)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Создать плитку"
            >
              <motion.span
                animate={{ rotate: menuOpen ? 45 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                style={{ display: 'flex' }}
              >
                <Plus size={17} strokeWidth={2.5} />
              </motion.span>
              <span className={styles.fabLabel}>Создать плитку</span>
            </motion.button>
          </div>
        </div>
      </div>}

      {/* Modals & overlays, only shown when unlocked */}
      {isUnlocked && (
        <>
          <WorkspaceAddMenu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onSelect={(kind) => { addTile(kind); setMenuOpen(false); }}
          />
          <WorkspaceThemeModal
            open={themeOpen}
            onClose={() => setThemeOpen(false)}
          />
          <WorkspaceSpotlight
            open={spotlightOpen}
            onClose={() => setSpotlightOpen(false)}
            onOpenTheme={() => setThemeOpen(true)}
          />
        </>
      )}
    </div>
  );
}
