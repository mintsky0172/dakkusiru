export interface CoinProduct {
    id: string; // 앱 내부 id
    productId: string; // 앱스토어/플레이콘솔 상품 id
    coinAmount: number;
    bonusAmount?: number;
    priceLabel: string;
    isRecommended?: boolean;
}

export interface CoinTransaction {
    id: string;
    type: 'charge' | 'spend';
    amount: number;
    description: string;
    createdAt: string;
}