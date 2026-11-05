---
id: pinkerton-vault/docs/repository-boundaries
version: 1.0.0
status: stable
audience: [human, agent, contributor]
updated: 2026-11-05
tags: [scope, governance]
---

# Repository boundaries

This repository is the public artifact. It is deliberately smaller than the
product. A change that belongs to another repository should go there, not here.

| Repository | Responsibility |
|---|---|
| `Boni92i/pinkerton-vault` (this repo, public) | `PKB1` format, verifier v1, recovery-code format, reference implementation, test vectors, threat model, data map, incident log |
| `Boni92i/pinkerton-ai` (private) | The Pinkerton web app, chat UI, model router, provider keys, pricing, payments, anti-abuse, admin, model catalog |

## What this repo owns

- The normative `PKB1` byte layout and its versioning.
- The normative verifier v1 parameters and its storage contract.
- The recovery-code alphabet, length, normalization and display rules.
- Dependency-free reference implementations in `reference/`.
- Deterministic test vectors in `test-vectors/`.
- The public threat model, data map and incident log.
- The build attestations in `attestations/`.

## What this repo does not own

- The hosted service's internal database schema (it is described here only as a
  logical contract).
- The model catalogue, provider selection or pricing.
- The app's UI, onboarding or copy.
- The anti-abuse rules, rate limits beyond the login verifier, or admin tooling.
- Any secret or credential. If a change needs a secret, it does not belong here.

## How the two repos relate

The app imports the same algorithms and is expected to pass the vectors in this
repo. The format is the contract; the app is one implementation. A conforming
third-party implementation is welcome and should be able to pass `node --test
tests/` without reading the app.
