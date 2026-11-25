// The check that every existing react test, and the registry lease, keep their text.
//
// Each file is compared with its text at `phase_base`, the commit the phase's plans start from. Two kinds, and no declared
// edit: the phase moves no existing test (the render suite keeps every lifetime test, and the owner's own tests are new
// files), so a held file differs from its base by nothing at all.
//   held   every path `git ls-tree -r --name-only <phase_base> -- packages/react/test` lists, and
//          `packages/react/src/RegistryLease.ts`, byte for byte, line endings included. The set is computed from the base
//          and never listed here, so a test the base holds cannot be left out by omission.
//   born   `QadiProvider.owner.characterisation.test.tsx`, held byte for byte against the one commit that added it;
//          two adding commits fail, and a file with no adding commit passes plain and fails `--all-applied`.
// A held file that `git diff -M --name-status <phase_base>` reports as anything but added (moved, deleted, changed) fails,
// naming both paths for a move. A file added under `packages/react/test` is not held: new tests are the phase's own.
//
// From the repository root:
//   node <this directory>/86-pinned-check.mjs
//   node <this file> --all-applied   (also requires every born file to be added)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

/** HEAD at the start of planning, fixed: the same constant `86-check.mjs` prints. */
const BASE = "41c53c65c3ceb60f974650dd374f391c81db56e7";
const TEST_DIR = "packages/react/test";
const LEASE = "packages/react/src/RegistryLease.ts";
/** Files held byte for byte against the one commit that added each. */
const BORN = [`${TEST_DIR}/QadiProvider.owner.characterisation.test.tsx`];

const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** The held paths: what `git ls-tree` prints for the test directory at the base, and the lease. Pure. */
const heldFrom = (lsTree) => [...lsTree.split("\n").filter((line) => line !== ""), LEASE];

/** The reasons `current` is not `base`, byte for byte. Pure. */
const judgeHeld = (file, base, current) => (base === current ? [] : [`${file}: differs from its base text at line ${firstDifference(current, base)}`]);

/** The reasons a born file is added by `count` commits and not one. */
const judgeAdders = (file, count) => (count > 1 ? [`${file}: ${count} commits add it, not one`] : []);

/**
 * The reasons a born file is not held. `born` is the text at the commit that added it (`undefined`: no commit adds it yet)
 * and `current` the text on disk (`undefined`: no file). Without a commit and a file nothing is held yet, which only
 * `allApplied` refuses.
 */
const judgeBorn = (file, born, current, allApplied) => {
  if (born === undefined && current === undefined) return allApplied ? [`${file} does not exist`] : [];
  if (born === undefined) return allApplied ? [`${file}: no commit adds it`] : [];
  if (current === undefined) return [`${file} was moved or deleted after the commit that added it`];
  return born === current ? [] : [`${file}: differs from the commit that added it at line ${firstDifference(current, born)}`];
};

/** The watched files that `git diff -M --name-status` reports as anything but added, each with its reason. Pure. */
const judgeMoves = (files, statusText) =>
  statusText
    .split("\n")
    .map((line) => line.split("\t"))
    .flatMap(([status, from, to]) => {
      if (status === undefined || status === "A" || !files.includes(from)) return [];
      if (status.startsWith("R")) return [{ file: from, reason: `${from} moved to ${to}` }];
      if (status === "D") return [{ file: from, reason: `${from} was deleted` }];
      return [{ file: from, reason: `${from} is reported as ${status} against its base, not unchanged` }];
    });

const selfTest = () => {
  const base = "one()\ntwo()\nthree()\n";
  const equal = judgeHeld("x.test.ts", base, base);
  const byte = judgeHeld("x.test.ts", base, base.replace("two()", "twoo()"));
  const space = judgeHeld("x.test.ts", base, base.replace("two()", "two() "));
  const crlf = judgeHeld("x.test.ts", base, base.replaceAll("\n", "\r\n"));
  const first = "line a\nline b\n";
  const second = "line a\nline B\n";
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts\nM\tother.ts\nA\tx.test.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  const held = heldFrom("packages/react/test/a.test.ts\npackages/react/test/support/b.ts\n");
  const cases = [
    ["a held file that equals its base passes", equal.length === 0],
    ["a held file with one changed byte fails, naming the file and the line", byte.join() === "x.test.ts: differs from its base text at line 2"],
    ["a whitespace-only change in a held file fails", space.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a line-ending change in a held file fails", crlf.some((r) => r.startsWith("x.test.ts: differs"))],
    ["the held set is what the base lists, and the lease", held.join() === `packages/react/test/a.test.ts,packages/react/test/support/b.ts,${LEASE}`],
    ["a born file equal to its adding commit passes", judgeBorn("b.ts", "t", "t", true).length === 0],
    ["a born file changed after its adding commit fails", judgeBorn("b.ts", first, second, false).join() === "b.ts: differs from the commit that added it at line 2"],
    ["a born file that is gone fails", judgeBorn("b.ts", "t", undefined, false).some((r) => r.includes("moved or deleted"))],
    ["an absent born file passes plain", judgeBorn("b.ts", undefined, undefined, false).length === 0],
    ["an absent born file fails when everything is applied", judgeBorn("b.ts", undefined, undefined, true).join() === "b.ts does not exist"],
    ["an uncommitted born file fails when everything is applied only", judgeBorn("b.ts", undefined, "t", false).length === 0 && judgeBorn("b.ts", undefined, "t", true).length === 1],
    ["a born file added by two commits fails", judgeAdders("b.ts", 2).join() === "b.ts: 2 commits add it, not one"],
    ["a born file added by one commit, or none, passes", judgeAdders("b.ts", 1).length === 0 && judgeAdders("b.ts", 0).length === 0],
    ["a file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts")],
    ["a file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted")],
    ["a file reported as modified fails", moves.some((m) => m.file === "a.ts" && m.reason.includes("is reported as M"))],
    ["a file that was only added, or is not watched, is not reported", moves.length === 3],
    ["the phase holds one born file and declares no edit", BORN.length === 1 && new Set(BORN).size === 1],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

/** The text of `file` at `rev`, or `undefined` when it has none there. */
const showAt = (rev, file) => {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
};

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
const nonEmpty = (text) => text.split("\n").filter((l) => l !== "");

const run = (allApplied) => {
  const reasons = [];
  const held = heldFrom(git("ls-tree", "-r", "--name-only", BASE, "--", TEST_DIR));
  if (held.length < 2) {
    process.stderr.write(`${BASE} lists no file under ${TEST_DIR}: the held set is empty\n`);
    process.exit(1);
  }
  const moves = judgeMoves([...held, ...BORN], git("diff", "-M", "--name-status", BASE, "--", TEST_DIR, LEASE));
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));
  for (const file of held) {
    if (gone.has(file)) continue;
    const baseText = showAt(BASE, file);
    if (baseText === undefined) {
      reasons.push(`${file} does not exist at the base`);
      continue;
    }
    if (!existsSync(file)) {
      reasons.push(`${file} does not exist`);
      continue;
    }
    reasons.push(...judgeHeld(file, baseText, readFileSync(file, "utf8")));
  }
  let born = 0;
  for (const file of BORN) {
    const adders = nonEmpty(git("log", "--diff-filter=A", "--format=%H", `${BASE}..HEAD`, "--", file));
    const many = judgeAdders(file, adders.length);
    reasons.push(...many);
    if (many.length > 0) continue;
    const bornText = adders.length === 1 ? showAt(adders[0], file) : undefined;
    const found = judgeBorn(file, bornText, existsSync(file) ? readFileSync(file, "utf8") : undefined, allApplied);
    reasons.push(...found);
    if (found.length === 0 && bornText !== undefined) born += 1;
  }
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`pinned: ${held.length} files hold their base text, ${born} of ${BORN.length} born files held\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
