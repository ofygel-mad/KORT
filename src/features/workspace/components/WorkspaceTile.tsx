import { useRef } from 'react';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useWorkspaceStore, WORLD_FACTOR } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile as WorkspaceTileType } from '../model/types';
import styles from './Workspace.module.css';

interface WorkspaceTileProps {
  tile: WorkspaceTileType;
  snapshot?: WorkspaceSnapshot;
}

const DRAG_THRESHOLD = 5;

export function WorkspaceTile({ tile, snapshot }: WorkspaceTileProps) {
  const openTile      = useWorkspaceStore((s) => s.openTile);
  const setTilePos    = useWorkspaceStore((s) => s.setTilePosition);
  const activeTileId  = useWorkspaceStore((s) => s.activeTileId);
  const recentTileId  = useWorkspaceStore((s) => s.recentTileId);
  const viewportSize  = useWorkspaceStore((s) => s.viewportSize);
  const definition    = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon          = definition.icon;
  const isDragging    = useRef(false);
  const isNew         = recentTileId === tile.id;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTileId) return;
    e.stopPropagation();

    const el        = e.currentTarget;
    const startX    = e.clientX;
    const startY    = e.clientY;
    const originX   = tile.x;
    const originY   = tile.y;
    let dragged     = false;

    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';
    isDragging.current = false;

    const worldW = viewportSize.width  * WORLD_FACTOR;
    const worldH = viewportSize.height * WORLD_FACTOR;

    // After setPointerCapture, pointermove fires on the ELEMENT, not document
    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (!dragged && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        dragged = true;
        isDragging.current = true;
      }
      if (dragged) {
        const nx = Math.max(0, Math.min(originX + dx, worldW - tile.width));
        const ny = Math.max(0, Math.min(originY + dy, worldH - tile.height));
        setTilePos(tile.id, nx, ny);
      }
    };

    const onUp = () => {
      el.style.cursor = '';
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup',   onUp);
      el.removeEventListener('pointercancel', onUp);
      isDragging.current = false;

      if (!dragged) {
        openTile(tile.id);
      }
    };

    // Bind to the element (works with pointer capture)
    el.addEventListener('pointermove',   onMove);
    el.addEventListener('pointerup',     onUp);
    el.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      data-workspace-tile="true"
      data-tile-id={tile.id}
      className={`${styles.tile} ${isNew ? styles.tileNew : ''}`}
      style={{
        width:     tile.width,
        height:    tile.height,
        transform: `translate(${tile.x}px, ${tile.y}px)`,
      }}
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
          {definition.render(snapshot, tile.version)}
        </div>
      </div>
    </div>
  );
}
