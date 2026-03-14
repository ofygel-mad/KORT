import { useState } from 'react';
import { Plus, Layers, LayoutGrid } from 'lucide-react';
import { motion } from 'framer-motion';
import { WorkspaceCanvas } from '../../features/workspace/components/WorkspaceCanvas';
import { WorkspaceAddMenu } from '../../features/workspace/components/WorkspaceAddMenu';
import { WorkspaceThemeModal } from '../../features/workspace/components/WorkspaceThemeModal';
import { useWorkspaceStore } from '../../features/workspace/model/store';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const addTile = useWorkspaceStore((s) => s.addTile);
  const alignTilesToGrid = useWorkspaceStore((s) => s.alignTilesToGrid);

  return (
    <div className={styles.dashRoot}>
      <WorkspaceCanvas />

      {/* Floating controls — top-right, z above workspace */}
      <div className={styles.fabGroup}>
        {/* Theme button */}
        <motion.button
          className={styles.fabIcon}
          onClick={() => setThemeOpen(true)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.93 }}
          title="Тема рабочего окружения"
        >
          <Layers size={16} />
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

          {/* Create tile FAB */}
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

      <WorkspaceAddMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(kind) => { addTile(kind); setMenuOpen(false); }}
      />

      <WorkspaceThemeModal
        open={themeOpen}
        onClose={() => setThemeOpen(false)}
      />
    </div>
  );
}
