#!/usr/bin/env node
/**
 * Fails when README.md, CONTRIBUTING.md, spec/roadmap.md or
 * apps/website/PRODUCT.md quote a package version, or a "not published"
 * claim, that disagrees with `package.json`.
 *
 * This exists because it already happened: commit `22c19f0` bumped the root
 * and every package's `package.json` under `packages/` to `0.4.0` via
 * `pnpm changeset-version`, and published all nine for the first time the
 * same day, but touched only `package.json`/`CHANGELOG.md` files — leaving
 * four documents quoting `0.3.0`/`0.2.0` and describing five packages as
 * "not yet published" hours after that stopped being true. Nothing connected
 * a version bump to the prose describing it, so the connection survived only
 * as long as someone remembered to update it by hand, the same failure shape
 * `check-api-surface.mjs` and `check-dod-table.mjs` already close for the
 * export surface and the merge gate.
 *
 * Deliberately does **not** query the npm registry. ADR-QD-038 already
 * decided that publishing itself — `changeset-version`, `changeset-publish`
 * — stays manual and out of `pnpm check`; a live-registry call inside a merge
 * gate would be exactly the ambient, unreproducible input AGENTS.md §6 rules
 * out everywhere else. Whether a package has ever actually been published is
 * a fact a human states in prose, dated, the way CONTRIBUTING.md's own
 * "verified live against the npm registry" sentence already does — this gate
 * only keeps the *version number* in that sentence honest once it is true,
 * and flags a leftover "not yet published" phrase once none should remain.
 *
 * Two checks, both directions:
 *
 *   1. VERSION — every backticked version literal in the four documents'
 *      publish-status paragraphs equals root `package.json`'s version.
 *   2. STALE-CLAIM — none of those paragraphs still says a package is
 *      unpublished, once every package is.
 */
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const failures = [];
const fail = (where, message) => failures.push(`${where}  ${message}`);

const { version } = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

/**
 * The publish-status paragraph in each document, identified the same way
 * `check-dod-table.mjs` slices `## Merge gate` — a start marker unique to the
 * paragraph, and an end marker for whatever follows it. Not a whole-file
 * scan: a version number appearing elsewhere in these documents (a changelog
 * excerpt, a worked example) is not a publish-status claim.
 */
const TARGETS = [
  { file: "README.md", start: "> **Status:", end: "\n\n## Why" },
  { file: "CONTRIBUTING.md", start: "**State as of this writing**", end: "\n\n## Why the rules read the way they do" },
  { file: "spec/roadmap.md", start: "\n## Current state", end: "\n\n| Gate | Status |" },
  { file: "apps/website/PRODUCT.md", start: "## Capabilities and Constraints", end: "\n\n## Brand Commitments" },
];

/** A version literal, backticked, an optional leading `v` (`` `v0.2.0` ``). */
const VERSION = /`v?(\d+\.\d+\.\d+)`/g;

/**
 * Phrases that mean "at least one package here is not published". Registered
 * explicitly, the same "no silent absence" shape
 * `check-devtools-claims.mjs` uses for its own claims-of-absence table: once
 * every package is published, none of these belongs in these paragraphs, and
 * a future genuinely-unpublished package should revisit this list rather
 * than have prose reappear that this gate silently tolerates.
 */
const STALE_PHRASES = [
  "have not been published",
  "never been published",
  "never actually been published",
  "not yet published",
  "unpublished",
];

for (const { file, start, end } of TARGETS) {
  const path = join(ROOT, file);
  const rel = relative(ROOT, path);
  const content = readFileSync(path, "utf8");

  const from = content.indexOf(start);
  if (from === -1) {
    fail(
      rel,
      `[missing-anchor] expected to find "${start}" — has the publish-status paragraph moved ` +
        "or been reworded? Update this script's TARGETS to match.",
    );
    continue;
  }
  const to = content.indexOf(end, from);
  const section = to === -1 ? content.slice(from) : content.slice(from, to);

  for (const match of section.matchAll(VERSION)) {
    if (match[1] !== version) {
      fail(rel, `[version] cites \`${match[0]}\`, and package.json's version is \`${version}\`.`);
    }
  }

  const lower = section.toLowerCase();
  for (const phrase of STALE_PHRASES) {
    if (lower.includes(phrase)) {
      fail(
        rel,
        `[stale-claim] still says "${phrase}" — every @qadi/* package is published. If one ` +
          "genuinely is not, say so with its real version story rather than leaving this generic, " +
          "and revisit this script's STALE_PHRASES list deliberately rather than editing around it.",
      );
    }
  }
}

if (failures.length > 0) {
  for (const line of failures) console.error(line);
  console.error(
    `\n${failures.length} publish-status drift(s). README.md, CONTRIBUTING.md, spec/roadmap.md and ` +
      "apps/website/PRODUCT.md must agree with package.json's version and with what is actually published.",
  );
  process.exit(1);
}

console.log(`publish-status: ${TARGETS.length} document(s) agree with package.json's version (${version})`);
