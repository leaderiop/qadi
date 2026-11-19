// Phase 57's mutation evidence (D-12, WX-05). `base <suite>` and `after <suite>` merge one scoped Stryker report's
// scores, survivors and ignored mutants into one JSON; `evidence <report>` keeps an ignoreStatic:false core report of the
// after tree for EnvelopeKeys.ts; `compare` applies D-12: Phase 53's D-14 rule, with the static credit ADR-QD-167 Rev 1.1
// accepted, as Phase 56's D-11 applied it.
// Run from the repository root:
//   node <phase dir>/57-mutation.mjs base core|audit|react
//   node <phase dir>/57-mutation.mjs after core|audit|react
//   node <phase dir>/57-mutation.mjs evidence <the ignoreStatic:false core report>
//   node <phase dir>/57-mutation.mjs compare [evidence json]
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const D = ".planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/";
const SC = "packages/core/src/SinkCodec.ts";
const UD = "packages/core/src/UntrustedDecode.ts";
// The new leaf the declared-key derivation lives in (D-21). Absent at the base; at the close it may hold no Survived or
// NoCoverage mutant, and every mutant the gate run ignores as static must be Killed in the evidence run.
const PC = "packages/core/src/EnvelopeKeys.ts";
const AE = "packages/audit/src/AuditEntry.ts";
const AA = "packages/audit/src/AuditArchive.ts";
const HE = "packages/react/src/HydrationEngine.ts";
// One entry per Stryker config, none edited (D-22: HydrationEngine.ts is reached by --mutate on the command line).
// `dirs` is what a report must be newer than: audit's and react's vitest read @qadi/core from its source.
const SUITES = {
  core: { cf: "stryker.config.mjs", rp: "reports/mutation/mutation.json", dirs: ["packages/core/src", "packages/core/test"], base: [SC, UD], after: [PC, SC, UD] },
  audit: { cf: "stryker.audit.mjs", rp: "reports/mutation-audit/mutation.json", dirs: ["packages/audit/src", "packages/audit/test", "packages/core/src"], base: [AA, AE], after: [AA, AE] },
  react: { cf: "stryker.react.mjs", rp: "reports/mutation-react/mutation.json", dirs: ["packages/react/src", "packages/react/test", "packages/core/src"], base: [HE], after: [HE] },
};
// The five files this phase edits, measured at the base and at the close (sorted, as the JSON keys are compared).
const BASE = [AA, AE, SC, UD, HE];
const AFTER = [AA, AE, PC, SC, UD, HE];
// Declared before the change: the one base file allowed to fall because killed mutants moved out of it. SinkCodec.ts
// loses envelopeOf, its two key sets, its ownValue and the hand-built stored reader to the decoder's option (57-RESEARCH
// §7). A fall passes only with an unchanged survivor set, and the receivers (EnvelopeKeys.ts's detected mutants, its
// proven static ones, and UntrustedDecode.ts's gain in detected mutants) must cover at least the detected mutants that
// left. UntrustedDecode.ts, AuditEntry.ts, AuditArchive.ts and HydrationEngine.ts may not fall: a fall there is closed
// with a test.
const MOVED = [SC];
const RECEIVER = UD;

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
const sortKeys = (x) => Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]));
const where = (m) => ({ mutator: m.mutatorName, line: m.location.start.line, column: m.location.start.column, replacement: m.replacement });
const suiteOf = (name) => SUITES[name] || fail(["no suite " + name + "; one of " + Object.keys(SUITES).join(", ")]);

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
  if (ks(rep) !== files.join(",")) bad.push(from + " holds " + ks(rep) + ", not exactly " + files.join(","));
  for (const f of files) if (rep[f] && rep[f].source !== fs.readFileSync(f, "utf8")) bad.push("the report for " + f + " is not the file on disk");
  if (bad.length) fail(bad);
  return rep;
};

// Merges one suite's gate report into `out`; the other suites' entries already there are kept.
const write = async (out, name, which) => {
  const s = suiteOf(name);
  const files = s[which];
  const cfg = (await import(pathToFileURL(p.resolve(s.cf)).href)).default;
  if ((cfg.jsonReporter || {}).fileName !== s.rp) fail([s.cf + " does not report to " + s.rp]);
  const rep = reportOf(s.dirs, s.rp, files);
  const o = fs.existsSync(D + out) ? readJson(D + out) : { counts: {}, ignored: {}, measured: {}, survivors: {} };
  for (const f of files) {
    const v = rep[f];
    const c = (st) => v.mutants.filter((m) => m.status === st).length;
    o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
    const n = det(o.counts[f]) + c("Survived") + c("NoCoverage");
    o.measured[f] = n ? det(o.counts[f]) / n : 1;
    const sv = v.mutants.filter((m) => m.status === "Survived" || m.status === "NoCoverage");
    o.survivors[f] = sv.map((m) => idOf(v.source, m)).sort();
    o.ignored[f] = v.mutants.filter((m) => m.status === "Ignored").map(where);
    console.log(f + " " + o.measured[f] + " (" + det(o.counts[f]) + "/" + n + ") ignored " + c("Ignored"));
    for (const m of sv) console.log("  survivor " + f + ":" + m.location.start.line + ":" + m.location.start.column + " " + idOf(v.source, m).slice(0, 160));
  }
  const sorted = { counts: sortKeys(o.counts), ignored: sortKeys(o.ignored), measured: sortKeys(o.measured), survivors: sortKeys(o.survivors) };
  fs.writeFileSync(D + out, JSON.stringify(sorted, null, 1) + "\n");
  console.log("wrote " + D + out + " (" + name + ")");
};

// Keeps the evidence run (ignoreStatic:false, --mutate EnvelopeKeys.ts alone, same tree) as mutator/line/column/
// replacement/status.
const evidence = (from) => {
  if (!from) fail(["usage: node " + D + "57-mutation.mjs evidence <the ignoreStatic:false core report>"]);
  if (p.resolve(from) === p.resolve(SUITES.core.rp)) fail([from + " is the gate run's report; the evidence is the second run's"]);
  const rep = reportOf(SUITES.core.dirs, from, [PC]);
  const o = { [PC]: rep[PC].mutants.map((m) => ({ ...where(m), status: m.status })) };
  const tally = {};
  for (const m of o[PC]) tally[m.status] = (tally[m.status] || 0) + 1;
  console.log(PC + " " + JSON.stringify(tally));
  fs.writeFileSync(D + "57-mutation-static.json", JSON.stringify(o, null, 1) + "\n");
  console.log("wrote " + D + "57-mutation-static.json");
};

const compare = (ev) => {
  const b = readJson(D + "57-mutation-base.json");
  const a = readJson(D + "57-mutation-after.json");
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
  const gain = Math.max(0, det(a.counts[RECEIVER]) - det(b.counts[RECEIVER]));
  const pc = a.counts[PC];
  console.log(PC + " " + a.measured[PC] + " (detected " + det(pc) + "; survivors " + a.survivors[PC].length + "; ignored " + pc.ignored + ")");
  for (const x of a.survivors[PC]) console.log("  survivor " + x.slice(0, 160));
  if (a.survivors[PC].length) bad.push(PC + " holds " + a.survivors[PC].length + " survivor(s): kill each with a test, or rewrite an equivalent one away");
  let proven = 0;
  if (a.ignored[PC].length !== pc.ignored) bad.push(PC + " lists " + a.ignored[PC].length + " ignored mutants, its counts say " + pc.ignored);
  else if (pc.ignored) {
    if (!ev) bad.push(PC + " has " + pc.ignored + " static-ignored mutants and no evidence was given: run the ignoreStatic:false run and pass " + D + "57-mutation-static.json");
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
  if (det(pc) + proven + gain < left) bad.push(PC + " detects " + det(pc) + " (+" + proven + " static) and " + RECEIVER + " gained " + gain + ", fewer than the " + left + " detected mutants that left " + MOVED.join(", "));
  if (bad.length) fail(bad);
  console.log("WX-05 holds (D-12)");
};

const [mode, arg] = process.argv.slice(2);
if (mode === "base") await write("57-mutation-base.json", arg, "base");
else if (mode === "after") await write("57-mutation-after.json", arg, "after");
else if (mode === "evidence") evidence(arg);
else if (mode === "compare") compare(arg);
else fail(["usage: node " + D + "57-mutation.mjs base|after core|audit|react, evidence <report>, or compare [evidence json]"]);
