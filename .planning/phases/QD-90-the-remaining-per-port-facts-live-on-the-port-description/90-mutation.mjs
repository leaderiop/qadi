// The phase's mutation and coverage record, through `stryker.config.mjs` and the core vitest project, over one group, `core`.
// The config mutates every file under `packages/core/src` but the barrel, so the group is measured over the thirteen files the
// phase touches or holds (PortName, Ports, PortMetrics, PortAccess, PortDescription, PortDerivation, AttributeResolver,
// RelationshipResolver, CustomPredicate, DecisionHistory, SignatureHistory, LeafNeeds, ScopedLeaf), at the base and at the close
// with one and the same invocation (the config's own bail setting, no `--disableBail`), so the two are comparable and the base
// is the run the close is judged against. No file is born and none is renamed, so there is no `judgeNew` and no RENAMED map.
// `record base` writes `phase_base`, the HEAD the phase started on, and every file's counts with its open (Survived, NoCoverage)
// and Ignored mutants; it refuses a tree where `packages` or the Stryker config differs from HEAD and a report its invocation
// did not make (its `config.mutate` is not the thirteen files, or its `config.disableBail` is true). A file of the thirteen that
// holds no mutant is absent from a Stryker report and is written with zero counts and `absent: true`; a report that holds a
// file outside the thirteen, or none of them, is refused. `record close [--restart]` reads the close report and writes
// `90-mutation-close.json`; `--restart` starts the close record afresh, for a re-close after a fix commit (a base never is).
// `probe` judges the last report as the close would and writes nothing.
// The removed-mutant rule: a touched file's score does not fall because a new open mutant came with it (a score that fell only
// because killed mutants were deleted passes), a new open mutant (Survived or NoCoverage) never passes, and neither does a new
// Ignored mutant of a kind the base did not hold, beyond what EXAMINED and STATIC_PROVEN record. A mutant is located by its line
// number carried through `git diff -U0 <base head> <close head>`, never by the text of its line, and every comparison counts
// mutants as a multiset, so a second copy of one is a new one. A Survived mutant that matches an entry of EQUIVALENT (file,
// mutator, replacement, the trimmed text of its line, the reason) is explained, never new; an entry that matches no survivor, or
// states no reason, fails. An entry may state `status: "NoCoverage"` for code no input reaches, which no test covers at all; it
// then explains a NoCoverage mutant and never a Survived one, and an entry with no `status` explains a Survived one only. EXAMINED: an Ignored (static) mutant run by hand with the config spread to `ignoreStatic: false` and
// seen Killed, by file, kind and count. STATIC_PROVEN: static code `ignoreStatic` hides from the score, by file, kind and count,
// with `proof`, the exact title of the characterisation row or type pin that holds it; `compare` checks the title exists. An
// allowance a close does not need, or an Ignored mutant beyond it, fails.
// Coverage: `coverage base|close` runs the core tests with coverage, path-filtered (never `--project`, which measures no file
// under the root coverage include), refuses a summary with no file or missing one of the thirteen, writes the four totals as
// the summary states them and the thirteen files' numbers, and exits 1 when a total is below 95.
// `landed base|coverage-base|close|coverage-close` checks the committed records against the history: the right commit, with
// exactly the right paths and the one trailer. `--self-test` drives every judge with planted records and planted allowances and
// asserts nothing about the real constants. From the repository root, after the invocation (stdin closed, nothing else running):
//   node <this directory>/90-mutation.mjs record base
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SELF = fileURLToPath(import.meta.url);
/** This script's own directory, relative to the repository root, with a trailing slash. */
const D = `${relative(process.cwd(), dirname(SELF))}/`;
const CONFIG = "stryker.config.mjs";
const REPORT = "reports/mutation/mutation.json";
const SRC = "packages/core/src/";
const TEST = "packages/core/test/";
const ANCHOR = "fb0b70d3";
const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PLAN_SUBJECT = /^[a-z]+[(]90-[0-9]{2}[)]!?: /;
/** The files the phase touches or holds, in the order the invocation names them. */
const THIRTEEN = [
  "PortName",
  "Ports",
  "PortMetrics",
  "PortAccess",
  "PortDescription",
  "PortDerivation",
  "AttributeResolver",
  "RelationshipResolver",
  "CustomPredicate",
  "DecisionHistory",
  "SignatureHistory",
  "LeafNeeds",
  "ScopedLeaf",
].map((name) => `${SRC}${name}.ts`);
/** A file that holds no mutant is absent from a Stryker report, so any of the thirteen may be. */
const MAY_BE_ABSENT = THIRTEEN;
/** Code the phase moves, each with its old and its new home, written into the base record. */
const MOVED = [
  { code: "the fixture arrow of the custom predicate port", from: `${SRC}Ports.ts`, to: `${SRC}CustomPredicate.ts` },
  { code: "the route ternary of readActed", from: `${SRC}PortAccess.ts readActed`, to: `${SRC}PortAccess.ts readScoped` },
  { code: "the route ternary of askSignature", from: `${SRC}PortAccess.ts askSignature`, to: `${SRC}PortAccess.ts readScoped` },
];
const UNMEASURED_WHY = "every file the phase edits is under packages/core/src/**/*.ts minus index.ts, the glob stryker.config.mjs mutates, so no edited file escapes a run";
/**
 * Survivors that no test can kill, each `{ file, mutatorName, replacement, lineText, reason, status? }`: the line's text trimmed,
 * and the reason naming why no input reaches it; `status` is `"NoCoverage"` for a mutant no test covers, and absent for a
 * Survived one. A stale entry (it matches no open mutant of the close) fails `compare`.
 */
const SCOPED_READ_ARM = 'Match.when("Always", () => () => true),';
const ALWAYS_ARM_WHY =
  "the Always arm of the hoisted needsResourceId matcher is consulted only for a port whose scopedCall row has a bare call, and the one leaf whose LEAF_NEEDS row is Always is HasRelationship, whose port has none (`bare: undefined`, `BareOf<\"RelationshipResolver\">` is `undefined`, a compile-time fact), so no input reaches the arm";
const EQUIVALENT = [
  {
    file: "packages/core/src/PortAccess.ts",
    mutatorName: "ConditionalExpression",
    replacement: "true",
    lineText: "if (bare !== undefined && !needsResourceId(LEAF_NEEDS[leaf._tag].resourceId)(leaf)) {",
    reason:
      "`bare !== undefined` read as true changes nothing: `bare` is undefined only for the relationship port, every leaf of which has the Always row, so `!needsResourceId(Always)(leaf)` is false and the read takes the generator route exactly as the guard sends it; no port has an undefined `bare` together with a row that is not Always",
  },
  { file: "packages/core/src/PortAccess.ts", mutatorName: "ArrowFunction", replacement: "() => undefined", lineText: SCOPED_READ_ARM, status: "NoCoverage", reason: ALWAYS_ARM_WHY },
  { file: "packages/core/src/PortAccess.ts", mutatorName: "BooleanLiteral", replacement: "false", lineText: SCOPED_READ_ARM, status: "NoCoverage", reason: ALWAYS_ARM_WHY },
];
/**
 * Ignored mutants a close may hold beyond its base, per file and kind, each run by hand and Killed: the config spread with
 * `ignoreStatic: false`, run with `--mutate <file>`.
 */
const EXAMINED = {
  "packages/core/src/PortAccess.ts": {
    // The scopedCall table (279) and its three port rows (280, 281, 285): each `{}` is Killed, as is the `ByScope` literal
    // (303) and the arrows of the table rows and of the ByScope arm (280, 282, 285, 304).
    'ObjectLiteral {}': 3,
    'StringLiteral ""': 1,
    "ArrowFunction () => undefined": 2,
  },
  "packages/core/src/CustomPredicate.ts": {
    // The fixture arrow the custom predicate port now states itself (247), Killed.
    "ArrowFunction () => undefined": 1,
  },
};
/**
 * Static code `ignoreStatic` hides from the score, each `{ file, mutator, replacement, count, proof }`; `proof` is the exact
 * title of the characterisation row or type pin that holds the code.
 */
const STATIC_PROVEN = [
  // The Always arm's literal and arrow (301): run by hand with `ignoreStatic: false` they Survive, for the reason in
  // ALWAYS_ARM_WHY. The row below holds the property the arm stands for, that a relationship read demands a resource id.
  { file: "packages/core/src/PortAccess.ts", mutator: "StringLiteral", replacement: '""', count: 1, proof: "HasRelationship, absent resource, under evaluate" },
  { file: "packages/core/src/PortAccess.ts", mutator: "ArrowFunction", replacement: "() => undefined", count: 1, proof: "HasRelationship, absent resource, under evaluate" },
];
/** Where a `proof` title is looked for: the vitest titles of the first file and the `test("…")` titles of the second. */
const PROOF_ROW_FILE = `${TEST}PortFacts.characterisation.test.ts`;
const PROOF_PIN_FILE = `${TEST}PortFacts.tst.ts`;
const invocation = () => `pnpm exec stryker run ${CONFIG} --mutate ${THIRTEEN.join(",")}`;
const DETECTED = new Set(["Killed", "Timeout"]);
const OPEN = new Set(["Survived", "NoCoverage"]);
const PCT = ["lines", "functions", "branches", "statements"];
const FLOOR = 95;
const SUBJECTS = {
  base: "docs(90-01): record the mutation base",
  "coverage-base": "docs(90-01): record the coverage base",
  close: "docs(90-13): record the mutation close",
  "coverage-close": "docs(90-13): record the coverage close",
};
const record = (name) => `${D}90-mutation-${name}.json`;
const coverageFile = (name) => `${D}90-coverage-${name}.json`;

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "pipe"] });
const gitOk = (...args) => {
  try {
    execFileSync("git", args, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

/** Why a record may not be made: a file it reads differs from HEAD, so its line numbers belong to no commit. */
export const dirtyReasons = (porcelain) => (porcelain.trim() === "" ? [] : [`record from a clean tree; these differ from HEAD:\n${porcelain.trimEnd()}`]);
/** The paths a record reads: every test and source of the package that made the report, and the Stryker config. */
export const statusPaths = () => ["packages", CONFIG];
/** The porcelain status of the paths a record reads. */
const gitStatus = () => git("status", "--porcelain", "--", ...statusPaths());

/** Why a report is not the one the invocation makes: it mutated other files, or ran with bail off. Pure. */
export const reportReasons = (report) => {
  const mutate = [...(report.config?.mutate ?? [])].sort().join(",");
  return mutate === [...THIRTEEN].sort().join(",") && report.config?.disableBail !== true ? [] : ["the report was not made by the invocation"];
};

/** The hunks of a `git diff -U0` of one file: removed base lines [a, a+b) and added close lines [c, c+d). */
export const hunks = (diffText) =>
  diffText
    .split("\n")
    .map((line) => /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line))
    .filter((m) => m !== null)
    .map((m) => ({ a: Number(m[1]), b: m[2] === undefined ? 1 : Number(m[2]), c: Number(m[3]), d: m[4] === undefined ? 1 : Number(m[4]) }));

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

/** An Ignored mutant's kind: what it replaces and with what, not where. */
const kind = (m) => `${m.mutator} ${m.replacement}`;

const key = (m, line = m.line) => [m.status, m.mutator, m.replacement, line, m.column].join("\u0000");
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

/** What a file's close may hold beyond its base in Ignored mutants, by kind: EXAMINED and STATIC_PROVEN together. Pure. */
export const allowance = (file, examined = EXAMINED, staticProven = STATIC_PROVEN) => {
  const out = new Map(Object.entries(examined[file] ?? {}));
  for (const s of staticProven) if (s.file === file) out.set(`${s.mutator} ${s.replacement}`, (out.get(`${s.mutator} ${s.replacement}`) ?? 0) + s.count);
  return out;
};

/** Whether `entry` explains the open mutant `m` of `file`: the entry's status (Survived unless it says NoCoverage), same mutation, a line of the same text. */
const explains = (entry, file, m) => entry.file === file && m.status === (entry.status ?? "Survived") && entry.mutatorName === m.mutator && entry.replacement === m.replacement && entry.lineText === m.lineText;
/** The open mutants of `file` that no EQUIVALENT entry explains. Pure. */
export const unexplained = (open, file, equivalent = EQUIVALENT) => open.filter((m) => !equivalent.some((entry) => explains(entry, file, m)));
/** Why an EQUIVALENT entry fails: it states no reason, or it matches no survivor of the close (`closeFiles`: file -> counts). Pure. */
export const equivalentReasons = (equivalent, closeFiles) =>
  equivalent.flatMap((entry) => [
    ...(typeof entry.reason !== "string" || entry.reason.trim() === "" ? [`the equivalent entry for ${entry.file} (${entry.mutatorName} -> ${entry.replacement}) states no reason`] : []),
    ...((closeFiles[entry.file]?.open ?? []).some((m) => explains(entry, entry.file, m)) ? [] : [`the equivalent entry for ${entry.file} (${entry.mutatorName} -> ${entry.replacement}) matches no survivor: remove it`]),
  ]);
/** Why a STATIC_PROVEN entry fails: it names no proof, or its proof is not among the titles that exist. Pure. */
export const proofReasons = (staticProven, titles) =>
  staticProven.flatMap((entry) => (typeof entry.proof === "string" && entry.proof.trim() !== "" && titles.includes(entry.proof) ? [] : [`the static entry for ${entry.file} (${entry.mutator} -> ${entry.replacement}) names no title that exists: ${JSON.stringify(entry.proof)}`]));

const relPath = (file) => (isAbsolute(file) ? relative(process.cwd(), file) : file);

/**
 * Each file's counts and its non-Killed mutants from a parsed Stryker report holding some of `files` and no other (a file of
 * MAY_BE_ABSENT, which a report omits when it holds no mutant, has zero counts and `absent: true`), and the reasons it cannot be
 * read. Pure; `source` is checked by `tally`.
 */
export const classify = (report, files) => {
  const byFile = {};
  for (const [file, entry] of Object.entries(report.files)) byFile[relPath(file)] = entry;
  const held = Object.keys(byFile);
  const extra = held.filter((file) => !files.includes(file));
  const missing = files.filter((file) => byFile[file] === undefined && !MAY_BE_ABSENT.includes(file));
  if (extra.length > 0 || missing.length > 0 || held.length === 0) return { out: {}, bad: [`the report holds ${held.sort().join(",") || "no file"}, not ${files.join(",")}`] };
  const out = {};
  for (const file of files) {
    const lines = (byFile[file]?.source ?? "").split("\n");
    const all = (byFile[file]?.mutants ?? []).map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column, lineText: (lines[m.location.start.line - 1] ?? "").trim() }));
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status));
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid: detected + open.length, open, ignoredMutants: all.filter((m) => m.status === "Ignored"), ...(byFile[file] === undefined ? { absent: true } : {}) };
  }
  return { out, bad: [] };
};

/** Each file's counts and its non-Killed mutants from a Stryker JSON report holding the thirteen files. */
const tally = (reportFile) => {
  const report = readJson(reportFile);
  const { out, bad } = classify(report, THIRTEEN);
  if (bad.length > 0) fail(bad.map((line) => `${reportFile}: ${line}`));
  for (const file of THIRTEEN) {
    const entry = Object.entries(report.files).find(([name]) => relPath(name) === file)?.[1];
    if (entry !== undefined && entry.source !== readFileSync(file, "utf8")) fail([`the report for ${file} is not the file on disk`]);
    console.log(`${file} ${out[file].detected}/${out[file].valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored} timeout ${out[file].timeout}${out[file].absent === true ? " (absent: no mutant)" : ""}`);
    for (const m of out[file].open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * Every reason the close fails, given the two records and each file's `git diff -U0 <base head> <close head>`. Pure. A fall in
 * the score is a reason only when the file also has a new open mutant: a score that fell because the code holding killed
 * mutants was deleted passes, and any new Survived or NoCoverage mutant that EQUIVALENT does not explain fails.
 */
export const judge = ({ base, close, diffs }, files, log = console.log, examined = EXAMINED, equivalent = EQUIVALENT, staticProven = STATIC_PROVEN) => {
  const bad = [];
  for (const file of files) {
    const b = base.files[file];
    const c = close.files[file];
    if (b === undefined || c === undefined) {
      bad.push(`${file} is missing from a record`);
      continue;
    }
    const toClose = mapLine(diffs[file] ?? "");
    const atBase = (m) => {
      const line = toClose(m.line);
      return line === undefined ? undefined : key(m, line);
    };
    // Integer cross-multiplication, so no rounded float decides whether a score fell.
    const fell = c.detected * b.valid < b.detected * c.valid;
    const open = unexplained(beyond(c.open, (x) => key(x), bag(b.open, atBase)), file, equivalent);
    if (fell && open.length > 0) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    for (const m of open) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    // An Ignored (static) mutant never runs, so where it sits tests nothing: a line the phase rewrites moves its static
    // arrow without adding a mutant, and no test can kill one. The rule is per kind: a file holds no more Ignored
    // mutants of a kind than its base did, plus what EXAMINED and STATIC_PROVEN record.
    const extra = allowance(file, examined, staticProven);
    const allowed = bag(b.ignoredMutants, kind);
    for (const [k, n] of extra) allowed.set(k, (allowed.get(k) ?? 0) + n);
    const fresh = beyond(c.ignoredMutants, kind, allowed);
    for (const m of fresh) bad.push(`${file}:${m.line} has a new Ignored mutant: ${m.mutator} -> ${m.replacement}`);
    for (const [k, n] of extra) {
      const grew = c.ignoredMutants.filter((x) => kind(x) === k).length - b.ignoredMutants.filter((x) => kind(x) === k).length;
      if (grew < n) bad.push(`${file} no longer holds the ${n} Ignored ${k} mutant(s) EXAMINED or STATIC_PROVEN allows: remove the entry`);
    }
    log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, survived ${b.survived} -> ${c.survived}, no coverage ${b.noCoverage} -> ${c.noCoverage}, ignored ${b.ignored} -> ${c.ignored} (${fresh.length} new)${fell && open.length === 0 ? ", killed mutants removed" : ""}`);
  }
  return bad;
};

/** Why two records do not belong together: they name different phase bases, or the base was not measured at the phase base. Pure. */
export const recordReasons = (baseRecord, closeRecord) => {
  const bad = [];
  if (baseRecord.phase_base !== closeRecord.phase_base) bad.push(`the records name different phase bases: ${baseRecord.phase_base} and ${closeRecord.phase_base}`);
  if (baseRecord.groups?.core?.head !== baseRecord.phase_base) bad.push("the core base was not measured at the phase base");
  return bad;
};

/** Why a close record may not be written over `held`: it names another phase base. Pure. */
export const heldReasons = (held, phaseBase, restart, name) => {
  if (restart && name !== "close") return ["--restart re-measures a close, never a base"];
  return !restart && held !== undefined && held.phase_base !== phaseBase ? [`${record("close")} names phase_base ${held.phase_base}, not ${phaseBase}: a record names the one phase base`] : [];
};

/**
 * What a vitest json-summary holds: the four totals and the thirteen files' numbers as the summary states them, the reasons it
 * cannot be a record (no file, one of the thirteen missing) and the totals below the floor. Pure.
 */
export const coverageRead = (summary, files = THIRTEEN, floor = FLOOR) => {
  const entries = Object.entries(summary).filter(([name]) => name !== "total").map(([name, value]) => [relPath(name), value]);
  const pcts = (entry) => Object.fromEntries(PCT.map((metric) => [metric, entry?.[metric]?.pct]));
  const totals = pcts(summary.total);
  const structural = [...(entries.length === 0 ? ["the coverage summary holds no file"] : []), ...files.filter((file) => !entries.some(([name]) => name === file)).map((file) => `the coverage summary does not hold ${file}`)];
  const below = PCT.filter((metric) => !(typeof totals[metric] === "number" && totals[metric] >= floor)).map((metric) => `the ${metric} total is ${totals[metric]}, below ${floor}`);
  return { files: entries.length, totals, thirteen: Object.fromEntries(files.map((file) => [file, pcts(entries.find(([name]) => name === file)?.[1])])), structural, below };
};

/** The reasons a commit is not the one named: its subject, its parent, its paths or its trailer. Pure. */
export const commitReasons = ({ subject, parents, files, body }, want) => {
  const bad = [];
  if (subject !== want.subject) bad.push(`the commit is ${JSON.stringify(subject)}, not ${JSON.stringify(want.subject)}`);
  if (want.parent !== undefined && !(parents.length === 1 && parents[0] === want.parent)) bad.push(`the commit is not a child of ${want.parent}`);
  if (files.slice().sort().join(",") !== want.files.slice().sort().join(",")) bad.push(`the commit holds ${files.join(",")}, not exactly ${want.files.join(",")}`);
  const lines = body.split("\n").map((line) => line.trimEnd());
  const trailers = lines.filter((line) => /^co-authored-by:/i.test(line));
  const last = lines.filter((line) => line !== "").at(-1);
  if (!(trailers.length === 1 && trailers[0] === TRAILER && last === TRAILER)) bad.push(`the commit does not end with exactly the one trailer ${TRAILER}`);
  return bad;
};

/** The scratch directory every phase run writes to, made when asked for. */
const scratch = () => {
  const dir = `${realpathSync(process.env.TMPDIR ?? "/tmp")}/qd90`;
  mkdirSync(dir, { recursive: true });
  return dir;
};

const recordMode = async (name, restart) => {
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const refused = reportReasons(readJson(REPORT));
  if (refused.length > 0) fail(refused);
  const head = git("rev-parse", "HEAD").trim();
  if (name === "close" && !existsSync(record("base"))) fail([`${record("base")} does not exist: the base is recorded first`]);
  const phaseBase = name === "base" ? head : readJson(record("base")).phase_base;
  const out = record(name);
  const bad = heldReasons(existsSync(out) ? readJson(out) : undefined, phaseBase, restart, name);
  if (bad.length > 0) fail(bad);
  const group = { head, invocation: invocation(), files: tally(REPORT) };
  const written =
    name === "base"
      ? { phase: "90", phase_base: phaseBase, born: [], moved: MOVED, unmeasured: [], unmeasured_why: UNMEASURED_WHY, close_invocation: invocation(), groups: { core: group } }
      : { phase: "90", phase_base: phaseBase, moved: MOVED, unmeasured: [], groups: { core: group } };
  writeFileSync(out, `${JSON.stringify(written, null, 1)}\n`);
  console.log(`wrote the ${name} record into ${out}`);
};

/** The titles a STATIC_PROVEN proof may name: the rows the characterisation reports and the `test("…")` titles of the type pins. */
const proofTitles = () => {
  const titles = [];
  if (existsSync(PROOF_ROW_FILE)) {
    const out = `${scratch()}/proof-rows.json`;
    try {
      execFileSync("pnpm", ["exec", "vitest", "run", PROOF_ROW_FILE, "--reporter=json", `--outputFile=${out}`], { stdio: "ignore" });
    } catch {
      // a red run still lists its rows
    }
    if (existsSync(out)) for (const file of readJson(out).testResults ?? []) for (const row of file.assertionResults ?? []) titles.push(row.title, row.fullName);
  }
  if (existsSync(PROOF_PIN_FILE)) for (const m of readFileSync(PROOF_PIN_FILE, "utf8").matchAll(/\btest\(\s*(["'`])((?:\\.|(?!\1).)*)\1/gs)) titles.push(m[2]);
  return titles;
};

const diffsOf = (baseHead, closeHead) => Object.fromEntries(THIRTEEN.map((file) => [file, git("diff", "-U0", baseHead, ...(closeHead === undefined ? [] : [closeHead]), "--", file)]));

/** The reasons the last report fails as its close would judge it, writing nothing. */
const probe = () => {
  const bad = reportReasons(readJson(REPORT));
  if (bad.length > 0) fail(bad);
  const files = tally(REPORT);
  const base = readJson(record("base")).groups.core;
  bad.push(...judge({ base, close: { files }, diffs: diffsOf(base.head) }, THIRTEEN));
  bad.push(...equivalentReasons(EQUIVALENT, files));
  if (bad.length > 0) fail(bad);
  console.log("probe: the report passes as its close would judge it");
};

const compare = () => {
  const baseRecord = readJson(record("base"));
  const closeRecord = readJson(record("close"));
  const bad = recordReasons(baseRecord, closeRecord);
  const base = baseRecord.groups.core;
  const close = closeRecord.groups.core;
  if (base.invocation !== invocation()) bad.push("the base record was not made by the invocation");
  if (close.invocation !== invocation()) bad.push("the close record was not made by the invocation");
  bad.push(...judge({ base, close, diffs: diffsOf(base.head, close.head) }, THIRTEEN));
  bad.push(...equivalentReasons(EQUIVALENT, close.files));
  if (STATIC_PROVEN.length > 0) bad.push(...proofReasons(STATIC_PROVEN, proofTitles()));
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants");
};

const coverageMode = (name) => {
  if (name !== "base" && name !== "close") return usage();
  if (!existsSync(record("base"))) fail([`${record("base")} does not exist: the base is recorded first`]);
  const phaseBase = readJson(record("base")).phase_base;
  const head = git("rev-parse", "HEAD").trim();
  // The base is the phase base's own source: HEAD may sit on the base record's commit, which changes nothing outside .planning.
  if (name === "base" && !gitOk("diff", "--quiet", phaseBase, "HEAD", "--", ".", ":!.planning")) fail([`the tree outside .planning differs from ${phaseBase}: the coverage base is taken on the unchanged tree`]);
  const dir = `${scratch()}/coverage-${name}`;
  rmSync(dir, { recursive: true, force: true });
  const args = ["exec", "vitest", "run", "packages/core/test", "--coverage.enabled", "--coverage.include=packages/core/src/**", "--coverage.exclude=packages/core/src/index.ts", "--coverage.reporter=json-summary", `--coverage.reportsDirectory=${dir}`];
  try {
    execFileSync("pnpm", args, { stdio: ["ignore", "inherit", "inherit"] });
  } catch {
    // a threshold shortfall exits non-zero; the summary below is what decides
  }
  const summaryFile = `${dir}/coverage-summary.json`;
  if (!existsSync(summaryFile)) fail([`${summaryFile} was not written: the run did not finish`]);
  const read = coverageRead(readJson(summaryFile));
  if (read.structural.length > 0) fail(read.structural);
  const out = coverageFile(name);
  writeFileSync(out, `${JSON.stringify({ phase_base: phaseBase, head: name === "base" ? phaseBase : head, command: `pnpm ${args.join(" ")}`, files: read.files, totals: read.totals, thirteen: read.thirteen }, null, 1)}\n`);
  console.log(`wrote the ${name} coverage into ${out}: ${read.files} files, ${PCT.map((metric) => `${metric} ${read.totals[metric]}`).join(", ")}`);
  if (read.below.length > 0) fail(read.below);
};

/** The plan commits since `phaseBase`, oldest first, each `{ sha, subject }`. */
const planCommits = (phaseBase) =>
  git("log", "--reverse", "--format=%H%x09%s", `${phaseBase}..HEAD`)
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => ({ sha: line.slice(0, line.indexOf("\t")), subject: line.slice(line.indexOf("\t") + 1) }))
    .filter((c) => PLAN_SUBJECT.test(c.subject));
const commitOf = (sha) => ({ subject: git("log", "-1", "--format=%s", sha).trim(), parents: git("log", "-1", "--format=%P", sha).trim().split(" ").filter(Boolean), files: git("show", "--name-only", "--format=", sha).split("\n").filter(Boolean), body: git("log", "-1", "--format=%B", sha) });
/** The one commit with `subject` since `phaseBase`, and why there is not exactly one. */
const commitNamed = (phaseBase, subject) => {
  const found = planCommits(phaseBase).filter((c) => c.subject === subject);
  return found.length === 1 ? { sha: found[0].sha, bad: [] } : { sha: undefined, bad: [`exactly one commit since ${phaseBase} must be ${JSON.stringify(subject)}, found ${found.length}`] };
};

const landed = (what) => {
  const subject = SUBJECTS[what];
  if (subject === undefined) return usage();
  if (!existsSync(record("base"))) fail([`${record("base")} does not exist`]);
  const baseRecord = readJson(record("base"));
  const phaseBase = baseRecord.phase_base;
  const bad = [];
  if (!/^[0-9a-f]{40}$/.test(phaseBase ?? "")) fail([`phase_base is not 40 hex: ${phaseBase}`]);
  if (!gitOk("merge-base", "--is-ancestor", ANCHOR, phaseBase)) bad.push(`phase_base does not descend from ${ANCHOR}`);
  if (!gitOk("diff", "--quiet", ANCHOR, phaseBase, "--", ".", ":!.planning")) bad.push(`phase_base differs from ${ANCHOR} outside .planning`);
  const plan = planCommits(phaseBase);
  const check = (c, want) => bad.push(...commitReasons(commitOf(c.sha), want));
  if (what === "base" || what === "coverage-base") {
    if (what === "base") {
      const core = baseRecord.groups?.core;
      if (baseRecord.phase !== "90") bad.push("the base record is not phase 90");
      if (core?.head !== phaseBase) bad.push("groups.core.head is not phase_base");
      if (core?.invocation !== invocation() || baseRecord.close_invocation !== invocation()) bad.push("the invocation and close_invocation are not the exact string");
      if (Object.keys(core?.files ?? {}).sort().join(",") !== [...THIRTEEN].sort().join(",")) bad.push("files is not exactly the thirteen");
      if (JSON.stringify(baseRecord.born) !== "[]" || JSON.stringify(baseRecord.unmeasured) !== "[]") bad.push("born and unmeasured must be empty arrays");
      if (baseRecord.unmeasured_why !== UNMEASURED_WHY || JSON.stringify(baseRecord.moved) !== JSON.stringify(MOVED) || MOVED.length < 2) bad.push("unmeasured_why or moved is not as stated");
      if ("renamed" in baseRecord || "RENAMED" in baseRecord) bad.push("the base record carries a rename map");
      try {
        const lastLine = execFileSync(process.execPath, [SELF, "--self-test"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim().split("\n").at(-1);
        if (!/^self-test: \d+ passed$/.test(lastLine)) bad.push(`the self-test did not end as expected: ${lastLine}`);
      } catch {
        bad.push("the self-test failed");
      }
    }
    const first = what === "base" ? plan[0] : plan[1];
    if (first === undefined || first.subject !== subject) bad.push(`the ${what === "base" ? "first" : "second"} plan commit after phase_base is ${JSON.stringify(first?.subject)}, not ${JSON.stringify(subject)}`);
    else if (what === "base") check(first, { subject, parent: phaseBase, files: [`${D}90-mutation.mjs`, record("base")] });
    else {
      check(first, { subject, files: [coverageFile("base")] });
      if (!existsSync(coverageFile("base"))) bad.push(`${coverageFile("base")} does not exist`);
      else {
        const cov = readJson(coverageFile("base"));
        if (cov.head !== phaseBase || cov.phase_base !== phaseBase) bad.push("the coverage base was not measured at phase_base");
        if (!(cov.files > 0)) bad.push("the coverage base holds no file");
        if (Object.keys(cov.thirteen ?? {}).sort().join(",") !== [...THIRTEEN].sort().join(",")) bad.push("the coverage base does not hold exactly the thirteen");
        for (const metric of PCT) if (!(cov.totals?.[metric] >= FLOOR)) bad.push(`the coverage base ${metric} total ${cov.totals?.[metric]} is below ${FLOOR}`);
      }
    }
  } else {
    const found = commitNamed(phaseBase, subject);
    bad.push(...found.bad);
    if (found.sha !== undefined) {
      const parent = git("rev-parse", `${found.sha}^`).trim();
      if (what === "close") {
        check(found, { subject, files: [`${D}90-mutation.mjs`, record("close")] });
        const closeRecord = existsSync(record("close")) ? readJson(record("close")) : undefined;
        if (closeRecord === undefined) bad.push(`${record("close")} does not exist`);
        else {
          if (closeRecord.phase_base !== phaseBase || closeRecord.groups?.core?.invocation !== baseRecord.groups?.core?.invocation) bad.push("the close record's phase_base or invocation is not the base record's");
          if (closeRecord.groups?.core?.head !== parent) bad.push("the close record's head is not the close commit's parent");
        }
        try {
          execFileSync(process.execPath, [SELF, "compare"], { stdio: ["ignore", "inherit", "inherit"] });
        } catch {
          bad.push("compare exits non-zero");
        }
      } else {
        check(found, { subject, files: [coverageFile("close")] });
        const cov = existsSync(coverageFile("close")) ? readJson(coverageFile("close")) : undefined;
        if (cov === undefined) bad.push(`${coverageFile("close")} does not exist`);
        else {
          if (cov.head !== parent) bad.push("the coverage close's head is not the commit's parent");
          if (!(cov.files > 0)) bad.push("the coverage close holds no file");
          for (const metric of PCT) if (!(cov.totals?.[metric] >= FLOOR)) bad.push(`the coverage close ${metric} total ${cov.totals?.[metric]} is below ${FLOOR}`);
        }
      }
    }
  }
  if (bad.length > 0) fail(bad);
  console.log(`landed ${what}: ok`);
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, lineText: "const a = 1;", ...extra });
  const file = (detected, valid, open = [], ignoredMutants = [], extra = {}) => ({
    killed: detected,
    timeout: 0,
    detected,
    valid,
    open,
    survived: open.filter((x) => x.status === "Survived").length,
    noCoverage: open.filter((x) => x.status === "NoCoverage").length,
    ignored: ignoredMutants.length,
    ignoredMutants,
    ...extra,
  });
  const F = THIRTEEN[0];
  // Base: one survivor on line 20, a static mutant Ignored on line 3; the close rewrote lines 9 to 11 into 9 to 10, so
  // line 3 stays line 3 and line 20 becomes line 19.
  const diffs = { [F]: "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n" };
  const base = { files: { [F]: file(42, 43, [m("Survived", 20)], [m("Ignored", 3)]) } };
  const closeOf = (f) => ({ files: { [F]: f } });
  let passed = 0;
  const check = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) fail([`self-test FAILED: ${name}: ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`]);
    passed++;
  };
  const run = (b, close, d, examined, equivalent, staticProven, log = () => {}) => judge({ base: b, close, diffs: d }, [F], log, examined, equivalent, staticProven).length;
  for (const [name, close, want] of [
    ["an unchanged close passes", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), 0],
    ["a close that kills the survivor passes", closeOf(file(43, 43, [], [m("Ignored", 3)])), 0],
    ["a score below the base fails", closeOf(file(41, 43, [m("Survived", 19), m("Survived", 30)], [m("Ignored", 3)])), 2],
    ["a survivor on a line the diff wrote is new and fails", closeOf(file(42, 43, [m("Survived", 9)], [m("Ignored", 3)])), 1],
    ["a survivor left where the base had it, unmapped, fails", closeOf(file(42, 43, [m("Survived", 20)], [m("Ignored", 3)])), 1],
    ["a second copy of the base survivor fails", closeOf(file(84, 86, [m("Survived", 19), m("Survived", 19)], [m("Ignored", 3)])), 1],
    ["a second copy of a base Ignored mutant fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 3)])), 1],
    ["a new Ignored mutant fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), 1],
    ["an Ignored mutant moved by a rewrite is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 9)])), 0],
    ["a file missing from the close fails", { files: {} }, 1],
    ["a new NoCoverage mutant fails while the score holds", closeOf(file(85, 87, [m("Survived", 19), m("NoCoverage", 30)], [m("Ignored", 3)])), 1],
  ]) {
    check(name, run(base, close, diffs, {}, [], []), want);
  }
  // An examined or a static-proven allowance admits exactly its count of Ignored mutants of its kind, and a stale one fails.
  const k = kind(m("Ignored", 3));
  const staticFor = (count, proof = "a title") => [{ file: F, mutator: "StringLiteral", replacement: '""', count, proof }];
  for (const [name, close, examined, staticProven, want] of [
    ["an examined Ignored mutant is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), { [F]: { [k]: 1 } }, [], 0],
    ["a second Ignored mutant beyond the examined one fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), { [F]: { [k]: 1 } }, [], 1],
    ["an examined allowance the close no longer needs fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), { [F]: { [k]: 1 } }, [], 1],
    ["a static-proven Ignored mutant is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), {}, staticFor(1), 0],
    ["a second Ignored mutant beyond the static-proven one fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), {}, staticFor(1), 1],
    ["a static allowance the close no longer needs fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), {}, staticFor(1), 1],
    ["an examined and a static allowance add up", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), { [F]: { [k]: 1 } }, staticFor(1), 0],
    ["a static allowance for another file is not this file's", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), {}, [{ ...staticFor(1)[0], file: THIRTEEN[1] }], 1],
  ]) {
    check(name, run(base, close, diffs, examined, [], staticProven), want);
  }
  check("a static entry naming a title that exists passes", proofReasons(staticFor(1, "a held title"), ["a held title"]).length, 0);
  check("a static entry naming a missing title fails", proofReasons(staticFor(1, "a held title"), ["another"]).length, 1);
  check("a static entry naming no proof fails", proofReasons(staticFor(1, " "), [" "]).length, 1);
  // A fall with no new open mutant: the killed mutants went with the code that held them.
  {
    const logged = [];
    const got = run(base, closeOf(file(30, 31, [m("Survived", 19)], [m("Ignored", 3)])), diffs, {}, [], [], (line) => logged.push(line));
    check("a fall with no new open mutant passes as killed mutants removed", got === 0 && logged.join("\n").includes("killed mutants removed"), true);
  }
  // A touched file with a base: a close equal to its base passes, deleted killed mutants pass, a new open mutant fails.
  {
    const touchedBase = { files: { [F]: file(28, 28) } };
    for (const [name, close, want] of [
      ["a touched close equal to its base passes", file(28, 28), 0],
      ["a touched close whose only change is deleted killed mutants passes", file(20, 20), 0],
      ["a touched close with a new Survived mutant fails the score and the mutant", file(28, 29, [m("Survived", 7)]), 2],
      ["a touched close with a new NoCoverage mutant fails the score and the mutant", file(28, 29, [m("NoCoverage", 7)]), 2],
      ["a touched close with a new Ignored mutant fails", file(28, 28, [], [m("Ignored", 7)]), 1],
    ]) {
      check(name, run(touchedBase, closeOf(close), { [F]: "" }, {}, [], []), want);
    }
    check("a file at zero mutants on both sides passes", run({ files: { [F]: file(0, 0) } }, closeOf(file(0, 0)), { [F]: "" }, {}, [], []), 0);
  }
  // A survivor an EQUIVALENT entry explains is not new, a stale entry fails and an entry with no reason fails.
  {
    const entry = { file: F, mutatorName: "StringLiteral", replacement: '""', lineText: "const a = 1;", reason: "no input reaches the line" };
    const plain = { files: { [F]: file(42, 42) } };
    const survivor = { files: { [F]: file(42, 43, [m("Survived", 30)]) } };
    for (const [name, got, want] of [
      ["a new survivor with no equivalent entry fails the score and the mutant", run(plain, survivor, { [F]: "" }, {}, [], []), 2],
      ["a new survivor an equivalent entry explains passes", run(plain, survivor, { [F]: "" }, {}, [entry], []), 0],
      ["an entry for another line text does not explain it", run(plain, survivor, { [F]: "" }, {}, [{ ...entry, lineText: "const b = 2;" }], []), 2],
      ["an entry for another mutator does not explain it", run(plain, survivor, { [F]: "" }, {}, [{ ...entry, mutatorName: "ObjectLiteral" }], []), 2],
      ["an entry for another file does not explain it", run(plain, survivor, { [F]: "" }, {}, [{ ...entry, file: THIRTEEN[1] }], []), 2],
      ["an entry explains a Survived mutant, never a NoCoverage one", run(plain, { files: { [F]: file(42, 43, [m("NoCoverage", 30)]) } }, { [F]: "" }, {}, [entry], []), 2],
      ["a NoCoverage entry explains a NoCoverage mutant", run(plain, { files: { [F]: file(42, 43, [m("NoCoverage", 30)]) } }, { [F]: "" }, {}, [{ ...entry, status: "NoCoverage" }], []), 0],
      ["a NoCoverage entry never explains a Survived mutant", run(plain, survivor, { [F]: "" }, {}, [{ ...entry, status: "NoCoverage" }], []), 2],
      ["a NoCoverage entry matching a NoCoverage mutant of the close is not stale", equivalentReasons([{ ...entry, status: "NoCoverage" }], { [F]: file(42, 43, [m("NoCoverage", 30)]) }).length, 0],
      ["a NoCoverage entry matching only a Survived mutant is stale", equivalentReasons([{ ...entry, status: "NoCoverage" }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
      ["an entry that matches a survivor of the close is not stale", equivalentReasons([entry], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 0],
      ["an entry that matches no survivor of the close is stale", equivalentReasons([entry], { [F]: file(42, 42) }).length, 1],
      ["an entry for a file the close does not hold is stale", equivalentReasons([entry], {}).length, 1],
      ["an entry with an empty reason fails", equivalentReasons([{ ...entry, reason: "  " }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
      ["an entry with no reason at all fails", equivalentReasons([{ ...entry, reason: undefined }], { [F]: file(42, 43, [m("Survived", 30)]) }).length, 1],
    ]) {
      check(name, got, want);
    }
  }
  // The report a record reads, planted: the thirteen files and no other, none with bail off, a file with no mutant absent.
  {
    const raw = (status, line) => ({ status, mutatorName: "StringLiteral", replacement: '""', location: { start: { line, column: 4 } } });
    const entryOf = (...mutants) => ({ source: "a\n  const a = 1;  \nc", mutants });
    const held = (names) => Object.fromEntries(names.map((name) => [name, entryOf(raw("Killed", 1))]));
    check("a report holding exactly the thirteen is read", classify({ files: held(THIRTEEN) }, THIRTEEN).bad.length, 0);
    check("a report holding a file outside the thirteen cannot be read", classify({ files: held([...THIRTEEN, `${SRC}Other.ts`]) }, THIRTEEN).bad.length, 1);
    check("a report holding none of the thirteen cannot be read", classify({ files: {} }, THIRTEEN).bad.length, 1);
    const fewer = classify({ files: held(THIRTEEN.slice(1)) }, THIRTEEN);
    check("a report omitting a file is read, the file with zero counts and absent", [fewer.bad.length, fewer.out[F].absent, fewer.out[F].valid, fewer.out[F].ignored], [0, true, 0, 0]);
    check("a file the report lists carries no absent flag", classify({ files: held(THIRTEEN) }, THIRTEEN).out[F].absent, undefined);
    check("a file the report lists with no mutant has zero counts", JSON.stringify(Object.entries(classify({ files: { [F]: { source: "", mutants: [] } } }, [F]).out[F]).sort()), JSON.stringify(Object.entries(file(0, 0)).sort()));
    check("a survivor carries the trimmed text of its line", classify({ files: { [F]: { source: "a\n  const a = 1;  \nc", mutants: [raw("Survived", 2)] } } }, [F]).out[F].open[0].lineText, "const a = 1;");
    check("the counts of a report are its statuses", Object.values(classify({ files: { [F]: entryOf(raw("Killed", 1), raw("Timeout", 2), raw("Survived", 3), raw("NoCoverage", 3), raw("Ignored", 1)) } }, [F]).out[F]).slice(0, 5), [1, 1, 1, 1, 1]);
    for (const [name, config, want] of [
      ["a report made with the thirteen files and no --disableBail is accepted", { mutate: THIRTEEN }, 0],
      ["a report made with the files in another order is accepted", { mutate: [...THIRTEEN].reverse() }, 0],
      ["a report made with explicit disableBail false is accepted", { mutate: THIRTEEN, disableBail: false }, 0],
      ["a report made with --disableBail is refused", { mutate: THIRTEEN, disableBail: true }, 1],
      ["a report holding twelve of the thirteen files is refused", { mutate: THIRTEEN.slice(1) }, 1],
      ["a report holding one file too many is refused", { mutate: [...THIRTEEN, `${SRC}Other.ts`] }, 1],
      ["a report with no config is refused", undefined, 1],
    ]) {
      check(name, reportReasons({ config }).length, want);
    }
  }
  // The two records belong to one phase base, the base was measured at it, and a close record names no other.
  {
    const baseRecord = { phase_base: "p", groups: { core: { head: "p" } } };
    for (const [name, got, want] of [
      ["a clean pair of records passes", recordReasons(baseRecord, { phase_base: "p" }).length, 0],
      ["records naming different phase bases fail", recordReasons(baseRecord, { phase_base: "q" }).length, 1],
      ["a base measured off the phase base fails", recordReasons({ phase_base: "p", groups: { core: { head: "x" } } }, { phase_base: "p" }).length, 1],
      ["a close record over another phase base is refused", heldReasons({ phase_base: "q" }, "p", false, "close").length, 1],
      ["a close record over the same phase base is not refused", heldReasons({ phase_base: "p" }, "p", false, "close").length, 0],
      ["--restart on a close starts afresh whatever the old record named", heldReasons({ phase_base: "q" }, "p", true, "close").length, 0],
      ["--restart on a base is refused", heldReasons(undefined, "p", true, "base").length, 1],
      ["no held record is not refused", heldReasons(undefined, "p", false, "close").length, 0],
    ]) {
      check(name, got, want);
    }
  }
  // Coverage: a summary with no file, with a file missing, or with a total of 94.99 fails, and one at 95.00 passes.
  {
    const cell = (pct) => ({ pct });
    const row = (pct) => ({ lines: cell(pct), functions: cell(pct), branches: cell(pct), statements: cell(pct) });
    const summaryOf = (pct, names = THIRTEEN) => ({ total: row(pct), ...Object.fromEntries(names.map((name) => [`${process.cwd()}/${name}`, row(pct)])) });
    const reasons = (summary) => {
      const read = coverageRead(summary);
      return read.structural.length + read.below.length;
    };
    check("a summary at 95.00 passes", reasons(summaryOf(95)), 0);
    check("a summary at 94.99 fails every total", reasons(summaryOf(94.99)), 4);
    check("a summary with one total below fails once", reasons({ ...summaryOf(100), total: { ...row(100), branches: cell(94.99) } }), 1);
    check("a summary with no file fails", reasons({ total: row(100) }) > 0, true);
    check("a summary missing one of the thirteen fails", reasons(summaryOf(100, THIRTEEN.slice(1))), 1);
    check("a summary with an unknown total fails", reasons({ ...summaryOf(100), total: { ...row(100), lines: cell("Unknown") } }), 1);
    check("a read summary counts its files and names the thirteen", [coverageRead(summaryOf(100)).files, Object.keys(coverageRead(summaryOf(100)).thirteen).length], [13, 13]);
  }
  // A commit is the one named: its subject, its parent, its paths and exactly one trailer.
  {
    const good = { subject: "docs(90-01): record the mutation base", parents: ["p"], files: ["a", "b"], body: `docs(90-01): record the mutation base\n\nbody\n\n${TRAILER}\n` };
    const want = { subject: good.subject, parent: "p", files: ["b", "a"] };
    check("a commit with the subject, parent, paths and trailer passes", commitReasons(good, want).length, 0);
    check("a commit with another subject fails", commitReasons({ ...good, subject: "x" }, want).length, 1);
    check("a commit with another parent fails", commitReasons({ ...good, parents: ["q"] }, want).length, 1);
    check("a commit with an extra path fails", commitReasons({ ...good, files: ["a", "b", "c"] }, want).length, 1);
    check("a commit with no trailer fails", commitReasons({ ...good, body: "body\n" }, want).length, 1);
    check("a commit with a second trailer fails", commitReasons({ ...good, body: `${TRAILER}\nCo-Authored-By: Other <o@example.com>\n` }, want).length, 1);
    check("a commit with a different trailer fails", commitReasons({ ...good, body: "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>\n" }, want).length, 1);
    check("a commit whose trailer is not last fails", commitReasons({ ...good, body: `${TRAILER}\nafter\n` }, want).length, 1);
  }
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused before its
  // run, a clean one runs, and compare, probe and landed never read the status.
  const planted = ` M ${F}\n`;
  check("a modified file refuses a record", dirtyReasons(planted).length === 1 && dirtyReasons(planted)[0].includes(F) && dirtyReasons("").length === 0, true);
  for (const [mode, args, status, want] of [
    ["record", ["base"], planted, "refused"],
    ["record", ["close"], planted, "refused"],
    ["record", ["base"], "", "ran"],
    ["record", ["close", "--restart"], "", "ran"],
    ["coverage", ["base"], planted, "refused"],
    ["coverage", ["close"], "", "ran"],
    ["compare", [], planted, "ran"],
    ["probe", [], planted, "ran"],
    ["landed", ["base"], planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([name, v]) => [name, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, args, () => status, () => { got = "refused"; });
    check(`${mode} ${args.join(" ")} on ${JSON.stringify(status)}`, got, want);
  }
  check("the status a record reads covers packages and the Stryker config", statusPaths().join(), `packages,${CONFIG}`);
  check("the status reader reads the paths a record reads", gitStatus.toString(), '() => git("status", "--porcelain", "--", ...statusPaths())');
  // The invocation and the constants.
  check("the invocation is the thirteen files without bail", invocation(), `pnpm exec stryker run stryker.config.mjs --mutate ${THIRTEEN.join(",")}`);
  check("the thirteen files are in the order the phase names them", THIRTEEN.map((f) => f.split("/").pop().replace(".ts", "")).join(), "PortName,Ports,PortMetrics,PortAccess,PortDescription,PortDerivation,AttributeResolver,RelationshipResolver,CustomPredicate,DecisionHistory,SignatureHistory,LeafNeeds,ScopedLeaf");
  check("any of the thirteen may be absent from a report", MAY_BE_ABSENT.length, 13);
  check("MOVED names the fixture arrow and the two route ternaries", MOVED.length === 3 && MOVED.every((x) => x.code !== "" && x.from !== "" && x.to !== ""), true);
  check("UNMEASURED_WHY is stated", UNMEASURED_WHY.trim() !== "", true);
  check("the four landed subjects are plan subjects", Object.values(SUBJECTS).every((s) => PLAN_SUBJECT.test(s)), true);
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: { clean: true, run: (name, flag) => ((name === "base" && flag === undefined) || (name === "close" && (flag === undefined || flag === "--restart")) ? recordMode(name, flag === "--restart") : usage()) },
  coverage: { clean: true, run: (name) => coverageMode(name) },
  landed: { clean: false, run: (what) => landed(what) },
  probe: { clean: false, run: () => probe() },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 90-mutation.mjs record base | record close [--restart] | coverage base|close | landed base|coverage-base|close|coverage-close | probe | compare | --self-test"]);
/** Runs `mode`, refusing first when it records and `status` shows a read file modified. */
function dispatch(modes, mode, args, status, refuse) {
  const entry = Object.hasOwn(modes, mode) ? modes[mode] : undefined;
  if (entry === undefined) return usage();
  if (entry.clean) {
    const bad = dirtyReasons(status());
    if (bad.length > 0) return refuse(bad);
  }
  return entry.run(...args);
}

// Every mode runs from the repository root, in the phase directory this file sits in.
if (realpathSync(process.cwd()) !== realpathSync(git("rev-parse", "--show-toplevel").trim())) fail(["run this from the repository root"]);
if (!basename(dirname(SELF)).startsWith("QD-90-")) fail([`${SELF} is not in a QD-90- directory`]);
const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
