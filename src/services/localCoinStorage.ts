import AsyncStorage from "@react-native-async-storage/async-storage";
import { CoinTransaction } from "../types/coin";

const COIN_BALANCE_KEY = "dakku_siru_coin_balance";
const COIN_TRANSACTIONS_KEY = "dakku_siru_coin_transactions";

export async function loadCoinBalanceFromLocal(): Promise<number> {
  const raw = await AsyncStorage.getItem(COIN_BALANCE_KEY);
  const value = raw ? Number(raw) : 0;

  return Number.isFinite(value) ? value : 0;
}

export async function saveCoinBalanceToLocal(balance: number) {
  await AsyncStorage.setItem(COIN_BALANCE_KEY, String(Math.max(0, balance)));
}

export async function loadCoinTransactionsFromLocal(): Promise<
  CoinTransaction[]
> {
  const raw = await AsyncStorage.getItem(COIN_TRANSACTIONS_KEY);

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addCoinTransactionToLocal(
  transaction: CoinTransaction,
): Promise<CoinTransaction[]> {
  const current = await loadCoinTransactionsFromLocal();
  const next = [transaction, ...current];
  await AsyncStorage.setItem(COIN_TRANSACTIONS_KEY, JSON.stringify(next));
  return next;
}
