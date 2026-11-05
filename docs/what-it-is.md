---
id: pinkerton-vault/docs/what-it-is
version: 1.0.0
status: stable
audience: [human, agent]
updated: 2026-11-05
tags: [scope, guarantees, non-goals]
depends_on: [pinkerton-vault/spec/pkb1, pinkerton-vault/spec/verifier-v1]
---

# What Pinkerton Vault is — and isn't

## One sentence

A portable, client-encrypted memory for AI sessions: the user's browser packs and
encrypts the workspace, the server stores opaque bytes, and the key is derived
from a recovery code the server never sees.

## The three components

| Component | What it does | Spec |
|---|---|---|
| `PKB1` | Binary container: magic, IV, AES-256-GCM ciphertext over gzip(JSON) | [`spec/pkb1.md`](../spec/pkb1.md) |
| Verifier v1 | A slow hash of the recovery code, sent to the server instead of the code | [`spec/verifier-v1.md`](../spec/verifier-v1.md) |
| Recovery code | 12-symbol, 60-bit code the user owns; it is the key and the login | [`spec/recovery-code.md`](../spec/recovery-code.md) |

## Guarantees

| Property | Guarantee | How it is enforced |
|---|---|---|
| Confidentiality of stored memory | The server cannot decrypt the vault | The AES key is derived from the code in the browser; the server stores a PBKDF2 verifier, not the code |
| Integrity | A modified blob fails to decrypt | AES-GCM authentication tag |
| Portability | The memory follows the code to another browser | The key is re-derived from the code on the new device |
| No server-side escrow | A lost code cannot be recovered | No copy of the code or the key exists server-side, by design |

## Non-guarantees

- **The live prompt is not end-to-end encrypted.** The provider sees it during
  inference. Only the stored memory is covered by `PKB1`.
- **The TEE is not universal.** It applies to the models served by Chutes, and it
  proves isolation of computation, not the absence of retention.
- **The browser is not a trusted execution environment.** Code already executing
  in the page (XSS, a malicious extension) can read what the page can read.
- **Metadata is not encrypted.** The server sees the blob size, timestamps, the
  `anon_id`, and the IP at the edge.
- **The code is a bearer secret.** Anyone who has it can decrypt the vault.

Read [`threat-model.md`](threat-model.md) for the full list.

## What changed on 2026-11-05

Before that date, the recovery code was stored in plaintext and returned by a
browser-callable RPC, so the server could derive the vault key. The code is now
generated in the browser and only a PBKDF2 verifier is stored. The migration of
the existing rows is documented in [`incidents.md`](incidents.md).

## What this repository is not

- Not the Pinkerton app, router, pricing, payments or admin. See
  [`repository-boundaries.md`](repository-boundaries.md).
- Not a general-purpose encryption format.
- Not a claim of anonymity: `anon_id` is a pseudonym, and the network still sees
  an IP address.

## Read next

1. [`data-map.md`](data-map.md) — what is stored, where, and for how long.
2. [`threat-model.md`](threat-model.md) — what we protect against, and what we don't.
3. [`../spec/pkb1.md`](../spec/pkb1.md) — the normative format.
