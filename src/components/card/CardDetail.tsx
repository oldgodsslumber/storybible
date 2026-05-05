import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { CARD_TYPES, CARD_TYPE_META, type CardType } from '@/schemas';
import { updateCard, deleteCard, createPlacement, deletePlacement } from '@/firebase/db';
import { keyedDebounce } from '@/lib/debounce';

const debouncedUpdate = keyedDebounce<[Record<string, unknown>]>((cardId, patch) => {
  const { projectId } = useProjectStore.getState();
  if (!projectId) return;
  void updateCard(projectId, cardId, patch as any);
}, 600);

export function CardDetail() {
  const projectId = useProjectStore((s) => s.projectId);
  const cards = useProjectStore((s) => s.cards);
  const placements = useProjectStore((s) => s.placements);
  const activeCanvasId = useProjectStore((s) => s.activeCanvasId);
  const selectedCardId = useProjectStore((s) => s.selectedCardId);
  const selectCard = useProjectStore((s) => s.selectCard);

  const card = useMemo(() => cards.find((c) => c.id === selectedCardId) ?? null, [cards, selectedCardId]);

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
    selectCard(null);
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
    <aside className="flex w-96 flex-col border-l border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span
          className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{ backgroundColor: meta.color, color: '#0f172a' }}
        >
          {meta.label}
        </span>
        <button
          onClick={() => selectCard(null)}
          className="text-slate-500 hover:text-slate-100"
        >
          ×
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-3">
        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Type</label>
          <select
            value={card.type}
            onChange={(e) => changeType(e.target.value as CardType)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          >
            {CARD_TYPES.map((t) => (
              <option key={t} value={t}>{CARD_TYPE_META[t].label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Title</label>
          <input
            value={title}
            onChange={(e) => changeTitle(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Body</label>
          <textarea
            value={body}
            onChange={(e) => changeBody(e.target.value)}
            rows={10}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1 text-sm font-mono"
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={card.alwaysIncludeInRag}
            onChange={toggleAlwaysInRag}
          />
          <span>Always include in LLM context (M3)</span>
        </label>

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

        <button
          onClick={handleDelete}
          className="w-full rounded border border-red-900 px-3 py-1 text-xs text-red-400 hover:bg-red-950"
        >
          Delete card
        </button>
      </div>
    </aside>
  );
}
