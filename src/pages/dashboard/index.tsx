import { useState, useEffect } from 'react';
import { WorkspaceCanvas } from '../../features/workspace/components/WorkspaceCanvas';
import { WorkspaceAddMenu } from '../../features/workspace/components/WorkspaceAddMenu';
import { WorkspaceSpotlight } from '../../features/workspace/components/WorkspaceSpotlight';
import { useWorkspaceStore } from '../../features/workspace/model/store';
import { WorkspaceLock } from '../../features/auth/WorkspaceLock';
import { useAuthStore } from '../../shared/stores/auth';
import { useUIStore } from '../../shared/stores/ui';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const addTile = useWorkspaceStore((state) => state.addTile);
  const isUnlocked = useAuthStore((state) => state.isUnlocked);
  const workspaceAddMenuOpen = useUIStore((s) => s.workspaceAddMenuOpen);
  const closeWorkspaceAddMenu = useUIStore((s) => s.closeWorkspaceAddMenu);

  useEffect(() => {
    if (!isUnlocked) return;

    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setSpotlightOpen((value) => !value);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isUnlocked]);

  return (
    <div className={styles.dashRoot}>
      <WorkspaceCanvas />

      {!isUnlocked && <WorkspaceLock onUnlocked={() => {}} />}

      {isUnlocked && (
        <>
          <WorkspaceAddMenu
            open={workspaceAddMenuOpen}
            onClose={closeWorkspaceAddMenu}
            onSelect={(kind) => {
              addTile(kind);
              closeWorkspaceAddMenu();
            }}
          />
          <WorkspaceSpotlight
            open={spotlightOpen}
            onClose={() => setSpotlightOpen(false)}
          />
        </>
      )}
    </div>
  );
}
