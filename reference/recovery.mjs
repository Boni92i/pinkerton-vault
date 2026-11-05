/**
 * Recovery code: generation, normalization, formatting and validation.
 * Dependency-free. Runs on Node 20+, Bun, and browsers with WebCrypto.
 */

export const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const LENGTH = 12;

/**
 * Uppercase, drop separators, fold the characters that look alike.
 * @param {string} input
 * @returns {string}
 */
export function normalizeCode(input) {
  return String(input)
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

/**
 * Canonical display form: XXXX-XXXX-XXXX.
 * @param {string} input
 * @returns {string}
 */
export function formatCode(input) {
  const normalized = normalizeCode(input);
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

/**
 * @param {string} input
 * @returns {boolean}
 */
export function isValidCode(input) {
  const normalized = normalizeCode(input);
  if (normalized.length !== LENGTH) return false;
  for (const character of normalized) {
    if (!ALPHABET.includes(character)) return false;
  }
  return true;
}

/**
 * Generate a code with the platform CSPRNG.
 * 256 is divisible by 32, so the modulo is uniform.
 * @returns {string}
 */
export function generateCode() {
  if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new Error("A cryptographically secure random source is required");
  }
  const bytes = new Uint8Array(LENGTH);
  globalThis.crypto.getRandomValues(bytes);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return formatCode(code);
}
