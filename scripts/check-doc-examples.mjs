#!/usr/bin/env node
/**
 * Type-checks the TypeScript examples embedded in spec/.
 *
 * The predecessor's documentation was uniformly uncompilable — every README
 * example called a function signature that no longer existed. Documentation
 * that does not compile is worse than none, because a reader (or a model)
 * pattern-matches against it.
 *
 * Blocks fenced ```typescript are extracted into a scratch file and compiled.
 * Blocks fenced ```ts are treated as illustrative fragments and skipped, which
 * gives authors an explicit opt-out for partial snippets.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

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

/** Extracts ```typescript blocks, ignoring ```ts fragments. */
const extractBlocks = (source) => {
  const blocks = [];
  const lines = source.split("\n");
  let current = null;

  for (const line of lines) {
    const fence = /^[ \t]*```(\w*)/.exec(line);
    if (fence !== null) {
      if (current === null) {
        current = fence[1] === "typescript" ? [] : undefined;
      } else {
        if (current !== undefined) blocks.push(current.join("\n"));
        current = null;
      }
      continue;
    }
    if (Array.isArray(current)) current.push(line);
  }
  return blocks;
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let count = 0;
const written = [];

for (const file of collectMarkdown(SPEC)) {
  const blocks = extractBlocks(readFileSync(file, "utf8"));
  blocks.forEach((block, index) => {
    // Declaration-only blocks describe a signature rather than use it; wrapping
    // them in `declare module` would change their meaning, so they are compiled
    // as-is and simply must be self-consistent.
    const name = `${relative(SPEC, file).replace(/[/.]/g, "_")}_${index}.ts`;
    writeFileSync(join(OUT, name), block);
    written.push(name);
    count += 1;
  });
}

writeFileSync(
  join(OUT, "tsconfig.json"),
  JSON.stringify(
    {
      extends: "../tsconfig.base.json",
      include: ["*.ts"],
      compilerOptions: {
        noEmit: true,
        composite: false,
        // Examples are illustrative: an unused import in a snippet is not a
        // defect, but an unresolved one is.
        noUnusedLocals: false,
        noUnusedParameters: false,
        paths: {
          "@guard/core": ["../packages/core/src/index.ts"],
          "@guard/testing": ["../packages/testing/src/index.ts"],
        },
      },
    },
    null,
    2,
  ),
);

if (count === 0) {
  console.log("doc-examples: no ```typescript blocks found");
  process.exit(0);
}

try {
  execFileSync("npx", ["tsc", "-p", join(OUT, "tsconfig.json")], {
    cwd: ROOT,
    stdio: "pipe",
    encoding: "utf8",
  });
  console.log(`doc-examples: ${count} block(s) compile`);
  rmSync(OUT, { recursive: true, force: true });
} catch (error) {
  console.error(error.stdout ?? "");
  console.error(`\ndoc-examples: ${count} block(s) extracted, compilation FAILED.`);
  console.error(`Scratch files kept in .doc-examples/ for inspection.`);
  process.exit(1);
}
