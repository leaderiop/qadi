// The check that the existing panel and lens tests keep their text.
//
// Each pinned file is compared with its text at `phase_base` (read as `80-check.mjs base` reads it). Three files are held
// byte for byte. `QuestionsPanel.gates.test.tsx` is held from its lens cells (`heldFrom`) to the end, and above them it
// may carry only the declared edits: each is `before` at the base and `after` as checked out. An edit counts as applied
// when its `after` occurs exactly once; every applied edit is reverted and the whole file must then equal the base. An
// edit whose `before` is not found exactly once at the base, or lies at or below `heldFrom`, is refused, so no edit can
// reach a held lens cell, with one exception: an edit that states `inRegion`, the reason a held line has to change,
// may lie there (an empty reason does not count). Every other byte of the region stays held. Anything else that differs
// fails, naming the file and the first line that differs.
//
// From the repository root:
//   node .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-pinned-check.mjs
//   node <this file> --all-applied   (also requires every declared edit to be applied)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DIR = ".planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/";
const TEST_DIR = "packages/devtools/test/react/";

const PINNED = [
  { file: `${TEST_DIR}Lens.test.ts`, edits: [] },
  { file: `${TEST_DIR}QuestionsPanel.test.tsx`, edits: [] },
  { file: `${TEST_DIR}VerdictTreatment.test.tsx`, edits: [] },
  {
    file: `${TEST_DIR}QuestionsPanel.gates.test.tsx`,
    heldFrom: 'describe("highlight — the panel points at the page", () => {',
    edits: [
      {
        name: "import-lens",
        before: 'import type { GateInstanceLike, QuestionsSnapshot } from "../../src/model/Gates.ts";',
        after:
          'import type { GateInstanceLike, QuestionsSnapshot } from "../../src/model/Gates.ts";\n' +
          'import { makeLensSession } from "../../src/model/LensSession.ts";',
      },
      {
        name: "unreadable-lens",
        before: "  const unreadable = { questions: { subscribe: () => () => {}, getSnapshot: () => snapshot } };",
        after:
          "  const unreadable = {\n" +
          "    questions: { subscribe: () => () => {}, getSnapshot: () => snapshot },\n" +
          "    lens: makeLensSession(),\n" +
          "  };",
      },
      {
        name: "escape-assertion",
        inRegion:
          "the held assertion could not fail: neither the picking text nor the idle text contains `Escape —`, so it " +
          "passed whether or not Escape ended picking; it now reads that the button text is back to the idle text",
        before: '    assert.notInclude(screen.getByTestId("qadi-pick").textContent ?? "", "Escape —");',
        after: '    assert.strictEqual(screen.getByTestId("qadi-pick").textContent, "pick a control on the page");',
      },
      {
        name: "failed-questions-lens",
        before: "        questions={{ subscribe: () => () => {}, getSnapshot: () => snapshot }}",
        after:
          "        questions={{ subscribe: () => () => {}, getSnapshot: () => snapshot }}\n" +
          "        lens={makeLensSession()}",
      },
    ],
  },
];

const occurrences = (text, piece) => (piece === "" ? 0 : text.split(piece).length - 1);

const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** The reasons `current` is not `base` once the applied declared edits are reverted, and how many were applied. */
export const judge = ({ file, heldFrom, edits }, base, current) => {
  const reasons = [];
  const held = heldFrom === undefined ? undefined : base.indexOf(heldFrom);
  if (heldFrom !== undefined && occurrences(base, heldFrom) !== 1) {
    reasons.push(`${file}: the held region does not start exactly once at the base`);
  }
  const usable = edits.filter((edit) => {
    const at = base.indexOf(edit.before);
    if (occurrences(base, edit.before) !== 1) {
      reasons.push(`${file}: edit ${edit.name} does not occur exactly once at the base`);
      return false;
    }
    const reasoned = typeof edit.inRegion === "string" && edit.inRegion.trim() !== "";
    if (held !== undefined && held >= 0 && at + edit.before.length > held && !reasoned) {
      reasons.push(`${file}: edit ${edit.name} lies at or below the held region`);
      return false;
    }
    return true;
  });
  const applied = usable.filter((edit) => occurrences(current, edit.after) === 1);
  const reverted = applied.reduce((text, edit) => text.replace(edit.after, () => edit.before), current);
  if (reverted !== base) {
    reasons.push(`${file}: differs from its base text at line ${firstDifference(reverted, base)}`);
  }
  return { reasons, applied: applied.length };
};

const sample = {
  file: "x.test.tsx",
  heldFrom: "// held",
  edits: [{ name: "one", before: "const a = 1;", after: "const a = 1;\nconst b = 2;" }],
};
const baseText = "head\nconst a = 1;\nmid\n// held\nit(1);\nit(2);\n";

const selfTest = () => {
  const ok = judge(sample, baseText, baseText);
  const edited = judge(sample, baseText, baseText.replace("const a = 1;", "const a = 1;\nconst b = 2;"));
  const heldChanged = judge(sample, baseText, baseText.replace("it(2);", "it(3);"));
  const beside = judge(sample, baseText, baseText.replace("const a = 1;", "const a = 1;\nconst b = 2;").replace("mid", "mad"));
  const below = judge({ ...sample, edits: [{ name: "low", before: "it(1);", after: "it(1);\nlens;" }] }, baseText, baseText.replace("it(1);", "it(1);\nlens;"));
  const stated = { name: "low", inRegion: "it could not fail", before: "it(1);", after: "it(1);\nlens;" };
  const reasoned = judge({ ...sample, edits: [stated] }, baseText, baseText.replace("it(1);", "it(1);\nlens;"));
  const blank = judge({ ...sample, edits: [{ ...stated, inRegion: "  " }] }, baseText, baseText);
  const reasonedBeside = judge({ ...sample, edits: [stated] }, baseText, baseText.replace("it(1);", "it(1);\nlens;").replace("it(2);", "it(3);"));
  const twice = judge({ ...sample, edits: [{ name: "dup", before: "it(", after: "it(\n" }] }, baseText, baseText);
  const cases = [
    ["equal passes", ok.reasons.length === 0 && ok.applied === 0],
    ["a declared edit applied passes", edited.reasons.length === 0 && edited.applied === 1],
    ["a changed byte in the held region fails, naming the file", heldChanged.reasons.some((r) => r.startsWith("x.test.tsx: differs") && r.endsWith("line 6"))],
    ["a change beside an applied edit fails", beside.reasons.some((r) => r.startsWith("x.test.tsx: differs"))],
    ["an edit whose before lies in the held region is refused", below.reasons.some((r) => r.includes("edit low lies at or below"))],
    ["an edit in the held region that states its reason passes and is reported", reasoned.reasons.length === 0 && reasoned.applied === 1],
    ["an edit in the held region with a blank reason is refused", blank.reasons.some((r) => r.includes("edit low lies at or below"))],
    ["a change beside an edit in the held region fails", reasonedBeside.reasons.some((r) => r.startsWith("x.test.tsx: differs") && r.endsWith("line 6"))],
    ["an edit whose before is not found once is refused", twice.reasons.some((r) => r.includes("edit dup does not occur exactly once"))],
    ["with one edit missing, one of one is not applied", ok.applied < sample.edits.length],
  ];
  const failed = cases.filter(([, passed]) => !passed).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const run = (allApplied) => {
  const base = execFileSync("node", [`${DIR}80-check.mjs`, "base"], { encoding: "utf8" }).trim();
  const results = PINNED.map((spec) => {
    const baseText = execFileSync("git", ["show", `${base}:${spec.file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
    return judge(spec, baseText, readFileSync(spec.file, "utf8"));
  });
  const declared = PINNED.reduce((n, { edits }) => n + edits.length, 0);
  const applied = results.reduce((n, result) => n + result.applied, 0);
  const reasons = results.flatMap((result) => result.reasons);
  if (allApplied && applied !== declared) reasons.push(`${applied} of ${declared} declared edits are applied, not all`);
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`pinned: ${PINNED.length} files hold their base text, ${applied} of ${declared} declared edits applied\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
