import { create } from "zustand";
import {
  loadOwnedPackIdsFromLocal,
} from "../services/localOwnedPackStorage";
import { acquirePack, cacheAccountPackIds, currentShopUserId, ensureShopSession, loadAccountPackIds, readCachedAccountPackIds } from "../services/packAcquisitionService";

let loadVersion = 0;

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
    const version = ++loadVersion;
    const userId = await currentShopUserId();
    const legacy = await loadOwnedPackIdsFromLocal();
    const cached = await readCachedAccountPackIds(userId);
    if (version !== loadVersion) return;
    set({ ownedPackIds: [...new Set([...legacy, ...cached])], isLoaded: true });
    let accountIds = cached;
    try {
      const account = await loadAccountPackIds();
      if (version !== loadVersion || account.userId !== await currentShopUserId()) return;
      accountIds = account.ids;
      await cacheAccountPackIds(account.userId, accountIds);
    } catch {
      // Offline editing continues with the last account cache and legacy packs.
    }
    const packIds = [...new Set([...legacy, ...accountIds])];
    if (version !== loadVersion) return;
    set({
      ownedPackIds: packIds,
      isLoaded: true,
    });
  },

  markPackAsOwned: async (packId: string) => {
    const session = await ensureShopSession();
    await acquirePack(packId);
    if (session.user.id !== await currentShopUserId()) return;
    ++loadVersion;
    const nextPackIds = [...new Set([...get().ownedPackIds, packId])];
    const legacy = await loadOwnedPackIdsFromLocal();
    await cacheAccountPackIds(session.user.id, nextPackIds.filter((id) => !legacy.includes(id)));

    set({
      ownedPackIds: nextPackIds,
      isLoaded: true,
    });
  },

  isPackOwned: (packId: string) => {
    return get().ownedPackIds.includes(packId);
  },
}));
