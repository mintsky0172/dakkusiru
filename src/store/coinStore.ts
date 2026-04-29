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

