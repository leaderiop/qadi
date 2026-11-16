// Phase 52's close scan (52-05): the phase read as one change since phase_base.
//
// Run from the repository root, after `pnpm exec tsc -b tsconfig.json` (section 9 reads the emitted
// declarations):
//   node .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/scan.mjs
// Prints `phase scan clean` and exits 0, or prints one finding per stderr line and exits 1.
// phase_base is the `phase_base:` front-matter line of 52-01-SUMMARY.md; the base declarations are the two
// `shasum -a 256` lines under its `## Base declarations`.
import cp from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";

const D = ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/";
const CORE = "packages/core/src/RenderablePredicate.ts";
const SQL = "packages/predicate-sql/src/index.ts";
const PRISMA = "packages/predicate-prisma/src/index.ts";
const SQL_M = "packages/predicate-sql/src/CompileMetrics.ts";
const PRISMA_M = "packages/predicate-prisma/src/CompileMetrics.ts";
const SQL_T = "packages/predicate-sql/test/CompileShell.test.ts";
const PRISMA_T = "packages/predicate-prisma/test/CompileShell.test.ts";
const CORE_T = "packages/core/test/CompilePredicate.test.ts";
const ADR = "spec/decisions/165-core-owns-the-predicate-compile-shell.md";
const CHANGESETS = {
  ".changeset/core-compile-predicate.md": '"@qadi/core": minor',
  ".changeset/predicate-sql-compile-shell-in-core.md": '"@qadi/predicate-sql": patch',
  ".changeset/predicate-prisma-compile-shell-in-core.md": '"@qadi/predicate-prisma": patch',
};
const bad = [];

const summary = fs.readFileSync(D + "52-01-SUMMARY.md", "utf8");
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(summary) || [])[1];
if (!B) {
  console.error("no phase_base line in 52-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 26 }).trim();
const show = (rev, f) => cp.execFileSync("git", ["show", `${rev}:${f}`], { encoding: "utf8", maxBuffer: 1 << 26 });
const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8") : "");
const code = (s) => s.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const flat = (s) => s.replace(/\s+/g, " ");
const count = (s, x) => s.split(x).length - 1;
const once = (file, s, x) => {
  const k = count(flat(s), flat(x));
  if (k !== 1) bad.push(`${file} has ${k} of: ${x}`);
};

// 1. Scope: every file changed outside .planning/ is one the phase owns, and each one it owns changed.
const ALLOWED = [
  CORE, SQL, PRISMA, SQL_M, PRISMA_M, SQL_T, PRISMA_T, CORE_T, ADR,
  "spec/decisions/index.yaml",
  "spec/behaviors/31-predicate-compilation.md",
  "spec/invariants.md",
  "spec/traceability.md",
  "spec/README.md",
  "spec/overview.md",
  ...Object.keys(CHANGESETS),
];
const changed = g("diff", "--name-only", B, "HEAD").split("\n").filter((f) => f && !f.startsWith(".planning/"));
for (const f of changed) if (!ALLOWED.includes(f)) bad.push("outside the phase scope: " + f);
for (const f of ALLOWED) if (!changed.includes(f)) bad.push("not changed by the phase: " + f);

// 2. Forbidden constructs on added lines (strings and comments stripped), and the budgets' counts (WX-04, D-02).
const strip = (t) =>
  t.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""').replace(/\/\/.*$/, "");
let file = "";
for (const l of g("diff", "-U0", B, "HEAD", "--", "packages/*/src/*", "packages/*/test/*").split("\n")) {
  if (l.startsWith("+++ ")) {
    file = l.slice(6);
    continue;
  }
  if (!l.startsWith("+")) continue;
  const raw = l.slice(1).trim();
  if (/^(\/\/|\*|\/\*|import\b)/.test(raw)) continue;
  const t = strip(raw);
  const rules = [
    [/\bas (?!const\b)[A-Za-z{([]/, "as"],
    [/[\w)\]]![.;,)\]]/, "non-null !"],
    [/(:\s*any\b|<any>|\bany\[\])/, "any"],
    [/\bswitch \(/, "switch"],
    [/Effect\.fnUntraced/, "fnUntraced"],
    [/\bconsole\.|process\.env|Date\.now\(|new Date\(|performance\.now\(/, "ambient read"],
  ];
  if (file.includes("/src/")) rules.push([/\basync\b|\bawait\b/, "async/await"]);
  for (const [re, k] of rules) if (re.test(t)) bad.push(`${k} added in ${file}: ${raw.slice(0, 100)}`);
}
const total = (rev, x, path = "packages/*/src/*") => {
  const r = cp.spawnSync("git", ["grep", "-c", "-F", x, rev, "--", path], { encoding: "utf8" });
  return r.stdout.split("\n").filter(Boolean).reduce((a, l) => a + Number(l.split(":").pop()), 0);
};
for (const x of ["switch (", "Effect.fnUntraced("]) {
  if (total(B, x) !== total("HEAD", x)) bad.push(`${x} count moved: ${total(B, x)} -> ${total("HEAD", x)}`);
}
if (total(B, "Effect.fn(", CORE) !== total("HEAD", "Effect.fn(", CORE)) bad.push("RenderablePredicate.ts gained or lost an Effect.fn");

// 3. The shell is gone from both dialects (the scoped grep, raw text), and each keeps its rules, its renderer,
//    its counter and its span (COMP-01, COMP-02, D-02).
const sql = read(SQL);
const prisma = read(PRISMA);
for (const [f, s] of [[SQL, sql], [PRISMA, prisma]]) {
  s.split("\n").forEach((l, i) => {
    if (/\?\? "Ascii"|DEFAULT_MAX_IN_VALUES|Metric\.update|tapError|toRenderable\(/.test(l)) bad.push(`${f}:${i + 1} still holds the shell: ${l.trim()}`);
  });
  if (s.includes('import * as Metric from "effect/Metric";')) bad.push(f + " still imports effect/Metric");
  for (const x of ['import { compilePredicate } from "@qadi/core";', "return yield* compilePredicate(predicate, {", "outcomes: compiledTotal,", "identifiers: options.identifiers,", "maxInValues: options.maxInValues,"]) once(f, s, x);
}
for (const x of [
  'export const compileSql = Effect.fn("qadi.predicateSql.compileSql")(function* (',
  "reservedColumns: NO_RESERVED_COLUMNS,",
  'negation: "TwoValued",',
  "finiteness: FINITENESS[options.dialect],",
  'finiteExclusion: "Expressible",',
  "render: (node) => {",
  "const params: Array<SqlSafeValue> = [];",
  "return { text: renderNode(node, SYNTAX[options.dialect], params), params };",
]) once(SQL, sql, x);
if (flat(sql).indexOf("render: (node) => {") > flat(sql).indexOf("const params: Array<SqlSafeValue> = [];")) {
  bad.push("compileSql's params array is not allocated inside render (one array per run)");
}
for (const x of [
  'export const compilePrismaWhere = Effect.fn("qadi.predicatePrisma.compilePrismaWhere")(',
  "reservedColumns: RESERVED_PRISMA_KEYS,",
  'nullability: { _tag: "Declared", nullable: options.nullable },',
  'negation: "ThreeValued",',
  'finiteness: { _tag: "Declared", floating: options.floating },',
  'finiteExclusion: "Inexpressible",',
  "render: renderNode,",
]) once(PRISMA, prisma, x);

// 4. Core: the three exports, a plain function with no span, defaults then classify then count refused,
//    render, then count compiled (D-01, D-02, D-04, D-06, D-06a); toRenderable byte-unchanged.
const coreH = read(CORE);
const coreB = show(B, CORE);
for (const x of [
  'import * as Metric from "effect/Metric";',
  "export interface CompileOutcomes {",
  "readonly compiled: Metric.Counter<number>;",
  "readonly refused: Metric.Counter<number>;",
  "export interface CompilePredicateOptions<A> {",
  'readonly rules: Omit<RenderRules, "identifiers" | "maxInValues">;',
  "readonly identifiers?: IdentifierRule | undefined;",
  "readonly maxInValues?: number | undefined;",
  "readonly render: (node: RenderableNode) => A;",
  "readonly outcomes: CompileOutcomes;",
  "export const compilePredicate = <A>(",
  "export const DEFAULT_MAX_IN_VALUES = 1000;",
]) once(CORE, code(coreH), x);
const block = (src, marker) => {
  const i = src.indexOf(marker);
  if (i < 0) return undefined;
  const lines = src.slice(i).split("\n");
  const end = lines.findIndex((l, k) => k > 0 && /^(export |const |type |interface |function |\/\*\*|\/\/)/.test(l));
  return lines.slice(0, end < 0 ? undefined : end).join("\n").trimEnd();
};
const fnBlock = block(coreH, "export const compilePredicate = <A>(");
if (fnBlock === undefined) bad.push("RenderablePredicate.ts declares no compilePredicate");
else {
  const f = flat(fnBlock);
  if (/Effect\.(fn|fnUntraced|gen)\b/.test(f)) bad.push("compilePredicate is traced or generator-built; D-02 makes it a plain function");
  const steps = [
    "toRenderable(predicate, {",
    "...options.rules,",
    'identifiers: options.identifiers ?? "Ascii",',
    "maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,",
    "Effect.tapError(() => Metric.update(options.outcomes.refused, 1)),",
    "Effect.map(options.render),",
    "Effect.tap(() => Metric.update(options.outcomes.compiled, 1)),",
  ];
  const at = steps.map((x) => f.indexOf(x));
  steps.forEach((x, k) => {
    if (at[k] < 0) bad.push("compilePredicate lacks: " + x);
  });
  if (at.every((x) => x >= 0) && at.some((x, k) => k > 0 && x < at[k - 1])) {
    bad.push("compilePredicate's steps are out of order (compiled must be counted after the render, D-06a)");
  }
}
const toB = block(coreB, "export const toRenderable =");
const toH = block(coreH, "export const toRenderable =");
if (toB === undefined || toH === undefined || toB !== toH) bad.push("RenderablePredicate.ts changed or lost toRenderable");

// 5. Metrics: each package still declares its own counter once, with the base's id and description, typed by
//    core's CompileOutcomes (D-04, D-05, D-07, ADR-QD-123).
for (const f of [SQL_M, PRISMA_M]) {
  const h = read(f);
  const b = show(B, f);
  if (count(code(h), "Metric.counter(") !== 1) bad.push(`${f} has ${count(code(h), "Metric.counter(")} Metric.counter( declarations`);
  for (const l of b.split("\n").filter((x) => /Metric\.counter\("qadi_|^\s+description: "|Metric\.withAttributes\(compiledBase/.test(x))) {
    if (!h.split("\n").includes(l)) bad.push(`${f} lost its base line: ${l.trim()}`);
  }
  once(f, h, 'import type { CompileOutcomes } from "@qadi/core";');
  once(f, h, "export const compiledTotal: CompileOutcomes = {");
  if (h.includes("export const compiledBase")) bad.push(f + " exports the untagged base");
}

// 6. The characterisation is literal, untouched since it was written on the base, and reads no metric id
//    (D-08, METRIC_ID_LITERAL_BUDGET); the core test was RED by import.
const one = (f, prefix) => {
  const hs = g("log", "--format=%H", `${B}..HEAD`, "--", f).split("\n").filter(Boolean);
  if (hs.length !== 1) {
    bad.push(`${f} has ${hs.length} commits since the base; it must have one, ${prefix}`);
    return undefined;
  }
  const h = hs[0];
  if (!g("log", "-1", "--format=%s", h).startsWith(prefix)) bad.push(`${f}'s commit is not ${prefix}`);
  if (g("diff-tree", "--no-commit-id", "--name-only", "-r", h) !== f) bad.push(`${f}'s commit carries other files`);
  return h;
};
const OK_IMPORTS = new Set(["@effect/vitest", "@qadi/core", "@qadi/testing", "../src/CompileMetrics.ts", "../src/index.ts", "./fixture.ts"]);
for (const f of [SQL_T, PRISMA_T]) {
  one(f, "test(52-02):");
  const t = read(f);
  for (const m of t.matchAll(/from "([^"]+)"/g)) if (!m[1].startsWith("effect/") && !OK_IMPORTS.has(m[1])) bad.push(`${f} imports ${m[1]}`);
  // Span names are strings ("qadi.predicate.toRenderable"), so strings are stripped before the check.
  if (/\btoRenderable\b|\bcompilePredicate\b/.test(code(t).split("\n").map(strip).join("\n"))) bad.push(f + " reads the code under change");
  if (t.includes('"qadi_')) bad.push(f + " holds a qadi_ id literal");
}
const red = one(CORE_T, "test(52-03):");
if (red && show(red, CORE).includes("export const compilePredicate")) bad.push("compilePredicate existed when CompilePredicate.test.ts was committed (not RED)");
if (read(CORE_T).includes('"qadi_')) bad.push(CORE_T + " holds a qadi_ id literal");

// 7. Commit order (WX-06, D-08, D-09) and trailers.
const log = g("log", "--reverse", "--format=%H%x09%s", `${B}..HEAD`)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [h, s] = l.split("\t");
    return { h, s, f: g("diff-tree", "--no-commit-id", "--name-only", "-r", h).split("\n").filter(Boolean) };
  });
const plan = log.filter((c) => /\(52-0\d\):/.test(c.s));
if (!plan.length || !plan[0].s.startsWith("chore(52-01):") || plan[0].f.join(" ") !== D + "52-mutation-base.json") {
  bad.push("the first plan commit is not the mutation base alone");
} else if (g("rev-parse", plan[0].h + "^") !== B) bad.push("the mutation base's parent is not phase_base");
const idx = (pred) => log.findIndex((c) => c.f.some(pred));
const isSrc = (f) => /^packages\/[^/]+\/src\//.test(f);
const firstSrc = idx(isSrc);
let lastSrc = -1;
log.forEach((c, i) => {
  if (c.f.some(isSrc)) lastSrc = i;
});
for (const [n, f] of [["CompileShell.test.ts (sql)", SQL_T], ["CompileShell.test.ts (prisma)", PRISMA_T], ["CompilePredicate.test.ts (RED)", CORE_T]]) {
  const i = idx((x) => x === f);
  if (i < 0) bad.push(n + ": no commit");
  else if (firstSrc < 0 || i > firstSrc) bad.push(n + " does not precede the first src commit");
}
if (firstSrc >= 0 && (log[firstSrc].f.join(" ") !== CORE || !log[firstSrc].s.startsWith("feat(52-03):"))) {
  bad.push("the first src commit is not feat(52-03) carrying RenderablePredicate.ts alone");
}
const sqlAt = idx((x) => x === SQL);
const prismaAt = idx((x) => x === PRISMA);
if (sqlAt < 0 || prismaAt < 0 || sqlAt > prismaAt) bad.push("compileSql was not converted before compilePrismaWhere");
else {
  if (log[sqlAt].f.slice().sort().join(" ") !== [SQL, SQL_M].sort().join(" ")) bad.push("the compileSql commit carries " + log[sqlAt].f.join(" "));
  if (log[prismaAt].f.slice().sort().join(" ") !== [PRISMA, PRISMA_M].sort().join(" ")) bad.push("the compilePrismaWhere commit carries " + log[prismaAt].f.join(" "));
}
const after = idx((f) => f === D + "52-mutation-after.json");
if (after < 0 || after < lastSrc) bad.push("52-mutation-after.json does not follow the last src commit");
for (const c of plan) {
  const b = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!/^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/.test(b[b.length - 1])) {
    bad.push(`${c.h.slice(0, 8)} ${c.s} has no trailer`);
  }
}

// 8. Ids (WX-02): only the reserved ones are new, no placeholder, each new heading once, INV-QD-350 unused and named.
const RES = ["ARCH-99", "ADR-QD-165", "CCR-QD-443", "BEH-QD-596", "BEH-QD-597", "BEH-QD-598", "BEH-QD-599", "BEH-QD-600", "INV-QD-349", "INV-QD-350"];
const added = g("diff", "-U0", B, "HEAD", "--", "spec", "packages", ".changeset")
  .split("\n")
  .filter((l) => l.startsWith("+") && !l.startsWith("+++"))
  .join("\n");
for (const id of new Set(added.match(/\b(?:(?:ADR|CCR|BEH|INV)-QD-\d+|ARCH-\d+)\b/g) || [])) {
  if (RES.includes(id)) continue;
  if (cp.spawnSync("git", ["grep", "-q", "-w", "-F", id, B, "--", "spec", "packages", ".changeset", "AGENTS.md"]).status !== 0) {
    bad.push("an id outside the reservation and new to the tree: " + id);
  }
}
if (/\b(?:ADR|CCR|BEH|INV)-QD-NEXT/.test(added)) bad.push("a placeholder id was added");
const heads = (id) =>
  cp.spawnSync("git", ["grep", "-h", "-E", `^## ${id}:`, "HEAD", "--", "spec"], { encoding: "utf8" }).stdout.split("\n").filter(Boolean).length;
for (const id of ["BEH-QD-596", "BEH-QD-597", "BEH-QD-598", "BEH-QD-599", "BEH-QD-600", "INV-QD-349"]) {
  if (heads(id) !== 1) bad.push(`${id} is a heading ${heads(id)} times`);
}
if (heads("INV-QD-350") !== 0) bad.push("INV-QD-350 is a heading; the phase reserves it unused");
const ccr = read("spec/README.md").split("\n").filter((l) => l.startsWith("| CCR-QD-443 |"));
if (ccr.length !== 1 || !ccr[0].includes("Unused: INV-QD-350")) bad.push("the CCR-QD-443 row is missing or does not name INV-QD-350 unused");
if (!read(ADR).includes("QADI-ADR-165")) bad.push(ADR + " does not carry QADI-ADR-165");

// 9. The packages' public declarations are the base's, byte for byte (D-02; the compile signatures unchanged).
for (const f of ["packages/predicate-sql/lib/index.d.ts", "packages/predicate-prisma/lib/index.d.ts"]) {
  const want = (new RegExp("^([0-9a-f]{64})  " + f.replace(/[./]/g, "\\$&") + "$", "m").exec(summary) || [])[1];
  if (!want) bad.push(`52-01-SUMMARY.md has no base sha256 line for ${f}`);
  else if (!fs.existsSync(f)) bad.push(`${f} is not built; run pnpm exec tsc -b tsconfig.json first`);
  else if (crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex") !== want) bad.push(`${f} differs from the base's declarations`);
}

// 10. Changesets: core minor, the two dialects patch, no break; the Prisma one states the counting correction.
for (const [f, fm] of Object.entries(CHANGESETS)) {
  const c = read(f);
  const front = (/^---\n([\s\S]*?)\n---/.exec(c) || [])[1];
  if (front !== fm) bad.push(`${f} front matter is ${JSON.stringify(front)}, expected ${fm}`);
  if (/Breaking/i.test(c)) bad.push(f + " names a break");
}
const pc = read(".changeset/predicate-prisma-compile-shell-in-core.md");
if (!/compiled/.test(pc) || !/render/.test(pc)) bad.push("the @qadi/predicate-prisma changeset does not state that compiled is counted after the render (D-06a)");

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
