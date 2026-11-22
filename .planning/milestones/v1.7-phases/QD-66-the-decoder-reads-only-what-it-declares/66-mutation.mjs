// The phase's mutation record. `record base|close` reads the core Stryker report of the three untrusted-decode files
// and writes each file's counts and its open (Survived, NoCoverage) and Ignored mutants; `evidence <report>` reads an
// ignoreStatic:false report of the two files whose code changes. `compare` fails when a file's score fell, when a file
// has an open mutant the base did not have, when a mutant Ignored at the close and not at the base is not Killed in
// the evidence run, or when the evidence run leaves open a mutant on a line the phase wrote. A mutant is matched by
// status, mutator, replacement and its line number carried through `git diff -U0 <base head> <close head>`, never by
// the text of its line, and every comparison counts mutants as a multiset, so a second copy of one is a new one
// (Phase 66 review IN-03, ported from Phase 67's scorer by Phase 68, OI-23). From the repository root, after the run
// INVOCATION names (stdin closed, nothing else running):
//   node .planning/phases/QD-66-the-decoder-reads-only-what-it-declares/66-mutation.mjs record base
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-66-the-decoder-reads-only-what-it-declares/";
const CONFIG = "stryker.config.mjs";
const REPORT = "reports/mutation/mutation.json";
const C = "packages/core/src/";
const FILES = [`${C}EnvelopeKeys.ts`, `${C}SinkCodec.ts`, `${C}UntrustedDecode.ts`];
const CHANGED = [`${C}EnvelopeKeys.ts`, `${C}UntrustedDecode.ts`];
const INVOCATION = `pnpm exec stryker run ${CONFIG} --mutate ${FILES.join(",")}`;
const EVIDENCE_INVOCATION = `pnpm exec stryker run <S>/stryker66-static.config.mjs --mutate ${CHANGED.join(",")}`;
const DETECTED = new Set(["Killed", "Timeout"]);
const OPEN = new Set(["Survived", "NoCoverage"]);

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });
/** The hunks of a `git diff -U0` of one file: removed base lines [a, a+b) and added close lines [c, c+d). */
const hunks = (diffText) =>
  diffText
    .split("\n")
    .map((line) => /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line))
    .filter((m) => m !== null)
    .map((m) => ({ a: Number(m[1]), b: m[2] === undefined ? 1 : Number(m[2]), c: Number(m[3]), d: m[4] === undefined ? 1 : Number(m[4]) }));
/** The close line numbers the diff adds: the lines the phase wrote. */
const writtenLines = (diffText) => {
  const out = new Set();
  for (const { c, d } of hunks(diffText)) for (let i = 0; i < d; i++) out.add(c + i);
  return out;
};
/** A base line's number in the close file, or undefined when the diff removed or rewrote it. */
const mapLine = (diffText) => {
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
const key = (m, line = m.line, status = m.status) => [status, m.mutator, m.replacement, line].join("\u0000");
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
    const all = report[file].mutants.map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, text: lines[m.location.start.line - 1].trim() }));
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

const record = async (name) => {
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const files = tally(REPORT, FILES);
  for (const file of FILES) delete files[file].detectedMutants;
  const out = `${D}66-mutation-${name}.json`;
  writeFileSync(out, `${JSON.stringify({ phase: "66", head: git("rev-parse", "HEAD").trim(), invocation: INVOCATION, files }, null, 1)}\n`);
  console.log(`wrote ${out}`);
};

const evidence = (reportFile) => {
  if (reportFile === undefined) fail(["usage: node 66-mutation.mjs evidence <the ignoreStatic:false report>"]);
  if (resolve(reportFile) === resolve(REPORT)) fail([`${reportFile} is the gate run's report; the evidence is the second run's`]);
  const files = tally(reportFile, CHANGED);
  for (const file of CHANGED) if (files[file].ignored !== 0) fail([`${reportFile} ignored ${files[file].ignored} mutants of ${file}: not an ignoreStatic:false run`]);
  const out = `${D}66-mutation-static.json`;
  writeFileSync(out, `${JSON.stringify({ phase: "66", head: git("rev-parse", "HEAD").trim(), invocation: EVIDENCE_INVOCATION, files }, null, 1)}\n`);
  console.log(`wrote ${out}`);
};

const compare = () => {
  const base = readJson(`${D}66-mutation-base.json`);
  const close = readJson(`${D}66-mutation-close.json`);
  const proof = readJson(`${D}66-mutation-static.json`);
  const bad = [];
  if (base.invocation !== INVOCATION || close.invocation !== INVOCATION) bad.push("a record was not made by the recorded invocation");
  if (proof.invocation !== EVIDENCE_INVOCATION || proof.head !== close.head) bad.push("the evidence record is not of the close tree, or not of the recorded invocation");
  for (const file of FILES) {
    const b = base.files[file];
    const c = close.files[file];
    if (b === undefined || c === undefined) {
      bad.push(`${file} is missing from a record`);
      continue;
    }
    // Integer cross-multiplication, so no rounded float decides whether a score fell.
    if (c.detected * b.valid < b.detected * c.valid) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    const map = mapLine(git("diff", "-U0", base.head, close.head, "--", file));
    const atBase = (x) => {
      const line = map(x.line);
      return line === undefined ? undefined : key(x, line);
    };
    for (const m of beyond(c.open, (x) => key(x), bag(b.open, atBase))) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    const fresh = beyond(c.ignoredMutants, (x) => key(x), bag(b.ignoredMutants, atBase));
    const killed = bag(proof.files[file]?.detectedMutants ?? [], (x) => key(x, x.line, "Killed"));
    for (const m of beyond(fresh, (x) => key(x, x.line, "Killed"), killed)) bad.push(`${file}:${m.line} has a new Ignored mutant the evidence run did not kill: ${m.mutator} -> ${m.replacement}`);
    console.log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, ignored ${b.ignored} -> ${c.ignored} (${fresh.length} new)`);
  }
  for (const file of CHANGED) {
    const p = proof.files[file];
    if (p === undefined) {
      bad.push(`${file} is missing from the evidence record`);
      continue;
    }
    const written = writtenLines(git("diff", "-U0", base.head, close.head, "--", file));
    for (const m of p.open.filter((x) => written.has(x.line))) bad.push(`${file}:${m.line} leaves open a mutant on a line the phase wrote: ${m.status} ${m.mutator} -> ${m.replacement}`);
    console.log(`${file} with static mutants scored ${p.detected}/${p.valid}`);
  }
  if (bad.length > 0) fail(bad);
  console.log("no touched file's score fell, and no mutant on a line the phase wrote is left open");
};

const [mode, name] = process.argv.slice(2);
if (mode === "record" && (name === "base" || name === "close")) await record(name);
else if (mode === "evidence") evidence(name);
else if (mode === "compare") compare();
else fail(["usage: node 66-mutation.mjs record base|close, evidence <report>, or compare"]);
