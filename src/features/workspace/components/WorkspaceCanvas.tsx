import type { PointerEvent as ReactPointerEvent, WheelEvent } from 'react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWorkspaceStore, WORLD_FACTOR, ZOOM_MIN, ZOOM_MAX } from '../model/store';
import { useWorkspaceSnapshot } from '../model/useWorkspaceSnapshot';
import type { WorkspaceTile as WorkspaceTileType } from '../model/types';
import type { WorkspaceSceneFlightTileProjection } from '../scene/sceneRuntime';
import { WorkspaceTile, type WorkspaceFlightTileLayout } from './WorkspaceTile';
import { WorkspaceTileModal } from './WorkspaceTileModal';
import { WorkspaceBgEffect } from './WorkspaceBgEffect';
import { WorkspaceTileContextMenu } from './WorkspaceTileContextMenu';
import { WorkspaceMinimap } from './WorkspaceMinimap';
import { WorkspaceZoomHud } from './WorkspaceZoomHud';
import styles from './Workspace.module.css';

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

function isTextInputTarget(target: EventTarget | null) {
  return target instanceof HTMLElement
    && (
      target.tagName === 'INPUT'
      || target.tagName === 'TEXTAREA'
      || target.isContentEditable
      || Boolean(target.closest('[contenteditable="true"]'))
    );
}

export function WorkspaceCanvas() {
  const viewportRef        = useRef<HTMLDivElement>(null);
  const viewport           = useWorkspaceStore((s) => s.viewport);
  const tiles              = useWorkspaceStore((s) => s.tiles);
  const activeTileId       = useWorkspaceStore((s) => s.activeTileId);
  const sceneMode          = useWorkspaceStore((s) => s.sceneMode);
  const zoom               = useWorkspaceStore((s) => s.zoom);
  const contextMenu        = useWorkspaceStore((s) => s.contextMenu);
  const setViewport        = useWorkspaceStore((s) => s.setViewport);
  const initializeViewport = useWorkspaceStore((s) => s.initializeViewport);
  const setZoom            = useWorkspaceStore((s) => s.setZoom);
  const closeContextMenu   = useWorkspaceStore((s) => s.closeContextMenu);
  const setHoveredTile     = useWorkspaceStore((s) => s.setHoveredTile);
  const { data: snapshot } = useWorkspaceSnapshot();
  const [flightTileLayouts, setFlightTileLayouts] = useState<Record<string, WorkspaceFlightTileLayout>>({});

  const activeTile = tiles.find((t) => t.id === activeTileId) ?? null;

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
    if (sceneMode === 'flight') return;
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom(clamp(+(zoom + delta).toFixed(2), ZOOM_MIN, ZOOM_MAX));
  }, [sceneMode, zoom, setZoom]);

  // Keyboard shortcuts on workspace viewport
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeTileId) return; // don't capture when SPA is open
      if (isTextInputTarget(e.target)) return;

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const store = useWorkspaceStore.getState();
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          store.setSceneThemeAuto(!store.sceneThemeAuto);
          return;
        }

        const themeByKey: Record<string, 'default' | 'morning' | 'overcast' | 'dusk' | 'night'> = {
          '1': 'default',
          '2': 'morning',
          '3': 'overcast',
          '4': 'dusk',
          '5': 'night',
        };
        const nextTheme = themeByKey[e.key];
        if (nextTheme) {
          e.preventDefault();
          store.setSceneTheme(nextTheme);
          return;
        }
      }

      if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const store = useWorkspaceStore.getState();
        store.setSceneMode(store.sceneMode === 'flight' ? 'surface' : 'flight');
        return;
      }

      if (sceneMode === 'flight') return;
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
  }, [activeTileId, closeContextMenu, sceneMode]);

  useEffect(() => {
    closeContextMenu();
    setHoveredTile(null);
    if (sceneMode !== 'flight') {
      setFlightTileLayouts({});
    }
  }, [sceneMode, closeContextMenu, setHoveredTile]);

  const flightFrameCounter = useRef(0);
  const handleFlightTileProjection = useCallback((projectedTiles: WorkspaceSceneFlightTileProjection[]) => {
    // Throttle React state updates: only update every 3rd frame to avoid excessive re-renders
    flightFrameCounter.current += 1;
    if (flightFrameCounter.current % 3 !== 0) return;

    setFlightTileLayouts(() => Object.fromEntries(
      projectedTiles.map((tile) => [
        tile.id,
        {
          left: tile.left,
          top: tile.top,
          scale: tile.scale,
          opacity: tile.opacity,
          blur: tile.blur,
          zIndex: tile.zIndex,
          visible: tile.visible,
        },
      ]),
    ));
  }, []);

  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-scene-control="true"]')) return;
    if (target.closest('[data-workspace-ui="true"]')) return;
    if (target.closest('[data-workspace-tile="true"]')) return;
    if (activeTileId) return;
    if (sceneMode === 'flight') return;
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
      className={`${styles.workspaceViewport} ${styles.workspaceViewportEffect} ${sceneMode === 'flight' ? styles.workspaceViewportFlight : ''}`}
      onPointerDown={startPan}
      onWheel={handleWheel}
    >
      <WorkspaceBgEffect onFlightTileProjection={handleFlightTileProjection} />

      {/* Scrollable world canvas with zoom */}
      {sceneMode !== 'flight' && (
        <div
          className={styles.workspaceWorld}
          style={{
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {tiles.map((tile: WorkspaceTileType) => (
            <WorkspaceTile key={tile.id} tile={tile} snapshot={snapshot} />
          ))}
        </div>
      )}

      {sceneMode === 'flight' && (
        <div className={styles.flightTileField}>
          {tiles.map((tile: WorkspaceTileType) => (
            <WorkspaceTile
              key={tile.id}
              tile={tile}
              snapshot={snapshot}
              presentation="flight"
              flightLayout={flightTileLayouts[tile.id]}
            />
          ))}
        </div>
      )}

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
