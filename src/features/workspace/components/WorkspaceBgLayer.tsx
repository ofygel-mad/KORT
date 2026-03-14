import { useRef, useEffect } from 'react';
import { useWorkspaceTheme, WORKSPACE_BG_OPTIONS } from '../model/workspaceTheme';
import styles from './Workspace.module.css';

/**
 * Full-viewport video background layer.
 * pointer-events: none — tiles stay fully interactive on top.
 */
export function WorkspaceBgLayer() {
  const { activeBg } = useWorkspaceTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const def = WORKSPACE_BG_OPTIONS.find((o) => o.id === activeBg)!;

  // Reload video source when bg changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.load();
    v.play().catch(() => {/* autoplay blocked — silent */});
  }, [activeBg]);

  if (!def.isVideo) return null;

  return (
    <div className={styles.workspaceBgLayer}>
      <video
        ref={videoRef}
        className={styles.workspaceBgVideo}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        key={def.filename}
      >
        <source src={`/workspace-bgs/${def.filename}`} type="video/mp4" />
      </video>
    </div>
  );
}
