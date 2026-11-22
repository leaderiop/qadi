// Phase 60's mutation evidence (D-08, D-10, D-16, WX-05). `base` and `after` write one scoped devtools Stryker report's
// scores, detected (Killed or Timeout), survivor (Survived or NoCoverage) and ignored mutant identities; `evidence
// <report>` keeps an ignoreStatic:false report of the after tree; `compare [evidence json]` applies D-10: no touched
// file's score falls, no new survivor, every declared deletion happened, and a new static-ignored mutant needs Killed
// evidence (ADR-QD-167 Rev 1.1). Phase 59's identity mechanics, with no receiver: nothing moves between files here.
// Run from the repository root:
//   node <phase dir>/60-mutation.mjs base
//   node <phase dir>/60-mutation.mjs after
//   node <phase dir>/60-mutation.mjs evidence <the ignoreStatic:false report>
//   node <phase dir>/60-mutation.mjs compare [evidence json]
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-60-devtools-headless-interface-is-the-feeds/";
const CF = "stryker.devtools.mjs";
const RP = "reports/mutation-devtools/mutation.json";
const DIRS = ["packages/devtools/src", "packages/devtools/test"];
const M = "packages/devtools/src/model/";
const DF = M + "DiagnosticsFeed.ts";
const DS = M + "DiagnosticsStore.ts";
// The five model files the phase edits, measured at the base and at the close (sorted).
const FILES = [DF, DS, M + "DockModel.ts", M + "GatesFeed.ts", M + "TimelineFeed.ts"];
// Declared before the change (D-03, D-15, D-16): code the change deletes. None may remain in the after file's code.
const DELETED = {
  [DF]: [
    "const runOptions =",
    "export interface DiagnosticsDockOptions",
    "import * as Schedule",
    "if (before !== undefined) off();",
  ],
  [DS]: [
    "readonly schedule?: Schedule.Schedule<unknown>;",
    "<ROut = never, E = never>",
    "<ROut, E>",
    "options?.schedule",
  ],
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
const det = (c) => c.killed + c.timeout;
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
const ks = (x) => Object.keys(x || {}).sort().join(",");
const sortKeys = (x) => Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]));
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
const reportOf = (from, files) => {
  if (!fs.existsSync(from)) fail(["no " + from]);
  const bad = [];
  const newest = DIRS.flatMap((d) => fs.readdirSync(d, { recursive: true }).map((f) => p.join(d, f)))
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

const write = async (out) => {
  const cfg = (await import(pathToFileURL(p.resolve(CF)).href)).default;
  if ((cfg.jsonReporter || {}).fileName !== RP) fail([CF + " does not report to " + RP]);
  if (cfg.ignoreStatic !== true) fail([CF + " no longer sets ignoreStatic: true"]);
  const rep = reportOf(RP, FILES);
  const o = { counts: {}, detected: {}, ignored: {}, measured: {}, survivors: {} };
  for (const f of FILES) {
    const v = rep[f];
    const c = (st) => v.mutants.filter((m) => m.status === st).length;
    o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
    const n = det(o.counts[f]) + c("Survived") + c("NoCoverage");
    o.measured[f] = n ? det(o.counts[f]) / n : 1;
    const of = (...st) => v.mutants.filter((m) => st.includes(m.status));
    o.detected[f] = of("Killed", "Timeout").map((m) => keyOf(v.source, m)).sort();
    o.survivors[f] = of("Survived", "NoCoverage").map((m) => m.status + " | " + keyOf(v.source, m)).sort();
    o.ignored[f] = of("Ignored").map((m) => keyOf(v.source, m)).sort();
    console.log(f + " " + o.measured[f] + " (" + det(o.counts[f]) + "/" + n + ") ignored " + c("Ignored"));
    for (const m of of("Survived", "NoCoverage")) console.log("  survivor " + f + ":" + m.location.start.line + ":" + m.location.start.column + " " + m.status + " | " + keyOf(v.source, m).slice(0, 160));
  }
  fs.writeFileSync(D + out, JSON.stringify(sortKeys(Object.fromEntries(Object.entries(o).map(([k, x]) => [k, sortKeys(x)]))), null, 1) + "\n");
  console.log("wrote " + D + out);
};

// Keeps an ignoreStatic:false run of the after tree as key/status per file.
const evidence = (from) => {
  if (!from) fail(["usage: node " + D + "60-mutation.mjs evidence <the ignoreStatic:false report>"]);
  if (p.resolve(from) === p.resolve(RP)) fail([from + " is the gate run's report; the evidence is the second run's"]);
  const rep = reportOf(from, FILES);
  const out = D + "60-mutation-static.json";
  const o = {};
  for (const f of FILES) {
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
  const b = readJson(D + "60-mutation-base.json");
  const a = readJson(D + "60-mutation-after.json");
  const bad = [];
  for (const k of ["counts", "detected", "ignored", "measured", "survivors"]) {
    if (ks(b[k]) !== FILES.join(",")) bad.push("base " + k + " keys: " + ks(b[k]));
    if (ks(a[k]) !== FILES.join(",")) bad.push("after " + k + " keys: " + ks(a[k]));
  }
  if (bad.length) fail(bad);
  const st = ev ? readJson(ev) : {};
  for (const f of FILES) {
    const lines = new Set(fs.readFileSync(f, "utf8").split("\n").map(norm));
    // A survivor whose line was rewritten (the line text is gone) is the same survivor when its status, mutator,
    // replacement and mutated text are; it moved, it is not new.
    const gone = [...minus(b.survivors[f], a.survivors[f])];
    const moved = [];
    const added = minus(a.survivors[f], b.survivors[f]).filter((x) => {
      const i = gone.findIndex((y) => bodyOf(y) === bodyOf(x) && !lines.has(lastField(y)));
      if (i < 0) return true;
      moved.push(gone[i].slice(0, 120) + " -> line " + lastField(x).slice(0, 80));
      gone.splice(i, 1);
      return false;
    });
    const lost = minus(b.detected[f], a.detected[f]);
    const pairs = minus(a.detected[f], b.detected[f]).map(anchorOf);
    const unpaired = lost.filter((x) => {
      const i = pairs.indexOf(anchorOf(x));
      if (i < 0) return true;
      pairs.splice(i, 1);
      return false;
    });
    const deleted = unpaired.filter((x) => !lines.has(lastField(x)));
    const kept = unpaired.filter((x) => lines.has(lastField(x)));
    console.log(f + " " + b.measured[f] + " -> " + a.measured[f] + " (detected " + det(b.counts[f]) + " -> " + det(a.counts[f]) + "; lost " + lost.length + ", rewritten " + (lost.length - unpaired.length) + ", deleted " + deleted.length + "; survivors +" + added.length + " -" + gone.length + ", moved " + moved.length + ")");
    for (const x of deleted) console.log("  deleted " + x.slice(0, 160));
    for (const x of moved) console.log("  moved survivor " + x);
    for (const x of gone) console.log("  gone survivor " + x.slice(0, 160));
    for (const x of added) bad.push(f + ": new survivor " + x.slice(0, 200));
    for (const x of kept) bad.push(f + ": a killed mutant left but its line is still there: " + x.slice(0, 200));
    for (const frag of DELETED[f] || []) if (code(f).includes(frag)) bad.push(f + ": the declared deletion did not happen: " + frag);
    const fresh = minus(a.ignored[f], b.ignored[f]);
    if (fresh.length && !ev) bad.push(f + " has " + fresh.length + " new static-ignored mutant(s) and no evidence was given: run the after tree with ignoreStatic:false and pass " + D + "60-mutation-static.json");
    else if (fresh.length) {
      const unmatched = minus(fresh, (st[f] || []).filter((m) => m.status === "Killed").map((m) => m.key));
      if (unmatched.length) bad.push("no static credit for " + f + ": " + unmatched.length + " new ignored mutant(s) not Killed in " + ev + ":\n  " + unmatched.map((x) => x.slice(0, 160)).join("\n  "));
      else console.log("  static: all " + fresh.length + " new ignored mutant(s) of " + f + " are Killed in " + ev);
    }
    // D-10: no receiver this phase, so no touched file may fall.
    if (a.measured[f] < b.measured[f]) bad.push(f + " fell from " + b.measured[f] + " to " + a.measured[f]);
  }
  if (bad.length) fail(bad);
  console.log("WX-05 holds (D-10)");
};

const [mode, arg] = process.argv.slice(2);
if (mode === "base") await write("60-mutation-base.json");
else if (mode === "after") await write("60-mutation-after.json");
else if (mode === "evidence") evidence(arg);
else if (mode === "compare") compare(arg);
else fail(["usage: node " + D + "60-mutation.mjs base|after, evidence <report>, or compare [evidence json]"]);
