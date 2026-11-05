/**
 * PKB1: pack and unpack the encrypted vault container.
 * Dependency-free. Runs on Node 20+, Bun, and browsers with WebCrypto.
 *
 * Format:
 *   [0..4)   magic "PKB1"
 *   [4..16)  12-byte AES-GCM IV
 *   [16..]   AES-256-GCM ciphertext (includes the 16-byte tag)
 *
 * The plaintext is UTF-8 JSON, gzip-compressed when CompressionStream exists.
 */

import { formatCode, isValidCode } from "./recovery.mjs";

export const MAGIC = new Uint8Array([0x50, 0x4b, 0x42, 0x31]); // "PKB1"
export const IV_LENGTH = 12;
export const KEY_SALT = "pinkerton-vault-recovery-v1";
export const KEY_ITERATIONS = 100_000;
export const PAYLOAD_VERSION = 1;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** @param {Uint8Array} bytes */
export function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** @param {string} text */
export function fromBase64(text) {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/** @param {Uint8Array} bytes */
export function toBase64Url(bytes) {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** @param {string} text */
export function fromBase64Url(text) {
  let base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return fromBase64(base64);
}

async function readAll(readable) {
  const reader = readable.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}

async function pipeThrough(bytes, stream) {
  const writer = stream.writable.getWriter();
  const write = writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => {});
  try {
    return await readAll(stream.readable);
  } finally {
    await write;
  }
}

async function gzip(bytes) {
  if (typeof CompressionStream === "undefined") return bytes;
  return pipeThrough(bytes, new CompressionStream("gzip"));
}

async function gunzip(bytes) {
  if (typeof DecompressionStream === "undefined") return bytes;
  try {
    return await pipeThrough(bytes, new DecompressionStream("gzip"));
  } catch {
    return bytes;
  }
}

/**
 * Derive the AES-256-GCM key from the canonical recovery code.
 * The hyphens are part of the KDF input.
 * @param {string} input
 * @returns {Promise<CryptoKey>}
 */
export async function deriveVaultKey(input) {
  const code = formatCode(input);
  if (!isValidCode(code)) throw new Error("Invalid recovery code");
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is required");

  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(KEY_SALT),
      iterations: KEY_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Pack a payload into a PKB1 blob.
 * @param {{version: 1, exportedAt: number, data: Record<string, string | null>}} payload
 * @param {CryptoKey} key
 * @param {{iv?: Uint8Array, compress?: boolean}} [options] fixed IV / raw payload for test vectors only
 * @returns {Promise<Uint8Array>}
 */
export async function packVault(payload, key, options = {}) {
  if (payload?.version !== PAYLOAD_VERSION) throw new Error("Unsupported payload version");
  if (!payload.data || typeof payload.data !== "object") throw new Error("payload.data is required");

  const json = encoder.encode(JSON.stringify(payload));
  const compressed = options.compress === false ? json : await gzip(json);
  const iv = options.iv ?? crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  if (iv.length !== IV_LENGTH) throw new Error("IV must be 12 bytes");

  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, compressed),
  );
  const blob = new Uint8Array(MAGIC.length + IV_LENGTH + cipher.length);
  blob.set(MAGIC, 0);
  blob.set(iv, MAGIC.length);
  blob.set(cipher, MAGIC.length + IV_LENGTH);
  return blob;
}

/**
 * Unpack and authenticate a PKB1 blob.
 * @param {Uint8Array} blob
 * @param {CryptoKey} key
 * @returns {Promise<{version: 1, exportedAt: number, data: Record<string, string | null>}>}
 */
export async function unpackVault(blob, key) {
  if (!isPkb1(blob)) throw new Error("Not a PKB1 blob");
  if (blob.length < MAGIC.length + IV_LENGTH + 16) throw new Error("PKB1 blob is truncated");

  const iv = blob.subarray(MAGIC.length, MAGIC.length + IV_LENGTH);
  const cipher = blob.subarray(MAGIC.length + IV_LENGTH);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher));
  const decompressed = await gunzip(plain);
  const payload = JSON.parse(decoder.decode(decompressed));

  if (payload?.version !== PAYLOAD_VERSION) throw new Error("Unsupported payload version");
  if (!payload.data || typeof payload.data !== "object") throw new Error("payload.data is missing");
  return payload;
}

/** @param {Uint8Array} blob */
export function isPkb1(blob) {
  if (!(blob instanceof Uint8Array) || blob.length < MAGIC.length) return false;
  for (let index = 0; index < MAGIC.length; index += 1) {
    if (blob[index] !== MAGIC[index]) return false;
  }
  return true;
}
