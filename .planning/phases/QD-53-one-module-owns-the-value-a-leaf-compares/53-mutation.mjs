// Phase 53's mutation evidence (D-14, WX-05): `base` and `after` write a scoped Stryker report's scores and survivors;
// `compare` applies D-14. Run from the repository root: node <phase dir>/53-mutation.mjs base|after|compare
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/";
const RP = "reports/mutation/mutation.json";
const CF = "stryker.config.mjs";
const OP = "packages/core/src/Operand.ts";
const BASE = [
  "packages/core/src/AttributeResolver.ts",
  "packages/core/src/CustomPredicate.ts",
  "packages/core/src/Decision.ts",
  "packages/core/src/FieldPath.ts",
  "packages/core/src/Matcher.ts",
  "packages/core/src/PortAccess.ts",
  "packages/core/src/Predicate.ts",
  "packages/core/src/Walk.ts",
];
const AFTER = [...BASE, OP].sort();
// The files whose code moves into Operand.ts; only these may fall, and only by D-14's rule.
const MOVED = ["packages/core/src/Decision.ts", "packages/core/src/Matcher.ts", "packages/core/src/Walk.ts"];
// Declared before the change: the one survivor on an edited line (Decision.ts, `if (isFieldOf(data, field)) {`).
const RENAMED = { "packages/core/src/Decision.ts": [["isFieldOf(", "isOwnKey("]] };

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

const write = async (named, out) => {
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
  if (keys !== named.join(",")) bad.push(RP + " holds " + keys + ", not exactly " + named.join(","));
  const o = { counts: {}, measured: {}, survivors: {} };
  for (const f of named) {
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
  const b = readJson(D + "53-mutation-base.json");
  const a = readJson(D + "53-mutation-after.json");
  const bad = [];
  const ks = (x) => Object.keys(x || {}).sort().join(",");
  for (const k of ["counts", "measured", "survivors"]) {
    if (ks(b[k]) !== BASE.join(",")) bad.push("base " + k + " keys: " + ks(b[k]));
    if (ks(a[k]) !== AFTER.join(",")) bad.push("after " + k + " keys: " + ks(a[k]));
  }
  if (bad.length) fail(bad);
  const mapped = (f, ids) => ids.map((s) => (RENAMED[f] || []).reduce((t, [x, y]) => t.split(x).join(y), s)).sort();
  let left = 0;
  for (const f of BASE) {
    const sb = b.measured[f];
    const sa = a.measured[f];
    const bs = mapped(f, b.survivors[f]);
    const as = [...a.survivors[f]].sort();
    const added = as.filter((x) => !bs.includes(x));
    const gone = bs.filter((x) => !as.includes(x));
    console.log(f + " " + sb + " -> " + sa + " (detected " + det(b.counts[f]) + " -> " + det(a.counts[f]) + "; survivors +" + added.length + " -" + gone.length + ")");
    for (const x of added) console.log("  new survivor " + x.slice(0, 160));
    for (const x of gone) console.log("  gone survivor " + x.slice(0, 160));
    if (sa >= sb) continue;
    if (!MOVED.includes(f)) {
      bad.push(f + " fell from " + sb + " to " + sa + " and moved no code into Operand.ts");
      continue;
    }
    if (added.length || gone.length) {
      bad.push(f + " fell from " + sb + " to " + sa + " and its survivors changed");
      continue;
    }
    left += det(b.counts[f]) - det(a.counts[f]);
  }
  const o = a.counts[OP];
  console.log(OP + " " + a.measured[OP] + " (" + det(o) + " detected, " + a.survivors[OP].length + " survivors); detected mutants that left the fallen files: " + left);
  for (const x of a.survivors[OP]) console.log("  new-file survivor " + x.slice(0, 160));
  if (det(o) < left) bad.push(OP + " detects " + det(o) + ", fewer than the " + left + " detected mutants that left the fallen files");
  const S = fs.existsSync(D + "53-06-SUMMARY.md") ? fs.readFileSync(D + "53-06-SUMMARY.md", "utf8") : "";
  if (a.survivors[OP].length && !S.includes("## New-file survivors")) bad.push(OP + " has survivors and 53-06-SUMMARY.md does not name them under ## New-file survivors");
  if (bad.length) fail(bad);
  console.log("WX-05 holds (D-14)");
};

const mode = process.argv[2];
if (mode === "base") await write(BASE, "53-mutation-base.json");
else if (mode === "after") await write(AFTER, "53-mutation-after.json");
else if (mode === "compare") compare();
else fail(["usage: node " + D + "53-mutation.mjs base|after|compare"]);
