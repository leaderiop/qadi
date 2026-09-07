#!/usr/bin/env node
/**
 * Type-checks the TypeScript examples embedded in apps/website's docs content.
 *
 * A sibling of scripts/check-doc-examples.mjs (spec/'s own checker), not an
 * extension of it — this walks a structurally different content shape (Astro
 * content collections, .md/.mdx frontmatter) and would muddy that file's
 * single-purpose doc comment if folded in. Both scripts share the same fence
 * convention and compile mechanics via scripts/lib/extract-code-fences.mjs,
 * so there is exactly one scratch-tsconfig/`paths`/compile implementation
 * between them, not two that can drift apart.
 *
 * Compiles under the workspace's own TypeScript 7.x (this script runs from
 * repo root against tsconfig.base.json), not apps/website's local 6.0.3 pin —
 * that pin exists for Astro/Starlight tooling lag, not for what a reader
 * experiences copying a snippet into their own project. A snippet's job is to
 * prove it compiles against the real published library types.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { compileFencedExamples } from "./lib/extract-code-fences.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const DOCS = join(ROOT, "apps/website/src/content/docs");
const OUT = join(ROOT, ".website-doc-examples");

const collectContent = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectContent(full));
    else if (full.endsWith(".md") || full.endsWith(".mdx")) out.push(full);
  }
  return out;
};

let files;
try {
  files = collectContent(DOCS);
} catch (error) {
  if (error.code === "ENOENT") {
    // A missing directory is not "zero examples, all pass" — it means this
    // checker (`node scripts/check-website-doc-examples.mjs`) is not
    // checking what its own DoD-table row promises ("Every runnable example
    // in apps/website's docs content compiles"), which the docs directory
    // vanishing (moved, renamed, an Astro content-collection restructure)
    // would otherwise pass silently. Fail loud instead.
    console.error(
      `website-doc-examples: ${DOCS} does not exist. If apps/website/src/content/docs ` +
        `was intentionally removed or relocated, update this script's DOCS path ` +
        `(and its row in spec/process/definitions-of-done.md) rather than letting ` +
        `the gate report a false pass.`,
    );
    process.exit(1);
  }
  throw error;
}

compileFencedExamples({
  root: ROOT,
  outDir: OUT,
  files,
  label: "website-doc-examples",
});
