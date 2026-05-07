import { create } from "zustand";
import { ShopPack } from "../types/shop";
import { fetchShopPacksFromSupabase } from "../services/supabase/queries/packs";

interface ShopPackStore {
  packs: ShopPack[];
  isLoading: boolean;
  errorMessage: string | null;
  loadPacks: (params?: { includeInactive?: boolean }) => Promise<void>;
}

export const useShopPackStore = create<ShopPackStore>((set) => ({
  packs: [],
  isLoading: false,
  errorMessage: null,

  loadPacks: async (params) => {
    set({ isLoading: true, errorMessage: null });

    try {
      const packs = await fetchShopPacksFromSupabase(params);
      set({ packs, isLoading: false });
    } catch (error) {
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
