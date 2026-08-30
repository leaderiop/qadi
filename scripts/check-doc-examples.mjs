#!/usr/bin/env node
/**
 * Type-checks the TypeScript examples embedded in spec/.
 *
 * The predecessor's documentation was uniformly uncompilable — every README
 * example called a function signature that no longer existed. Documentation
 * that does not compile is worse than none, because a reader (or a model)
 * pattern-matches against it.
 *
 * Blocks fenced ```typescript are extracted into a scratch file and compiled;
 * ```tsx blocks are compiled the same way, as .tsx. Blocks fenced ```ts are
 * treated as illustrative fragments and skipped, which gives authors an
 * explicit opt-out for partial snippets.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { compileFencedExamples } from "./lib/extract-code-fences.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SPEC = join(ROOT, "spec");
const OUT = join(ROOT, ".doc-examples");

const collectMarkdown = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectMarkdown(full));
    else if (full.endsWith(".md")) out.push(full);
  }
  return out;
};

compileFencedExamples({
  root: ROOT,
  outDir: OUT,
  files: collectMarkdown(SPEC),
  label: "doc-examples",
});
