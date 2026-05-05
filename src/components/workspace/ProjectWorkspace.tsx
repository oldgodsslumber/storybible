import { useEffect } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { useProjectStore } from '@/store/projectStore';
import { Library } from '@/components/library/Library';
import { CanvasView } from '@/components/canvas/CanvasView';
import { CardDetail } from '@/components/card/CardDetail';
import { ConnectionEditor } from '@/components/connection/ConnectionEditor';
import { Topbar } from '@/components/workspace/Topbar';

interface Props {
  projectId: string;
  onClose: () => void;
}

export function ProjectWorkspace({ projectId, onClose }: Props) {
  const loadProject = useProjectStore((s) => s.loadProject);
  const unloadProject = useProjectStore((s) => s.unloadProject);
  const project = useProjectStore((s) => s.project);
  const detailCardId = useProjectStore((s) => s.detailCardId);
  const selectedConnectionId = useProjectStore((s) => s.selectedConnectionId);
  const libraryCollapsed = useProjectStore((s) => s.libraryCollapsed);

  useEffect(() => {
    loadProject(projectId);
    return () => unloadProject();
  }, [projectId, loadProject, unloadProject]);

  if (!project) {
    return <div className="flex h-full items-center justify-center text-slate-400">Loading project…</div>;
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar onClose={onClose} />
      <div className="flex flex-1 overflow-hidden">
        {!libraryCollapsed && <Library />}
        <div className="relative flex-1">
          <ReactFlowProvider>
            <CanvasView />
          </ReactFlowProvider>
        </div>
        {detailCardId && <CardDetail />}
        {selectedConnectionId && !detailCardId && <ConnectionEditor />}
      </div>
    </div>
  );
}
