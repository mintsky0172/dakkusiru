import { CoinProduct } from "../types/coin";

export const mockCoinProducts: CoinProduct[] = [
  {
    id: "coin_1000",
    productId: 'dakkusiru.coin_1000',
    coinAmount: 1000,
    priceLabel: "₩1,100",
  },
  {
    id: "coin_3000",
    productId: 'dakkusiru.coin_3000',
    coinAmount: 3000,
    priceLabel: "₩3,300",
  },
  {
    id: "coin_5000",
    productId: 'dakkusiru.coin_5000',
    coinAmount: 5000,
    priceLabel: "₩5,500",
    bonusAmount: 500,
    isRecommended: true,
  },
  {
    id: "coin_10000",
    productId: 'dakkusiru.coin_10000',
    coinAmount: 10000,
    priceLabel: "₩11,000",
    bonusAmount: 1500,
  }
];
