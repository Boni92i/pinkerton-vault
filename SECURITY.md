---
id: pinkerton-vault/security
version: 1.0.0
status: stable
audience: [human, agent, researcher]
updated: 2026-11-05
tags: [security, disclosure]
---

# Security policy

## Reporting

Do not open a public issue for a vulnerability. Use GitHub's private
**Report a vulnerability** flow (Security Advisories) on this repository.

Include:

1. The affected version and path (`spec/…`, `reference/…`, schema or vector).
2. A minimal reproduction.
3. The impact: confidentiality, integrity, or availability.
4. Whether any real user data was involved.

Never include a real recovery code, vault, key or user identifier. Use the test
vectors or a synthetic value.

## Scope

In scope:

- The `PKB1` format and the reference implementation.
- Verifier v1 and the recovery-code format.
- The JSON schemas and the test vectors.

Out of scope:

- The hosted Pinkerton app's infrastructure, rate limits and database.
- Model providers and their retention policies.
- Third-party services (payment, analytics, hosting).

## Response

Best effort. There is no bug bounty yet. If a report affects users, we will:

1. Acknowledge it.
2. Reproduce it.
3. Fix it.
4. Publish an entry in [`docs/incidents.md`](docs/incidents.md), including what
   we do not know.

## Safe harbor

Good-faith research on your own data is welcome. Do not access another user's
vault, code or session. If you accidentally obtain one, stop and report it; do
not copy or retain it.
