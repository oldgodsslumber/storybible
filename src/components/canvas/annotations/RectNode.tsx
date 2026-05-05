import { memo } from 'react';
import { NodeResizer, type NodeProps } from 'reactflow';
import { useProjectStore } from '@/store/projectStore';
import type { RectAnnotation } from '@/schemas';

export interface RectNodeData {
  annotation: RectAnnotation;
}

function RectNodeImpl({ data, selected }: NodeProps<RectNodeData>) {
  const a = data.annotation;
  const selectAnnotation = useProjectStore((s) => s.selectAnnotation);
  const updateAnnotationLocal = useProjectStore((s) => s.updateAnnotationLocal);
  return (
    <div
      onPointerDown={() => selectAnnotation(a.id)}
      style={{
        width: a.size.w,
        height: a.size.h,
        borderColor: a.color,
        borderWidth: a.thickness,
        background: a.filled ? a.color + '33' : 'transparent',
        transform: a.rotation ? `rotate(${a.rotation}deg)` : undefined,
      }}
      className="rounded-sm border-solid"
    >
      <NodeResizer
        isVisible={selected}
        minWidth={20}
        minHeight={20}
        lineClassName="!border-slate-400"
        handleClassName="!bg-slate-400 !border-slate-700"
        onResizeEnd={(_e, p) =>
          updateAnnotationLocal(a.id, { size: { w: p.width, h: p.height } })
        }
      />
    </div>
  );
}

export const RectNode = memo(RectNodeImpl);
