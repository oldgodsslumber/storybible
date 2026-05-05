import { useEffect, useState } from 'react';
import { signOut } from '@/firebase/auth';
import { createProject, deleteProject, watchProjectsForUser } from '@/firebase/db';
import { useAuthStore } from '@/store/authStore';
import type { Project } from '@/schemas';

interface Props {
  onOpen: (projectId: string) => void;
}

export function ProjectList({ onOpen }: Props) {
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    return watchProjectsForUser(user.uid, setProjects);
  }, [user]);

  async function handleCreate() {
    if (!user || !name.trim()) return;
    setBusy(true);
    try {
      const p = await createProject(name.trim(), user.uid);
      setName('');
      onOpen(p.id);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p: Project) {
    if (!confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;
    await deleteProject(p.id);
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your projects</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-400">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="rounded border border-slate-700 px-3 py-1 hover:bg-slate-800"
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="mb-6 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New project name"
          className="flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          onClick={handleCreate}
          disabled={busy || !name.trim()}
          className="rounded bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400 disabled:opacity-50"
        >
          Create
        </button>
      </div>

      <ul className="flex-1 space-y-2 overflow-auto">
        {projects.length === 0 && (
          <li className="rounded border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">
            No projects yet. Create one above.
          </li>
        )}
        {projects.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between rounded border border-slate-800 bg-slate-900 px-4 py-3 hover:border-slate-600"
          >
            <button onClick={() => onOpen(p.id)} className="flex-1 text-left">
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-slate-500">
                Updated {new Date(p.updatedAt).toLocaleString()}
              </div>
            </button>
            <button
              onClick={() => handleDelete(p)}
              className="ml-4 text-xs text-slate-500 hover:text-red-400"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
