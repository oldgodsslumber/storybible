import { create } from 'zustand';
import type { User as FbUser } from 'firebase/auth';

interface AuthState {
  user: FbUser | null;
  loading: boolean;
  setUser: (user: FbUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setLoading: (loading) => set({ loading }),
}));
