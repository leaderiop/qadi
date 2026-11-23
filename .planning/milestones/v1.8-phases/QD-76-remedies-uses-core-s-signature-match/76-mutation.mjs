// The mutation record over the source files the remedy table's use of core's signature and acted judgements touches,
// one Stryker group per package: `core` (`SignatureHistory.ts`, `SignatureMatch.ts`, `PortAccess.ts`,
// `DecisionHistory.ts`, `Errors.ts`, through `stryker.config.mjs`), `devtools` (`Remedies.ts`, `SimulationFields.ts`,
// through `stryker.devtools.mjs`) and `http` (`QadiHttpError.ts`, through `stryker.http.mjs`). Each of those three has a
// base. The fourth group, `keys`, is close-only: `PortKey.ts`, `ScopedLeaf.ts`, `LeafNeeds.ts` and `PortDerivation.ts` were
// not in the base record, because the phase changed them only after the code review (the guarded read, the one
// resource-id check), so there is no base for them to be compared with. It is measured through `stryker.config.mjs`,
// the core test project, over the lines the phase changed in them, and its rule is that every valid mutant is killed and
// every Ignored mutant is admitted through `EXAMINED`. `Errors.ts` and `QadiHttpError.ts` are measured because the
// signature and history errors gain optional members there, which is how a refused request fails typed rather than
// throwing (ADR-QD-189).
// `record base|close <group>`
// reads the group's report and writes, under that group in `76-mutation-base.json` or `76-mutation-close.json`, each
// file's counts and its open (Survived, NoCoverage) and Ignored mutants; every group of one record is measured on one
// commit, and `record close <group> --restart` starts a fresh close record at the current head and names the
// groups it dropped, for a re-close after a fix commit (a base is never restarted). `compare` judges each group by
// the rule below. The rule (the removed-mutant rule): a score that fell only because killed mutants were deleted
// passes, a new open mutant (Survived or NoCoverage)
// never does, and neither does a new Ignored mutant. A mutant is located by its line number carried through `git diff
// -U0 <base head> <close head>`, never by the text of its line, and every comparison counts mutants as a multiset, so a
// second copy of one is a new one. `record` refuses a tree where a file it reads differs from HEAD, through a
// dispatcher the self-test drives. `--self-test` drives the comparison with planted records. From the repository root,
// after the group's INVOCATION (stdin closed, nothing else running):
//   node .planning/phases/QD-76-remedies-uses-core-s-signature-match/76-mutation.mjs record base core
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-76-remedies-uses-core-s-signature-match/";
const R = "packages/core/src/";
const V = "packages/devtools/src/model/";
const H = "packages/http/src/";
const GROUPS = {
  core: {
    config: "stryker.config.mjs",
    report: "reports/mutation/mutation.json",
    files: [`${R}SignatureHistory.ts`, `${R}SignatureMatch.ts`, `${R}PortAccess.ts`, `${R}DecisionHistory.ts`, `${R}Errors.ts`],
  },
  devtools: {
    config: "stryker.devtools.mjs",
    report: "reports/mutation-devtools/mutation.json",
    files: [`${V}Remedies.ts`, `${V}SimulationFields.ts`],
  },
  http: {
    config: "stryker.http.mjs",
    report: "reports/mutation-http/mutation.json",
    files: [`${H}QadiHttpError.ts`],
  },
  keys: {
    config: "stryker.config.mjs",
    report: "reports/mutation/mutation.json",
    files: [`${R}PortKey.ts`, `${R}ScopedLeaf.ts`, `${R}LeafNeeds.ts`, `${R}PortDerivation.ts`],
    // Each file is mutated only where this phase wrote it: the `+` side of `git diff -U0 bf339146 HEAD -- <file>`
    // (`PortKey.ts` 56, 79-84, 87-90, 134-137, 212 and 215-246; `ScopedLeaf.ts` 2-3, 5-6, 14-19, 24-25 and 47-75;
    // `LeafNeeds.ts` 22, 199 and 240-248, the whole of `errorOf`, whose body block starts on a written line; `PortDerivation.ts` 36 and 111-113). These ranges must follow the file if it
    // changes: re-derive them from that diff, never by editing a range to cover a line that survives. Stryker keeps a
    // mutant only when its whole node lies inside a range, so a node that starts on a written line and runs past it
    // (a function body, an overload's implementation) is left to the by-hand run over the whole file.
    mutate: [
      `${R}PortKey.ts:56-56`,
      `${R}PortKey.ts:79-84`,
      `${R}PortKey.ts:87-90`,
      `${R}PortKey.ts:134-137`,
      `${R}PortKey.ts:212-212`,
      `${R}PortKey.ts:215-246`,
      `${R}ScopedLeaf.ts:2-3`,
      `${R}ScopedLeaf.ts:5-6`,
      `${R}ScopedLeaf.ts:14-19`,
      `${R}ScopedLeaf.ts:24-25`,
      `${R}ScopedLeaf.ts:47-75`,
      `${R}LeafNeeds.ts:22-22`,
      `${R}LeafNeeds.ts:199-199`,
      `${R}LeafNeeds.ts:240-248`,
      `${R}PortDerivation.ts:36-36`,
      `${R}PortDerivation.ts:111-113`,
    ],
    closeOnly: true,
  },
};
const invocation = (group) => `pnpm exec stryker run ${GROUPS[group].config} --mutate ${(GROUPS[group].mutate ?? GROUPS[group].files).join(",")}`;
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
/** The porcelain status of the files a group's record reads. */
const gitStatus = (group) => git("status", "--porcelain", "--", ...GROUPS[group].files);

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
/**
 * Ignored mutants a close may hold beyond its base, per file and kind, each run by hand and detected there: the group's
 * config spread with `ignoreStatic: false`, run with the group's `--mutate` list (the whole files, for `keys`). None is
 * admitted at the base. The close admits one for each of these, each Killed by hand on a line the phase wrote
 * (`76-RED-EVIDENCE.md`, "The close after code review"): `SignatureHistory.ts` (the static arrow of the expression-bodied
 * export `signatureAnswerFromSignatures`), `SignatureMatch.ts` (`signatureAnswerOf`), `DecisionHistory.ts`
 * (`actedAnswerFromEvents`), `Remedies.ts` (the module-scope refusal sentences, the dispatch table `remedyFor` and its
 * arm closures, which the table's rewrite counts under kinds the base held fewer of: 16 static arrows and 2 object
 * literals more than the base) and, in the close-only `keys` group, `PortKey.ts` (the three static arrows of the guarded
 * reads `readGuarded`, `readRows` and `unreadable`, which are expression-bodied exports and a module-scope helper).
 */
const EXAMINED = { "packages/core/src/SignatureHistory.ts": { "ArrowFunction () => undefined": 1 }, "packages/core/src/SignatureMatch.ts": { "ArrowFunction () => undefined": 1 }, "packages/core/src/DecisionHistory.ts": { "ArrowFunction () => undefined": 1 }, "packages/devtools/src/model/Remedies.ts": { "ArrowFunction () => undefined": 16, "ObjectLiteral {}": 2 }, "packages/core/src/PortKey.ts": { "ArrowFunction () => undefined": 3 } };
/**
 * Open mutants a rewrite moved, per file: each entry names a base survivor on a line the diff rewrote, the close
 * survivor it became, and why no test can kill it. An entry admits its close mutant only while the base mutant is in
 * the base record on a rewritten line and the close mutant is in the close record; otherwise the entry is a reason.
 */
const MOVED = {
  "packages/core/src/SignatureHistory.ts": [
    {
      base: { status: "Survived", mutator: "ConditionalExpression", replacement: "false", line: 366, column: 11 },
      close: { status: "Survived", mutator: "ConditionalExpression", replacement: "false", line: 380, column: 17 },
      why: "the one equivalent survivor the base held, `row.resourceId === undefined ? undefined : makeResourceId(row.resourceId)`: `makeResourceId` is `Brand.nominal`, the identity, so forcing the test false calls it on `undefined` and returns `undefined`, the value the true branch gives. The code review rewrote the line (the row's fields are read through one guarded read), so `compare` no longer carries it. It stays because the type of `pairKey`'s argument admits no unbranded `undefined`, so no cast-free read can drop the test.",
    },
  ],
};

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
    const all = report[file].mutants.map((m) => ({ status: m.status, mutator: m.mutatorName, replacement: m.replacement, line: m.location.start.line, column: m.location.start.column }));
    const count = (status) => all.filter((m) => m.status === status).length;
    const detected = all.filter((m) => DETECTED.has(m.status)).length;
    const open = all.filter((m) => OPEN.has(m.status));
    const valid = detected + open.length;
    out[file] = { killed: count("Killed"), timeout: count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), ignored: count("Ignored"), detected, valid, open, ignoredMutants: all.filter((m) => m.status === "Ignored") };
    console.log(`${file} ${detected}/${valid} survived ${out[file].survived} no coverage ${out[file].noCoverage} ignored ${out[file].ignored}`);
    for (const m of open) console.log(`  ${m.status} ${file}:${m.line} ${m.mutator} -> ${m.replacement}`);
  }
  return out;
};

/**
 * Every reason the close fails, given the two records and each file's `git diff -U0 <base head> <close head>`. Pure.
 * A fall in the score is a reason only when the file also has a new open mutant: a score that fell because the code
 * holding killed mutants was deleted passes, and any new Survived or NoCoverage mutant fails.
 */
export const judge = ({ base, close, diffs }, files, log = console.log, examined = EXAMINED, moved = {}) => {
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
    const allowedOpen = bag(b.open, atBase);
    for (const e of moved[file] ?? []) {
      const inBase = b.open.some((x) => key(x) === key(e.base));
      if (!inBase || toClose(e.base.line) !== undefined) {
        bad.push(`${file}: a MOVED entry names no base survivor on a rewritten line: ${e.base.line}`);
      } else if (!c.open.some((x) => key(x) === key(e.close))) {
        bad.push(`${file}: a MOVED entry the close no longer needs: ${e.close.line}`);
      } else allowedOpen.set(key(e.close), (allowedOpen.get(key(e.close)) ?? 0) + 1);
    }
    const open = beyond(c.open, (x) => key(x), allowedOpen);
    if (fell && open.length > 0) bad.push(`${file} fell from ${b.detected}/${b.valid} to ${c.detected}/${c.valid}`);
    for (const m of open) bad.push(`${file}:${m.line} has a new ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    // An Ignored (static) mutant never runs, so where it sits tests nothing: a line the phase rewrites moves its static
    // arrow without adding a mutant, and no test can kill one. The rule is per kind: a file holds no more Ignored
    // mutants of a kind than its base did, plus what EXAMINED records as run by hand.
    const allowed = bag(b.ignoredMutants, kind);
    for (const [k, n] of Object.entries(examined[file] ?? {})) allowed.set(k, (allowed.get(k) ?? 0) + n);
    const fresh = beyond(c.ignoredMutants, kind, allowed);
    for (const m of fresh) bad.push(`${file}:${m.line} has a new Ignored mutant: ${m.mutator} -> ${m.replacement}`);
    for (const [k, n] of Object.entries(examined[file] ?? {})) {
      const grew = c.ignoredMutants.filter((x) => kind(x) === k).length - b.ignoredMutants.filter((x) => kind(x) === k).length;
      if (grew < n) bad.push(`${file} no longer holds the ${n} examined Ignored ${k} mutant(s) EXAMINED allows: remove the entry`);
    }
    log(`${file} ${b.detected}/${b.valid} -> ${c.detected}/${c.valid}, survived ${b.survived} -> ${c.survived}, no coverage ${b.noCoverage} -> ${c.noCoverage}, ignored ${b.ignored} -> ${c.ignored} (${fresh.length} new)${fell && open.length === 0 ? ", killed mutants removed" : ""}`);
  }
  return bad;
};

/**
 * Every reason a close-only file fails: it has no base, so it may hold no open mutant and no Ignored mutant that
 * `examined` does not admit by kind, and `examined` may hold no entry it has outgrown. Pure.
 */
export const judgeNew = ({ close }, files, log = console.log, examined = EXAMINED) => {
  const bad = [];
  for (const file of files) {
    const c = close.files[file];
    if (c === undefined) {
      bad.push(`${file} is missing from the close record`);
      continue;
    }
    for (const m of c.open) bad.push(`${file}:${m.line} is new and has a ${m.status} mutant: ${m.mutator} -> ${m.replacement}`);
    const admitted = Object.entries(examined[file] ?? {});
    const fresh = beyond(c.ignoredMutants, kind, new Map(admitted));
    for (const m of fresh) bad.push(`${file}:${m.line} is new and has an unexamined Ignored mutant: ${m.mutator} -> ${m.replacement}`);
    for (const [k, n] of admitted) {
      if (c.ignoredMutants.filter((x) => kind(x) === k).length < n) bad.push(`${file} no longer holds the ${n} examined Ignored ${k} mutant(s) EXAMINED allows: remove the entry`);
    }
    log(`${file} ${c.detected}/${c.valid}, survived ${c.survived}, no coverage ${c.noCoverage}, ignored ${c.ignored} (${fresh.length} unexamined)`);
  }
  return bad;
};

/**
 * The record a `record` writes into, the reasons it may not, and the groups a restart dropped. Pure. `restart` is for a
 * close only: it keeps no group of the old record, so a re-close after a fix commit is measured on one commit again.
 */
export const heldFor = (held, name, group, head, restart) => {
  if (restart && name !== "close") return { held, bad: ["--restart re-measures a close, never a base"], dropped: [] };
  if (restart) return { held: { phase: "76", groups: {} }, bad: [], dropped: Object.keys(held.groups).filter((other) => other !== group) };
  const out = `${D}76-mutation-${name}.json`;
  const bad = Object.entries(held.groups)
    .filter(([other, entry]) => other !== group && entry.head !== head)
    .map(([other, entry]) => `${out} holds ${other} measured on ${entry.head}, not ${head}: every group of a record is measured on one commit`);
  return { held, bad, dropped: [] };
};

const record = async (name, group, restart) => {
  const { config: CONFIG, report: REPORT, files: FILES, closeOnly } = GROUPS[group];
  if (name === "base" && closeOnly === true) return usage();
  const config = (await import(pathToFileURL(resolve(CONFIG)).href)).default;
  if (config.jsonReporter?.fileName !== REPORT) fail([`${CONFIG} no longer reports to the report this reads`]);
  if (config.ignoreStatic !== true) fail([`${CONFIG} no longer sets ignoreStatic: true`]);
  const head = git("rev-parse", "HEAD").trim();
  const out = `${D}76-mutation-${name}.json`;
  const { held, bad, dropped } = heldFor(existsSync(out) ? readJson(out) : { phase: "76", groups: {} }, name, group, head, restart);
  if (bad.length > 0) fail(bad);
  if (dropped.length > 0) console.log(`restarted the close record at ${head}; re-measure: ${dropped.join(", ")}`);
  const files = tally(REPORT, FILES);
  held.groups[group] = { head, invocation: invocation(group), files };
  writeFileSync(out, `${JSON.stringify(held, null, 1)}\n`);
  console.log(`wrote ${group} into ${out}`);
};

const compare = () => {
  const bad = [];
  const baseRecord = readJson(`${D}76-mutation-base.json`);
  const closeRecord = readJson(`${D}76-mutation-close.json`);
  for (const group of Object.keys(GROUPS)) {
    const { files, closeOnly } = GROUPS[group];
    const base = baseRecord.groups[group];
    const close = closeRecord.groups[group];
    if (closeOnly === true) {
      if (close === undefined) {
        bad.push(`the ${group} group is missing from the close record`);
        continue;
      }
      if (close.invocation !== invocation(group)) bad.push(`a ${group} record was not made by the recorded invocation`);
      bad.push(...judgeNew({ close }, files));
      continue;
    }
    if (base === undefined || close === undefined) {
      bad.push(`the ${group} group is missing from a record`);
      continue;
    }
    if (base.invocation !== invocation(group) || close.invocation !== invocation(group)) bad.push(`a ${group} record was not made by the recorded invocation`);
    const diffs = Object.fromEntries(files.map((file) => [file, git("diff", "-U0", base.head, close.head, "--", file)]));
    bad.push(...judge({ base, close, diffs }, files, console.log, EXAMINED, MOVED));
  }
  if (bad.length > 0) fail(bad);
  console.log("no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants");
};

const selfTest = () => {
  const m = (status, line, extra = {}) => ({ status, mutator: "StringLiteral", replacement: '""', line, column: 4, ...extra });
  const file = (detected, valid, open = [], ignoredMutants = []) => ({
    detected,
    valid,
    open,
    survived: open.filter((x) => x.status === "Survived").length,
    noCoverage: open.filter((x) => x.status === "NoCoverage").length,
    ignored: ignoredMutants.length,
    ignoredMutants,
  });
  const F = `${R}SignatureHistory.ts`;
  // Base: one survivor on line 10, a static mutant Ignored on line 3; the close rewrote lines 9 to 11 into 9 to 10, so
  // line 3 stays line 3 and line 20 becomes line 19.
  const diffs = { [F]: "@@ -9,3 +9,2 @@\n-a\n-b\n-c\n+x\n+y\n" };
  const base = { files: { [F]: file(42, 43, [m("Survived", 20)], [m("Ignored", 3)]) } };
  const closeOf = (f) => ({ files: { [F]: f } });
  const cases = [
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
  ];
  let passed = 0;
  const planted = ` M ${F}\n`;
  if (dirtyReasons(planted).length !== 1 || !dirtyReasons(planted)[0].includes(F) || dirtyReasons("").length !== 0) fail(["self-test FAILED: a modified file does not refuse a record"]);
  passed++;
  for (const [name, close, want] of cases) {
    const got = judge({ base, close, diffs }, [F], () => {}, {}).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // An examined allowance admits exactly its count of Ignored mutants of its kind, and a stale one fails.
  for (const [name, close, want] of [
    ["an examined Ignored mutant is not new", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9)])), 0],
    ["a second Ignored mutant beyond the examined one fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3), m("Ignored", 9), m("Ignored", 11)])), 1],
    ["an examined allowance the close no longer needs fails", closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), 1],
  ]) {
    const got = judge({ base, close, diffs }, [F], () => {}, { [F]: { [kind(m("Ignored", 3))]: 1 } }).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // A MOVED entry admits exactly the close survivor a rewrite made of a base survivor, and a stale entry fails.
  {
    const rewritten = { files: { [F]: file(42, 43, [m("Survived", 10)], [m("Ignored", 3)]) } };
    const entry = (b, c) => ({ [F]: [{ base: m("Survived", b), close: m("Survived", c), why: "planted" }] });
    for (const [name, b, close, moved, want] of [
      ["a survivor a rewrite moved, named in MOVED, is not new", rewritten, closeOf(file(42, 43, [m("Survived", 9)], [m("Ignored", 3)])), entry(10, 9), 0],
      ["the same moved survivor without its MOVED entry fails", rewritten, closeOf(file(42, 43, [m("Survived", 9)], [m("Ignored", 3)])), {}, 1],
      ["a MOVED entry whose base line the diff did not rewrite fails", base, closeOf(file(42, 43, [m("Survived", 19)], [m("Ignored", 3)])), entry(20, 19), 1],
      ["a MOVED entry the close no longer needs fails", rewritten, closeOf(file(43, 43, [], [m("Ignored", 3)])), entry(10, 9), 1],
    ]) {
      const got = judge({ base: b, close, diffs }, [F], () => {}, {}, moved).length;
      if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
      passed++;
    }
  }
  // The real MOVED entry: the base survivor it names is in the base record on a line the review's diff rewrote, and it
  // admits exactly its close survivor, so it cannot go stale or widen unnoticed.
  {
    const f = `${R}SignatureHistory.ts`;
    const entry = MOVED[f][0];
    const at = (line, column) => ({ ...entry.base, line, column });
    const b = { files: { [f]: file(71, 72, [at(366, 11)]) } };
    const dd = { [f]: "@@ -361,6 +363,31 @@\n" };
    const baseHolds = readJson(`${D}76-mutation-base.json`).groups.core.files[f].open.some((x) => key(x) === key(entry.base));
    for (const [name, got, want] of [
      ["the real MOVED entry names a survivor the base record holds", baseHolds ? 0 : 1, 0],
      ["the real MOVED entry admits its close survivor", judge({ base: b, close: { files: { [f]: file(99, 100, [at(380, 17)]) } }, diffs: dd }, [f], () => {}, {}, MOVED).length, 0],
      ["the same close survivor without the entry fails", judge({ base: b, close: { files: { [f]: file(99, 100, [at(380, 17)]) } }, diffs: dd }, [f], () => {}, {}, {}).length, 1],
      ["the real MOVED entry admits no other survivor", judge({ base: b, close: { files: { [f]: file(99, 100, [at(380, 17), at(381, 17)]) } }, diffs: dd }, [f], () => {}, {}, MOVED).length, 1],
    ]) {
      if (got !== want) fail([`self-test FAILED: ${name}: ${got}, wanted ${want}`]);
      passed++;
    }
  }
  // A fall with no new open mutant: the killed mutants went with the code that held them.
  {
    const logged = [];
    const got = judge({ base, close: closeOf(file(30, 31, [m("Survived", 19)], [m("Ignored", 3)])), diffs }, [F], (line) => logged.push(line), {}).length;
    if (got !== 0 || !logged.join("\n").includes("killed mutants removed")) fail([`self-test FAILED: a fall with no new open mutant passes as killed mutants removed: ${got} reasons, logged ${JSON.stringify(logged)}`]);
    passed++;
  }
  // A close-only file has no base: an open mutant fails, an Ignored mutant fails unless EXAMINED admits its kind, and an
  // EXAMINED entry the file no longer needs fails.
  const examinedOne = { [F]: { [kind(m("Ignored", 3))]: 1 } };
  for (const [name, close, examined, want] of [
    ["a close-only file with no open and no Ignored mutant passes", closeOf(file(10, 10)), {}, 0],
    ["a close-only file with a Survived mutant fails", closeOf(file(9, 10, [m("Survived", 5)])), {}, 1],
    ["a close-only file with a NoCoverage mutant fails", closeOf(file(9, 10, [m("NoCoverage", 5)])), {}, 1],
    ["a close-only file missing from the close fails", { files: {} }, {}, 1],
    ["a close-only file with an unexamined Ignored mutant fails", closeOf(file(10, 10, [], [m("Ignored", 3)])), {}, 1],
    ["a close-only file whose Ignored mutant EXAMINED admits by kind passes", closeOf(file(10, 10, [], [m("Ignored", 3)])), examinedOne, 0],
    ["a close-only file holding fewer Ignored mutants of a kind than EXAMINED admits fails", closeOf(file(10, 10)), examinedOne, 1],
  ]) {
    const got = judgeNew({ close }, [F], () => {}, examined).length;
    if (got !== want) fail([`self-test FAILED: ${name}: ${got} reasons, wanted ${want}`]);
    passed++;
  }
  // The record a record writes into: one beside a group measured on another commit is refused, a restart of a close
  // drops the old record and names what it dropped, and a base is never restarted.
  const held = { phase: "76", groups: { devtools: { head: "a" } } };
  for (const [name, got, want] of [
    ["a record beside a group measured on another commit is refused", heldFor(held, "base", "core", "b", false).bad.length, 1],
    ["a record beside a group measured on the same commit keeps it", heldFor(held, "base", "core", "a", false).bad.length + (heldFor(held, "base", "core", "a", false).held.groups.devtools === undefined ? 1 : 0), 0],
    ["--restart on a close starts a fresh record and names what it dropped", (() => { const r = heldFor(held, "close", "core", "b", true); return r.bad.length + Object.keys(r.held.groups).length + (r.dropped.join() === "devtools" ? 0 : 1); })(), 0],
    ["--restart on a base is refused", heldFor(held, "base", "core", "b", true).bad.length, 1],
  ]) {
    if (got !== want) fail([`self-test FAILED: ${name}: ${got}, wanted ${want}`]);
    passed++;
  }
  // The dispatcher with this file's own table, every mode's run replaced: a record from a modified tree is refused
  // before its run, a clean one runs, and compare never reads the status.
  for (const [mode, status, want] of [
    ["record", planted, "refused"],
    ["record", "", "ran"],
    ["compare", planted, "ran"],
  ]) {
    let got = "nothing";
    const stubs = Object.fromEntries(Object.entries(MODES).map(([k, v]) => [k, { ...v, run: () => { got = "ran"; } }]));
    dispatch(stubs, mode, ["base", "core"], () => status, () => { got = "refused"; });
    if (got !== want) fail([`self-test FAILED: ${mode} on ${JSON.stringify(status)}: ${got}, wanted ${want}`]);
    passed++;
  }
  for (const group of Object.keys(GROUPS).filter((g) => GROUPS[g].closeOnly !== true)) {
    const asked = [];
    dispatch(MODES, "record", ["base", group], (g) => { asked.push(g); return planted; }, () => {});
    if (asked.join() !== group) fail([`self-test FAILED: a ${group} record read the status of ${asked.join() || "nothing"}`]);
    passed++;
  }
  if (gitStatus.toString() !== '(group) => git("status", "--porcelain", "--", ...GROUPS[group].files)') fail(["self-test FAILED: the status reader does not read the files a record reads"]);
  passed++;
  console.log(`self-test: ${passed} passed`);
};

/** Each mode, whether it refuses a tree whose read files differ from HEAD, and its run. */
const MODES = {
  record: { clean: true, run: (name, group, flag) => ((name === "base" || name === "close") && Object.hasOwn(GROUPS, group) && (flag === undefined || flag === "--restart") ? record(name, group, flag === "--restart") : usage()) },
  compare: { clean: false, run: () => compare() },
  "--self-test": { clean: false, run: () => selfTest() },
};
const usage = () => fail(["usage: node 76-mutation.mjs record base|close core|devtools|http|keys [--restart] (keys has no base), compare, or --self-test"]);
/** Runs `mode`, refusing first when it records and `status` shows a read file modified. */
function dispatch(modes, mode, args, status, refuse) {
  const entry = Object.hasOwn(modes, mode) ? modes[mode] : undefined;
  if (entry === undefined) return usage();
  if (entry.clean) {
    if (!Object.hasOwn(GROUPS, args[1] ?? "")) return usage();
    const bad = dirtyReasons(status(args[1]));
    if (bad.length > 0) return refuse(bad);
  }
  return entry.run(...args);
}

const [mode, ...args] = process.argv.slice(2);
await dispatch(MODES, mode, args, gitStatus, fail);
