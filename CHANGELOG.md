---
id: pinkerton-vault/changelog
version: 1.0.0
status: stable
audience: [human, agent]
updated: 2026-11-05
tags: [changelog]
---

# Changelog

## 1.1.0 — 2026-11-05

### Added

- `spec/recovery-code.md` §0: the code is a function (portability), a proof (the
  server cannot decrypt) and a confidentiality boundary. Normative copy rules:
  no fear framing, no recurring nag, no server-side delivery.

### Changed

- `spec/recovery-code.md` §4, §5, §6: the code is presented as a capability, the
  loss rule is stated once and calmly, and delivery is convenience, never a
  dependency. The local copy is documented as not encrypted at rest, so UI copy
  must not claim otherwise.
- `docs/what-it-is.md`: the code is described as the proof, not only the key.
- `AGENTS.md`: rule against framing the code as a burden.

## 1.0.0 — 2026-11-05

### Added

- `PKB1` format specification and JSON Schema.
- Verifier v1 specification and JSON Schema.
- Recovery-code specification and JSON Schema.
- Dependency-free reference implementation (`recovery`, `verifier`, `PKB1`).
- Deterministic test vectors and a `node --test` conformance suite.
- `llms.txt`, `AGENTS.md` and `index.json` for machine retrieval.
- Public threat model, data map, repository boundaries and incident log.
- Build attestation for the 2026-11-05 deployment.

### Security

- Disclosed `PINK-2026-11-05-01`: the hosted app stored recovery codes in
  plaintext; the code is now generated in the browser and only a PBKDF2 verifier
  is stored.
- The migration of legacy rows selects the candidate that decrypts the existing
  vault and removes duplicate plaintext rows.

### Notes

- The live prompt is not end-to-end encrypted; only stored memory is covered.
- The TEE guarantee is limited to the models served by Chutes.
