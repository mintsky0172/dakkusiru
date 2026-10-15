import { create } from "zustand";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { claimPendingGuestPacks, ensureShopSession } from "../services/packAcquisitionService";
import { usePurchaseStore } from "./purchaseStore";
import { useCoinStore } from "./coinStore";
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
  signup: (
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
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
    // Anonymous auth may be unavailable offline; saved designs must still open.
    await ensureShopSession().catch(() => undefined);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    set({
      session,
      user: session?.user ?? null,
      isLoaded: true,
    });

    if (session?.user) await get().loadProfile().catch(() => undefined);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      set({
        session: nextSession,
        user: nextSession?.user ?? null,
        profile: null,
      });

      // Supabase requests must run outside the auth callback's internal lock.
      setTimeout(() => {
        void get().loadProfile().catch(() => undefined);
        void usePurchaseStore.getState().loadOwnedPackIds();
        void useCoinStore.getState().loadCoins();
      }, 0);
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
      await claimPendingGuestPacks();
      await usePurchaseStore.getState().loadOwnedPackIds();
      await useCoinStore.getState().loadCoins();
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true });

    try {
      const data = await signUpWithEmail(email, password);
      const signedInUser = data.session?.user ?? null;

      set({
        session: data.session,
        user: signedInUser,
        profile: null,
      });

      if (signedInUser) {
        await get().loadProfile();
        await claimPendingGuestPacks();
        await usePurchaseStore.getState().loadOwnedPackIds();
        await useCoinStore.getState().loadCoins();
      }

      return {
        needsEmailConfirmation: !data.session,
      };
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
    usePurchaseStore.setState({ ownedPackIds: [], isLoaded: false });
    useCoinStore.setState({ balance: 0, transactions: [], isLoaded: false });
    await ensureShopSession().catch(() => undefined);
    await usePurchaseStore.getState().loadOwnedPackIds();
  },

  loadProfile: async () => {
    const userId = get().user?.id;
    const profile = await fetchMyProfile();
    if (get().user?.id === userId) set({ profile });
  },

  isAdmin: () => {
    return get().profile?.role === "admin";
  },
}));
