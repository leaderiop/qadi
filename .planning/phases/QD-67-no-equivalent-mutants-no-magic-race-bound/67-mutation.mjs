// The phase's mutation record. `record base|close` reads the core Stryker report of the three single-flight files and
// writes each file's counts and its open (Survived, NoCoverage) and Ignored mutants; `evidence <report>` reads an
// ignoreStatic:false report of the two files whose code changes. `compare` fails when a file's score fell below its
// base or its floor, when the close leaves any mutant open, when a file has an open mutant the base did not have, when
// a mutant Ignored at the close and not at the base is not Killed in the evidence run, or when the evidence run leaves
// open a mutant on a line the phase wrote. Phase 66's scorer, with two changes: a mutant is located by its line number
// carried through `git diff -U0 <base head> <close head>`, never by the text of its line, and every comparison counts
// mutants as a multiset, so a second copy of one is a new one. `record` and `evidence` refuse a tree where a file they
// read differs from HEAD. `--self-test` drives the comparison with planted records. From the repository root, after the run
// INVOCATION names (stdin closed, nothing else running):
//   node .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs record base
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/";
const CONFIG = "stryker.config.mjs";
const REPORT = "reports/mutation/mutation.json";
const C = "packages/core/src/";
const FILES = [`${C}DecisionCache.ts`, `${C}Lifecycle.ts`, `${C}SharedComputation.ts`];
const CHANGED = [`${C}DecisionCache.ts`, `${C}SharedComputation.ts`];
// Phase 61's scores, as the fractions it measured (42/43 and 70/71 round to 0.977 and 0.986).
const FLOORS = { [`${C}DecisionCache.ts`]: [42, 43], [`${C}Lifecycle.ts`]: [42, 42], [`${C}SharedComputation.ts`]: [70, 71] };
const INVOCATION = `pnpm exec stryker run ${CONFIG} --mutate ${FILES.join(",")}`;
const EVIDENCE_INVOCATION = `pnpm exec stryker run <S>/stryker67-static.config.mjs --mutate ${CHANGED.join(",")}`;
const DETECTED = new Set(["Killed", "Timeout"]);
const OPEN = new Set(["Survived", "NoCoverage"]);

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });

/** Why a record may not be made: a file it reads differs from HEAD, so its line numbers belong to no commit. */
export const dirtyReasons = (porcelain) => (porcelain.trim() === "" ? [] : [`record from a clean tree; these differ from HEAD:\n${porcelain.trimEnd()}`]);
const refuseDirty = () => {
  const bad = dirtyReasons(git("status", "--porcelain", "--", ...FILES));
  if (bad.length > 0) fail(bad);
};

/** The hunks of a `git diff -U0` of one file: removed base lines [a, a+b) and added close lines [c, c+d). */
export const hunks = (diffText) =>
  diffText
    .split("\n")
    .map((line) => /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line))
    .filter((m) => m !== null)
    .map((m) => ({ a: Number(m[1]), b: m[2] === undefined ? 1 : Number(m[2]), c: Number(m[3]), d: m[4] === undefined ? 1 : Number(m[4]) }));

/** The close line numbers the diff adds: the lines the phase wrote. */
export const writtenLines = (diffText) => {
  const out = new Set();
  for (const { c, d } of hunks(diffText)) for (let i = 0; i < d; i++) out.add(c + i);
  return out;
};

/** A base line's number in the close file, or undefined when the diff removed or rewrote it. */
export const mapLine = (diffText) => {
  const hs = hunks(diffText);
  return (line) => {
    let offset = 0;
    for (const { a, b, d } of hs) {
      if (b > 0 && line >= a && line < a + b) return undefined;
      if (b > 0 ? line >= a + b : line > a) offset += d - b;
      else break;
    }
    return line + offset;
  };
};

const key = (m, line = m.line, status = m.status) => [status, m.mutator, m.replacement, line, m.column].join("\u0000");
/** A multiset of mutant keys: key -> count. */
const bag = (mutants, toKey) => {
  const out = new Map();
  for (const m of mutants) {
    const k = toKey(m);
    if (k !== undefined) out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
};
/** The mutants of `mutants` beyond what `allowed` holds, copy by copy. */
const beyond = (mutants, toKey, allowed) => {
  const left = new Map(allowed);
  return mutants.filter((m) => {
    const k = toKey(m);
    const n = left.get(k) ?? 0;
    if (n > 0) {
      left.set(k, n - 1);
      return false;
    }
    return true;
  });
};

/** Each file's counts and its non-Killed mutants from a Stryker JSON report holding exactly `files`. */
const tally = (reportFile, files) => {
  const report = {};
  for (const [file, entry] of Object.entries(readJson(reportFile).files)) {
    report[isAbsolute(file) ? relative(process.cwd(), file) : file] = entry;
  }
  const held = Object.keys(report).sort().join(",");
  if (held !== [...files].sort().join(",")) fail([`${reportFile} holds ${held}, not exactly ${files.join(",")}`]);
  const out = {};
  for (const file of files) {
    if (report[file].source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    const lines = report[file].source.split("\n");
    const all = report[file].mutants.map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column, text: lines[m.location.start.line - 1].trim() }));
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status));
    const valid = detected + open.length;
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid, open, ignoredMutants: all.filter((m) => m.status === "Ignored"), detectedMutants: all.filter((m) => DETECTED.has(m.status)) };
    console.log(`${file} ${detected}/${valid} ignored ${out[file].ignored}`);
    for (const m of open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/** Every reason the close fails, given the three records and each file's `git diff -U0 <base head> <close head>`. Pure. */
export const judge = ({ base, close, proof, diffs }, log = console.log) => {
  const bad = [];
  for (const file of FILES) {
    const b = base.files[file];
    const c = close.files[file];
    if (b === undefined || c === undefined) {
      bad.push(`${file} is missing from a record`);
      continue;
    }
    const diff = diffs[file] ?? "";
    const toClose = mapLine(diff);
    // Integer cross-multiplication, so no rounded float decides whether a score fell.
    if (c.detected * b.valid < b.detected * c.valid) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    const [fd, fv] = FLOORS[file];
    if (c.detected * fv < fd * c.valid) bad.push(`${file} scored ${c.detected}/${c.valid}, below its floor ${fd}/${fv}`);
    for (const m of c.open) bad.push(`${file}:${m.line} leaves a mutant open at the close: ${m.status} ${m.mutator} -> ${m.replacement}`);
    const known = bag(b.open, (m) => {
      const line = toClose(m.line);
      return line === undefined ? undefined : key(m, line);
    });
    for (const m of beyond(c.open, (m) => key(m), known)) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    const wasIgnored = bag(b.ignoredMutants, (m) => {
      const line = toClose(m.line);
      return line === undefined ? undefined : key(m, line);
    });
    const fresh = beyond(c.ignoredMutants, (m) => key(m), wasIgnored);
    const killed = bag(proof.files[file]?.detectedMutants ?? [], (m) => key(m, m.line, "Killed"));
    for (const m of beyond(fresh, (m) => key(m, m.line, "Killed"), killed)) bad.push(`${file}:${m.line} has a new Ignored mutant the evidence run did not kill: ${m.mutator} -> ${m.replacement}`);
    log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, ignored ${b.ignored} -> ${c.ignored} (${fresh.length} new)`);
  }
  for (const file of CHANGED) {
    const p = proof.files[file];
    if (p === undefined) {
      bad.push(`${file} is missing from the evidence record`);
      continue;
    }
    const written = writtenLines(diffs[file] ?? "");
    for (const m of p.open.filter((x) => written.has(x.line))) bad.push(`${file}:${m.line} leaves open a mutant on a line the phase wrote: ${m.status} ${m.mutator} -> ${m.replacement}`);
    log(`${file} with static mutants scored ${p.detected}/${p.valid}`);
  }
  return bad;
};

const record = async (name) => {
  refuseDirty();
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const files = tally(REPORT, FILES);
  for (const file of FILES) delete files[file].detectedMutants;
  const out = `${D}67-mutation-${name}.json`;
  writeFileSync(out, `${JSON.stringify({ phase: "67", head: git("rev-parse", "HEAD").trim(), invocation: INVOCATION, files }, null, 1)}\n`);
  console.log(`wrote ${out}`);
};

const evidence = (reportFile) => {
  if (reportFile === undefined) fail(["usage: node 67-mutation.mjs evidence <the ignoreStatic:false report>"]);
  refuseDirty();
  if (resolve(reportFile) === resolve(REPORT)) fail([`${reportFile} is the gate run's report; the evidence is the second run's`]);
  const files = tally(reportFile, CHANGED);
  for (const file of CHANGED) if (files[file].ignored !== 0) fail([`${reportFile} ignored ${files[file].ignored} mutants of ${file}: not an ignoreStatic:false run`]);
  const out = `${D}67-mutation-static.json`;
  writeFileSync(out, `${JSON.stringify({ phase: "67", head: git("rev-parse", "HEAD").trim(), invocation: EVIDENCE_INVOCATION, files }, null, 1)}\n`);
  console.log(`wrote ${out}`);
};

const compare = () => {
  const base = readJson(`${D}67-mutation-base.json`);
  const close = readJson(`${D}67-mutation-close.json`);
  const proof = readJson(`${D}67-mutation-static.json`);
  const bad = [];
  if (base.invocation !== INVOCATION || close.invocation !== INVOCATION) bad.push("a record was not made by the recorded invocation");
  if (proof.invocation !== EVIDENCE_INVOCATION || proof.head !== close.head) bad.push("the evidence record is not of the close tree, or not of the recorded invocation");
  const diffs = Object.fromEntries(FILES.map((file) => [file, git("diff", "-U0", base.head, close.head, "--", file)]));
  bad.push(...judge({ base, close, proof, diffs }));
  if (bad.length > 0) fail(bad);
  console.log("no file's score fell below its base or floor, the close leaves no mutant open, and no mutant on a line the phase wrote is left open");
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, text: "});", ...extra });
  const file = (detected, valid, open = [], ignoredMutants = [], detectedMutants = []) => ({ detected, valid, open, ignored: ignoredMutants.length, ignoredMutants, detectedMutants });
  const DC = `${C}DecisionCache.ts`;
  const LC = `${C}Lifecycle.ts`;
  const SC = `${C}SharedComputation.ts`;
  // Base: one survivor on line 10 of each changed file, a static mutant Ignored on line 3; the close rewrote lines
  // 9 to 11 into 9 to 10 and added nothing above line 3, so line 3 stays line 3 and line 20 becomes line 19.
  const diff = "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n";
  const base = { files: { [DC]: file(42, 43, [m("Survived", 10)], [m("Ignored", 3)]), [LC]: file(42, 42), [SC]: file(70, 71, [m("Survived", 10)], [m("Ignored", 3)]) } };
  const closeOf = (dc = {}, sc = {}) => ({ files: { [DC]: file(42, 42, [], [m("Ignored", 3)], []), [LC]: file(42, 42), [SC]: file(71, 71, [], [m("Ignored", 3)], []), ...dc, ...sc } });
  const proofOf = (dcOpen = [], scOpen = [], killed = []) => ({ files: { [DC]: file(43, 43 + dcOpen.length, dcOpen, [], killed), [SC]: file(72, 72 + scOpen.length, scOpen, [], killed) } });
  const diffs = { [DC]: diff, [LC]: "", [SC]: diff };
  const cases = [
    ["a clean close passes", { base, close: closeOf(), proof: proofOf(), diffs }, 0],
    ["a static survivor on an unchanged line passes in the evidence", { base, close: closeOf(), proof: proofOf([m("Survived", 3)]), diffs }, 0],
    ["a static survivor on a line moved by the diff passes in the evidence", { base, close: closeOf(), proof: proofOf([m("Survived", 19)]), diffs }, 0],
    ["an evidence survivor on a written line whose text is a base line's fails", { base, close: closeOf(), proof: proofOf([m("Survived", 10, { text: "});" })]), diffs }, 1],
    ["a survivor left open at the close fails", { base, close: closeOf({ [DC]: file(42, 43, [m("Survived", 9)], [m("Ignored", 3)]) }), proof: proofOf(), diffs }, 2],
    ["a second copy of a base Ignored mutant the evidence did not kill fails", { base, close: closeOf({ [DC]: file(42, 42, [], [m("Ignored", 3), m("Ignored", 3)]) }), proof: proofOf(), diffs }, 1],
    ["a second copy of a base Ignored mutant the evidence killed passes", { base, close: closeOf({ [DC]: file(42, 42, [], [m("Ignored", 3), m("Ignored", 3)]) }), proof: proofOf([], [], [m("Killed", 3)]), diffs }, 0],
    ["a score below the floor fails", { base: { files: { ...base.files, [LC]: file(41, 42) } }, close: closeOf({ [LC]: file(41, 42) }), proof: proofOf(), diffs }, 1],
    ["a score below the base fails", { base, close: closeOf({ [SC]: file(70, 72, [], [m("Ignored", 3)]) }), proof: proofOf(), diffs }, 2],
    ["a new Ignored mutant on a written line the evidence did not kill fails", { base, close: closeOf({ [SC]: file(71, 71, [], [m("Ignored", 3), m("Ignored", 9)]) }), proof: proofOf(), diffs }, 1],
  ];
  let passed = 0;
  const planted = ` M ${DC}\n`;
  if (dirtyReasons(planted).length !== 1 || !dirtyReasons(planted)[0].includes(DC) || dirtyReasons("").length !== 0) fail(["self-test FAILED: a modified file does not refuse a record"]);
  passed++;
  for (const [name, input, want] of cases) {
    const got = judge(input, () => {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  console.log(`self-test: ${passed} passed`);
};

const [mode, name] = process.argv.slice(2);
if (mode === "record" && (name === "base" || name === "close")) await record(name);
else if (mode === "evidence") evidence(name);
else if (mode === "compare") compare();
else if (mode === "--self-test") selfTest();
else fail(["usage: node 67-mutation.mjs record base|close, evidence <report>, compare, or --self-test"]);
