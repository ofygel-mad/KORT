import { useRef } from 'react';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore, WORLD_FACTOR } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile as WorkspaceTileType } from '../model/types';
import styles from './Workspace.module.css';

interface Props { tile: WorkspaceTileType; snapshot?: WorkspaceSnapshot; }
const DRAG_THRESHOLD = 5;

export function WorkspaceTile({ tile, snapshot }: Props) {
  const openTile     = useWorkspaceStore((s) => s.openTile);
  const setTilePos   = useWorkspaceStore((s) => s.setTilePosition);
  const activeTileId = useWorkspaceStore((s) => s.activeTileId);
  const recentTileId = useWorkspaceStore((s) => s.recentTileId);
  const viewportSize = useWorkspaceStore((s) => s.viewportSize);
  const definition   = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon         = definition.icon;
  const isNew        = recentTileId === tile.id;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTileId) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const startX = e.clientX, startY = e.clientY;
    const originX = tile.x, originY = tile.y;
    let dragged = false;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
    const worldW = viewportSize.width * WORLD_FACTOR;
    const worldH = viewportSize.height * WORLD_FACTOR;
    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startX, dy = me.clientY - startY;
      if (!dragged && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) dragged = true;
      if (dragged) setTilePos(tile.id, Math.max(0, Math.min(originX+dx, worldW-tile.width)), Math.max(0, Math.min(originY+dy, worldH-tile.height)));
    };
    const onUp = () => {
      el.style.cursor = '';
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      if (!dragged) openTile(tile.id);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      data-workspace-tile="true"
      data-tile-id={tile.id}
      className={`${styles.tile} ${isNew ? styles.tileNew : ''}`}
      style={{ width: tile.width, height: tile.height, transform: `translate(${tile.x}px, ${tile.y}px)` }}
      onPointerDown={handlePointerDown}
    >
      <div className={styles.tileHeader}>
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
          {definition.renderPreview(snapshot, tile.version)}
        </div>
      </div>
    </div>
  );
}
