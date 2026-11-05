import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatCode, isValidCode, normalizeCode } from "../reference/recovery.mjs";
import { deriveVerifier } from "../reference/verifier.mjs";
import {
  deriveVaultKey,
  fromBase64,
  fromBase64Url,
  isPkb1,
  packVault,
  toBase64,
  unpackVault,
} from "../reference/pkb1.mjs";

const read = (name) =>
  JSON.parse(readFileSync(new URL(`../test-vectors/${name}.json`, import.meta.url), "utf8"));

const recovery = read("recovery-code");
const verifier = read("verifier");
const pkb1 = read("pkb1");

test("recovery code vectors", () => {
  for (const vector of recovery.vectors) {
    assert.equal(normalizeCode(vector.input), vector.normalized);
    assert.equal(formatCode(vector.input), vector.formatted);
    assert.equal(isValidCode(vector.input), vector.valid);
  }
});

test("verifier vectors", async () => {
  for (const vector of verifier.vectors) {
    assert.equal(await deriveVerifier(vector.code), vector.verifier);
    assert.match(vector.verifier, /^[A-Za-z0-9_-]{43}$/);
  }
});

test("PKB1 reader vectors", async () => {
  for (const vector of pkb1.vectors) {
    const key = await deriveVaultKey(vector.code);
    const blob = fromBase64(vector.blob_base64);
    assert.equal(isPkb1(blob), true);
    assert.deepEqual(await unpackVault(blob, key), vector.payload);
  }
});

test("PKB1 raw writer vector is byte-exact", async () => {
  const vector = pkb1.vectors.find((entry) => entry.name === "raw");
  assert.ok(vector);
  const key = await deriveVaultKey(vector.code);
  const iv = fromBase64Url(vector.iv);
  const blob = await packVault(vector.payload, key, { iv, compress: false });
  assert.equal(toBase64(blob), vector.blob_base64);
});

test("PKB1 gzip writer round-trips", async () => {
  const vector = pkb1.vectors.find((entry) => entry.name === "gzip");
  assert.ok(vector);
  const key = await deriveVaultKey(vector.code);
  const iv = fromBase64Url(vector.iv);
  const blob = await packVault(vector.payload, key, { iv });
  assert.deepEqual(await unpackVault(blob, key), vector.payload);
});

test("PKB1 rejects a corrupted blob", async () => {
  const vector = pkb1.vectors.find((entry) => entry.name === "raw");
  assert.ok(vector);
  const key = await deriveVaultKey(vector.code);
  const blob = fromBase64(vector.blob_base64);
  blob[blob.length - 1] ^= 0xff;
  await assert.rejects(() => unpackVault(blob, key));
});

test("PKB1 rejects a wrong key", async () => {
  const vector = pkb1.vectors.find((entry) => entry.name === "raw");
  assert.ok(vector);
  const wrongKey = await deriveVaultKey("ZZZZ-ZZZZ-ZZZZ");
  await assert.rejects(() => unpackVault(fromBase64(vector.blob_base64), wrongKey));
});

test("index.json is structurally valid", () => {
  const index = JSON.parse(readFileSync(new URL("../index.json", import.meta.url), "utf8"));
  assert.equal(index.name, "Pinkerton Vault");
  assert.match(index.version, /^[0-9]+\.[0-9]+\.[0-9]+$/);
  assert.equal(index.entrypoint, "llms.txt");
  assert.ok(Array.isArray(index.documents));
  assert.equal(index.document_count, index.documents.length);
  for (const document of index.documents) {
    assert.ok(document.id);
    assert.ok(document.path);
    assert.match(document.sha256, /^[a-f0-9]{64}$/);
  }
});
