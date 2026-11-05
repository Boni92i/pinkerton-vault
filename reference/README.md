---
id: pinkerton-vault/reference
version: 1.0.0
status: stable
audience: [implementer, agent]
updated: 2026-11-05
tags: [reference, javascript]
depends_on: [pinkerton-vault/spec/pkb1, pinkerton-vault/spec/verifier-v1, pinkerton-vault/spec/recovery-code]
---

# Reference implementation

Dependency-free ES modules. They run on Node 20+, Bun, and browsers that expose
WebCrypto and `CompressionStream`.

These modules are **one** implementation. The normative contract is the spec plus
the test vectors; a third-party implementation is conforming if it reproduces the
vectors.

## `recovery.mjs`

| Function | Signature | Notes |
|---|---|---|
| `normalizeCode` | `(input: string) => string` | Uppercase, strips separators, folds `O→0`, `I/L→1`, `U→V` |
| `formatCode` | `(input: string) => string` | `XXXX-XXXX-XXXX` |
| `isValidCode` | `(input: string) => boolean` | 12 symbols from the alphabet |
| `generateCode` | `() => string` | CSPRNG, 60 bits |

## `verifier.mjs`

| Function | Signature | Notes |
|---|---|---|
| `deriveVerifier` | `(code: string) => Promise<string>` | PBKDF2-SHA256, salt `pinkerton-recovery-verifier-v1`, 200 000 iterations, 43-char base64url |
| `toBase64Url` | `(bytes: Uint8Array) => string` | Unpadded |

The verifier MUST NOT be used as the AES key.

## `pkb1.mjs`

| Function | Signature | Notes |
|---|---|---|
| `deriveVaultKey` | `(code: string) => Promise<CryptoKey>` | PBKDF2-SHA256, salt `pinkerton-vault-recovery-v1`, 100 000 iterations |
| `packVault` | `(payload, key, { iv? }) => Promise<Uint8Array>` | `iv` is for test vectors only |
| `unpackVault` | `(blob: Uint8Array, key: CryptoKey) => Promise<payload>` | Verifies magic, GCM tag and payload version |
| `isPkb1` | `(blob: Uint8Array) => boolean` | Magic only |
| `toBase64` / `fromBase64` | `(bytes) => string` / `(text) => Uint8Array` | Standard base64 |
| `toBase64Url` / `fromBase64Url` | `(bytes) => string` / `(text) => Uint8Array` | Unpadded base64url |

## Example

```js
import { generateCode } from "./recovery.mjs";
import { deriveVerifier } from "./verifier.mjs";
import { deriveVaultKey, packVault, unpackVault } from "./pkb1.mjs";

const code = generateCode();
const verifier = await deriveVerifier(code); // send this to the server
const key = await deriveVaultKey(code);      // never send this

const payload = { version: 1, exportedAt: Date.now(), data: { "pinkerton-chat-messages": "[]" } };
const blob = await packVault(payload, key);  // upload these bytes
const restored = await unpackVault(blob, key);
```

## Run the conformance tests

```sh
node --test tests/
```

The tests read `test-vectors/` and fail if an implementation drifts.
