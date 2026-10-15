import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { currentShopUserId } from "../services/packAcquisitionService";
import { CoinTransaction } from "../types/coin";

interface CoinStore {
  balance: number;
  transactions: CoinTransaction[];
  isLoaded: boolean;

  loadCoins: () => Promise<void>;
}

let loadVersion = 0;

export const useCoinStore = create<CoinStore>((set) => ({
  balance: 0,
  transactions: [],
  isLoaded: false,

  loadCoins: async () => {
    const version = ++loadVersion;
    const userId = await currentShopUserId();
    let balance = userId ? Number(await AsyncStorage.getItem(`dakku_server_coins_${userId}`)) || 0 : 0;
    if (userId) {
      const { data, error } = await supabase.from("coin_wallets").select("balance").eq("user_id", userId).maybeSingle();
      if (!error) {
        balance = Number(data?.balance ?? 0);
        await AsyncStorage.setItem(`dakku_server_coins_${userId}`, String(balance));
      }
    }
    if (version !== loadVersion || userId !== await currentShopUserId()) return;

    set({
      balance,
      transactions: [],
      isLoaded: true,
    });
  },

}));
