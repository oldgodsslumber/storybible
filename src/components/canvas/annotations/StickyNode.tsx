import { memo, useEffect, useRef, useState } from 'react';
import { NodeResizer, type NodeProps } from 'reactflow';
import { useProjectStore } from '@/store/projectStore';
import type { StickyAnnotation } from '@/schemas';

export interface StickyNodeData {
  annotation: StickyAnnotation;
}

function StickyNodeImpl({ data, selected }: NodeProps<StickyNodeData>) {
  const a = data.annotation;
  const updateAnnotationLocal = useProjectStore((s) => s.updateAnnotationLocal);
  const selectAnnotation = useProjectStore((s) => s.selectAnnotation);

  const [text, setText] = useState(a.text);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setText(a.text), [a.id]);

  // Focus + select-all when entering edit mode, so typing overwrites.
  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [editing]);

  // If the annotation is deselected externally, exit edit mode.
  useEffect(() => {
    if (!selected && editing) {
      setEditing(false);
      if (text !== a.text) updateAnnotationLocal(a.id, { text });
    }
  }, [selected]); // eslint-disable-line

  function commit() {
    setEditing(false);
    if (text !== a.text) updateAnnotationLocal(a.id, { text });
  }

  return (
    <div
      onClick={() => selectAnnotation(a.id)}
      onDoubleClick={() => setEditing(true)}
      style={{
        background: a.color,
        width: a.size.w,
        height: a.size.h,
        transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
      }}
      className="rounded-sm shadow-md text-slate-900"
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={60}
        lineClassName="!border-slate-400"
        handleClassName="!bg-slate-400 !border-slate-700"
        onResizeEnd={(_e, p) =>
          updateAnnotationLocal(a.id, { size: { w: p.width, h: p.height } })
        }
      />
      {editing ? (
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Note…"
          className="nodrag h-full w-full resize-none bg-transparent p-2 text-[13px] leading-snug outline-none"
        />
      ) : (
        <div className="pointer-events-none h-full w-full overflow-hidden whitespace-pre-wrap p-2 text-[13px] leading-snug">
          {text || <span className="opacity-60">Note…</span>}
        </div>
      )}
    </div>
  );
}

export const StickyNode = memo(StickyNodeImpl);
