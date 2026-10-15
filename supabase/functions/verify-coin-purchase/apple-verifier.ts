import * as asn1js from "npm:asn1js@3.0.10";
import {
  BasicOCSPResponse, Certificate, CertificateChainValidationEngine,
  ExtKeyUsage, InfoAccess, OCSPRequest, OCSPResponse, RelativeDistinguishedNames, setEngine,
} from "npm:pkijs@3.4.1";
import { decodeProtectedHeader, importSPKI, jwtVerify } from "npm:jose@6.1.0";
import type { AppleTransaction } from "./validation.ts";
import { AppleCryptoEngine, sha1 } from "./crypto-engine.ts";

setEngine("webcrypto", new AppleCryptoEngine({ crypto: globalThis.crypto, subtle: globalThis.crypto.subtle }));

export class AppleSignatureError extends Error {
  constructor(public code: string, options?: ErrorOptions) { super(code, options); }
}
function fail(code: string): never { throw new AppleSignatureError(code); }
const binary = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const base64 = (value: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(value)));

function certificate(bytes: Uint8Array) {
  const text = new TextDecoder().decode(bytes);
  if (text.includes("-----BEGIN CERTIFICATE-----")) {
    bytes = binary(text.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s/g, ""));
  }
  return Certificate.fromBER(new Uint8Array(bytes).buffer);
}

function checkDates(cert: Certificate, now: Date) {
  if (cert.notBefore.value > now || cert.notAfter.value < now) fail("APPLE_CERTIFICATE_EXPIRED");
}

async function delegatedResponderError(cert: Certificate, issuer: Certificate, now: Date): Promise<string | null> {
  if (!cert.issuer.isEqual(issuer.subject)) return "ISSUER_MISMATCH";
  if (cert.notBefore.value > now) return "NOT_YET_VALID";
  if (cert.notAfter.value < now) return "EXPIRED";
  const eku = cert.extensions?.find(ext => ext.extnID === "2.5.29.37");
  if (!eku) return "EKU_MISSING";
  const purposes = new ExtKeyUsage({ schema: asn1js.fromBER(eku.extnValue.valueBlock.valueHexView).result });
  if (!purposes.keyPurposes.includes("1.3.6.1.5.5.7.3.9")) return "EKU_INVALID";
  const usage = cert.extensions?.find(ext => ext.extnID === "2.5.29.15");
  if (usage) {
    const bits = asn1js.fromBER(usage.extnValue.valueBlock.valueHexView).result;
    if (!(bits instanceof asn1js.BitString) || !(bits.valueBlock.valueHexView[0] & 0x80)) return "KEY_USAGE_INVALID";
  }
  return await cert.verify(issuer) ? null : "CERT_SIGNATURE_INVALID";
}

async function matchesResponder(cert: Certificate, id: BasicOCSPResponse["tbsResponseData"]["responderID"]) {
  if (id instanceof RelativeDistinguishedNames) return cert.subject.isEqual(id);
  if (!(id instanceof asn1js.OctetString)) return false;
  // RFC 6960 responderID.byKey is always SHA-1, regardless of the signature algorithm.
  const hash = sha1(cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView);
  const expected = id.valueBlock.valueHexView;
  return hash.length === expected.length && hash.every((value, index) => value === expected[index]);
}

export class AppleWebCryptoVerifier {
  private roots: Certificate[];
  constructor(roots: string[], private fetcher: typeof fetch = fetch) {
    this.roots = roots.map(value => certificate(binary(value)));
    if (!this.roots.length) fail("APPLE_TRUST_ROOTS_MISSING");
  }

  async verifyAndDecodeTransaction(jws: string) {
    try {
      const header = decodeProtectedHeader(jws);
      if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length !== 3 ||
          !header.x5c.every(value => typeof value === "string")) fail("APPLE_JWS_HEADER_INVALID");
      const leaf = certificate(binary(header.x5c[0]));
      const intermediate = certificate(binary(header.x5c[1]));
      const now = new Date();
      checkDates(leaf, now);
      checkDates(intermediate, now);
      if (!leaf.extensions?.some(ext => ext.extnID === "1.2.840.113635.100.6.11.1") ||
          !intermediate.extensions?.some(ext => ext.extnID === "1.2.840.113635.100.6.2.1")) {
        fail("APPLE_CERTIFICATE_PURPOSE_INVALID");
      }
      const chain = new CertificateChainValidationEngine({ trustedCerts: this.roots, certs: [intermediate, leaf], checkDate: now });
      // Certificate signatures/policies are checked here; revocation is checked explicitly below.
      const result = await chain.verify({ passedWhenNotRevValues: true });
      if (!result.result) fail("APPLE_CERTIFICATE_CHAIN_INVALID");
      let root: Certificate | undefined;
      for (const candidate of this.roots) {
        if (intermediate.issuer.isEqual(candidate.subject) && await intermediate.verify(candidate)) { root = candidate; break; }
      }
      if (!root) fail("APPLE_CERTIFICATE_CHAIN_INVALID");
      checkDates(root, now);
      const spki = leaf.subjectPublicKeyInfo.toSchema().toBER(false);
      const publicKey = await importSPKI(`-----BEGIN PUBLIC KEY-----\n${base64(spki)}\n-----END PUBLIC KEY-----`, "ES256");
      const { payload } = await jwtVerify<AppleTransaction>(jws, publicKey, { algorithms: ["ES256"] });
      await Promise.all([this.checkOCSP(leaf, intermediate, now, "LEAF"), this.checkOCSP(intermediate, root, now, "CA")]);
      return payload;
    } catch (error) {
      if (error instanceof AppleSignatureError) throw error;
      fail("APPLE_SIGNATURE_INVALID");
    }
  }

  private async checkOCSP(cert: Certificate, issuer: Certificate, now: Date, target = "CA") {
    let stage = "REQUEST";
    try {
      const extension = cert.extensions?.find(ext => ext.extnID === "1.3.6.1.5.5.7.1.1");
      if (!extension) fail("APPLE_OCSP_URL_MISSING");
      const info = new InfoAccess({ schema: asn1js.fromBER(extension.extnValue.valueBlock.valueHexView).result });
      const location = info.accessDescriptions.find(item => item.accessMethod === "1.3.6.1.5.5.7.48.1" && item.accessLocation.type === 6)?.accessLocation.value;
      if (typeof location !== "string") fail("APPLE_OCSP_URL_MISSING");
      const url = new URL(location);
      if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port ||
          !(url.hostname.endsWith(".apple.com") || url.hostname.endsWith(".apple.com.cn"))) fail("APPLE_OCSP_URL_INVALID");
      const request = new OCSPRequest();
      await request.createForCertificate(cert, { issuerCertificate: issuer, hashAlgorithm: "SHA-256" });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      let bytes: ArrayBuffer;
      try {
        stage = "NETWORK";
        const response = await this.fetcher(url.toString(), {
          method: "POST", headers: { "Content-Type": "application/ocsp-request" },
          body: request.toSchema(true).toBER(false), signal: controller.signal, redirect: "error",
        });
        if (!response.ok) fail(`APPLE_OCSP_HTTP_${response.status}_${target}`);
        bytes = await response.arrayBuffer();
      } finally { clearTimeout(timer); }
      stage = "PARSE";
      const response = OCSPResponse.fromBER(bytes);
      if (response.responseStatus.valueBlock.valueDec !== 0 || response.responseBytes?.responseType !== "1.3.6.1.5.5.7.48.1.1") fail("APPLE_OCSP_RESPONSE_INVALID");
      const basic = BasicOCSPResponse.fromBER(new Uint8Array(response.responseBytes.response.valueBlock.valueHexView).buffer);
      stage = "VERIFY";
      // Apple authorizes the issuer itself or its directly issued OCSP signing delegate.
      // Pin only independently validated delegates, avoiding generic path rebuilding.
      const responders = [issuer];
      let rejection = "MISSING";
      let found = await matchesResponder(issuer, basic.tbsResponseData.responderID);
      for (const candidate of basic.certs ?? []) {
        if (!await matchesResponder(candidate, basic.tbsResponseData.responderID)) continue;
        const reason = await delegatedResponderError(candidate, issuer, now);
        if (reason) { rejection = reason; continue; }
        responders.push(candidate);
        found = true;
      }
      if (!found) fail(`APPLE_OCSP_RESPONDER_${rejection}_FAILED_${target}`);
      basic.certs = responders;
      if (!await basic.verify({ issuerCerts: [issuer], trustedResponders: responders })) fail("APPLE_OCSP_SIGNATURE_INVALID");
      stage = "STATUS";
      const status = await basic.getCertificateStatus(cert, issuer);
      if (!status.isForCertificate || status.status !== 0) fail("APPLE_CERTIFICATE_REVOKED");
      const entry = basic.tbsResponseData.responses.find(item => item.certID.isEqual(request.tbsRequest.requestList[0].reqCert));
      const skew = 60000;
      if (!entry?.nextUpdate || entry.thisUpdate.getTime() > now.getTime() + skew ||
          entry.nextUpdate.getTime() < now.getTime() - skew ||
          basic.tbsResponseData.producedAt.getTime() > now.getTime() + skew) fail("APPLE_OCSP_STALE");
    } catch (error) {
      if (error instanceof AppleSignatureError) throw error;
      // Expose only fixed classifications, never raw certificates, receipts or upstream messages.
      const message = error instanceof Error ? error.message : "";
      const reason = stage === "NETWORK" && error instanceof Error && error.name === "AbortError" ? "TIMEOUT"
        : stage === "VERIFY" && /Validation of signer's certificate chain failed/.test(message) ? "RESPONDER_CHAIN"
        : stage === "VERIFY" && /No certificate matching/.test(message) ? "RESPONDER_MISSING"
        : stage === "VERIFY" && /not authorized/.test(message) ? "RESPONDER_UNAUTHORIZED"
        : stage === "VERIFY" && /not supported|not implemented|Unrecognized|Unsupported/i.test(message) ? "RUNTIME_UNSUPPORTED"
        : stage;
      throw new AppleSignatureError(`APPLE_OCSP_${reason}_FAILED_${target}`, { cause: error });
    }
  }
}
