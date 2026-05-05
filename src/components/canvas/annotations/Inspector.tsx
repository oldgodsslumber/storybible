import { useMemo, useRef } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { deleteAnnotation } from '@/firebase/db';
import { useClickAway } from '@/lib/useClickAway';
import type { Thickness } from '@/schemas';

const PALETTE = [
  '#fde68a', '#fca5a5', '#fdba74', '#fcd34d',
  '#86efac', '#67e8f9', '#93c5fd', '#c4b5fd',
  '#f9a8d4', '#e2e8f0', '#94a3b8', '#0f172a',
];

const THICKNESSES: Thickness[] = [1, 2, 4];

export function AnnotationInspector() {
  const projectId = useProjectStore((s) => s.projectId);
  const annotations = useProjectStore((s) => s.annotations);
  const selectedId = useProjectStore((s) => s.selectedAnnotationId);
  const selectAnnotation = useProjectStore((s) => s.selectAnnotation);
  const updateAnnotationLocal = useProjectStore((s) => s.updateAnnotationLocal);

  const a = useMemo(() => annotations.find((x) => x.id === selectedId) ?? null, [annotations, selectedId]);

  const ref = useRef<HTMLDivElement>(null);
  useClickAway(ref, () => selectAnnotation(null), !!a);

  if (!a || !projectId) return null;

  function update(patch: Record<string, unknown>) {
    updateAnnotationLocal(a!.id, patch as any);
  }

  return (
    <div
      ref={ref}
      className="absolute right-3 top-3 z-10 w-60 rounded-md border border-slate-700 bg-slate-900/95 p-2 text-xs shadow-lg backdrop-blur"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold uppercase tracking-wide text-slate-400">{a.kind}</span>
        <button
          onClick={() => selectAnnotation(null)}
          className="text-slate-500 hover:text-slate-100"
        >
          ×
        </button>
      </div>

      <div className="mb-2">
        <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Color</div>
        <div className="grid grid-cols-6 gap-1">
          {PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => update({ color: c })}
              className={'h-5 w-5 rounded ' + (a.color === c ? 'ring-2 ring-sky-400' : 'ring-1 ring-slate-700')}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <input
          type="color"
          value={a.color}
          onChange={(e) => update({ color: e.target.value })}
          className="mt-1 h-6 w-full rounded border border-slate-700 bg-slate-800"
        />
      </div>

      {(a.kind === 'rect' || a.kind === 'line') && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Thickness</div>
          <div className="flex gap-1">
            {THICKNESSES.map((t) => (
              <button
                key={t}
                onClick={() => update({ thickness: t })}
                className={
                  'flex-1 rounded border px-2 py-0.5 ' +
                  (a.thickness === t
                    ? 'border-sky-400 bg-sky-400/10'
                    : 'border-slate-700 hover:bg-slate-800')
                }
              >
                {t}px
              </button>
            ))}
          </div>
        </div>
      )}

      {a.kind === 'rect' && (
        <label className="mb-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={a.filled}
            onChange={(e) => update({ filled: e.target.checked })}
          />
          <span>Tinted fill</span>
        </label>
      )}

      {a.kind === 'text' && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Font size</div>
          <input
            type="range"
            min={10}
            max={64}
            step={1}
            value={a.fontSize}
            onChange={(e) => update({ fontSize: Number(e.target.value) })}
            className="w-full"
          />
          <div className="text-right text-[10px] text-slate-500">{a.fontSize}px</div>
        </div>
      )}

      {(a.kind === 'line' || a.kind === 'sticky' || a.kind === 'text' || a.kind === 'rect') && (
        <div className="mb-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Rotation</div>
          <div className="flex gap-1">
            {[0, 45, 90, 135].map((deg) => (
              <button
                key={deg}
                onClick={() => update({ rotation: deg })}
                className={
                  'flex-1 rounded border px-1 py-0.5 ' +
                  (a.rotation === deg
                    ? 'border-sky-400 bg-sky-400/10'
                    : 'border-slate-700 hover:bg-slate-800')
                }
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => {
          void deleteAnnotation(projectId!, a.id);
          selectAnnotation(null);
        }}
        className="w-full rounded border border-red-900/50 px-2 py-1 text-[11px] text-red-400 hover:bg-red-950"
      >
        Delete
      </button>
    </div>
  );
}
