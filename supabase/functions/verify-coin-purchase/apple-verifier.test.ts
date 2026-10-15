import * as asn1js from "npm:asn1js@3.0.10";
import {
  BasicConstraints, BasicOCSPResponse, Certificate, CertID, Extension, GeneralName,
  InfoAccess, AccessDescription, OCSPRequest, OCSPResponse, ResponseBytes, ResponseData,
  SingleResponse, AttributeTypeAndValue, ExtKeyUsage, CRLDistributionPoints, DistributionPoint, setEngine,
} from "npm:pkijs@3.4.1";
import { SignJWT } from "npm:jose@6.1.0";
import { AppleSignatureError, AppleWebCryptoVerifier } from "./apple-verifier.ts";
import { AppleCryptoEngine } from "./crypto-engine.ts";

const b64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const oid = (id: string) => new Extension({ extnID: id, extnValue: new asn1js.Null().toBER(false) });

async function makeCertificate(name: string, serial: number, ca: boolean, issuer?: { cert: Certificate; keys: CryptoKeyPair }, namedCurve = "P-256") {
  const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve }, true, ["sign", "verify"]);
  const cert = new Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: serial });
  cert.subject.typesAndValues.push(new AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: name }) }));
  cert.issuer = issuer?.cert.subject ?? cert.subject;
  cert.notBefore.value = new Date(Date.now() - 3600000);
  cert.notAfter.value = new Date(Date.now() + 86400000);
  await cert.subjectPublicKeyInfo.importKey(keys.publicKey);
  cert.extensions = [new Extension({ extnID: "2.5.29.19", critical: true,
    extnValue: new BasicConstraints({ cA: ca }).toSchema().toBER(false) })];
  if (issuer) {
    cert.extensions.push(new Extension({ extnID: "2.5.29.31", extnValue: new CRLDistributionPoints({
      distributionPoints: [new DistributionPoint({ distributionPoint: [
        new GeneralName({ type: 6, value: "http://crl.apple.com/test.crl" }),
      ] })],
    }).toSchema().toBER(false) }));
    cert.extensions.push(new Extension({ extnID: "1.3.6.1.5.5.7.1.1", extnValue: new InfoAccess({
      accessDescriptions: [new AccessDescription({ accessMethod: "1.3.6.1.5.5.7.48.1",
        accessLocation: new GeneralName({ type: 6, value: "http://ocsp.apple.com/test" }) })],
    }).toSchema().toBER(false) }));
    cert.extensions.push(oid(ca ? "1.2.840.113635.100.6.2.1" : "1.2.840.113635.100.6.11.1"));
  }
  await cert.sign(issuer?.keys.privateKey ?? keys.privateKey, "SHA-256");
  return { cert: Certificate.fromBER(cert.toSchema(true).toBER(false)), keys };
}

async function rejected(promise: Promise<unknown>, expectedCode?: string) {
  try { await promise; } catch (error) {
    if (error instanceof AppleSignatureError) {
      if (expectedCode && ![`${expectedCode}_LEAF`, `${expectedCode}_CA`].includes(error.code)) {
        throw new Error(`Expected ${expectedCode}, got ${error.code}`);
      }
      return;
    }
    throw error;
  }
  throw new Error("Invalid signed transaction accepted");
}

for (const limitedRuntime of [false, true]) Deno.test(`Apple verification fails closed (limited crypto: ${limitedRuntime})`, async () => {
  const subtle = limitedRuntime ? new Proxy(crypto.subtle, { get(target, property) {
    if (property === "verify") return () => { throw new DOMException("Algorithm not supported", "NotSupportedError"); };
    if (property === "digest") return (algorithm: AlgorithmIdentifier, data: BufferSource) => {
      const name = typeof algorithm === "string" ? algorithm : algorithm.name;
      if (name === "SHA-1") throw new DOMException("Algorithm not supported", "NotSupportedError");
      return target.digest(algorithm, data);
    };
    const value = Reflect.get(target, property);
    return typeof value === "function" ? value.bind(target) : value;
  } }) : crypto.subtle;
  setEngine("test", new AppleCryptoEngine({ crypto, subtle }));
  const root = await makeCertificate("Root", 1, true, undefined, "P-384");
  const intermediate = await makeCertificate("Intermediate", 2, true, root);
  const leaf = await makeCertificate("Leaf", 3, false, intermediate);
  const untrusted = await makeCertificate("Other root", 4, true);
  const leafResponder = await makeCertificate("Leaf responder", 5, false, intermediate);
  const intermediateResponder = await makeCertificate("Intermediate responder", 6, false, root);
  for (const [responder, issuer] of [[leafResponder, intermediate], [intermediateResponder, root]]) {
    responder.cert.extensions!.push(new Extension({ extnID: "2.5.29.37",
      extnValue: new ExtKeyUsage({ keyPurposes: ["1.3.6.1.5.5.7.3.9"] }).toSchema().toBER(false) }));
    await responder.cert.sign(issuer.keys.privateKey, "SHA-256");
    responder.cert = Certificate.fromBER(responder.cert.toSchema(true).toBER(false));
  }
  const leafId = new CertID();
  await leafId.createForCertificate(leaf.cert, { issuerCertificate: intermediate.cert, hashAlgorithm: "SHA-256" });
  let mode = "good";
  let byKey = false;
  let calls = 0;
  const fetcher: typeof fetch = async (_url, options) => {
    calls++;
    if (mode === "network") throw new Error("offline");
    if (mode === "timeout") throw new DOMException("Timed out", "AbortError");
    if (mode === "http") return new Response(null, { status: 503 });
    if (mode === "malformed") return new Response("not an OCSP response");
    const request = OCSPRequest.fromBER(options!.body as ArrayBuffer);
    const id = request.tbsRequest.requestList[0].reqCert;
    let signer = mode.startsWith("delegated") ? (id.isEqual(leafId) ? leafResponder : intermediateResponder)
      : mode === "unauthorized" ? leaf
      : id.isEqual(leafId) ? intermediate : root;
    if (mode.startsWith("delegated-") && mode !== "delegated-forged") {
      const cert = Certificate.fromBER(signer.cert.toSchema(true).toBER(false));
      if (mode === "delegated-expired") cert.notAfter.value = new Date(Date.now() - 3600000);
      if (mode === "delegated-future") cert.notBefore.value = new Date(Date.now() + 3600000);
      if (mode === "delegated-no-eku") cert.extensions = cert.extensions!.filter(ext => ext.extnID !== "2.5.29.37");
      if (mode === "delegated-bad-ku") cert.extensions!.push(new Extension({ extnID: "2.5.29.15", critical: true,
        extnValue: new asn1js.BitString({ valueHex: new Uint8Array([0x04]).buffer }).toBER(false) }));
      if (mode === "delegated-wrong-issuer") cert.issuer = untrusted.cert.subject;
      await cert.sign(mode === "delegated-bad-cert-signature" || mode === "delegated-wrong-issuer"
        ? untrusted.keys.privateKey : id.isEqual(leafId) ? intermediate.keys.privateKey : root.keys.privateKey, "SHA-256");
      signer = { cert: Certificate.fromBER(cert.toSchema(true).toBER(false)), keys: signer.keys };
    }
    const now = Date.now();
    const responderID = byKey ? new asn1js.OctetString({ valueHex: await crypto.subtle.digest("SHA-1",
      new Uint8Array(signer.cert.subjectPublicKeyInfo.subjectPublicKey.valueBlock.valueHexView)) }) : signer.cert.subject;
    const response = new BasicOCSPResponse({
      tbsResponseData: new ResponseData({ responderID, producedAt: new Date(now),
        responses: [new SingleResponse({ certID: id,
          certStatus: mode === "revoked" ? new asn1js.Constructed({ idBlock: { tagClass: 3, tagNumber: 1 }, value: [new asn1js.GeneralizedTime({ valueDate: new Date(now - 1000) })] })
            : mode === "unknown" ? new asn1js.Primitive({ idBlock: { tagClass: 3, tagNumber: 2 } })
            : new asn1js.Primitive({ idBlock: { tagClass: 3, tagNumber: 0 } }),
          thisUpdate: new Date(now - 1000), nextUpdate: new Date(now + (mode === "stale" ? -3600000 : 3600000)),
        })] }),
      certs: [signer.cert],
    });
    await response.sign(mode === "forgedOCSP" || mode === "delegated-forged" ? untrusted.keys.privateKey : signer.keys.privateKey, "SHA-256");
    const envelope = new OCSPResponse({ responseStatus: new asn1js.Enumerated({ value: 0 }),
      responseBytes: new ResponseBytes({ responseType: "1.3.6.1.5.5.7.48.1.1",
        response: new asn1js.OctetString({ valueHex: response.toSchema().toBER(false) }) }) });
    return new Response(envelope.toSchema().toBER(false));
  };
  const roots = [b64(root.cert.toSchema(true).toBER(false))];
  const verifier = new AppleWebCryptoVerifier(roots, fetcher);
  const header = { alg: "ES256", x5c: [leaf, intermediate, root].map(item => b64(item.cert.toSchema(true).toBER(false))) };
  const token = await new SignJWT({ transactionId: "100", productId: "dakkusiru.coin_1000" })
    .setProtectedHeader(header).sign(leaf.keys.privateKey);
  const transaction = await verifier.verifyAndDecodeTransaction(token);
  if (transaction.transactionId !== "100" || calls !== 2) throw new Error("Verification did not complete");
  mode = "delegated";
  await verifier.verifyAndDecodeTransaction(token);
  byKey = true;
  await verifier.verifyAndDecodeTransaction(token);
  mode = "good";
  await verifier.verifyAndDecodeTransaction(token);
  for (const [failure, reason] of [
    ["delegated-expired", "EXPIRED"], ["delegated-future", "NOT_YET_VALID"],
    ["delegated-no-eku", "EKU_MISSING"], ["delegated-bad-ku", "KEY_USAGE_INVALID"],
    ["delegated-wrong-issuer", "ISSUER_MISMATCH"],
    ["delegated-bad-cert-signature", "CERT_SIGNATURE_INVALID"],
  ]) {
    mode = failure;
    await rejected(verifier.verifyAndDecodeTransaction(token), `APPLE_OCSP_RESPONDER_${reason}_FAILED`);
  }
  for (const [failure, code] of [
    ["network", "APPLE_OCSP_NETWORK_FAILED"],
    ["timeout", "APPLE_OCSP_TIMEOUT_FAILED"],
    ["http", "APPLE_OCSP_HTTP_503"],
    ["malformed", "APPLE_OCSP_PARSE_FAILED"],
  ]) {
    mode = failure;
    await rejected(verifier.verifyAndDecodeTransaction(token), code);
  }
  for (const failure of ["revoked", "unknown", "stale", "network", "forgedOCSP", "unauthorized",
    "delegated-expired", "delegated-future", "delegated-no-eku", "delegated-bad-ku",
    "delegated-wrong-issuer", "delegated-bad-cert-signature", "delegated-forged"]) {
    mode = failure;
    await rejected(verifier.verifyAndDecodeTransaction(token));
  }
  mode = "good";
  await rejected(new AppleWebCryptoVerifier([b64(untrusted.cert.toSchema(true).toBER(false))], fetcher).verifyAndDecodeTransaction(token));
  const forged = await new SignJWT({ transactionId: "100" }).setProtectedHeader(header).sign(untrusted.keys.privateKey);
  await rejected(verifier.verifyAndDecodeTransaction(forged));
  await rejected(verifier.verifyAndDecodeTransaction("eyJhbGciOiJub25lIn0.e30."));
  leaf.cert.notAfter.value = new Date(Date.now() - 86400000);
  await leaf.cert.sign(intermediate.keys.privateKey, "SHA-256");
  const expired = await new SignJWT({ transactionId: "100" }).setProtectedHeader({ ...header,
    x5c: [b64(leaf.cert.toSchema(true).toBER(false)), ...header.x5c.slice(1)] }).sign(leaf.keys.privateKey);
  await rejected(verifier.verifyAndDecodeTransaction(expired));
});
