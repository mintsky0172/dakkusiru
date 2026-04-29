import { create } from "zustand";
import { CoinTransaction } from "../types/coin";
import {
  addCoinTransactionToLocal,
  loadCoinBalanceFromLocal,
  loadCoinTransactionsFromLocal,
  saveCoinBalanceToLocal,
} from "../services/localCoinStorage";

interface CoinStore {
  balance: number;
  transactions: CoinTransaction[];
  isLoaded: boolean;

  loadCoins: () => Promise<void>;
  chargeCoins: (payload: {
    amount: number;
    description: string;
  }) => Promise<void>;
  spendCoins: (payload: {
    amount: number;
    description: string;
  }) => Promise<boolean>;
}

function createTransaction(
  payload: Omit<CoinTransaction, "id" | "createdAt">,
): CoinTransaction {
  return {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
}

export const useCoinStore = create<CoinStore>((set, get) => ({
  balance: 0,
  transactions: [],
  isLoaded: false,

  loadCoins: async () => {
    const [balance, transactions] = await Promise.all([
      loadCoinBalanceFromLocal(),
      loadCoinTransactionsFromLocal(),
    ]);

    set({
      balance,
      transactions,
      isLoaded: true,
    });
  },

  chargeCoins: async ({ amount, description }) => {
    const current = get().balance;
    const nextBalance = current + amount;

    const transaction = createTransaction({
      type: "charge",
      amount,
      description,
    });

    const nextTransactions = await addCoinTransactionToLocal(transaction);
    await saveCoinBalanceToLocal(nextBalance);

    set({
      balance: nextBalance,
      transactions: nextTransactions,
      isLoaded: true,
    });
  },

  spendCoins: async ({ amount, description }) => {
    const current = get().balance;

    if (current < amount) {
      return false;
    }

    const nextBalance = current - amount;

    const transaction = createTransaction({
      type: "spend",
      amount: -amount,
      description,
    });

    const nextTransactions = await addCoinTransactionToLocal(transaction);
    await saveCoinBalanceToLocal(nextBalance);

    set({
      balance: nextBalance,
      transactions: nextTransactions,
      isLoaded: true,
    });

    return true;
  },
}));
