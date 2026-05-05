import { useEffect, useMemo, useRef, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { CARD_TYPES, CARD_TYPE_META, type CardType } from '@/schemas';
import { updateCard, deleteCard, createPlacement, deletePlacement, deleteConnection } from '@/firebase/db';
import { keyedDebounce } from '@/lib/debounce';
import { useClickAway } from '@/lib/useClickAway';

const debouncedUpdate = keyedDebounce<[Record<string, unknown>]>((cardId, patch) => {
  const { projectId } = useProjectStore.getState();
  if (!projectId) return;
  void updateCard(projectId, cardId, patch as any);
}, 600);

export function CardDetail() {
  const projectId = useProjectStore((s) => s.projectId);
  const cards = useProjectStore((s) => s.cards);
  const placements = useProjectStore((s) => s.placements);
  const connections = useProjectStore((s) => s.connections);
  const project = useProjectStore((s) => s.project);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const detailCardId = useProjectStore((s) => s.detailCardId);
  const closeDetail = useProjectStore((s) => s.closeDetail);
  const openDetail = useProjectStore((s) => s.openDetail);

  const card = useMemo(() => cards.find((c) => c.id === detailCardId) ?? null, [cards, detailCardId]);

  const panelRef = useRef<HTMLElement>(null);
  useClickAway(panelRef, closeDetail, !!card);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagsText, setTagsText] = useState('');

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setBody(card.body);
      setTagsText(card.tags.join(', '));
    }
  }, [card?.id]); // re-init only when switching cards

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const typeById = useMemo(
    () => new Map((project?.connectionTypes ?? []).map((t) => [t.id, t])),
    [project],
  );

  // Connections involving this card. Each row reads as the full directional
  // sentence "<from> <label> <to>" — never reordered — so direction is
  // unambiguous regardless of which endpoint you're viewing.
  const related = useMemo(() => {
    if (!card) return [] as Array<{
      id: string;
      label: string;
      color: string;
      fromCardId: string;
      toCardId: string;
      fromTitle: string;
      toTitle: string;
      currentIsFrom: boolean;
    }>;
    return connections
      .filter((c) => c.fromCardId === card.id || c.toCardId === card.id)
      .map((c) => {
        const t = typeById.get(c.type);
        const label = c.label || t?.label || c.type;
        const fromTitle = cardById.get(c.fromCardId)?.title || '(untitled)';
        const toTitle = cardById.get(c.toCardId)?.title || '(untitled)';
        return {
          id: c.id,
          label,
          color: t?.color ?? '#94a3b8',
          fromCardId: c.fromCardId,
          toCardId: c.toCardId,
          fromTitle,
          toTitle,
          currentIsFrom: c.fromCardId === card.id,
        };
      })
      .sort((a, b) => {
        // Outgoing first, then incoming, then by other-card title.
        if (a.currentIsFrom !== b.currentIsFrom) return a.currentIsFrom ? -1 : 1;
        const aOther = a.currentIsFrom ? a.toTitle : a.fromTitle;
        const bOther = b.currentIsFrom ? b.toTitle : b.fromTitle;
        return aOther.localeCompare(bOther);
      });
  }, [connections, card, cardById, typeById]);

  if (!card || !projectId) return null;

  const meta = CARD_TYPE_META[card.type];
  const placement = placements.find((p) => p.cardId === card.id && p.canvasId === activeCanvasId);

  function patch(p: Record<string, unknown>) {
    debouncedUpdate(card!.id, p);
  }

  function changeTitle(v: string) { setTitle(v); patch({ title: v }); }
  function changeBody(v: string) { setBody(v); patch({ body: v }); }
  function changeType(v: CardType) { void updateCard(projectId!, card!.id, { type: v }); }
  function toggleAlwaysInRag() {
    void updateCard(projectId!, card!.id, { alwaysIncludeInRag: !card!.alwaysIncludeInRag });
  }
  function commitTags() {
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean);
    void updateCard(projectId!, card!.id, { tags });
  }

  async function handleDelete() {
    if (!confirm('Delete card and all its placements & connections?')) return;
    await deleteCard(projectId!, card!.id);
    closeDetail();
  }

  async function handleAddToCanvas() {
    if (!activeCanvasId) return;
    await createPlacement(projectId!, activeCanvasId, card!.id, { x: 0, y: 0 });
  }

  async function handleRemoveFromCanvas() {
    if (!placement) return;
    await deletePlacement(projectId!, placement.id);
  }

  return (
    <aside ref={panelRef} className="flex w-96 flex-col border-l border-slate-800 bg-slate-900">
      <div
        className="flex items-center justify-end border-b border-slate-800 px-3 py-1.5"
        style={{ borderTop: `2px solid ${meta.color}` }}
      >
        <button
          onClick={() => closeDetail()}
          className="text-slate-500 hover:text-slate-100"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Name</label>
          <input
            value={title}
            onChange={(e) => changeTitle(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1.5 text-base font-semibold"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Description</label>
          <textarea
            value={body}
            onChange={(e) => changeBody(e.target.value)}
            rows={12}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
            Tags (comma-separated)
          </label>
          <input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            onBlur={commitTags}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={card.alwaysIncludeInRag}
            onChange={toggleAlwaysInRag}
          />
          <span>Always include in LLM context (M3)</span>
        </label>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">
            Connections
          </label>
          {related.length === 0 ? (
            <div className="text-xs text-slate-500">
              None yet. Drag from a handle on this card to another card on the canvas.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 rounded border border-slate-800">
              {related.map((r) => {
                const fromIsCurrent = r.currentIsFrom;
                const fromOnClick = fromIsCurrent ? undefined : () => openDetail(r.fromCardId);
                const toOnClick = !fromIsCurrent ? undefined : () => openDetail(r.toCardId);
                return (
                  <li
                    key={r.id}
                    className="group flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 px-2 py-1 text-xs hover:bg-slate-800"
                  >
                    <button
                      type="button"
                      onClick={fromOnClick}
                      disabled={fromIsCurrent}
                      className={
                        'truncate text-left ' +
                        (fromIsCurrent
                          ? 'italic text-slate-500'
                          : 'text-slate-100 hover:underline')
                      }
                      title={fromIsCurrent ? 'this card' : `Open ${r.fromTitle}`}
                    >
                      {r.fromTitle}
                    </button>
                    <span style={{ color: r.color }} className="font-medium">
                      {r.label}
                    </span>
                    <button
                      type="button"
                      onClick={toOnClick}
                      disabled={!fromIsCurrent}
                      className={
                        'truncate text-left ' +
                        (!fromIsCurrent
                          ? 'italic text-slate-500'
                          : 'text-slate-100 hover:underline')
                      }
                      title={!fromIsCurrent ? 'this card' : `Open ${r.toTitle}`}
                    >
                      {r.toTitle}
                    </button>
                    <button
                      onClick={() => deleteConnection(projectId!, r.id)}
                      title="Remove connection"
                      className="ml-auto opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400"
                    >
                      ×
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-800 pt-3">
          {placement ? (
            <button
              onClick={handleRemoveFromCanvas}
              className="w-full rounded border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
            >
              Remove from canvas
            </button>
          ) : (
            <button
              onClick={handleAddToCanvas}
              className="w-full rounded border border-slate-700 px-3 py-1 text-xs hover:bg-slate-800"
            >
              Place on this canvas
            </button>
          )}
        </div>
      </div>

      {/* De-emphasized footer: type selector + delete. Type lives here so it
          doesn't dominate the panel — name + description are what matters. */}
      <div className="space-y-2 border-t border-slate-800 bg-slate-950 p-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: meta.color }}
          />
          <label className="text-[10px] uppercase tracking-wide text-slate-500">Type</label>
          <select
            value={card.type}
            onChange={(e) => changeType(e.target.value as CardType)}
            className="ml-auto rounded border border-slate-800 bg-slate-900 px-2 py-0.5 text-xs"
          >
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>{CARD_TYPE_META[t].label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleDelete}
          className="w-full rounded border border-red-900/50 px-3 py-1 text-[11px] text-red-400 hover:bg-red-950"
        >
          Delete card
        </button>
      </div>
    </aside>
  );
}
