---
id: pinkerton-vault/spec/pkb1
version: 1.0.0
status: stable
audience: [implementer, auditor, agent]
updated: 2026-11-05
tags: [format, encryption, pkb1]
depends_on: [pinkerton-vault/spec/verifier-v1]
---

# PKB1 — vault container format

## 1. Scope

This document specifies the binary container that carries an encrypted Pinkerton
workspace. It does not specify the application payload keys (they are listed in
[`../docs/data-map.md`](../docs/data-map.md)) and it does not specify the server
storage engine.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are to be interpreted as
described in RFC 2119.

## 2. Terms

- **Code** — the recovery code, canonical form `XXXX-XXXX-XXXX`.
- **Key** — the 32-byte AES-256-GCM key derived from the code.
- **Payload** — the UTF-8 JSON object described in §4.
- **Blob** — the binary output of §3.

## 3. Byte layout

A `PKB1` blob is exactly:

| Offset | Length | Field | Value |
|---|---|---|---|
| 0 | 4 | `magic` | ASCII `PKB1` — bytes `0x50 0x4B 0x42 0x31` |
| 4 | 12 | `iv` | A fresh random nonce, unique for every pack with the same key |
| 16 | *n* | `ciphertext` | AES-256-GCM ciphertext of the compressed payload, including the 16-byte tag |

A conforming reader MUST reject a blob shorter than 32 bytes, a blob whose magic
is not `PKB1`, and a blob that fails AES-GCM authentication.

## 4. Plaintext payload

The plaintext is a UTF-8 JSON object:

```json
{
  "version": 1,
  "exportedAt": 1762345678901,
  "data": {
    "pinkerton-chat-messages": "…",
    "pinkerton-conv-history": "…",
    "pinkerton-chat-display": "…",
    "pinkerton-studio-history": null
  }
}
```

- `version` MUST be the integer `1` for this specification.
- `exportedAt` MUST be an integer number of milliseconds since the Unix epoch.
- `data` MUST be an object whose values are strings or `null`.
- A reader MUST preserve keys it does not know.
- The four keys above are the hosted app's keys; the format allows any string key.

The JSON Schema is [`../schema/pkb1.schema.json`](../schema/pkb1.schema.json).

## 5. Key derivation

```
key = PBKDF2-SHA256(
  password   = UTF-8(canonical_code),
  salt       = UTF-8("pinkerton-vault-recovery-v1"),
  iterations = 100 000,
  dkLen      = 32
)
```

`canonical_code` is the code in its displayed form: uppercase, with hyphens
(`ABCD-EFGH-JKMN`). The hyphens are part of the password. Removing or changing
them changes the key and makes existing blobs unreadable. This is a compatibility
requirement, not an accident.

The verifier in [`verifier-v1.md`](verifier-v1.md) uses a different salt and a
different iteration count. The two values MUST NOT be used interchangeably.

## 6. Encryption

- Algorithm: AES-256-GCM.
- IV: 12 bytes, generated with a CSPRNG for every pack.
- Tag: 16 bytes, appended by WebCrypto to the ciphertext.
- A writer MUST NOT reuse an IV with the same key.
- A writer MUST NOT encrypt more than one payload with the same IV and key.

## 7. Compression

```
payload    = UTF-8(JSON)
compressed = gzip(payload)   if CompressionStream is available
compressed = payload          otherwise
```

A writer SHOULD compress. A reader MUST accept both compressed and uncompressed
payloads. Because the container has no compression flag, the reader tries to
decompress; if decompression fails or is unavailable, it uses the bytes as the
payload. This is unambiguous in practice: a valid gzip stream is not also a valid
UTF-8 JSON object that starts with `{`.

Compression happens **before** encryption. The ciphertext length therefore leaks
an approximate plaintext size. See §11.

## 8. Sync link

The hosted app can carry the key in a URL fragment:

```
https://pinkerton-ai.com/chat#vault_sync=<anon_id>.<base64url(key)>
```

- `<anon_id>` is the storage key, not a secret in itself.
- `<base64url(key)>` is the raw 32-byte key, unpadded base64url.
- The fragment (`#…`) is not sent in HTTP requests.
- The link is a **bearer secret**: anyone who has it can decrypt the vault. It
  MUST be treated like the code, not like a shareable public link.

## 9. Versioning

- The magic `PKB1` is fixed. A future incompatible format MUST use a new magic
  (`PKB2`) and a new specification.
- The payload `version` is `1`. A reader MUST reject an unknown payload version.
- A change to the KDF parameters requires a new magic or a new key-derivation
  version in the payload, because existing blobs cannot be re-derived.

## 10. Conformance

A conforming writer MUST produce a blob that a conforming reader can unpack. A
conforming reader MUST reproduce the values in
[`../test-vectors/pkb1.json`](../test-vectors/pkb1.json). Run `node --test tests/`
from the repository root.

## 11. Security considerations

- **IV reuse is fatal.** GCM loses confidentiality and integrity if an IV is
  reused with the same key.
- **The blob size is visible.** Compression before encryption leaks an
  approximate plaintext size to the storage server.
- **The sync link is a secret.** The fragment is not sent to the server, but it
  can leak through screenshots, clipboard history, browser history or an
  extension.
- **The server can delete.** Confidentiality is protected; availability is not.
- **No forward secrecy.** Compromising the code compromises every blob encrypted
  with it, past and future.
- **The live prompt is out of scope.** The provider sees it during inference.

## 12. Non-goals

- General-purpose file encryption.
- Key escrow or recovery by the server.
- Protection against code executing in the page.
- Hiding the existence or size of the blob.
