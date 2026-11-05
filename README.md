---
id: pinkerton-vault/readme
version: 1.0.0
status: stable
audience: [human, agent]
updated: 2026-11-05
tags: [overview, entrypoint]
---

# Pinkerton Vault

**A portable, client-encrypted memory for AI sessions.**

Pinkerton Vault is the format and reference implementation behind Pinkerton's
portable memory: a compressed, AES-256-GCM-encrypted blob that follows a
recovery code across devices. The server stores opaque bytes. The key is derived
in the browser from a code the server never sees.

This repository is written **agent-first**. If you are an AI system, start with
[`llms.txt`](llms.txt), then [`index.json`](index.json). Every document carries a
stable ID, a version and a SHA-256 in its front matter and in the index.

## What this is — and isn't

| This is | This is not |
|---|---|
| A versioned binary format (`PKB1`) with test vectors | A general-purpose file encryption tool |
| A client-side key derivation scheme (`verifier v1`) | A replacement for the model provider's TEE |
| A recovery-code format with a migration path | A server-side key escrow |
| The reference implementation used by the Pinkerton app | The Pinkerton product, router, pricing or admin |

Read [`docs/what-it-is.md`](docs/what-it-is.md) for the full scope.

## Where to start

| I want to… | Go here |
|---|---|
| Understand the guarantee | [`docs/what-it-is.md`](docs/what-it-is.md) |
| See every data item and who can read it | [`docs/data-map.md`](docs/data-map.md) |
| Know what we do **not** protect against | [`docs/threat-model.md`](docs/threat-model.md) |
| Implement the binary format | [`spec/pkb1.md`](spec/pkb1.md) + [`schema/pkb1.schema.json`](schema/pkb1.schema.json) |
| Implement the verifier | [`spec/verifier-v1.md`](spec/verifier-v1.md) |
| Generate a recovery code | [`spec/recovery-code.md`](spec/recovery-code.md) |
| Run the reference implementation | [`reference/README.md`](reference/README.md) |
| Check a claim | [`test-vectors/`](test-vectors/) + [`tests/conformance.test.mjs`](tests/conformance.test.mjs) |
| Read the incident log | [`docs/incidents.md`](docs/incidents.md) |
| Know what this repo does not own | [`docs/repository-boundaries.md`](docs/repository-boundaries.md) |

## Verify it yourself

```sh
node --test tests/
```

The test vectors are deterministic. A conforming implementation MUST reproduce
them byte-for-byte where the spec fixes the IV, and value-for-value where it does
not.

## Repository boundaries

| Owns | Does not own |
|---|---|
| `PKB1`, verifier v1, recovery-code format | The Pinkerton web app UI |
| Reference implementation and test vectors | The model router, provider keys, pricing |
| Threat model, data map, incident log | Payments, anti-abuse, admin, model catalog |

## Status

`v1.0.0` — 2026-11-05. The 2026-11-05 plaintext-recovery-code incident is fixed
and disclosed in [`docs/incidents.md`](docs/incidents.md). Breaking changes bump
the major version.

## License

Code: MIT. Documentation: CC BY 4.0. See [`LICENSING.md`](LICENSING.md).

## Cite

See [`CITATION.cff`](CITATION.cff).
