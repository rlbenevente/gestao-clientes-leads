import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  initialize: async () => {
    // Busca a sessão inicial
    const { data: { session } } = await supabase.auth.getSession();
    set({ user: session?.user || null, isLoading: false });

    // Fica escutando mudanças na sessão
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user || null });
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ user: data.user, isLoading: false });
    return { error };
  },

  signUp: async (email, password) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    set({ user: data.user, isLoading: false });
    return { error };
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, isLoading: false });
  }
}));
