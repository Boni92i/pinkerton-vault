/**
 * Verifier v1: the value the server may store.
 * Dependency-free. Runs on Node 20+, Bun, and browsers with WebCrypto.
 */

import { formatCode, isValidCode } from "./recovery.mjs";

export const SALT = "pinkerton-recovery-verifier-v1";
export const ITERATIONS = 200_000;
export const DERIVED_BITS = 256;

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Derive the verifier from a recovery code.
 * @param {string} input
 * @returns {Promise<string>} 43-character unpadded base64url
 */
export async function deriveVerifier(input) {
  const code = formatCode(input);
  if (!isValidCode(code)) throw new Error("Invalid recovery code");
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is required");

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(code), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode(SALT),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    DERIVED_BITS,
  );
  return toBase64Url(new Uint8Array(bits));
}
