import { useEffect, useState } from 'react';
import { watchAuth } from '@/firebase/auth';
import { useAuthStore } from '@/store/authStore';
import { SignIn } from '@/components/auth/SignIn';
import { ProjectList } from '@/components/projects/ProjectList';
import { ProjectWorkspace } from '@/components/workspace/ProjectWorkspace';

export default function App() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setUser = useAuthStore((s) => s.setUser);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    return watchAuth((u) => setUser(u));
  }, [setUser]);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400">Loading…</div>;
  }
  if (!user) return <SignIn />;
  if (!activeProjectId) return <ProjectList onOpen={setActiveProjectId} />;
  return (
    <ProjectWorkspace
      projectId={activeProjectId}
      onClose={() => setActiveProjectId(null)}
    />
  );
}
