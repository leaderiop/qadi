// The check that the first-render characterisation still holds the text it was first committed with.
//
// `BASE` is the commit that added `ConfigureFirstRender.characterisation.test.tsx`. The file as checked out must be
// that commit's file byte for byte, compared by sha256: the pins were written on the code before the hooks changed,
// so a pin edited to follow the change would stop guarding it. The run mode also refuses when `BASE` is not the
// commit that added the file, so a base moved to a later commit cannot make a changed file pass.
//
// From the repository root:
//   node .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-characterisation-check.mjs
//   node .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-characterisation-check.mjs --self-test
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BASE = "cf3186d94b1d4c4cbb3fa2f92b2726379c888db7";
const CHARACTERISATION = "packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx";

const digest = (text) => createHash("sha256").update(text).digest("hex");

/** The reasons the current text is not the base text; empty when they are equal. */
export const judge = (baseText, currentText) => {
  const base = digest(baseText);
  const current = digest(currentText);
  return base === current
    ? []
    : [`${CHARACTERISATION} differs from its first commit: sha256 ${current} now, ${base} at ${BASE.slice(0, 8)}`];
};

const selfTest = () => {
  const cases = [
    ["equal text passes", judge("a\nb\n", "a\nb\n").length === 0],
    ["one changed byte fails, naming the file", judge("a\nb\n", "a\nb \n").some((reason) => reason.startsWith(CHARACTERISATION))],
    ["empty against non-empty fails", judge("a\nb\n", "").length === 1],
  ];
  const failed = cases.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const run = () => {
  const added = execFileSync("git", ["log", "--diff-filter=A", "--format=%H", "--", CHARACTERISATION], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((line) => line !== "");
  const first = added[added.length - 1];
  if (first !== BASE) {
    process.stderr.write(`BASE ${BASE} is not the commit that added ${CHARACTERISATION} (${first ?? "none"})\n`);
    process.exit(1);
  }
  const baseText = execFileSync("git", ["show", `${BASE}:${CHARACTERISATION}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  const reasons = judge(baseText, readFileSync(CHARACTERISATION, "utf8"));
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`characterisation: ${CHARACTERISATION} holds its first commit (${BASE.slice(0, 8)})\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run();
