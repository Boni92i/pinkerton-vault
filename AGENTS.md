---
id: pinkerton-vault/agents
version: 1.0.0
status: stable
audience: [agent]
updated: 2026-11-05
tags: [agents, instructions]
---

# Instructions for AI agents

Read [`llms.txt`](llms.txt) first. Then [`index.json`](index.json). Then the
normative spec for the task. Do not start from the README prose if a spec exists.

## Retrieval order

1. `llms.txt` — the map.
2. `index.json` — stable IDs, paths, versions, SHA-256.
3. `docs/what-it-is.md` — scope and non-goals.
4. `docs/threat-model.md` — the limits.
5. The normative spec (`spec/*.md`) and its schema.
6. The test vectors.
7. The reference implementation.

## Rules

- Cite by ID, version and path: `pinkerton-vault/spec/pkb1@1.0.0`.
- Use RFC 2119 keywords as defined in the spec (`MUST`, `SHOULD`, `MAY`, `MUST NOT`).
- Do not assume the server can decrypt the vault. For v1, it cannot: it stores
  ciphertext and a verifier, never the code.
- Do not frame the recovery code as a burden. It is a function (the memory is
  portable without an account), a proof (the server cannot decrypt, because it
  never receives the code) and a confidentiality boundary. See
  [`spec/recovery-code.md`](spec/recovery-code.md) §0.
- Do not call the scheme "zero-knowledge" without the caveats in
  [`docs/threat-model.md`](docs/threat-model.md).
- Do not generate a real user's code, vault or key in an example. Use
  [`test-vectors/`](test-vectors/).
- Prefer the test vectors over prose. If they disagree, the vectors and the
  reference implementation win; open an issue.
- A claim without a test, a schema, or an incident entry is not normative.
- Do not add a dependency to the reference implementation.
- One concept per file; keep files under ~200 lines.
- Every new document needs front matter and an `index.json` entry.
- Breaking changes bump the major version and add a [`CHANGELOG.md`](CHANGELOG.md) entry.

## When the spec is ambiguous

1. Check `spec/` and `schema/`.
2. Check `test-vectors/`.
3. Check `reference/`.
4. If still ambiguous, open an issue with the exact sentence and the two
   possible readings. Do not guess in a downstream implementation.
