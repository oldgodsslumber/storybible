import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { CARD_TYPE_META, type Card } from '@/schemas';
import { useProjectStore } from '@/store/projectStore';

export interface CardNodeData {
  card: Card;
  placementId: string;
  expanded: boolean;
}

function CardNodeImpl({ data, selected }: NodeProps<CardNodeData>) {
  const card = data.card;
  const meta = CARD_TYPE_META[card.type];
  const togglePlacementExpanded = useProjectStore((s) => s.togglePlacementExpanded);
  const openDetail = useProjectStore((s) => s.openDetail);

  function onCardClick(e: React.MouseEvent) {
    if (e.altKey) return; // alt-drag handled at canvas level
    togglePlacementExpanded(data.placementId);
  }

  function onOpenDetail(e: React.MouseEvent) {
    e.stopPropagation();
    openDetail(card.id);
  }

  const hasBody = card.body.trim().length > 0;

  return (
    <div
      className={'sb-card-node group' + (selected ? ' selected' : '')}
      style={{ borderColor: meta.color }}
      onClick={onCardClick}
    >
      <Handle type="source" position={Position.Top}    className="sb-handle" id="t" />
      <Handle type="source" position={Position.Right}  className="sb-handle" id="r" />
      <Handle type="source" position={Position.Bottom} className="sb-handle" id="b" />
      <Handle type="source" position={Position.Left}   className="sb-handle" id="l" />

      <div className="flex items-start gap-1 px-2 pt-1.5">
        <span
          className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: meta.color }}
          title={meta.label}
        />
        <div className="min-w-0 flex-1 text-sm font-semibold leading-tight">
          {card.title || <span className="text-slate-500">(untitled)</span>}
        </div>
        <button
          onClick={onOpenDetail}
          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-100"
          title="Open details"
        >
          ⋯
        </button>
      </div>

      {hasBody && (
        <div
          className={
            'px-2 pb-1.5 pt-1 text-[11px] leading-snug text-slate-400 whitespace-pre-wrap break-words ' +
            (data.expanded ? 'max-h-60 overflow-auto' : 'line-clamp-2')
          }
        >
          {card.body}
        </div>
      )}
    </div>
  );
}

export const CardNode = memo(CardNodeImpl);
