// Phase 60's close scan (HDLS-02..04, WX-02..WX-07; D-02..D-18). Read-only: it prints every finding and exits 1 on any,
// or prints "phase scan clean". Run from the repository root:
//   node .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-scan.mjs
import cp from "node:child_process";
import fs from "node:fs";

const D = ".planning/phases/QD-60-devtools-headless-interface-is-the-feeds/";
const B = (/^phase_base: ([0-9a-f]{40})$/m.exec(fs.readFileSync(D + "60-01-SUMMARY.md", "utf8")) || [])[1];
if (!B) {
  console.error("no phase_base in " + D + "60-01-SUMMARY.md");
  process.exit(1);
}
const g = (...a) => cp.execFileSync("git", a, { encoding: "utf8", maxBuffer: 1 << 28 }).trim();
const lines = (s) => s.split("\n").filter(Boolean);
const bad = [];
const SRC = ":(glob)packages/*/src/**";
const CODE = [SRC, ":(glob)packages/*/test/**", ":(glob)packages/*/bench/**", ":(glob)features/**", ":(glob)examples/**"];
const TRAILER = /^Co-Authored-By: Claude (Opus|Sonnet) 5\.5 <noreply@anthropic\.com>$/;
const P = "packages/devtools/";
const M = P + "src/model/";
// The one GREEN commit's source files (D-03, D-04, D-07, D-15, D-16), sorted.
const GREEN_SRC = [
  P + "src/index.ts",
  M + "DiagnosticsFeed.ts",
  M + "DiagnosticsStore.ts",
  M + "DockModel.ts",
  M + "GatesFeed.ts",
  M + "TimelineFeed.ts",
  P + "src/react/DevtoolsDock.tsx",
  P + "src/react/index.ts",
  P + "src/react/useDiagnostics.ts",
  P + "src/react/useDockModel.ts",
];
const CHAR = P + "test/react/QuestionsPanel.feed.characterisation.test.tsx";
// Type-name renames the GREEN commit makes outside src (D-03, D-12).
const RENAMED = [
  P + "test/react/DiagnosticsLifetime.test.tsx",
  P + "test/react/DiagnosticsScreens.test.tsx",
  P + "test/react/useDiagnostics.test.tsx",
  P + "test/react/questionsProp.ts",
  CHAR,
  "examples/nextjs-newsroom/src/client/Counters.tsx",
];
// Written on the base by test(60-02) commits (D-05, D-08, WX-06).
const RED = [
  P + "test/surface.test.ts",
  P + "test/surface.tst.ts",
  P + "test/model/TimelineFeed.test.ts",
  P + "test/model/DiagnosticsFeed.test.ts",
  P + "test/model/GatesFeed.test.ts",
  P + "test/model/DiagnosticsStore.test.ts",
  P + "test/model/DiagnosticsStore.tst.ts",
];
const INSTALL = "scripts/check-package-install.mjs";
const CHANGESET = ".changeset/devtools-headless-interface-is-the-feeds.md";
const README = P + "README.md";
const UPGRADING = "apps/website/src/content/docs/docs/reference/upgrading.md";
const ADR = "spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md";
const DOCS = [README, "apps/website/src/content/docs/docs/packages/devtools.md", UPGRADING, CHANGESET];
const SPEC = [
  ADR,
  "spec/decisions/index.yaml",
  "spec/decisions/047-a-headless-devtools-model.md",
  "spec/decisions/099-entry-points-are-a-closed-list.md",
  "spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md",
  "spec/behaviors/28-devtools-screens.md",
  "spec/behaviors/09-react.md",
  "spec/devtools-spec/02-screens.md",
  "spec/invariants.md",
  "spec/overview.md",
  "spec/traceability.md",
  "spec/README.md",
];
// Green on the phase base and unedited through the phase (the dock's behaviour does not change).
const CHARACTERISATION = [P + "test/react/QuestionsPanel.characterisation.test.tsx", P + "test/react/ServicesPanel.characterisation.test.tsx"];

// 1. Scope: every path changed since phase_base outside .planning/ is one this phase names.
const ALLOWED = new Set([...GREEN_SRC, ...RENAMED, ...RED, INSTALL, ...DOCS, ...SPEC]);
// A test(60-05) gap commit may add or extend another devtools test file; never a characterisation.
for (const c of lines(g("log", "--format=%H %s", B + "..HEAD")).filter((x) => / test\(60-05\): /.test(x)))
  for (const f of lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", c.slice(0, 40))))
    if (f.startsWith(P + "test/") && !CHARACTERISATION.includes(f) && f !== CHAR) ALLOWED.add(f);
for (const f of lines(g("diff", "--name-only", B, "HEAD")))
  if (!f.startsWith(".planning/") && !ALLOWED.has(f)) bad.push("outside the phase scope: " + f);

// D-12: the feed characterisation differs from phase_base at exactly its two type-name lines, 26 and 66.
const charDiff = lines(g("diff", "-U0", B, "HEAD", "--", CHAR));
const hunks = charDiff.filter((l) => l.startsWith("@@ "));
const changed = charDiff.filter((l) => /^[+-](?![+-]{2} )/.test(l));
const WANT = [
  '-import type { DevtoolsDockProps, DiagnosticsDockOptions } from "../../src/react/index.ts";',
  '+import type { DevtoolsDockProps, DiagnosticsOptions } from "../../src/react/index.ts";',
  "-const live: DiagnosticsDockOptions = {};",
  "+const live: DiagnosticsOptions = {};",
];
if (hunks.length !== 2 || !/^@@ -26 \+26 @@/.test(hunks[0]) || !/^@@ -66 \+66 @@/.test(hunks[1]) || JSON.stringify(changed) !== JSON.stringify(WANT))
  bad.push(CHAR + " differs from phase_base beyond its two type-name lines (D-12): " + JSON.stringify([...hunks, ...changed]).slice(0, 400));

// 2. Banned constructs (WX-04), net per file: added minus removed occurrences on code lines of src, test, bench,
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

// 4. Files that must not change: manifests (the closed exports map, D-09), configs, the gates other than gate 14's
// consumer, AGENTS.md, every other package, the timeline engine, the other characterisations and Phase 56's changeset.
const frozen = g(
  "diff", "--name-only", B, "HEAD", "--",
  ":(glob)packages/*/package.json", ":(glob)packages/*/CHANGELOG.md", "package.json", "pnpm-lock.yaml",
  "pnpm-workspace.yaml", ".oxlintrc.json", ":(glob)tsconfig*.json", ":(glob)stryker*.mjs", "AGENTS.md",
  M + "TimelineStore.ts", ...CHARACTERISATION, ".changeset/devtools-questions-is-a-dock-input.md",
);
if (frozen) bad.push("changed and must not be: " + frozen.split("\n").join(" "));
const others = g("diff", "--name-only", B, "HEAD", "--", ":(glob)packages/**", ":(glob)scripts/**", ":(exclude,glob)packages/devtools/**", ":(exclude)" + INSTALL);
if (others) bad.push("another package or gate changed: " + others.split("\n").join(" "));
const added = lines(g("diff", "--name-status", B, "HEAD", "--", ".changeset"));
if (added.length !== 1 || added[0] !== "A\t" + CHANGESET) bad.push(".changeset since phase_base: " + added.join("; "));

// 5. Order (WX-06, D-08, D-09).
const L = lines(g("log", "--reverse", "--format=%H %s", B + "..HEAD")).map((x) => ({ h: x.slice(0, 40), s: x.slice(41) }));
// A review round's fix may touch a file again after its plan commit; the mutation evidence must then follow it.
const FIX = /^fix\(60(-\d\d)?\): /;
const all = (re) => L.map((c, i) => (re.test(c.s) ? i : -1)).filter((i) => i >= 0);
const at = (h) => L.findIndex((c) => c.h === h);
const filesOf = (h) => lines(g("diff-tree", "--no-commit-id", "--name-only", "-r", h));
const plan = L.filter((c) => /^\w+\(60(-\d\d)?\)!?: /.test(c.s));
const first = plan[0];
if (!first || !first.s.startsWith("chore(60-01): ")) bad.push("the first plan commit after phase_base is not chore(60-01)");
else {
  const f = filesOf(first.h).sort().join(" ");
  if (f !== D + "60-mutation-base.json " + D + "60-mutation.mjs") bad.push("chore(60-01) changes " + f);
  if (g("diff", "--name-only", B, first.h + "^", "--", ":(exclude).planning/**")) bad.push("something outside .planning/ changed before chore(60-01)");
}
const rebase = lines(g("log", "--format=%h %s", B + "..HEAD", "--", D + "60-mutation-base.json", D + "60-mutation.mjs"));
if (rebase.length !== 1) bad.push("re-baselined or edited after chore(60-01): " + rebase.join("; "));
const srcCommits = lines(g("log", "--reverse", "--format=%H", B + "..HEAD", "--", SRC));
const firstSrc = srcCommits.length ? at(srcCommits[0]) : -1;
if (firstSrc < 0 || !/^feat\(60-03\)!: /.test(L[firstSrc].s)) bad.push("the first src commit is not feat(60-03)!");
const greens = all(/^feat\(60-03\)!?: /);
if (greens.length !== 1) bad.push("feat(60-03) commits: " + greens.length + ", expected 1");
else {
  const f = filesOf(L[greens[0]].h);
  const src = f.filter((x) => /^packages\/[a-z-]+\/src\//.test(x)).sort().join(" ");
  if (src !== [...GREEN_SRC].sort().join(" ")) bad.push("feat(60-03) changes these src files: " + src);
  for (const x of f) if (!GREEN_SRC.includes(x) && !RENAMED.includes(x)) bad.push("feat(60-03) also changes " + x);
}
for (const x of RENAMED) for (const s of lines(g("log", "--format=%s", B + "..HEAD", "--", x))) if (!/^feat\(60-03\)!?: /.test(s) && !FIX.test(s)) bad.push(x + " was changed by " + s);
const reds = all(/^test\(60-02\): RED /);
if (reds.length < 2) bad.push("test(60-02) RED commits: " + reds.length + ", expected at least 2");
for (const i of all(/^test\(60-02\): /)) {
  if (firstSrc >= 0 && i > firstSrc) bad.push('"' + L[i].s + '" follows the first src commit');
  for (const x of filesOf(L[i].h)) if (!RED.includes(x)) bad.push('"' + L[i].s + '" changes ' + x);
}
for (const x of RED) for (const s of lines(g("log", "--format=%s", B + "..HEAD", "--", x))) if (!/^test\(60-0[25]\): /.test(s) && !FIX.test(s) && s !== "test(60-03): call the feed through its Effect, not toBeCallableWith") bad.push(x + " was changed by " + s);
const installs = all(/^test\(60-04\): /);
if (installs.length !== 1) bad.push("test(60-04) commits: " + installs.length + ", expected 1");
else {
  if (greens.length === 1 && installs[0] < greens[0]) bad.push("test(60-04) precedes feat(60-03)");
  if (filesOf(L[installs[0]].h).join(" ") !== INSTALL) bad.push("test(60-04) changes " + filesOf(L[installs[0]].h).join(" "));
}
for (const s of lines(g("log", "--format=%s", B + "..HEAD", "--", INSTALL))) if (!/^test\(60-04\): /.test(s) && !FIX.test(s)) bad.push(INSTALL + " was changed by " + s);
const commentOnly = (from, paths) =>
  g("diff", "-U0", from, "HEAD", "--", ...paths).split("\n").filter((l) => /^[+-](?![+-]{2} )/.test(l) && l.slice(1).trim() !== "" && !/^\s*(\*|\/\*\*|\/\/|\*\/)/.test(l.slice(1)));
// The mutation evidence is the LAST commit touching 60-mutation-after.json (60-05's, or a review round's redo), and
// no code line changed after it.
const lastAfter = lines(g("log", "--format=%H", "-1", B + "..HEAD", "--", D + "60-mutation-after.json"))[0];
const ev = lastAfter === undefined ? -1 : at(lastAfter);
if (ev < 0 || !/^chore\(60(-05)?\): /.test(L[ev].s)) bad.push("the last commit touching 60-mutation-after.json is not a chore(60-05) or a review round's chore(60)");
else {
  const late = commentOnly(L[ev].h, CODE);
  if (late.length) bad.push("60-mutation-after.json does not follow the last code change: " + late[0].slice(0, 120));
  if (greens.length === 1 && ev < greens[0]) bad.push("the mutation evidence precedes feat(60-03)");
}
for (const c of plan) {
  const body = g("log", "-1", "--format=%B", c.h).split("\n");
  if (!TRAILER.test(body[body.length - 1])) bad.push(c.h.slice(0, 8) + " " + c.s + " has no trailer");
}

// 6. Numbers (WX-02): the reservation is untouched, every reserved id is used, nothing else is new.
const res = JSON.parse(fs.readFileSync(g("rev-parse", "--git-common-dir") + "/qadi-reserved-ids.json", "utf8"));
if (JSON.stringify(res) !== JSON.stringify({ CCR: 452, ADR: 174, BEH: 645, INV: 368 }))
  bad.push("the reservation file reads " + JSON.stringify(res));
const BEHS = ["BEH-QD-636", "BEH-QD-637", "BEH-QD-638", "BEH-QD-639", "BEH-QD-640"];
const INVS = ["INV-QD-365", "INV-QD-366"];
const RESERVED = new Set(["ARCH-107", "ADR-QD-173", "CCR-QD-451", ...BEHS, ...INVS]);
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
if (heads(/^# ADR-QD-173 — /) !== 1) bad.push("ADR-QD-173 is not a heading once");
const readme = fs.readFileSync("spec/README.md", "utf8");
if (readme.split("\n").filter((l) => l.startsWith("| CCR-QD-451 |")).length !== 1) bad.push("CCR-QD-451 is not one row");
if (!/\| CCR-QD-451 \|.*ARCH-107\./.test(readme)) bad.push("the CCR-QD-451 row does not name ARCH-107");
if (!/\| CCR-QD-451 \|.*Unused: none\./.test(readme)) bad.push("the CCR-QD-451 row does not say Unused: none.");

// 7. The interface and the source the phase promised (D-02..D-07, D-13, D-15..D-17).
const read = (f) => {
  if (fs.existsSync(f)) return fs.readFileSync(f, "utf8");
  bad.push("missing: " + f);
  return "";
};
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
const flatOf = (s) => s.replace(/\s+/g, " ").replace(/\{ /g, "{").replace(/,? \}/g, "}");
// The names a barrel exports, by module: `export { … } from "…";` and `export type { … } from "…";`.
const exported = (f) => {
  const out = new Map();
  for (const m of flatOf(code(f)).matchAll(/export (type )?\{([^}]*)\} from "([^"]+)";/g))
    for (const n of m[2].split(",").map((x) => x.trim().replace(/^type /, "")).filter(Boolean)) out.set(n, m[3]);
  return out;
};
const ROOT = P + "src/index.ts";
const REACT = P + "src/react/index.ts";
const root = exported(ROOT);
const react = exported(REACT);
const FROM = {
  makeTimelineFeed: "./model/TimelineFeed.ts", TimelineFeed: "./model/TimelineFeed.ts", TimelineFeedInputs: "./model/TimelineFeed.ts",
  TimelineStatus: "./model/TimelineFeed.ts", TimelineStatusReadout: "./model/TimelineFeed.ts",
  makeDiagnosticsFeed: "./model/DiagnosticsFeed.ts", DiagnosticsFeed: "./model/DiagnosticsFeed.ts", DiagnosticsReadout: "./model/DiagnosticsFeed.ts",
  DiagnosticsSnapshot: "./model/DiagnosticsFeed.ts", DiagnosticsStatus: "./model/DiagnosticsFeed.ts",
  makeGatesFeed: "./model/GatesFeed.ts", GatesFeed: "./model/GatesFeed.ts", GatesFeedInputs: "./model/GatesFeed.ts",
  GatesSnapshot: "./model/GatesFeed.ts", RegistryRead: "./model/GatesFeed.ts", AskedRead: "./model/GatesFeed.ts",
  DiagnosticsOptions: "./model/DiagnosticsStore.ts", TimelineStore: "./model/TimelineStore.ts",
  Diagnostics: "./model/DiagnosticsStore.ts", DiagnosticsReading: "./model/DiagnosticsStore.ts", WiringRead: "./model/DiagnosticsStore.ts",
  mergeReading: "./model/DiagnosticsStore.ts", DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS: "./model/DiagnosticsStore.ts",
};
for (const [n, from] of Object.entries(FROM)) if (root.get(n) !== from) bad.push(ROOT + " does not export " + n + " from " + from);
const GONE = ["makeTimelineStore", "runSource", "makeDiagnosticsStore", "runDiagnostics", "noDiagnostics", "DiagnosticsStore", "DiagnosticsDockOptions", "idleTimeline", "idleTimelineStatus", "idleDiagnostics", "diagnosticsOff", "diagnosticsStarting", "isUnsampled"];
for (const n of GONE) {
  if (root.has(n)) bad.push(ROOT + " still exports " + n);
  if (react.has(n)) bad.push(REACT + " exports " + n);
}
if (react.get("DiagnosticsOptions") !== "../model/DiagnosticsStore.ts") bad.push(REACT + " does not export DiagnosticsOptions from ../model/DiagnosticsStore.ts");
for (const f of [ROOT, REACT]) if (/export \*/.test(code(f))) bad.push(f + " has an export * (D-07)");
// One option shape (D-03, D-15): one declaration, in the engine's module, and nothing of the old two left in src.
const decls = lines(g("grep", "-l", "export interface DiagnosticsOptions", "--", SRC));
if (decls.join(" ") !== M + "DiagnosticsStore.ts" || (read(M + "DiagnosticsStore.ts").match(/export interface DiagnosticsOptions\b/g) || []).length !== 1)
  bad.push("export interface DiagnosticsOptions is declared in: " + decls.join(" "));
for (const f of lines(g("ls-files", P + "src")))
  for (const [name, re] of [["runOptions", /runOptions/], ["DiagnosticsDockOptions", /DiagnosticsDockOptions/], ["schedule?:", /schedule\?:/], ["<ROut", /<ROut/]])
    if (re.test(read(f))) bad.push(f + " still holds " + name);
const PROMISE = {
  [M + "DiagnosticsStore.ts"]: {
    has: [
      "export interface DiagnosticsOptions {",
      "readonly layer?: Layer.Layer<never, unknown>;",
      "readonly collector?: PortCallCollector;",
      "readonly intervalMillis?: number;",
      "Schedule.spaced(options?.intervalMillis ?? DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS)",
      "options?: DiagnosticsOptions,",
    ],
    not: [/options\?\.schedule/, /DiagnosticsOptions</],
  },
  [M + "DiagnosticsFeed.ts"]: {
    has: ["runDiagnostics(marking, next)", "type DiagnosticsOptions,"],
    not: [/before !== undefined\) off\(\)/, /import \* as Schedule/, /Package-private/],
  },
  [M + "TimelineFeed.ts"]: { has: [], not: [/Package-private/] },
  [M + "GatesFeed.ts"]: { has: [], not: [/Package-private/] },
  [P + "src/react/useDiagnostics.ts"]: { has: [], not: [/export type \{[^}]*\} from "\.\.\/model\/DiagnosticsFeed\.ts"/] },
};
for (const [f, { has, not }] of Object.entries(PROMISE)) {
  const s = code(f);
  const flat = s.replace(/\s+/g, " ");
  for (const x of has) if (!s.includes(x) && !flat.includes(x)) bad.push(f + " lacks " + x);
  for (const re of not) if (re.test(read(f))) bad.push(f + " still holds " + re.source);
}
// The feed suites run against the public entry (D-05): each imports the root, and no public feed name from model/.
const PUBLIC = ["makeTimelineFeed", "makeDiagnosticsFeed", "makeGatesFeed", "TimelineFeed", "DiagnosticsFeed", "GatesFeed", "DiagnosticsStatus", "RegistryRead", "AskedRead", "DiagnosticsOptions", "DiagnosticsReadout", "GatesSnapshot"];
for (const f of [P + "test/model/TimelineFeed.test.ts", P + "test/model/DiagnosticsFeed.test.ts", P + "test/model/GatesFeed.test.ts"]) {
  const s = flatOf(read(f));
  if (!s.includes('from "../../src/index.ts";')) bad.push(f + " does not import the package root");
  for (const m of s.matchAll(/import (type )?\{([^}]*)\} from "(\.\.\/\.\.\/src\/model\/[^"]+)";/g))
    for (const n of m[2].split(",").map((x) => x.trim().replace(/^type /, "")))
      if (PUBLIC.includes(n)) bad.push(f + " imports " + n + " from " + m[3]);
}
// The docs (D-06, D-13, D-17) and the record of the break (WX-07).
const rd = read(README);
if (!rd.includes("makeDiagnosticsFeed") || /same loop without/.test(rd)) bad.push(README + " does not use the feeds, or keeps the false same-loop claim");
if (!/must not\s+(be sent|cross)/.test(rd)) bad.push(README + " does not say a stop's reason must not cross a trust boundary (D-17)");
const up = read(UPGRADING);
if (/import type \{ DiagnosticsDockOptions \} from "@qadi\/devtools\/react";/.test(up) || /const sampling: DiagnosticsDockOptions/.test(up)) bad.push(UPGRADING + " still compiles a DiagnosticsDockOptions fence (D-13)");
if (up.split("\n").filter((l) => l === "## 0.13: the feeds are devtools' headless interface").length !== 1) bad.push(UPGRADING + " lacks one 0.13 headless-interface section");
const cs = read(CHANGESET);
if (!/^---\n"@qadi\/devtools": minor\n---\n/.test(cs) || !cs.includes("**Breaking.**")) bad.push(CHANGESET + " is not one Breaking @qadi/devtools minor");

if (bad.length) {
  console.error(bad.join("\n"));
  process.exit(1);
}
console.log("phase scan clean");
