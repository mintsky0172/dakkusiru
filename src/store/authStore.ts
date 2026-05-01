import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  fetchMyProfile,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "../services/authService";

type UserRole = "user" | "admin";

interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
}

interface AuthStore {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoaded: boolean;
  isLoading: boolean;

  initializeAuth: () => Promise<() => void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoaded: false,
  isLoading: false,

  initializeAuth: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      session,
      user: session?.user ?? null,
      isLoaded: true,
    });

    if (session?.user) {
      await get().loadProfile();
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
      });

      if (nextSession?.user) {
        await get().loadProfile();
      } else {
        set({ profile: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  login: async (email, password) => {
    set({ isLoading: true });

    try {
      const data = await signInWithEmail(email, password);

      set({
        session: data.session,
        user: data.user,
      });

      await get().loadProfile();
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true });

    try {
      const data = await signUpWithEmail(email, password);

      set({
        session: data.session,
        user: data.user,
      });

      await get().loadProfile();
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await signOut();

    set({
      session: null,
      user: null,
      profile: null,
    });
  },

  loadProfile: async () => {
    const profile = await fetchMyProfile();
    set({ profile });
  },

  isAdmin: () => {
    return get().profile?.role === "admin";
  },
}));
