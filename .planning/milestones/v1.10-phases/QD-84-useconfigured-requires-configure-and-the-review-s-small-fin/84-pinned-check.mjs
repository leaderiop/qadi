// The check that the existing tests of the devtools lens and its feeds keep their text, apart from what the phase declares.
//
// Each file is compared with its text at `phase_base` (as `84-check.mjs base` prints it). Five kinds, none of which rewrites a
// test in place:
//   held        sixteen files, byte for byte, line endings included.
//   edited      `Lens.adapter.test.tsx`, which may differ only by two declared edits: the mount line and the import of
//               `useStoreSnapshot` (two lines joined, `after` the `useLens` import alone). An edit is reverted only when its
//               `before` occurs exactly once at the base, its `after` exactly once now and its `before` nowhere now, so a
//               second copy of the new line, or a change beside it on the same line, stays in and fails the compare.
//   re-expressed `useConfigured.test.tsx`: held at its base text until the one commit with the subject `test(84-05): the
//               useConfigured double carries its own configure` exists, and against that commit's text afterwards, apart
//               from one declared edit (the harness call). Two such commits fail.
//   added-to    `surface.tst.ts`: the diff against the base may only add blank lines, the directive `// @ts-expect-error no
//               exported member` and the eight refusals, each once and right after its directive.
//   born        three characterisation files, each held byte for byte against the one commit that added it; a file with no
//               adding commit passes plain and fails `--all-applied`.
// A file that `git diff -M --name-status <phase_base>` reports as moved or deleted fails, naming both paths.
//
// From the repository root:
//   node <phase 84 directory>/84-pinned-check.mjs
//   node <this file> --all-applied   (also requires both edits, the re-expression commit with its edit, all eight refusals and
//                                     all three born files, each missing one with its own reason)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const TEST_DIR = "packages/devtools/test/";
const MODEL_DIR = `${TEST_DIR}model/`;
const REACT_DIR = `${TEST_DIR}react/`;

const HELD = [
  `${REACT_DIR}ConfigureFirstRender.characterisation.test.tsx`,
  `${REACT_DIR}Lens.dock.characterisation.test.tsx`,
  `${REACT_DIR}Lens.dock.test.tsx`,
  `${MODEL_DIR}LensSession.test.ts`,
  `${REACT_DIR}DockRegistryReads.test.tsx`,
  `${MODEL_DIR}GatesFeed.test.ts`,
  `${REACT_DIR}TimelineNotice.test.tsx`,
  `${REACT_DIR}DiagnosticsNotice.test.tsx`,
  `${REACT_DIR}QuestionsPanel.feed.characterisation.test.tsx`,
  `${REACT_DIR}TimelineLifetime.test.tsx`,
  `${REACT_DIR}useTimeline.test.tsx`,
  `${TEST_DIR}helpers.ts`,
  `${REACT_DIR}Lens.test.ts`,
  `${REACT_DIR}QuestionsPanel.test.tsx`,
  `${REACT_DIR}VerdictTreatment.test.tsx`,
  `${REACT_DIR}QuestionsPanel.gates.test.tsx`,
];

const USE_LENS = 'import { useLens } from "../../src/react/useLens.ts";';
const ADAPTER = {
  file: `${REACT_DIR}Lens.adapter.test.tsx`,
  edits: [
    {
      name: "mount-call",
      before: "    useLens(lens, questions, useStoreSnapshot(questions).instances);",
      after: "    useLens(lens, questions);",
    },
    {
      name: "import-useStoreSnapshot",
      before: `${USE_LENS}\nimport { useStoreSnapshot } from "../../src/react/useStoreSnapshot.ts";`,
      after: USE_LENS,
    },
  ],
};

const REEXPRESSED = {
  file: `${REACT_DIR}useConfigured.test.tsx`,
  subject: "test(84-05): the useConfigured double carries its own configure",
  edits: [
    {
      name: "harness-call",
      before: "    const double = useConfigured(make, (double, inputs) => double.configure(inputs), inputs);",
      after: "    const double = useConfigured(make, inputs);",
    },
  ],
};

const DIRECTIVE = "// @ts-expect-error no exported member";
const SURFACE = {
  file: `${TEST_DIR}surface.tst.ts`,
  directive: DIRECTIVE,
  refusals: [
    'export { useStopNotice } from "../src/index.ts";',
    'export { useStopNotice as reactUseStopNotice } from "../src/react/index.ts";',
    'export type { StopNoticeProps } from "../src/index.ts";',
    'export type { StopNoticeProps as ReactStopNoticeProps } from "../src/react/index.ts";',
    'export type { UseLens } from "../src/index.ts";',
    'export type { UseLens as ReactUseLens } from "../src/react/index.ts";',
    'export type { Configurable } from "../src/index.ts";',
    'export type { Configurable as ReactConfigurable } from "../src/react/index.ts";',
  ],
};

/** Files held byte for byte against the one commit that added each. */
const BORN = [
  `${REACT_DIR}Lens.questions.characterisation.test.tsx`,
  `${REACT_DIR}DockFrame.stops.characterisation.test.tsx`,
  `${REACT_DIR}useTimeline.inputs.characterisation.test.tsx`,
];

const occurrences = (text, piece) => (piece === "" ? 0 : text.split(piece).length - 1);

const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/**
 * The reasons `current` is not `base` once the declared edits are taken out, and how many edits are applied. An edit is
 * taken out only when its `before` occurs once at the base, its `after` once now and its `before` nowhere now, so a second
 * copy of the new line, or a change beside it, stays in and fails the compare. A held file declares none.
 */
const judge = ({ file, edits }, base, current) => {
  const reasons = [];
  const usable = edits.filter((edit) => {
    if (occurrences(base, edit.before) === 1) return true;
    reasons.push(`${file}: edit ${edit.name} does not occur exactly once at the base`);
    return false;
  });
  const applied = usable.filter((edit) => occurrences(current, edit.after) === 1 && occurrences(current, edit.before) === 0);
  const reverted = applied.reduce((text, edit) => text.replace(edit.after, () => edit.before), current);
  if (base !== reverted) reasons.push(`${file}: differs from its base text at line ${firstDifference(reverted, base)}`);
  return { reasons, applied: applied.length };
};

/**
 * `file` against the text of the commits that carry its re-expression subject (`commits`, each the file's text at one
 * commit): none, and it is held at `base`; one, and it is judged against that text with the edit reverted; two fail.
 */
const judgeReexpressed = (spec, base, commits, current) => {
  if (commits.length > 1) return { reasons: [`${spec.file}: two commits carry the re-expression subject`], applied: 0, held: false };
  if (commits.length === 0) return { ...judge({ ...spec, edits: [] }, base, current), held: false };
  return { ...judge(spec, commits[0], current), held: true };
};

/** The new-file line numbers and old-file line numbers of `git diff -U0` text: its added lines, and the lines it removed. */
const readDiff = (diffText) => {
  const added = [];
  const removed = [];
  let oldAt = 0;
  let newAt = 0;
  let inHunk = false;
  for (const line of diffText.split("\n")) {
    const header = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (header !== null) {
      oldAt = Number(header[1]);
      newAt = Number(header[2]);
      inHunk = true;
    } else if (inHunk && line.startsWith("+")) {
      added.push({ at: newAt, text: line.slice(1) });
      newAt += 1;
    } else if (inHunk && line.startsWith("-")) {
      removed.push(oldAt);
      oldAt += 1;
    }
  }
  return { added, removed };
};

/**
 * The reasons the diff of a file against its base is not blank lines, the directive and the declared refusals (each once,
 * right after its directive), and how many refusals it adds. `current` is the text on disk, for the neighbours of a line.
 */
const judgeAdditions = (diffText, currentText, spec) => {
  const { added, removed } = readDiff(diffText);
  const lines = currentText.split("\n");
  const reasons = removed.map((n) => `${spec.file}: line ${n} was removed`);
  for (const { at, text } of added) {
    if (text.trim() === "") continue;
    if (text === spec.directive) {
      if (!spec.refusals.includes(lines[at] ?? "")) reasons.push(`${spec.file}: a directive is not followed by a refusal (line ${at})`);
    } else if (!spec.refusals.includes(text)) reasons.push(`${spec.file}: an added line is not a declared refusal: ${text}`);
  }
  let count = 0;
  for (const refusal of spec.refusals) {
    const mine = added.filter(({ text }) => text === refusal);
    if (mine.length > 1) reasons.push(`${spec.file}: ${refusal} is added ${mine.length} times`);
    if (mine.length > 0) count += 1;
    for (const { at } of mine) if (lines[at - 2] !== spec.directive) reasons.push(`${spec.file}: ${refusal} does not follow its directive`);
  }
  return { reasons, added: count };
};

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

/** The files that `git diff -M --name-status` reports as moved or deleted, each with its reason. */
const judgeMoves = (files, statusText) =>
  statusText
    .split("\n")
    .map((line) => line.split("\t"))
    .flatMap(([status, from, to]) => {
      if (!files.includes(from)) return [];
      if (status.startsWith("R")) return [{ file: from, reason: `${from} moved to ${to}` }];
      return status === "D" ? [{ file: from, reason: `${from} was deleted` }] : [];
    });

const selfTest = () => {
  const base = "one()\ntwo()\nthree()\n";
  const spec = { file: "x.test.ts", edits: [] };
  const imp = 'import { a } from "./a.ts";';
  const imp2 = 'import { b } from "./b.ts";';
  const withImports = `${imp}\n${imp2}\n${base}`;
  const mountSpec = { file: "x.test.ts", edits: [{ name: "call", before: "f(a, b, c);", after: "f(a, b);" }] };
  const twoLine = { file: "x.test.ts", edits: [{ name: "import", before: `${imp}\n${imp2}`, after: imp }] };
  const equal = judge(spec, base, base);
  const byte = judge(spec, base, base.replace("two()", "twoo()"));
  const space = judge(spec, base, base.replace("two()", "two() "));
  const crlf = judge(spec, base, base.replaceAll("\n", "\r\n"));
  const mountBase = `${base}f(a, b, c);\n`;
  const mounted = judge(mountSpec, mountBase, `${base}f(a, b);\n`);
  const mountHeld = judge(mountSpec, mountBase, mountBase);
  const mountTwice = judge(mountSpec, mountBase, `${base}f(a, b);\nf(a, b);\n`);
  const mountBeside = judge(mountSpec, mountBase, `${base}f(a, b); // x\n`);
  const mountLost = judge({ ...mountSpec, edits: [{ ...mountSpec.edits[0], before: "g();" }] }, mountBase, mountBase);
  const mountChanged = judge(mountSpec, mountBase, `${base.replace("two()", "twoo()")}f(a, b);\n`);
  const joined = judge(twoLine, withImports, `${imp}\n${base}`);
  const joinedHeld = judge(twoLine, withImports, withImports);
  const joinedMissing = judge(twoLine, `${imp}\n${base}`, `${imp}\n${base}`);
  const joinedDoubled = judge(twoLine, withImports, `${imp}\n${imp}\n${base}`);
  const joinedBeside = judge(twoLine, withImports, `${imp} // x\n${base}`);
  const first = "line a\nline b\n";
  const second = "line a\nline B\n";
  const reEdit = { file: "r.test.tsx", edits: [{ name: "call", before: "go(1, 2);", after: "go(1);" }] };
  const reBase = "x\ngo(1, 2, 3);\n";
  const reCommit = "x\ngo(1, 2);\n";
  const reNew = "x\ngo(1);\n";
  const reBefore = judgeReexpressed(reEdit, reBase, [], reBase);
  const reBeforeChanged = judgeReexpressed(reEdit, reBase, [], reCommit);
  const reAt = judgeReexpressed(reEdit, reBase, [reCommit], reCommit);
  const reAfter = judgeReexpressed(reEdit, reBase, [reCommit], reNew);
  const reOther = judgeReexpressed(reEdit, reBase, [reCommit], `${reNew}y\n`);
  const reTwo = judgeReexpressed(reEdit, reBase, [reCommit, reCommit], reCommit);
  const D = DIRECTIVE;
  const R = SURFACE.refusals;
  const surface = { file: "s.tst.ts", directive: D, refusals: R };
  const insert = (inserted) => {
    const current = ["head", ...inserted, "tail"].join("\n");
    const diff = `--- a/s\n+++ b/s\n@@ -1,0 +2,${inserted.length} @@\n${inserted.map((l) => `+${l}`).join("\n")}\n`;
    return judgeAdditions(diff, current, surface);
  };
  const eight = insert(["", ...R.flatMap((r) => [D, r, ""])]);
  const none = judgeAdditions("", "head\ntail", surface);
  const removedLine = judgeAdditions("@@ -3,1 +2,0 @@\n-gone\n", "head\ntail", surface);
  const undeclared = insert(["", D, "export { Other } from \"../src/index.ts\";"]);
  const twice = insert(["", D, R[0], "", D, R[0]]);
  const noDirective = insert(["", R[0]]);
  const stray = insert(["", D, "", "tail2"]);
  const pairs = insert(["", D, R[0], R[1]]);
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  const cases = [
    ["a held file that equals its base passes", equal.reasons.length === 0 && equal.applied === 0],
    ["a held file with one changed byte fails, naming the file and the line", byte.reasons.some((r) => r === "x.test.ts: differs from its base text at line 2")],
    ["a whitespace-only change fails", space.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a line-ending change fails", crlf.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a declared edit applied passes and counts", mounted.reasons.length === 0 && mounted.applied === 1],
    ["a file with its declared edit not yet applied passes and does not count", mountHeld.reasons.length === 0 && mountHeld.applied === 0],
    ["a second copy of the new line fails the compare", mountTwice.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a change beside the new line on its line fails the compare", mountBeside.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["an edit whose before is not found once at the base fails", mountLost.reasons.some((r) => r.includes("edit call does not occur exactly once at the base"))],
    ["a change beside an applied edit fails", mountChanged.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a two-line import edit applied passes and counts", joined.reasons.length === 0 && joined.applied === 1],
    ["a two-line import edit not yet applied passes and does not count", joinedHeld.reasons.length === 0 && joinedHeld.applied === 0],
    ["a two-line import edit missing at the base fails", joinedMissing.reasons.some((r) => r.includes("edit import does not occur exactly once at the base"))],
    ["a two-line import edit doubled fails the compare", joinedDoubled.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a change beside the kept import on its line fails the compare", joinedBeside.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a re-expressed file with no commit yet is held at the base", reBefore.reasons.length === 0 && !reBefore.held && reBefore.applied === 0],
    ["a re-expressed file changed before its commit fails", reBeforeChanged.reasons.some((r) => r.startsWith("r.test.tsx: differs"))],
    ["a re-expressed file equal to its commit passes, held from it", reAt.reasons.length === 0 && reAt.held && reAt.applied === 0],
    ["a re-expressed file with its edit applied passes and counts", reAfter.reasons.length === 0 && reAfter.held && reAfter.applied === 1],
    ["a second change in a re-expressed file fails", reOther.reasons.some((r) => r.startsWith("r.test.tsx: differs"))],
    ["two commits with the re-expression subject fail", reTwo.reasons.join() === "r.test.tsx: two commits carry the re-expression subject"],
    ["the eight refusals added each after its directive pass and count 8", eight.reasons.length === 0 && eight.added === 8],
    ["a diff that adds nothing passes and counts 0", none.reasons.length === 0 && none.added === 0],
    ["a removed line fails, naming its number", removedLine.reasons.join() === "s.tst.ts: line 3 was removed"],
    ["an added line that is no declared refusal fails", undeclared.reasons.some((r) => r.startsWith("s.tst.ts: an added line is not a declared refusal: export { Other }"))],
    ["a refusal added twice fails", twice.reasons.some((r) => r === `s.tst.ts: ${R[0]} is added 2 times`)],
    ["a refusal with no directive before it fails", noDirective.reasons.some((r) => r === `s.tst.ts: ${R[0]} does not follow its directive`)],
    ["a directive with no refusal after it fails", stray.reasons.some((r) => r.startsWith("s.tst.ts: a directive is not followed by a refusal"))],
    ["a refusal directly after another refusal fails", pairs.reasons.some((r) => r === `s.tst.ts: ${R[1]} does not follow its directive`)],
    ["a born file equal to its adding commit passes", judgeBorn("b.ts", "t", "t", true).length === 0],
    ["a born file changed after its adding commit fails", judgeBorn("b.ts", first, second, false).join() === "b.ts: differs from the commit that added it at line 2"],
    ["a born file that is gone fails", judgeBorn("b.ts", "t", undefined, false).some((r) => r.includes("moved or deleted"))],
    ["an absent born file passes plain", judgeBorn("b.ts", undefined, undefined, false).length === 0],
    ["an absent born file fails when everything is applied", judgeBorn("b.ts", undefined, undefined, true).join() === "b.ts does not exist"],
    ["an uncommitted born file fails when everything is applied only", judgeBorn("b.ts", undefined, "t", false).length === 0 && judgeBorn("b.ts", undefined, "t", true).length === 1],
    ["a file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts")],
    ["a file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted")],
    ["a file that was only modified or added is not moved", moves.length === 2],
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
  const base = execFileSync("node", [`${DIR}84-check.mjs`, "base"], { encoding: "utf8" }).trim();
  const reasons = [];
  const watched = [...HELD, ADAPTER.file, REEXPRESSED.file, SURFACE.file, ...BORN];
  const moves = judgeMoves(watched, git("diff", "-M", "--name-status", base));
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));
  const compare = (spec) => {
    const baseText = showAt(base, spec.file);
    if (baseText === undefined) {
      reasons.push(`${spec.file} does not exist at the base`);
      return undefined;
    }
    return { baseText, current: readFileSync(spec.file, "utf8") };
  };
  for (const file of HELD) {
    const texts = gone.has(file) ? undefined : compare({ file });
    if (texts !== undefined) reasons.push(...judge({ file, edits: [] }, texts.baseText, texts.current).reasons);
  }
  let edits = 0;
  const adapter = gone.has(ADAPTER.file) ? undefined : compare(ADAPTER);
  if (adapter !== undefined) {
    const result = judge(ADAPTER, adapter.baseText, adapter.current);
    edits = result.applied;
    reasons.push(...result.reasons);
    if (allApplied && edits !== ADAPTER.edits.length) reasons.push(`${ADAPTER.file}: ${edits} of ${ADAPTER.edits.length} declared edits applied, not all`);
  }
  let reexpressed = "held at the base";
  const re = gone.has(REEXPRESSED.file) ? undefined : compare(REEXPRESSED);
  if (re !== undefined) {
    const adders = nonEmpty(git("log", "--format=%H%x09%s", `${base}..HEAD`))
      .map((l) => l.split("\t"))
      .filter(([, subject]) => subject === REEXPRESSED.subject)
      .map(([sha]) => sha);
    const result = judgeReexpressed(REEXPRESSED, re.baseText, adders.map((sha) => showAt(sha, REEXPRESSED.file) ?? ""), re.current);
    reasons.push(...result.reasons);
    if (result.held) reexpressed = `held from ${adders[0].slice(0, 8)}, ${result.applied} of ${REEXPRESSED.edits.length} edits applied`;
    if (allApplied && adders.length === 0) reasons.push(`${REEXPRESSED.file}: no commit has the subject ${REEXPRESSED.subject}`);
    else if (allApplied && result.applied !== REEXPRESSED.edits.length) reasons.push(`${REEXPRESSED.file}: the re-expression edit is not applied`);
  }
  let refusals = 0;
  if (!gone.has(SURFACE.file)) {
    const result = judgeAdditions(git("diff", "-U0", "--no-color", base, "--", SURFACE.file), readFileSync(SURFACE.file, "utf8"), SURFACE);
    refusals = result.added;
    reasons.push(...result.reasons);
    if (allApplied && refusals !== SURFACE.refusals.length) reasons.push(`${SURFACE.file}: ${refusals} of ${SURFACE.refusals.length} refusals added, not all`);
  }
  let born = 0;
  for (const file of BORN) {
    const adders = nonEmpty(git("log", "--diff-filter=A", "--format=%H", `${base}..HEAD`, "--", file));
    if (adders.length > 1) {
      reasons.push(`${file}: ${adders.length} commits add it, not one`);
      continue;
    }
    const bornText = adders.length === 1 ? showAt(adders[0], file) : undefined;
    const found = judgeBorn(file, bornText, existsSync(file) ? readFileSync(file, "utf8") : undefined, allApplied);
    reasons.push(...found);
    if (found.length === 0 && bornText !== undefined) born += 1;
  }
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `pinned: ${HELD.length} files hold their base text, ${edits} of ${ADAPTER.edits.length} declared edits applied, ${REEXPRESSED.file.split("/").at(-1)} ${reexpressed}, ${refusals} of ${SURFACE.refusals.length} refusals added, ${born} of ${BORN.length} born files held\n`,
  );
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
