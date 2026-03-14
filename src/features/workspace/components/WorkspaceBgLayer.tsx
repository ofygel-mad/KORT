import { useRef, useEffect } from 'react';
import { useWorkspaceTheme, WORKSPACE_BG_OPTIONS } from '../model/workspaceTheme';
import styles from './Workspace.module.css';

/**
 * Full-viewport video background layer.
 * pointer-events: none — tiles stay fully interactive on top.
 */
export function WorkspaceBgLayer() {
  const { activeBg } = useWorkspaceTheme();
  const fillVideoRef = useRef<HTMLVideoElement>(null);
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const def = WORKSPACE_BG_OPTIONS.find((o) => o.id === activeBg)!;

  // Reload video source when bg changes
  useEffect(() => {
    const videos = [fillVideoRef.current, mainVideoRef.current].filter(Boolean) as HTMLVideoElement[];
    for (const video of videos) {
      video.load();
      video.play().catch(() => { /* autoplay blocked — silent */ });
    }
  }, [activeBg]);

  if (!def.isVideo) return null;

  return (
    <div className={styles.workspaceBgLayer}>
      <video
        ref={fillVideoRef}
        className={styles.workspaceBgVideoFill}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        key={def.filename}
      >
        <source src={`/workspace-bgs/${def.filename}`} type="video/mp4" />
      </video>

      <video
        ref={mainVideoRef}
        className={styles.workspaceBgVideoMain}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        key={`${def.filename}-main`}
      >
        <source src={`/workspace-bgs/${def.filename}`} type="video/mp4" />
      </video>
    </div>
  );
}
