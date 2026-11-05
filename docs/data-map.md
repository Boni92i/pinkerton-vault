---
id: pinkerton-vault/docs/data-map
version: 1.0.0
status: stable
audience: [human, agent, auditor]
updated: 2026-11-05
tags: [data, privacy, retention]
depends_on: [pinkerton-vault/spec/pkb1, pinkerton-vault/spec/verifier-v1]
---

# Data map

Every item below is either stored by the browser, stored by the hosted service,
or sent to a model provider. "Server" means the hosted Pinkerton service
(Supabase + edge functions + Cloudflare). The open-source `PKB1` format does not
by itself require any of these tables; they describe the hosted app.

## Legend

- **Browser** — the user's device, origin-scoped storage.
- **Server** — the hosted Pinkerton service.
- **Provider** — the model provider that performs inference.
- **Ciphertext** — unreadable without the recovery code.

## Stored data

| Data | Where | Who can read it | Retention | Notes |
|---|---|---|---|---|
| Recovery code | Browser: IndexedDB `pinkerton-recovery` (localStorage fallback) | The user, and anyone with access to this browser profile | Until the user clears it | The server never has it in v1 |
| Verifier (`code_hash`) | Server: `recovery_codes.code_hash` | The server; anyone with database access | Until the row is deleted | Identifies the session; cannot decrypt the vault |
| Legacy plaintext code | Server: `recovery_codes.code` | **Migration only**; nulled when the row is sealed | Until the browser seals it | Removed by the 2026-11-05 migration; see `incidents.md` |
| Vault blob (`PKB1`) | Server: `encrypted_vault_blobs.blob_data` | The server sees ciphertext; only the code holder can decrypt | Until overwritten or deleted | 5 MB cap; blob size is visible |
| Portable memory blob | Server: `anon_memory.payload` | The server sees ciphertext; only the code holder can decrypt | Until overwritten | The encrypted conversation list |
| Chat messages (at rest) | Browser: `localStorage` `pinkerton-chat-messages` | The browser; encrypted with a non-extractable key in IndexedDB | Until the user clears it | AES-256-GCM via `chat-crypto` |
| Conversation history | Browser: `localStorage` `pinkerton-conv-history` | The browser; encrypted with the same non-extractable key | Until the user clears it | The sidebar list |
| Display preferences | Browser: `localStorage` `pinkerton-chat-display` | The browser | Until the user clears it | Packed into the vault before upload |
| Studio history | Browser: `localStorage` `pinkerton-studio-history` | The browser | Until the user clears it | Packed into the vault before upload |
| `anon_id` | Browser: `localStorage` `pinkerton-anon-id`; server as a lookup key | The server | Until the session is deleted | A pseudonym, not an identity |
| Balance / session | Server: `anonymous_sessions` (hosted app) | The server | Until deleted or the account is closed | Credits are tied to the `anon_id` |
| Payment records | Payment provider + server | The provider and the server | Legal / accounting retention | Stripe / NOWPayments; invoices and top-ups |
| IP hash (login attempts) | Server: `recovery_code_attempts.ip` | The server | 1 hour | SHA-256 of the caller IP; purged by the login RPC |
| Chat failure metadata | Server: `chat_failures` | The server | Operational retention | `anon_id`, model, status, time; no prompt |
| Model error metadata | Server: `chat_model_errors` | The server | Operational retention | Model, status, upstream error text (up to 300 chars) |

## Data sent to a provider

| Data | Where it goes | Who can read it | Notes |
|---|---|---|---|
| Live prompt and attachments | Provider API over TLS | The provider | Not stored by Pinkerton; retention depends on the provider tier |
| Model choice, token counts | Provider API; usage tables | The provider; the server | Used for routing and billing |

Provider tiers in the hosted app:

- **Venice** — zero-retention tier for the 11 catalogue models.
- **Chutes** — TEE isolation; the vendor declares it, it is not a documented
  zero-retention guarantee.
- **Experiential** — ZDR route, requested with `provider: {"zdr": true}`.

## Data that is not stored by the vault

- The recovery code, once the browser has it: not on the server.
- The AES key: never sent.
- The plaintext of the vault: never uploaded.
- The live prompt: relayed, not persisted by Pinkerton.

## Known tension: analytics

The hosted site loads PostHog, Plausible, the Ahrefs script and Vercel
Analytics. They are independent of the vault and are flagged in the product
backlog as a tension with the "zero log" promise. They are **not** part of the
`PKB1` format and do not change the vault's guarantees.

## Machine-readable view

The `PKB1` payload schema is in
[`../schema/pkb1.schema.json`](../schema/pkb1.schema.json). The server-side
shapes are described in [`../spec/verifier-v1.md`](../spec/verifier-v1.md) and
[`../spec/pkb1.md`](../spec/pkb1.md).
