import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { CARD_TYPE_META, type Card } from '@/schemas';

export interface CardNodeData {
  card: Card;
  selected?: boolean;
}

function CardNodeImpl({ data, selected }: NodeProps<CardNodeData>) {
  const card = data.card;
  const meta = CARD_TYPE_META[card.type];
  return (
    <div
      className={'sb-card-node' + (selected ? ' selected' : '')}
      style={{ borderColor: meta.color }}
    >
      <Handle type="target" position={Position.Top} className="sb-handle" id="t" />
      <Handle type="target" position={Position.Left} className="sb-handle" id="l" />
      <header style={{ backgroundColor: meta.color }}>{meta.label}</header>
      <div className="px-2 py-1 text-sm font-semibold">
        {card.title || <span className="text-slate-500">(untitled)</span>}
      </div>
      {card.body && (
        <div className="sb-body line-clamp-3 border-t border-slate-800 text-slate-300">
          {card.body}
        </div>
      )}
      <Handle type="source" position={Position.Right} className="sb-handle" id="r" />
      <Handle type="source" position={Position.Bottom} className="sb-handle" id="b" />
    </div>
  );
}

export const CardNode = memo(CardNodeImpl);
