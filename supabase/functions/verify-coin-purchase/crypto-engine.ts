import * as asn1js from "npm:asn1js@3.0.10";
import { AlgorithmIdentifier, CryptoEngine, PublicKeyInfo } from "npm:pkijs@3.4.1";
import { p256, p384, p521 } from "npm:@noble/curves@2.0.1/nist.js";
import { sha1 } from "npm:@noble/hashes@2.0.1/legacy.js";
import { sha256, sha384, sha512 } from "npm:@noble/hashes@2.0.1/sha2.js";

export { sha1 };

const curves = { "1.2.840.10045.3.1.7": p256, "1.3.132.0.34": p384, "1.3.132.0.35": p521 };
const hashes = { "SHA-1": sha1, "SHA-256": sha256, "SHA-384": sha384, "SHA-512": sha512 };

export class AppleCryptoEngine extends CryptoEngine {
  override async digest(algorithm: globalThis.AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
    const name = typeof algorithm === "string" ? algorithm : algorithm.name;
    if (name.toUpperCase() === "SHA-1") {
      const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
      return new Uint8Array(sha1(bytes)).buffer;
    }
    return await super.digest(algorithm, data);
  }

  override async verifyWithPublicKey(data: BufferSource, signature: asn1js.BitString,
    publicKeyInfo: PublicKeyInfo, signatureAlgorithm: AlgorithmIdentifier, shaAlgorithm?: string): Promise<boolean> {
    try {
      return await super.verifyWithPublicKey(data, signature, publicKeyInfo, signatureAlgorithm, shaAlgorithm);
    } catch (error) {
      if (!(error instanceof Error) || !/not supported|not implemented|Unsupported|Unrecognized/i.test(error.message)) throw error;
      // Only ECDSA with an explicit supported curve/hash has a software fallback.
      if (publicKeyInfo.algorithm.algorithmId !== "1.2.840.10045.2.1" ||
          !["1.2.840.10045.4.1", "1.2.840.10045.4.3.2", "1.2.840.10045.4.3.3", "1.2.840.10045.4.3.4"].includes(signatureAlgorithm.algorithmId)) throw error;
      const params = publicKeyInfo.algorithm.algorithmParams;
      if (!(params instanceof asn1js.ObjectIdentifier)) throw error;
      const curve = curves[params.valueBlock.toString() as keyof typeof curves];
      const hash = hashes[(shaAlgorithm ?? this.getHashAlgorithm(signatureAlgorithm)) as keyof typeof hashes];
      if (!curve || !hash) throw error;
      const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
      return curve.verify(signature.valueBlock.valueHexView, hash(bytes),
        publicKeyInfo.subjectPublicKey.valueBlock.valueHexView, { prehash: false, lowS: false, format: "der" });
    }
  }
}
