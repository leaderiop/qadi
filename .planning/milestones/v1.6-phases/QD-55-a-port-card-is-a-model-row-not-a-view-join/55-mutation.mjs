// Phase 55's mutation evidence (D-15, WX-05). `base` and `after` write a scoped Stryker report's scores, survivors and
// ignored mutants; `evidence <report>` keeps an ignoreStatic:false report of the after tree; `compare` applies D-15:
// Phase 53's D-14 rule, with the static credit ADR-QD-167 Rev 1.1 accepted.
// Run from the repository root: node <phase dir>/55-mutation.mjs base|after|evidence <report>|compare [evidence json]
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-55-a-port-card-is-a-model-row-not-a-view-join/";
const RP = "reports/mutation-devtools/mutation.json";
const CF = "stryker.devtools.mjs";
const M = "packages/devtools/src/model/";
// The new module the panel's join moves into. Absent at the base; at the close it may hold no Survived or NoCoverage
// mutant, and every mutant the gate run ignores as static must be Killed in the evidence run.
const PC = M + "PortCards.ts";
// The model files this phase edits, measured at the base and at the close.
const BASE = [M + "DockModel.ts", M + "Wiring.ts"];
const AFTER = [M + "DockModel.ts", PC, M + "Wiring.ts"];
// Declared before the change: base files allowed to fall because killed mutants moved out of them into PortCards.ts.
// Empty: the join comes from react/ServicesPanel.tsx, outside the mutate glob (55-RESEARCH Q5), so a fall in a BASE
// file is closed with a test, never re-baselined.
const MOVED = [];

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
const ks = (x) => Object.keys(x || {}).sort().join(",");
const where = (m) => ({ mutator: m.mutatorName, line: m.location.start.line, column: m.location.start.column, replacement: m.replacement });

// A report's per-file entries by repository-relative path; refused when stale, holding other files, or not the disk.
const reportOf = (from, files) => {
  if (!fs.existsSync(from)) fail(["no " + from]);
  const bad = [];
  const newest = ["packages/devtools/src", "packages/devtools/test"]
    .flatMap((d) => fs.readdirSync(d, { recursive: true }).map((f) => p.join(d, f)))
    .filter((f) => fs.statSync(f).isFile())
    .sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0];
  if (fs.statSync(from).mtimeMs <= fs.statSync(newest).mtimeMs) bad.push("stale " + from + " (older than " + newest + ")");
  const rep = {};
  for (const [k, v] of Object.entries(readJson(from).files)) rep[p.isAbsolute(k) ? p.relative(process.cwd(), k) : k] = v;
  if (ks(rep) !== files.join(",")) bad.push(from + " holds " + ks(rep) + ", not exactly " + files.join(","));
  for (const f of files) if (rep[f] && rep[f].source !== fs.readFileSync(f, "utf8")) bad.push("the report for " + f + " is not the file on disk");
  if (bad.length) fail(bad);
  return rep;
};

const write = async (out, files) => {
  const cfg = (await import(pathToFileURL(p.resolve(CF)).href)).default;
  if ((cfg.jsonReporter || {}).fileName !== RP) fail([CF + " does not report to " + RP]);
  const rep = reportOf(RP, files);
  const o = { counts: {}, ignored: {}, measured: {}, survivors: {} };
  for (const f of files) {
    const v = rep[f];
    const c = (s) => v.mutants.filter((m) => m.status === s).length;
    o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
    const n = det(o.counts[f]) + c("Survived") + c("NoCoverage");
    o.measured[f] = n ? det(o.counts[f]) / n : 1;
    const sv = v.mutants.filter((m) => m.status === "Survived" || m.status === "NoCoverage");
    o.survivors[f] = sv.map((m) => idOf(v.source, m)).sort();
    o.ignored[f] = v.mutants.filter((m) => m.status === "Ignored").map(where);
    console.log(f + " " + o.measured[f] + " (" + det(o.counts[f]) + "/" + n + ") ignored " + c("Ignored"));
    for (const m of sv) console.log("  survivor " + f + ":" + m.location.start.line + ":" + m.location.start.column + " " + idOf(v.source, m).slice(0, 160));
  }
  fs.writeFileSync(D + out, JSON.stringify(o, null, 1) + "\n");
  console.log("wrote " + D + out);
};

// Keeps the evidence run (ignoreStatic:false, same --mutate list, same tree) as mutator/line/column/replacement/status.
const evidence = (from) => {
  if (!from) fail(["usage: node " + D + "55-mutation.mjs evidence <the ignoreStatic:false report>"]);
  if (p.resolve(from) === p.resolve(RP)) fail([from + " is the gate run's report; the evidence is the second run's"]);
  const rep = reportOf(from, AFTER);
  const o = {};
  for (const f of AFTER) {
    o[f] = rep[f].mutants.map((m) => ({ ...where(m), status: m.status }));
    const tally = {};
    for (const m of o[f]) tally[m.status] = (tally[m.status] || 0) + 1;
    console.log(f + " " + JSON.stringify(tally));
  }
  fs.writeFileSync(D + "55-mutation-static.json", JSON.stringify(o, null, 1) + "\n");
  console.log("wrote " + D + "55-mutation-static.json");
};

const compare = () => {
  const b = readJson(D + "55-mutation-base.json");
  const a = readJson(D + "55-mutation-after.json");
  const bad = [];
  for (const k of ["counts", "ignored", "measured", "survivors"]) {
    if (ks(b[k]) !== BASE.join(",")) bad.push("base " + k + " keys: " + ks(b[k]));
    if (ks(a[k]) !== AFTER.join(",")) bad.push("after " + k + " keys: " + ks(a[k]));
  }
  if (bad.length) fail(bad);
  let left = 0;
  for (const f of BASE) {
    const sb = b.measured[f];
    const sa = a.measured[f];
    const added = a.survivors[f].filter((x) => !b.survivors[f].includes(x));
    const gone = b.survivors[f].filter((x) => !a.survivors[f].includes(x));
    console.log(f + " " + sb + " -> " + sa + " (detected " + det(b.counts[f]) + " -> " + det(a.counts[f]) + "; survivors +" + added.length + " -" + gone.length + ")");
    for (const x of added) console.log("  new survivor " + x.slice(0, 160));
    for (const x of gone) console.log("  gone survivor " + x.slice(0, 160));
    if (sa >= sb) continue;
    if (!MOVED.includes(f)) {
      bad.push(f + " fell from " + sb + " to " + sa + "; no mutant moved out of it, so the drop is closed with a test");
      continue;
    }
    if (added.length || gone.length) {
      bad.push(f + " fell from " + sb + " to " + sa + " and its survivor set changed");
      continue;
    }
    left += det(b.counts[f]) - det(a.counts[f]);
  }
  const pc = a.counts[PC];
  console.log(PC + " " + a.measured[PC] + " (detected " + det(pc) + "; survivors " + a.survivors[PC].length + "; ignored " + pc.ignored + ")");
  for (const x of a.survivors[PC]) console.log("  survivor " + x.slice(0, 160));
  if (a.survivors[PC].length) bad.push(PC + " holds " + a.survivors[PC].length + " survivor(s): kill each with a test, or rewrite an equivalent one away");
  let proven = 0;
  if (a.ignored[PC].length !== pc.ignored) bad.push(PC + " lists " + a.ignored[PC].length + " ignored mutants, its counts say " + pc.ignored);
  else if (pc.ignored) {
    const ev = process.argv[3];
    if (!ev) bad.push(PC + " has " + pc.ignored + " static-ignored mutants and no evidence was given: run the ignoreStatic:false run and pass " + D + "55-mutation-static.json");
    else {
      const key = (m) => [m.mutator, m.line, m.column, m.replacement].join("|");
      const killed = new Set((readJson(ev)[PC] || []).filter((m) => m.status === "Killed").map(key));
      const unmatched = a.ignored[PC].filter((m) => !killed.has(key(m)));
      if (unmatched.length) bad.push("no static credit: " + unmatched.length + " ignored mutants of " + PC + " are not Killed in " + ev + ":\n  " + unmatched.map((m) => m.line + ":" + m.column + " " + m.mutator + " -> " + m.replacement).join("\n  "));
      else {
        proven = pc.ignored;
        console.log("static: all " + proven + " ignored mutants of " + PC + " are Killed in " + ev);
      }
    }
  }
  if (det(pc) + proven < left) bad.push(PC + " detects " + det(pc) + " (+" + proven + " static), fewer than the " + left + " detected mutants that left the fallen files");
  if (bad.length) fail(bad);
  console.log("WX-05 holds (D-15)");
};

const mode = process.argv[2];
if (mode === "base") await write("55-mutation-base.json", BASE);
else if (mode === "after") await write("55-mutation-after.json", AFTER);
else if (mode === "evidence") evidence(process.argv[3]);
else if (mode === "compare") compare();
else fail(["usage: node " + D + "55-mutation.mjs base|after|evidence <report>|compare [evidence json]"]);
