export const COIN_PRODUCTS = new Set([
  "dakkusiru.coin_1000", "dakkusiru.coin_3000", "dakkusiru.coin_5000", "dakkusiru.coin_10000",
]);

export interface AppleTransaction {
  transactionId?: string;
  productId?: string;
  bundleId?: string;
  environment?: string;
  appAccountToken?: string;
  type?: string;
  quantity?: number;
  revocationDate?: number;
  revocationReason?: number;
  inAppOwnershipType?: string;
}

// Input must already be verified by Apple's SignedDataVerifier, never decoded client JSON.
export function validateAppleTransaction(
  transaction: AppleTransaction,
  expected: { transactionId: string; productId: string; bundleId: string; environment: string },
) {
  if (transaction.transactionId !== expected.transactionId || transaction.productId !== expected.productId ||
      transaction.bundleId !== expected.bundleId || transaction.environment !== expected.environment ||
      !COIN_PRODUCTS.has(expected.productId) || transaction.type !== "Consumable" ||
      transaction.revocationDate != null || transaction.revocationReason != null ||
      transaction.inAppOwnershipType !== "PURCHASED" ||
      !transaction.appAccountToken || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transaction.appAccountToken) ||
      !Number.isInteger(transaction.quantity) || transaction.quantity! < 1 || transaction.quantity! > 10) {
    throw new Error("INVALID_APPLE_TRANSACTION");
  }
  return { owner: transaction.appAccountToken.toLowerCase(), quantity: transaction.quantity! };
}
