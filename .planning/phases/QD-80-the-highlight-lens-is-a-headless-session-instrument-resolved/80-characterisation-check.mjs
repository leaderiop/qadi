// The check that a characterisation still holds the text it was first committed with, allowing only declared flips.
//
// Each entry of FILES names a test file, `base` (the commit that added it) and `flips`. The file as checked out, with
// every applied flip reverted to its `before` line, must equal that commit's file by sha256: the pins were written on
// the code before the change, so a pin edited to follow it would stop guarding it. A flip is one whole line (its
// indentation included) that occurs once in the file at `base`; applying it replaces that line with `after`, and
// nothing else in the file may move. The run mode also refuses a `base` that is not the commit that added the file.
//
// From the repository root:
//   node <this file>                          holds each file to its first commit, flips reverted
//   node <this file> --all-flipped            the same, and every flip must be applied
//   node <this file> flip <file> [<name>...]  applies the named flips (all when none is named) to the file
//   node <this file> --red-recorded           every flip has a `- red on the base (<name>): <title>` evidence line
//   node <this file> --self-test              drives every judge with planted text
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const D = ".planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/";
const EVIDENCE = `${D}80-RED-EVIDENCE.md`;

const FILES = [
  {
    file: "packages/devtools/test/react/Lens.dock.characterisation.test.tsx",
    base: "7546f54e1a07abec7ea6aef328f9196a59a033c2",
    flips: [
      {
        name: "pick-kept",
        title: "a pick, then a switch to the log and back",
        before: '    assert.strictEqual(pickedRows().length, 0, "the row picked before the switch");',
        after: '    assert.strictEqual(pickedRows().length, 1, "the row picked before the switch");',
      },
      {
        name: "highlight-ends-picking",
        title: "the highlight button pressed while picking",
        before: '    assert.include(pickButton().textContent ?? "", "picking —", "while picking, after the highlight");',
        after: '    assert.strictEqual(pickButton().textContent, "pick a control on the page", "while picking, after the highlight");',
      },
      {
        name: "highlight-survives-move",
        title: "the highlight button pressed while picking",
        before: '    assert.strictEqual(overlays().length, 0, "after a pointer move over the dock");',
        after: '    assert.strictEqual(overlays().length, 1, "after a pointer move over the dock");',
      },
      {
        name: "same-hover-same-overlay",
        title: "two pointer moves over one guard while picking",
        before: '    assert.notStrictEqual(second, first, "the overlay after the second move");',
        after: '    assert.strictEqual(second, first, "the overlay after the second move");',
      },
    ],
  },
];

const digest = (text) => createHash("sha256").update(text).digest("hex");
const count = (lines, line) => lines.filter((l) => l === line).length;
const replaceOnce = (lines, from, to) => lines.map((l) => (l === from ? to : l));

/** Reasons a flip cannot be declared against the base text: its `before` must occur once and its `after` never. */
export const judgeFlips = (baseText, flips) => {
  const lines = baseText.split("\n");
  return flips.flatMap((flip) => {
    const bad = [];
    const before = count(lines, flip.before);
    if (before !== 1) bad.push(`flip ${flip.name}: its before line occurs ${before} times at the base, not once`);
    if (count(lines, flip.after) !== 0) bad.push(`flip ${flip.name}: its after line is already present at the base`);
    return bad;
  });
};

/**
 * The text with every applied flip reverted, which flips were applied, and the reasons a flip is unreadable.
 * A flip is applied when its `after` occurs once and its `before` never, unapplied the other way round; both present,
 * either twice, or neither is refused.
 */
export const revert = (currentText, flips) => {
  let lines = currentText.split("\n");
  const applied = [];
  const reasons = [];
  for (const flip of flips) {
    const before = count(lines, flip.before);
    const after = count(lines, flip.after);
    if (before === 1 && after === 0) continue;
    if (after === 1 && before === 0) {
      applied.push(flip.name);
      lines = replaceOnce(lines, flip.after, flip.before);
      continue;
    }
    if (before >= 1 && after >= 1) reasons.push(`flip ${flip.name}: its before and after lines are both present`);
    else if (before === 0 && after === 0) reasons.push(`flip ${flip.name}: neither its before nor its after line is present`);
    else reasons.push(`flip ${flip.name}: its before line occurs ${before} times and its after line ${after}`);
  }
  return { text: lines.join("\n"), applied, reasons };
};

/** The reasons the current text is not the base text with only declared flips applied; empty when it is. */
export const judge = ({ file, base }, baseText, currentText, flips, allFlipped) => {
  const declared = judgeFlips(baseText, flips);
  if (declared.length > 0) return { reasons: declared, applied: [] };
  const { text, applied, reasons } = revert(currentText, flips);
  const bad = [...reasons];
  if (reasons.length === 0 && digest(text) !== digest(baseText)) {
    bad.push(`${file} differs from its first commit: sha256 ${digest(text)} with its flips reverted, ${digest(baseText)} at ${base.slice(0, 8)}`);
  }
  if (allFlipped) for (const flip of flips) if (!applied.includes(flip.name)) bad.push(`flip ${flip.name} is not applied`);
  return { reasons: bad, applied };
};

/** The text with the named flips applied (all when `names` is empty), or the reasons that cannot be done. */
export const applyFlips = (text, flips, names) => {
  const wanted = names.length === 0 ? flips : flips.filter((flip) => names.includes(flip.name));
  const unknown = names.filter((name) => !flips.some((flip) => flip.name === name));
  if (unknown.length > 0) return { reasons: unknown.map((name) => `no flip is named ${name}`) };
  let lines = text.split("\n");
  const reasons = [];
  for (const flip of wanted) {
    const before = count(lines, flip.before);
    const after = count(lines, flip.after);
    if (before !== 1 || after !== 0) {
      reasons.push(`flip ${flip.name}: not unapplied (its before line occurs ${before} times, its after line ${after})`);
      continue;
    }
    lines = replaceOnce(lines, flip.before, flip.after);
  }
  return reasons.length > 0 ? { reasons } : { text: lines.join("\n"), reasons };
};

/** Reasons a flip has no `- red on the base (<name>): <title>` line in the evidence. */
export const judgeRed = (evidenceText, flips) => {
  const lines = evidenceText.split("\n");
  return flips
    .filter((flip) => !lines.includes(`- red on the base (${flip.name}): ${flip.title}`))
    .map((flip) => `no red line in the evidence for flip ${flip.name}: - red on the base (${flip.name}): ${flip.title}`);
};

const selfTest = () => {
  const flips = [
    { name: "one", title: "t", before: "  a(0);", after: "  a(1);" },
    { name: "two", title: "t", before: "  b(0);", after: "  b(1);" },
  ];
  const base = ["x", "  a(0);", "  b(0);", "y", ""].join("\n");
  const entry = { file: "f.tsx", base: "0123456789abcdef" };
  const run = (current, allFlipped = false) => judge(entry, base, current, flips, allFlipped);
  const one = base.replace("a(0)", "a(1)");
  const cases = [
    ["equal text passes", run(base).reasons.length === 0],
    ["one changed byte outside a flip fails, naming the file", run(base.replace("x", "z")).reasons.some((r) => r.startsWith("f.tsx differs"))],
    ["one declared flip applied passes and is reported", (() => { const r = run(one); return r.reasons.length === 0 && r.applied.join() === "one"; })()],
    ["an edit beside an applied flip fails", run(one.replace("y", "w")).reasons.length === 1],
    ["--all-flipped with one flip unapplied fails", run(one, true).reasons.some((r) => r.includes("flip two is not applied"))],
    ["--all-flipped with every flip applied passes", run(one.replace("b(0)", "b(1)"), true).reasons.length === 0],
    ["a flip whose before is absent at the base is refused", judgeFlips(base, [{ name: "gone", before: "  c(0);", after: "  c(1);" }]).length === 1],
    ["a flip whose before occurs twice at the base is refused", judgeFlips(`${base}  a(0);\n`, flips).length === 1],
    ["a flip whose before and after are both present is refused", run(`${base}  a(1);\n`).reasons.some((r) => r.includes("both present"))],
    ["a flip edited to a third text is refused", run(base.replace("a(0)", "a(2)")).reasons.some((r) => r.includes("neither"))],
    ["flip of an unapplied flip applies it", applyFlips(base, flips, ["one"]).text === one],
    ["flip of an applied flip is refused", applyFlips(one, flips, ["one"]).reasons.length === 1],
    ["flip with no name applies every flip", applyFlips(base, flips, []).text === one.replace("b(0)", "b(1)")],
    ["flip of an unknown name is refused", applyFlips(base, flips, ["nope"]).reasons.length === 1],
    ["a flip with no red line is named", judgeRed("- red on the base (one): t\n", flips).length === 1],
    ["every flip with a red line passes", judgeRed("- red on the base (one): t\n- red on the base (two): t\n", flips).length === 0],
  ];
  const failed = cases.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });

const fail = (lines) => {
  process.stderr.write(`${lines.join("\n")}\n`);
  process.exit(1);
};

const run = (allFlipped) => {
  for (const entry of FILES) {
    const added = git("log", "--diff-filter=A", "--format=%H", "--", entry.file).split("\n").filter((line) => line !== "");
    const first = added[added.length - 1];
    if (first !== entry.base) fail([`base ${entry.base} is not the commit that added ${entry.file} (${first ?? "none"})`]);
    const { reasons, applied } = judge(entry, git("show", `${entry.base}:${entry.file}`), readFileSync(entry.file, "utf8"), entry.flips, allFlipped);
    if (reasons.length > 0) fail(reasons);
    process.stdout.write(`characterisation: ${entry.file} holds its first commit (${entry.base.slice(0, 8)}), ${applied.length} of ${entry.flips.length} flips applied\n`);
  }
};

const flipFile = (file, names) => {
  const entry = FILES.find((e) => e.file === file);
  if (entry === undefined) return fail([`usage: flip <file> [<name>...]; the files are ${FILES.map((e) => e.file).join(", ")}`]);
  const result = applyFlips(readFileSync(file, "utf8"), entry.flips, names);
  if (result.reasons.length > 0) return fail(result.reasons);
  writeFileSync(file, result.text);
  process.stdout.write(`flip: ${file} ${names.length === 0 ? "all flips" : names.join(" ")} applied\n`);
};

const redRecorded = () => {
  const evidence = existsSync(EVIDENCE) ? readFileSync(EVIDENCE, "utf8") : "";
  const reasons = FILES.flatMap((entry) => judgeRed(evidence, entry.flips));
  if (reasons.length > 0) fail(reasons);
  process.stdout.write("red-recorded: every flip has its red line\n");
};

const [mode, ...rest] = process.argv.slice(2);
if (mode === "--self-test") selfTest();
else if (mode === "--red-recorded") redRecorded();
else if (mode === "flip") flipFile(rest[0], rest.slice(1));
else run(mode === "--all-flipped");
