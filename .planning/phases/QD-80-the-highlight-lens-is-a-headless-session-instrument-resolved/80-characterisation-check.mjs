// The check that a characterisation still holds the text it was first committed with, allowing only declared flips.
//
// Each entry of FILES names a test file, `base` (the commit that added it) and `flips`. The file as checked out, with
// every applied flip reverted to its `before` line, must equal that commit's file by sha256: the pins were written on
// the code before the change, so a pin edited to follow it would stop guarding it. A flip is one whole line (its
// indentation included) that occurs once in the file at `base`; applying it replaces that line with `after`, and
// nothing else in the file may move. A flip that has to move several lines at once (a title, the sentence that says the
// same thing and the assertion) declares them as `edits`, each a whole line like the one above, applied and reverted
// together: a flip with only some of its edits applied is refused. `title` is always the test's title at the base, which
// is the title the red evidence line names. The run mode also refuses a `base` that is not the commit that added the file.
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
  {
    file: "packages/react/test/InstrumentToggle.characterisation.test.tsx",
    base: "2cca1f46a30ea7fd50d070fc34cf3b0d7239a2b2",
    flips: [
      {
        name: "toggle-no-rerender",
        title: "a memoised consumer of the context renders again when instrument is toggled",
        edits: [
          {
            before: " * A memoised component that reads the provider's context is rendered again when the",
            after: " * A memoised component that reads the provider's context does not render again when the",
          },
          {
            before: " * toggle flips, because the context value carries the flag; a guard registers when it",
            after: " * toggle flips, because the context value carries no flag; a guard registers when it",
          },
          {
            before: '    "a memoised consumer of the context renders again when instrument is toggled",',
            after: '    "a memoised consumer of the context does not render again when instrument is toggled",',
          },
          {
            before: "      expect(rendersOnToggle).toBe(1);",
            after: "      expect(rendersOnToggle).toBe(0);",
          },
        ],
      },
    ],
  },
];

const digest = (text) => createHash("sha256").update(text).digest("hex");
const count = (lines, line) => lines.filter((l) => l === line).length;
const replaceOnce = (lines, from, to) => lines.map((l) => (l === from ? to : l));

/** The whole-line edits of a flip: its `edits`, or the one `before` / `after` pair it is written with. */
const editsOf = (flip) => flip.edits ?? [{ before: flip.before, after: flip.after }];

/** The reasons an edit is in neither clean state, prefixed by its flip's name and, when it has several, its number. */
const unreadable = (flip, edit, lines) => {
  const before = count(lines, edit.before);
  const after = count(lines, edit.after);
  const at = editsOf(flip).length > 1 ? `flip ${flip.name}: edit ${editsOf(flip).indexOf(edit) + 1}:` : `flip ${flip.name}:`;
  if (before >= 1 && after >= 1) return `${at} its before and after lines are both present`;
  if (before === 0 && after === 0) return `${at} neither its before nor its after line is present`;
  return `${at} its before line occurs ${before} times and its after line ${after}`;
};

const isUnapplied = (lines, edit) => count(lines, edit.before) === 1 && count(lines, edit.after) === 0;
const isApplied = (lines, edit) => count(lines, edit.after) === 1 && count(lines, edit.before) === 0;

/** Reasons a flip cannot be declared against the base text: each `before` must occur once and each `after` never. */
export const judgeFlips = (baseText, flips) => {
  const lines = baseText.split("\n");
  return flips.flatMap((flip) =>
    editsOf(flip).flatMap((edit, index, all) => {
      const bad = [];
      const at = all.length > 1 ? `flip ${flip.name}: edit ${index + 1}:` : `flip ${flip.name}:`;
      const before = count(lines, edit.before);
      if (before !== 1) bad.push(`${at} its before line occurs ${before} times at the base, not once`);
      if (count(lines, edit.after) !== 0) bad.push(`${at} its after line is already present at the base`);
      return bad;
    }),
  );
};

/**
 * The text with every applied flip reverted, which flips were applied, and the reasons a flip is unreadable.
 * A flip is applied when each of its edits has its `after` once and its `before` never, unapplied the other way round;
 * a flip with both kinds of edit, an edit with both lines present, either line twice, or neither is refused.
 */
export const revert = (currentText, flips) => {
  let lines = currentText.split("\n");
  const applied = [];
  const reasons = [];
  for (const flip of flips) {
    const edits = editsOf(flip);
    if (edits.every((edit) => isUnapplied(lines, edit))) continue;
    if (edits.every((edit) => isApplied(lines, edit))) {
      applied.push(flip.name);
      for (const edit of edits) lines = replaceOnce(lines, edit.after, edit.before);
      continue;
    }
    const odd = edits.filter((edit) => !isUnapplied(lines, edit) && !isApplied(lines, edit));
    if (odd.length > 0) reasons.push(...odd.map((edit) => unreadable(flip, edit, lines)));
    else reasons.push(`flip ${flip.name}: only some of its edits are applied`);
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
    const edits = editsOf(flip);
    if (!edits.every((edit) => isUnapplied(lines, edit))) {
      const seen = edits.map((edit) => `${count(lines, edit.before)}/${count(lines, edit.after)}`).join(", ");
      reasons.push(`flip ${flip.name}: not unapplied (its before and after lines occur ${seen} times)`);
      continue;
    }
    for (const edit of edits) lines = replaceOnce(lines, edit.before, edit.after);
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

/** A flip of three lines moved together: the title, the sentence that says the same thing and the assertion. */
const multiCases = () => {
  const flip = {
    name: "multi",
    title: "t",
    edits: [
      { before: "// says 0", after: "// says 1" },
      { before: '  it("zero", () => {', after: '  it("one", () => {' },
      { before: "  expect(n).toBe(0);", after: "  expect(n).toBe(1);" },
    ],
  };
  const base = ["// says 0", '  it("zero", () => {', "  expect(n).toBe(0);", "});", ""].join("\n");
  const entry = { file: "m.tsx", base: "0123456789abcdef" };
  const flipped = base.replace("says 0", "says 1").replace('"zero"', '"one"').replace("toBe(0)", "toBe(1)");
  const run = (current, allFlipped = false) => judge(entry, base, current, [flip], allFlipped);
  return [
    ["a multi-line flip applied whole passes and is reported", (() => { const r = run(flipped, true); return r.reasons.length === 0 && r.applied.join() === "multi"; })()],
    ["a multi-line flip unapplied passes", run(base).reasons.length === 0],
    ["a multi-line flip with only its assertion applied is refused", run(base.replace("toBe(0)", "toBe(1)")).reasons.some((r) => r.includes("only some of its edits are applied"))],
    ["a multi-line flip with only its title left unapplied is refused", run(flipped.replace('"one"', '"zero"')).reasons.some((r) => r.includes("only some of its edits are applied"))],
    ["a multi-line flip with one line edited to a third text is refused, naming the edit", run(flipped.replace("says 1", "says 2")).reasons.some((r) => r.includes("edit 1: neither"))],
    ["a multi-line flip declared over a line absent at the base is refused, naming the edit", judgeFlips(base.replace("// says 0\n", ""), [flip]).some((r) => r.includes("edit 1: its before line occurs 0"))],
    ["flip applies every line of a multi-line flip", applyFlips(base, [flip], ["multi"]).text === flipped],
    ["flip of a partly applied multi-line flip is refused", applyFlips(base.replace("toBe(0)", "toBe(1)"), [flip], ["multi"]).reasons.length === 1],
  ];
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
    ...multiCases(),
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
