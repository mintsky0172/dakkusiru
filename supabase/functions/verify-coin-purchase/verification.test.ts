import { Environment, SignedDataVerifier } from "npm:@apple/app-store-server-library@3.1.0";
import { importSPKI, jwtVerify } from "npm:jose@6.1.0";
import { generateKeyPairSync } from "node:crypto";
import { normalizeAppleSigningKey } from "./signing-key.ts";
import { AppleLookupError, lookupAppleTransaction } from "./apple-api.ts";

Deno.test("Apple signing keys accept PEM and escaped newlines, reject malformed and RSA keys", async () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pem = privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  for (const raw of [pem, pem.replace(/\n/g, "\\n")]) {
    const key = await normalizeAppleSigningKey(raw);
    if (key.type !== "private" || key.algorithm.name !== "ECDSA") throw new Error("Key normalization failed");
  }
  const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey.export({ format: "pem", type: "pkcs8" }).toString();
  for (const invalid of ["", "SubscriptionKey_example.p8", btoa(pem), rsa]) {
    let rejected = false;
    try { await normalizeAppleSigningKey(invalid); } catch { rejected = true; }
    if (!rejected) throw new Error("Invalid key accepted");
  }
});

Deno.test("Web Crypto signs Apple JWT claims and native fetch routes only to Apple", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const key = await normalizeAppleSigningKey(privateKey.export({ format: "pem", type: "pkcs8" }).toString());
  const publicCryptoKey = await importSPKI(publicKey.export({ format: "pem", type: "spki" }).toString(), "ES256");
  const config = { key, keyId: "test-key", issuerId: "test-issuer", bundleId: "com.mintsky0172.dakkusiru", environment: "Sandbox" };
  const result = await lookupAppleTransaction(config, "100", async (url, options) => {
    if (url !== "https://api.storekit-sandbox.apple.com/inApps/v1/transactions/100") throw new Error("Wrong Apple host");
    const token = new Headers(options?.headers).get("Authorization")!.slice(7);
    const { payload, protectedHeader } = await jwtVerify(token, publicCryptoKey, { audience: "appstoreconnect-v1", issuer: "test-issuer" });
    if (protectedHeader.kid !== config.keyId || payload.bid !== config.bundleId) throw new Error("Invalid Apple claims");
    if (payload.exp! - payload.iat! !== 300) throw new Error("Invalid expiration");
    return new Response(JSON.stringify({ signedTransactionInfo: "test" }));
  });
  if (result !== "test") throw new Error("Missing Apple response");
  let rejected = false;
  try {
    await lookupAppleTransaction(config, "100", async () => new Response(JSON.stringify({ errorCode: 4040010 }), { status: 404 }));
  } catch (error) { rejected = error instanceof AppleLookupError && error.apiError === 4040010; }
  if (!rejected) throw new Error("Apple error was not classified");
});

Deno.test("Apple verifier rejects unsigned client-generated transaction JSON", async () => {
  const verifier = new SignedDataVerifier([], true, Environment.SANDBOX, "com.mintsky0172.dakkusiru");
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const forged = `${encode({ alg: "none" })}.${encode({
    transactionId: "100", productId: "dakkusiru.coin_1000",
    appAccountToken: "00000000-0000-0000-0000-000000000001",
    bundleId: "com.mintsky0172.dakkusiru", environment: "Sandbox",
  })}.`;
  let rejected = false;
  try { await verifier.verifyAndDecodeTransaction(forged); }
  catch { rejected = true; }
  if (!rejected) throw new Error("Forged receipt was accepted");
});
