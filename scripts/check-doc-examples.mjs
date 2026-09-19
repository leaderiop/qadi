#!/usr/bin/env node
/**
 * Type-checks the TypeScript examples embedded in spec/, AGENTS.md,
 * CONTRIBUTING.md, the root README and every package's own README.
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
 *
 * **AGENTS.md and CONTRIBUTING.md are walked too (SM-01, SM-04).** This
 * previously covered `spec/` only, and AGENTS.md's own CCR-QD-077 note names
 * the consequence: a §2 service example carried a signature no version of
 * the library ever had, fenced ```ts (a fragment, so nothing would have
 * compiled it even had the walk reached it) rather than ```typescript, and
 * "was noticed four separate times before anyone changed it." Reclassifying
 * a genuinely-complete example there from ```ts to ```typescript is AGENTS.md's
 * own edit to make (§12 already sets that convention); this walk's job is
 * only to stop being structurally unable to see it once that happens —
 * `spec/`'s own `failOnEmpty` guard stays meaningful because it counts blocks
 * across every file in one pass, so these two contributing zero today (both
 * are currently all ```ts fragments) does not mask a broken walk elsewhere.
 *
 * **The root README and every package README are walked too (DR-02, 100-lens
 * audit).** The README is the first thing a consumer copies from, and this
 * gate's own reason for existing — "every README example called a signature
 * that no longer existed" — describes a README, not `spec/`. Before this, the
 * root README's two ```typescript fences (the core quickstart and the
 * `@qadi/promise` facade) and every package README were structurally outside
 * every compile gate; `scripts/check-website-doc-examples.mjs` covers
 * `apps/website`'s docs content separately and is unaffected by this.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { compileFencedExamples } from "./lib/extract-code-fences.mjs";

const ROOT = new URL("..", import.meta.url).pathname;
const SPEC = join(ROOT, "spec");
const PACKAGES = join(ROOT, "packages");
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

const packageReadmes = readdirSync(PACKAGES)
  .map((pkg) => join(PACKAGES, pkg, "README.md"))
  .filter((path) => {
    try {
      return statSync(path).isFile();
    } catch {
      return false;
    }
  });

compileFencedExamples({
  root: ROOT,
  outDir: OUT,
  files: [
    ...collectMarkdown(SPEC),
    join(ROOT, "AGENTS.md"),
    join(ROOT, "CONTRIBUTING.md"),
    join(ROOT, "README.md"),
    ...packageReadmes,
  ],
  label: "doc-examples",
  // `spec/` is normative and AGENTS.md §12 makes running examples the
  // default there — a walk turning up zero blocks means this checker is
  // looking in the wrong place, not that `spec/` legitimately has none.
  failOnEmpty: true,
});
