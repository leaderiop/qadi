// node analyze.mjs <outdir> <reference-label> <candidate-label>
// node analyze.mjs --self-test
//
// The decode bench gate, fixed before any run: Phase 59's analyzer with its band and workload set
// replaced. Per workload the decision statistic is the MEDIAN OF PER-RUN MINIMA of each arm
// (latency.min, reported in ms, handled in ns). A workload is SLOWER when the candidate's delta is
// strictly greater than MAX_SLOWDOWN, 5%, a fixed band that the reference arm's spread never widens
// (the spread is recorded beside it and decides nothing). The gate passes only when no workload is
// slower and the geometric mean of the deltas is at most MAX_GEOMEAN_PCT, +2%. The median of per-run
// p50 and the mean of per-run means are recorded beside it, each with its delta, and never decide:
// a single stalled run swung the mean of means 44-134% on this host.
//
// Writes <outdir>/analysis.tsv and prints it. Exits 0 whenever the analysis completed, whatever the
// gate says; 2 on incomplete input.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const AUDIT = "audit — a decision record: one decoder or two";
const IGNORE = "ignore — the envelope projection: declared keys only, or undeclared keys besides";
const REQUIRED = [
  `${AUDIT} :: decodeSinkRecord alone`,
  `${AUDIT} :: row decoder, then decodeSinkRecord`,
  `${IGNORE} :: decodeStoredRecord`,
  `${IGNORE} :: decodeStoredRecord, one undeclared key`,
  `${IGNORE} :: decodeSinkRecord, one undeclared key`,
  `${IGNORE} :: eight declared keys and eight undeclared, sixteen decodes`,
];
const MIN_ROUNDS = 3;
const MAX_SLOWDOWN = 0.05;
const MAX_GEOMEAN_PCT = 2;

class Refused extends Error {}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const spread = (xs) => (Math.max(...xs) - Math.min(...xs)) / median(xs);

/** A run is a Map: workload key -> { min, p50, mean } in ns. */
const readRun = (file) => {
  if (!existsSync(file)) throw new Refused(`missing run file ${file}`);
  const j = JSON.parse(readFileSync(file, "utf8"));
  if (j.success !== true) throw new Refused(`run ${file} has success !== true`);
  if (j.testResults.length !== 1) throw new Refused(`run ${file} holds ${j.testResults.length} bench files, not one`);
  const m = new Map();
  for (const a of j.testResults[0].assertionResults)
    for (const b of a.benchmarks ?? [])
      for (const t of b.tasks)
        m.set(`${b.name} :: ${t.name}`, {
          min: t.latency.min * 1e6,
          p50: t.latency.p50 * 1e6,
          mean: t.latency.mean * 1e6,
        });
  return m;
};

/** Compare two arms (arrays of runs). Pure: the self-test drives it with synthetic runs. */
export const compare = (ref, cand) => {
  if (ref.length < MIN_ROUNDS || cand.length < MIN_ROUNDS)
    throw new Refused(`need at least ${MIN_ROUNDS} rounds per arm, got ${ref.length} and ${cand.length}`);
  const keys = [...ref[0].keys()];
  const same = (a, b) => a.size === b.size && keys.every((k) => b.has(k));
  for (const r of [...ref, ...cand])
    if (!same(ref[0], r)) throw new Refused("a run's workload keys differ from the first reference run's");
  for (const k of REQUIRED) if (!ref[0].has(k)) throw new Refused(`missing workload key: ${k}`);
  for (const k of keys) if (!REQUIRED.includes(k)) throw new Refused(`a workload the gate does not name: ${k}`);
  const rows = keys.map((k) => {
    const col = (arm, s) => arm.map((m) => m.get(k)[s]);
    const rMin = median(col(ref, "min"));
    const cMin = median(col(cand, "min"));
    const rSpread = spread(col(ref, "min"));
    const band = MAX_SLOWDOWN;
    const d = (c, r) => (c - r) / r;
    const rP50 = median(col(ref, "p50"));
    const cP50 = median(col(cand, "p50"));
    const rMean = mean(col(ref, "mean"));
    const cMean = mean(col(cand, "mean"));
    return {
      k,
      rMin,
      cMin,
      dMin: d(cMin, rMin),
      rSpread,
      band,
      slower: d(cMin, rMin) > band,
      rP50,
      cP50,
      dP50: d(cP50, rP50),
      rMean,
      cMean,
      dMean: d(cMean, rMean),
    };
  });
  const slower = rows.filter((r) => r.slower).length;
  const geomean = (Math.exp(rows.reduce((a, r) => a + Math.log(1 + r.dMin), 0) / rows.length) - 1) * 100;
  const worst = rows.reduce((a, r) => (r.dMin > a.dMin ? r : a));
  return { rows, slower, geomean, worst, gate: slower === 0 && geomean <= MAX_GEOMEAN_PCT ? "pass" : "fail" };
};

const f = (x, n = 1) => x.toFixed(n);
export const render = ({ rows, slower, geomean, worst, gate }) =>
  [
    "workload\tref_min_ns\tcand_min_ns\td_min_pct\tref_min_spread_pct\tband_pct\tverdict\tref_p50_ns\tcand_p50_ns\td_p50_pct\tref_mean_ns\tcand_mean_ns\td_mean_pct",
    ...rows.map((r) =>
      [
        r.k,
        f(r.rMin, 0),
        f(r.cMin, 0),
        f(r.dMin * 100),
        f(r.rSpread * 100),
        f(r.band * 100),
        r.slower ? "SLOWER" : "ok",
        f(r.rP50, 0),
        f(r.cP50, 0),
        f(r.dP50 * 100),
        f(r.rMean, 0),
        f(r.cMean, 0),
        f(r.dMean * 100),
      ].join("\t"),
    ),
    `# workloads: ${rows.length}`,
    `# slower: ${slower}`,
    `# geomean_d_min_pct: ${f(geomean, 2)}`,
    `# max_slowdown_pct: ${f(MAX_SLOWDOWN * 100)}`,
    `# max_geomean_pct: ${f(MAX_GEOMEAN_PCT)}`,
    `# worst_d_min: ${f(worst.dMin * 100)} ${worst.k}`,
    `# gate: ${gate}`,
  ].join("\n");

const selfTest = () => {
  // `scale` is the candidate's factor for the first workload, `rest` for every other one.
  const run = (min, scale = 1, rest = 1, meanScale = 1) =>
    new Map(REQUIRED.map((k, i) => {
      const m = min * (i === 0 ? scale : rest);
      return [k, { min: m, p50: m * 1.1, mean: m * 1.2 * meanScale }];
    }));
  const arm = (mins, scale, rest, meanScales = []) => mins.map((m, i) => run(m, scale, rest, meanScales[i] ?? 1));
  const base = arm([100, 100, 100]);
  const cases = [
    ["identical arms pass", base, arm([100, 100, 100]), "pass"],
    ["one workload 6% slower fails", base, arm([100, 100, 100], 1.06), "fail"],
    ["one workload 6% slower with a 20% reference spread still fails", arm([90, 100, 110]), arm([100, 100, 100], 1.06), "fail"],
    ["one workload 4.9% slower passes", base, arm([100, 100, 100], 1.049), "pass"],
    ["every workload 2.5% slower fails on the geomean", base, arm([100, 100, 100], 1.025, 1.025), "fail"],
    ["every workload 1.9% slower passes", base, arm([100, 100, 100], 1.019, 1.019), "pass"],
    ["a stalled mean with unchanged minima passes", base, arm([100, 100, 100], 1, 1, [1, 10, 1]), "pass"],
  ];
  let passed = 0;
  for (const [name, ref, cand, want] of cases) {
    const got = compare(ref, cand).gate;
    if (got !== want) {
      console.error(`self-test FAILED: ${name}: gate ${got}, wanted ${want}`);
      process.exit(1);
    }
    passed++;
  }
  console.log(`self-test: ${passed} passed`);
};

const main = () => {
  const [dir, refLabel, candLabel] = process.argv.slice(2);
  if (!dir || !refLabel || !candLabel) throw new Refused("usage: analyze.mjs <outdir> <reference-label> <candidate-label>");
  const metaFile = `${dir}/meta.txt`;
  if (!existsSync(metaFile)) throw new Refused(`missing ${metaFile}`);
  const m = /^rounds: (\d+)$/m.exec(readFileSync(metaFile, "utf8"));
  if (!m) throw new Refused(`no "rounds:" line in ${metaFile}`);
  const rounds = Number(m[1]);
  if (rounds < MIN_ROUNDS) throw new Refused(`${metaFile} says ${rounds} rounds; at least ${MIN_ROUNDS} are required`);
  const load = (label) => Array.from({ length: rounds }, (_, i) => readRun(`${dir}/${label}-${i + 1}.json`));
  const text = render(compare(load(refLabel), load(candLabel)));
  writeFileSync(`${dir}/analysis.tsv`, `${text}\n`);
  console.log(text);
};

if (process.argv[2] === "--self-test") selfTest();
else
  try {
    main();
  } catch (e) {
    if (e instanceof Refused) {
      console.error(`analyze.mjs: ${e.message}`);
      process.exit(2);
    }
    throw e;
  }
