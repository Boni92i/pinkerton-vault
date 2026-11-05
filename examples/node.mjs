import { generateCode } from "../reference/recovery.mjs";
import { deriveVerifier } from "../reference/verifier.mjs";
import {
  deriveVaultKey,
  fromBase64,
  packVault,
  toBase64,
  unpackVault,
} from "../reference/pkb1.mjs";

const code = generateCode();
const verifier = await deriveVerifier(code);
const key = await deriveVaultKey(code);

const payload = {
  version: 1,
  exportedAt: Date.now(),
  data: {
    "pinkerton-chat-messages": "[]",
    "pinkerton-conv-history": "[]",
    "pinkerton-chat-display": '{"density":"compact"}',
    "pinkerton-studio-history": null,
  },
};

const blob = await packVault(payload, key);
const blobBase64 = toBase64(blob);
const restored = await unpackVault(fromBase64(blobBase64), key);

console.log("code:", code);
console.log("verifier:", verifier);
console.log("blob bytes:", blob.length);
console.log("restored matches:", JSON.stringify(restored) === JSON.stringify(payload));
