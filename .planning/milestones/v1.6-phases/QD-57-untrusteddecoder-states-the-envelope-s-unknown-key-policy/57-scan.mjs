// Phase 57's close scan (WX-01, WX-02, WX-04, WX-06; D-08, D-10, D-12, D-13, D-16). Read-only: it prints every
// finding and exits 1 on any, or prints "phase scan clean". Run from the repository root:
//   node .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-scan.mjs
import cp from "node:child_process";
import fs from "node:fs";

const D = ".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/";
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(fs.readFileSync(D + "57-01-SUMMARY.md", "utf8")) || [])[1];
if (!B) {
  console.error("no phase_base in " + D + "57-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const lines = (s) => s.split("\n").filter(Boolean);
const bad = [];
const SRC = ":(glob)packages/*/src/**";
const CODE = [SRC, ":(glob)packages/*/test/**", ":(glob)packages/*/bench/**"];
const TRAILER = /^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/;

// 1. Scope: every path changed since phase_base outside .planning/ is one this phase names.
const ALLOWED = new Set([
  "packages/core/src/UntrustedDecode.ts",
  "packages/core/src/EnvelopeKeys.ts",
  "packages/core/src/SinkCodec.ts",
  "packages/core/src/Policy.ts",
  "packages/core/src/PortRemote.ts",
  "packages/core/src/PortWireEncode.ts",
  "packages/audit/src/AuditEntry.ts",
  "packages/audit/src/AuditArchive.ts",
  "packages/react/src/HydrationEngine.ts",
  "packages/core/test/UntrustedSeams.test.ts",
  "packages/core/test/UntrustedDecode.test.ts",
  "packages/core/test/UntrustedDecode.tst.ts",
  "packages/core/test/DecodeRefusal.test.ts",
  "packages/core/test/DecisionWire.test.ts",
  "packages/core/test/SinkCodec.test.ts",
  "packages/core/bench/UntrustedDecode.bench.ts",
  "packages/audit/test/UntrustedSeams.test.ts",
  "packages/audit/test/AuditEntryDifferential.test.ts",
  "packages/react/test/UntrustedSeams.test.ts",
  "packages/devtools/test/model/Source.test.ts",
  "scripts/check-house-style.mjs",
  "AGENTS.md",
  "spec/overview.md",
  "spec/decisions/170-an-envelope-states-its-unknown-key-policy-at-its-decoder.md",
  "spec/decisions/index.yaml",
  "spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md",
  "spec/decisions/143-untrusted-json-is-decoded-through-one-module.md",
  "spec/behaviors/08-serialization.md",
  "spec/behaviors/25-inspection.md",
  "spec/behaviors/26-decision-stream.md",
  "spec/behaviors/33-audit-pipeline.md",
  "spec/invariants.md",
  "spec/traceability.md",
  "spec/README.md",
  ".changeset/core-untrusted-decoder-states-unknown-keys.md",
  ".changeset/audit-deep-unknown-record-key-ignored.md",
  ".changeset/devtools-malformed-frame-is-a-decode-refusal.md",
  "apps/website/src/content/docs/docs/reference/upgrading.md",
]);
// A test(57-07) gap commit may add a test file of its own (57-07 holds it to packages/<pkg>/test/).
for (const c of lines(g("log", "--format=%H %s", B + "..HEAD")).filter((x) => / test\(57-07\): /.test(x)))
  for (const f of lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", c.slice(0, 40))))
    if (/^packages\/[a-z]+\/test\//.test(f)) ALLOWED.add(f);
for (const f of lines(g("diff", "--name-only", B, "HEAD")))
  if (!f.startsWith(".planning/") && !ALLOWED.has(f)) bad.push("outside the phase scope: " + f);

// 2. Banned constructs (WX-04), net per file: added minus removed occurrences on code lines of src, test and bench.
// Import lines, alias specifiers and comment lines are skipped; strings and line comments are blanked first.
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

// 4. Files that must not change.
const frozen = g(
  "diff", "--name-only", B, "HEAD", "--",
  ":(glob)packages/*/src/index.ts", ":(glob)packages/*/package.json", ":(glob)packages/*/CHANGELOG.md",
  "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".oxlintrc.json", ":(glob)tsconfig*.json",
  "stryker.config.mjs", "stryker.audit.mjs", "stryker.react.mjs", "packages/core/src/DecisionRecord.ts",
);
if (frozen) bad.push("changed and must not be: " + frozen.split("\n").join(" "));

// 5. Order (WX-06, D-12, D-13).
const L = lines(g("log", "--reverse", "--format=%H %s", B + "..HEAD")).map((x) => ({ h: x.slice(0, 40), s: x.slice(41) }));
const idx = (re) => L.findIndex((c) => re.test(c.s));
const all = (re) => L.map((c, i) => (re.test(c.s) ? i : -1)).filter((i) => i >= 0);
const plan = L.filter((c) => /^\w+\(57-\d\d\)!?: /.test(c.s));
if (!plan.length || !plan[0].s.startsWith("chore(57-01): ")) bad.push("the first plan commit is not chore(57-01)");
else {
  const f = lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", plan[0].h)).sort().join(" ");
  if (f !== D + "57-mutation-base.json " + D + "57-mutation.mjs") bad.push("chore(57-01) changes " + f);
}
const rebase = lines(g("log", "--format=%h %s", B + "..HEAD", "--", D + "57-mutation-base.json", D + "57-mutation.mjs"));
if (rebase.length !== 1) bad.push("re-baselined or edited after chore(57-01): " + rebase.join("; "));
const srcCommits = lines(g("log", "--reverse", "--format=%H", B + "..HEAD", "--", SRC));
const firstSrc = L.findIndex((c) => c.h === srcCommits[0]);
if (firstSrc < 0 || !L[firstSrc].s.startsWith("feat(57-05)!: ")) bad.push("the first src commit is not feat(57-05)!");
for (const i of all(/^test\(57-0[234]\): /)) if (i > firstSrc) bad.push('"' + L[i].s + '" follows the first src commit');
const f5 = idx(/^feat\(57-05\)!: /);
const f6 = idx(/^feat\(57-06\): /);
if (f5 < 0 || f6 < 0 || f6 < f5) bad.push("feat(57-06) does not follow feat(57-05)!");
for (const i of all(/^test\(57-0[234]\): RED/)) if (i > f5) bad.push('"' + L[i].s + '" does not precede "' + (L[f5] || {}).s + '"');
// The evidence is the LAST commit touching 57-mutation-after.json (57-07's, or the review round's redo after it).
const lastAfter = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", D + "57-mutation-after.json"))[0];
const c7 = idx(/^chore\(57-07\): /) < 0 ? -1 : L.findIndex((c) => c.h === lastAfter);
const lastCode = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", ...CODE))[0];
if (c7 < 0 || L.findIndex((c) => c.h === lastCode) > c7) bad.push("57-mutation-after.json does not follow the last commit touching src, tests or bench");
for (const c of plan) {
  const body = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!TRAILER.test(body[body.length - 1])) bad.push(c.h.slice(0, 8) + " " + c.s + " has no trailer");
}

// 6. Numbers (WX-02): the reservation is untouched, every reserved id is used once, nothing else is new.
const res = JSON.parse(fs.readFileSync(g("rev-parse", "--git-common-dir") + "/qadi-reserved-ids.json", "utf8"));
if (JSON.stringify(res) !== JSON.stringify({ CCR: 452, ADR: 174, BEH: 645, INV: 368 }))
  bad.push("the reservation file reads " + JSON.stringify(res));
const RESERVED = new Set(["ARCH-104", "ADR-QD-170", "CCR-QD-448", "BEH-QD-621", "BEH-QD-622", "BEH-QD-623", "BEH-QD-624", "BEH-QD-625", "INV-QD-359", "INV-QD-360"]);
const ID = /\b(?:(?:ADR|BEH|INV|CCR)-QD-\d+|ARCH-\d+)\b/g;
const before = new Set(cp.spawnSync("git", ["grep", "-ohE", "(ADR|BEH|INV|CCR)-QD-[0-9]+|ARCH-[0-9]+", B, "--", ".", ":(exclude).planning/**"], { encoding: "utf8", maxBuffer: 1 << 28 }).stdout.split("\n").filter(Boolean));
const addedText = g("diff", "-U0", B, "HEAD", "--", ".", ":(exclude).planning/**").split("\n").filter((l) => l.startsWith("+") && !l.startsWith("+++")).join("\n");
for (const id of new Set(addedText.match(ID) || [])) if (!before.has(id) && !RESERVED.has(id)) bad.push("an id outside the reservation and new to the tree: " + id);
if (/-QD-NEXT/.test(addedText)) bad.push("a placeholder id was added");
const specMd = lines(g("ls-files", "spec")).filter((f) => f.endsWith(".md"));
const heads = (re) => specMd.reduce((n, f) => n + fs.readFileSync(f, "utf8").split("\n").filter((l) => re.test(l)).length, 0);
for (const id of ["BEH-QD-621", "BEH-QD-622", "BEH-QD-623", "BEH-QD-624", "BEH-QD-625", "INV-QD-359", "INV-QD-360"]) {
  const n = heads(new RegExp("^## " + id + ": "));
  if (n !== 1) bad.push(id + " is a heading " + n + " times");
}
if (heads(/^# ADR-QD-170 — /) !== 1) bad.push("ADR-QD-170 is not a heading once");
const readme = fs.readFileSync("spec/README.md", "utf8");
if (readme.split("\n").filter((l) => l.startsWith("| CCR-QD-448 |")).length !== 1) bad.push("CCR-QD-448 is not one row");
if (!/\| CCR-QD-448 \|.*ARCH-104\./.test(readme)) bad.push("the CCR-QD-448 row does not name ARCH-104");

// 7. The source the phase promised (KEYP-02, KEYP-03, D-10, D-16).
const code = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const sink = code("packages/core/src/SinkCodec.ts");
for (const x of ["ownValue", "envelopeOf", "DECISION_KEYS", "OBLIGATIONS_KEYS", "versionThenEnvelope", "notAnEnvelope", "JSON.parse"])
  if (sink.includes(x)) bad.push("SinkCodec.ts still holds " + x);
if (/===\s*"(ignore|refuse)"|"(ignore|refuse)"\s*===/.test(code("packages/core/src/UntrustedDecode.ts"))) bad.push("UntrustedDecode.ts compares the policy with ===");
for (const f of lines(g("ls-files", "packages/*/src/index.ts"))) if (fs.readFileSync(f, "utf8").includes("EnvelopeKeys")) bad.push(f + " exports EnvelopeKeys");
for (const f of lines(cp.spawnSync("git", ["grep", "-l", "untrustedDecoder(", "--", SRC], { encoding: "utf8" }).stdout || "")) {
  const s = code(f);
  let k = -1;
  while ((k = s.indexOf("untrustedDecoder(", k + 1)) >= 0) {
    if (/[\w$"'`]/.test(s[k - 1] || "")) continue;
    let d = 1;
    let j = k + "untrustedDecoder(".length;
    const open = j;
    while (j < s.length && d > 0) {
      if (s[j] === "(") d++;
      else if (s[j] === ")") d--;
      j++;
    }
    const args = s.slice(open, j - 1);
    if (/^\s*schema\b|^\s*S\b/.test(args) && f.endsWith("UntrustedDecode.ts")) continue;
    if (!/unknownKeys: "(refuse|ignore)"/.test(args)) bad.push(f + ": a decoder states no policy: " + args.replace(/\s+/g, " ").slice(0, 80));
  }
}

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
