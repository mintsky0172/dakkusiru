import { create } from "zustand";
import {
  addOwnedPackIdToLocal,
  loadOwnedPackIdsFromLocal,
} from "../services/localOwnedPackStorage";

interface PurchaseStore {
  ownedPackIds: string[];
  isLoaded: boolean;

  loadOwnedPackIds: () => Promise<void>;
  markPackAsOwned: (packId: string) => Promise<void>;
  isPackOwned: (packId: string) => boolean;
}

export const usePurchaseStore = create<PurchaseStore>((set, get) => ({
  ownedPackIds: [],
  isLoaded: false,

  loadOwnedPackIds: async () => {
    const packIds = await loadOwnedPackIdsFromLocal();

    set({
      ownedPackIds: packIds,
      isLoaded: true,
    });
  },

  markPackAsOwned: async (packId: string) => {
    const nextPackIds = await addOwnedPackIdToLocal(packId);

    set({
      ownedPackIds: nextPackIds,
      isLoaded: true,
    });
  },

  isPackOwned: (packId: string) => {
    return get().ownedPackIds.includes(packId);
  },
}));
