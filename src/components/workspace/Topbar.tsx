import { useProjectStore } from '@/store/projectStore';
import { CARD_TYPES, CARD_TYPE_META, type CardType } from '@/schemas';
import type { AnnotationKind } from '@/schemas';

interface Props {
  onClose: () => void;
}

function TypeChip({ type }: { type: CardType }) {
  const meta = CARD_TYPE_META[type];
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-storybible-newcard', type);
    e.dataTransfer.effectAllowed = 'copy';
  }
  return (
    <button
      draggable
      onDragStart={onDragStart}
      title={`Drag to canvas to add a ${meta.label}`}
      className="cursor-grab rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide active:cursor-grabbing"
      style={{ backgroundColor: meta.color, color: '#0f172a' }}
    >
      {meta.label}
    </button>
  );
}

function ToolButton({ kind, label, icon }: { kind: AnnotationKind; label: string; icon: string }) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/x-storybible-newannotation', kind);
    e.dataTransfer.effectAllowed = 'copy';
  }
  // Use a div, not a <button>: some Chromium builds refuse to fire `dragstart`
  // on native buttons, which silently breaks drag-create. The card-type chips
  // hit the same potential issue but happen to work; using <div> here is the
  // safer pattern.
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={onDragStart}
      title={`Drag to canvas to add a ${label}`}
      className="select-none cursor-grab rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700 active:cursor-grabbing"
    >
      <span className="mr-1">{icon}</span>
      {label}
    </div>
  );
}

export function Topbar({ onClose }: Props) {
  const project = useProjectStore((s) => s.project);
  const canvases = useProjectStore((s) => s.canvases);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const setActiveCanvas = useProjectStore((s) => s.setActiveCanvas);
  const libraryCollapsed = useProjectStore((s) => s.libraryCollapsed);
  const toggleLibrary = useProjectStore((s) => s.toggleLibrary);

  return (
    <header className="flex flex-col gap-1 border-b border-slate-800 bg-slate-900 px-3 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleLibrary}
            title={libraryCollapsed ? 'Show library' : 'Hide library'}
            className="rounded border border-slate-700 px-2 py-0.5 text-xs hover:bg-slate-800"
          >
            {libraryCollapsed ? '☰' : '⟨'}
          </button>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-100">
            ← Projects
          </button>
          <h1 className="text-sm font-semibold">{project?.name}</h1>
          <select
            value={activeCanvasId ?? ''}
            onChange={(e) => setActiveCanvas(e.target.value)}
            className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs"
          >
            {canvases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.type === 'scene-5-act' ? '(M2)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[10px] text-slate-500">
          drag a chip · alt-drag to duplicate · click a tool to drop on canvas
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {CARD_TYPES.map((t) => (
            <TypeChip key={t} type={t} />
          ))}
        </div>
        <span className="mx-1 h-4 w-px bg-slate-700" />
        <div className="flex items-center gap-1">
          <ToolButton kind="sticky" label="Sticky" icon="🟨" />
          <ToolButton kind="text"   label="Text"   icon="T" />
          <ToolButton kind="rect"   label="Box"    icon="▭" />
          <ToolButton kind="line"   label="Line"   icon="—" />
        </div>
      </div>
    </header>
  );
}
