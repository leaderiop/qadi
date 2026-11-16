// Phase 52's mutation evidence (WX-05, D-09, D-09a): writes 52-mutation-base.json or 52-mutation-after.json
// from the three Stryker reports, or compares the two.
//
// Run from the repository root, after (and only after) the three matching Stryker runs, one at a time and
// alone (a Timeout counts as detected, so contention raises a score). The same three at the base and at the close:
//   pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/RenderablePredicate.ts'
//   pnpm exec stryker run stryker.predicate-sql.mjs --mutate 'packages/predicate-sql/src/index.ts,packages/predicate-sql/src/CompileMetrics.ts'
//   pnpm exec stryker run stryker.predicate-prisma.mjs --mutate 'packages/predicate-prisma/src/index.ts,packages/predicate-prisma/src/CompileMetrics.ts'
//   node .planning/phases/QD-52-core-owns-the-predicate-compile-shell/tools/mutation.mjs <base|after|compare>
//
// The writer refuses a stale report, a report holding another file set, a report whose source is not the
// file on disk, and a config reporting elsewhere. A score is (Killed + Timeout) / (Killed + Timeout + Survived
// + NoCoverage); Ignored mutants are counted, never scored. Both CompileMetrics.ts files hold only
// module-scope declarations, so under `ignoreStatic: true` they have no scored mutant: they are recorded
// under `unmeasured` with the reason, never scored 1. A survivor's identity is textual (mutator, status,
// replacement, mutated text, its line's text), so a moved line keeps its identity.
//
// The compare rule is D-09a. No file may gain a survivor. Core's RenderablePredicate.ts may not fall, and
// every scored mutant of compilePredicate must be detected. A dialect's index.ts may fall only when its
// survivor set is unchanged and the fall is the shell's killed mutants moving to core: each one recorded at
// the base (on a line holding `?? "Ascii"`, `?? DEFAULT_MAX_IN_VALUES` or `Metric.update(compiledTotal.`)
// has a detected counterpart in compilePredicate (same mutator and replacement, same mutated text once
// `compiledTotal.` reads `options.outcomes.`), no shell line is left, and the file detects at least as many
// mutants as the base did outside the shell.
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const mode = process.argv[2];
const D = ".planning/phases/QD-52-core-owns-the-predicate-compile-shell/";
const CORE = "packages/core/src/RenderablePredicate.ts";
const SQL = "packages/predicate-sql/src/index.ts";
const PRISMA = "packages/predicate-prisma/src/index.ts";
const SQL_METRICS = "packages/predicate-sql/src/CompileMetrics.ts";
const PRISMA_METRICS = "packages/predicate-prisma/src/CompileMetrics.ts";
const RUNS = [
  { config: "stryker.config.mjs", report: "reports/mutation/mutation.json", files: [CORE], dirs: ["packages/core/src", "packages/core/test"] },
  {
    config: "stryker.predicate-sql.mjs",
    report: "reports/mutation-predicate-sql/mutation.json",
    files: [SQL, SQL_METRICS],
    dirs: ["packages/predicate-sql/src", "packages/predicate-sql/test", "packages/core/src"],
  },
  {
    config: "stryker.predicate-prisma.mjs",
    report: "reports/mutation-predicate-prisma/mutation.json",
    files: [PRISMA, PRISMA_METRICS],
    dirs: ["packages/predicate-prisma/src", "packages/predicate-prisma/test", "packages/core/src"],
  },
];
const MEASURED = [CORE, SQL, PRISMA];
const UNMEASURED = [SQL_METRICS, PRISMA_METRICS];
const SHELL_FILES = [SQL, PRISMA];
// The shell's tokens, the same as the scoped grep's: a mutant on a line holding one moves to core.
const SHELL = ['?? "Ascii"', "?? DEFAULT_MAX_IN_VALUES", "Metric.update(compiledTotal."];
const REGION_START = "export const compilePredicate";
const bad = [];
const done = (ok) => {
  if (bad.length) {
    console.error(bad.join("\n"));
    process.exit(1);
  }
  console.log(ok);
};
const isDetected = (s) => s === "Killed" || s === "Timeout";
const isSurvivor = (s) => s === "Survived" || s === "NoCoverage";
const det = (c) => c.killed + c.timeout;
const ks = (x) => Object.keys(x || {}).sort().join(",");

if (mode === "compare") {
  const read = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
  const b = read("52-mutation-base.json");
  const a = read("52-mutation-after.json");
  if (ks(b) !== "counts,measured,movedShell,survivors,unmeasured") bad.push("base keys: " + ks(b));
  if (ks(a) !== "counts,measured,movedShell,region,survivors,unmeasured") bad.push("after keys: " + ks(a));
  for (const f of MEASURED) {
    if (!(f in (b.measured || {}))) bad.push("no base score for " + f);
    if (!(f in (a.measured || {}))) bad.push("no after score for " + f);
  }
  for (const f of UNMEASURED) {
    if (!(f in (b.unmeasured || {})) || !(f in (a.unmeasured || {}))) bad.push(f + " is not unmeasured at both ends");
  }
  // Survivors are compared as multisets: two textually identical survivors are two, and one more of
  // them after is a new survivor.
  const minus = (xs, ys) => {
    const left = [...ys];
    return xs.filter((x) => {
      const i = left.indexOf(x);
      if (i < 0) return true;
      left.splice(i, 1);
      return false;
    });
  };
  if (!bad.length) {
    const gone = {};
    for (const f of MEASURED) {
      const cb = b.counts[f];
      const ca = a.counts[f];
      const added = minus(a.survivors[f], b.survivors[f]);
      gone[f] = minus(b.survivors[f], a.survivors[f]);
      const n = (c) => det(c) + c.survived + c.noCoverage;
      console.log(`${f} ${b.measured[f]} -> ${a.measured[f]} (${det(cb)}/${n(cb)} -> ${det(ca)}/${n(ca)}; survivors +${added.length} -${gone[f].length})`);
      for (const x of added) console.log("  new survivor " + x.slice(0, 160));
      for (const x of gone[f]) console.log("  gone survivor " + x.slice(0, 160));
      if (added.length) bad.push(`${f} has ${added.length} new survivor(s)`);
    }
    if (a.measured[CORE] < b.measured[CORE]) bad.push(`${CORE} fell from ${b.measured[CORE]} to ${a.measured[CORE]}`);
    const r = a.region[CORE];
    if (!r || !(r.detected > 0)) bad.push(`${CORE} has no scored mutant in compilePredicate`);
    else {
      console.log(`  compilePredicate ${CORE}:${r.from}-${r.to - 1} detected ${r.detected} survived ${r.survived} ignored ${r.ignored}`);
      if (r.survived) bad.push(`compilePredicate has ${r.survived} surviving mutant(s); core's new mutants must all be killed`);
    }
    const key = (m) => [m.mutator, m.replacement, m.text.split("compiledTotal.").join("options.outcomes.")].join(" | ");
    const into = r ? r.mutants.filter((m) => isDetected(m.status)).map(key) : [];
    for (const f of SHELL_FILES) {
      const m = b.movedShell[f];
      const left = a.movedShell[f];
      if (left.lines.length) bad.push(`${f} still holds the shell on line(s) ${left.lines.join(", ")}`);
      for (const x of m.mutants) {
        const found = into.includes(key(x));
        console.log(`  moved ${f}:${x.line} ${x.mutator} ${x.replacement} -> ${found ? "killed in compilePredicate" : "NO counterpart"}`);
        if (!found) bad.push(`${f}:${x.line} ${x.mutator} (${x.replacement}) has no detected counterpart in compilePredicate`);
      }
      if (a.measured[f] >= b.measured[f]) continue;
      if (gone[f].length) bad.push(`${f} fell and its survivor set changed (${gone[f].length} gone)`);
      const outside = det(b.counts[f]) - m.detected;
      console.log(`  D-09a ${f}: ${m.detected} detected mutant(s) moved to core; outside the shell ${outside} at the base, ${det(a.counts[f])} after`);
      if (det(a.counts[f]) < outside) {
        bad.push(`${f} fell and detects fewer mutants than the base did outside the shell (${outside} -> ${det(a.counts[f])})`);
      }
    }
    for (const f of UNMEASURED) console.log(`${f} unmeasured: ${a.unmeasured[f]}`);
  }
  done("WX-05 holds (D-09a)");
} else if (mode === "base" || mode === "after") {
  const OUT = D + `52-mutation-${mode}.json`;
  const norm = (s) => String(s).replace(/\s+/g, " ").trim();
  const text = (src, l) => {
    const L = src.split("\n");
    const { start: s, end: e } = l;
    return s.line === e.line
      ? L[s.line - 1].slice(s.column - 1, e.column - 1)
      : [L[s.line - 1].slice(s.column - 1), ...L.slice(s.line, e.line - 1), L[e.line - 1].slice(0, e.column - 1)].join("\n");
  };
  const idOf = (src, m) =>
    [m.mutatorName, m.status, norm(m.replacement), norm(text(src, m.location)), norm(src.split("\n")[m.location.start.line - 1])].join(" | ");
  const brief = (src, m) => ({
    line: m.location.start.line,
    mutator: m.mutatorName,
    status: m.status,
    replacement: norm(m.replacement),
    text: norm(text(src, m.location)),
  });
  const tally = (ms) => ({
    detected: ms.filter((m) => isDetected(m.status)).length,
    survived: ms.filter((m) => isSurvivor(m.status)).length,
    ignored: ms.filter((m) => m.status === "Ignored").length,
  });
  const o = { measured: {}, counts: {}, survivors: {}, unmeasured: {}, movedShell: {} };
  if (mode === "after") o.region = {};
  for (const run of RUNS) {
    const cfg = (await import(pathToFileURL(p.resolve(run.config)).href)).default;
    if ((cfg.jsonReporter || {}).fileName !== run.report) bad.push(`${run.config} does not report to ${run.report}`);
    if (!fs.existsSync(run.report)) {
      bad.push("no " + run.report);
      continue;
    }
    const files = run.dirs
      .flatMap((d) => fs.readdirSync(d, { recursive: true }).map((f) => p.join(d, f)))
      .filter((f) => fs.statSync(f).isFile());
    const newest = files.sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0];
    if (fs.statSync(run.report).mtimeMs <= fs.statSync(newest).mtimeMs) bad.push(`stale ${run.report} (older than ${newest})`);
    const rep = {};
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(run.report, "utf8")).files)) {
      rep[p.isAbsolute(k) ? p.relative(process.cwd(), k) : k] = v;
    }
    const extra = Object.keys(rep).filter((k) => !run.files.includes(k));
    if (extra.length) bad.push(`${run.report} holds files outside ${run.files.join(",")}: ${extra.join(",")}`);
    for (const f of run.files) {
      const v = rep[f];
      const scored = v ? v.mutants.filter((m) => m.status !== "Ignored") : [];
      if (UNMEASURED.includes(f)) {
        if (scored.length) {
          bad.push(`${f} has ${scored.length} scored mutant(s); this phase expects it to hold only static declarations`);
          continue;
        }
        o.unmeasured[f] = v
          ? `no scored mutant: all ${v.mutants.length} ignored (ignoreStatic: true; module-scope declarations only)`
          : "no mutant: absent from the report (ignoreStatic: true; module-scope declarations only)";
        console.log(`${f} unmeasured: ${o.unmeasured[f]}`);
        continue;
      }
      if (!v) {
        bad.push("no report entry for " + f);
        continue;
      }
      if (v.source !== fs.readFileSync(f, "utf8")) bad.push(`the report for ${f} is not the file on disk`);
      const ms = v.mutants;
      const c = (s) => ms.filter((m) => m.status === s).length;
      const d = c("Killed") + c("Timeout");
      const n = d + c("Survived") + c("NoCoverage");
      if (!n) {
        bad.push(`${f} has no scored mutant`);
        continue;
      }
      o.measured[f] = d / n;
      o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
      const sv = ms.filter((m) => isSurvivor(m.status));
      o.survivors[f] = sv.map((m) => idOf(v.source, m)).sort();
      console.log(f, String(o.measured[f]), `(${d}/${n})`, `ignored ${c("Ignored")}`);
      for (const m of sv) console.log(`survivor ${f}:${m.location.start.line}:${m.location.start.column} ${idOf(v.source, m).slice(0, 160)}`);
      const L = v.source.split("\n");
      if (SHELL_FILES.includes(f)) {
        const lines = L.flatMap((l, i) => (SHELL.some((t) => l.includes(t)) ? [i + 1] : []));
        if (mode === "base" && lines.length !== 4) {
          bad.push(`${f} has ${lines.length} shell line(s) at the base, expected 4 (identifiers, maxInValues, refused, compiled)`);
        }
        const sm = ms.filter((m) => lines.includes(m.location.start.line));
        o.movedShell[f] = { lines, ...tally(sm), mutants: sm.filter((m) => isDetected(m.status)).map((m) => brief(v.source, m)) };
        console.log(`shell ${f}: line(s) ${lines.join(", ") || "none"} detected ${o.movedShell[f].detected} survived ${o.movedShell[f].survived} ignored ${o.movedShell[f].ignored}`);
      }
      if (f === CORE) {
        const from = L.findIndex((l) => l.startsWith(REGION_START)) + 1;
        if (mode === "base") {
          if (from > 0) bad.push(`${CORE} already declares compilePredicate at the base`);
          continue;
        }
        if (from < 1) {
          bad.push(`${CORE} declares no compilePredicate`);
          continue;
        }
        const end = L.findIndex((l, i) => i >= from && /^(export |const |type |interface |function |\/\*\*|\/\/)/.test(l));
        const to = end < 0 ? L.length + 1 : end + 1;
        const rm = ms.filter((m) => m.location.start.line >= from && m.location.start.line < to);
        o.region[CORE] = { from, to, ...tally(rm), mutants: rm.map((m) => brief(v.source, m)) };
        console.log(`compilePredicate ${CORE}:${from}-${to - 1} detected ${o.region[CORE].detected} survived ${o.region[CORE].survived} ignored ${o.region[CORE].ignored}`);
      }
    }
  }
  if (!bad.length) fs.writeFileSync(OUT, JSON.stringify(o, null, 1) + "\n");
  done(JSON.stringify(o.measured));
} else {
  console.error("usage: node tools/mutation.mjs <base|after|compare>");
  process.exit(2);
}
