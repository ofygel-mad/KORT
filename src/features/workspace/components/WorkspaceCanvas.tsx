import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWorkspaceStore, WORLD_FACTOR } from '../model/store';
import { useWorkspaceSnapshot } from '../model/useWorkspaceSnapshot';
import { useWorkspaceTheme } from '../model/workspaceTheme';
import type { WorkspaceTile as WorkspaceTileType } from '../model/types';
import { WorkspaceTile } from './WorkspaceTile';
import { WorkspaceTileModal } from './WorkspaceTileModal';
import { WorkspaceBgLayer } from './WorkspaceBgLayer';
import styles from './Workspace.module.css';

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

export function WorkspaceCanvas() {
  const viewportRef        = useRef<HTMLDivElement>(null);
  const viewport           = useWorkspaceStore((s) => s.viewport);
  const tiles              = useWorkspaceStore((s) => s.tiles);
  const activeTileId       = useWorkspaceStore((s) => s.activeTileId);
  const setViewport        = useWorkspaceStore((s) => s.setViewport);
  const initializeViewport = useWorkspaceStore((s) => s.initializeViewport);
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

  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-workspace-tile="true"]')) return;
    if (activeTileId) return;

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
    >
      {/* Video/static bg — behind everything, no pointer events */}
      <WorkspaceBgLayer />

      {/* Scrollable world canvas */}
      <div
        className={styles.workspaceWorld}
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px)` }}
      >
        {/* Show grid only when no video bg */}
        {!hasVideo && <div className={styles.workspaceGrid} />}

        {tiles.map((tile: WorkspaceTileType) => (
          <WorkspaceTile key={tile.id} tile={tile} snapshot={snapshot} />
        ))}
      </div>

      {/* Tile modal via portal to body */}
      <AnimatePresence>
        {activeTile && (
          <WorkspaceTileModal key={activeTile.id} tile={activeTile} snapshot={snapshot} />
        )}
      </AnimatePresence>
    </div>
  );
}
