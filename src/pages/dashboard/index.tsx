import { useState } from 'react';
import { WorkspaceCanvas } from '../../features/workspace/components/WorkspaceCanvas';
import { WorkspaceAddMenu } from '../../features/workspace/components/WorkspaceAddMenu';
import { useWorkspaceStore } from '../../features/workspace/model/store';

export default function DashboardPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const addTile = useWorkspaceStore((s) => s.addTile);

  return (
    <>
      <WorkspaceCanvas onOpenCreateMenu={() => setMenuOpen(true)} />
      <WorkspaceAddMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSelect={(kind) => {
          addTile(kind);
          setMenuOpen(false);
        }}
      />
    </>
  );
}
