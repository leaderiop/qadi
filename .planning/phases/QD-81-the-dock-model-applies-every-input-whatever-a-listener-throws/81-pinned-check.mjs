// The check that the existing tests of the touched files keep their text, apart from what the phase declares.
//
// Each pinned file is compared with its text at `phase_base` (as `81-check.mjs base` prints it). Three files are held
// byte for byte. The others may differ only inside three declared kinds of change: a flip (a test the phase rewrites in
// place, so its block is cut from both texts), an addition (a test the phase adds, so its block is cut from the current
// text and must not exist at the base) and an edit (an import line, `before` found once at the base and `after` found
// once now, reverted before the compare). A test is the block a label opens at two-space indent, as `79-pinned-check.mjs`
// cuts it. With every declared change taken out, the two texts must be equal; anything else fails, naming the file and
// the first line that differs. A flip label must open exactly one block on each side, an added label none at the base
// and one now.
//
// From the repository root:
//   node .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-pinned-check.mjs
//   node <this file> --all-applied   (also requires every flip to differ from its base and to be recorded in the evidence)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = `${relative(process.cwd(), dirname(fileURLToPath(import.meta.url)))}/`;
const EVIDENCE = `${DIR}81-RED-EVIDENCE.md`;
const TEST_DIR = "packages/devtools/test/model/";

const SETTLE_IMPORT = 'import { settleTurns } from "../helpers.ts";';

const PINNED = [
  { file: `${TEST_DIR}DockModel.test.ts`, flips: [], added: [], edits: [] },
  { file: `${TEST_DIR}DockModel.characterisation.test.ts`, flips: [], added: [], edits: [] },
  { file: `${TEST_DIR}ExternalStore.test.ts`, flips: [], added: [], edits: [] },
  { file: `${TEST_DIR}ConfigureRule.test.ts`, flips: ["CR22"], added: [], edits: [] },
  { file: `${TEST_DIR}TimelineFeed.test.ts`, flips: ["TF28", "TF29"], added: ["TF37"], edits: [] },
  { file: `${TEST_DIR}DiagnosticsFeed.test.ts`, flips: ["F31"], added: [], edits: [] },
  { file: `${TEST_DIR}GatesFeed.test.ts`, flips: [], added: ["G49"], edits: [] },
  {
    file: `${TEST_DIR}SimulationSession.runs.test.ts`,
    flips: [],
    added: ["SR6"],
    edits: [{ name: "import-thrownBy", before: SETTLE_IMPORT, after: 'import { settleTurns, thrownBy } from "../helpers.ts";' }],
  },
];

const occurrences = (text, piece) => (piece === "" ? 0 : text.split(piece).length - 1);

const opensTest = (line, label) => {
  const m = /^ {2}it(?:\.effect)?\("([^"]*)/.exec(line);
  return m !== null && m[1].startsWith(label) && /^[ :(]/.test(m[1].slice(label.length));
};
const endsBlock = (line) => /^ {2}(?:it|describe)[.(]/.test(line) || line.startsWith("});");

/** How many tests the label opens in the lines. */
const opened = (lines, label) => lines.filter((line) => opensTest(line, label)).length;

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

/** Replaces each range of `lines` with the given line (or removes it), last range first so the others keep their place. */
const splice = (lines, edits) =>
  [...edits].sort((a, b) => b.from - a.from).reduce((out, { from, to, put }) => [...out.slice(0, from), ...put, ...out.slice(to)], lines);

/**
 * The reasons `current` is not `base` once the declared changes are taken out, and how many flips differ from the base.
 * Held files declare none, so any difference fails.
 */
export const judge = ({ file, flips, added, edits }, base, current) => {
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
  for (const label of added) {
    if (opened(baseLines, label) !== 0) reasons.push(`${file}: ${label}: a test opens with this label at the base`);
    const now = rangeOf(currentLines, label);
    if (now === undefined) {
      reasons.push(`${file}: ${label}: not exactly one test opens with this label as checked out`);
      continue;
    }
    // The blank line that separates the added test from the one above goes with it, unless the block took its own.
    const separated = currentLines[now[0] - 1] === "" && currentLines[now[1] - 1] !== "";
    cutCurrent.push({ from: separated ? now[0] - 1 : now[0], to: now[1], put: [] });
  }
  const left = splice(baseLines, cutBase).join("\n");
  const right = splice(currentLines, cutCurrent).join("\n");
  if (left !== right) reasons.push(`${file}: differs from its base text at line ${firstDifference(right, left)}`);
  return { reasons, changed };
};

/** The flips that have no `- flip <label>: ` line in the evidence. */
export const unrecorded = (flips, evidence) => flips.filter((label) => !evidence.split("\n").some((line) => line.startsWith(`- flip ${label}: `)));

const planted = (...bodies) =>
  `describe("x", () => {\n${bodies.map(([label, body]) => `  it.effect("${label} a case", () =>\n    ${body}),\n`).join("\n")}});\n`;

const selfTest = () => {
  const base = planted(["A1", "one()"], ["A2", "two()"], ["A3", "three()"]);
  const spec = { file: "x.test.ts", flips: [], added: [], edits: [] };
  const flipSpec = { ...spec, flips: ["A2"] };
  const addSpec = { ...spec, added: ["A4"] };
  const editSpec = { ...spec, edits: [{ name: "imp", before: "one()", after: "one(1)" }] };
  const equal = judge(spec, base, base);
  const byte = judge(spec, base, base.replace("two()", "twoo()"));
  const flipped = judge(flipSpec, base, base.replace("two()", "twoo()"));
  const unflipped = judge(flipSpec, base, base);
  const beside = judge(flipSpec, base, base.replace("two()", "twoo()").replace("three()", "threee()"));
  const lost = judge(flipSpec, base, base.replace("A2 a case", "A9 a case"));
  const doubled = judge(flipSpec, planted(["A2", "x()"], ["A2", "y()"]), base);
  const middle = planted(["A1", "one()"], ["A4", "four()"], ["A2", "two()"], ["A3", "three()"]);
  const end = base.replace("});\n", '\n  it.effect("A4 a case", () =>\n    four()),\n});\n');
  const added = judge(addSpec, base, end);
  const addedMiddle = judge(addSpec, base, middle);
  const addedAtBase = judge(addSpec, end, end);
  const addedMissing = judge(addSpec, base, base);
  const addedWithChange = judge(addSpec, base, end.replace("one()", "uno()"));
  const edited = judge(editSpec, base, base.replace("one()", "one(1)"));
  const editLost = judge({ ...spec, edits: [{ name: "gone", before: "nine()", after: "nine(1)" }] }, base, base);
  const editChanged = judge(editSpec, base, base.replace("one()", "one(1)").replace("two()", "twoo()"));
  const evidence = "- flip A1: was => is\n- flip A2 : not a flip line\n";
  const cases = [
    ["a held file that equals its base passes", equal.reasons.length === 0],
    ["a held file with one changed byte fails, naming the file and the line", byte.reasons.some((r) => r.startsWith("x.test.ts: differs") && r.endsWith("line 6"))],
    ["a flip that changed passes and counts", flipped.reasons.length === 0 && flipped.changed === 1],
    ["a flip that did not change passes and does not count", unflipped.reasons.length === 0 && unflipped.changed === 0],
    ["a change beside a flip fails", beside.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a flip whose label opens no test now fails", lost.reasons.some((r) => r.includes("A2: not exactly one test opens with this label as checked out"))],
    ["a flip whose label opens two tests at the base fails", doubled.reasons.some((r) => r.includes("A2: not exactly one test opens with this label at the base"))],
    ["an added test at the end passes", added.reasons.length === 0],
    ["an added test in the middle passes", addedMiddle.reasons.length === 0],
    ["an added test already at the base fails", addedAtBase.reasons.some((r) => r.includes("A4: a test opens with this label at the base"))],
    ["an added test that is missing fails", addedMissing.reasons.some((r) => r.includes("A4: not exactly one test opens with this label as checked out"))],
    ["a change beside an added test fails", addedWithChange.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a declared edit applied passes", edited.reasons.length === 0],
    ["an edit whose before is not found once at the base fails", editLost.reasons.some((r) => r.includes("edit gone does not occur exactly once at the base"))],
    ["a change beside an applied edit fails", editChanged.reasons.some((r) => r.startsWith("x.test.ts: differs"))],
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

const run = (allApplied) => {
  const base = execFileSync("node", [`${DIR}81-check.mjs`, "base"], { encoding: "utf8" }).trim();
  const results = PINNED.map((spec) => {
    const baseText = execFileSync("git", ["show", `${base}:${spec.file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
    return judge(spec, baseText, readFileSync(spec.file, "utf8"));
  });
  const declared = PINNED.reduce((n, { flips }) => n + flips.length, 0);
  const applied = results.reduce((n, result) => n + result.changed, 0);
  const reasons = results.flatMap((result) => result.reasons);
  if (allApplied) {
    const evidence = existsSync(EVIDENCE) ? readFileSync(EVIDENCE, "utf8") : "";
    for (const { file, flips } of PINNED) {
      const baseText = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
      const now = readFileSync(file, "utf8").split("\n");
      const was = baseText.split("\n");
      for (const label of flips) {
        const a = rangeOf(was, label);
        const b = rangeOf(now, label);
        if (a !== undefined && b !== undefined && was.slice(a[0], a[1]).join("\n") === now.slice(b[0], b[1]).join("\n")) reasons.push(`${file}: ${label}: the flip is not applied, the test equals its base`);
      }
      for (const label of unrecorded(flips, evidence)) reasons.push(`${file}: ${label}: no "- flip ${label}: " line in the evidence`);
    }
  }
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`pinned: ${PINNED.length} files hold their base text, ${applied} of ${declared} declared flips applied\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
