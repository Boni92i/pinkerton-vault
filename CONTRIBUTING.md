---
id: pinkerton-vault/contributing
version: 1.0.0
status: stable
audience: [human, agent, contributor]
updated: 2026-11-05
tags: [contributing, governance]
---

# Contributing

This repository is agent-first. A change is accepted when a machine can check it.

## Hard rules

1. **No source, no merge.** Every factual claim needs a test, a schema, or an
   incident entry. A claim without one is not normative.
2. **If unsure, label it — do not delete it.** A disputed fact gets a status and
   both readings; it does not disappear.
3. **A correction goes into the record, never over it.** Say what changed and why.
4. **No dependencies.** The reference implementation and the tests use the
   platform only (Node 20+ / Bun / WebCrypto).
5. **No secrets, no real codes.** Use the test vectors.

## Adding a test vector

```sh
node scripts/generate-vectors.mjs
node --test tests/
```

Commit the generated JSON and the test that consumes it. Do not hand-edit a
vector; regenerate it.

## Changing a spec

1. Open an issue with the exact sentence and the two possible readings.
2. Bump the version in the front matter and in `CHANGELOG.md`.
3. Update the affected schema and vectors.
4. Run `node --test tests/`.
5. Run `node scripts/build-index.mjs` and commit `index.json`.
6. Breaking changes bump the major version.

## Style

- One concept per file, under ~200 lines.
- Every Markdown file starts with YAML front matter: `id`, `version`, `status`,
  `audience`, `updated`, `tags`, `depends_on`.
- Use RFC 2119 keywords in normative sections.
- No marketing language in a spec.
- Use relative links inside Markdown; `index.json` and `llms.txt` carry the
  absolute URLs.

## What does not belong here

The Pinkerton app, the model router, pricing, payments, anti-abuse, admin, the
model catalog, or any secret. See
[`docs/repository-boundaries.md`](docs/repository-boundaries.md).
