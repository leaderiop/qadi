// The check that every existing devtools test, and the hook that configures a built store, keep their text, apart from two
// declared files.
//
// Each file is compared with its text at `phase_base` (the field of `87-mutation-base.json` in this directory). Three kinds:
//   held      every path `git ls-tree -r --name-only <phase_base> -- packages/devtools/test` lists, except the two declared files,
//             and `packages/devtools/src/react/useConfigured.ts`, byte for byte, line endings included. The set is computed from
//             the base and never listed here, so a test the base holds cannot be left out by omission.
//   declared  two files, each changed only where the phase says it changes them. `test/builtFeeds.ts` builds a feed and then
//             configures it four times over, and the phase collapses the four copies into one helper: any text passes that
//             still declares its four exports. `test/model/SupersedingRun.test.ts` loses the failure-hook halves of five rows
//             and of the property, which are re-homed in the new module's own tests: it is held outside six declared regions,
//             and the property region must keep every line that states a law other than the heard one. A region runs from a line
//             starting with its `from` text (inclusive) to the line starting with its `to` text (exclusive); each anchor occurs
//             once at the base, and the text between regions is held byte for byte and found in order.
//   born      five files written before the change they pin, each held byte for byte against the one commit that adds it; two
//             adding commits fail, and a file with no adding commit passes plain and fails `--all-applied`.
// A held or declared file that `git diff -M --name-status <phase_base>` reports as anything but added (moved, deleted, changed)
// is judged by its text, and a moved or deleted one fails, naming both paths for a move. A file added under the test directory
// is not held: new tests are the phase's own.
//
// From the repository root:
//   node <this directory>/87-pinned-check.mjs
//   node <this file> --all-applied   (also requires both declared edits applied and every born file added)
//   node <this file> --self-test
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = "packages/devtools/test";
const HOOK = "packages/devtools/src/react/useConfigured.ts";
const BUILT = `${TEST_DIR}/builtFeeds.ts`;
const SUPERSEDING = `${TEST_DIR}/model/SupersedingRun.test.ts`;

/** Files held byte for byte against the one commit that added each. */
const BORN = [
  `${TEST_DIR}/model/SimulationSession.stop.test.ts`,
  `${TEST_DIR}/model/TimelineFeed.stop.test.ts`,
  `${TEST_DIR}/model/DiagnosticsFeed.stop.test.ts`,
  `${TEST_DIR}/model/StatedRun.characterisation.test.ts`,
  `${TEST_DIR}/react/Simulator.broke.test.tsx`,
];

/** The text that must stay the lines of a region: every law but the heard one. A line is kept by its trimmed text. */
const KEPT_LAWS = ['"law 1:', '"law 2:', '"law 3:', '"law 4:', '"law 6:', "law 7: nothing starts after close", "law 7: nothing lands after close"];

/** The regions of `SupersedingRun.test.ts`, in file order. `from: null` is the file start and `to: null` its end. */
const SUPERSEDING_REGIONS = [
  { name: "head", from: null, to: "const body = (log" },
  { name: "listener", from: "/** What `onFailure` heard", to: "/** Lets every fiber reach" },
  { name: "R3", from: '  it.effect("R3 ', to: '  it.effect("R4 ' },
  { name: "R5toR7", from: '  it.effect("R5 ', to: '  it.effect("R8 ' },
  { name: "R9", from: '  it.effect("R9 ', to: '  it.effect("R10 ' },
  { name: "property", from: 'describe("PROPERTY:', to: null, kept: KEPT_LAWS },
];

/** What a declared edit leaves out of the file once it is made: `ForkHooks` and `onFailure` here, one `Effect.tap(` there. */
const SUPERSEDING_APPLIED = (base, current) => current !== base && !current.includes("ForkHooks") && !current.includes("onFailure");
const BUILT_APPLIED = (base, current) => current !== base && current.split("Effect.tap(").length - 1 === 1;
const BUILT_EXPORTS = ["timelineFeedOf", "diagnosticsFeedOf", "gatesFeedOf", "dockModelOf"].map((name) => `export const ${name}`);

const DECLARED = [
  { file: BUILT, regions: undefined, exports: BUILT_EXPORTS, applied: BUILT_APPLIED },
  { file: SUPERSEDING, regions: SUPERSEDING_REGIONS, exports: [], applied: SUPERSEDING_APPLIED },
];

/** The 1-based number of the first line two texts disagree on, or 0 when they do not. */
const firstDifference = (a, b) => {
  const x = a.split("\n");
  const y = b.split("\n");
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i += 1) if (x[i] !== y[i]) return i + 1;
  return 0;
};

/** The held paths: what `git ls-tree` prints for the test directory at the base, less the declared files, and the hook. Pure. */
const heldFrom = (lsTree, declared) => [...lsTree.split("\n").filter((line) => line !== "" && !declared.includes(line)), HOOK];

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

/** The watched files that `git diff -M --name-status` reports as moved or deleted, each with its reason. Pure. */
const judgeMoves = (files, statusText) =>
  statusText
    .split("\n")
    .map((line) => line.split("\t"))
    .flatMap(([status, from, to]) => {
      if (status === undefined || !files.includes(from)) return [];
      if (status.startsWith("R")) return [{ file: from, reason: `${from} moved to ${to}` }];
      return status === "D" ? [{ file: from, reason: `${from} was deleted` }] : [];
    });

/** The reasons a whole declared file no longer declares an export it must keep. */
const judgeExports = (file, exports, current) => exports.filter((text) => !current.includes(text)).map((text) => `${file}: no longer declares \`${text}\``);

/** The indexes of the lines of `lines` that start with `text`. */
const startingWith = (lines, text) => lines.flatMap((line, i) => (line.startsWith(text) ? [i] : []));

const countOf = (lines, text) => lines.filter((line) => line === text).length;

/**
 * The reasons `current` is not `base` outside the declared regions, and how many lines of a region's own text are kept.
 *
 * Each region's anchor lines occur once at the base and in order; the text between two regions is held, found in order in
 * `current`; and a region with `kept` text keeps each line holding it, by trimmed text and at least as many times as the base
 * has it. Pure.
 */
const judgeRegions = (file, regions, base, current) => {
  const reasons = [];
  const B = base.split("\n");
  const C = current.split("\n");
  const bounds = [];
  for (const region of regions) {
    const anchor = (text) => {
      const found = startingWith(B, text);
      if (found.length === 1) return found[0];
      reasons.push(`${file}: the region ${region.name} anchor ${JSON.stringify(text)} occurs ${found.length} times at the base, not once`);
      return undefined;
    };
    const s = region.from === null ? 0 : anchor(region.from);
    const e = region.to === null ? B.length : anchor(region.to);
    if (s !== undefined && e !== undefined && s >= e) {
      reasons.push(`${file}: the region ${region.name} does not start before it ends at the base`);
      continue;
    }
    bounds.push({ region, s, e });
  }
  if (reasons.length > 0 || bounds.length !== regions.length) return reasons;
  for (let k = 1; k < bounds.length; k += 1) {
    if (bounds[k].s < bounds[k - 1].e) reasons.push(`${file}: the region ${bounds[k].region.name} overlaps the one before it at the base`);
  }
  if (reasons.length > 0) return reasons;

  // Where each region's own text lies in `current`: from the end of the held text before it to the start of the held text after.
  const lies = bounds.map(() => ({ from: 0, to: C.length }));
  let cursor = 0;
  for (let k = 1; k < bounds.length; k += 1) {
    const held = B.slice(bounds[k - 1].e, bounds[k].s);
    if (held.length === 0) {
      lies[k - 1].to = cursor;
      lies[k].from = cursor;
      continue;
    }
    const candidates = C.flatMap((line, i) => (i >= cursor && line === held[0] ? [i] : []));
    const fits = candidates.find((j) => held.every((line, t) => C[j + t] === line));
    if (fits === undefined) {
      const at = candidates[0];
      const where = at === undefined ? `the line ${bounds[k - 1].e + 1} of the base, ${JSON.stringify(held[0].slice(0, 60))}, is missing or changed` : `at line ${at + 1 + held.findIndex((line, t) => C[at + t] !== line)}`;
      reasons.push(`${file}: differs from its base text between the regions ${bounds[k - 1].region.name} and ${bounds[k].region.name}, ${where}`);
      return reasons;
    }
    lies[k - 1].to = fits;
    lies[k].from = fits + held.length;
    cursor = fits + held.length;
  }
  const tail = B.slice(bounds[bounds.length - 1].e);
  if (tail.length > 0) {
    const at = C.length - tail.length;
    if (at < cursor || tail.some((line, t) => C[at + t] !== line)) {
      reasons.push(`${file}: differs from its base text after the region ${bounds[bounds.length - 1].region.name}, at line ${Math.max(at, 0) + 1 + Math.max(tail.findIndex((line, t) => C[at + t] !== line), 0)}`);
      return reasons;
    }
    lies[lies.length - 1].to = at;
  }

  bounds.forEach(({ region, s, e }, k) => {
    if (region.kept === undefined) return;
    const own = B.slice(s, e);
    const mine = C.slice(lies[k].from, lies[k].to).map((line) => line.trim());
    for (const text of region.kept) {
      const lines = own.filter((line) => line.includes(text));
      if (lines.length === 0) reasons.push(`${file}: the kept text ${JSON.stringify(text)} does not occur in the region ${region.name} at the base`);
      for (const line of new Set(lines.map((l) => l.trim()))) {
        const had = own.filter((l) => l.trim() === line).length;
        if (countOf(mine, line) < had) reasons.push(`${file}: the region ${region.name} dropped a kept line: ${line}`);
      }
    }
  });
  return reasons;
};

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
  const held = heldFrom(`${TEST_DIR}/a.test.ts\n${BUILT}\n${SUPERSEDING}\n${TEST_DIR}/support/b.ts\n`, [BUILT, SUPERSEDING]);

  // A small file with the shape of the real one: a head, a listener, a held middle, a free row, a held row, the property.
  const regions = [
    { name: "head", from: null, to: "const body" },
    { name: "listener", from: "/** heard", to: "/** elapse" },
    { name: "row", from: '  it("R3 ', to: '  it("R4 ' },
    { name: "property", from: "describe(\"P", to: null, kept: ['"law 1:', "law 7: after"] },
  ];
  const text = [
    "import a from 'a';",
    "const body = 1;",
    "/** heard */",
    "const listener = 1;",
    "/** elapse */",
    "const elapse = 2;",
    "describe('rows', () => {",
    '  it("R3 old", () => {',
    "    heard();",
    "  });",
    '  it("R4 held", () => {});',
    "});",
    'describe("P", () => {',
    '  check("law 1: one");',
    '  check("law 5: heard");',
    '  check("law 7: after");',
    "});",
    "",
  ].join("\n");
  const edit = (from, to) => text.replace(from, to);
  const inRegions = edit("import a from 'a';", "import b from 'b';")
    .replace("const listener = 1;", "const listener = 2;\nconst extra = 3;")
    .replace("    heard();", "    other();")
    .replace('  check("law 5: heard");\n', "");
  const spaced = edit('  check("law 1: one");', '      check("law 1: one");');
  const between = edit("const elapse = 2;", "const elapse = 3;");
  const rowHeld = edit('  it("R4 held", () => {});', '  it("R4 held", () => {}); ');
  const dropped = edit('  check("law 1: one");\n', "");
  const droppedSeven = edit('  check("law 7: after");\n', "");
  const doubled = `${text}${text}`;
  const noFrom = judgeRegions("d.test.ts", regions.map((r) => (r.name === "row" ? { ...r, from: '  it("R9 ' } : r)), text, text);
  const twice = judgeRegions("d.test.ts", regions.map((r) => (r.name === "head" ? { ...r, to: "const " } : r)), text, text);
  const noKept = judgeRegions("d.test.ts", regions.map((r) => (r.name === "property" ? { ...r, kept: ["law 9:"] } : r)), text, text);
  const reversed = judgeRegions("d.test.ts", [regions[0], { ...regions[2], from: '  it("R4 ', to: '  it("R3 ' }], text, text);
  const tailed = judgeRegions("d.test.ts", [{ name: "head", from: null, to: "const elapse" }, { name: "end", from: "describe('rows'", to: "describe(\"P" }], text, text);
  const tailChanged = judgeRegions("d.test.ts", [{ name: "head", from: null, to: "const elapse" }, { name: "end", from: "describe('rows'", to: "describe(\"P" }], text, text.replace("  check(\"law 7: after\");", "  check(\"law 7: later\");"));
  const reasons = (current) => judgeRegions("d.test.ts", regions, text, current);
  const built = "export const timelineFeedOf = 1;\nexport const diagnosticsFeedOf = 2;\nexport const gatesFeedOf = 3;\nexport const dockModelOf = 4;\n";
  const cases = [
    ["a held file that equals its base passes", equal.length === 0],
    ["a held file with one changed byte fails, naming the file and the line", byte.join() === "x.test.ts: differs from its base text at line 2"],
    ["a whitespace-only change in a held file fails", space.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a line-ending change in a held file fails", crlf.some((r) => r.startsWith("x.test.ts: differs"))],
    ["a held file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts")],
    ["a held file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted")],
    ["a file that was only modified or added is not reported", moves.length === 2],
    ["the held set is what the base lists less the declared files, and the hook", held.join() === `${TEST_DIR}/a.test.ts,${TEST_DIR}/support/b.ts,${HOOK}`],
    ["a born file equal to its adding commit passes", judgeBorn("b.ts", "t", "t", true).length === 0],
    ["a born file changed after its adding commit fails", judgeBorn("b.ts", first, second, false).join() === "b.ts: differs from the commit that added it at line 2"],
    ["a born file that is gone fails", judgeBorn("b.ts", "t", undefined, false).some((r) => r.includes("moved or deleted"))],
    ["an absent born file passes plain", judgeBorn("b.ts", undefined, undefined, false).length === 0],
    ["an absent born file fails when everything is applied", judgeBorn("b.ts", undefined, undefined, true).join() === "b.ts does not exist"],
    ["an uncommitted born file fails when everything is applied only", judgeBorn("b.ts", undefined, "t", false).length === 0 && judgeBorn("b.ts", undefined, "t", true).length === 1],
    ["a born file added by two commits fails", judgeAdders("b.ts", 2).join() === "b.ts: 2 commits add it, not one"],
    ["a born file added by one commit, or none, passes", judgeAdders("b.ts", 1).length === 0 && judgeAdders("b.ts", 0).length === 0],
    ["a declared file equal to its base passes", reasons(text).length === 0],
    ["a change inside the head, the listener, a row and the property passes", reasons(inRegions).length === 0],
    ["a kept line re-indented passes", reasons(spaced).length === 0],
    ["a change in the text between two regions fails, naming the line", reasons(between).some((r) => r.includes("between the regions listener and row, at line 6"))],
    ["a change in a held row between two regions fails", reasons(rowHeld).some((r) => r.includes("between the regions row and property"))],
    ["a dropped kept law line fails, naming it", reasons(dropped).join() === 'd.test.ts: the region property dropped a kept line: check("law 1: one");'],
    ["a dropped last kept line fails", reasons(droppedSeven).some((r) => r.includes("dropped a kept line") && r.includes("law 7: after"))],
    ["a region anchor that is missing at the base fails", noFrom.some((r) => r.includes("occurs 0 times at the base, not once"))],
    ["a region anchor that occurs twice at the base fails", twice.some((r) => r.includes("occurs 3 times at the base, not once"))],
    ["an anchor that occurs twice in a doubled base fails", judgeRegions("d.test.ts", regions, doubled, doubled).some((r) => r.includes("times at the base, not once"))],
    ["a kept text that does not occur at the base fails", noKept.some((r) => r.includes("does not occur in the region property at the base"))],
    ["a region that ends before it starts fails", reversed.some((r) => r.includes("does not start before it ends"))],
    ["a held tail after the last region is matched", tailed.length === 0 && tailChanged.some((r) => r.includes("after the region end"))],
    ["a declared whole file that keeps its four exports passes", judgeExports(BUILT, BUILT_EXPORTS, `${built}// more`).length === 0],
    ["a declared whole file that drops one export fails, naming it", judgeExports(BUILT, BUILT_EXPORTS, built.replace("gatesFeedOf", "gatesOf")).join() === `${BUILT}: no longer declares \`export const gatesFeedOf\``],
    ["a built feeds file with exactly one tap counts as applied", BUILT_APPLIED(built, `${built}x(Effect.tap(a));`) && !BUILT_APPLIED(built, built) && !BUILT_APPLIED(built, `${built}Effect.tap(a);Effect.tap(b);`)],
    ["a superseding file without the hooks counts as applied", SUPERSEDING_APPLIED("a ForkHooks onFailure", "a b") && !SUPERSEDING_APPLIED("a", "a") && !SUPERSEDING_APPLIED("a", "a onFailure")],
    ["the phase holds five born files and two declared files, each once", BORN.length === 5 && new Set(BORN).size === 5 && DECLARED.length === 2 && new Set(DECLARED.map((d) => d.file)).size === 2],
    ["the declared regions are named once and the property keeps seven texts", new Set(SUPERSEDING_REGIONS.map((r) => r.name)).size === 6 && KEPT_LAWS.length === 7],
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
const textOf = (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);

/** The phase base recorded beside this file, or a refusal. */
const baseOf = () => {
  try {
    const recorded = JSON.parse(readFileSync(join(DIR, "87-mutation-base.json"), "utf8")).phase_base;
    if (typeof recorded === "string" && recorded !== "") return recorded;
  } catch {
    // Falls through to the refusal below.
  }
  process.stderr.write("no phase_base recorded\n");
  process.exit(1);
};

const run = (allApplied) => {
  const base = baseOf();
  const reasons = [];
  const declared = DECLARED.map((d) => d.file);
  const held = heldFrom(git("ls-tree", "-r", "--name-only", base, "--", TEST_DIR), declared);
  if (held.length < 3) {
    process.stderr.write(`${base} lists no file under ${TEST_DIR}: the held set is empty\n`);
    process.exit(1);
  }
  const moves = judgeMoves([...held, ...declared, ...BORN], git("diff", "-M", "--name-status", base, "--", TEST_DIR, HOOK));
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));
  for (const file of held) {
    if (gone.has(file)) continue;
    const baseText = showAt(base, file);
    if (baseText === undefined) {
      reasons.push(`${file} does not exist at the base`);
      continue;
    }
    const current = textOf(file);
    if (current === undefined) {
      reasons.push(`${file} does not exist`);
      continue;
    }
    reasons.push(...judgeHeld(file, baseText, current));
  }
  let appliedCount = 0;
  for (const spec of DECLARED) {
    if (gone.has(spec.file)) continue;
    const baseText = showAt(base, spec.file);
    const current = textOf(spec.file);
    if (baseText === undefined || current === undefined) {
      reasons.push(`${spec.file} does not exist${baseText === undefined ? " at the base" : ""}`);
      continue;
    }
    const found = [...judgeExports(spec.file, spec.exports, current), ...(spec.regions === undefined ? [] : judgeRegions(spec.file, spec.regions, baseText, current))];
    reasons.push(...found);
    if (found.length === 0 && spec.applied(baseText, current)) appliedCount += 1;
    else if (allApplied && found.length === 0) reasons.push(`${spec.file}: its declared edit is not applied`);
  }
  let born = 0;
  for (const file of BORN) {
    const adders = nonEmpty(git("log", "--diff-filter=A", "--format=%H", `${base}..HEAD`, "--", file));
    const many = judgeAdders(file, adders.length);
    reasons.push(...many);
    if (many.length > 0) continue;
    const bornText = adders.length === 1 ? showAt(adders[0], file) : undefined;
    const found = judgeBorn(file, bornText, textOf(file), allApplied);
    reasons.push(...found);
    if (found.length === 0 && bornText !== undefined) born += 1;
  }
  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`pinned: ${held.length} files hold their base text, ${born} of ${BORN.length} born files held, ${appliedCount} of ${DECLARED.length} declared edits applied\n`);
};

if (process.argv.includes("--self-test")) selfTest();
else run(process.argv.includes("--all-applied"));
