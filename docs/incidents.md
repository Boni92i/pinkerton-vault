---
id: pinkerton-vault/docs/incidents
version: 1.0.0
status: stable
audience: [human, agent, auditor]
updated: 2026-11-05
tags: [incidents, transparency]
depends_on: [pinkerton-vault/spec/verifier-v1]
---

# Incident log

Every entry has a stable ID, a date, a status and a source. A correction is
recorded in the entry, never written over it. If a fact is disputed, both
accounts stay in the entry.

| ID | Date | Kind | Severity | Status |
|---|---|---|---|---|
| `PINK-2026-11-05-01` | 2026-11-05 | security | high | fixed |
| `PINK-2026-08-30-01` | 2026-08-30 | security | critical | fixed |
| `PINK-2026-10-08-01` | 2026-10-08 | availability | high | fixed |
| `PINK-2026-11-01-01` | 2026-11-01 | reliability | high | fixed |

---

## `PINK-2026-11-05-01` — recovery codes stored in plaintext

**What happened.** The hosted app stored the recovery code in
`recovery_codes.code` in clear. A browser-callable RPC, `generate_recovery_code`,
returned the existing code for any `anon_id`. The vault key is derived from that
code, so anyone with the database or the RPC could derive the key and decrypt the
vault.

**Scope.** 12,433 code rows, 1,879 vault blobs and 2,259 portable-memory blobs at
the time of the audit. 61 `anon_id`s had two rows because the old RPC could insert
a duplicate when two tabs raced; 15 of them owned a vault.

**Fix.** `verifier v1`: the browser generates the code, derives a PBKDF2 verifier
and sends only the verifier. The server stores `code_hash`, never the code. The
legacy rows are claimed once, checked against the existing vault, then sealed; the
duplicate rows are removed. The candidate that decrypted the vault was the newest
row in 10 of the 15 cases and the oldest in 5, so the client tests each candidate
against the blob instead of keeping a fixed row. Deployed on 2026-11-05.

**What we know.** The code is no longer generated or stored server-side for new
rows; the old RPCs are still present during the migration window and are scheduled
for revocation.

**What we do not know.** We have not found evidence of abuse in the logs we keep;
we cannot prove a negative. The migration of inactive rows is not complete.

**Lesson.** A secret that the server can re-display is not a secret.

**Sources.** Migrations `20261105200000_recovery_code_verifier.sql`,
`20261105203000_recovery_code_legacy_candidates.sql`; commit `023f8ad`; specs
[`../spec/verifier-v1.md`](../spec/verifier-v1.md),
[`../spec/recovery-code.md`](../spec/recovery-code.md).

---

## `PINK-2026-08-30-01` — 14 privileged RPCs callable with the public key

**What happened.** Fourteen `SECURITY DEFINER` functions were executable with the
public anon key that ships in the browser bundle. The severe ones included
`admin_list_sessions` (all sessions with balances), `grant_premium_lifetime` and
the mail-queue functions.

**Fix.** Each function was revoked from `PUBLIC`, `anon` and `authenticated`, and
granted to `service_role` only. The migration also documents the durable check:
enumerate `pg_proc` for `has_function_privilege('anon', oid, 'EXECUTE')` after any
migration that creates or replaces a function.

**Lesson.** `CREATE OR REPLACE` resets a function's ACL to `PUBLIC`; a
hand-maintained revoke list goes stale.

**Source.** `20260830300000_lock_browser_reachable_privileged_rpcs.sql`.

---

## `PINK-2026-10-08-01` — recovery login broken for every caller

**What happened.** A previous migration hashed the caller IP with
`pgcrypto.digest()`, but the function is pinned to `SET search_path TO 'public'`
and `pgcrypto` lives in the `extensions` schema. Every call raised
`function digest(text, unknown) does not exist` before the code lookup, so no one
could restore a session with their recovery code.

**Fix.** Use the built-in `sha256()` (PostgreSQL 11+, in `pg_catalog`). The hash is
only a rate-limit key and is purged after one hour.

**Lesson.** A migration that changes a function's dependencies must be tested
against the function's actual `search_path`.

**Source.** `20261008120000_fix_login_with_recovery_code_digest.sql`.

---

## `PINK-2026-11-01-01` — chat providers unavailable

**What happened.** Experiential returned `503 provider deployment was not found`
for the uncensored models, and Chutes accepted requests without emitting a token.
The chat was unavailable before the maintenance banner was even involved.

**Fix.** Route the default to Venice, keep Chutes as the TEE fallback, and
re-introduce Experiential only for three aligned ZDR models. Record the provider
errors in `chat_model_errors`.

**Lesson.** A provider can return `200` and still send nothing; the stream must be
validated, not just the status code.

**Source.** `docs/RELAUNCH-2026-11.md` in the private app repo; commit `e7cce29`.
