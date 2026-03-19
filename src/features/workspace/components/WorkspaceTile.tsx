import { memo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Pin } from 'lucide-react';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import { useBadgeStore } from '../../shared-bus/badge.store';
import { getTileViewportBounds, useWorkspaceStore } from '../model/store';
import type { WorkspaceSnapshot, WorkspaceTile as WorkspaceTileType } from '../model/types';
import styles from './Workspace.module.css';

export interface WorkspaceFlightTileLayout {
  left: number;
  top: number;
  scale: number;
  opacity: number;
  blur: number;
  zIndex: number;
  visible: boolean;
}

interface Props {
  tile: WorkspaceTileType;
  snapshot?: WorkspaceSnapshot;
  presentation?: 'surface' | 'flight';
  flightLayout?: WorkspaceFlightTileLayout;
}
const DRAG_THRESHOLD = 5;

export const WorkspaceTile = memo(function WorkspaceTile({
  tile,
  snapshot,
  presentation = 'surface',
  flightLayout,
}: Props) {
  const [dragging, setDragging] = useState(false);
  const monitorRef = useRef<HTMLDivElement>(null);
  const openTile         = useWorkspaceStore((s) => s.openTile);
  const setTilePos       = useWorkspaceStore((s) => s.setTilePosition);
  const bringToFront     = useWorkspaceStore((s) => s.bringToFront);
  const markTileActive   = useWorkspaceStore((s) => s.markTileActive);
  const openContextMenu  = useWorkspaceStore((s) => s.openContextMenu);
  const setHoveredTile   = useWorkspaceStore((s) => s.setHoveredTile);
  const sceneMode        = useWorkspaceStore((s) => s.sceneMode);
  // Derived booleans — only re-render when THIS tile's state changes, not when ANY tile is hovered/active.
  const isHovered        = useWorkspaceStore((s) => s.hoveredTileId === tile.id);
  const isActive         = useWorkspaceStore((s) => s.activeTileId === tile.id);
  const isNew            = useWorkspaceStore((s) => s.recentTileId === tile.id);
  // viewport, viewportSize, zoom — read at drag-start only (no subscription needed).
  const definition       = WORKSPACE_WIDGET_MAP[tile.kind];
  if (!definition) return null;
  const Icon             = definition.icon;
  const isFlightPresentation = presentation === 'flight';
  const badge            = useBadgeStore(s => s.getBadge(tile.kind));
  const showBadge        = badge > 0;
  const isPinned         = tile.pinned ?? false;
  const tileDistanceClass =
    tile.distance3D === 'near'
      ? styles.tileDistanceNear
      : tile.distance3D === 'far'
        ? styles.tileDistanceFar
        : styles.tileDistanceMid;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isFlightPresentation) {
      e.stopPropagation();
      bringToFront(tile.id);
      return;
    }
    if (sceneMode === 'flight') return;
    if (useWorkspaceStore.getState().activeTileId) return;
    if (e.button === 2) return; // let context menu handle right-click
    if ((e.target as HTMLElement).closest('[data-workspace-tile-screen="true"]')) return;
    e.stopPropagation();
    bringToFront(tile.id);

    const el = e.currentTarget;
    const startX = e.clientX, startY = e.clientY;
    const originX = tile.x, originY = tile.y;
    let dragged = false;
    el.setPointerCapture(e.pointerId);
    el.style.cursor = 'grabbing';

    const { viewport, viewportSize, zoom } = useWorkspaceStore.getState();
    const visibleBounds = getTileViewportBounds(viewport, viewportSize, zoom, tile);

    const onMove = (me: PointerEvent) => {
      if (isPinned) return;
      const dx = (me.clientX - startX) / zoom;
      const dy = (me.clientY - startY) / zoom;
      if (!dragged && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        dragged = true;
        setDragging(true);
      }
      if (dragged) setTilePos(
        tile.id,
        Math.max(visibleBounds.minX, Math.min(originX + dx, visibleBounds.maxX)),
        Math.max(visibleBounds.minY, Math.min(originY + dy, visibleBounds.maxY)),
      );
    };
    const onUp = () => {
      setDragging(false);
      el.style.cursor = '';
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  };

  const handleScreenPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (sceneMode === 'flight' && !isFlightPresentation) return;
    e.stopPropagation();
    bringToFront(tile.id);
  };

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (sceneMode === 'flight' && !isFlightPresentation) return;
    e.stopPropagation();
    openTile(tile.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (sceneMode === 'flight' || isFlightPresentation) return;
    e.preventDefault();
    e.stopPropagation();
    markTileActive(tile.id, { status: 'floating' });
    openContextMenu(tile.id, e.clientX, e.clientY);
  };

  const surfaceStyle: CSSProperties = {
    width: tile.width,
    height: tile.height,
    transform: `translate(${tile.x}px, ${tile.y}px)`,
    zIndex: tile.zIndex ?? 10,
  };

  const flightStyle: CSSProperties = {
    width: tile.width,
    height: tile.height,
    left: `${flightLayout?.left ?? -9999}px`,
    top: `${flightLayout?.top ?? -9999}px`,
    zIndex: flightLayout?.zIndex ?? (tile.zIndex ?? 10),
    '--tile-flight-scale': String(flightLayout?.scale ?? 0.84),
    '--tile-flight-opacity': String(flightLayout?.opacity ?? 0.92),
    '--tile-flight-blur': `${flightLayout?.blur ?? 0}px`,
    visibility: (flightLayout?.visible ?? false) ? 'visible' : 'hidden',
    pointerEvents: (flightLayout?.visible ?? false) ? 'auto' : 'none',
  } as CSSProperties;

  return (
    <div
      data-workspace-tile="true"
      data-tile-id={tile.id}
      className={`${styles.tile} ${isFlightPresentation ? styles.tileFlight : styles.tileSurface} ${tileDistanceClass} ${isNew ? styles.tileNew : ''} ${isPinned ? styles.tilePinned : ''} ${isHovered ? styles.tileHovered3d : ''} ${isActive ? styles.tileActive : ''} ${tile.status === 'drifting' ? styles.tileDrifting : ''} ${dragging ? styles.tileDragging : ''}`}
      style={isFlightPresentation ? flightStyle : surfaceStyle}
      onPointerDown={handlePointerDown}
      onContextMenu={handleContextMenu}
      onPointerEnter={() => {
        if (sceneMode === 'flight' && !isFlightPresentation) return;
        setHoveredTile(tile.id);
        if (!isFlightPresentation && tile.status !== 'floating') {
          markTileActive(tile.id, { status: 'floating' });
        }
      }}
      onPointerLeave={() => {
        if (sceneMode === 'flight' && !isFlightPresentation) return;
        if (useWorkspaceStore.getState().hoveredTileId === tile.id) {
          setHoveredTile(null);
        }
      }}
    >
      <div className={styles.tileHeader}>
        <div className={styles.tileIdentity}>
          <span className={styles.tileIconWrap}>
            <span className={styles.tileIcon}><Icon size={14} /></span>
            {showBadge && (
              <span className={styles.tileBadge}>
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
          <div className={styles.tileTitle}>{tile.title}</div>
        </div>
        {isPinned && (
          <span className={styles.tilePinIndicator} title="Плитка закреплена">
            <Pin size={9} />
          </span>
        )}
      </div>
      <div
        ref={monitorRef}
        className={styles.tileMonitor}
        data-workspace-tile-screen="true"
        onPointerDown={handleScreenPointerDown}
        onClick={handleScreenClick}
      >
        <div className={styles.tileMonitorViewport}>
          {definition.renderPreview(snapshot, tile.version, tile.id)}
        </div>
      </div>
    </div>
  );
});
