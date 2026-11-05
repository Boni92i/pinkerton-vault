---
id: pinkerton-vault/spec/recovery-code
version: 1.0.0
status: stable
audience: [implementer, human, agent]
updated: 2026-11-05
tags: [recovery, code, ux, migration]
depends_on: [pinkerton-vault/spec/verifier-v1, pinkerton-vault/spec/pkb1]
---

# Recovery code

The recovery code is the only key. It is generated in the browser, shown to the
user, and never sent to the server. Losing it means losing the memory and the
balance; the server cannot help.

## 1. Format

| Property | Value |
|---|---|
| Alphabet | `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (32 symbols) |
| Length | 12 symbols |
| Entropy | 60 bits |
| Display | `XXXX-XXXX-XXXX` |
| Case | Uppercase |

The alphabet is Crockford base32: it excludes `I`, `L`, `O` and `U` to avoid the
usual transcription errors.

## 2. Normalization

A reader MUST normalize before validating or deriving:

| Input | Becomes |
|---|---|
| Lowercase | Uppercase |
| Hyphens, spaces, other separators | Removed |
| `O` | `0` |
| `I` | `1` |
| `L` | `1` |
| `U` | `V` |

After normalization the code MUST be exactly 12 symbols from the alphabet. The
canonical display form is rebuilt by grouping the normalized symbols in blocks of
four with hyphens.

## 3. Generation

```
bytes = CSPRNG(12)
code  = ""
for each byte:
    code += ALPHABET[byte mod 32]
```

`256 mod 32 == 0`, so the modulo is uniform; no rejection sampling is required.
Generation MUST use a cryptographically secure random source. `Math.random` is
forbidden.

## 4. Display and storage

- The browser displays the code to the user. The user copies it.
- The browser stores it in IndexedDB (`pinkerton-recovery`) with a localStorage
  fallback. The server never stores or returns it.
- The app SHOULD offer a browser password-manager save (Web Credential
  Management) and a recovery kit.
- The code is a bearer secret. The UI MUST say so.

## 5. Loss

There is no recovery, by design. No email reset, no support override, no server
copy. This is the cost of possession and the proof that the server cannot read the
vault.

## 6. Delivery options

All options below keep the plaintext code out of Pinkerton's infrastructure. A
server-side send (email, WhatsApp, Discord) would put the code in the server and
in a third party; it is forbidden.

| Option | Where the code goes | Risk |
|---|---|---|
| Recovery kit (PDF/TXT + QR) | The user's device or printer | None beyond the user's own storage |
| Browser password manager | The browser's credential store | The browser vendor's sync, if enabled |
| Client-side share (`mailto:`, `https://wa.me/?text=…`, Web Share API) | A third-party service chosen by the user | The third party now holds a bearer secret; opt-in and warn |
| Reminder email without the code | The user's inbox | Safe, but does not restore a lost code |
| Shamir split (one share by email, one local) | The server never has the full code | Complex UX; a share alone is useless |

The recommended default is the recovery kit. The client-side share is a
convenience, not a backup.

## 7. Migration from legacy plaintext codes

Before 2026-11-05, the hosted app stored the code in clear. The migration is:

1. The browser asks for the plaintext candidates for its `anon_id`.
2. It derives the vault key from each candidate and tests it against the existing
   blob (decrypt without applying).
3. The candidate that decrypts the vault is the winner. If no blob exists, the
   first candidate is used.
4. The browser registers the verifier for the winning code. The server seals that
   row (`code = NULL`, `code_hash = verifier`) and deletes the other plaintext
   rows for the same `anon_id`.
5. If no candidate decrypts an existing blob, the browser does not seal anything;
   the user must enter the code manually.

The hosted app had 61 `anon_id`s with two rows and 15 of them owned a vault. The
newest row decrypted the vault in 10 cases and the oldest in 5. A fixed
"keep the oldest" cleanup would have destroyed 10 vaults.

A cutoff date (to be set by the operator) removes any plaintext row that was never
claimed. After that date, an unclaimed legacy code cannot be restored.

## 8. Conformance

A conforming implementation MUST reproduce
[`../test-vectors/recovery-code.json`](../test-vectors/recovery-code.json).

## 9. Security considerations

- The code has 60 bits of entropy. It is strong against online guessing with rate
  limits; it is not a password and should not be reused.
- The verifier is a bearer credential. The code is a bearer secret. Treat both as
  sensitive.
- The code is not protected against a compromised browser. See
  [`../docs/threat-model.md`](../docs/threat-model.md).
- Do not put a real code in an example, a screenshot, an issue or a test.
