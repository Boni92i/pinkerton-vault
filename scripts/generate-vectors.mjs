import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  ALPHABET,
  LENGTH,
  formatCode,
  isValidCode,
  normalizeCode,
} from "../reference/recovery.mjs";
import { deriveVerifier } from "../reference/verifier.mjs";
import {
  IV_LENGTH,
  KEY_ITERATIONS,
  KEY_SALT,
  deriveVaultKey,
  packVault,
  toBase64,
  toBase64Url,
} from "../reference/pkb1.mjs";

const code = "ABCD-EFGH-JKMN";
const verifier = await deriveVerifier(code);
const key = await deriveVaultKey(code);

const payload = {
  version: 1,
  exportedAt: 1762345678901,
  data: {
    "pinkerton-chat-messages": '[{"role":"user","content":"hello"}]',
    "pinkerton-conv-history": "[]",
    "pinkerton-chat-display": '{"density":"compact"}',
    "pinkerton-studio-history": null,
  },
};

const iv = Uint8Array.from({ length: IV_LENGTH }, (_, index) => index);

const rawBlob = await packVault(payload, key, { iv, compress: false });
const gzipBlob = await packVault(payload, key, { iv });

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const recoveryVectors = {
  version: 1,
  alphabet: ALPHABET,
  length: LENGTH,
  entropy_bits: 60,
  vectors: [
    {
      input: "abcd-efgh-jkmn",
      normalized: normalizeCode("abcd-efgh-jkmn"),
      formatted: formatCode("abcd-efgh-jkmn"),
      valid: isValidCode("abcd-efgh-jkmn"),
    },
    {
      input: "O0I1L-U",
      normalized: normalizeCode("O0I1L-U"),
      formatted: formatCode("O0I1L-U"),
      valid: isValidCode("O0I1L-U"),
    },
    {
      input: "ABCD-EFGH",
      normalized: normalizeCode("ABCD-EFGH"),
      formatted: formatCode("ABCD-EFGH"),
      valid: isValidCode("ABCD-EFGH"),
    },
  ],
};

const verifierVectors = {
  version: 1,
  kdf: "PBKDF2-SHA256",
  salt: "pinkerton-recovery-verifier-v1",
  iterations: 200000,
  derived_bits: 256,
  encoding: "base64url-unpadded",
  vectors: [{ code, verifier }],
};

const pkb1Vectors = {
  version: 1,
  key_salt: KEY_SALT,
  key_iterations: KEY_ITERATIONS,
  note: "The raw vector is byte-exact for writers. The gzip vector is a reader vector: gzip output may differ between implementations.",
  vectors: [
    {
      name: "raw",
      compress: false,
      code,
      iv: toBase64Url(iv),
      payload,
      blob_base64: toBase64(rawBlob),
      blob_sha256: sha256(rawBlob),
    },
    {
      name: "gzip",
      compress: true,
      code,
      iv: toBase64Url(iv),
      payload,
      blob_base64: toBase64(gzipBlob),
      blob_sha256: sha256(gzipBlob),
      writer_note: "informative: a writer MAY produce different compressed bytes",
    },
  ],
};

writeFileSync("test-vectors/recovery-code.json", JSON.stringify(recoveryVectors, null, 2) + "\n");
writeFileSync("test-vectors/verifier.json", JSON.stringify(verifierVectors, null, 2) + "\n");
writeFileSync("test-vectors/pkb1.json", JSON.stringify(pkb1Vectors, null, 2) + "\n");

console.log("wrote test-vectors/recovery-code.json");
console.log("wrote test-vectors/verifier.json");
console.log("wrote test-vectors/pkb1.json");
