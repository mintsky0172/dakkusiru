export interface CoinProduct {
    id: string;
    coinAmount: number;
    priceLabel: string;
    bonusLabel?: string;
    isRecommended?: boolean;
}