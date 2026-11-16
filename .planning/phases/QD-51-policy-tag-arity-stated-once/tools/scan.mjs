// Phase 51's close scan (51-05): the phase read as one change since phase_base.
//
// Run from the repository root:
//   node .planning/phases/QD-51-policy-tag-arity-stated-once/tools/scan.mjs
// Prints `phase scan clean` and exits 0, or prints one finding per stderr line and exits 1.
// phase_base is the `phase_base:` front-matter line of 51-01-SUMMARY.md.
import cp from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";

const D = ".planning/phases/QD-51-policy-tag-arity-stated-once/";
const DEC = "packages/core/src/Decision.ts";
const POL = "packages/core/src/Policy.ts";
const ARI = "packages/core/src/PolicyArity.ts";
const TRACE_TEST = "packages/core/test/TraceShape.test.ts";
const ARITY_TEST = "packages/core/test/PolicyArity.test.ts";
const ARITY_TST = "packages/core/test/PolicyArity.tst.ts";
const ADR = "spec/decisions/164-policy-tag-arity-is-stated-once.md";
const CHANGESET = ".changeset/policy-arity-stated-once.md";
const bad = [];

const summary = fs.readFileSync(D + "51-01-SUMMARY.md", "utf8");
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(summary) || [])[1];
if (!B) {
  console.error("no phase_base line in 51-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 26 }).trim();
const show = (rev, f) => cp.execFileSync("git", ["show", `${rev}:${f}`], { encoding: "utf8", maxBuffer: 1 << 26 });
const code = (s) => s.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const count = (s, x) => s.split(x).length - 1;

// 1. Scope: every file changed outside .planning/ is one the phase owns, and each one it owns changed.
const ALLOWED = [
  ARI, POL, DEC, TRACE_TEST, ARITY_TEST, ARITY_TST, ADR, CHANGESET,
  "spec/decisions/index.yaml",
  "spec/behaviors/18-explanation.md",
  "spec/behaviors/25-inspection.md",
  "spec/invariants.md",
  "spec/traceability.md",
  "spec/README.md",
];
const changed = g("diff", "--name-only", B, "HEAD").split("\n").filter((f) => f && !f.startsWith(".planning/"));
for (const f of changed) if (!ALLOWED.includes(f)) bad.push("outside the phase scope: " + f);
for (const f of ALLOWED) if (!changed.includes(f)) bad.push("not changed by the phase: " + f);

// 2. Forbidden constructs on added lines (strings and comments stripped), and the two budgets' counts.
const strip = (t) =>
  t.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""').replace(/\/\/.*$/, "");
let file = "";
for (const l of g("diff", "-U0", B, "HEAD", "--", "packages/*/src/*", "packages/*/test/*", "packages/*/bench/*").split("\n")) {
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
const budget = (rev, x) => {
  const r = cp.spawnSync("git", ["grep", "-c", "-F", x, rev, "--", "packages/*/src/*"], { encoding: "utf8" });
  return r.stdout.split("\n").filter(Boolean).reduce((a, l) => a + Number(l.split(":").pop()), 0);
};
for (const x of ["switch (", "Effect.fnUntraced("]) {
  if (budget(B, x) !== budget("HEAD", x)) bad.push(`${x} count moved: ${budget(B, x)} -> ${budget("HEAD", x)}`);
}

// 3. Decision.ts: the hand-kept list and its chain are gone, the shape reads the record, and the
//    trace walks are byte-unchanged (D-04, D-07, D-08).
const decB = show(B, DEC);
const decH = fs.readFileSync(DEC, "utf8");
const decCode = code(decH);
if (/\bleafTags\b/.test(decCode)) bad.push("Decision.ts still names the hand-kept leaf list");
if (decCode.includes("Match.whenOr(")) bad.push("Decision.ts still has a Match.whenOr chain");
if (/\bTraceShape\b/.test(decCode)) bad.push("Decision.ts still declares TraceShape");
for (const x of [
  'const traceShapeOf = (tag: Trace["policyTag"]): Arity => POLICY_ARITY[tag];',
  'import { POLICY_ARITY } from "./PolicyArity.ts";',
  'import type { Arity } from "./PolicyArity.ts";',
]) {
  if (count(decCode, x) !== 1) bad.push(`Decision.ts has ${count(decCode, x)} of: ${x}`);
}
const block = (src, marker) => {
  const i = src.indexOf(marker);
  if (i < 0) return undefined;
  const lines = src.slice(i).split("\n");
  const end = lines.findIndex((l, k) => k > 0 && /^(export |const |type |interface |function |\/\*\*|\/\/)/.test(l));
  return lines.slice(0, end < 0 ? undefined : end).join("\n").trimEnd();
};
for (const m of [
  "export interface TraceCases<R>",
  "type TraceStep =",
  "const traceChildrenOf =",
  "const traceStep:",
  "export const foldTrace =",
  "export const renderTrace =",
]) {
  const b = block(decB, m);
  const h = block(decH, m);
  if (b === undefined || h === undefined) bad.push(`Decision.ts lost ${m}`);
  else if (b !== h) bad.push(`Decision.ts changed the body of ${m}`);
}

// 4. Policy.ts: three type-position edits; the emitted JavaScript is the base's, comments aside.
const polH = fs.readFileSync(POL, "utf8");
const polCode = code(polH);
// 51-03's A1 fallback, if it ran, declares Arity locally and imports only the other two.
const polImport = polCode.includes('import type { ChildArms, POLICY_ARITY } from "./PolicyArity.ts";')
  ? 'import type { ChildArms, POLICY_ARITY } from "./PolicyArity.ts";'
  : 'import type { Arity, ChildArms, POLICY_ARITY } from "./PolicyArity.ts";';
for (const x of [
  polImport,
  "satisfies ChildArms<Policy, typeof POLICY_ARITY>",
  'export type LeafPolicy = Extract<Policy, { readonly _tag: TagsOfArity<"Leaf"> }>;',
]) {
  if (count(polCode, x) !== 1) bad.push(`Policy.ts has ${count(polCode, x)} of: ${x}`);
}
if (/export (type|interface) (TagsOfArity|ArityRecord)\b/.test(polCode)) bad.push("Policy.ts exports a module-local arity type");
let ts;
try {
  const req = createRequire(process.cwd() + "/");
  ts = req("./node_modules/.pnpm/typescript@6.0.3/node_modules/typescript");
} catch {
  bad.push("TypeScript 6.0.3 is not installed under node_modules/.pnpm");
}
if (ts) {
  const js = (src) =>
    ts.transpileModule(src, {
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        removeComments: true,
        verbatimModuleSyntax: true,
      },
    }).outputText;
  if (js(show(B, POL)) !== js(polH)) bad.push("Policy.ts emits different JavaScript from the base");
}

// 5. PolicyArity.ts: package-private, imports nothing, carries the D-05a Many type.
if (!fs.existsSync(ARI)) bad.push(ARI + " is missing");
else {
  const ari = code(fs.readFileSync(ARI, "utf8"));
  if (/^import\b/m.test(ari)) bad.push("PolicyArity.ts imports something (madge counts import type)");
  for (const x of [
    'export type Arity = "Leaf" | "Wrapper" | "Many";',
    "export const POLICY_ARITY = {",
    "readonly 0?: never",
    "export type ChildrenOf<",
    "export type ChildArms<",
  ]) {
    if (!ari.includes(x)) bad.push("PolicyArity.ts lacks " + x);
  }
}
if (fs.readFileSync("packages/core/src/index.ts", "utf8").includes("PolicyArity")) bad.push("the barrel names PolicyArity");
if (!fs.existsSync(TRACE_TEST)) bad.push(TRACE_TEST + " is missing");
else if (/PolicyArity|POLICY_ARITY/.test(fs.readFileSync(TRACE_TEST, "utf8"))) {
  bad.push("TraceShape.test.ts reads the record it is meant to check");
}

// 6. Commit order (WX-06) and trailers.
const log = g("log", "--reverse", "--format=%H%x09%s", `${B}..HEAD`)
  .split("\n")
  .filter(Boolean)
  .map((l) => {
    const [h, s] = l.split("\t");
    return { h, s, f: g("diff-tree", "--no-commit-id", "--name-only", "-r", h).split("\n").filter(Boolean) };
  });
const plan = log.filter((c) => /\(51-0\d\):/.test(c.s));
if (!plan.length || !plan[0].s.startsWith("chore(51-01):") || plan[0].f.join(" ") !== D + "51-mutation-base.json") {
  bad.push("the first plan commit is not the mutation base alone");
}
const idx = (pred) => log.findIndex((c) => c.f.some(pred));
const isSrc = (f) => /^packages\/[^/]+\/src\//.test(f);
const firstSrc = idx(isSrc);
let lastSrc = -1;
log.forEach((c, i) => {
  if (c.f.some(isSrc)) lastSrc = i;
});
for (const [n, pred] of [
  ["TraceShape.test.ts", (f) => f === TRACE_TEST],
  ["the base experiment", (f) => f === D + "base-experiment/moves.tsv"],
  ["PolicyArity.test.ts (RED)", (f) => f === ARITY_TEST],
  ["PolicyArity.tst.ts (RED)", (f) => f === ARITY_TST],
]) {
  const i = idx(pred);
  if (i < 0) bad.push(n + ": no commit");
  else if (firstSrc < 0 || i > firstSrc) bad.push(n + " does not precede the first src commit");
}
const traceCommits = log.filter((c) => c.f.includes(TRACE_TEST));
if (traceCommits.length !== 1 || !traceCommits[0].s.startsWith("test(51-02):")) {
  bad.push(`TraceShape.test.ts has ${traceCommits.length} commits; it must have one, test(51-02)`);
}
const after = idx((f) => f === D + "51-mutation-after.json");
if (after < 0 || after < lastSrc) bad.push("51-mutation-after.json does not follow the last src commit");
for (const c of plan) {
  const b = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!/^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/.test(b[b.length - 1])) {
    bad.push(`${c.h.slice(0, 8)} ${c.s} has no trailer`);
  }
}

// 7. Ids (WX-02): only the reserved ones are new, no placeholder, each new heading once.
const RES = ["ARCH-98", "ADR-QD-164", "CCR-QD-442", "BEH-QD-591", "BEH-QD-592", "BEH-QD-593", "BEH-QD-594", "BEH-QD-595", "INV-QD-347", "INV-QD-348"];
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
for (const id of RES.filter((x) => /^(BEH|INV)-/.test(x))) {
  const r = cp.spawnSync("git", ["grep", "-h", "-E", `^## ${id}:`, "HEAD", "--", "spec"], { encoding: "utf8" });
  const k = r.stdout.split("\n").filter(Boolean).length;
  if (k !== 1) bad.push(`${id} is a heading ${k} times`);
}

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
