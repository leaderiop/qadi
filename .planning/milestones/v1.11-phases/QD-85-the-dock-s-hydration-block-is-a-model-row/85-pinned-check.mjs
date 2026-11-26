// The check that the existing devtools tests keep their text, apart from the one edit the phase declares.
//
// Each file is compared with its text at `phase_base` (as `85-check.mjs base` prints it). Three kinds, none of which rewrites
// a test in place:
//   held      eighteen files, byte for byte, line endings included.
//   declared  `QuestionsPanel.test.tsx`, which may differ only by one import edit and one region. The panel's `hydration` prop
//             becomes a store, so the nine tests that handed it an activity object cannot compile, and the text rules they
//             asserted move to the view's table test. The import edit swaps the activity-type import for the view import
//             (optionally followed by the one `ReadableStore` type import, which the edit names as part of its `after`); the
//             region runs from the line opening `describe("hydration, with nothing read"` to the line before
//             `describe("invalidate"` and may change entirely. Every other byte is held: the text above the region (once the
//             import edit is taken out) is a prefix of the file, and the text from `describe("invalidate"` on is its suffix.
//             An edit is taken out only when its `before` occurs once at the base, its `after` once now and its `before`
//             nowhere now, so a second copy of the new line, or a change beside it on the same line, stays in and fails.
//   born      `QuestionsPanel.hydration.characterisation.test.tsx`, held byte for byte against the one commit that added it;
//             two adding commits fail, and a file with no adding commit passes plain and fails `--all-applied`.
// A file that `git diff -M --name-status <phase_base>` reports as moved or deleted fails, naming both paths.
//
// From the repository root:
//   node <phase 85 directory>/85-pinned-check.mjs
//   node <this file> --all-applied   (also requires the import edit and the region both applied, and every born file added)
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
  `${REACT_DIR}QuestionsPanel.characterisation.test.tsx`,
  `${REACT_DIR}QuestionsPanel.feed.characterisation.test.tsx`,
  `${REACT_DIR}Lens.questions.characterisation.test.tsx`,
  `${REACT_DIR}DockFrame.stops.characterisation.test.tsx`,
  `${REACT_DIR}ConfigureFirstRender.characterisation.test.tsx`,
  `${MODEL_DIR}DockModel.characterisation.test.ts`,
  `${REACT_DIR}DiagnosticsScreens.test.tsx`,
  `${REACT_DIR}DevtoolsDock.test.tsx`,
  `${REACT_DIR}Lens.adapter.test.tsx`,
  `${REACT_DIR}QuestionsPanel.gates.test.tsx`,
  `${REACT_DIR}QuestionsPanel.thunk.test.tsx`,
  `${REACT_DIR}VerdictTreatment.test.tsx`,
  `${REACT_DIR}questionsPanelInput.ts`,
  `${REACT_DIR}useStoreSnapshot.test.tsx`,
  `${MODEL_DIR}Hydration.test.ts`,
  `${MODEL_DIR}DiagnosticsFeed.test.ts`,
  `${MODEL_DIR}PortCards.test.ts`,
  `${REACT_DIR}ServicesPanel.characterisation.test.tsx`,
];

const VIEW_IMPORT = 'import { HydrationView } from "../../src/model/HydrationView.ts";';
const STORE_IMPORT = 'import type { ReadableStore } from "../../src/model/ExternalStore.ts";';
const DECLARED = {
  file: `${REACT_DIR}QuestionsPanel.test.tsx`,
  edits: [
    {
      name: "import-view",
      before: 'import type { HydrationActivity } from "../../src/model/Hydration.ts";',
      after: [VIEW_IMPORT, `${VIEW_IMPORT}\n${STORE_IMPORT}`],
    },
  ],
  region: {
    name: "hydration-describes",
    from: '  describe("hydration, with nothing read"',
    to: '  describe("invalidate"',
  },
};

/** Files held byte for byte against the one commit that added each. */
const BORN = [`${REACT_DIR}QuestionsPanel.hydration.characterisation.test.tsx`];

const occurrences = (text, piece) => (piece === "" ? 0 : text.split(piece).length - 1);

const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** The offset of the start of the line holding `at`. */
const lineStart = (text, at) => (at === 0 ? 0 : text.lastIndexOf("\n", at - 1) + 1);

/** An edit's accepted `after` texts, the longest first, so the longer spelling is read before the one it contains. */
const afters = (edit) => [edit.after].flat().sort((a, b) => b.length - a.length);

/**
 * The reasons `current` is not `base` once the declared edits are taken out and the region is let go, how many edits are
 * applied, and whether the region differs from the base's. A held file declares neither edits nor a region.
 */
const judge = ({ file, edits, region }, base, current) => {
  const reasons = [];
  const usable = edits.filter((edit) => {
    if (occurrences(base, edit.before) === 1) return true;
    reasons.push(`${file}: edit ${edit.name} does not occur exactly once at the base`);
    return false;
  });
  const applied = usable
    .map((edit) => ({ edit, after: afters(edit).find((a) => occurrences(current, a) === 1) }))
    .filter(({ edit, after }) => after !== undefined && occurrences(current, edit.before) === 0);
  const reverted = applied.reduce((text, { edit, after }) => text.replace(after, () => edit.before), current);
  let bounds;
  if (region !== undefined) {
    const from = base.indexOf(region.from);
    const to = base.indexOf(region.to);
    if (occurrences(base, region.from) === 1 && occurrences(base, region.to) === 1 && from < to) {
      bounds = { head: base.slice(0, lineStart(base, from)), middle: base.slice(lineStart(base, from), lineStart(base, to)), tail: base.slice(lineStart(base, to)) };
    } else reasons.push(`${file}: the region ${region.name} does not start and end exactly once at the base`);
  }
  if (bounds === undefined) {
    if (base !== reverted) reasons.push(`${file}: differs from its base text at line ${firstDifference(reverted, base)}`);
    return { reasons, applied: applied.length, regionChanged: false };
  }
  const { head, middle, tail } = bounds;
  const enough = reverted.length >= head.length + tail.length;
  if (!enough || !reverted.startsWith(head)) {
    reasons.push(`${file}: differs from its base text above the region at line ${firstDifference(reverted.slice(0, head.length), head)}`);
    return { reasons, applied: applied.length, regionChanged: false };
  }
  if (!reverted.endsWith(tail)) {
    const at = reverted.length - tail.length;
    reasons.push(`${file}: differs from its base text below the region at line ${reverted.slice(0, at).split("\n").length - 1 + firstDifference(reverted.slice(at), tail)}`);
    return { reasons, applied: applied.length, regionChanged: false };
  }
  return { reasons, applied: applied.length, regionChanged: reverted.slice(head.length, reverted.length - tail.length) !== middle };
};

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

/** The reasons the declared file is not fully applied, for `--all-applied`: the import edit and the region, each its own. */
const judgeAllApplied = (file, result, declaredEdits) => [
  ...(result.applied === declaredEdits ? [] : [`${file}: ${result.applied} of ${declaredEdits} declared edits applied, not all`]),
  ...(result.regionChanged ? [] : [`${file}: the region is not changed from the base`]),
];

const selfTest = () => {
  const base = "one()\ntwo()\nthree()\n";
  const held = { file: "x.test.ts", edits: [] };
  const equal = judge(held, base, base);
  const byte = judge(held, base, base.replace("two()", "twoo()"));
  const space = judge(held, base, base.replace("two()", "two() "));
  const crlf = judge(held, base, base.replaceAll("\n", "\r\n"));
  const imp = "import { a } from './a';";
  const view = "import { v } from './v';";
  const store = "import type { s } from './s';";
  const head = `${imp}\nconst keep = 1;\n`;
  const middle = "\n  describe('mid', () => {\n    it('old', () => {});\n  });\n\n";
  const tail = "  describe('end', () => {\n    it('held', () => {});\n  });\n";
  const declBase = `${head}${middle}${tail}`;
  const decl = { file: "d.test.tsx", edits: [{ name: "import", before: imp, after: [view, `${view}\n${store}`] }], region: { name: "mid", from: "  describe('mid'", to: "  describe('end'" } };
  const swapped = declBase.replace(imp, view);
  const newMiddle = swapped.replace("it('old'", "it('new'").replace("it('old'", "it('x'");
  const none = judge(decl, declBase, declBase);
  const both = judge(decl, declBase, newMiddle);
  const gone = judge(decl, declBase, `${view}\nconst keep = 1;\n\n${tail}`);
  const grown = judge(decl, declBase, swapped.replace("it('old', () => {});", "it('a', () => {});\n    it('b', () => {});"));
  const withStore = judge(decl, declBase, newMiddle.replace(view, `${view}\n${store}`));
  const storeAlone = judge(decl, declBase, declBase.replace(imp, `${view}\n${store}`));
  const importOnly = judge(decl, declBase, swapped);
  const regionOnly = judge(decl, declBase, declBase.replace("it('old'", "it('new'"));
  const aboveChanged = judge(decl, declBase, newMiddle.replace("const keep = 1;", "const keep = 2;"));
  const belowChanged = judge(decl, declBase, newMiddle.replace("it('held'", "it('held2'"));
  const beside = judge(decl, declBase, newMiddle.replace(view, `${view} // x`));
  const doubled = judge(decl, declBase, newMiddle.replace(view, `${view}\n${view}`));
  const extra = judge(decl, declBase, newMiddle.replace(view, `${view}\n${store}\nconst more = 1;`));
  const twice = judge({ ...decl, edits: [{ name: "dup", before: "describe(", after: "describe2(" }] }, declBase, declBase);
  const noEnd = judge({ ...decl, region: { ...decl.region, to: "  describe('nope'" } }, declBase, declBase);
  const reversed = judge({ ...decl, region: { ...decl.region, from: "  describe('end'", to: "  describe('mid'" } }, declBase, declBase);
  const short = judge(decl, declBase, head);
  const first = "line a\nline b\n";
  const second = "line a\nline B\n";
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  const all = (r) => judgeAllApplied(decl.file, r, decl.edits.length);
  const cases = [
    ["a held file that equals its base passes", equal.reasons.length === 0 && equal.applied === 0 && !equal.regionChanged],
    ["a held file with one changed byte fails, naming the file and the line", byte.reasons.join() === "x.test.ts: differs from its base text at line 2"],
    ["a whitespace-only change in a held file fails", space.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a line-ending change in a held file fails", crlf.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a declared file equal to its base passes with nothing applied", none.reasons.length === 0 && none.applied === 0 && !none.regionChanged],
    ["the import edit and a changed region pass and count", both.reasons.length === 0 && both.applied === 1 && both.regionChanged],
    ["a region emptied of every line passes", gone.reasons.length === 0 && gone.regionChanged],
    ["a region that grew passes", grown.reasons.length === 0 && grown.regionChanged],
    ["the import edit followed by the store import passes and counts", withStore.reasons.length === 0 && withStore.applied === 1],
    ["the store import without the region change passes and counts the edit only", storeAlone.reasons.length === 0 && storeAlone.applied === 1 && !storeAlone.regionChanged],
    ["the import edit alone passes without the region", importOnly.reasons.length === 0 && importOnly.applied === 1 && !importOnly.regionChanged],
    ["a changed region alone passes without the edit", regionOnly.reasons.length === 0 && regionOnly.applied === 0 && regionOnly.regionChanged],
    ["a changed line above the region fails, naming the line", aboveChanged.reasons.join() === "d.test.tsx: differs from its base text above the region at line 2"],
    ["a changed line below the region fails", belowChanged.reasons.some((r) => r.startsWith("d.test.tsx: differs from its base text below the region at line "))],
    ["a change beside the new import on its line fails", beside.reasons.some((r) => r.startsWith("d.test.tsx: differs"))],
    ["a second copy of the new import fails", doubled.reasons.some((r) => r.startsWith("d.test.tsx: differs"))],
    ["a line added after the store import fails", extra.reasons.some((r) => r.startsWith("d.test.tsx: differs"))],
    ["an edit whose before occurs twice at the base fails", twice.reasons.some((r) => r === "d.test.tsx: edit dup does not occur exactly once at the base")],
    ["a region whose end is not found at the base fails", noEnd.reasons.some((r) => r.includes("the region mid does not start and end exactly once at the base"))],
    ["a region whose end precedes its start fails", reversed.reasons.some((r) => r.includes("the region mid does not start and end exactly once at the base"))],
    ["a file cut inside the held text fails", short.reasons.some((r) => r.startsWith("d.test.tsx: differs from its base text above the region"))],
    ["all applied: nothing applied fails twice", all(none).length === 2],
    ["all applied: the import edit alone fails for the region", all(importOnly).join() === "d.test.tsx: the region is not changed from the base"],
    ["all applied: the region alone fails for the edit", all(regionOnly).join() === "d.test.tsx: 0 of 1 declared edits applied, not all"],
    ["all applied: both applied passes", all(both).length === 0],
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
    ["a file that was only modified or added is not moved", moves.length === 2],
    ["the phase holds eighteen files, one declared file and one born file", HELD.length === 18 && new Set(HELD).size === 18 && BORN.length === 1 && !HELD.includes(DECLARED.file)],
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
  const base = execFileSync("node", [`${DIR}85-check.mjs`, "base"], { encoding: "utf8" }).trim();
  const reasons = [];
  const watched = [...HELD, DECLARED.file, ...BORN];
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
  let declared = 0;
  const texts = gone.has(DECLARED.file) ? undefined : compare(DECLARED);
  if (texts !== undefined) {
    const result = judge(DECLARED, texts.baseText, texts.current);
    reasons.push(...result.reasons);
    if (result.applied === DECLARED.edits.length && result.regionChanged) declared = 1;
    if (allApplied) reasons.push(...judgeAllApplied(DECLARED.file, result, DECLARED.edits.length));
  }
  let born = 0;
  for (const file of BORN) {
    const adders = nonEmpty(git("log", "--diff-filter=A", "--format=%H", `${base}..HEAD`, "--", file));
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
  process.stdout.write(`pinned: ${HELD.length} files hold their base text, ${born} of ${BORN.length} born files held, ${declared} of 1 declared edits applied\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
