// Phase 61's close scan (CASK-02..04, WX-01..WX-07; D-01..D-15). Read-only: it prints every finding and exits 1 on any,
// or prints "phase scan clean". Run from the repository root:
//   node .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-scan.mjs
import cp from "node:child_process";
import fs from "node:fs";

const D = ".planning/phases/QD-61-decisioncache-is-asked-only-the-question/";
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(fs.readFileSync(D + "61-01-SUMMARY.md", "utf8")) || [])[1];
if (!B) {
  console.error("no phase_base in " + D + "61-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const lines = (s) => s.split("\n").filter(Boolean);
const bad = [];
const SRC = ":(glob)packages/*/src/**";
const CODE = [SRC, ":(glob)packages/*/test/**", ":(glob)packages/*/bench/**", ":(glob)features/**", ":(glob)examples/**"];
const TRAILER = /^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/;
const C = "packages/core/";
const DC = C + "src/DecisionCache.ts";
const LC = C + "src/Lifecycle.ts";
const QS = C + "src/Question.ts";
// The one GREEN commit's source files (D-01, D-02, D-11), sorted.
const GREEN_SRC = [DC, LC, QS];
const CACHE_TEST = C + "test/DecisionCache.test.ts";
const TST = C + "test/DecisionCache.tst.ts";
const LIFE_TEST = C + "test/Lifecycle.test.ts";
// Written on the base by test(61-02) commits: the characterisations and the race (green), the type pins (RED).
const RED = [CACHE_TEST, TST];
// What the GREEN commit may change beside its source: the one hand-written double and the race test's one call.
const GREEN_TESTS = [LIFE_TEST, CACHE_TEST];
const CHANGESET = ".changeset/core-decision-cache-asked-the-question.md";
const UPGRADING = "apps/website/src/content/docs/docs/reference/upgrading.md";
const ADR = "spec/decisions/174-a-decision-cache-is-asked-the-question.md";
const BEH21 = "spec/behaviors/21-decision-cache.md";
const BEH25 = "spec/behaviors/25-inspection.md";
const DOCS = [UPGRADING, CHANGESET];
const SPEC = [
  ADR,
  "spec/decisions/index.yaml",
  "spec/decisions/031-decision-cache.md",
  "spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md",
  BEH21,
  BEH25,
  "spec/invariants.md",
  "spec/traceability.md",
  "spec/README.md",
];

// 1. Scope: every path changed since phase_base outside .planning/ is one this phase names.
// Review round 1 (IN-05) adds two comment-only files: the metric's JSDoc and a devtools test's comments.
const METRICS = C + "src/EvaluationMetrics.ts";
const SIMULATOR_TEST = "packages/devtools/test/react/Simulator.test.tsx";
const ALLOWED = new Set([...GREEN_SRC, ...RED, LIFE_TEST, ...DOCS, ...SPEC, METRICS, SIMULATOR_TEST]);
// A test(61-04) gap commit may add or extend another core test file (a survivor closed by a test, D-06).
for (const c of lines(g("log", "--format=%H %s", B + "..HEAD")).filter((x) => / test\(61-04\): /.test(x)))
  for (const f of lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", c.slice(0, 40))))
    if (f.startsWith(C + "test/")) ALLOWED.add(f);
for (const f of lines(g("diff", "--name-only", B, "HEAD")))
  if (!f.startsWith(".planning/") && !ALLOWED.has(f)) bad.push("outside the phase scope: " + f);

// 2. Banned constructs (WX-04, D-09), net per file: added minus removed occurrences on code lines of src, test, bench,
// features and examples. Import lines, alias specifiers and comment lines are skipped; strings and line comments are
// blanked first.
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

// 3. Budgets that must not move: switch and Effect.fnUntraced across packages/*/src.
const count = (rev, pattern) =>
  lines(cp.spawnSync("git", ["grep", "-c", "-E", pattern, rev, "--", SRC], { encoding: "utf8" }).stdout || "")
    .map((x) => Number(x.split(":").pop()))
    .reduce((a, b) => a + b, 0);
for (const [name, pattern] of [["switch (", "switch \\("], ["Effect.fnUntraced", "Effect\\.fnUntraced"]]) {
  const a = count(B, pattern);
  const b = count("HEAD", pattern);
  if (a !== b) bad.push(name + " count moved: " + a + " -> " + b);
}

// 4. Files that must not change: manifests, configs (core's Stryker config included, research Q7), AGENTS.md, the core
// barrel (the walk stays private, D-13), SharedComputation (its rules and interface, D-04), the walk, the metric whose
// description names getOrCompute (ADR-QD-123), the bench (D-10, D-14) and the overview (no export moves, WX-03).
const frozen = g(
  "diff", "--name-only", B, "HEAD", "--",
  ":(glob)packages/*/package.json", ":(glob)packages/*/CHANGELOG.md", "package.json", "pnpm-lock.yaml",
  "pnpm-workspace.yaml", ".oxlintrc.json", ":(glob)tsconfig*.json", ":(glob)stryker*.mjs", "tstyche.json", "AGENTS.md",
  C + "src/index.ts", C + "src/SharedComputation.ts", C + "src/Walk.ts",
  C + "bench/DecisionCache.bench.ts", "spec/overview.md",
);
if (frozen) bad.push("changed and must not be: " + frozen.split("\n").join(" "));
// The metric's description is its registry key (ADR-QD-123), so its code stays frozen; only its comments may change
// (IN-05). Compare every non-comment line against phase_base, strings kept whole and comments stripped from both sides.
const noComments = (t) =>
  t
    .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|\/\*[\s\S]*?\*\/|\/\/.*$/gm, (_, str) => str ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
if (noComments(g("show", B + ":" + METRICS)) !== noComments(fs.readFileSync(METRICS, "utf8"))) bad.push(METRICS + " changed beyond its comments");
const others = g(
  "diff", "--name-only", B, "HEAD", "--", ":(glob)packages/**", ":(glob)scripts/**", ":(exclude,glob)packages/core/**",
  ":(exclude)" + SIMULATOR_TEST,
);
if (others) bad.push("another package or a gate changed: " + others.split("\n").join(" "));
const added = lines(g("diff", "--name-status", B, "HEAD", "--", ".changeset"));
if (added.length !== 1 || added[0] !== "A\t" + CHANGESET) bad.push(".changeset since phase_base: " + added.join("; "));

// 5. Order (WX-06, D-05).
const L = lines(g("log", "--reverse", "--format=%H %s", B + "..HEAD")).map((x) => ({ h: x.slice(0, 40), s: x.slice(41) }));
// A review round's fix may touch a file again after its plan commit; the mutation evidence must then follow it.
const FIX = /^fix\(61(-\d\d)?\): /;
const all = (re) => L.map((c, i) => (re.test(c.s) ? i : -1)).filter((i) => i >= 0);
const at = (h) => L.findIndex((c) => c.h === h);
const filesOf = (h) => lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", h));
const by = (x) => lines(g("log", "--format=%H %s", B + "..HEAD", "--", x)).map((y) => ({ h: y.slice(0, 40), s: y.slice(41) }));
// A same-phase test fix (a pin that needed correcting, as Phase 60's 5d297faf did) is accepted only when its plan's
// SUMMARY records its short hash.
const recorded = (c) => {
  const m = /^test\((61-0[34])\): /.exec(c.s);
  if (!m) return false;
  const S = D + m[1] + "-SUMMARY.md";
  return fs.existsSync(S) && fs.readFileSync(S, "utf8").includes(c.h.slice(0, 8));
};
const plan = L.filter((c) => /^\w+\(61(-\d\d)?\)!?: /.test(c.s));
const first = plan[0];
if (!first || !first.s.startsWith("chore(61-01): ")) bad.push("the first plan commit after phase_base is not chore(61-01)");
else {
  const f = filesOf(first.h).sort().join(" ");
  if (f !== D + "61-mutation-base.json " + D + "61-mutation.mjs") bad.push("chore(61-01) changes " + f);
  if (g("diff", "--name-only", B, first.h + "^", "--", ":(exclude).planning/**")) bad.push("something outside .planning/ changed before chore(61-01)");
}
const rebase = lines(g("log", "--format=%h %s", B + "..HEAD", "--", D + "61-mutation-base.json", D + "61-mutation.mjs"));
if (rebase.length !== 1) bad.push("re-baselined or edited after chore(61-01): " + rebase.join("; "));
const srcCommits = lines(g("log", "--reverse", "--format=%H", B + "..HEAD", "--", SRC));
const firstSrc = srcCommits.length ? at(srcCommits[0]) : -1;
if (firstSrc < 0 || !/^feat\(61-03\)!: /.test(L[firstSrc].s)) bad.push("the first src commit is not feat(61-03)!");
for (const h of srcCommits) {
  const s = L[at(h)].s;
  if (!/^feat\(61-03\)!: /.test(s) && !FIX.test(s)) bad.push("a src file was changed by " + s);
}
const greens = all(/^feat\(61-03\)!?: /);
if (greens.length !== 1) bad.push("feat(61-03) commits: " + greens.length + ", expected 1");
else {
  const f = filesOf(L[greens[0]].h);
  const src = f.filter((x) => /^packages\/[a-z-]+\/src\//.test(x)).sort().join(" ");
  if (src !== [...GREEN_SRC].sort().join(" ")) bad.push("feat(61-03) changes these src files: " + src);
  for (const x of f) if (!GREEN_SRC.includes(x) && !GREEN_TESTS.includes(x)) bad.push("feat(61-03) also changes " + x);
}
const reds = all(/^test\(61-02\): RED /);
if (reds.length !== 1) bad.push("test(61-02) RED commits: " + reds.length + ", expected 1");
else if (filesOf(L[reds[0]].h).join(" ") !== TST) bad.push("the RED commit changes " + filesOf(L[reds[0]].h).join(" "));
for (const i of all(/^test\(61-02\): /)) {
  if (firstSrc >= 0 && i > firstSrc) bad.push('"' + L[i].s + '" follows the first src commit');
  if (reds.length === 1 && i > reds[0]) bad.push('"' + L[i].s + '" follows the RED commit');
  for (const x of filesOf(L[i].h)) if (!RED.includes(x)) bad.push('"' + L[i].s + '" changes ' + x);
}
for (const c of by(TST)) if (!/^test\(61-02\): RED /.test(c.s) && !FIX.test(c.s) && !recorded(c)) bad.push(TST + " was changed by " + c.s);
for (const c of by(CACHE_TEST))
  if (!/^(test\(61-0[24]\)|feat\(61-03\)!): /.test(c.s) && !FIX.test(c.s) && !recorded(c)) bad.push(CACHE_TEST + " was changed by " + c.s);
for (const c of by(LIFE_TEST))
  if (!/^(test\(61-04\)|feat\(61-03\)!): /.test(c.s) && !FIX.test(c.s) && !recorded(c)) bad.push(LIFE_TEST + " was changed by " + c.s);
const commentOnly = (from, paths) =>
  g("diff", "-U0", from, "HEAD", "--", ...paths).split("\n").filter((l) => /^[+-](?![+-]{2} )/.test(l) && l.slice(1).trim() !== "" && !/^\s*(\*|\/\*\*|\/\/|\*\/)/.test(l.slice(1)));
// The mutation evidence is the LAST commit touching 61-mutation-after.json or 61-mutation-static.json (61-04's, or a
// review round's redo), and no code line changed after it. One run writes both files; a re-run whose after-scores are
// byte-identical leaves only 61-mutation-static.json in its commit, so the newest touch of either dates the evidence.
const lastAfter = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", D + "61-mutation-after.json", D + "61-mutation-static.json"))[0];
const ev = lastAfter === undefined ? -1 : at(lastAfter);
if (ev < 0 || !/^chore\(61(-04)?\): /.test(L[ev].s)) bad.push("the last commit touching the mutation evidence is not a chore(61-04) or a review round's chore(61)");
else {
  const late = commentOnly(L[ev].h, CODE);
  if (late.length) bad.push("the mutation evidence does not follow the last code change: " + late[0].slice(0, 120));
  if (greens.length === 1 && ev < greens[0]) bad.push("the mutation evidence precedes feat(61-03)");
}
if (!fs.existsSync(D + "61-mutation-after.json")) bad.push("missing: " + D + "61-mutation-after.json");
for (const c of plan) {
  const body = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!TRAILER.test(body[body.length - 1])) bad.push(c.h.slice(0, 8) + " " + c.s + " has no trailer");
}

// 6. Numbers (WX-02, D-08): the reservation is untouched, every reserved id is used, nothing else is new.
const res = JSON.parse(fs.readFileSync(g("rev-parse", "--git-common-dir") + "/qadi-reserved-ids.json", "utf8"));
if (JSON.stringify(res) !== JSON.stringify({ CCR: 452, ADR: 174, BEH: 645, INV: 368 }))
  bad.push("the reservation file reads " + JSON.stringify(res));
const BEHS = ["BEH-QD-641", "BEH-QD-642", "BEH-QD-643", "BEH-QD-644", "BEH-QD-645"];
const INVS = ["INV-QD-367", "INV-QD-368"];
const RESERVED = new Set(["ARCH-108", "ADR-QD-174", "CCR-QD-452", ...BEHS, ...INVS]);
const ID = /\b(?:(?:ADR|BEH|INV|CCR)-QD-\d+|ARCH-\d+)\b/g;
const before = new Set(cp.spawnSync("git", ["grep", "-ohE", "(ADR|BEH|INV|CCR)-QD-[0-9]+|ARCH-[0-9]+", B, "--", ".", ":(exclude).planning/**"], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout.split("\n").filter(Boolean));
const addedText = g("diff", "-U0", B, "HEAD", "--", ".", ":(exclude).planning/**").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
const used = new Set(addedText.match(ID) || []);
for (const id of used) if (!before.has(id) && !RESERVED.has(id)) bad.push("an id outside the reservation and new to the tree: " + id);
for (const id of RESERVED) if (!used.has(id)) bad.push("a reserved id is not used: " + id);
if (/-QD-NEXT/.test(addedText)) bad.push("a placeholder id was added");
const specMd = lines(g("ls-files", "spec")).filter((f) => f.endsWith(".md"));
const heads = (re) => specMd.reduce((n, f) => n + fs.readFileSync(f, "utf8").split("\n").filter((l) => re.test(l)).length, 0);
for (const id of [...BEHS, ...INVS]) {
  const n = heads(new RegExp("^## " + id + ": "));
  if (n !== 1) bad.push(id + " is a heading " + n + " times");
}
if (heads(/^# ADR-QD-174 — /) !== 1) bad.push("ADR-QD-174 is not a heading once");
const readme = fs.readFileSync("spec/README.md", "utf8");
if (readme.split("\n").filter((l) => l.startsWith("| CCR-QD-452 |")).length !== 1) bad.push("CCR-QD-452 is not one row");
if (!/\| CCR-QD-452 \|.*\| ARCH-108\./.test(readme)) bad.push("the CCR-QD-452 row does not open its summary with ARCH-108.");
if (!/\| CCR-QD-452 \|.*Unused:\s+none\./.test(readme)) bad.push("the CCR-QD-452 row does not say Unused: none.");
if (!/id: "ADR-QD-174"/.test(fs.readFileSync("spec/decisions/index.yaml", "utf8"))) bad.push("index.yaml has no ADR-QD-174 entry");
for (const f of ["spec/decisions/031-decision-cache.md", "spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md"])
  if (!/CCR-QD-452[\s\S]*ADR-QD-174|ADR-QD-174[\s\S]*CCR-QD-452/.test(fs.readFileSync(f, "utf8"))) bad.push(f + " carries no amendment naming CCR-QD-452 and ADR-QD-174");

// 7. The interface and the source the phase promised (D-01..D-04, D-11..D-15).
const read = (f) => {
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  bad.push("missing: " + f);
  return "";
};
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
// Prose with comment markers and line wraps folded to single spaces, so a phrase matches however it was wrapped.
const prose = (f) => read(f).replace(/\n\s*(\*|\/\/|>)?\s?/g, " ").replace(/\s+/g, " ");
const PROMISE = {
  [DC]: {
    has: [
      /import type \{ EvaluateOptions, Question \} from "\.\/Question\.ts";/,
      /import \{ walk \} from "\.\/Walk\.ts";/,
      /options\?:\s*Pick<EvaluateOptions,\s*"concurrency">/,
      /shared\.run\(\s*key,\s*walk\(\s*key,\s*options\?\.concurrency\s*\)\s*\)/,
    ],
    not: [/\bcompute\b/, /\{\s*concurrency:/],
  },
  [LC]: {
    has: [/cache\.value\.getOrCompute\(\s*question,\s*options\s*\)/, /walk\(\s*question,\s*options\?\.concurrency\s*\)/],
    not: [/const answer\b/, /\{\s*concurrency:\s*options\?\.concurrency\s*\}/],
  },
  [C + "src/index.ts"]: { has: [], not: [/Walk\.ts/] },
  [LIFE_TEST]: {
    has: [/\(decisionCacheLayer\(\)\)/, /inner\.getOrCompute\(\s*key,\s*options\s*\)/],
    not: [/\bcompute\b/, /Layer\.succeed\(\s*DecisionCache\b/, /\bas const\b/],
  },
  [CACHE_TEST]: {
    has: [
      /cache\.getOrCompute\(\s*question\s*\);/,
      /for \(let gap = 0; gap <= 48; gap\+\+\)/,
      /"the same question asked with two concurrencies is one entry, in both orders"/,
      /"concurrency crosses the cache into the walk; a sequential ask then hits"/,
      /"a coalesced joiner's concurrency is unused: the claimant's governs the one walk, in both orders"/,
    ],
    not: [/from "\.\.\/src\/Walk\.ts"/, /getOrCompute\(\s*\w+\s*,/, /const trace = \(label/],
  },
  [TST]: {
    has: [
      /type GetOrCompute = Params<DecisionCacheShape\["getOrCompute"\]>;/,
      /not\.toBeCallableWith\(question, compute\)/,
      /not\.toBeCallableWith\(question, \(\) => compute\)/,
      /not\.toBeCallableWith\(question, \{ concurrency: "unbounded" \}, compute\)/,
      /\.toBeCallableWith\(question\);/,
      /\/\/ @ts-expect-error[^\n]*\nexport \{ walk \} from "\.\.\/src\/index\.ts";/,
    ],
    not: [],
  },
};
// The one place `compute` may appear in DecisionCache.ts: the title of the test its doc cites, verbatim (review WR-02).
const CITED_TITLE = "a coalesced waiter's interruption does not interrupt the shared compute \u2014 the other waiter still gets a result";
for (const [f, { has, not }] of Object.entries(PROMISE)) {
  const s = read(f);
  const whole = f === DC ? prose(f).replace(CITED_TITLE, "") : s;
  for (const re of has) if (!re.test(s)) bad.push(f + " lacks " + re.source);
  for (const re of not) if (re.test(f === DC || f === LIFE_TEST ? whole : code(f))) bad.push(f + " still holds " + re.source);
}
// One walk call in each module: the cache's own (D-01) and the lifecycle's no-cache branch.
for (const f of [DC, LC]) {
  const n = (code(f).match(/\bwalk\(/g) || []).length;
  if (n !== 1) bad.push(f + " calls walk " + n + " times, expected 1");
}
// The docs in source say what the cache now owns (D-02, D-12).
const dcDoc = prose(DC);
if (!/walks\s+the\s+question\s+it\s+is\s+given/.test(dcDoc)) bad.push(DC + " does not say the cache walks the question it is given");
if (!/the\s+claimant's\s+governs/.test(dcDoc)) bad.push(DC + " does not say a joiner's concurrency is unused and the claimant's governs");
if (!/a\s+trace\s+for\s+exactly\s+that\s+question/.test(prose(QS))) bad.push(QS + " does not say a hand-written cache answers with a trace for exactly that question");
// The spec no longer names a caller's `compute` in a requirement (BEH-QD-166, BEH-QD-190).
if (/`compute` is still in flight/.test(read(BEH21)) || /`compute`\s+is\s+still\s+in\s+flight/.test(prose(BEH21))) bad.push(BEH21 + " still names a `compute` in flight");
if (/cancel\s+a\s+`compute`/.test(prose(BEH25))) bad.push(BEH25 + " still names a `compute` in BEH-QD-190");
// The record of the break (WX-07).
const up = read(UPGRADING);
if (up.split("\n").filter((l) => l === "## 0.13: a DecisionCache is asked only the question").length !== 1) bad.push(UPGRADING + " lacks one 0.13 decision-cache section");
const section = up.slice(up.indexOf("## 0.13: a DecisionCache is asked only the question"));
const sectionEnd = section.indexOf("\n## ", 4);
const sec = sectionEnd < 0 ? section : section.slice(0, sectionEnd);
if (!sec.includes("```typescript\n")) bad.push(UPGRADING + "'s 0.13 decision-cache section has no compiled fence");
if (!/Layer\.provide\(decisionCacheLayer\(\)\)/.test(sec)) bad.push(UPGRADING + "'s 0.13 decision-cache section does not delegate to decisionCacheLayer()");
if (!/TS2559/.test(sec)) bad.push(UPGRADING + "'s 0.13 decision-cache section does not name the compile error");
if (!/ADR-QD-174/.test(sec)) bad.push(UPGRADING + "'s 0.13 decision-cache section does not cite ADR-QD-174");
const cs = read(CHANGESET);
if (!/^---\n"@qadi\/core": minor\n---\n/.test(cs) || !cs.includes("**Breaking.**")) bad.push(CHANGESET + " is not one Breaking @qadi/core minor");
if (!/decisionCacheLayer\(\)/.test(cs)) bad.push(CHANGESET + " does not name decisionCacheLayer() as the route for a host cache");

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
