import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShopPack } from "../types/shop";
import { fetchShopPacksFromSupabase } from "../services/supabase/queries/packs";
import { updateAdminPackActive } from "../services/adminShopPackService";

interface ShopPackStore {
  packs: ShopPack[];
  isLoading: boolean;
  errorMessage: string | null;
  loadPacks: (params?: { includeInactive?: boolean }) => Promise<void>;
  setPackActive: (packId: string, isActive: boolean) => Promise<void>;
}

export const useShopPackStore = create<ShopPackStore>((set) => ({
  packs: [],
  isLoading: false,
  errorMessage: null,

  setPackActive: async (packId, isActive) => {
    const updated = await updateAdminPackActive(packId, isActive);
    set((state) => ({
      packs: state.packs.map((pack) =>
        pack.id === updated.id ? { ...pack, isActive: updated.is_active } : pack,
      ),
    }));
  },

  loadPacks: async (params) => {
    const cacheKey = params?.includeInactive ? "dakku_admin_catalog" : "dakku_shop_catalog";
    set({ isLoading: true, errorMessage: null });

    try {
      const packs = await fetchShopPacksFromSupabase(params);
      set({ packs, isLoading: false });
      await AsyncStorage.setItem(cacheKey, JSON.stringify(packs)).catch(() => undefined);
    } catch (error) {
      const cached = await AsyncStorage.getItem(cacheKey).catch(() => null);
      if (cached) {
        try {
          const packs = JSON.parse(cached);
          if (Array.isArray(packs)) {
            set({ packs, isLoading: false });
            return;
          }
        } catch { /* Keep the load error when the cache is malformed. */ }
      }
      set({
        isLoading: false,
        errorMessage:
          error instanceof Error
            ? error.message
            : "팩 정보를 불러오지 못했어요.",
      });
    }
  },
}));
