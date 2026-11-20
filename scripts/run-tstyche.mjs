#!/usr/bin/env node
/**
 * Runs tstyche twice, so every type pin is checked under each setting of the Effect language
 * service's `floatingEffect` rule (ADR-QD-175).
 *
 * The first pass is tstyche's own configuration: `tstyche.json` names `tsconfig.tstyche.json`,
 * where the rule is off, so a negative `toBeCallableWith` pin on a function that returns an
 * `Effect` can fail. The second compiles under `tsconfig.test.json`, where the rule is on as it
 * is for `pnpm typecheck`; there a positive pin on such a function fails whatever its
 * arguments, so a bare negative pin on one cannot keep a passing positive twin.
 *
 * `CHARACTERISATION` pins tstyche's reading under each setting in two blocks. The block that
 * holds only with the rule off (`RULE_ON_SKIP`'s title) is skipped in the second pass. The other
 * block turns the rule on with an in-file language-service directive, so it holds in both
 * passes, and the first is the one where the directive does any work: the second already
 * compiles with the rule on. tstyche's `--skip` skips every describe or test whose title
 * contains the text, ignoring case, so the text must appear once in that file and in no other
 * type test.
 *
 * Each pass must compile every file it selects under its own tsconfig. tstyche compiles a file
 * outside that tsconfig's `include` under its baseline compiler options instead, where neither
 * setting holds, and says so only in the `uses TypeScript … with …` line it prints when the
 * project changes; a pass whose output names any other project fails.
 *
 * Before either pass, the files `tstyche --listFiles` selects must be exactly the files
 * `scripts/lib/type-tests.mjs` walks, the set `check-house-style.mjs` counts pins in.
 *
 * Both passes always run, and the exit status is non-zero if either fails. No shell: the
 * arguments are fixed, and tstyche runs on the Node binary that runs this script.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { walkTypeTests } from "./lib/type-tests.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TSTYCHE = join(ROOT, "node_modules", "tstyche", "dist", "bin.js");
const CHARACTERISATION = "packages/core/test/FloatingEffectPins.tst.ts";
const RULE_ON_SKIP = "under the tstyche tsconfig";
/** The line tstyche prints each time the project changes, and a file's result line. */
const USES = /^uses TypeScript \S+ with (.+)$/;
const RESULT = /^(?:pass|fail) (\S+)$/;
/** Colour codes, removed before tstyche's output is read; built from the ESC character, which a regex literal may not hold (`no-control-regex`). */
const COLOUR = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

/** @param {ReadonlyArray<string>} args */
const tstyche = (args) =>
  spawnSync(process.execPath, [TSTYCHE, ...args], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "inherit"],
    encoding: "utf8",
    maxBuffer: 1 << 26,
  });

const listed = tstyche(["--listFiles"]);
if (listed.status !== 0) {
  console.error("run-tstyche: `tstyche --listFiles` failed, so the skip texts could not be checked.");
  process.exit(1);
}
/** @type {ReadonlyArray<string>} */
const selected = JSON.parse(listed.stdout).map((path) => relative(ROOT, path));
// `check-house-style.mjs` counts negative pins in the files this walk finds, which mirrors
// tstyche's default `testFileMatch` by hand; a tstyche upgrade that changes the default would
// leave a selected file with an uncounted, unchecked pin, so the two sets must be equal.
const walked = walkTypeTests(ROOT);
const unwalked = selected.filter((file) => !walked.includes(file));
const unselected = walked.filter((file) => !selected.includes(file));
if (unwalked.length > 0 || unselected.length > 0) {
  console.error(
    "run-tstyche: scripts/lib/type-tests.mjs and `tstyche --listFiles` disagree, so some type test is not " +
      `counted by check-house-style.mjs; selected by tstyche only: ${JSON.stringify(unwalked)}, ` +
      `found by the walk only: ${JSON.stringify(unselected)}. Update TYPE_TEST_FILE to tstyche's testFileMatch.`,
  );
  process.exit(1);
}
const holders = selected
  .map((file) => ({ file, count: readFileSync(join(ROOT, file), "utf8").toLowerCase().split(RULE_ON_SKIP).length - 1 }))
  .filter((holder) => holder.count > 0);
if (holders.length !== 1 || holders[0].file !== CHARACTERISATION || holders[0].count !== 1) {
  console.error(
    `run-tstyche: "${RULE_ON_SKIP}" must appear once, in ${CHARACTERISATION}, and in no other type test, ` +
      `because the second pass skips every title that contains it; found ${JSON.stringify(holders)}.`,
  );
  process.exit(1);
}

/**
 * Runs one pass and prints its output; true when tstyche passed and compiled every file it
 * selected under `project`, as tstyche names it.
 *
 * @param {string} title
 * @param {string} project
 * @param {ReadonlyArray<string>} args
 */
const pass = (title, project, args) => {
  console.log(`run-tstyche: ${title}`);
  const result = tstyche(args);
  const output = result.stdout ?? "";
  process.stdout.write(output);
  /** @type {Map<string, string[]>} */
  const elsewhere = new Map();
  let current = "";
  let uses = 0;
  for (const line of output.replace(COLOUR, "").split("\n")) {
    const named = line.match(USES);
    if (named !== null) {
      current = named[1];
      uses += 1;
      if (current !== project && !elsewhere.has(current)) elsewhere.set(current, []);
      continue;
    }
    const file = line.match(RESULT);
    if (file !== null) elsewhere.get(current)?.push(file[1]);
  }
  if (uses === 0) {
    console.error(`run-tstyche: ${title}: tstyche named no project, so where its files compiled could not be checked.`);
    return false;
  }
  for (const [other, files] of elsewhere) {
    console.error(
      `run-tstyche: ${title}: tstyche compiled ${files.length > 0 ? files.join(", ") : "a file"} with ${other}, ` +
        `not ${project}; a type test outside the tsconfig's include runs under tstyche's baseline options, where ` +
        "neither floatingEffect setting holds, so move it under packages/*/test or widen the include.",
    );
  }
  return result.status === 0 && elsewhere.size === 0;
};

const first = pass(
  "pass 1 of 2, tstyche.json (tsconfig.tstyche.json, floatingEffect off)",
  "./tsconfig.tstyche.json",
  [],
);
const second = pass(
  `pass 2 of 2, tsconfig.test.json (floatingEffect on), skipping "${RULE_ON_SKIP}"`,
  "./tsconfig.test.json",
  ["--tsconfig", "tsconfig.test.json", "--skip", RULE_ON_SKIP],
);
process.exit(first && second ? 0 : 1);
