---
id: pinkerton-vault/docs/threat-model
version: 1.0.0
status: stable
audience: [human, agent, auditor]
updated: 2026-11-05
tags: [security, threats, limits]
depends_on: [pinkerton-vault/spec/pkb1, pinkerton-vault/spec/verifier-v1]
---

# Threat model

This document states what the vault protects against and, with equal weight, what
it does not. A claim that is not in this file is not a guarantee.

## Assets

1. The plaintext of the stored memory (chat history, preferences, studio items).
2. The recovery code and the derived AES key.
3. The `anon_id` and the session balance.
4. The integrity of the stored blob.

## Adversaries

| Adversary | Capability | Covered? |
|---|---|---|
| Server operator | Reads the database, the RPCs and the logs | **Yes** for the vault plaintext (v1): the key is not there |
| Database dump | Reads `encrypted_vault_blobs`, `anon_memory`, `recovery_codes` | **Yes**: only ciphertext and a verifier |
| Network attacker | Reads or modifies traffic | **Partly**: TLS; the server terminates TLS and sees the live prompt |
| Model provider | Sees the live prompt during inference | **No**: the provider must read it to answer |
| Stolen device | Reads browser storage | **Partly**: the chat key is non-extractable; the vault key is derived from the code, which the browser stores |
| XSS / malicious extension | Executes code in the page | **No**: it can read what the page can read |
| Malicious sync link | Obtains a `#vault_sync=` URL | **No**: the fragment contains the raw key |
| Legal request | Asks the server for conversation data | **Yes** for the vault plaintext; metadata and payment records still exist |

## Guarantees (v1)

- **G1 — Server-blind storage.** The server stores the `PKB1` blob and the
  portable memory blob as ciphertext. It stores a PBKDF2 verifier of the code,
  never the code. It cannot derive the AES key from the verifier in any practical
  time.
- **G2 — Integrity.** A modified blob fails the AES-GCM authentication check.
- **G3 — Portability.** A user who knows the code can decrypt the blob on any
  browser.
- **G4 — No escrow.** There is no server-side copy of the code or the key. A lost
  code means an unrecoverable memory.

## Non-guarantees

- **N1 — The live prompt is not end-to-end encrypted.** The edge and the provider
  see it. `PKB1` covers stored memory, not inference.
- **N2 — TEE is partial.** Only the models served by Chutes run in an enclave; it
  proves isolation of computation, not the absence of retention.
- **N3 — Metadata is visible.** The server sees the blob size, timestamps, the
  `anon_id`, and the IP at the edge. The ciphertext length leaks an approximate
  plaintext size.
- **N4 — The code is a bearer secret.** Anyone who obtains it can decrypt the
  vault. It is not a password with a second factor.
- **N5 — The sync link is a bearer secret.** `#vault_sync=<anonId>.<key>` contains
  the raw key. The fragment is not sent in HTTP requests, but it can leak through
  screenshots, clipboard history, browser history, or an extension.
- **N6 — The browser is not a TEE.** Code already running in the page can read
  decrypted data and the code. The non-extractable chat key raises the cost of
  disk inspection, not of active XSS.
- **N7 — The verifier is a login credential.** A database leak allows an attacker
  to obtain the `anon_id`, but not to decrypt the vault. Offline brute force of a
  60-bit code through 200k PBKDF2 iterations is expensive, not impossible.
- **N8 — Legal requests still find metadata and payment records.** They do not
  find the vault plaintext.

## Residual risks

| Risk | Mitigation | Residual |
|---|---|---|
| Weak user code | 60-bit random, CSPRNG, 32-symbol alphabet | A user who writes it down weakens the physical model |
| Verifier leak | PBKDF2 200k + rate limit (10 failures / 15 min / IP hash) | A determined attacker can brute-force a leaked verifier offline |
| Sync-link leak | The fragment is never sent to the server | The link is a bearer secret; treat it like the code |
| Blob deletion | The server cannot decrypt, but it can delete | Availability is not guaranteed |
| Provider retention | Venice zero-retention tier; Chutes TEE; Experiential ZDR | The live prompt is outside the vault's guarantee |

## Incident history

The 2026-11-05 plaintext-code finding, the 2026-08-30 privileged-RPC exposure and
the 2026-10-08 login outage are documented in
[`incidents.md`](incidents.md).

## Reporting

See [`../SECURITY.md`](../SECURITY.md). Do not open a public issue for a
vulnerability.
