import { createClient } from "npm:@supabase/supabase-js@2.105.1";
import { COIN_PRODUCTS, validateAppleTransaction } from "./validation.ts";
import { normalizeAppleSigningKey } from "./signing-key.ts";
import { AppleLookupError, lookupAppleTransaction } from "./apple-api.ts";
import { AppleSignatureError, AppleWebCryptoVerifier } from "./apple-verifier.ts";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};
const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers });
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error("BILLING_NOT_CONFIGURED");
  return value;
};

async function appleConfig() {
  if (env("APPLE_BILLING_ENABLED") !== "true") throw new Error("BILLING_DISABLED");
  const environment = env("APPLE_ENVIRONMENT");
  if (environment !== "Sandbox" && environment !== "Production") throw new Error("INVALID_ENVIRONMENT");
  const bundleId = env("APPLE_BUNDLE_ID");
  const appAppleId = Deno.env.get("APPLE_APP_ID") ? Number(env("APPLE_APP_ID")) : undefined;
  if (environment === "Production" && (!Number.isSafeInteger(appAppleId) || appAppleId! <= 0)) throw new Error("INVALID_APP_ID");
  const rootData: unknown = JSON.parse(env("APPLE_ROOT_CERTIFICATES_JSON"));
  if (!Array.isArray(rootData) || !rootData.length || !rootData.every(x => typeof x === "string" && x.length > 0)) throw new Error("INVALID_ROOT_CERTIFICATES");
  const verifier = new AppleWebCryptoVerifier(rootData);
  const key = await normalizeAppleSigningKey(env("APPLE_PRIVATE_KEY"));
  return { environment, bundleId, verifier, key, keyId: env("APPLE_KEY_ID"), issuerId: env("APPLE_ISSUER_ID") };
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "GET" && request.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  let stage = "REQUEST";
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply({ error: "AUTH_REQUIRED" }, 401);
    const userClient = createClient(env("SUPABASE_URL"), env("SUPABASE_ANON_KEY"), { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return reply({ error: "AUTH_REQUIRED" }, 401);
    let config: Awaited<ReturnType<typeof appleConfig>>;
    try { config = await appleConfig(); }
    catch (error) {
      const code = error instanceof Error && error.message === "APPLE_PRIVATE_KEY_INVALID"
        ? error.message : "BILLING_NOT_CONFIGURED";
      console.error("coin-billing-configuration", { code });
      return reply({ enabled: false, error: code }, request.method === "GET" ? 200 : 503);
    }
    const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
    if (request.method === "GET") {
      const { data, error } = await admin.rpc("apple_coin_billing_ready");
      return reply({ enabled: !error && data === true, platform: "ios" });
    }
    const body = await request.json();
    if (body.platform !== "ios" || typeof body.transactionId !== "string" ||
        !/^[0-9]{1,64}$/.test(body.transactionId) || !COIN_PRODUCTS.has(body.productId)) {
      return reply({ error: "INVALID_PURCHASE_REQUEST" }, 400);
    }
    // Fetch the current store record so revoked transactions are rejected.
    stage = "APPLE_LOOKUP";
    const signedTransaction = await lookupAppleTransaction(config, body.transactionId);
    stage = "APPLE_SIGNATURE";
    const transaction = await config.verifier.verifyAndDecodeTransaction(signedTransaction);
    stage = "APPLE_TRANSACTION";
    const verified = validateAppleTransaction(transaction, { transactionId: body.transactionId, productId: body.productId, bundleId: config.bundleId, environment: config.environment });
    const { data, error } = await admin.rpc("fulfill_apple_coin_purchase", {
      p_request_user: user.id, p_owner: verified.owner, p_transaction_id: body.transactionId,
      p_product_id: transaction.productId, p_environment: transaction.environment, p_quantity: verified.quantity,
    });
    if (error) {
      const reason = ["PURCHASE_OWNER_MISMATCH", "OWNERSHIP_CHANGED_RETRY", "TRANSACTION_CONFLICT", "INVALID_PRODUCT", "INVALID_PURCHASE"]
        .find(code => error.message.includes(code)) ?? (error.code === "PGRST202" ? "CREDIT_FUNCTION_MISSING" : "CREDIT_NOT_COMPLETED");
      console.error("coin-credit-failed", { code: reason, dbCode: error.code });
      return reply({ error: reason }, 409);
    }
    return reply(data);
  } catch (error) {
    // Only controlled stage names and numeric status codes leave the server.
    const failure = error instanceof Error ? error : null;
    const keyFailure = failure && /secretOrPrivateKey|asymmetric key|ES256|PEM|DECODER|key material/.test(failure.message);
    const code = error instanceof AppleLookupError
      ? `APPLE_LOOKUP_${error.httpStatusCode}_${error.apiError ?? 0}`
      : error instanceof AppleSignatureError ? error.code
      : stage === "APPLE_LOOKUP" && keyFailure ? "APPLE_SIGNING_FAILED"
      : stage === "APPLE_LOOKUP" && failure?.name === "FetchError" ? "APPLE_NETWORK_FAILED"
      : stage === "APPLE_LOOKUP" && failure && /not implemented|not supported/i.test(failure.message) ? "APPLE_RUNTIME_UNSUPPORTED"
      : stage === "APPLE_LOOKUP" && failure?.message === "Unexpected response body format" ? "APPLE_RESPONSE_INVALID"
      : `${stage}_${failure?.name === "TypeError" ? "TYPE_ERROR" : "FAILED"}`;
    console.error("coin-verification-failed", { code });
    return reply({ error: code }, 422);
  }
});
