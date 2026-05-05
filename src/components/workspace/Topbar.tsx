import { useProjectStore } from '@/store/projectStore';

interface Props {
  onClose: () => void;
}

export function Topbar({ onClose }: Props) {
  const project = useProjectStore((s) => s.project);
  const canvases = useProjectStore((s) => s.canvases);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const setActiveCanvas = useProjectStore((s) => s.setActiveCanvas);

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2">
      <div className="flex items-center gap-4">
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-100">
          ← Projects
        </button>
        <h1 className="text-base font-semibold">{project?.name}</h1>
        <select
          value={activeCanvasId ?? ''}
          onChange={(e) => setActiveCanvas(e.target.value)}
          className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
        >
          {canvases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.type === 'scene-5-act' ? '(M2)' : ''}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
