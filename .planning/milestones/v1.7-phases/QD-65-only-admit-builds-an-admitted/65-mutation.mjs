// The phase's mutation record. `record base|close` reads the core Stryker report of the three admission files the
// phase touches or reads through and writes their counts and their surviving or uncovered mutants; `compare` fails
// when a file's score fell, when a file has a surviving or uncovered mutant the base did not have (same status,
// mutator, replacement and source line text), or when a file has more static-ignored mutants than at the base. From
// the repository root, after the run INVOCATION names (stdin closed, nothing else running):
//   node .planning/phases/QD-65-only-admit-builds-an-admitted/65-mutation.mjs record base
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-65-only-admit-builds-an-admitted/";
const CONFIG = "stryker.config.mjs";
const REPORT = "reports/mutation/mutation.json";
const C = "packages/core/src/";
const FILES = [`${C}Admission.ts`, `${C}Predicate.ts`, `${C}Walk.ts`];
const INVOCATION = `pnpm exec stryker run ${CONFIG} --mutate ${FILES.join(",")}`;

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const record = async (name) => {
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const report = {};
  for (const [file, entry] of Object.entries(readJson(REPORT).files)) {
    report[isAbsolute(file) ? relative(process.cwd(), file) : file] = entry;
  }
  const held = Object.keys(report).sort().join(",");
  if (held !== [...FILES].sort().join(",")) fail([`${REPORT} holds ${held}, not exactly the three files`]);
  const files = {};
  for (const file of FILES) {
    if (report[file].source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    const count = (status) => report[file].mutants.filter((m) => m.status === status).length;
    const killed = count("Killed");
    const timeout = count("Timeout");
    const survived = count("Survived");
    const noCoverage = count("NoCoverage");
    const ignored = count("Ignored");
    const detected = killed + timeout;
    const valid = detected + survived + noCoverage;
    const lines = report[file].source.split("\n");
    const open = report[file].mutants
      .filter((m) => m.status === "Survived" || m.status === "NoCoverage")
      .map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, text: lines[m.location.start.line - 1].trim() }));
    files[file] = { killed, timeout, survived, noCoverage, ignored, detected, valid, open };
    console.log(`${file} ${detected}/${valid} ignored ${ignored}`);
    for (const m of open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const out = `${D}65-mutation-${name}.json`;
  writeFileSync(out, `${JSON.stringify({ phase: "65", head, invocation: INVOCATION, files }, null, 1)}\n`);
  console.log(`wrote ${out}`);
};

const compare = () => {
  const base = readJson(`${D}65-mutation-base.json`);
  const close = readJson(`${D}65-mutation-close.json`);
  const bad = [];
  if (base.invocation !== INVOCATION || close.invocation !== INVOCATION) bad.push("a record was not made by the recorded invocation");
  const key = (m) => [m.status, m.mutator, m.replacement, m.text].join("\u0000");
  for (const file of FILES) {
    const b = base.files[file];
    const c = close.files[file];
    if (b === undefined || c === undefined) {
      bad.push(`${file} is missing from a record`);
      continue;
    }
    // Integer cross-multiplication, so no rounded float decides whether a score fell.
    if (c.detected * b.valid < b.detected * c.valid) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    const known = new Set(b.open.map(key));
    for (const m of c.open.filter((x) => !known.has(key(x)))) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    if (c.ignored > b.ignored) bad.push(`${file} has more static-ignored mutants than at the base (${b.ignored} -> ${c.ignored})`);
    console.log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, ignored ${b.ignored} -> ${c.ignored}`);
  }
  if (bad.length > 0) fail(bad);
  console.log("no touched file's score fell");
};

const [mode, name] = process.argv.slice(2);
if (mode === "record" && (name === "base" || name === "close")) await record(name);
else if (mode === "compare") compare();
else fail(["usage: node 65-mutation.mjs record base|close, or compare"]);
