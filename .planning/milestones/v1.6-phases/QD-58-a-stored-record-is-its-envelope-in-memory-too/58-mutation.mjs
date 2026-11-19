// Phase 58's mutation evidence (D-08, D-16, WX-05). `base <suite>` and `after <suite>` merge one scoped Stryker report's
// scores, detected (Killed or Timeout), survivor (Survived or NoCoverage) and ignored mutant identities into one JSON;
// `evidence <suite> <report>` keeps an ignoreStatic:false report of the after tree; `compare [evidence json]` applies
// D-16, Phase 53's D-14 rule adapted for a pure deletion, with ADR-QD-167 Rev 1.1's static credit.
// Run from the repository root:
//   node <phase dir>/58-mutation.mjs base core|devtools|http
//   node <phase dir>/58-mutation.mjs after core|devtools|http
//   node <phase dir>/58-mutation.mjs evidence core|devtools|http <the ignoreStatic:false report>
//   node <phase dir>/58-mutation.mjs compare [evidence json]
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-58-a-stored-record-is-its-envelope-in-memory-too/";
const DR = "packages/core/src/DecisionRecord.ts";
const DL = "packages/core/src/DecisionLog.ts";
const DS = "packages/core/src/DecisionStream.ts";
const SC = "packages/core/src/SinkCodec.ts";
const SRC = "packages/devtools/src/model/Source.ts";
const TL = "packages/devtools/src/model/Timeline.ts";
const TS = "packages/devtools/src/model/TimelineStore.ts";
const DLH = "packages/http/src/DecisionLogHttp.ts";
// One entry per Stryker config, none edited; `--mutate` on the command line narrows each (D-16). `dirs` is what a
// report must be newer than: devtools' and http's vitest read @qadi/core and @qadi/testing from their source.
const SUITES = {
  core: { cf: "stryker.config.mjs", rp: "reports/mutation/mutation.json", dirs: ["packages/core/src", "packages/core/test"], files: [DL, DR, DS, SC] },
  devtools: { cf: "stryker.devtools.mjs", rp: "reports/mutation-devtools/mutation.json", dirs: ["packages/devtools/src", "packages/devtools/test", "packages/core/src", "packages/testing/src"], files: [SRC, TL, TS] },
  http: { cf: "stryker.http.mjs", rp: "reports/mutation-http/mutation.json", dirs: ["packages/http/src", "packages/http/test", "packages/core/src", "packages/testing/src"], files: [DLH] },
};
// The eight files this phase touches that a Stryker config covers, measured at the base and at the close (sorted).
const FILES = [DL, DR, DS, SC, SRC, TL, TS, DLH];
// Declared before the change (D-12, D-16): statements the change deletes. None may remain in the after file's code,
// and a killed mutant that leaves a file must sit on a line the after file no longer has, or be matched by a killed
// mutant of the same mutator on the same line text (a rewritten expression).
const DELETED = {
  [DR]: ["export interface Stamped", "class StoredDecisionRecord", "class StoredObligationRecord", "StoredDecisionRecord | StoredObligationRecord", "stampRecordMatch", "export const stampRecord"],
  [DL]: ["const isolate =", "isolate(\"append\")", "isolate(\"publish\")", "a decision log's ${half} half failed"],
  [TL]: ["DecisionRecord & { environment: string }", "ObligationRecord & { environment: string }"],
};

const fail = (lines) => {
  console.error(lines.join("\n"));
  process.exit(1);
};
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
const text = (src, l) => {
  const L = src.split("\n");
  const a = l.start;
  const b = l.end;
  return a.line === b.line
    ? L[a.line - 1].slice(a.column - 1, b.column - 1)
    : [L[a.line - 1].slice(a.column - 1), ...L.slice(a.line, b.line - 1), L[b.line - 1].slice(0, b.column - 1)].join("\n");
};
const lineOf = (src, m) => norm(src.split("\n")[m.location.start.line - 1]);
// A mutant's identity without its status: mutator, replacement, mutated text, normalised source line (never a number).
const keyOf = (src, m) => [m.mutatorName, norm(m.replacement), norm(text(src, m.location)), lineOf(src, m)].join(" | ");
const anchorOf = (key) => {
  const f = key.split(" | ");
  return f[0] + " | " + f[f.length - 1];
};
const lastField = (key) => key.split(" | ").pop();
const bodyOf = (key) => key.split(" | ").slice(0, -1).join(" | ");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const ks = (x) => Object.keys(x || {}).sort().join(",");
const sortKeys = (x) => Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]));
const suiteOf = (name) => SUITES[name] || fail(["no suite " + name + "; one of " + Object.keys(SUITES).join(", ")]);
// Multiset difference: every element of `xs` not matched one-for-one by an element of `ys`.
const minus = (xs, ys) => {
  const left = new Map();
  for (const y of ys) left.set(y, (left.get(y) || 0) + 1);
  return xs.filter((x) => {
    const n = left.get(x) || 0;
    if (n === 0) return true;
    left.set(x, n - 1);
    return false;
  });
};

// A report's per-file entries by repository-relative path; refused when stale, holding other files, or not the disk.
const reportOf = (dirs, from, files) => {
  if (!fs.existsSync(from)) fail(["no " + from]);
  const bad = [];
  const newest = dirs
    .flatMap((d) => fs.readdirSync(d, { recursive: true }).map((f) => p.join(d, f)))
    .filter((f) => fs.statSync(f).isFile())
    .sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0];
  if (fs.statSync(from).mtimeMs <= fs.statSync(newest).mtimeMs) bad.push("stale " + from + " (older than " + newest + ")");
  const rep = {};
  for (const [k, v] of Object.entries(readJson(from).files)) rep[p.isAbsolute(k) ? p.relative(process.cwd(), k) : k] = v;
  if (ks(rep) !== [...files].sort().join(",")) bad.push(from + " holds " + ks(rep) + ", not exactly " + [...files].sort().join(","));
  for (const f of files) if (rep[f] && rep[f].source !== fs.readFileSync(f, "utf8")) bad.push("the report for " + f + " is not the file on disk");
  if (bad.length) fail(bad);
  return rep;
};

// Merges one suite's gate report into `out`; the other suites' entries already there are kept.
const write = async (out, name) => {
  const s = suiteOf(name);
  const cfg = (await import(pathToFileURL(p.resolve(s.cf)).href)).default;
  if ((cfg.jsonReporter || {}).fileName !== s.rp) fail([s.cf + " does not report to " + s.rp]);
  const rep = reportOf(s.dirs, s.rp, s.files);
  const o = fs.existsSync(D + out) ? readJson(D + out) : { counts: {}, detected: {}, ignored: {}, measured: {}, survivors: {} };
  for (const f of s.files) {
    const v = rep[f];
    const c = (st) => v.mutants.filter((m) => m.status === st).length;
    o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
    const det = c("Killed") + c("Timeout");
    const n = det + c("Survived") + c("NoCoverage");
    o.measured[f] = n ? det / n : 1;
    const of = (...st) => v.mutants.filter((m) => st.includes(m.status));
    o.detected[f] = of("Killed", "Timeout").map((m) => keyOf(v.source, m)).sort();
    o.survivors[f] = of("Survived", "NoCoverage").map((m) => m.status + " | " + keyOf(v.source, m)).sort();
    o.ignored[f] = of("Ignored").map((m) => keyOf(v.source, m)).sort();
    console.log(f + " " + o.measured[f] + " (" + det + "/" + n + ") ignored " + c("Ignored"));
    for (const m of of("Survived", "NoCoverage")) console.log("  survivor " + f + ":" + m.location.start.line + ":" + m.location.start.column + " " + m.status + " | " + keyOf(v.source, m).slice(0, 160));
  }
  const sorted = Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])]));
  fs.writeFileSync(D + out, JSON.stringify(sorted, null, 1) + "\n");
  console.log("wrote " + D + out + " (" + name + ")");
};

// Keeps an ignoreStatic:false run of one suite's config on the after tree as key/status, merged per file.
const evidence = (name, from) => {
  const s = suiteOf(name);
  if (!from) fail(["usage: node " + D + "58-mutation.mjs evidence core|devtools|http <the ignoreStatic:false report>"]);
  if (p.resolve(from) === p.resolve(s.rp)) fail([from + " is the gate run's report; the evidence is the second run's"]);
  const raw = readJson(from).files;
  const files = Object.keys(raw).map((k) => (p.isAbsolute(k) ? p.relative(process.cwd(), k) : k)).filter((f) => s.files.includes(f));
  if (!files.length) fail([from + " holds none of " + s.files.join(", ")]);
  const rep = reportOf(s.dirs, from, files);
  const out = D + "58-mutation-static.json";
  const o = fs.existsSync(out) ? readJson(out) : {};
  for (const f of files) {
    o[f] = rep[f].mutants.map((m) => ({ key: keyOf(rep[f].source, m), status: m.status }));
    const tally = {};
    for (const m of o[f]) tally[m.status] = (tally[m.status] || 0) + 1;
    console.log(f + " " + JSON.stringify(tally));
  }
  fs.writeFileSync(out, JSON.stringify(sortKeys(o), null, 1) + "\n");
  console.log("wrote " + out);
};

const code = (f) => fs.readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const compare = (ev) => {
  const b = readJson(D + "58-mutation-base.json");
  const a = readJson(D + "58-mutation-after.json");
  const bad = [];
  for (const k of ["counts", "detected", "ignored", "measured", "survivors"]) {
    if (ks(b[k]) !== FILES.join(",")) bad.push("base " + k + " keys: " + ks(b[k]));
    if (ks(a[k]) !== FILES.join(",")) bad.push("after " + k + " keys: " + ks(a[k]));
  }
  if (bad.length) fail(bad);
  const st = ev ? readJson(ev) : {};
  for (const f of FILES) {
    const lines = new Set(fs.readFileSync(f, "utf8").split("\n").map(norm));
    const gone = minus(b.survivors[f], a.survivors[f]);
    // A survivor whose line was rewritten (the line text is gone) is the same survivor when its status, mutator,
    // replacement and mutated text are; it moved, it is not new.
    const left = [...gone];
    const moved = [];
    const added = minus(a.survivors[f], b.survivors[f]).filter((x) => {
      const i = left.findIndex((y) => bodyOf(y) === bodyOf(x) && !lines.has(lastField(y)));
      if (i < 0) return true;
      moved.push(left[i].slice(0, 120) + " -> line " + lastField(x).slice(0, 80));
      left.splice(i, 1);
      return false;
    });
    const lost = minus(b.detected[f], a.detected[f]);
    const gained = minus(a.detected[f], b.detected[f]);
    const pairs = gained.map(anchorOf);
    const unpaired = lost.filter((x) => {
      const i = pairs.indexOf(anchorOf(x));
      if (i < 0) return true;
      pairs.splice(i, 1);
      return false;
    });
    const deleted = unpaired.filter((x) => !lines.has(lastField(x)));
    const kept = unpaired.filter((x) => lines.has(lastField(x)));
    console.log(f + " " + b.measured[f] + " -> " + a.measured[f] + " (detected " + b.detected[f].length + " -> " + a.detected[f].length + "; lost " + lost.length + ", rewritten " + (lost.length - unpaired.length) + ", deleted " + deleted.length + "; survivors +" + added.length + " -" + left.length + ", moved " + moved.length + ")");
    for (const x of deleted) console.log("  deleted " + x.slice(0, 160));
    for (const x of moved) console.log("  moved survivor " + x);
    for (const x of left) console.log("  gone survivor " + x.slice(0, 160));
    for (const x of added) bad.push(f + ": new survivor " + x.slice(0, 200));
    for (const x of kept) bad.push(f + ": a killed mutant left but its line is still there: " + x.slice(0, 200));
    for (const frag of DELETED[f] || []) if (code(f).includes(frag)) bad.push(f + ": the declared deletion did not happen: " + frag);
    const fresh = minus(a.ignored[f], b.ignored[f]);
    if (fresh.length && !ev) bad.push(f + " has " + fresh.length + " new static-ignored mutant(s) and no evidence was given: run its suite with ignoreStatic:false and pass " + D + "58-mutation-static.json");
    else if (fresh.length) {
      const killed = (st[f] || []).filter((m) => m.status === "Killed").map((m) => m.key);
      const unmatched = minus(fresh, killed);
      if (unmatched.length) bad.push("no static credit for " + f + ": " + unmatched.length + " new ignored mutant(s) not Killed in " + ev + ":\n  " + unmatched.map((x) => x.slice(0, 160)).join("\n  "));
      else console.log("  static: all " + fresh.length + " new ignored mutant(s) of " + f + " are Killed in " + ev);
    }
  }
  if (bad.length) fail(bad);
  console.log("WX-05 holds (D-16)");
};

const [mode, arg, arg2] = process.argv.slice(2);
if (mode === "base") await write("58-mutation-base.json", arg);
else if (mode === "after") await write("58-mutation-after.json", arg);
else if (mode === "evidence") evidence(arg, arg2);
else if (mode === "compare") compare(arg);
else fail(["usage: node " + D + "58-mutation.mjs base|after core|devtools|http, evidence core|devtools|http <report>, or compare [evidence json]"]);
