import type { PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Grip, X } from 'lucide-react';
import { WORKSPACE_WIDGET_MAP } from '../registry';
import type { WorkspaceSnapshot, WorkspaceTile as WorkspaceTileType } from '../model/types';
import styles from './Workspace.module.css';

interface WorkspaceTileProps {
  tile: WorkspaceTileType;
  snapshot?: WorkspaceSnapshot;
  onRemove: (id: string) => void;
  onDragStart: (event: ReactPointerEvent<HTMLDivElement>, tile: WorkspaceTileType) => void;
}

export function WorkspaceTile({ tile, snapshot, onRemove, onDragStart }: WorkspaceTileProps) {
  const navigate = useNavigate();
  const definition = WORKSPACE_WIDGET_MAP[tile.kind];
  const Icon = definition.icon;

  return (
    <article
      data-workspace-tile="true"
      className={styles.tile}
      style={{ width: tile.width, height: tile.height, transform: `translate(${tile.x}px, ${tile.y}px)` }}
    >
      <div className={styles.tileHeader} onPointerDown={(event) => onDragStart(event, tile)}>
        <div className={styles.tileIdentity}>
          <span className={styles.tileIcon}><Icon size={16} /></span>
          <div>
            <div className={styles.tileTitle}>{tile.title}</div>
            <div className={styles.tileSubtitle}>Плитка рабочего поля</div>
          </div>
        </div>

        <div className={styles.tileActions} onPointerDown={(event) => event.stopPropagation()}>
          <button className={styles.tileAction} aria-label="Перетащить плитку">
            <Grip size={15} />
          </button>
          <button className={styles.tileAction} onClick={() => navigate(definition.route)} aria-label={`Открыть раздел ${definition.title}`}>
            <ExternalLink size={15} />
          </button>
          <button className={styles.tileAction} onClick={() => onRemove(tile.id)} aria-label="Удалить плитку">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className={styles.tileMonitor}>
        {definition.render(snapshot)}
      </div>
    </article>
  );
}
