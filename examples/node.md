---
id: pinkerton-vault/examples/node
version: 1.0.0
status: stable
audience: [implementer, agent]
updated: 2026-11-05
tags: [example, node, javascript]
---

# Node example

This example uses the reference modules in [`../reference/`](../reference/). It
creates a new code, derives the verifier and the vault key, packs a payload, and
unpacks it again. It never sends the code or the key anywhere.

```js
import { generateCode } from "../reference/recovery.mjs";
import { deriveVerifier } from "../reference/verifier.mjs";
import {
  deriveVaultKey,
  fromBase64,
  packVault,
  toBase64,
  unpackVault,
} from "../reference/pkb1.mjs";

// 1. The browser generates the code. Show it to the user; keep it on the device.
const code = generateCode();
console.log("recovery code:", code);

// 2. The verifier is the only value the server may store.
const verifier = await deriveVerifier(code);
console.log("verifier:", verifier);

// 3. The vault key is derived from the code, in this process.
const key = await deriveVaultKey(code);

// 4. Pack the workspace. The payload shape is in schema/pkb1.schema.json.
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

// 5. Upload blobBase64 to the storage server. It is ciphertext.
//    PUT /v1/vault/{anon_id} { "blob_base64": "..." }

// 6. Download it later and unpack it with the same key.
const restored = await unpackVault(fromBase64(blobBase64), key);
console.log("restored:", restored);
```

## What not to do

- Do not send `code` or `key` to the server.
- Do not log `code` in production.
- Do not put a real code in an issue, a screenshot or a test.
- Do not use `Math.random()` to generate a code.

## Run it

```sh
node examples/node.mjs
```

The reference modules are dependency-free and run on Node 20+ and Bun.
