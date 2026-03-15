import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react';
import { useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWorkspaceStore, WORLD_FACTOR, ZOOM_MIN, ZOOM_MAX } from '../model/store';
import { useWorkspaceSnapshot } from '../model/useWorkspaceSnapshot';
import { useWorkspaceTheme } from '../model/workspaceTheme';
import type { WorkspaceTile as WorkspaceTileType } from '../model/types';
import { WorkspaceTile } from './WorkspaceTile';
import { WorkspaceTileModal } from './WorkspaceTileModal';
import { WorkspaceBgLayer } from './WorkspaceBgLayer';
import { WorkspaceTileContextMenu } from './WorkspaceTileContextMenu';
import { WorkspaceMinimap } from './WorkspaceMinimap';
import { WorkspaceZoomHud } from './WorkspaceZoomHud';
import styles from './Workspace.module.css';

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

export function WorkspaceCanvas() {
  const viewportRef        = useRef<HTMLDivElement>(null);
  const viewport           = useWorkspaceStore((s) => s.viewport);
  const tiles              = useWorkspaceStore((s) => s.tiles);
  const activeTileId       = useWorkspaceStore((s) => s.activeTileId);
  const zoom               = useWorkspaceStore((s) => s.zoom);
  const contextMenu        = useWorkspaceStore((s) => s.contextMenu);
  const setViewport        = useWorkspaceStore((s) => s.setViewport);
  const initializeViewport = useWorkspaceStore((s) => s.initializeViewport);
  const setZoom            = useWorkspaceStore((s) => s.setZoom);
  const closeContextMenu   = useWorkspaceStore((s) => s.closeContextMenu);
  const { data: snapshot } = useWorkspaceSnapshot();
  const { activeBg }       = useWorkspaceTheme();

  const activeTile = tiles.find((t) => t.id === activeTileId) ?? null;
  const hasVideo   = activeBg !== 'grid';

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const update = () => initializeViewport(node.clientWidth, node.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => ro.disconnect();
  }, [initializeViewport]);

  // Ctrl + Wheel zoom — pinch-to-zoom feeling
  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom(clamp(+(zoom + delta).toFixed(2), ZOOM_MIN, ZOOM_MAX));
  }, [zoom, setZoom]);

  // Keyboard shortcuts on workspace viewport
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeTileId) return; // don't capture when SPA is open
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        useWorkspaceStore.getState().resetZoom();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        useWorkspaceStore.getState().zoomIn();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        useWorkspaceStore.getState().zoomOut();
      }
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTileId, closeContextMenu]);

  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-workspace-tile="true"]')) return;
    if (activeTileId) return;
    closeContextMenu();

    const node    = viewportRef.current!;
    const startX  = e.clientX;
    const startY  = e.clientY;
    const originX = viewport.x;
    const originY = viewport.y;
    const vpW     = node.clientWidth;
    const vpH     = node.clientHeight;

    node.setPointerCapture(e.pointerId);
    node.style.cursor = 'grabbing';

    const onMove = (me: PointerEvent) => {
      setViewport(
        clamp(originX + (me.clientX - startX), -(vpW * (WORLD_FACTOR - 1)), 0),
        clamp(originY + (me.clientY - startY), -(vpH * (WORLD_FACTOR - 1)), 0),
      );
    };
    const onUp = () => {
      node.style.cursor = '';
      node.releasePointerCapture(e.pointerId);
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup',   onUp);
      node.removeEventListener('pointercancel', onUp);
    };
    node.addEventListener('pointermove',   onMove);
    node.addEventListener('pointerup',     onUp);
    node.addEventListener('pointercancel', onUp);
  };

  return (
    <div
      ref={viewportRef}
      data-workspace-viewport="true"
      className={`${styles.workspaceViewport} ${hasVideo ? styles.workspaceViewportVideo : ''}`}
      onPointerDown={startPan}
      onWheel={handleWheel}
    >
      <WorkspaceBgLayer />

      {/* Scrollable world canvas with zoom */}
      <div
        className={styles.workspaceWorld}
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {!hasVideo && <div className={styles.workspaceGrid} />}

        {tiles.map((tile: WorkspaceTileType) => (
          <WorkspaceTile key={tile.id} tile={tile} snapshot={snapshot} />
        ))}
      </div>

      {/* Context menu for right-click on tiles */}
      <AnimatePresence>
        {contextMenu && (
          <WorkspaceTileContextMenu
            tileId={contextMenu.tileId}
            x={contextMenu.x}
            y={contextMenu.y}
          />
        )}
      </AnimatePresence>

      {/* Tile modal via portal to body */}
      <AnimatePresence>
        {activeTile && (
          <WorkspaceTileModal key={activeTile.id} tile={activeTile} snapshot={snapshot} />
        )}
      </AnimatePresence>

      {/* HUD overlays */}
      <WorkspaceZoomHud />
      <WorkspaceMinimap />
    </div>
  );
}
