import { ensureShopSession } from "../packAcquisitionService";

async function requestBilling(method: "GET" | "POST", body?: Record<string, string>) {
  const session = await ensureShopSession();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/verify-coin-purchase`, {
      method,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) {
      const code = typeof data.error === "string" && /^[A-Z0-9_]{1,80}$/.test(data.error)
        ? data.error : `HTTP_${response.status}`;
      throw new Error(`충전 확인을 완료하지 못했어요. 추가 결제하지 말고 ‘충전 확인 다시 시도’를 눌러 주세요.\n\n확인 코드: ${code}`);
    }
    return { data, userId: session.user.id };
  } finally {
    clearTimeout(timeout);
  }
}

export async function isAppleBillingReady() {
  try { return (await requestBilling("GET")).data.enabled === true; }
  catch { return false; }
}

export async function verifyAppleCoinPurchase(transactionId: string, productId: string) {
  const { data, userId } = await requestBilling("POST", { platform: "ios", transactionId, productId });
  if (typeof data.alreadyCredited !== "boolean" || !Number.isSafeInteger(data.balance) || data.balance < 0 ||
      !Number.isSafeInteger(data.amount) || data.amount <= 0) throw new Error("충전 응답을 확인하지 못했어요. 다시 시도해 주세요.");
  return { alreadyCredited: data.alreadyCredited as boolean, balance: data.balance as number, amount: data.amount as number, userId };
}
