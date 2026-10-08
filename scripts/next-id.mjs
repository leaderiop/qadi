#!/usr/bin/env node
/**
 * Hands out the next free spec identifier, across every worktree.
 *
 *   node scripts/next-id.mjs CCR|INV|BEH|ADR
 *
 * Parallel work in separate worktrees each reads "the highest number on disk" in
 * its own checkout, so they all pick the same next number: in one wave four
 * branches took CCR-QD-203, three took INV-QD-106, and two gave different new
 * behaviours BEH-QD-325. Hand-written offsets did not prevent it.
 *
 * This reads the highest number in *every* worktree's `spec/` and in a
 * reservation file under the git common directory, which all worktrees share,
 * and returns one past the larger. The number is written to the reservation file
 * before it is printed, so two callers never receive the same one. A reserved
 * number that is never used is a gap, which the register tolerates; a duplicate
 * it does not.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

/** Where each kind is declared, and how a declaration spells its number. */
const KINDS = {
  CCR: { files: (spec) => [join(spec, "README.md")], pattern: /^\| CCR-QD-(\d+) \|/gm },
  INV: { files: (spec) => [join(spec, "invariants.md")], pattern: /^## INV-QD-(\d+)\b/gm },
  BEH: {
    files: (spec) =>
      readdirSync(join(spec, "behaviors")).filter((name) => name.endsWith(".md")).map((name) => join(spec, "behaviors", name)),
    pattern: /^## BEH-QD-(\d+)\b/gm,
  },
  ADR: {
    files: (spec) =>
      readdirSync(join(spec, "decisions")).filter((name) => /^\d+-.*\.md$/.test(name)).map((name) => join(spec, "decisions", name)),
    pattern: /^()/gm,
    fromName: /^(\d+)-/,
  },
};

const kind = process.argv[2];
if (!(kind in KINDS)) {
  console.error(`usage: next-id.mjs ${Object.keys(KINDS).join("|")}`);
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const worktrees = git("worktree", "list", "--porcelain")
  .split("\n")
  .filter((line) => line.startsWith("worktree "))
  .map((line) => line.slice("worktree ".length));

const spec = KINDS[kind];
let highest = 0;
for (const tree of worktrees) {
  const specDir = join(tree, "spec");
  if (!existsSync(specDir)) continue;
  for (const file of spec.files(specDir)) {
    if (!existsSync(file)) continue;
    if (spec.fromName) {
      const match = spec.fromName.exec(file.split("/").at(-1));
      if (match !== null) highest = Math.max(highest, Number(match[1]));
      continue;
    }
    for (const match of readFileSync(file, "utf8").matchAll(spec.pattern)) {
      highest = Math.max(highest, Number(match[1]));
    }
  }
}

const reservations = resolve(git("rev-parse", "--git-common-dir"), "qadi-reserved-ids.json");
const reserved = existsSync(reservations) ? JSON.parse(readFileSync(reservations, "utf8")) : {};
const next = Math.max(highest, reserved[kind] ?? 0) + 1;
writeFileSync(reservations, JSON.stringify({ ...reserved, [kind]: next }, null, 2));

console.log(String(next).padStart(3, "0"));
