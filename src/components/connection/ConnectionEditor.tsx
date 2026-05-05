import { useMemo, useState } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { deleteConnection, updateConnection, updateProject } from '@/firebase/db';
import type { ConnectionType } from '@/schemas/connectionType';
import { nanoid } from 'nanoid';

export function ConnectionEditor() {
  const projectId = useProjectStore((s) => s.projectId);
  const project = useProjectStore((s) => s.project);
  const connections = useProjectStore((s) => s.connections);
  const cards = useProjectStore((s) => s.cards);
  const selectedConnectionId = useProjectStore((s) => s.selectedConnectionId);
  const selectConnection = useProjectStore((s) => s.selectConnection);

  const conn = useMemo(
    () => connections.find((c) => c.id === selectedConnectionId) ?? null,
    [connections, selectedConnectionId],
  );

  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#94a3b8');

  if (!conn || !project || !projectId) return null;

  const fromCard = cards.find((c) => c.id === conn.fromCardId);
  const toCard = cards.find((c) => c.id === conn.toCardId);

  async function changeType(typeId: string) {
    await updateConnection(projectId!, conn!.id, { type: typeId });
  }

  async function changeLabel(label: string) {
    await updateConnection(projectId!, conn!.id, { label });
  }

  async function handleDelete() {
    await deleteConnection(projectId!, conn!.id);
    selectConnection(null);
  }

  async function addNewType() {
    if (!newTypeLabel.trim()) return;
    const t: ConnectionType = {
      id: nanoid(),
      label: newTypeLabel.trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(newTypeColor) ? newTypeColor : '#94a3b8',
    };
    await updateProject(projectId!, {
      connectionTypes: [...project!.connectionTypes, t],
    });
    setNewTypeLabel('');
    await changeType(t.id);
  }

  return (
    <aside className="flex w-96 flex-col border-l border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Connection
        </span>
        <button onClick={() => selectConnection(null)} className="text-slate-500 hover:text-slate-100">×</button>
      </div>

      <div className="flex-1 space-y-3 overflow-auto p-3 text-sm">
        <div className="rounded border border-slate-800 bg-slate-950 p-2 text-xs">
          <div className="text-slate-500">From</div>
          <div>{fromCard?.title || '(missing card)'}</div>
          <div className="mt-1 text-slate-500">To</div>
          <div>{toCard?.title || '(missing card)'}</div>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Type</label>
          <select
            value={conn.type}
            onChange={(e) => changeType(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
          >
            {project.connectionTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">Label (optional)</label>
          <input
            value={conn.label}
            onChange={(e) => changeLabel(e.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-800 px-2 py-1"
          />
        </div>

        <div className="border-t border-slate-800 pt-3">
          <div className="mb-2 text-[10px] uppercase tracking-wide text-slate-500">Add custom type</div>
          <div className="flex gap-2">
            <input
              value={newTypeLabel}
              onChange={(e) => setNewTypeLabel(e.target.value)}
              placeholder="e.g. mentor-of"
              className="flex-1 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs"
            />
            <input
              type="color"
              value={newTypeColor}
              onChange={(e) => setNewTypeColor(e.target.value)}
              className="h-7 w-10 rounded border border-slate-700 bg-slate-800"
            />
            <button
              onClick={addNewType}
              className="rounded bg-sky-500 px-2 py-1 text-xs font-medium text-white hover:bg-sky-400"
            >
              Add
            </button>
          </div>
        </div>

        <button
          onClick={handleDelete}
          className="w-full rounded border border-red-900 px-3 py-1 text-xs text-red-400 hover:bg-red-950"
        >
          Delete connection
        </button>
      </div>
    </aside>
  );
}
