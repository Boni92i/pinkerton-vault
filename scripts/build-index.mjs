import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, extname } from "node:path";

const root = process.cwd();
const directories = ["docs", "spec", "schema", "reference", "test-vectors", "examples"];
const rootFiles = ["README.md", "llms.txt", "AGENTS.md", "SECURITY.md", "CONTRIBUTING.md", "CHANGELOG.md", "LICENSING.md", "CITATION.cff", "LICENSE", "package.json"];

const files = [];
for (const directory of directories) {
  walk(join(root, directory));
}
for (const file of rootFiles) {
  const path = join(root, file);
  try {
    if (statSync(path).isFile()) files.push(path);
  } catch {
    /* optional file */
  }
}

function walk(directory) {
  let entries = [];
  try {
    entries = readdirSync(directory);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) walk(path);
    else files.push(path);
  }
}

function parseFrontMatter(text) {
  if (!text.startsWith("---\n")) return {};
  const end = text.indexOf("\n---", 4);
  if (end === -1) return {};
  const block = text.slice(4, end);
  const result = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^([a-z_]+):\s*(.*)$/i);
    if (!match) continue;
    const key = match[1];
    const raw = match[2].trim();
    if (raw.startsWith("[") && raw.endsWith("]")) {
      result[key] = raw
        .slice(1, -1)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    } else {
      result[key] = raw.replace(/^["']|["']$/g, "");
    }
  }
  return result;
}

function summaryFrom(text) {
  const body = text.replace(/^---[\s\S]*?---\n/, "");
  const blocks = body.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    if (lines[0].startsWith("#")) continue;
    if (lines.every((line) => line.startsWith("|") || line.startsWith("---"))) continue;
    if (lines[0].startsWith("-") || lines[0].startsWith("*")) {
      const item = [];
      for (const line of lines) {
        if (item.length > 0 && (line.startsWith("-") || line.startsWith("*"))) break;
        item.push(line.replace(/^[-*]\s+/, ""));
      }
      return item.join(" ").replace(/[*_`]/g, "").slice(0, 240);
    }
    return lines
      .map((line) => line.replace(/^>\s*/, ""))
      .join(" ")
      .replace(/[*_`]/g, "")
      .slice(0, 240);
  }
  return "";
}

function summaryFor(relativePath, kind, text) {
  if (relativePath === "CITATION.cff") return "Citation metadata for the format.";
  if (relativePath === "package.json") return "Node package metadata: scripts, version and engine.";
  if (relativePath === "LICENSE") return "MIT license text (code), with a note on CC BY 4.0 documentation.";
  if (relativePath === "schema/openapi.json") return "OpenAPI 3.1 contract for the logical Vault API.";
  if (kind === "schema") return `JSON Schema: ${relativePath}`;
  if (kind === "test-vector") return "Deterministic conformance vectors.";
  if (kind === "reference") return "Dependency-free reference implementation.";
  if (kind === "example") return "Runnable example.";
  return summaryFrom(text).slice(0, 240);
}

function kindFor(path) {
  const directory = relative(root, path).split(/[\\/]/)[0];
  if (directory === "docs") return "doc";
  if (directory === "spec") return "spec";
  if (directory === "schema") return "schema";
  if (directory === "reference") return "reference";
  if (directory === "test-vectors") return "test-vector";
  if (directory === "examples") return "example";
  return "entrypoint";
}

const documents = files
  .sort()
  .map((path) => {
    const text = readFileSync(path, "utf8");
    const frontMatter = extname(path) === ".md" || extname(path) === ".txt" ? parseFrontMatter(text) : {};
    const relativePath = relative(root, path).split(/[\\/]/).join("/");
    return {
      id: frontMatter.id ?? `pinkerton-vault/${relativePath.replace(/\.[^.]+$/, "")}`,
      path: relativePath,
      kind: frontMatter.kind ?? kindFor(path),
      version: frontMatter.version ?? "1.0.0",
      status: frontMatter.status ?? "stable",
      audience: frontMatter.audience ?? ["agent"],
      updated: frontMatter.updated ?? "2026-11-05",
      tags: frontMatter.tags ?? [],
      depends_on: frontMatter.depends_on ?? [],
      summary: frontMatter.summary ?? summaryFor(relativePath, frontMatter.kind ?? kindFor(path), text),
      sha256: createHash("sha256").update(text).digest("hex"),
    };
  });

const index = {
  name: "Pinkerton Vault",
  version: "1.0.0",
  updated: "2026-11-05",
  base: "https://github.com/Boni92i/pinkerton-vault",
  entrypoint: "llms.txt",
  human_entrypoint: "README.md",
  agent_instructions: "AGENTS.md",
  document_count: documents.length,
  documents,
};

writeFileSync("index.json", JSON.stringify(index, null, 2) + "\n");
console.log(`wrote index.json with ${documents.length} entries`);
