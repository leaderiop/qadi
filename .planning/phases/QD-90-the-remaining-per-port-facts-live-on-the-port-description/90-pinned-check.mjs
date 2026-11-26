// The check that every existing test keeps its text, apart from the declared lines and the files the phase wrote.
//
// Each file is compared with its text at `phase_base` (the field of `90-mutation-base.json` in this directory). Three kinds:
//   held      every path `git ls-tree -r` lists at the base under `packages/core/test`, `packages/http/test`,
//             `packages/testing/test`, `packages/devtools/test` and `features`, except the declared test files, and
//             `packages/core/src/PortServing.ts`, byte for byte, line endings included. The set is computed from the base and
//             never listed here, so a test the base holds cannot be left out by omission. A file added under those
//             directories later is not held: new tests are the phase's own. A held file that is moved or missing is a reason.
//   declared  five files, each changed only on the base lines its region names. A region is the exact range `[first, last]`
//             of base lines (1-based, inclusive; `last = first - 1` is an insertion between two lines, whose own text is fixed
//             by `lines`). Each region also names the text its first and last base line start with, so a wrong constant fails
//             here instead of passing. A declared file is judged in two steps: the commit that declares it (found by its exact
//             subject, one commit since the base) holds the base text on every line outside the regions, and the file at HEAD
//             equals that commit's text byte for byte, or, when the entry lists `amendments`, the last amendment's text: each
//             amendment is one later commit, found by its exact subject, that holds the text before it on every line outside
//             its own regions (numbered in that earlier text, anchored the same way), in the listed order. An amendment whose
//             commit does not exist yet ends the chain there (with `--all-applied`, that is a reason). Before the commit exists the file is held, as a base file. The two
//             source declarations (`LeafNeeds.ts`, `ScopedLeaf.ts`) apply only when `90-BENCH.md`'s gate of record passed; when
//             it failed they are held and no declared edit is expected of them.
//   born      files written by a commit of this phase, each held against the text that commit gave it:
//               - the characterisation, outside its import region;
//               - the type pins, outside their import region, with lines appended after the born text allowed;
//               - the bench file, whole;
//               - the review round's type pins and its test rows (`PortFacts.review.tst.ts`, `PortFacts.review.test.ts`), each
//                 whole, added by one commit of that round;
//               - the mutation test file, whole, only when it exists: one commit since the base adds it, under the one subject
//                 that may, and holds exactly it.
//             An import region is a constant range of the born text, checked to be the span of that text's top-level import
//             declarations. At HEAD it starts at the same line and ends at the last line of the last top-level import
//             declaration, read from the syntax tree; a top-level statement that is not an import, or a line that no import
//             covers, inside it is a reason. The text before the region is compared byte for byte, and the text after it line by
//             line from the region's end, so a block that grew shifts the lines after it and widens nothing.
// A held, declared or born file that `git diff -M --name-status <phase_base>` reports as moved or deleted fails, naming both
// paths for a move.
//
// From the repository root:
//   node <this directory>/90-pinned-check.mjs
//   node <this file> --all-applied   (also requires every declared commit to exist and every born file to be added)
//   node <this file> --self-test
//
// Shortcuts: the syntax tree comes from `typescript/unstable/sync` through a child process (the way
// `scripts/lib/module-state-scan.mjs` reads a file), over the texts written into a temporary project; the child names no
// type, so a text that does not parse is read as the parser recovers it. Run once per check; a failure to start the server
// fails the check.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { nameServerPids, runTypescriptChild } from "../../../scripts/lib/typescript-server-child.mjs";

const SELF = fileURLToPath(import.meta.url);
const DIR = dirname(SELF);
const NAME = "90-pinned-check.mjs";

/** The directories whose every file at the base is held, less the declared ones. */
const PREFIXES = ["packages/core/test", "packages/http/test", "packages/testing/test", "packages/devtools/test", "features"];
/** Source held beside the tests: the serving declaration stays hand-written. */
const HELD_SOURCE = ["packages/core/src/PortServing.ts"];

const CORE_TEST = "packages/core/test";
const CORE_SRC = "packages/core/src";

/** The declared files, the exact base lines of each region, and the one commit subject that declares each. */
const DECLARED = [
  {
    file: `${CORE_TEST}/LeafNeeds.test.ts`,
    subject: "test(90-04): hold the scoped read to its leaf rows",
    regions: [
      { first: 9, last: 43, top: 'import { assert, describe, it } from "@effect/vitest";', bottom: 'import { subjectWith } from "./helpers.ts";' },
      { first: 133, last: 160, top: 'describe("a row\'s resourceId is what readScoped does (D-06)", () => {', bottom: "});" },
    ],
  },
  {
    file: `${CORE_TEST}/PortName.tst.ts`,
    subject: "feat(90-10)!: a port description states its own span name",
    regions: [
      { first: 1, last: 8, top: "/**", bottom: " */" },
      { first: 10, last: 12, top: 'import { attributeResolverPort } from "../src/AttributeResolver.ts";', bottom: 'import type { PortName, PortSpanName, PortSpanOf } from "../src/PortName.ts";' },
      { first: 32, last: 39, top: 'test("a description\'s span is its own port\'s, and no other", () => {', bottom: "});" },
    ],
  },
  {
    file: `${CORE_TEST}/PortDescription.test.ts`,
    subject: "feat(90-11)!: a port description states its own fixture",
    regions: [{ first: 121, last: 120, top: "};", bottom: '  none: { name: "ProbeNone", answer: undefined },', lines: ["  fixture: () => named(undefined, 0),"] }],
  },
  {
    file: `${CORE_SRC}/LeafNeeds.ts`,
    subject: "refactor(90-12): route every scoped read off its leaf row",
    source: true,
    regions: [{ first: 44, last: 48, top: "  /**", bottom: "   */" }],
    amendments: [
      {
        // absenceOf's own-action test is `isActionLeaf` alone; its unreachable `MISSING_ACTION` arm is gone.
        subject: "fix(90-review): kill the base survivors that a test can reach",
        regions: [{ first: 223, last: 226, top: "  const need = LEAF_NEEDS[leaf._tag];", bottom: "  }" }],
      },
    ],
  },
  {
    file: `${CORE_SRC}/ScopedLeaf.ts`,
    subject: "refactor(90-12): route every scoped read off its leaf row",
    source: true,
    regions: [{ first: 8, last: 19, top: " * `DecisionHistory` and `SignatureHistory` leave `resourceId` optional in their", bottom: " * port modules would close a cycle through them." }],
  },
];

/** The born files: the commit that gives each its text, and what may differ from it. `adds`: the commit adds the file. */
const BORN = [
  { file: `${CORE_TEST}/PortFacts.characterisation.test.ts`, subject: "test(90-03): pin the port facts on the base", adds: true, imports: { first: 24, last: 61 }, appended: false },
  { file: `${CORE_TEST}/PortFacts.tst.ts`, subject: "test(90-04): pin the moved port types on the base", adds: true, imports: { first: 11, last: 20 }, appended: true },
  { file: "packages/core/bench/Evaluate.bench.ts", subject: "test(90-06): add the scoped-heavy bench workloads", adds: false },
  { file: `${CORE_TEST}/PortFacts.review.tst.ts`, subject: "fix(90-review): refuse a union span name at the registry", adds: true },
  { file: `${CORE_TEST}/PortFacts.review.test.ts`, subject: "fix(90-review): kill the base survivors that a test can reach", adds: true },
];

/** The one born file that may exist later, whole, added by one commit under one subject. */
const MUTATION = { file: `${CORE_TEST}/PortFacts.mutation.test.ts`, subject: "test(90-13): kill the surviving port facts mutants" };

// ---- pure judges ----

/** The 1-based number of the first line two lists of lines disagree on, or 0 when they do not. */
const firstDifference = (a, b) => {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i + 1;
  return 0;
};

const sameLines = (a, b) => a.length === b.length && a.every((line, i) => line === b[i]);

/** How many lines of `seg` equal the lines of `C` from index `j`, counting from the start of `seg`. */
const common = (C, seg, j) => {
  let t = 0;
  while (t < seg.length && C[j + t] === seg[t]) t += 1;
  return t;
};

/** The held paths: what `git ls-tree` printed at the base, less the declared test files. Pure. */
const heldFrom = (paths, declaredFiles) => paths.filter((path) => path !== "" && !declaredFiles.includes(path));

/** The reasons `current` is not `base`, byte for byte. Pure. */
const judgeHeld = (file, base, current) =>
  base === current ? [] : [`${file}: differs from its base text at line ${firstDifference(base.split("\n"), current.split("\n")) || 1}`];

/** The reasons a file that two texts may hold is not the text its adding commit gave it. `born` is that text. */
const judgeBorn = (file, born, current) => {
  if (current === undefined) return [`${file} was moved or deleted after the commit that added it`];
  return born === current ? [] : [`${file}: differs from the commit that added it at line ${firstDifference(born.split("\n"), current.split("\n")) || 1}`];
};

/** The reasons a commit subject names the wrong number of commits. */
const judgeSubject = (subject, count) => (count > 1 ? [`${count} commits have the subject: ${subject}`] : []);

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

/** The regions of a declared file that are not well formed on their own: not in order, overlapping, or out of the file. */
const judgeRegionShapes = (file, regions) => {
  const reasons = [];
  regions.forEach((r, k) => {
    if (!Number.isInteger(r.first) || !Number.isInteger(r.last) || r.last < r.first - 1) reasons.push(`${file}: region ${k + 1} is not a range of lines`);
    else if (r.last === r.first - 1 && (r.lines === undefined || r.lines.length === 0)) reasons.push(`${file}: region ${k + 1} inserts and names no text`);
    else if (r.last >= r.first && r.lines !== undefined) reasons.push(`${file}: region ${k + 1} replaces base lines and fixes text`);
    if (k > 0 && r.first <= regions[k - 1].last) reasons.push(`${file}: region ${k + 1} does not start after the region before it`);
  });
  return reasons;
};

/** The regions whose first or last base line does not start with the text the region names. */
const judgeRegionAnchors = (file, regions, B) =>
  regions.flatMap((r, k) => {
    const top = B[r.first - 1];
    const bottom = B[r.last - 1];
    const bad = [];
    if (top === undefined || !top.startsWith(r.top)) bad.push(`${file}: base line ${r.first} (the top of region ${k + 1}) does not start with ${JSON.stringify(r.top)}`);
    if (bottom === undefined || !bottom.startsWith(r.bottom)) bad.push(`${file}: base line ${r.last} (the bottom of region ${k + 1}) does not start with ${JSON.stringify(r.bottom)}`);
    return bad;
  });

/** The base lines held outside the regions, in order: one list before the first region, between each two, and after the last. */
const heldSegments = (B, regions) => {
  const segments = [];
  let from = 0;
  for (const r of regions) {
    segments.push(B.slice(from, r.first - 1));
    from = r.last;
  }
  segments.push(B.slice(from));
  return segments;
};

/**
 * Where the lines `C` hold the segments, in order, with anything in the gaps between them: `{ gaps }`, each gap the
 * `[from, to)` indexes of one region's own lines, or `{ line }`, the 1-based line of `C` where the held text stops matching.
 */
const fit = (C, segments) => {
  const n = segments.length - 1;
  const head = segments[0];
  const tail = segments[n];
  const ph = common(C, head, 0);
  if (ph < head.length) return { line: ph + 1 };
  const end = C.length - tail.length;
  if (end < head.length) return { line: head.length + 1 };
  const pt = common(C, tail, end);
  if (pt < tail.length) return { line: end + pt + 1 };
  const place = (k, cursor) => {
    if (k === n) return [[cursor, end]];
    const seg = segments[k];
    for (let j = cursor; j + seg.length <= end; j += 1) {
      if (common(C, seg, j) !== seg.length) continue;
      const rest = place(k + 1, j + seg.length);
      if (rest !== undefined) return [[cursor, j], ...rest];
    }
    return undefined;
  };
  const gaps = place(1, head.length);
  if (gaps !== undefined) return { gaps };
  let cursor = head.length;
  for (let k = 1; k < n; k += 1) {
    const seg = segments[k];
    let found = -1;
    let best = -1;
    let bestLength = -1;
    for (let j = cursor; j + seg.length <= end; j += 1) {
      const length = common(C, seg, j);
      if (length === seg.length) {
        found = j;
        break;
      }
      if (length > bestLength) {
        bestLength = length;
        best = j;
      }
    }
    if (found < 0) return { line: (best < 0 ? cursor : best + bestLength) + 1 };
    cursor = found + seg.length;
  }
  return { line: cursor + 1 };
};

/** The reasons a text is not the base text outside the regions, or holds an insertion region's text other than its fixed lines. */
const judgeRegions = (file, regions, base, current) => {
  const B = base.split("\n");
  const C = current.split("\n");
  const found = fit(C, heldSegments(B, regions));
  if (found.gaps === undefined) return [`${file}: differs outside its declared lines at line ${found.line}`];
  return regions.flatMap((r, k) => (r.lines !== undefined && !sameLines(C.slice(found.gaps[k][0], found.gaps[k][1]), r.lines) ? [`${file}: inserted line is not the declared text`] : []));
};

/**
 * The reasons a declared file's amendments are not each the text before them outside their regions, and the text the chain
 * ends on. `from` is the declaring commit's text; `steps` are the amendments in order, each `{ subject, regions, text,
 * changed }`, `text` the amending commit's text for the file (`undefined`: no such commit yet, which ends the chain).
 */
const judgeAmendments = (file, from, steps, allApplied) => {
  let last = from;
  const reasons = [];
  for (const [k, step] of steps.entries()) {
    const which = `amendment ${k + 1} (${step.subject})`;
    if (step.text === undefined) {
      if (allApplied) reasons.push(`${file}: ${which} is not applied`);
      return { reasons, last };
    }
    const shapes = [...judgeRegionShapes(file, step.regions), ...judgeRegionAnchors(file, step.regions, last.split("\n"))];
    if (shapes.length > 0) return { reasons: [...reasons, ...shapes.map((r) => `${r}, in ${which}`)], last };
    if (!step.changed) reasons.push(`${file}: the commit of ${which} does not change it`);
    reasons.push(...judgeRegions(file, step.regions, last, step.text).map((r) => `${r}, in ${which}`));
    if (reasons.length > 0) return { reasons, last };
    last = step.text;
  }
  return { reasons, last };
};

/**
 * The reasons a declared file is not as the phase fixes it, and whether its edit is applied. `commit` is the declaring commit's
 * text for the file (`undefined`: no commit yet, so the file is held), `changed` whether that commit changes the file at all,
 * and `steps` its amendments as `judgeAmendments` takes them.
 */
const judgeDeclared = (spec, base, commit, changed, current, allApplied, steps = []) => {
  const { file, regions } = spec;
  if (current === undefined) return { reasons: [`${file} does not exist`], applied: false };
  if (commit === undefined) {
    const held = judgeHeld(file, base, current);
    return { reasons: held.length === 0 && allApplied ? [`${file}: its declared edit is not applied`] : held, applied: false };
  }
  const reasons = [];
  if (!changed) reasons.push(`${file}: the commit that declares it does not change it`);
  reasons.push(...judgeRegions(file, regions, base, commit));
  if (reasons.length > 0) return { reasons, applied: false };
  const chain = judgeAmendments(file, commit, steps, allApplied);
  if (chain.reasons.length > 0) return { reasons: chain.reasons, applied: false };
  const same = judgeBorn(file, chain.last, current);
  if (same.length > 0) return { reasons: steps.length === 0 ? [...same, ...judgeRegions(file, regions, base, current)] : same, applied: false };
  return { reasons: [], applied: true };
};

/** The top-level import declarations of a syntax summary as the 1-based lines they cover, and what lies inside their span. */
const importSpan = (text, syntax) => {
  if (syntax.imports.length === 0) return { start: undefined, end: undefined, bad: [] };
  const start = Math.min(...syntax.imports.map(([s]) => s));
  const end = Math.max(...syntax.imports.map(([, e]) => e));
  const lines = text.split("\n");
  const covered = new Set(syntax.imports.flatMap(([s, e]) => Array.from({ length: e - s + 1 }, (_, i) => s + i)));
  const bad = new Set();
  for (const [s, e] of syntax.others) if (e >= start && s <= end) bad.add(Math.max(s, start));
  for (let n = start; n <= end; n += 1) if (!covered.has(n) && (lines[n - 1] ?? "").trim() !== "") bad.add(n);
  return { start, end, bad: [...bad].sort((a, b) => a - b) };
};

/**
 * The reasons a born file with an import region is not its born text outside that region. `born` and `head` are
 * `{ text, syntax }`, `region` the `[first, last]` of the born text, `appended` whether lines may follow the born text.
 */
const judgeBornImports = (file, region, born, head, appended) => {
  const reasons = [];
  const b = importSpan(born.text, born.syntax);
  if (b.start !== region.first || b.end !== region.last) {
    reasons.push(`${file}: its import region is lines ${b.start} to ${b.end} in the commit that added it, not ${region.first} to ${region.last}`);
  }
  for (const n of b.bad) reasons.push(`${file}: line ${n} inside its import region in the commit that added it is not an import declaration`);
  const h = importSpan(head.text, head.syntax);
  if (h.start === undefined) reasons.push(`${file}: has no import declaration`);
  else if (h.start !== region.first) reasons.push(`${file}: its import region starts at line ${h.start}, not ${region.first}`);
  for (const n of h.bad) reasons.push(`${file}: line ${n} inside its import region is not an import declaration`);
  if (reasons.length > 0) return reasons;
  const BL = born.text.split("\n");
  const HL = head.text.split("\n");
  const before = firstDifference(BL.slice(0, region.first - 1), HL.slice(0, region.first - 1));
  if (before > 0) return [`${file}: differs from the commit that added it at line ${before}`];
  const bornTail = BL.slice(region.last);
  const headTail = HL.slice(h.end);
  if (!appended) {
    const at = firstDifference(bornTail, headTail);
    return at === 0 ? [] : [`${file}: differs from the commit that added it at line ${h.end + at}`];
  }
  const kept = bornTail.at(-1) === "" ? bornTail.slice(0, -1) : bornTail;
  const at = firstDifference(kept, headTail.slice(0, kept.length));
  if (at > 0 || headTail.length < bornTail.length || (bornTail.at(-1) === "" && headTail.at(-1) !== "")) {
    return [`${file}: differs from the commit that added it at line ${h.end + (at === 0 ? Math.min(headTail.length, kept.length) + 1 : at)}`];
  }
  return [];
};

/** The reasons the mutation test file is not as it may be. `adders` are the commits that add it, each `{ subject, paths }`. */
const judgeMutation = (adders, born, current) => {
  const { file, subject } = MUTATION;
  if (current === undefined && adders.length === 0) return [];
  const [only] = adders;
  if (adders.length !== 1 || only.subject !== subject || !sameLines(only.paths, [file])) return [`${file}: added by a commit other than the one that may add it`];
  return judgeBorn(file, born, current);
};

/** The reasons a born file's adding commits are not the one that may add it; `hash` names that commit when there is one. */
const judgeAdders = (spec, adders, bySubject) => {
  if (!spec.adds) {
    const many = judgeSubject(spec.subject, bySubject.length);
    return { reasons: many, hash: many.length === 0 ? bySubject[0] : undefined };
  }
  if (adders.length > 1) return { reasons: [`${spec.file}: ${adders.length} commits add it, not one`], hash: undefined };
  if (adders.length === 1 && adders[0].subject !== spec.subject) return { reasons: [`${spec.file}: added by a commit other than the one that may add it`], hash: undefined };
  return { reasons: [], hash: adders[0]?.hash };
};

/** The declared files that apply for the gate of record: all of them when it passed, the test files when it failed. */
const declaredFor = (gate) => (gate === "pass" ? DECLARED : DECLARED.filter((d) => !d.source));

/** The last `# gate: <verdict>` of a text, or undefined. */
const lastGate = (text) => [...(text ?? "").matchAll(/^# gate: (\S+)/gm)].map((m) => m[1]).at(-1);

const summaryLine = (held, bornHeld, bornTotal, applied, declaredTotal) =>
  `${NAME}: pinned: ${held} files hold their base text, ${bornHeld} of ${bornTotal} born files held, ${applied} of ${declaredTotal} declared edits applied`;

// ---- the syntax tree ----

/**
 * The top-level statements of each text, as 1-based line ranges: `{ imports, others }`. The texts go into a temporary project,
 * a child process opens it through `typescript/unstable/sync`, and the project is removed; a failure to run it throws.
 */
const parseTexts = (texts) => {
  const names = Object.keys(texts);
  const dir = mkdtempSync(join(realpathSync(tmpdir()), "qd90-pinned-"));
  try {
    names.forEach((name, i) => writeFileSync(join(dir, `f${i}.ts`), texts[name]));
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { noEmit: true, noResolve: true, types: [], target: "esnext", module: "esnext", allowImportingTsExtensions: true },
        files: names.map((_, i) => `f${i}.ts`),
      }),
    );
    const out = runTypescriptChild(SELF, ["--parse-child", dir, String(names.length)], { timeoutMs: 120_000 });
    const parsed = JSON.parse(out);
    return Object.fromEntries(names.map((name, i) => [name, parsed[i]]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/** The child of `parseTexts`: prints one line of JSON, the syntax summary of each `f<i>.ts` of the project in `dir`. */
const parseChild = async (dir, count) => {
  const { API } = await import("typescript/unstable/sync");
  const { SyntaxKind } = await import("typescript/unstable/ast");
  const api = new API({ cwd: dir });
  nameServerPids();
  try {
    const program = api.updateSnapshot({ openProject: join(dir, "tsconfig.json") }).getProjects()[0]?.program;
    const summaries = [];
    for (let i = 0; i < count; i += 1) {
      const file = program?.getSourceFile(join(dir, `f${i}.ts`));
      if (file === undefined) throw new Error(`the project holds no f${i}.ts`);
      const lineAt = (offset) => file.text.slice(0, offset).split("\n").length;
      const imports = [];
      const others = [];
      for (const statement of file.statements) {
        (statement.kind === SyntaxKind.ImportDeclaration ? imports : others).push([lineAt(statement.getStart(file)), lineAt(statement.end - 1)]);
      }
      summaries.push({ imports, others });
    }
    console.log(JSON.stringify(summaries));
  } finally {
    api.close();
  }
};

// ---- git ----

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 1 << 26 });

/** The text of `file` at `rev`, or `undefined` when it has none there. */
const showAt = (rev, file) => {
  try {
    return execFileSync("git", ["show", `${rev}:${file}`], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return undefined;
  }
};

const textOf = (file) => (existsSync(file) ? readFileSync(file, "utf8") : undefined);

/** The commits since `base`, each `{ hash, subject }`. */
const commitsSince = (base) =>
  git("log", "--format=%H%x09%s", `${base}..HEAD`)
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => ({ hash: line.slice(0, line.indexOf("\t")), subject: line.slice(line.indexOf("\t") + 1) }));

/** The paths a commit changes. */
const pathsOf = (hash) => git("diff-tree", "--no-commit-id", "--name-only", "-r", "-z", hash).split("\0").filter((p) => p !== "");

/** The commits since `base` that add `file`, each `{ hash, subject }`. */
const addersOf = (base, file) =>
  git("log", "--diff-filter=A", "--format=%H%x09%s", `${base}..HEAD`, "--", file)
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => ({ hash: line.slice(0, line.indexOf("\t")), subject: line.slice(line.indexOf("\t") + 1) }));

/** The phase base recorded beside this file, or a refusal. */
const baseOf = () => {
  try {
    const recorded = JSON.parse(readFileSync(join(DIR, "90-mutation-base.json"), "utf8")).phase_base;
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
  const gate = lastGate(textOf(join(DIR, "90-BENCH.md")));
  if (gate === undefined) {
    process.stderr.write("90-BENCH.md states no gate of record (no `# gate:` line)\n");
    process.exit(1);
  }
  const declared = declaredFor(gate);
  const heldSources = DECLARED.filter((d) => !declared.includes(d));
  const declaredFiles = DECLARED.map((d) => d.file);
  const entries = git("ls-tree", "-r", "-z", base, "--", ...PREFIXES, ...HELD_SOURCE)
    .split("\0")
    .filter((entry) => entry !== "")
    .map((entry) => ({ sha: entry.slice(entry.indexOf(" ", entry.indexOf(" ") + 1) + 1, entry.indexOf("\t")), path: entry.slice(entry.indexOf("\t") + 1) }));
  const heldPaths = new Set([...heldFrom(entries.map((e) => e.path), declaredFiles), ...heldSources.map((d) => d.file)]);
  if (heldPaths.size < 100) {
    process.stderr.write(`${base} lists only ${heldPaths.size} files under the held directories: the held set is too small\n`);
    process.exit(1);
  }
  const watched = [...heldPaths, ...declaredFiles, ...BORN.map((b) => b.file), MUTATION.file];
  const moves = judgeMoves(watched, git("diff", "-M", "--name-status", base, "--", ...PREFIXES, ...HELD_SOURCE, ...DECLARED.filter((d) => d.source).map((d) => d.file), ...BORN.map((b) => b.file), MUTATION.file));
  reasons.push(...moves.map(({ reason }) => reason));
  const gone = new Set(moves.map(({ file }) => file));

  // Held files: one hash pass over the files on disk, the text read only for one that differs.
  const shaAt = new Map(entries.map((e) => [e.path, e.sha]));
  for (const d of heldSources) shaAt.set(d.file, git("rev-parse", `${base}:${d.file}`).trim());
  const present = [...heldPaths].filter((path) => {
    if (existsSync(path)) return true;
    if (!gone.has(path)) reasons.push(`${path} does not exist`);
    return false;
  });
  const onDisk = execFileSync("git", ["hash-object", "--no-filters", "--stdin-paths"], { input: `${present.join("\n")}\n`, encoding: "utf8", maxBuffer: 1 << 26 }).split("\n");
  present.forEach((path, i) => {
    if (gone.has(path) || onDisk[i] === shaAt.get(path)) return;
    const baseText = showAt(base, path);
    reasons.push(...(baseText === undefined ? [`${path} does not exist at the base`] : judgeHeld(path, baseText, textOf(path))));
  });

  const since = commitsSince(base);
  const bySubject = (subject) => since.filter((c) => c.subject === subject).map((c) => c.hash);
  let appliedCount = 0;
  for (const spec of declared) {
    if (gone.has(spec.file)) continue;
    const baseText = showAt(base, spec.file);
    if (baseText === undefined) {
      reasons.push(`${spec.file} does not exist at the base`);
      continue;
    }
    const shapes = [...judgeRegionShapes(spec.file, spec.regions), ...judgeRegionAnchors(spec.file, spec.regions, baseText.split("\n"))];
    reasons.push(...shapes);
    if (shapes.length > 0) continue;
    const hashes = bySubject(spec.subject);
    const many = judgeSubject(spec.subject, hashes.length);
    reasons.push(...many);
    if (many.length > 0) continue;
    const commit = hashes.length === 1 ? showAt(hashes[0], spec.file) : undefined;
    if (hashes.length === 1 && commit === undefined) {
      reasons.push(`${spec.file}: the commit that declares it holds no text for it`);
      continue;
    }
    const changed = hashes.length === 1 && pathsOf(hashes[0]).includes(spec.file);
    const steps = [];
    for (const amendment of spec.amendments ?? []) {
      const found = bySubject(amendment.subject);
      reasons.push(...judgeSubject(amendment.subject, found.length));
      steps.push({ ...amendment, text: found.length === 1 ? showAt(found[0], spec.file) : undefined, changed: found.length === 1 && pathsOf(found[0]).includes(spec.file) });
    }
    const verdict = judgeDeclared(spec, baseText, commit, changed, textOf(spec.file), allApplied, steps);
    reasons.push(...verdict.reasons);
    if (verdict.applied) appliedCount += 1;
  }

  // Born files.
  const parseJobs = {};
  const bornJobs = [];
  for (const spec of BORN) {
    if (gone.has(spec.file)) continue;
    const adders = spec.adds ? addersOf(base, spec.file) : [];
    const found = judgeAdders(spec, adders, bySubject(spec.subject));
    reasons.push(...found.reasons);
    if (found.reasons.length > 0) continue;
    if (found.hash === undefined) {
      if (allApplied) reasons.push(`${spec.file}: no commit ${spec.adds ? "adds it" : `has the subject: ${spec.subject}`}`);
      continue;
    }
    if (!spec.adds && !pathsOf(found.hash).includes(spec.file)) {
      reasons.push(`${spec.file}: the commit that gives it its text does not change it`);
      continue;
    }
    const bornText = showAt(found.hash, spec.file);
    const current = textOf(spec.file);
    const wrong = judgeBorn(spec.file, bornText, current);
    if (spec.imports === undefined || current === undefined) {
      reasons.push(...wrong);
      bornJobs.push({ spec, held: wrong.length === 0 });
    } else {
      parseJobs[`${spec.file}@born`] = bornText;
      parseJobs[`${spec.file}@head`] = current;
      bornJobs.push({ spec, bornText, current });
    }
  }
  const syntax = Object.keys(parseJobs).length > 0 ? parseTexts(parseJobs) : {};
  let bornHeld = 0;
  for (const job of bornJobs) {
    if (job.held !== undefined) {
      if (job.held) bornHeld += 1;
      continue;
    }
    const found = judgeBornImports(
      job.spec.file,
      job.spec.imports,
      { text: job.bornText, syntax: syntax[`${job.spec.file}@born`] },
      { text: job.current, syntax: syntax[`${job.spec.file}@head`] },
      job.spec.appended,
    );
    reasons.push(...found);
    if (found.length === 0) bornHeld += 1;
  }

  // The mutation test file: absent is allowed.
  let bornTotal = BORN.length;
  const mutationAdders = addersOf(base, MUTATION.file);
  const mutationNow = textOf(MUTATION.file);
  if (mutationNow !== undefined || mutationAdders.length > 0) {
    bornTotal += 1;
    const withPaths = mutationAdders.map((c) => ({ ...c, paths: pathsOf(c.hash) }));
    const found = judgeMutation(withPaths, mutationAdders.length === 1 ? showAt(mutationAdders[0].hash, MUTATION.file) : undefined, mutationNow);
    reasons.push(...found);
    if (found.length === 0) bornHeld += 1;
  }

  if (reasons.length > 0) {
    process.stderr.write(`${reasons.join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`${summaryLine(heldPaths.size, bornHeld, bornTotal, appliedCount, declared.length)}\n`);
};

// ---- the self-test ----

const selfTest = () => {
  const failures = [];
  const check = (name, passed) => {
    if (!passed) failures.push(name);
  };
  const eq = (name, got, want) => {
    if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${name}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  };
  const has = (name, got, part) => {
    if (!got.some((r) => r.includes(part))) failures.push(`${name}: ${JSON.stringify(got)} does not say ${JSON.stringify(part)}`);
  };

  // held
  const base = "one()\ntwo()\nthree()\n";
  eq("a held file equal to its base passes", judgeHeld("x.test.ts", base, base), []);
  eq("a held file with one changed byte fails, naming the file and the line", judgeHeld("x.test.ts", base, base.replace("two()", "twoo()")), ["x.test.ts: differs from its base text at line 2"]);
  has("a whitespace-only change fails", judgeHeld("x.test.ts", base, base.replace("two()", "two() ")), "differs from its base text at line 2");
  has("a line-ending change fails", judgeHeld("x.test.ts", base, base.replaceAll("\n", "\r\n")), "differs from its base text at line 1");
  has("an appended line fails", judgeHeld("x.test.ts", base, `${base}four()\n`), "differs from its base text at line 4");
  eq("the held set is what the base lists less the declared files", heldFrom(["a/x.ts", "a/dec.ts", "", "a/y.ts"], ["a/dec.ts"]), ["a/x.ts", "a/y.ts"]);
  eq("a path the base does not list is not held", heldFrom(["a/x.ts"], []).includes("a/new.ts"), false);
  const status = "M\ta.ts\nR087\tx.test.ts\ty.test.ts\nD\tz.ts\nA\tn.ts\nM\tother.ts";
  const moves = judgeMoves(["x.test.ts", "z.ts", "a.ts", "n.ts"], status);
  check("a file reported as renamed fails, naming both paths", moves.some((m) => m.file === "x.test.ts" && m.reason === "x.test.ts moved to y.test.ts"));
  check("a file reported as deleted fails", moves.some((m) => m.file === "z.ts" && m.reason === "z.ts was deleted"));
  eq("a file that was only modified or added is not reported", moves.length, 2);
  eq("one commit has the subject", judgeSubject("s", 1), []);
  eq("no commit has the subject", judgeSubject("s", 0), []);
  eq("two commits have the subject", judgeSubject("s", 2), ["2 commits have the subject: s"]);

  // declared: seven lines, a replaced span of two (2-3), an insertion between 5 and 6
  const text = ["one", "two", "three", "four", "five", "six", "seven", ""].join("\n");
  const regions = [
    { first: 2, last: 3, top: "two", bottom: "three" },
    { first: 6, last: 5, top: "six", bottom: "five", lines: ["inserted"] },
  ];
  const spec = { file: "d.ts", regions };
  const B = text.split("\n");
  eq("region anchors that hold the base pass", judgeRegionAnchors("d.ts", regions, B), []);
  has("a region whose top is not the base line fails", judgeRegionAnchors("d.ts", [{ ...regions[0], top: "twelve" }], B), "base line 2 (the top of region 1) does not start with");
  has("a region whose bottom is not the base line fails", judgeRegionAnchors("d.ts", [{ ...regions[0], bottom: "tree" }], B), "base line 3 (the bottom of region 1)");
  eq("well formed regions pass", judgeRegionShapes("d.ts", regions), []);
  has("regions out of order fail", judgeRegionShapes("d.ts", [regions[1], regions[0]]), "does not start after the region before it");
  has("overlapping regions fail", judgeRegionShapes("d.ts", [{ first: 2, last: 4 }, { first: 4, last: 5 }]), "does not start after");
  has("an insertion that names no text fails", judgeRegionShapes("d.ts", [{ first: 6, last: 5 }]), "inserts and names no text");
  has("a replacement that fixes text fails", judgeRegionShapes("d.ts", [{ first: 2, last: 3, lines: ["x"] }]), "replaces base lines and fixes text");
  const edited = ["one", "TWO", "THREE", "extra", "four", "five", "inserted", "six", "seven", ""].join("\n");
  const commit = edited;
  const declaredWith = (current, c = commit, changed = true, all = false) => judgeDeclared(spec, text, c, changed, current, all);
  eq("a declared file equal to its declaring commit passes and is applied", declaredWith(commit), { reasons: [], applied: true });
  eq("an edit inside a declared region passes in the declaring commit", judgeDeclared(spec, text, ["one", "x", "four", "five", "inserted", "six", "seven", ""].join("\n"), true, ["one", "x", "four", "five", "inserted", "six", "seven", ""].join("\n"), false).applied, true);
  eq("before the commit exists a declared file equal to its base is held and not applied", judgeDeclared(spec, text, undefined, false, text, false), { reasons: [], applied: false });
  eq("before the commit exists a declared edit is held", judgeDeclared(spec, text, undefined, false, edited, false).reasons, ["d.ts: differs from its base text at line 2"]);
  eq("with every edit required, a declared file with no commit fails", judgeDeclared(spec, text, undefined, false, text, true).reasons, ["d.ts: its declared edit is not applied"]);
  eq("a commit that does not change the file fails", declaredWith(text, text, false).reasons.slice(0, 1), ["d.ts: the commit that declares it does not change it"]);
  const outsideFirst = ["ONE", "TWO", "three", "four", "five", "inserted", "six", "seven", ""].join("\n");
  eq("a declaring commit that changes a line before the first region fails, naming the line", judgeDeclared(spec, text, outsideFirst, true, outsideFirst, false).reasons, ["d.ts: differs outside its declared lines at line 1"]);
  const outsideLast = ["one", "TWO", "four", "five", "inserted", "six", "SEVEN", ""].join("\n");
  eq("a declaring commit that changes a line after the last region fails, naming the line", judgeDeclared(spec, text, outsideLast, true, outsideLast, false).reasons, ["d.ts: differs outside its declared lines at line 7"]);
  const outsideMid = ["one", "TWO", "FOUR", "five", "inserted", "six", "seven", ""].join("\n");
  has("a declaring commit that changes a line between the regions fails", judgeDeclared(spec, text, outsideMid, true, outsideMid, false).reasons, "differs outside its declared lines at line");
  const inserted = (line) => ["one", "TWO", "four", "five", line, "six", "seven", ""].join("\n");
  eq("an inserted line other than the fixed one fails", judgeDeclared(spec, text, inserted("other"), true, inserted("other"), false).reasons, ["d.ts: inserted line is not the declared text"]);
  const twoLines = ["one", "TWO", "four", "five", "inserted", "inserted", "six", "seven", ""].join("\n");
  has("a second inserted line fails", judgeDeclared(spec, text, twoLines, true, twoLines, false).reasons, "inserted line is not the declared text");
  const noInsert = ["one", "TWO", "four", "five", "six", "seven", ""].join("\n");
  has("an insertion left out fails", judgeDeclared(spec, text, noInsert, true, noInsert, false).reasons, "inserted line is not the declared text");
  const later = `${commit}later()\n`;
  const afterwards = declaredWith(later);
  check("a file changed after its declaring commit fails, at the line", afterwards.reasons.includes("d.ts: differs from the commit that added it at line 10") && !afterwards.applied);
  const afterOutside = ["ONE", "TWO", "THREE", "extra", "four", "five", "inserted", "six", "seven", ""].join("\n");
  const outsideNow = declaredWith(afterOutside);
  check("a file edited outside its regions after its commit fails twice", outsideNow.reasons.includes("d.ts: differs from the commit that added it at line 1") && outsideNow.reasons.includes("d.ts: differs outside its declared lines at line 1"));
  const insideNow = declaredWith(["one", "TWO", "again", "four", "five", "inserted", "six", "seven", ""].join("\n"));
  check("a file edited inside its regions after its commit fails the commit's text only", insideNow.reasons.length === 1 && insideNow.reasons[0].startsWith("d.ts: differs from the commit that added it"));
  eq("a declared file that is gone fails", judgeDeclared(spec, text, commit, true, undefined, false).reasons, ["d.ts does not exist"]);
  // amendments: one later commit replaces the declaring commit's line 4 ("extra") with "amended"
  const amendment = { subject: "fix(x): amend", regions: [{ first: 4, last: 4, top: "extra", bottom: "extra" }] };
  const amendedText = commit.replace("extra", "amended");
  const stepOf = (t, changed = true) => [{ ...amendment, text: t, changed }];
  eq("a declared file equal to its amendment passes and is applied", judgeDeclared(spec, text, commit, true, amendedText, false, stepOf(amendedText)), { reasons: [], applied: true });
  eq("an amendment not yet committed leaves the file at its declaring commit's text", judgeDeclared(spec, text, commit, true, commit, false, stepOf(undefined)), { reasons: [], applied: true });
  eq("with every edit required, an amendment not committed fails", judgeDeclared(spec, text, commit, true, commit, true, stepOf(undefined)).reasons, ["d.ts: amendment 1 (fix(x): amend) is not applied"]);
  has("an amendment that changes a line outside its regions fails", judgeDeclared(spec, text, commit, true, amendedText.replace("five", "FIVE"), false, stepOf(amendedText.replace("five", "FIVE"))).reasons, "differs outside its declared lines at line 6, in amendment 1");
  has("an amendment whose commit does not change the file fails", judgeDeclared(spec, text, commit, true, commit, false, stepOf(commit, false)).reasons, "the commit of amendment 1 (fix(x): amend) does not change it");
  has("an amendment whose region anchors miss the text before it fails", judgeDeclared(spec, text, commit, true, amendedText, false, [{ ...amendment, regions: [{ first: 4, last: 4, top: "four", bottom: "four" }], text: amendedText, changed: true }]).reasons, "base line 4 (the top of region 1) does not start with");
  has("a file changed after its last amendment fails", judgeDeclared(spec, text, commit, true, `${amendedText}later()\n`, false, stepOf(amendedText)).reasons, "differs from the commit that added it");
  eq("two amendments apply in order", judgeAmendments("d.ts", commit, [...stepOf(amendedText), { subject: "fix(y): again", regions: [{ first: 4, last: 4, top: "amended", bottom: "amended" }], text: amendedText.replace("amended", "twice"), changed: true }], false), { reasons: [], last: amendedText.replace("amended", "twice") });
  const long = [...Array.from({ length: 10 }, (_, i) => `line ${i + 1}`), ""].join("\n");
  const longRegions = [
    { first: 2, last: 3, top: "line 2", bottom: "line 3" },
    { first: 6, last: 7, top: "line 6", bottom: "line 7" },
  ];
  const grown = ["line 1", "a", "b", "c", "line 4", "line 5", "line 8", "line 9", "line 10", ""].join("\n");
  eq("regions that grow and shrink keep the held text between them in order", judgeRegions("g.ts", longRegions, long, grown), []);
  has("held text between two regions that changed fails", judgeRegions("g.ts", longRegions, long, ["line 1", "a", "b", "c", "line 4!", "line 5", "line 8", "line 9", "line 10", ""].join("\n")), "differs outside its declared lines");
  eq("a declared file with every region unchanged passes", judgeRegions("g.ts", longRegions, long, long), []);

  // the gate of record and the declared set
  eq("a passing gate declares all five files", declaredFor("pass").length, 5);
  eq("a failed gate declares the three test files and holds the two source files", declaredFor("fail").map((d) => d.source === true), [false, false, false]);
  eq("the last gate line is read", [lastGate("# gate: fail\nx\n# gate: pass\n"), lastGate("x"), lastGate(undefined)], ["pass", undefined, undefined]);

  // born, with an import region
  const header = ["/** header */", 'import a from "a";', "import {", "  b,", '} from "b";', "", "const x = 1;", 'describe("x", () => {});', ""];
  const bornText = header.join("\n");
  const region = { first: 2, last: 5 };
  const growImports = (extra, at = 5) => [...header.slice(0, at), ...extra, ...header.slice(at)].join("\n");
  const shifted = growImports(['import c from "c";', 'import { d } from "d";']);
  const constAmong = growImports(["const z = 1;", 'import c from "c";']);
  const constAmong2 = [...header.slice(0, 2), "const z = 2;", ...header.slice(2, 5), 'import c from "c";', ...header.slice(5)].join("\n");
  const bodyChanged = shifted.replace("const x = 1;", "const x = 2;");
  const beforeAdded = ["/** header */", "// a line", ...header.slice(1)].join("\n");
  const importAfterBody = [...header, 'import late from "late";', ""].join("\n");
  const commentAmong = growImports(["// a note", 'import c from "c";']);
  const appendedLine = `${bornText}const later = 1;\n`;
  const noTrailingNewline = `${bornText.slice(0, -1)}`;
  const texts = { born: bornText, same: bornText, shifted, constAmong, constAmong2, bodyChanged, beforeAdded, importAfterBody, commentAmong, appendedLine, noTrailingNewline, noImports: "const x = 1;\n" };
  const syntax = parseTexts(texts);
  const judgeImports = (headName, appended, bornName = "born", r = region) =>
    judgeBornImports("b.ts", r, { text: texts[bornName], syntax: syntax[bornName] }, { text: texts[headName], syntax: syntax[headName] }, appended);
  eq("the import region of a text is the span of its import declarations", [importSpan(bornText, syntax.born).start, importSpan(bornText, syntax.born).end], [2, 5]);
  eq("a born file equal to its born text passes", judgeImports("same", false), []);
  eq("a grown import block with shifted body lines passes", judgeImports("shifted", false), []);
  eq("a grown import block with shifted body lines passes with appended lines allowed", judgeImports("shifted", true), []);
  has("a const among the imports fails, naming the line", judgeImports("constAmong", false), "line 6 inside its import region is not an import declaration");
  has("a const among the first imports fails, naming the line", judgeImports("constAmong2", true), "line 3 inside its import region is not an import declaration");
  has("a body line changed after a grown import block fails", judgeImports("bodyChanged", false), "differs from the commit that added it at line 9");
  has("a line inserted before the region fails", judgeImports("beforeAdded", false), "its import region starts at line 3, not 2");
  has("an import placed after the body widens the region over statements and fails", judgeImports("importAfterBody", true), "inside its import region is not an import declaration");
  has("a comment line among the imports fails", judgeImports("commentAmong", false), "line 6 inside its import region is not an import declaration");
  has("a line appended after the born text fails when appending is not allowed", judgeImports("appendedLine", false), "differs from the commit that added it at line 9");
  eq("a line appended after the born text passes when appending is allowed", judgeImports("appendedLine", true), []);
  has("a missing final newline fails when appending is allowed", judgeImports("noTrailingNewline", true), "differs from the commit that added it");
  has("a text with no import declaration fails", judgeImports("noImports", false), "has no import declaration");
  has("an import region constant that is not the born span fails", judgeImports("same", false, "born", { first: 2, last: 4 }), "its import region is lines 2 to 5 in the commit that added it, not 2 to 4");
  has("a born text with another statement inside the constant's span fails", judgeImports("same", false, "constAmong", { first: 2, last: 7 }), "line 6 inside its import region in the commit that added it is not an import declaration");

  // the mutation test file
  const m = MUTATION;
  const adder = (subject = m.subject, paths = [m.file]) => ({ hash: "a1", subject, paths });
  eq("the mutation file absent passes", judgeMutation([], undefined, undefined), []);
  eq("the mutation file present and equal to its adding commit passes", judgeMutation([adder()], "t\n", "t\n"), []);
  has("the mutation file added under another subject fails", judgeMutation([adder("test(90-99): scratch only")], "t\n", "t\n"), "added by a commit other than the one that may add it");
  has("the mutation file present and added by no commit fails", judgeMutation([], undefined, "t\n"), "added by a commit other than the one that may add it");
  has("the mutation file added by two commits fails", judgeMutation([adder(), adder()], "t\n", "t\n"), "added by a commit other than the one that may add it");
  has("the mutation file added by a commit that holds more fails", judgeMutation([adder(m.subject, [m.file, "other.ts"])], "t\n", "t\n"), "added by a commit other than the one that may add it");
  has("the mutation file edited after its adding commit fails", judgeMutation([adder()], "t\n", "u\n"), "differs from the commit that added it at line 1");
  has("the mutation file deleted after its adding commit fails", judgeMutation([adder()], "t\n", undefined), "moved or deleted after the commit that added it");

  // born adders
  const addingSpec = BORN[0];
  const bench = BORN[2];
  eq("a born file added by its commit passes", judgeAdders(addingSpec, [{ hash: "h", subject: addingSpec.subject }], []), { reasons: [], hash: "h" });
  eq("a born file with no adding commit is not yet born", judgeAdders(addingSpec, [], []), { reasons: [], hash: undefined });
  has("a born file added by two commits fails", judgeAdders(addingSpec, [{ hash: "h", subject: addingSpec.subject }, { hash: "i", subject: "x" }], []).reasons, "2 commits add it, not one");
  has("a born file added under another subject fails", judgeAdders(addingSpec, [{ hash: "h", subject: "x" }], []).reasons, "added by a commit other than the one that may add it");
  eq("a modified born file is found by its subject", judgeAdders(bench, [], ["h"]), { reasons: [], hash: "h" });
  has("a modified born file whose subject names two commits fails", judgeAdders(bench, [], ["h", "i"]).reasons, "2 commits have the subject");
  eq("a born text equal to the file passes", judgeBorn("b.ts", "t", "t"), []);
  eq("a born text changed after the commit fails", judgeBorn("b.ts", "a\nb\n", "a\nB\n"), ["b.ts: differs from the commit that added it at line 2"]);
  has("a born file that is gone fails", judgeBorn("b.ts", "t", undefined), "moved or deleted");

  // the constants
  check("the declared regions are well formed and each file names its commit", DECLARED.every((d) => judgeRegionShapes(d.file, d.regions).length === 0 && d.subject !== "" && d.regions.length > 0));
  check("the declared regions are the ones the phase fixes", DECLARED.map((d) => d.regions.map((r) => `${r.first}-${r.last}`).join(",")).join(" ") === "9-43,133-160 1-8,10-12,32-39 121-120 44-48 8-19");
  check("the declared files are five, each once, two of them source", new Set(DECLARED.map((d) => d.file)).size === 5 && DECLARED.filter((d) => d.source === true).length === 2);
  check("only the two source files carry amendments, each from the review round", DECLARED.filter((d) => d.amendments !== undefined).every((d) => d.source === true && d.amendments.every((a) => a.subject.startsWith("fix(90-review): ") && judgeRegionShapes(d.file, a.regions).length === 0)));
  check("the amendment regions are the ones the review round fixes", DECLARED.map((d) => (d.amendments ?? []).map((a) => a.regions.map((r) => `${r.first}-${r.last}`).join(",")).join(";")).join(" ") === "   223-226 ");
  check("the only insertion is the fixed fixture line", DECLARED.flatMap((d) => d.regions).filter((r) => r.lines !== undefined).length === 1 && DECLARED[2].regions[0].lines.join() === "  fixture: () => named(undefined, 0),");
  check("the born files are the phase's three, with the import regions the plans recorded, then the review round's, whole", BORN.length === 5 && BORN[0].imports.first === 24 && BORN[0].imports.last === 61 && BORN[1].imports.first === 11 && BORN[1].imports.last === 20 && BORN.slice(2).every((b) => b.imports === undefined));
  check("each review-round born file is added whole by one commit of that round", BORN.slice(3).every((b) => b.adds === true && b.subject.startsWith("fix(90-review): ") && b.appended === undefined));
  check("only the type pins may be appended to", BORN.filter((b) => b.appended === true).map((b) => b.file).join() === `${CORE_TEST}/PortFacts.tst.ts`);
  check("the held directories are the five", PREFIXES.length === 5 && HELD_SOURCE.join() === `${CORE_SRC}/PortServing.ts`);
  eq("the output line", summaryLine(408, 3, 3, 1, 5), "90-pinned-check.mjs: pinned: 408 files hold their base text, 3 of 3 born files held, 1 of 5 declared edits applied");

  if (failures.length > 0) {
    process.stderr.write(`self-test failed:\n${failures.map((f) => `- ${f}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write("self-test: passed\n");
};

const args = process.argv.slice(2);
if (args[0] === "--parse-child") {
  try {
    await parseChild(args[1], Number(args[2]));
  } catch (error) {
    process.stderr.write(String(error));
    process.exitCode = 1;
  }
} else if (args.includes("--self-test")) selfTest();
else run(args.includes("--all-applied"));
