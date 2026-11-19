// Phase 59's close scan (WX-01..WX-06; WENV-02..04; D-01..D-03, D-06, D-08, D-12..D-18). Read-only: it prints every
// finding and exits 1 on any, or prints "phase scan clean". Run from the repository root:
//   node .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-scan.mjs
import cp from "node:child_process";
import fs from "node:fs";

const D = ".planning/phases/QD-59-admission-produces-the-one-walk-environment/";
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(fs.readFileSync(D + "59-01-SUMMARY.md", "utf8")) || [])[1];
if (!B) {
  console.error("no phase_base in " + D + "59-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const lines = (s) => s.split("\n").filter(Boolean);
const bad = [];
const SRC = ":(glob)packages/*/src/**";
const CODE = [SRC, ":(glob)packages/*/test/**", ":(glob)packages/*/bench/**", ":(glob)features/**"];
const TRAILER = /^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/;
const AD = "packages/core/src/Admission.ts";
const PR = "packages/core/src/Predicate.ts";
const WK = "packages/core/src/Walk.ts";
const FEAT_SRC = [AD, PR, WK];
const RED = ["packages/core/test/Admission.test.ts", "packages/core/test/WalkEnvironment.tst.ts"];
// Green on the phase base and unedited through the phase (D-07, WX-06).
const CHARACTERISATION = [
  "packages/core/test/LeafMatrix.test.ts",
  "packages/core/test/Predicate.test.ts",
  "packages/core/test/RolesAndDepth.test.ts",
  "packages/core/test/DecisionCache.test.ts",
];
const ADR = "spec/decisions/172-admission-produces-the-one-walk-environment.md";
const AFTER = D + "bench/after/";

// 1. Scope: every path changed since phase_base outside .planning/ is one this phase names.
const ALLOWED = new Set([
  ...FEAT_SRC,
  ...RED,
  ADR,
  "spec/decisions/index.yaml",
  "spec/decisions/100-a-question-is-asked-once.md",
  "spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md",
  "spec/decisions/024-predicate-output.md",
  "spec/behaviors/05-evaluator.md",
  "spec/behaviors/16-predicates.md",
  "spec/invariants.md",
  "spec/traceability.md",
  "spec/README.md",
]);
// A test(59-06) gap commit may add or extend another core test file; it is held to packages/core/test/ here, and the
// characterisation files stay frozen below.
for (const c of lines(g("log", "--format=%H %s", B + "..HEAD")).filter((x) => / test\(59-06\): /.test(x)))
  for (const f of lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", c.slice(0, 40))))
    if (/^packages\/core\/test\//.test(f)) ALLOWED.add(f);
for (const f of lines(g("diff", "--name-only", B, "HEAD")))
  if (!f.startsWith(".planning/") && !ALLOWED.has(f)) bad.push("outside the phase scope: " + f);

// 2. Banned constructs (WX-04), net per file: added minus removed occurrences on code lines of src, test, bench and
// features. Import lines, alias specifiers and comment lines are skipped; strings and line comments are blanked first.
const strip = (t) =>
  t.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/g, '""').replace(/\/\/.*$/, "");
const skip = (t) =>
  /^\s*(import\b|\} from\b|export \{|export type \{|\*|\/\/|\/\*)/.test(t) ||
  /^\s*(type )?[A-Za-z_$][\w$]* as [A-Za-z_$][\w$]*,?$/.test(t);
const RULES = [
  ["as", /\bas\s+(?!const\b)(?:[A-Za-z_$]|[([{])/g, true],
  ["non-null !", /[\w)\]]!(?!=)/g, true],
  ["any", /(?<![\w$.])any(?![\w$])/g, true],
  ["switch", /\bswitch\s*\(/g, true],
  ["Effect.fnUntraced", /Effect\.fnUntraced\b/g, true],
  ["async/await", /(?<![\w$.])(async|await)(?![\w$])/g, true],
  ["console", /(?<![\w$.])console\./g, true],
  ["process.env", /\bprocess\.env\b/g, true],
  ["clock", /\bDate\.now\(|\bnew Date\(|\bperformance\.now\(/g, true],
  ["Record<string, unknown>", /Record<string,\s*unknown>/g, false],
];
const net = {};
let file = "";
for (const l of g("diff", "-U0", B, "HEAD", "--", ...CODE).split("\n")) {
  if (l.startsWith("+++ ")) {
    file = l.slice(6);
    continue;
  }
  if (l.startsWith("--- ") || !/^[+-]/.test(l) || !/\.tsx?$/.test(file)) continue;
  const body = l.slice(1);
  if (skip(body)) continue;
  const sign = l[0] === "+" ? 1 : -1;
  for (const [name, re, stripped] of RULES) {
    const n = ((stripped ? strip(body) : body).match(re) || []).length;
    if (n) net[name + " in " + file] = (net[name + " in " + file] || 0) + sign * n;
  }
}
for (const [k, n] of Object.entries(net)) if (n > 0) bad.push(k + ": " + n + " added");

// 3. Budgets that must not move (WENV-04): switch, Effect.fnUntraced and new PolicyTooDeep( across packages/*/src.
const count = (rev, pattern) =>
  lines(cp.spawnSync("git", ["grep", "-c", "-E", pattern, rev, "--", SRC], { encoding: "utf8" }).stdout || "")
    .map((x) => Number(x.split(":").pop()))
    .reduce((a, b) => a + b, 0);
for (const [name, pattern] of [["switch (", "switch \\("], ["Effect.fnUntraced", "Effect\\.fnUntraced"], ["new PolicyTooDeep(", "new PolicyTooDeep\\("]]) {
  const a = count(B, pattern);
  const b = count("HEAD", pattern);
  if (a !== b) bad.push(name + " count moved: " + a + " -> " + b);
}

// 4. Files that must not change: the barrels, manifests, configs, the gates and their budgets, the public surface
// (D-14: no public change, so no overview row and no changeset), the types the env reuses (D-02), the bench and the
// characterisation.
const frozen = g(
  "diff", "--name-only", B, "HEAD", "--",
  ":(glob)packages/*/src/index.ts", ":(glob)packages/*/package.json", ":(glob)packages/*/CHANGELOG.md",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".oxlintrc.json", ":(glob)tsconfig*.json",
  ":(glob)stryker*.mjs", ":(glob)scripts/**", "AGENTS.md", "spec/overview.md", ":(glob).changeset/**",
  "packages/core/src/Matcher.ts", "packages/core/src/LeafNeeds.ts", "packages/core/src/Question.ts",
  "packages/core/src/Evaluate.ts", ":(glob)packages/core/bench/**", ...CHARACTERISATION,
);
if (frozen) bad.push("changed and must not be: " + frozen.split("\n").join(" "));

// 5. Order (WX-06, D-08, D-09, D-06/D-18).
const L = lines(g("log", "--reverse", "--format=%H %s", B + "..HEAD")).map((x) => ({ h: x.slice(0, 40), s: x.slice(41) }));
const all = (re) => L.map((c, i) => (re.test(c.s) ? i : -1)).filter((i) => i >= 0);
const at = (h) => L.findIndex((c) => c.h === h);
const plan = L.filter((c) => /^\w+\(59-\d\d\)!?: /.test(c.s));
const firstCode = plan.find((c) => !/^docs\(59-01\): /.test(c.s));
if (!firstCode || !firstCode.s.startsWith("chore(59-02): ")) bad.push("the first plan commit after docs(59-01) is not chore(59-02)");
else {
  const f = lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", firstCode.h)).sort().join(" ");
  if (f !== D + "59-mutation-base.json " + D + "59-mutation.mjs") bad.push("chore(59-02) changes " + f);
  if (g("diff", "--name-only", B, firstCode.h + "^", "--", ":(exclude).planning/**")) bad.push("something outside .planning/ changed before chore(59-02)");
}
const rebase = lines(g("log", "--format=%h %s", B + "..HEAD", "--", D + "59-mutation-base.json", D + "59-mutation.mjs"));
if (rebase.length !== 1) bad.push("re-baselined or edited after chore(59-02): " + rebase.join("; "));
const srcCommits = lines(g("log", "--reverse", "--format=%H", B + "..HEAD", "--", SRC));
const firstSrc = srcCommits.length ? at(srcCommits[0]) : -1;
if (firstSrc < 0 || !L[firstSrc].s.startsWith("refactor(59-04): ")) bad.push("the first src commit is not refactor(59-04)");
const refs = all(/^refactor\(59-04\): /);
if (refs.length !== 1) bad.push("refactor(59-04) commits: " + refs.length + ", expected 1");
else {
  const f = lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", L[refs[0]].h));
  const src = f.filter((x) => /^packages\/[a-z-]+\/src\//.test(x)).sort().join(" ");
  if (src !== FEAT_SRC.join(" ")) bad.push("refactor(59-04) changes these src files: " + src);
  for (const x of f) if (!FEAT_SRC.includes(x) && x !== RED[0]) bad.push("refactor(59-04) also changes " + x);
}
const reds = all(/^test\(59-03\): .*RED/);
if (reds.length < 2) bad.push("test(59-03) RED commits: " + reds.length + ", expected 2");
for (const i of all(/^test\(59-03\): /)) if (firstSrc >= 0 && i > firstSrc) bad.push('"' + L[i].s + '" follows the first src commit');
const born = lines(g("log", "--reverse", "--diff-filter=A", "--format=%s", B + "..HEAD", "--", RED[1]));
if (born.length !== 1 || !/^test\(59-03\): .*RED/.test(born[0])) bad.push(RED[1] + " was not added by a test(59-03) RED commit");
for (const s of lines(g("log", "--format=%s", B + "..HEAD", "--", RED[1]))) if (!/^test\(59-0[36]\): /.test(s)) bad.push(RED[1] + " was changed by " + s);
// Every line a RED commit added to Admission.test.ts is still in it (the src commit re-points, it never deletes a row).
const head = new Set(fs.readFileSync(RED[0], "utf8").split("\n"));
for (const i of reds)
  for (const l of g("diff", "-U0", L[i].h + "^", L[i].h, "--", RED[0]).split("\n"))
    if (l.startsWith("+") && !l.startsWith("+++") && !head.has(l.slice(1))) bad.push(RED[0] + " lost a RED line: " + l.slice(1, 120));
const commentOnly = (from, paths) =>
  g("diff", "-U0", from, "HEAD", "--", ...paths).split("\n").filter((l) => /^[+-](?![+-]{2} )/.test(l) && l.slice(1).trim() !== "" && !/^\s*(\*|\/\*\*|\/\/|\*\/)/.test(l.slice(1)));
// The after-bench (D-06, D-18) is the LAST commit touching bench/after/analysis.tsv, it measured HEAD's source, and
// it passed.
const lastBench = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", AFTER + "analysis.tsv"))[0];
const bench = lastBench === undefined ? -1 : at(lastBench);
if (bench < 0 || !/^chore\(59-05\): /.test(L[bench].s)) bad.push("the last commit touching bench/after/analysis.tsv is not a chore(59-05)");
else {
  if (refs.length === 1 && bench < refs[0]) bad.push("the after-bench precedes refactor(59-04)");
  const tsv = fs.readFileSync(AFTER + "analysis.tsv", "utf8").trimEnd().split("\n");
  if (tsv[tsv.length - 1] !== "# gate: pass") bad.push("bench/after/analysis.tsv does not end with # gate: pass");
  const meta = fs.readFileSync(AFTER + "meta.txt", "utf8");
  const H = (/^head: ([0-9a-f]{40})$/m.exec(meta) || [])[1];
  if (!H) bad.push("bench/after/meta.txt names no head");
  else {
    if (!/^head_label: final$/m.test(meta) || !/^patched_label: base$/m.test(meta) || !/^rounds: 3$/m.test(meta)) bad.push("bench/after/meta.txt is not final/base over 3 rounds");
    const patch = g("diff", H, B, "--", "packages/core/src") + "\n";
    if (fs.readFileSync(AFTER + "to-base.patch", "utf8") !== patch) bad.push("bench/after/to-base.patch is not git diff <measured head> phase_base -- packages/core/src");
    const late = commentOnly(H, [SRC]);
    if (late.length) bad.push("src changed in code after the after-bench measured it: " + late[0].slice(0, 120));
  }
  if (!fs.existsSync(AFTER + "done.txt")) bad.push("bench/after/done.txt is missing (src was not restored)");
}
// The mutation evidence is the LAST commit touching 59-mutation-after.json (59-06's, or a review round's redo).
const lastAfter = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", D + "59-mutation-after.json"))[0];
const ev = lastAfter === undefined ? -1 : at(lastAfter);
const lastCode = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", ...CODE))[0];
if (ev < 0 || !/^chore\(59-06\): /.test(L[ev].s)) bad.push("the last commit touching 59-mutation-after.json is not a chore(59-06)");
// A code commit after the evidence may stand only when it changes comment lines alone, which neither adds a mutant
// nor changes a kill (Phase 58's review-round rule).
const lateCode = ev < 0 ? [] : commentOnly(L[ev].h, CODE);
if (ev < 0 || (at(lastCode) > ev && lateCode.length)) bad.push("59-mutation-after.json does not follow the last commit touching src, tests, bench or features" + (lateCode.length ? ": " + lateCode[0].slice(0, 120) : ""));
for (const c of plan) {
  const body = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!TRAILER.test(body[body.length - 1])) bad.push(c.h.slice(0, 8) + " " + c.s + " has no trailer");
}

// 6. Numbers (WX-02): the reservation is untouched, every reserved id is used, nothing else is new.
const res = JSON.parse(fs.readFileSync(g("rev-parse", "--git-common-dir") + "/qadi-reserved-ids.json", "utf8"));
if (JSON.stringify(res) !== JSON.stringify({ CCR: 452, ADR: 174, BEH: 645, INV: 368 }))
  bad.push("the reservation file reads " + JSON.stringify(res));
const BEHS = ["BEH-QD-631", "BEH-QD-632", "BEH-QD-633", "BEH-QD-634", "BEH-QD-635"];
const INVS = ["INV-QD-363", "INV-QD-364"];
const RESERVED = new Set(["ARCH-106", "ADR-QD-172", "CCR-QD-450", ...BEHS, ...INVS]);
const ID = /\b(?:(?:ADR|BEH|INV|CCR)-QD-\d+|ARCH-\d+)\b/g;
const before = new Set(cp.spawnSync("git", ["grep", "-ohE", "(ADR|BEH|INV|CCR)-QD-[0-9]+|ARCH-[0-9]+", B, "--", ".", ":(exclude).planning/**"], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout.split("\n").filter(Boolean));
const addedText = g("diff", "-U0", B, "HEAD", "--", ".", ":(exclude).planning/**").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
for (const id of new Set(addedText.match(ID) || [])) if (!before.has(id) && !RESERVED.has(id)) bad.push("an id outside the reservation and new to the tree: " + id);
if (/-QD-NEXT/.test(addedText)) bad.push("a placeholder id was added");
const specMd = lines(g("ls-files", "spec")).filter((f) => f.endsWith(".md"));
const heads = (re) => specMd.reduce((n, f) => n + fs.readFileSync(f, "utf8").split("\n").filter((l) => re.test(l)).length, 0);
for (const id of [...BEHS, ...INVS]) {
  const n = heads(new RegExp("^## " + id + ": "));
  if (n !== 1) bad.push(id + " is a heading " + n + " times");
}
if (heads(/^# ADR-QD-172 — /) !== 1) bad.push("ADR-QD-172 is not a heading once");
const readme = fs.readFileSync("spec/README.md", "utf8");
if (readme.split("\n").filter((l) => l.startsWith("| CCR-QD-450 |")).length !== 1) bad.push("CCR-QD-450 is not one row");
if (!/\| CCR-QD-450 \|.*ARCH-106\./.test(readme)) bad.push("the CCR-QD-450 row does not name ARCH-106");
if (!/\| CCR-QD-450 \|.*Unused: none\./.test(readme)) bad.push("the CCR-QD-450 row does not say Unused: none.");

// 7. The source the phase promised (WENV-02, WENV-03; D-01..D-03, D-12..D-16), read with comments stripped.
const code = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const flatOf = (s) => s.replace(/\(\s+/g, "(").replace(/,\s*\)/g, ")").replace(/\s+/g, " ");
const PROMISE = {
  [AD]: {
    has: [
      'export type RowSource = "asked" | "row";',
      "export class Admitted<Resource extends boolean = boolean> {",
      "constructor(readonly subject: AuthSubject, readonly supplied: Supplied<Resource>, readonly matcherContext: MatcherContext, readonly maxDepth: number) {}",
      "const RESOURCE_SUPPLIED: { readonly [Source in RowSource]: (question: Question) => boolean } = {",
      "asked: (question) => question.resource !== undefined,",
      "row: () => true,",
      'export function admit(question: Question, rowSource: "row"): Result.Result<Admitted<true>, PolicyTooDeep>;',
      "export function admit(question: Question, rowSource: RowSource): Result.Result<Admitted, PolicyTooDeep>;",
      "action: question.action !== undefined,",
      "resource: RESOURCE_SUPPLIED[rowSource](question),",
    ],
    not: [/readonly question\b/, /rowSource === /],
  },
  [WK]: {
    has: [
      "readonly admitted: Admitted;",
      "readonly concurrency: Concurrency | undefined;",
      "export const evaluateNode = (policy: Policy, request: Evaluation, depth: number): Effect.Effect<Trace, EvaluationError, PortServices> =>",
      "const { admitted } = request;",
      "const { maxDepth } = admitted;",
      "if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));",
      "const { subject, supplied, matcherContext } = admitted;",
      "const { action, resource } = matcherContext;",
      "evaluateAllOf(policy, request, depth)",
      "evaluateAnyOf(policy, request, depth)",
      "evaluateRules(policy, request, depth)",
      'const admitted = admit(question, "asked");',
      "return evaluateNode(question.policy, { admitted: admitted.success, concurrency }, 0);",
    ],
    not: [/matcherContext: MatcherContext/, /maxDepth: number/, /\bsupplied: \{/, /request\.supplied/, /depth \+ 1, maxDepth\)/, /\bsubject, request, matcherContext\b/],
  },
  [PR]: {
    has: [
      "const compileTree = (policy: Policy, admitted: Admitted<true>): Compiled =>",
      "const { subject, supplied, matcherContext: context } = admitted;",
      'const admitted = admit(question, "row");',
      "const compiled = compileTree(policy, admitted.success);",
    ],
    not: [/\bSupplied\b/, /admitted\.question/],
  },
};
for (const [f, { has, not }] of Object.entries(PROMISE)) {
  const s = code(f);
  const flat = flatOf(s);
  for (const x of has) if (!s.includes(x) && !flat.includes(x)) bad.push(f + " lacks " + x);
  for (const re of not) if (re.test(s)) bad.push(f + " still holds " + re.source);
}
// Recursion passes one environment and one depth (D-03, D-16): nine recursive calls, each `(child, request, depth + 1)`.
const wk = flatOf(code(WK));
const rec = (wk.match(/evaluateNode\([^()]*, request, depth \+ 1\)/g) || []).length;
if (rec !== 9) bad.push(WK + " has " + rec + " recursive evaluateNode(…, request, depth + 1) calls, not 9");
const calls = (wk.match(/evaluateNode\(/g) || []).length;
if (calls !== 10) bad.push(WK + " calls evaluateNode " + calls + " times, not 10 (9 recursive and the root)");
// Admission runs inside walk's Effect.suspend (a cache hit never admits) and before toPredicate's field check.
const w = wk.slice(wk.indexOf("export const walk = ("));
if (!(w.indexOf("Effect.suspend(() =>") >= 0 && w.indexOf("Effect.suspend(() =>") < w.indexOf("admit(question"))) bad.push(WK + ": walk does not admit inside Effect.suspend");
const pr = flatOf(code(PR));
if (!(pr.indexOf('admit(question, "row")') >= 0 && pr.indexOf('admit(question, "row")') < pr.indexOf("if (restrictsFields(policy))"))) bad.push(PR + ": toPredicate does not admit before its field check");
// Holding an Admitted stays the proof: only admit builds one (D-01).
for (const f of lines(cp.spawnSync("git", ["grep", "-lF", "new Admitted(", "--", "packages/core/src"], { encoding: "utf8" }).stdout || ""))
  if (f !== AD && code(f).includes("new Admitted(")) bad.push(f + " builds an Admitted outside admit");
if ((code(AD).match(/new Admitted\(/g) || []).length !== 1) bad.push(AD + " does not build an Admitted exactly once");
// The tests the phase promised (WENV-02, WENV-03).
if (!fs.readFileSync(RED[0], "utf8").includes('describe("admit builds the walk environment"')) bad.push(RED[0] + " lacks the walk environment rows");
if (!fs.existsSync(RED[1]) || !fs.readFileSync(RED[1], "utf8").includes("type.not.toBeAssignableTo<Environment>()")) bad.push(RED[1] + " lacks the depth/environment negative");

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
