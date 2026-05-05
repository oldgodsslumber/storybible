import { memo, useEffect, useRef, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { useProjectStore } from '@/store/projectStore';
import type { TextAnnotation } from '@/schemas';

export interface TextNodeData {
  annotation: TextAnnotation;
}

function TextNodeImpl({ data, selected }: NodeProps<TextNodeData>) {
  const a = data.annotation;
  const updateAnnotationLocal = useProjectStore((s) => s.updateAnnotationLocal);
  const selectAnnotation = useProjectStore((s) => s.selectAnnotation);

  const [text, setText] = useState(a.text);
  const [editing, setEditing] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => setText(a.text), [a.id]);

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [editing]);

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
        color: a.color,
        fontSize: a.fontSize,
        transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
      }}
      className={
        'min-w-[40px] cursor-grab font-semibold leading-tight ' +
        (selected ? 'outline outline-1 outline-sky-400/50' : '')
      }
    >
      {editing ? (
        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Text"
          rows={Math.max(1, text.split('\n').length)}
          className="nodrag w-[max-content] min-w-[40px] resize-none bg-transparent p-0 outline-none"
          style={{ color: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', lineHeight: 'inherit' }}
        />
      ) : (
        <div className="pointer-events-none whitespace-pre-wrap">
          {text || <span className="opacity-60">Text</span>}
        </div>
      )}
    </div>
  );
}

export const TextNode = memo(TextNodeImpl);
