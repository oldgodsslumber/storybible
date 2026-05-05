import { memo } from 'react';
import { NodeResizer, type NodeProps } from 'reactflow';
import { useProjectStore } from '@/store/projectStore';
import type { LineAnnotation } from '@/schemas';

export interface LineNodeData {
  annotation: LineAnnotation;
}

/**
 * Lines are rendered as horizontal SVG inside a resizable bounding box.
 * Rotate via the inspector (0/90 degrees). For diagonal lines, set rotation
 * manually in the inspector — endpoint-drag editing is a follow-up.
 */
function LineNodeImpl({ data, selected }: NodeProps<LineNodeData>) {
  const a = data.annotation;
  const selectAnnotation = useProjectStore((s) => s.selectAnnotation);
  const updateAnnotationLocal = useProjectStore((s) => s.updateAnnotationLocal);
  return (
    <div
      onPointerDown={() => selectAnnotation(a.id)}
      style={{
        width: a.size.w,
        height: Math.max(a.size.h, a.thickness + 4),
        transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
        transformOrigin: 'center',
      }}
      className="flex items-center"
    >
      <NodeResizer
        isVisible={selected}
        minWidth={40}
        minHeight={Math.max(a.thickness + 4, 8)}
        lineClassName="!border-slate-400"
        handleClassName="!bg-slate-400 !border-slate-700"
        onResizeEnd={(_e, p) =>
          updateAnnotationLocal(a.id, { size: { w: p.width, h: p.height } })
        }
      />
      <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
        <line
          x1={0}
          y1="50%"
          x2="100%"
          y2="50%"
          stroke={a.color}
          strokeWidth={a.thickness}
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export const LineNode = memo(LineNodeImpl);
