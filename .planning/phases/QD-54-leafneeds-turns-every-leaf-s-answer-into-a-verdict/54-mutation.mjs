// Phase 54's mutation evidence (D-10, WX-05): `base` and `after` write a scoped Stryker report's scores and survivors;
// `compare` applies D-10 (Phase 53's D-14 rule). Run from the repository root: node <phase dir>/54-mutation.mjs base|after|compare
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/";
const RP = "reports/mutation/mutation.json";
const CF = "stryker.config.mjs";
// The module every leaf's verdict step moves into. A base file here, not a new one: it may not fall, and it must
// detect at least as many more mutants as the fallen files lost.
const LN = "packages/core/src/LeafNeeds.ts";
const FILES = ["packages/core/src/LeafNeeds.ts", "packages/core/src/Predicate.ts", "packages/core/src/Walk.ts"];
// The files whose verdict step moves into LeafNeeds.ts; only these may fall, and only by D-10's rule.
const MOVED = ["packages/core/src/Predicate.ts", "packages/core/src/Walk.ts"];
// Declared before the change: base survivors the 54-02 characterisation is written to kill (it asserts every
// leaf's trace.policyTag). A fallen file may lose these from its survivor set, and no other.
const KILLED = {
  "packages/core/src/Walk.ts": ['StringLiteral | Survived | "" | "HasCustom" | ? allow("HasCustom", policy.fields)'],
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
const idOf = (src, m) =>
  [m.mutatorName, m.status, norm(m.replacement), norm(text(src, m.location)), norm(src.split("\n")[m.location.start.line - 1])].join(" | ");
const det = (c) => c.killed + c.timeout;
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));

const write = async (out) => {
  const bad = [];
  const cfg = (await import(pathToFileURL(p.resolve(CF)).href)).default;
  if ((cfg.jsonReporter || {}).fileName !== RP) bad.push(CF + " does not report to " + RP);
  if (!fs.existsSync(RP)) fail(bad.concat("no " + RP));
  const newest = ["packages/core/src", "packages/core/test"]
    .flatMap((d) => fs.readdirSync(d, { recursive: true }).map((f) => p.join(d, f)))
    .filter((f) => fs.statSync(f).isFile())
    .sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0];
  if (fs.statSync(RP).mtimeMs <= fs.statSync(newest).mtimeMs) bad.push("stale " + RP + " (older than " + newest + ")");
  const rep = {};
  for (const [k, v] of Object.entries(readJson(RP).files)) rep[p.isAbsolute(k) ? p.relative(process.cwd(), k) : k] = v;
  const keys = Object.keys(rep).sort().join(",");
  if (keys !== FILES.join(",")) bad.push(RP + " holds " + keys + ", not exactly " + FILES.join(","));
  const o = { counts: {}, measured: {}, survivors: {} };
  for (const f of FILES) {
    const v = rep[f];
    if (!v) {
      bad.push("no report entry for " + f);
      continue;
    }
    if (v.source !== fs.readFileSync(f, "utf8")) bad.push("the report for " + f + " is not the file on disk");
    const c = (s) => v.mutants.filter((m) => m.status === s).length;
    o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
    const n = det(o.counts[f]) + c("Survived") + c("NoCoverage");
    o.measured[f] = n ? det(o.counts[f]) / n : 1;
    const sv = v.mutants.filter((m) => m.status === "Survived" || m.status === "NoCoverage");
    o.survivors[f] = sv.map((m) => idOf(v.source, m)).sort();
    console.log(f + " " + o.measured[f] + " (" + det(o.counts[f]) + "/" + n + ") ignored " + c("Ignored"));
    for (const m of sv) console.log("  survivor " + f + ":" + m.location.start.line + ":" + m.location.start.column + " " + idOf(v.source, m).slice(0, 160));
  }
  if (bad.length) fail(bad);
  fs.writeFileSync(D + out, JSON.stringify(o, null, 1) + "\n");
  console.log("wrote " + D + out);
};

const compare = () => {
  const b = readJson(D + "54-mutation-base.json");
  const a = readJson(D + "54-mutation-after.json");
  const bad = [];
  const ks = (x) => Object.keys(x || {}).sort().join(",");
  for (const k of ["counts", "measured", "survivors"]) {
    if (ks(b[k]) !== FILES.join(",")) bad.push("base " + k + " keys: " + ks(b[k]));
    if (ks(a[k]) !== FILES.join(",")) bad.push("after " + k + " keys: " + ks(a[k]));
  }
  if (bad.length) fail(bad);
  let left = 0;
  for (const f of FILES) {
    const sb = b.measured[f];
    const sa = a.measured[f];
    const bs = [...b.survivors[f]].sort();
    const as = [...a.survivors[f]].sort();
    const added = as.filter((x) => !bs.includes(x));
    const gone = bs.filter((x) => !as.includes(x));
    console.log(f + " " + sb + " -> " + sa + " (detected " + det(b.counts[f]) + " -> " + det(a.counts[f]) + "; survivors +" + added.length + " -" + gone.length + ")");
    for (const x of added) console.log("  new survivor " + x.slice(0, 160));
    for (const x of gone) console.log("  gone survivor " + x.slice(0, 160));
    if (sa >= sb) continue;
    if (!MOVED.includes(f)) {
      bad.push(f + " fell from " + sb + " to " + sa + " and moved no verdict step into LeafNeeds.ts");
      continue;
    }
    const undeclared = gone.filter((x) => !(KILLED[f] || []).includes(x));
    if (added.length || undeclared.length) {
      bad.push(f + " fell from " + sb + " to " + sa + " and its survivors changed beyond the declared kills");
      continue;
    }
    left += det(b.counts[f]) - det(a.counts[f]);
  }
  const gained = det(a.counts[LN]) - det(b.counts[LN]);
  console.log(LN + " detects " + det(b.counts[LN]) + " -> " + det(a.counts[LN]) + " (+" + gained + "); detected mutants that left the fallen files: " + left);
  if (gained < left) bad.push(LN + " gained " + gained + " detected mutants, fewer than the " + left + " that left the fallen files");
  if (bad.length) fail(bad);
  console.log("WX-05 holds (D-10)");
};

const mode = process.argv[2];
if (mode === "base") await write("54-mutation-base.json");
else if (mode === "after") await write("54-mutation-after.json");
else if (mode === "compare") compare();
else fail(["usage: node " + D + "54-mutation.mjs base|after|compare"]);
