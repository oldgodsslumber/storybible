import { signInWithGoogle } from '@/firebase/auth';

export function SignIn() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <h1 className="mb-2 text-2xl font-semibold">Story Bible</h1>
        <p className="mb-6 text-sm text-slate-400">A spatial story bible for writers.</p>
        <button
          onClick={() => signInWithGoogle().catch((e) => alert(e.message))}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-400"
        >
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
