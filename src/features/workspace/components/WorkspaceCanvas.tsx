import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { useWorkspaceStore, WORLD_FACTOR } from '../model/store';
import { useWorkspaceSnapshot } from '../model/useWorkspaceSnapshot';
import type { WorkspaceTile as WorkspaceTileType } from '../model/types';
import { WorkspaceTile } from './WorkspaceTile';
import { WorkspaceTileModal } from './WorkspaceTileModal';
import styles from './Workspace.module.css';

interface WorkspaceCanvasProps {
  onOpenCreateMenu: () => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function WorkspaceCanvas({ onOpenCreateMenu }: WorkspaceCanvasProps) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewport = useWorkspaceStore((s) => s.viewport);
  const tiles = useWorkspaceStore((s) => s.tiles);
  const activeTileId = useWorkspaceStore((s) => s.activeTileId);
  const setViewport = useWorkspaceStore((s) => s.setViewport);
  const setTilePosition = useWorkspaceStore((s) => s.setTilePosition);
  const initializeViewport = useWorkspaceStore((s) => s.initializeViewport);
  const { data: snapshot } = useWorkspaceSnapshot();

  const activeTile = useMemo(
    () => tiles.find((tile) => tile.id === activeTileId) ?? null,
    [activeTileId, tiles],
  );

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const update = () => initializeViewport(node.clientWidth, node.clientHeight);
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [initializeViewport]);

  const startPan = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-workspace-tile="true"]')) return;
    const node = viewportRef.current;
    if (!node || activeTileId) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { ...viewport };
    const width = node.clientWidth;
    const height = node.clientHeight;

    node.setPointerCapture(event.pointerId);
    node.dataset.mode = 'panning';

    const handleMove = (moveEvent: PointerEvent) => {
      const nextX = clamp(origin.x + (moveEvent.clientX - startX), -(width * (WORLD_FACTOR - 1)), 0);
      const nextY = clamp(origin.y + (moveEvent.clientY - startY), -(height * (WORLD_FACTOR - 1)), 0);
      setViewport(nextX, nextY);
    };

    const handleUp = () => {
      node.dataset.mode = '';
      node.removeEventListener('pointermove', handleMove);
      node.removeEventListener('pointerup', handleUp);
      node.removeEventListener('pointercancel', handleUp);
    };

    node.addEventListener('pointermove', handleMove);
    node.addEventListener('pointerup', handleUp);
    node.addEventListener('pointercancel', handleUp);
  };

  const startTileDrag = (event: ReactPointerEvent<HTMLDivElement>, tile: WorkspaceTileType) => {
    event.stopPropagation();
    const node = viewportRef.current;
    if (!node || activeTileId) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const origin = { x: tile.x, y: tile.y };
    const worldWidth = node.clientWidth * WORLD_FACTOR;
    const worldHeight = node.clientHeight * WORLD_FACTOR;

    const handleMove = (moveEvent: PointerEvent) => {
      const nextX = clamp(origin.x + (moveEvent.clientX - startX), 0, worldWidth - tile.width);
      const nextY = clamp(origin.y + (moveEvent.clientY - startY), 0, worldHeight - tile.height);
      setTilePosition(tile.id, nextX, nextY);
    };

    const handleUp = () => {
      node.removeEventListener('pointermove', handleMove);
      node.removeEventListener('pointerup', handleUp);
      node.removeEventListener('pointercancel', handleUp);
    };

    node.addEventListener('pointermove', handleMove);
    node.addEventListener('pointerup', handleUp);
    node.addEventListener('pointercancel', handleUp);
  };

  return (
    <section className={styles.workspaceShell}>
      <div className={styles.workspaceToolbar}>
        <div className={styles.workspaceEyebrow}>Настраиваемое пространство</div>
        <Button size="lg" icon={<Plus size={16} />} onClick={onOpenCreateMenu}>
          Создать плитку
        </Button>
      </div>

      <div
        ref={viewportRef}
        className={styles.workspaceViewport}
        onPointerDown={startPan}
      >
        <div className={styles.workspaceWorld} style={{ transform: `translate(${viewport.x}px, ${viewport.y}px)` }}>
          <div className={styles.workspaceGrid} />
          {tiles.map((tile) => (
            <WorkspaceTile
              key={tile.id}
              tile={tile}
              snapshot={snapshot}
              onDragStart={startTileDrag}
            />
          ))}
        </div>

        {tiles.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Пустое рабочее поле</div>
            <p className={styles.emptyText}>
              Сначала добавляется плитка, потом уже собирается личная среда. Никаких вбитых навсегда блоков, потому что один шаблон на всех обычно делает всем хуже.
            </p>
            <Button size="lg" icon={<Plus size={16} />} onClick={onOpenCreateMenu}>
              Добавить первую плитку
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeTile ? <WorkspaceTileModal tile={activeTile} snapshot={snapshot} /> : null}
      </AnimatePresence>
    </section>
  );
}
