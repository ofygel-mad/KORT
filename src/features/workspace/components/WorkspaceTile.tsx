import type { PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile as WorkspaceTileType } from '../model/types';
import styles from './Workspace.module.css';

interface WorkspaceTileProps {
  tile: WorkspaceTileType;
  snapshot?: WorkspaceSnapshot;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>, tile: WorkspaceTileType) => void;
}

export function WorkspaceTile({ tile, snapshot, onDragStart }: WorkspaceTileProps) {
  const openTile = useWorkspaceStore((s) => s.openTile);
  const definition = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon = definition.icon;

  return (
    <motion.article
      layoutId={`workspace-tile-${tile.id}`}
      data-workspace-tile="true"
      className={styles.tile}
      style={{ width: tile.width, height: tile.height, transform: `translate(${tile.x}px, ${tile.y}px)` }}
      onClick={() => openTile(tile.id)}
      transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.9 }}
    >
      <div className={styles.tileHeader} onPointerDown={(event) => onDragStart(event, tile)}>
        <div className={styles.tileIdentity}>
          <span className={styles.tileIcon}><Icon size={14} /></span>
          <div>
            <div className={styles.tileTitle}>{tile.title}</div>
            <div className={styles.tileSubtitle}>Живое превью</div>
          </div>
        </div>
      </div>

      <div className={styles.tileMonitor}>
        <div className={styles.tileMonitorViewport}>
          {definition.render(snapshot, tile.version)}
        </div>
      </div>
    </motion.article>
  );
}
