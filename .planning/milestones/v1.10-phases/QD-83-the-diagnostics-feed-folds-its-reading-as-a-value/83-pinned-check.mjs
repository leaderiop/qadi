// The check that the existing tests of the diagnostics feed keep their text, apart from what the phase declares.
//
// Each pinned file is compared with its text at `phase_base` (as `83-check.mjs base` prints it). Two files are held byte
// for byte. The others may differ only inside two declared kinds of change: a flip (a test the phase rewrites in place, so
// its block is cut from both texts) and an edit (an import line, `before` found once at the base and `after` found once
// now, reverted before the compare). A test is the block a label opens at two-space indent. With every declared change
// taken out, the two texts must be equal; anything else fails, naming the file and the first line that differs. A flip
// label must open exactly one block on each side. The edits replace the module path `DiagnosticsStore.ts` by
// `Diagnostics.ts` on one import line and change nothing else.
//
// Two files are born after the base (the feed's characterisation test and the dock model's reading test). Each is held byte
// for byte against the one commit that added it; a file with no adding commit yet passes, and `--all-applied` requires it.
//
// A held file that `git diff -M --name-status <phase_base>` reports as moved or deleted fails, naming both paths.
//
// From the repository root:
//   node .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-pinned-check.mjs
//   node <this file> --all-applied   (also requires every flip to differ from its base and to be recorded in the evidence,
//                                     and both born files to exist and be committed)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${DIR}83-RED-EVIDENCE.md`;
const TEST_DIR = "packages/devtools/test/";
const MODEL_DIR = `${TEST_DIR}model/`;

/** An import line of the test tree, as it stands at the base, and the same line pointed at the renamed module. */
const importEdit = (name, before) => ({ name, before, after: before.replace("DiagnosticsStore.ts", "Diagnostics.ts") });

const PINNED = [
  {
    file: `${MODEL_DIR}DiagnosticsFeed.test.ts`,
    flips: ["F2"],
    added: [],
    edits: [importEdit("import-noDiagnostics", 'import { noDiagnostics } from "../../src/model/DiagnosticsStore.ts";')],
  },
  {
    file: `${MODEL_DIR}DockModel.test.ts`,
    flips: [],
    added: [],
    edits: [
      importEdit("import-WiringRead-noDiagnostics", 'import { WiringRead, noDiagnostics } from "../../src/model/DiagnosticsStore.ts";'),
      importEdit("import-DiagnosticsReading", 'import type { DiagnosticsReading } from "../../src/model/DiagnosticsStore.ts";'),
    ],
  },
  {
    file: `${MODEL_DIR}ConfigureRule.test.ts`,
    flips: [],
    added: [],
    edits: [importEdit("import-DiagnosticsOptions", 'import type { DiagnosticsOptions } from "../../src/model/DiagnosticsStore.ts";')],
  },
  {
    file: `${TEST_DIR}builtFeeds.ts`,
    flips: [],
    added: [],
    edits: [importEdit("import-DiagnosticsOptions-builtFeeds", 'import type { DiagnosticsOptions } from "../src/model/DiagnosticsStore.ts";')],
  },
  { file: `${MODEL_DIR}DockModel.characterisation.test.ts`, flips: [], added: [], edits: [] },
  { file: `${TEST_DIR}react/ConfigureFirstRender.characterisation.test.tsx`, flips: [], added: [], edits: [] },
];

/** Files held byte for byte against the one commit that added each. */
const BORN = [`${MODEL_DIR}DiagnosticsFeed.characterisation.test.ts`, `${MODEL_DIR}DockModel.reading.test.ts`];

const occurrences = (text, piece) => (piece === "" ? 0 : text.split(piece).length - 1);

const opensTest = (line, label) => {
  const m = /^ {2}it(?:\.effect)?\("([^"]*)/.exec(line);
  return m !== null && m[1].startsWith(label) && /^[ :(]/.test(m[1].slice(label.length));
};
const endsBlock = (line) => /^ {2}(?:it|describe)[.(]/.test(line) || line.startsWith("});");

/** The [from, to) lines of the one test the label opens, or `undefined` when it opens none or several. */
export const rangeOf = (lines, label) => {
  const starts = lines.flatMap((line, i) => (opensTest(line, label) ? [i] : []));
  if (starts.length !== 1) return undefined;
  const from = starts[0];
  let to = from + 1;
  while (to < lines.length && !endsBlock(lines[to])) to += 1;
  return [from, to];
};

const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** Replaces each range of `lines` with the given lines, last range first so the others keep their place. */
const splice = (lines, edits) =>
  [...edits].sort((a, b) => b.from - a.from).reduce((out, { from, to, put }) => [...out.slice(0, from), ...put, ...out.slice(to)], lines);

/**
 * The reasons `current` is not `base` once the declared changes are taken out, and how many flips differ from the base.
 * An edit is taken out only when its `before` occurs once at the base and its `after` once now, so a second copy of the new
 * line, or a change beside it, stays in and fails the compare. Held files declare none, so any difference fails.
 */
export const judge = ({ file, flips, edits }, base, current) => {
  const reasons = [];
  const usable = edits.filter((edit) => {
    if (occurrences(base, edit.before) === 1) return true;
    reasons.push(`${file}: edit ${edit.name} does not occur exactly once at the base`);
    return false;
  });
  const applied = usable.filter((edit) => occurrences(current, edit.after) === 1);
  const reverted = applied.reduce((text, edit) => text.replace(edit.after, () => edit.before), current);
  const baseLines = base.split("\n");
  const currentLines = reverted.split("\n");
  const cutBase = [];
  const cutCurrent = [];
  let changed = 0;
  for (const label of flips) {
    const was = rangeOf(baseLines, label);
    const now = rangeOf(currentLines, label);
    if (was === undefined) reasons.push(`${file}: ${label}: not exactly one test opens with this label at the base`);
    if (now === undefined) reasons.push(`${file}: ${label}: not exactly one test opens with this label as checked out`);
    if (was === undefined || now === undefined) continue;
    const put = [`<flip ${label}>`];
    cutBase.push({ from: was[0], to: was[1], put });
    cutCurrent.push({ from: now[0], to: now[1], put });
    if (baseLines.slice(was[0], was[1]).join("\n") !== currentLines.slice(now[0], now[1]).join("\n")) changed += 1;
  }
  const left = splice(baseLines, cutBase).join("\n");
  const right = splice(currentLines, cutCurrent).join("\n");
  if (left !== right) reasons.push(`${file}: differs from its base text at line ${firstDifference(right, left)}`);
  return { reasons, changed };
};

/**
 * The reasons a born file is not held. `born` is the text at the commit that added it (`undefined`: no commit adds it yet)
 * and `current` the text on disk (`undefined`: no file). Without a commit and a file nothing is held yet, which only
 * `allApplied` refuses.
 */
export const judgeBorn = (file, born, current, allApplied) => {
  if (born === undefined && current === undefined) return allApplied ? [`${file} does not exist`] : [];
  if (born === undefined) return allApplied ? [`${file}: no commit adds it`] : [];
  if (current === undefined) return [`${file} was moved or deleted after the commit that added it`];
  return born === current ? [] : [`${file}: differs from the commit that added it at line ${firstDifference(current, born)}`];
};

/** The held files that `git diff -M --name-status` reports as moved or deleted, each with its reason. */
export const judgeMoves = (files, statusText) =>
  statusText
    .split("\n")
    .map((line) => line.split("\t"))
    .flatMap(([status, from, to]) => {
      if (!files.includes(from)) return [];
      if (status.startsWith("R")) return [{ file: from, reason: `${from} moved to ${to}` }];
      return status === "D" ? [{ file: from, reason: `${from} was deleted` }] : [];
    });

/** The flips that have no `- flip <label>: ` line in the evidence. */
export const unrecorded = (flips, evidence) => flips.filter((label) => !evidence.split("\n").some((line) => line.startsWith(`- flip ${label}: `)));

const planted = (...bodies) =>
  `describe("x", () => {\n${bodies.map(([label, body]) => `  it.effect("${label} a case", () =>\n    ${body}),\n`).join("\n")}});\n`;

const selfTest = () => {
  const base = planted(["A1", "one()"], ["A2", "two()"], ["A3", "three()"]);
  const spec = { file: "x.test.ts", flips: [], added: [], edits: [] };
  const flipSpec = { ...spec, flips: ["A2"] };
  const imp = 'import { a } from "./DiagnosticsStore.ts";';
  const impNew = 'import { a } from "./Diagnostics.ts";';
  const withImport = `${imp}\n${base}`;
  const editSpec = { ...spec, edits: [importEdit("imp", imp)] };
  const equal = judge(spec, base, base);
  const byte = judge(spec, base, base.replace("two()", "twoo()"));
  const space = judge(spec, base, base.replace("two()", "two() "));
  const crlf = judge(spec, base, base.replaceAll("\n", "\r\n"));
  const flipped = judge(flipSpec, base, base.replace("two()", "twoo()"));
  const unflipped = judge(flipSpec, base, base);
  const beside = judge(flipSpec, base, base.replace("two()", "twoo()").replace("three()", "threee()"));
  const lost = judge(flipSpec, base, base.replace("A2 a case", "A9 a case"));
  const doubled = judge(flipSpec, planted(["A2", "x()"], ["A2", "y()"]), base);
  const edited = judge(editSpec, withImport, `${impNew}\n${base}`);
  const editedEqual = judge(editSpec, withImport, withImport);
  const twice = judge(editSpec, withImport, `${impNew}\n${impNew}\n${base}`);
  const sameLine = judge(editSpec, withImport, `${impNew} // x\n${base}`);
  const editLost = judge({ ...spec, edits: [importEdit("gone", 'import { z } from "./DiagnosticsStore.ts";')] }, withImport, withImport);
  const editChanged = judge(editSpec, withImport, `${impNew}\n${base.replace("two()", "twoo()")}`);
  const both = { ...editSpec, flips: ["A2"] };
  const editAndFlip = judge(both, withImport, `${impNew}\n${base.replace("two()", "twoo()")}`);
  const editAndFlipOther = judge(both, withImport, `${impNew}\n${base.replace("two()", "twoo()").replace("one()", "uno()")}`);
  const evidence = "- flip A1: was => is\n- flip A2 : not a flip line\n";
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  const cases = [
    ["a held file that equals its base passes", equal.reasons.length === 0],
    ["a held file with one changed byte fails, naming the file and the line", byte.reasons.some((r) => r.startsWith("x.test.ts: differs") && r.endsWith("line 6"))],
    ["a whitespace-only change fails", space.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a line-ending change fails", crlf.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a flip that changed passes and counts", flipped.reasons.length === 0 && flipped.changed === 1],
    ["a flip that did not change passes and does not count", unflipped.reasons.length === 0 && unflipped.changed === 0],
    ["a change beside a flip fails", beside.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a flip whose label opens no test now fails", lost.reasons.some((r) => r.includes("A2: not exactly one test opens with this label as checked out"))],
    ["a flip whose label opens two tests at the base fails", doubled.reasons.some((r) => r.includes("A2: not exactly one test opens with this label at the base"))],
    ["a declared edit applied passes", edited.reasons.length === 0],
    ["a held file with no declared edit applied passes", editedEqual.reasons.length === 0],
    ["a second copy of the new import fails the compare", twice.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a change beside the new import on its line fails the compare", sameLine.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["an edit whose before is not found once at the base fails", editLost.reasons.some((r) => r.includes("edit gone does not occur exactly once at the base"))],
    ["a change beside an applied edit fails", editChanged.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["an edit and a flip in one file are both taken out", editAndFlip.reasons.length === 0 && editAndFlip.changed === 1],
    ["a change beside an edit and a flip fails", editAndFlipOther.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a born file equal to its adding commit passes", judgeBorn("b.ts", "t", "t", true).length === 0],
    ["a born file changed after its adding commit fails", judgeBorn("b.ts", "a\nb", "a\nc", false).some((r) => r === "b.ts: differs from the commit that added it at line 2")],
    ["a born file that is gone fails", judgeBorn("b.ts", "t", undefined, false).some((r) => r.includes("moved or deleted"))],
    ["an absent born file passes plain", judgeBorn("b.ts", undefined, undefined, false).length === 0],
    ["an absent born file fails when everything is applied", judgeBorn("b.ts", undefined, undefined, true).join() === "b.ts does not exist"],
    ["an uncommitted born file fails when everything is applied only", judgeBorn("b.ts", undefined, "t", false).length === 0 && judgeBorn("b.ts", undefined, "t", true).length === 1],
    ["a held file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts")],
    ["a held file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted")],
    ["a held file that was only modified or added is not moved", moves.length === 2],
    ["a flip with an evidence line is recorded", unrecorded(["A1"], evidence).length === 0],
    ["a flip with no evidence line is named", unrecorded(["A1", "A2"], evidence).join() === "A2"],
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

const run = (allApplied) => {
  const base = execFileSync("node", [`${DIR}83-check.mjs`, "base"], { encoding: "utf8" }).trim();
  const reasons = [];
  const status = execFileSync("git", ["diff", "-M", "--name-status", base], { encoding: "utf8", maxBuffer: 1 << 26 });
  const moves = judgeMoves(PINNED.map(({ file }) => file), status);
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));
  const evidence = allApplied && existsSync(EVIDENCE) ? readFileSync(EVIDENCE, "utf8") : "";
  let applied = 0;
  let declared = 0;
  for (const spec of PINNED) {
    declared += spec.flips.length;
    if (gone.has(spec.file)) continue;
    const baseText = showAt(base, spec.file);
    if (baseText === undefined) {
      reasons.push(`${spec.file} does not exist at the base`);
      continue;
    }
    const result = judge(spec, baseText, readFileSync(spec.file, "utf8"));
    applied += result.changed;
    reasons.push(...result.reasons);
    if (!allApplied) continue;
    const was = baseText.split("\n");
    const now = readFileSync(spec.file, "utf8").split("\n");
    for (const label of spec.flips) {
      const a = rangeOf(was, label);
      const b = rangeOf(now, label);
      if (a !== undefined && b !== undefined && was.slice(a[0], a[1]).join("\n") === now.slice(b[0], b[1]).join("\n")) reasons.push(`${spec.file}: ${label}: the flip is not applied, the test equals its base`);
    }
    for (const label of unrecorded(spec.flips, evidence)) reasons.push(`${spec.file}: ${label}: no "- flip ${label}: " line in the evidence`);
  }
  let born = 0;
  for (const file of BORN) {
    const adders = execFileSync("git", ["log", "--diff-filter=A", "--format=%H", `${base}..HEAD`, "--", file], { encoding: "utf8" })
      .split("\n")
      .filter((sha) => sha !== "");
    if (adders.length > 1) {
      reasons.push(`${file}: ${adders.length} commits add it, not one`);
      continue;
    }
    const bornText = adders.length === 1 ? showAt(adders[0], file) : undefined;
    const current = existsSync(file) ? readFileSync(file, "utf8") : undefined;
    const found = judgeBorn(file, bornText, current, allApplied);
    reasons.push(...found);
    if (found.length === 0 && bornText !== undefined) born += 1;
  }
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`pinned: ${PINNED.length} files hold their base text, ${born} of ${BORN.length} born files held, ${applied} of ${declared} declared flips applied\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
