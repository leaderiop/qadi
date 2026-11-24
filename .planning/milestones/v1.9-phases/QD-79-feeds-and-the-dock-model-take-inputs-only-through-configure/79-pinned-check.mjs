// The check that the pinned tests moved by construction lines only.
//
// Each pinned test is cut out of its file at `phase_base` (the `phase_base:` line of `79-01-SUMMARY.md`) and as
// checked out. A helper call from `test/builtFeeds.ts` (`timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf`,
// `dockModelOf`) is mapped back to the constructor it wraps, and the two texts must then be equal: a test may be
// built another way, and not asserted another way. A pinned test missing from either side fails.
//
// From the repository root:
//   node .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-pinned-check.mjs
//   node .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-pinned-check.mjs --self-test
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const DIR = ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure";
const TEST_DIR = "packages/devtools/test/model";

const PINNED = [
  { file: `${TEST_DIR}/TimelineFeed.test.ts`, labels: ["TF4", "TF14", "TF26", "TF27", "TF29", "TF30", "TF31", "TF32", "TF33", "TF34", "TF35", "TF36"] },
  { file: `${TEST_DIR}/GatesFeed.test.ts`, labels: ["G43"] },
  { file: `${TEST_DIR}/DockModel.test.ts`, labels: ["M55", "M56"] },
];

const HELPERS = [
  ["timelineFeedOf", "makeTimelineFeed"],
  ["diagnosticsFeedOf", "makeDiagnosticsFeed"],
  ["gatesFeedOf", "makeGatesFeed"],
  ["dockModelOf", "makeDockModel"],
];

const opensTest = (line, label) => {
  const m = /^ {2}it(?:\.effect)?\("([^"]*)/.exec(line);
  return m !== null && m[1].startsWith(label) && /^[ :(]/.test(m[1].slice(label.length));
};
const endsBlock = (line) => /^ {2}(?:it|describe)[.(]/.test(line) || line.startsWith("});");

/** The block of the test the label opens, or `undefined` when the label opens none or two. */
export const blockOf = (text, label) => {
  const lines = text.split("\n");
  const starts = lines.flatMap((line, i) => (opensTest(line, label) ? [i] : []));
  if (starts.length !== 1) return undefined;
  const from = starts[0];
  let to = from + 1;
  while (to < lines.length && !endsBlock(lines[to])) to += 1;
  return lines.slice(from, to).join("\n");
};

const unhelped = (block) => HELPERS.reduce((text, [helper, make]) => text.split(`${helper}(`).join(`${make}(`), block);

/** The reasons the current block is not the base block once helpers are mapped back; empty when equal. */
export const judge = (baseText, currentText, label) => {
  const base = blockOf(baseText, label);
  if (base === undefined) return [`${label}: not exactly one test opens with this label at the base`];
  const current = blockOf(currentText, label);
  if (current === undefined) return [`${label}: not exactly one test opens with this label as checked out`];
  return unhelped(current) === unhelped(base) ? [] : [`${label}: an assertion or a line other than a construction changed`];
};

const planted = (body) => `describe("x", () => {\n  it.effect("TF4 a case", () =>\n    Effect.gen(function* () {\n${body}\n    }));\n\n  it("TF5 next", () => {});\n});\n`;

const selfTest = () => {
  const base = planted("      const feed = yield* makeTimelineFeed({ capacity: 2 });\n      assert.strictEqual(feed.size(), 2);");
  const cases = [
    [
      "a constructor that became its helper passes",
      judge(base, planted("      const feed = yield* timelineFeedOf({ capacity: 2 });\n      assert.strictEqual(feed.size(), 2);"), "TF4").length === 0,
    ],
    [
      "an edited assertion fails, naming the test",
      judge(base, planted("      const feed = yield* timelineFeedOf({ capacity: 2 });\n      assert.strictEqual(feed.size(), 3);"), "TF4").some((r) => r.startsWith("TF4:")),
    ],
    ["a missing pinned test fails", judge(base, planted("").replace("TF4 a case", "TF40 a case"), "TF4").length === 1],
  ];
  const failed = cases.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length > 0) {
    process.stderr.write(`self-test failed: ${failed.join("; ")}\n`);
    process.exit(1);
  }
  process.stdout.write(`self-test: ${cases.length} passed\n`);
};

const run = () => {
  const summary = readFileSync(`${DIR}/79-01-SUMMARY.md`, "utf8");
  const base = /^phase_base: ([0-9a-f]{40})$/m.exec(summary)?.[1];
  if (base === undefined) {
    process.stderr.write("phase_base is not recorded in 79-01-SUMMARY.md\n");
    process.exit(1);
  }
  const reasons = PINNED.flatMap(({ file, labels }) => {
    const baseText = execFileSync("git", ["show", `${base}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26 });
    const currentText = readFileSync(file, "utf8");
    return labels.flatMap((label) => judge(baseText, currentText, label).map((reason) => `${file}: ${reason}`));
  });
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  const count = PINNED.reduce((n, { labels }) => n + labels.length, 0);
  process.stdout.write(`pinned: ${count} tests hold their assertions\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run();
