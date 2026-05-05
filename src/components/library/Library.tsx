import { useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { CARD_TYPES, CARD_TYPE_META, type CardType } from '@/schemas';
import { deleteCard } from '@/firebase/db';

export function Library() {
  const projectId = useProjectStore((s) => s.projectId);
  const cards = useProjectStore((s) => s.cards);
  const placements = useProjectStore((s) => s.placements);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const openDetail = useProjectStore((s) => s.openDetail);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<Set<CardType>>(new Set());
  const [tagFilter, setTagFilter] = useState<string>('');

  const placedCardIds = useMemo(
    () => new Set(placements.filter((p) => p.canvasId === activeCanvasId).map((p) => p.cardId)),
    [placements, activeCanvasId],
  );

  const allTags = useMemo(() => {
    const s = new Set<string>();
    cards.forEach((c) => c.tags.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [cards]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cards
      .filter((c) => (typeFilter.size === 0 ? true : typeFilter.has(c.type)))
      .filter((c) => (tagFilter ? c.tags.includes(tagFilter) : true))
      .filter((c) => {
        if (!q) return true;
        return c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q);
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [cards, search, typeFilter, tagFilter]);

  function toggleType(t: CardType) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  async function handleDelete(cardId: string) {
    if (!projectId) return;
    if (!confirm('Delete card and all its placements & connections?')) return;
    await deleteCard(projectId, cardId);
  }

  function onDragStart(e: React.DragEvent, cardId: string) {
    e.dataTransfer.setData('application/x-storybible-card', cardId);
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside className="flex w-72 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title and body…"
          className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none"
        />
        <div className="mt-2 flex flex-wrap gap-1">
          {CARD_TYPES.map((t) => {
            const active = typeFilter.has(t);
            return (
              <button
                key={t}
                onClick={() => toggleType(t)}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                style={{
                  backgroundColor: active ? CARD_TYPE_META[t].color : 'transparent',
                  color: active ? '#0f172a' : CARD_TYPE_META[t].color,
                  border: `1px solid ${CARD_TYPE_META[t].color}`,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="mt-2 w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>#{t}</option>
            ))}
          </select>
        )}
      </div>

      <ul className="flex-1 overflow-auto">
        {filtered.length === 0 && (
          <li className="p-4 text-center text-xs text-slate-500">
            No cards yet. Drag a chip from the top toolbar onto the canvas, or onto an existing card.
          </li>
        )}
        {filtered.map((c) => {
          const meta = CARD_TYPE_META[c.type];
          const placed = placedCardIds.has(c.id);
          return (
            <li
              key={c.id}
              draggable
              onDragStart={(e) => onDragStart(e, c.id)}
              onClick={() => openDetail(c.id)}
              className="group flex cursor-grab items-start gap-2 border-b border-slate-800 px-3 py-2 hover:bg-slate-800"
            >
              <span
                className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-1">
                  <div className="truncate text-sm font-medium">{c.title || '(untitled)'}</div>
                  {placed && <span title="On canvas" className="text-[10px] text-emerald-400">●</span>}
                </div>
                <div className="text-[10px] uppercase tracking-wide" style={{ color: meta.color }}>
                  {meta.label}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                className="opacity-0 group-hover:opacity-100 text-xs text-slate-500 hover:text-red-400"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
