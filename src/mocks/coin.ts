import { CoinProduct } from "../types/coin";

export const mockCoinBalance = 10000;

export const mockCoinProducts: CoinProduct[] = [
  {
    id: "coin_1000",
    coinAmount: 1000,
    priceLabel: "₩1,100",
  },
  {
    id: "coin_5000",
    coinAmount: 5000,
    priceLabel: "₩5,500",
  },
  {
    id: "coin_10000",
    coinAmount: 10000,
    priceLabel: "₩11,000",
    bonusLabel: "+500코인 보너스",
  },
];
