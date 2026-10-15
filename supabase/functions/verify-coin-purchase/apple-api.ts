import { SignJWT } from "npm:jose@6.1.0";
import type { normalizeAppleSigningKey } from "./signing-key.ts";

export class AppleLookupError extends Error {
  constructor(public httpStatusCode: number, public apiError = 0) { super("APPLE_LOOKUP_ERROR"); }
}

export async function lookupAppleTransaction(
  config: { key: Awaited<ReturnType<typeof normalizeAppleSigningKey>>; keyId: string; issuerId: string; bundleId: string; environment: string },
  transactionId: string,
  fetcher: typeof fetch = fetch,
) {
  const token = await new SignJWT({ bid: config.bundleId })
    .setProtectedHeader({ alg: "ES256", kid: config.keyId, typ: "JWT" })
    .setIssuer(config.issuerId).setAudience("appstoreconnect-v1")
    .setIssuedAt().setExpirationTime("5m").sign(config.key);
  const host = config.environment === "Sandbox" ? "https://api.storekit-sandbox.apple.com" : "https://api.storekit.apple.com";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetcher(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: controller.signal,
      redirect: "error",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new AppleLookupError(response.status, Number.isSafeInteger(body?.errorCode) ? body.errorCode : 0);
    if (typeof body?.signedTransactionInfo !== "string" || !body.signedTransactionInfo) throw new Error("APPLE_RESPONSE_INVALID");
    return body.signedTransactionInfo as string;
  } finally { clearTimeout(timer); }
}
