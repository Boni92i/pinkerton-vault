---
id: pinkerton-vault/examples/curl
version: 1.0.0
status: draft
audience: [implementer, agent]
updated: 2026-11-05
tags: [example, http, curl]
depends_on: [pinkerton-vault/schema/openapi]
---

# HTTP contract

The hosted Pinkerton service maps these logical operations to its internal RPCs.
The contract is a design for third-party implementations; it is not a promise
that the hosted service exposes these exact paths.

Both the `anon_id` and the verifier are **bearer credentials**. Treat them like
the code: do not put them in a URL you share, a log or a screenshot.

## Register a verifier

```sh
curl -X POST https://vault.example.com/v1/verifiers \
  -H "Content-Type: application/json" \
  -d '{"anon_id":"00000000-0000-4000-8000-000000000000","verifier":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'
```

Response: `{"ok":true}`

## Log in with a verifier

```sh
curl -X POST https://vault.example.com/v1/login \
  -H "Content-Type: application/json" \
  -d '{"verifier":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"}'
```

Response: `{"anon_id":"00000000-0000-4000-8000-000000000000"}`

## Store a vault

`blob_base64` is a `PKB1` blob encoded in standard base64. The server treats it
as opaque bytes; it MUST NOT parse, log or decrypt it.

```sh
curl -X PUT https://vault.example.com/v1/vault/00000000-0000-4000-8000-000000000000 \
  -H "Content-Type: application/json" \
  -d '{"blob_base64":"UEtCMQ..."}'
```

Response: `{"size":1234,"updated_at":"2026-11-05T20:00:00Z"}`

## Read a vault

```sh
curl https://vault.example.com/v1/vault/00000000-0000-4000-8000-000000000000
```

Response: `{"blob_base64":"UEtCMQ...","updated_at":"2026-11-05T20:00:00Z"}`

## Errors

| Status | Body | Meaning |
|---|---|---|
| `400` | `{"error":"invalid_verifier"}` | The verifier is not 43 base64url characters |
| `401` | `{"error":"unknown_session"}` | The verifier does not resolve to an `anon_id` |
| `409` | `{"error":"already_registered"}` | A different verifier is already sealed for this `anon_id` |
| `413` | `{"error":"blob_too_large"}` | The blob exceeds the server's cap (5 MB in the hosted app) |
| `429` | `{"error":"rate_limited"}` | Too many failed logins from this network |

The full machine-readable contract is
[`../schema/openapi.json`](../schema/openapi.json).
