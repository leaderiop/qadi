// node scripts/bench/analyze.mjs <outdir> <reference-label> <candidate-label> <workloads-file>
// node scripts/bench/analyze.mjs --self-test
//
// The A/B bench gate over the runs `scripts/bench/ab.sh` writes. Per workload the decision statistic
// is the MEDIAN OF PER-RUN MINIMA of each arm (latency.min, reported in ms, handled in ns). A
// workload is SLOWER when the candidate's delta is strictly greater than MAX_SLOWDOWN, 5%, a fixed
// band the reference arm's spread never widens (the spread is recorded beside it and decides
// nothing). The gate passes only when no workload is slower and the geometric mean of the deltas is
// at most MAX_GEOMEAN_PCT, +2%. The median of per-run p50 and the mean of per-run means are recorded
// beside it, each with its delta, and never decide: one stalled run swings a mean of means by tens
// of percent.
//
// The workloads file names the gate's workloads before any run, one `<test title> :: <bench name>`
// key per line. A workload is found by that key and never by its position, since vitest orders a
// file's tasks by speed; a run missing a named workload or holding another one is refused. Phase
// 67's analyzer with its workload set read from that file.
//
// The two labels must be different and each an arm `meta.txt` names (`head_label`, `patched_label`);
// which of them is the reference is the caller's, since Phase 68's reference is the patched arm.
//
// Writes <outdir>/analysis.tsv and prints it. Exits 0 whenever the analysis completed, whatever the
// gate says; 2 on incomplete input.
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

/** The named workloads: one key per non-empty line, none twice. */
export const readWorkloads = (text) => {
  const keys = text.split("\n").filter((line) => line.trim() !== "");
  if (keys.length === 0) throw new Refused("the workloads file names no workload");
  const seen = new Set();
  for (const k of keys) {
    if (seen.has(k)) throw new Refused(`the workloads file names a workload twice: ${k}`);
    seen.add(k);
  }
  return keys;
};

/**
 * The rounds `meta.txt` records, once its two arm labels are checked against the two the caller names.
 * The roles are the caller's (Phase 68's reference is the patched arm), so either order passes; the same
 * label twice, or a label `ab.sh` did not write, is refused, since either compares an arm with something
 * that is not the other arm.
 */
export const readMeta = (text, where, refLabel, candLabel) => {
  const m = /^rounds: (\d+)$/m.exec(text);
  if (!m) throw new Refused(`no "rounds:" line in ${where}`);
  const rounds = Number(m[1]);
  if (rounds < MIN_ROUNDS) throw new Refused(`${where} says ${rounds} rounds; at least ${MIN_ROUNDS} are required`);
  if (refLabel === candLabel) throw new Refused(`the reference and candidate label are both ${refLabel}`);
  const arms = ["head_label", "patched_label"].map((key) => new RegExp(`^${key}: (.+)$`, "m").exec(text)?.[1]);
  if (arms.includes(undefined)) throw new Refused(`no "head_label:" and "patched_label:" lines in ${where}`);
  for (const label of [refLabel, candLabel])
    if (!arms.includes(label)) throw new Refused(`${label} is not an arm of ${where} (${arms.join(" and ")})`);
  return rounds;
};

/** A run is a Map: workload key -> { min, p50, mean } in ns. */
const readRun = (file) => {
  if (!existsSync(file)) throw new Refused(`missing run file ${file}`);
  const j = JSON.parse(readFileSync(file, "utf8"));
  if (j.success !== true) throw new Refused(`run ${file} has success !== true`);
  if (j.testResults.length !== 1) throw new Refused(`run ${file} holds ${j.testResults.length} bench files, not one`);
  const m = new Map();
  for (const a of j.testResults[0].assertionResults)
    for (const b of a.benchmarks ?? [])
      for (const t of b.tasks) {
        const key = `${b.name} :: ${t.name}`;
        if (m.has(key)) throw new Refused(`run ${file} holds ${key} twice`);
        m.set(key, { min: t.latency.min * 1e6, p50: t.latency.p50 * 1e6, mean: t.latency.mean * 1e6 });
      }
  return m;
};

/** Compare two arms (arrays of runs) over the named workloads. Pure: the self-test drives it. */
export const compare = (named, ref, cand) => {
  if (ref.length < MIN_ROUNDS || cand.length < MIN_ROUNDS)
    throw new Refused(`need at least ${MIN_ROUNDS} rounds per arm, got ${ref.length} and ${cand.length}`);
  for (const r of [...ref, ...cand]) {
    for (const k of named) if (!r.has(k)) throw new Refused(`a run is missing a named workload: ${k}`);
    for (const k of r.keys()) if (!named.includes(k)) throw new Refused(`a workload the gate does not name: ${k}`);
  }
  const rows = named.map((k) => {
    const col = (arm, s) => arm.map((m) => m.get(k)[s]);
    const d = (c, r) => (c - r) / r;
    const rMin = median(col(ref, "min"));
    const cMin = median(col(cand, "min"));
    const rP50 = median(col(ref, "p50"));
    const cP50 = median(col(cand, "p50"));
    const rMean = mean(col(ref, "mean"));
    const cMean = mean(col(cand, "mean"));
    return {
      k,
      rMin,
      cMin,
      dMin: d(cMin, rMin),
      rSpread: spread(col(ref, "min")),
      band: MAX_SLOWDOWN,
      slower: d(cMin, rMin) > MAX_SLOWDOWN,
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
  const NAMES = ["a :: one", "b :: two", "c :: three", "d :: four", "e :: five"];
  // The workload a case slows, found by its name: never the first, so a positional read misses it.
  const NAMED = "c :: three";
  // `named` is the candidate's factor for NAMED, `rest` for every other workload. A run lists its
  // workloads in `order`, as vitest lists them by speed.
  const run = (min, named = 1, rest = 1, meanScale = 1, order = NAMES) =>
    new Map(
      order.map((k) => {
        const m = min * (k === NAMED ? named : rest);
        return [k, { min: m, p50: m * 1.1, mean: m * 1.2 * meanScale }];
      }),
    );
  const arm = (mins, named, rest, meanScales = [], order) =>
    mins.map((m, i) => run(m, named, rest, meanScales[i] ?? 1, order));
  const base = arm([100, 100, 100]);
  // NAMED moves from third to second, so a read by position finds another workload in its place.
  const rotated = [...NAMES.slice(1), NAMES[0]];
  const cases = [
    ["identical arms pass", base, arm([100, 100, 100]), "pass"],
    ["the named workload 6% slower fails", base, arm([100, 100, 100], 1.06), "fail"],
    ["the named workload 6% slower with a 20% reference spread still fails", arm([90, 100, 110]), arm([100, 100, 100], 1.06), "fail"],
    ["the named workload 4.9% slower passes", base, arm([100, 100, 100], 1.049), "pass"],
    ["every workload 2.5% slower fails on the geomean", base, arm([100, 100, 100], 1.025, 1.025), "fail"],
    ["every workload 1.9% slower passes", base, arm([100, 100, 100], 1.019, 1.019), "pass"],
    ["a stalled mean with unchanged minima passes", base, arm([100, 100, 100], 1, 1, [1, 10, 1]), "pass"],
    ["the named workload 6% slower in runs listed in another order still fails", base, arm([100, 100, 100], 1.06, 1, [], rotated), "fail"],
  ];
  let passed = 0;
  const fail = (name, why) => {
    console.error(`self-test FAILED: ${name}: ${why}`);
    process.exit(1);
  };
  for (const [name, ref, cand, want] of cases) {
    const got = compare(NAMES, ref, cand).gate;
    if (got !== want) fail(name, `gate ${got}, wanted ${want}`);
    passed++;
  }
  const moved = compare(NAMES, base, arm([100, 100, 100], 1.06, 1, [], rotated));
  if (moved.worst.k !== NAMED || moved.slower !== 1) fail("the slower workload is found by name", `${moved.worst.k} is the worst`);
  passed++;
  const META = "head_label: final\npatched_label: base\nrounds: 3\n";
  const refusals = [
    ["a run missing a named workload is refused", () => compare(NAMES, base, arm([100, 100, 100], 1, 1, [], NAMES.slice(1)))],
    ["a run holding a workload the gate does not name is refused", () => compare(NAMES, base, arm([100, 100, 100], 1, 1, [], [...NAMES, "f :: six"]))],
    ["two rounds are refused", () => compare(NAMES, base.slice(1), arm([100, 100]))],
    ["a workloads file naming one workload twice is refused", () => readWorkloads("a :: one\nb :: two\na :: one\n")],
    ["an empty workloads file is refused", () => readWorkloads("\n\n")],
    ["the same label twice is refused", () => readMeta(META, "meta.txt", "final", "final")],
    ["a label that is neither arm is refused", () => readMeta(META, "meta.txt", "final", "other")],
    ["a reference label that is neither arm is refused", () => readMeta(META, "meta.txt", "other", "base")],
    ["a meta.txt with no arm labels is refused", () => readMeta("rounds: 3\n", "meta.txt", "final", "base")],
    ["a meta.txt with two rounds is refused", () => readMeta(META.replace("rounds: 3", "rounds: 2"), "meta.txt", "final", "base")],
  ];
  // Either order of the two arms is allowed, and the rounds come back.
  for (const [ref, cand] of [["final", "base"], ["base", "final"]]) {
    if (readMeta(META, "meta.txt", ref, cand) !== 3) fail("the two arms in either order are read", `${ref} against ${cand}`);
    passed++;
  }
  for (const [name, attempt] of refusals) {
    try {
      attempt();
    } catch (e) {
      if (e instanceof Refused) {
        passed++;
        continue;
      }
      throw e;
    }
    fail(name, "nothing was refused");
  }
  // End to end: the exit status of this file run on a record written to a temporary directory.
  // `fail` exits the process and skips a pending `finally`, so the statuses are checked after the
  // directory is removed.
  const e2e = [
    { name: "a passing gate exits 0", factor: 1, want: 0 },
    { name: "a failing gate exits 1", factor: 1.1, want: 1 },
  ];
  const dir = mkdtempSync(join(tmpdir(), "analyze-self-test-"));
  let statuses;
  try {
    const keys = ["a :: one", "b :: two"];
    writeFileSync(join(dir, "workloads.txt"), `${keys.join("\n")}\n`);
    writeFileSync(join(dir, "meta.txt"), META);
    const runJson = (scale) =>
      JSON.stringify({
        success: true,
        testResults: [
          {
            assertionResults: [
              {
                benchmarks: keys.map((key) => {
                  const [name, task] = key.split(" :: ");
                  return { name, tasks: [{ name: task, latency: { min: 1 * scale, p50: 1.1 * scale, mean: 1.2 * scale } }] };
                }),
              },
            ],
          },
        ],
      });
    statuses = e2e.map(({ factor }) => {
      for (let i = 1; i <= 3; i++) {
        writeFileSync(join(dir, `base-${i}.json`), runJson(1));
        writeFileSync(join(dir, `final-${i}.json`), runJson(factor));
      }
      const args = [fileURLToPath(import.meta.url), dir, "base", "final", join(dir, "workloads.txt")];
      return spawnSync(process.execPath, args, { encoding: "utf8", timeout: 60_000 }).status;
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  e2e.forEach(({ name, want }, i) => {
    if (statuses[i] !== want) fail(name, `exit ${statuses[i]}, wanted ${want}`);
    passed++;
  });
  console.log(`self-test: ${passed} passed`);
};

const main = () => {
  const [dir, refLabel, candLabel, workloadsFile] = process.argv.slice(2);
  if (!dir || !refLabel || !candLabel || !workloadsFile)
    throw new Refused("usage: analyze.mjs <outdir> <reference-label> <candidate-label> <workloads-file>");
  if (!existsSync(workloadsFile)) throw new Refused(`missing ${workloadsFile}`);
  const named = readWorkloads(readFileSync(workloadsFile, "utf8"));
  const metaFile = `${dir}/meta.txt`;
  if (!existsSync(metaFile)) throw new Refused(`missing ${metaFile}`);
  const rounds = readMeta(readFileSync(metaFile, "utf8"), metaFile, refLabel, candLabel);
  const load = (label) => Array.from({ length: rounds }, (_, i) => readRun(`${dir}/${label}-${i + 1}.json`));
  const result = compare(named, load(refLabel), load(candLabel));
  const text = render(result);
  writeFileSync(`${dir}/analysis.tsv`, `${text}\n`);
  console.log(text);
  return result.gate;
};

if (process.argv[2] === "--self-test") selfTest();
else
  try {
    process.exitCode = main() === "pass" ? 0 : 1;
  } catch (e) {
    if (e instanceof Refused) {
      console.error(`analyze.mjs: ${e.message}`);
      process.exit(2);
    }
    throw e;
  }
