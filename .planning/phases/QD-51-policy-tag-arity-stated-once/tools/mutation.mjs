// Phase 51's mutation evidence (WX-05, D-11): writes 51-mutation-base.json or 51-mutation-after.json
// from Stryker's report, or compares the two.
//
// Run from the repository root, after (and only after) the matching Stryker run:
//   base:    pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts'
//   after:   the same invocation with ,packages/core/src/PolicyArity.ts appended inside the quotes
//   node .planning/phases/QD-51-policy-tag-arity-stated-once/tools/mutation.mjs <base|after|compare>
//
// The writer refuses a stale report, a report holding another file set, a report whose source is not
// the file on disk, and a config reporting elsewhere. A score is (Killed + Timeout) / (Killed + Timeout
// + Survived + NoCoverage); Ignored mutants are counted, never scored. A survivor's identity is textual
// (mutator, status, replacement, mutated text, its line's text), so a moved line keeps its identity.
import fs from "node:fs";
import p from "node:path";
import { pathToFileURL } from "node:url";

const mode = process.argv[2];
const D = ".planning/phases/QD-51-policy-tag-arity-stated-once/";
const DEC = "packages/core/src/Decision.ts";
const POL = "packages/core/src/Policy.ts";
const ARI = "packages/core/src/PolicyArity.ts";
const bad = [];
const done = (ok) => {
  if (bad.length) {
    console.error(bad.join("\n"));
    process.exit(1);
  }
  console.log(ok);
};

if (mode === "compare") {
  const read = (f) => JSON.parse(fs.readFileSync(D + f, "utf8"));
  const b = read("51-mutation-base.json");
  const a = read("51-mutation-after.json");
  const det = (c) => c.killed + c.timeout;
  const ks = (x) => Object.keys(x || {}).sort().join(",");
  if (ks(a) !== "counts,measured,survivors,unmeasured") bad.push("after keys: " + ks(a));
  for (const f of [DEC, POL]) if (!(f in (a.measured || {}))) bad.push("no after score for " + f);
  if (!(ARI in (a.measured || {})) && !(ARI in (a.unmeasured || {}))) {
    bad.push(ARI + " is neither measured nor recorded unmeasured");
  }
  if (!bad.length) {
    for (const f of [DEC, POL]) {
      const sb = b.measured[f];
      const sa = a.measured[f];
      const added = a.survivors[f].filter((x) => !b.survivors[f].includes(x));
      const gone = b.survivors[f].filter((x) => !a.survivors[f].includes(x));
      console.log(`${f} ${sb} -> ${sa} (survivors +${added.length} -${gone.length})`);
      for (const x of added) console.log("  new survivor " + x.slice(0, 160));
      for (const x of gone) console.log("  gone survivor " + x.slice(0, 160));
      if (added.length) bad.push(`${f} has ${added.length} new survivor(s)`);
      if (sa >= sb) continue;
      if (f !== DEC) {
        bad.push(`${f} fell from ${sb} to ${sa}`);
        continue;
      }
      // The deleted-code rule (Phase 50's D-13): a fall is accepted only when the mutants that left
      // went with the deleted trace-shape code, so nothing outside it is detected less.
      const r = b.deletedRegion[DEC];
      const outside = det(b.counts[DEC]) - r.detected;
      console.log(`  deleted-code rule: the region detected ${r.detected}; outside it ${outside} at the base, ${det(a.counts[DEC])} after`);
      if (det(a.counts[DEC]) < outside) {
        bad.push(`${DEC} fell and detects fewer mutants than the base did outside the deleted region (${outside} -> ${det(a.counts[DEC])})`);
      }
    }
    if (ARI in a.measured) {
      console.log(`${ARI} ${a.measured[ARI]} (${a.survivors[ARI].length} survivors)`);
      for (const x of a.survivors[ARI]) console.log("  new-file survivor " + x.slice(0, 160));
      const S = fs.existsSync(D + "51-05-SUMMARY.md") ? fs.readFileSync(D + "51-05-SUMMARY.md", "utf8") : "";
      if (a.survivors[ARI].length && !S.includes("## New-file survivors")) {
        bad.push(`${ARI} has survivors and 51-05-SUMMARY.md does not name them under ## New-file survivors`);
      }
    } else {
      console.log(`${ARI} unmeasured: ${a.unmeasured[ARI]}`);
    }
  }
  done("WX-05 holds");
} else if (mode === "base" || mode === "after") {
  const OUT = D + `51-mutation-${mode}.json`;
  const CF = "stryker.config.mjs";
  const RP = "reports/mutation/mutation.json";
  const NAMED = mode === "base" ? [DEC, POL] : [DEC, POL, ARI];
  const files = ["packages/core/src", "packages/core/test"]
    .flatMap((d) => fs.readdirSync(d, { recursive: true }).map((f) => p.join(d, f)))
    .filter((f) => fs.statSync(f).isFile());
  const newest = files.sort((x, y) => fs.statSync(y).mtimeMs - fs.statSync(x).mtimeMs)[0];
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
  const cfg = (await import(pathToFileURL(p.resolve(CF)).href)).default;
  if ((cfg.jsonReporter || {}).fileName !== RP) bad.push(`${CF} does not report to ${RP}`);
  const o = { measured: {}, counts: {}, survivors: {}, unmeasured: {} };
  if (mode === "base") {
    o.new = [ARI];
    o.deletedRegion = {};
  }
  if (!fs.existsSync(RP)) bad.push("no " + RP);
  else {
    if (fs.statSync(RP).mtimeMs <= fs.statSync(newest).mtimeMs) bad.push(`stale ${RP} (older than ${newest})`);
    const rep = {};
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(RP, "utf8")).files)) {
      rep[p.isAbsolute(k) ? p.relative(process.cwd(), k) : k] = v;
    }
    const extra = Object.keys(rep).filter((k) => !NAMED.includes(k));
    if (extra.length) bad.push(`${RP} holds files outside ${NAMED.join(",")}: ${extra.join(",")}`);
    for (const f of NAMED) {
      const v = rep[f];
      const scored = v ? v.mutants.filter((m) => m.status !== "Ignored") : [];
      if (f === ARI) {
        if (!fs.existsSync(f)) {
          bad.push(f + " does not exist");
          continue;
        }
        if (!scored.length) {
          o.unmeasured[f] = v
            ? `no scored mutant: all ${v.mutants.length} ignored (ignoreStatic: true)`
            : "no mutant: absent from the report (ignoreStatic: true; the module holds only static declarations)";
          console.log(`${f} unmeasured: ${o.unmeasured[f]}`);
          continue;
        }
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
      o.measured[f] = n ? d / n : 1;
      o.counts[f] = { killed: c("Killed"), timeout: c("Timeout"), survived: c("Survived"), noCoverage: c("NoCoverage"), ignored: c("Ignored") };
      const sv = ms.filter((m) => m.status === "Survived" || m.status === "NoCoverage");
      o.survivors[f] = sv.map((m) => idOf(v.source, m)).sort();
      console.log(f, String(o.measured[f]), `(${d}/${n})`, `ignored ${c("Ignored")}`);
      for (const m of sv) console.log(`survivor ${f}:${m.location.start.line}:${m.location.start.column} ${idOf(v.source, m).slice(0, 160)}`);
      if (mode === "base" && f === DEC) {
        const L = v.source.split("\n");
        const from = L.findIndex((l) => l.startsWith("const leafTags = [")) + 1;
        const to = L.findIndex((l) => l.startsWith("const traceChildrenOf =")) + 1;
        if (!(from > 0 && to > from)) {
          bad.push("the trace-shape region was not found in " + DEC);
          continue;
        }
        const rm = ms.filter((m) => m.location.start.line >= from && m.location.start.line < to);
        const r = {
          from,
          to,
          detected: rm.filter((m) => m.status === "Killed" || m.status === "Timeout").length,
          survived: rm.filter((m) => m.status === "Survived" || m.status === "NoCoverage").length,
          ignored: rm.filter((m) => m.status === "Ignored").length,
        };
        o.deletedRegion[DEC] = r;
        console.log(`deleted region ${DEC}:${from}-${to - 1} detected ${r.detected} survived ${r.survived} ignored ${r.ignored}`);
      }
    }
  }
  if (!bad.length) fs.writeFileSync(OUT, JSON.stringify(o, null, 1) + "\n");
  done(JSON.stringify(o.measured));
} else {
  console.error("usage: node tools/mutation.mjs <base|after|compare>");
  process.exit(2);
}
