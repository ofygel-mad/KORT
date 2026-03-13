import type { PointerEvent as ReactPointerEvent } from 'react';
import { useEffect, useRef } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { useWorkspaceStore, WORLD_FACTOR } from '../model/store';
import { useWorkspaceSnapshot } from '../model/useWorkspaceSnapshot';
import type { WorkspaceTile as WorkspaceTileType } from '../model/types';
import { WorkspaceTile } from './WorkspaceTile';
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
  const setViewport = useWorkspaceStore((s) => s.setViewport);
  const setTilePosition = useWorkspaceStore((s) => s.setTilePosition);
  const removeTile = useWorkspaceStore((s) => s.removeTile);
  const initializeViewport = useWorkspaceStore((s) => s.initializeViewport);
  const { data: snapshot } = useWorkspaceSnapshot();

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
    if (!node) return;

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
    if (!node) return;

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
        <div>
          <div className={styles.workspaceEyebrow}>Настраиваемое пространство</div>
          <h1 className={styles.workspaceTitle}>Главный рабочий экран</h1>
          <p className={styles.workspaceDescription}>
            Пользователь сам собирает себе рабочую среду. Плитки можно дублировать, двигать и раскладывать как угодно. Да, людям снова дали свободу.
          </p>
        </div>

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
              onRemove={removeTile}
              onDragStart={startTileDrag}
            />
          ))}
        </div>

        {tiles.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>Пустое поле без жёсткого сценария</div>
            <p className={styles.emptyText}>
              Никаких вбитых навсегда карточек справа и статистики слева. Сначала пользователь решает, что ему здесь вообще нужно.
            </p>
            <Button size="lg" icon={<Plus size={16} />} onClick={onOpenCreateMenu}>
              Добавить первую плитку
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
