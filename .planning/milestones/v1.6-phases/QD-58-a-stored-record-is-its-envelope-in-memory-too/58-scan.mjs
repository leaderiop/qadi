// Phase 58's close scan (WX-01, WX-02, WX-04, WX-06; D-01..D-06, D-12, D-14, D-16). Read-only: it prints every
// finding and exits 1 on any, or prints "phase scan clean". Run from the repository root:
//   node .planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/58-scan.mjs
import cp from "node:child_process";
import fs from "node:fs";

const D = ".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/";
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(fs.readFileSync(D + "58-01-SUMMARY.md", "utf8")) || [])[1];
if (!B) {
  console.error("no phase_base in " + D + "58-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const lines = (s) => s.split("\n").filter(Boolean);
const bad = [];
const SRC = ":(glob)packages/*/src/**";
const CODE = [SRC, ":(glob)packages/*/test/**", ":(glob)packages/*/bench/**", ":(glob)features/**"];
const TRAILER = /^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/;
const CHARACTERISATION = [
  "packages/core/test/StoredEnvelope.test.ts",
  "packages/core/test/StoredEnvelope.tst.ts",
  "packages/devtools/test/model/StoredOrder.test.ts",
  "packages/http/test/StoredEnvelopeWire.test.ts",
];
const FEAT_SRC = [
  "packages/core/src/DecisionLog.ts",
  "packages/core/src/DecisionRecord.ts",
  "packages/core/src/SinkCodec.ts",
  "packages/devtools/src/model/Timeline.ts",
];
const DOC_SRC = ["packages/audit/src/AuditArchive.ts", "packages/devtools/src/model/Source.ts"];

// 1. Scope: every path changed since phase_base outside .planning/ is one this phase names.
const ALLOWED = new Set([
  ...CHARACTERISATION,
  ...FEAT_SRC,
  ...DOC_SRC,
  "packages/core/test/SinkCodec.test.ts",
  "packages/core/test/DecisionRecord.test.ts",
  "packages/core/test/DecisionLog.test.ts",
  "packages/core/test/DecisionSinkForwarding.test.ts",
  "packages/core/test/DecisionStream.test.ts",
  "packages/core/test/EvaluationEnvironment.test.ts",
  "packages/core/test/DecisionSink.tst.ts",
  "packages/core/test/ShippedSinkReports.test.ts",
  "packages/devtools/test/helpers.ts",
  "packages/devtools/test/model/Source.test.ts",
  "packages/http/test/decisionStream.test.ts",
  "packages/http/test/DecisionLogHttp.test.ts",
  "packages/http/test/decisionBacklog.test.ts",
  "packages/react/test/QadiAtoms.test.ts",
  "packages/testing/test/QadiReviewLayer.test.ts",
  "features/features/decision-log/decision-log.steps.test.ts",
  "features/features/merged-sources/merged-sources.steps.test.ts",
  "features/features/devtools/devtools.steps.test.ts",
  "features/features/devtools-screens/devtools-screens.steps.test.ts",
  "features/features/devtools-simulator/devtools-simulator.steps.test.ts",
  "scripts/check-package-install.mjs",
  "spec/overview.md",
  "spec/decisions/171-a-stored-record-is-its-envelope-in-memory-too.md",
  "spec/decisions/index.yaml",
  "spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md",
  "spec/decisions/135-sink-record-fields-stated-once.md",
  "spec/decisions/159-the-sink-emitter-reports-what-it-contains.md",
  "spec/behaviors/24-decision-sink.md",
  "spec/behaviors/25-inspection.md",
  "spec/behaviors/26-decision-stream.md",
  "spec/behaviors/27-devtools-timeline.md",
  "spec/behaviors/33-audit-pipeline.md",
  "spec/invariants.md",
  "spec/traceability.md",
  "spec/README.md",
  ".changeset/core-stored-record-is-its-envelope.md",
  ".changeset/http-stored-record-is-its-envelope.md",
  ".changeset/devtools-stored-record-is-its-envelope.md",
  "apps/website/src/content/docs/docs/reference/upgrading.md",
]);
// The feat(58-04)! commit and a test(58-05) gap commit may touch another test file the typecheck named; both are held
// to packages/<pkg>/test/ and features/features/ here.
for (const c of lines(g("log", "--format=%H %s", B + "..HEAD")).filter((x) => / (feat\(58-04\)!|test\(58-05\)): /.test(x)))
  for (const f of lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", c.slice(0, 40))))
    if (/^packages\/[a-z-]+\/test\//.test(f) || /^features\/features\//.test(f)) ALLOWED.add(f);
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

// 4. Files that must not change: the barrels, manifests, configs, the gates' budgets, the http source (D-15), the
// stream and attribute docs that stay true, and the Phase 57 refusal pins and wire fixtures (D-05).
const frozen = g(
  "diff", "--name-only", B, "HEAD", "--",
  ":(glob)packages/*/src/index.ts", ":(glob)packages/*/package.json", ":(glob)packages/*/CHANGELOG.md",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".oxlintrc.json", ":(glob)tsconfig*.json",
  ":(glob)stryker*.mjs", "scripts/check-house-style.mjs", "AGENTS.md", ":(glob)packages/http/src/**",
  "packages/core/src/DecisionStream.ts", "packages/core/src/AttributeResolver.ts",
  "packages/devtools/src/model/TimelineStore.ts", "packages/core/test/UntrustedSeams.test.ts",
  "packages/core/test/fixtures/sinkWireV2.ts",
);
if (frozen) bad.push("changed and must not be: " + frozen.split("\n").join(" "));
// The doc-only source files change comment lines only.
for (const f of DOC_SRC)
  for (const l of g("diff", "-U0", B, "HEAD", "--", f).split("\n"))
    if (/^[+-](?![+-]{2} )/.test(l) && l.slice(1).trim() !== "" && !/^\s*(\*|\/\*\*|\/\/|\*\/)/.test(l.slice(1)))
      bad.push(f + " changed a non-comment line: " + l.slice(0, 120));

// 5. Order (WX-06, D-09, D-14, D-16).
const L = lines(g("log", "--reverse", "--format=%H %s", B + "..HEAD")).map((x) => ({ h: x.slice(0, 40), s: x.slice(41) }));
const idx = (re) => L.findIndex((c) => re.test(c.s));
const all = (re) => L.map((c, i) => (re.test(c.s) ? i : -1)).filter((i) => i >= 0);
const plan = L.filter((c) => /^\w+\(58-\d\d\)!?: /.test(c.s));
if (!plan.length || !plan[0].s.startsWith("chore(58-01): ")) bad.push("the first plan commit is not chore(58-01)");
else {
  const f = lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", plan[0].h)).sort().join(" ");
  if (f !== D + "58-mutation-base.json " + D + "58-mutation.mjs") bad.push("chore(58-01) changes " + f);
  if (g("rev-parse", plan[0].h + "^") !== B) bad.push("chore(58-01) does not sit on phase_base");
}
const rebase = lines(g("log", "--format=%h %s", B + "..HEAD", "--", D + "58-mutation-base.json", D + "58-mutation.mjs"));
if (rebase.length !== 1) bad.push("re-baselined or edited after chore(58-01): " + rebase.join("; "));
const srcCommits = lines(g("log", "--reverse", "--format=%H", B + "..HEAD", "--", SRC));
const firstSrc = L.findIndex((c) => c.h === srcCommits[0]);
if (firstSrc < 0 || !L[firstSrc].s.startsWith("feat(58-04)!: ")) bad.push("the first src commit is not feat(58-04)!");
const feats = all(/^feat\(58-04\)!: /);
if (feats.length !== 1) bad.push("feat(58-04)! commits: " + feats.length + ", expected 1 (D-14)");
else {
  const f = lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", L[feats[0]].h));
  const src = f.filter((x) => /^packages\/[a-z-]+\/src\//.test(x)).sort().join(" ");
  if (src !== FEAT_SRC.join(" ")) bad.push("feat(58-04)! changes these src files: " + src);
  for (const x of CHARACTERISATION) if (f.includes(x)) bad.push("feat(58-04)! edits the characterisation file " + x);
}
for (const [name, re] of [["test(58-02)", /^test\(58-02\): /], ["test(58-03)", /^test\(58-03\): /]]) {
  const at = all(re);
  if (!at.length) bad.push("no " + name + " commit");
  for (const i of at) if (firstSrc >= 0 && i > firstSrc) bad.push('"' + L[i].s + '" follows the first src commit');
}
if (!all(/^test\(58-02\): .*RED/).length) bad.push("no test(58-02) RED commit");
for (const x of CHARACTERISATION) {
  const touched = lines(g("log", "--format=%s", B + "..HEAD", "--", x));
  for (const s of touched) if (!/^test\(58-0[235]\): /.test(s)) bad.push(x + " was changed by " + s);
}
const d5 = idx(/^docs\(58-05\): /);
if (d5 >= 0 && feats.length === 1 && d5 < feats[0]) bad.push("docs(58-05) precedes feat(58-04)!");
// The evidence is the LAST commit touching 58-mutation-after.json (58-05's, or a review round's redo after it).
const lastAfter = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", D + "58-mutation-after.json"))[0];
const ev = lastAfter === undefined ? -1 : L.findIndex((c) => c.h === lastAfter);
const lastCode = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", ...CODE))[0];
if (ev < 0 || !/^chore\(58-05\): /.test(L[ev].s)) bad.push("the last commit touching 58-mutation-after.json is not a chore(58-05)");
// Orchestrator-authorised (review round): a code commit after the evidence may stand only when it changes comment
// lines alone, which neither adds a mutant nor changes a kill; the after-run re-done on that tree was byte-identical.
const lateCode = ev < 0 ? [] : g("diff", "-U0", L[ev].h, "HEAD", "--", ...CODE).split("\n").filter((l) => /^[+-](?![+-]{2} )/.test(l) && l.slice(1).trim() !== "" && !/^\s*(\*|\/\*\*|\/\/|\*\/)/.test(l.slice(1)));
if (ev < 0 || (L.findIndex((c) => c.h === lastCode) > ev && lateCode.length)) bad.push("58-mutation-after.json does not follow the last commit touching src, tests, bench or features" + (lateCode.length ? ": " + lateCode[0].slice(0, 120) : ""));
for (const c of plan) {
  const body = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!TRAILER.test(body[body.length - 1])) bad.push(c.h.slice(0, 8) + " " + c.s + " has no trailer");
}

// 6. Numbers (WX-02): the reservation is untouched, every reserved id is used once, nothing else is new.
const res = JSON.parse(fs.readFileSync(g("rev-parse", "--git-common-dir") + "/qadi-reserved-ids.json", "utf8"));
if (JSON.stringify(res) !== JSON.stringify({ CCR: 452, ADR: 174, BEH: 645, INV: 368 }))
  bad.push("the reservation file reads " + JSON.stringify(res));
const RESERVED = new Set(["ARCH-105", "ADR-QD-171", "CCR-QD-449", "BEH-QD-626", "BEH-QD-627", "BEH-QD-628", "BEH-QD-629", "BEH-QD-630", "INV-QD-361", "INV-QD-362"]);
const ID = /\b(?:(?:ADR|BEH|INV|CCR)-QD-\d+|ARCH-\d+)\b/g;
const before = new Set(cp.spawnSync("git", ["grep", "-ohE", "(ADR|BEH|INV|CCR)-QD-[0-9]+|ARCH-[0-9]+", B, "--", ".", ":(exclude).planning/**"], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout.split("\n").filter(Boolean));
const addedText = g("diff", "-U0", B, "HEAD", "--", ".", ":(exclude).planning/**").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
for (const id of new Set(addedText.match(ID) || [])) if (!before.has(id) && !RESERVED.has(id)) bad.push("an id outside the reservation and new to the tree: " + id);
if (/-QD-NEXT/.test(addedText)) bad.push("a placeholder id was added");
const specMd = lines(g("ls-files", "spec")).filter((f) => f.endsWith(".md"));
const heads = (re) => specMd.reduce((n, f) => n + fs.readFileSync(f, "utf8").split("\n").filter((l) => re.test(l)).length, 0);
for (const id of ["BEH-QD-626", "BEH-QD-627", "BEH-QD-628", "BEH-QD-629", "BEH-QD-630", "INV-QD-361", "INV-QD-362"]) {
  const n = heads(new RegExp("^## " + id + ": "));
  if (n !== 1) bad.push(id + " is a heading " + n + " times");
}
if (heads(/^# ADR-QD-171 — /) !== 1) bad.push("ADR-QD-171 is not a heading once");
const readme = fs.readFileSync("spec/README.md", "utf8");
if (readme.split("\n").filter((l) => l.startsWith("| CCR-QD-449 |")).length !== 1) bad.push("CCR-QD-449 is not one row");
if (!/\| CCR-QD-449 \|.*ARCH-105\./.test(readme)) bad.push("the CCR-QD-449 row does not name ARCH-105");

// 7. The source the phase promised (STOR-01..03; D-01..D-06, D-12, D-13), read with comments stripped.
const code = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const PROMISE = {
  "packages/core/src/DecisionRecord.ts": {
    has: ["export class StoredRecord extends Data.Class<", "export const sinkRecordOrder: Order.Order<SinkRecord>", "export const storedRecordOrder: Order.Order<StoredRecord> = Order.mapInput(sinkRecordOrder"],
    not: [/\bStoredDecisionRecord\b/, /\bStoredObligationRecord\b/, /\bstampRecord\w*\b/, /\bStamped\b/, /effect\/Match/, /readonly at: number \}>/],
  },
  "packages/core/src/DecisionLog.ts": {
    has: ["new StoredRecord({ environment, record })"],
    not: [/\bisolate\b/, /catchCause/, /\bstampRecord\b/],
  },
  "packages/core/src/SinkCodec.ts": {
    has: ["encodeSinkRecord(stored.record)", "new StoredRecord({ environment: read.success.environment, record })"],
    not: [/\bstampRecord\b/],
  },
  "packages/devtools/src/model/Timeline.ts": {
    has: ["stored.record._tag", "Order.mapInput(sinkRecordOrder, recordOf)"],
    not: [/& \{ environment: string \}/, /\bstoredRecordOrder\b/],
  },
};
for (const [f, { has, not }] of Object.entries(PROMISE)) {
  const s = code(f);
  // Orchestrator-authorised fix: a wrapped call (`Order.mapInput(\n  sinkRecordOrder,`) is the same text; compare layout-free too.
  const flat = s.replace(/\(\s+/g, "(").replace(/\s+/g, " ");
  for (const x of has) if (!s.includes(x) && !flat.includes(x)) bad.push(f + " lacks " + x);
  for (const re of not) if (re.test(s)) bad.push(f + " still holds " + re.source);
}
for (const f of lines(cp.spawnSync("git", ["grep", "-lwE", "StoredDecisionRecord|StoredObligationRecord|stampRecord|stampRecordMatch|Stamped", "--", SRC], { encoding: "utf8" }).stdout || ""))
  if (/\b(StoredDecisionRecord|StoredObligationRecord|stampRecord|stampRecordMatch|Stamped)\b/.test(code(f))) bad.push(f + " names a deleted symbol in code (D-02: no alias)");
for (const [f, pkg] of [["core", "@qadi/core"], ["http", "@qadi/http"], ["devtools", "@qadi/devtools"]]) {
  const p = ".changeset/" + f + "-stored-record-is-its-envelope.md";
  const t = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
  if (!t.includes('"' + pkg + '": minor')) bad.push(p + " does not bump " + pkg + " minor");
  if ((t.match(/\*\*Breaking\.\*\*/g) || []).length !== 1) bad.push(p + " does not carry exactly one **Breaking.** entry");
}

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
