import { importPKCS8 } from "npm:jose@6.1.0";

export async function normalizeAppleSigningKey(raw: string) {
  try {
    const pem = raw.trim().replace(/\\n/g, "\n");
    return await importPKCS8(pem, "ES256");
  } catch {
    throw new Error("APPLE_PRIVATE_KEY_INVALID");
  }
}
