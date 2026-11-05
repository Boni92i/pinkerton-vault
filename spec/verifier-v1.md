---
id: pinkerton-vault/spec/verifier-v1
version: 1.0.0
status: stable
audience: [implementer, auditor, agent]
updated: 2026-11-05
tags: [verifier, pbkdf2, authentication]
depends_on: [pinkerton-vault/spec/recovery-code]
---

# Verifier v1 — the value the server may store

## 1. Purpose

The verifier lets the server identify a session without ever seeing the recovery
code. It is a slow hash of the code, computed in the browser. The server stores
it and uses it for login. It cannot derive the vault key from it.

The verifier is **not** the vault key. The two values use different salts and
different iteration counts, and the verifier MUST NOT be used as an AES key.

## 2. Inputs and outputs

| Item | Value |
|---|---|
| Input | The canonical recovery code, `XXXX-XXXX-XXXX` (uppercase, hyphens included) |
| KDF | PBKDF2-HMAC-SHA256 |
| Salt | ASCII `pinkerton-recovery-verifier-v1` |
| Iterations | 200 000 |
| Derived length | 32 bytes (256 bits) |
| Encoding | Unpadded base64url (`A–Z a–z 0–9 - _`) |

The output is a 43-character string.

## 3. Derivation

```
verifier = base64url(
  PBKDF2-SHA256(
    password   = UTF-8(canonical_code),
    salt       = UTF-8("pinkerton-recovery-verifier-v1"),
    iterations = 200 000,
    dkLen      = 32
  )
)
```

The browser MUST derive the verifier. The server MUST NOT derive it from a code,
because the server MUST NOT receive the code.

## 4. Server storage contract

A conforming server stores, per `anon_id`:

| Field | Type | Constraint |
|---|---|---|
| `anon_id` | text | The session identifier; one sealed row per `anon_id` |
| `code_hash` | text | The verifier; unique across rows |
| `code_version` | integer | `2` for a sealed row; `1` for a legacy plaintext row |
| `sealed_at` | timestamp | When the plaintext was removed |
| `code` | text or null | Legacy plaintext only; MUST be `NULL` after sealing |

The server MUST NOT store the code for a new row. It MUST NOT return an existing
verifier or code to a caller. It MUST NOT allow a second verifier to replace an
existing one.

## 5. Registration

1. The browser generates the code (see [`recovery-code.md`](recovery-code.md)).
2. The browser computes the verifier.
3. The browser calls `register_recovery_verifier(anon_id, verifier)`.
4. The server inserts the verifier if no row exists, or seals a legacy row after
   verifying the legacy code presented by the caller.
5. The server returns `{ ok: true }`.

A second registration with a different verifier MUST fail with
`already_registered`. An identical retry MAY succeed idempotently.

## 6. Login

1. The user types the code on a new browser.
2. The browser normalizes and formats it, then computes the verifier.
3. The browser calls `login_with_recovery_verifier(verifier)`.
4. The server returns the `anon_id`, or `null`.
5. The browser derives the vault key from the **code**, never from the verifier.
6. The browser decrypts the blob.

The server MUST rate-limit failed logins. The hosted app allows 10 failures per
15 minutes per hashed IP, and purges the attempt rows after one hour.

## 7. Threat limits

- **Bearer credential.** Whoever has the verifier can obtain the `anon_id`. They
  cannot decrypt the vault without the code.
- **Offline brute force.** A leaked verifier can be attacked offline. The code has
  60 bits of entropy and the KDF costs 200 000 PBKDF2 iterations; this is
  expensive, not impossible. A future version MAY increase the code length or the
  iteration count.
- **No second factor.** There is no email, phone or password reset. The code is
  the only authentication factor.
- **No server-side escrow.** A lost code cannot be recovered by the server.

## 8. Conformance

A conforming implementation MUST reproduce
[`../test-vectors/verifier.json`](../test-vectors/verifier.json).

## 9. Versioning

`v1` is fixed by the salt string. A future parameter change MUST use a new salt
(`pinkerton-recovery-verifier-v2`) and a new specification. Existing rows keep
`code_version = 2` in the hosted app; the verifier spec version is independent of
the row version.
