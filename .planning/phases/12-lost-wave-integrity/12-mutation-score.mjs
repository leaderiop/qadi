// Phase 12 mutation comparison (XC-05): a planning helper, not repo source.
//
//   node 12-mutation-score.mjs record   — at the phase base: writes 12-mutation-base.json (the eight
//                                          touched paths) and 12-mutation-base-<pkg>.json (every file
//                                          each report scored)
//   node 12-mutation-score.mjs compare  — later: exits 1 if a touched file scores below its base, or a
//                                          file absent at the base now scores below 80 (break threshold)
//
// Score = 100 × (Killed + Timeout) / (Killed + Timeout + Survived + NoCoverage), null when no report
// lists the file. Run from the repo root after the Stryker runs whose reports it reads.
//
// The base (f1041fe) was recorded from runs scoped to the touched files — a per-file score does not
// depend on what else is mutated (perTest coverage) — and `compare` needs the same scope at least:
//   pnpm exec stryker run stryker.config.mjs   --mutate "packages/core/src/DecisionLog.ts,packages/core/src/DecisionStream.ts,packages/core/src/HydrationMetrics.ts"
//   pnpm exec stryker run stryker.http.mjs     --mutate "packages/http/src/DecisionLogHttp.ts,packages/http/src/DecisionStreamRoute.ts"
//   pnpm exec stryker run stryker.devtools.mjs --mutate "packages/devtools/src/model/Source.ts,packages/devtools/src/model/Hydration.ts"
//   pnpm exec stryker run stryker.react.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPORTS = {
  core: "reports/mutation/mutation.json",
  http: "reports/mutation-http/mutation.json",
  devtools: "reports/mutation-devtools/mutation.json",
  react: "reports/mutation-react/mutation.json",
};
const TOUCHED = [
  "packages/core/src/DecisionLog.ts",
  "packages/core/src/DecisionStream.ts",
  "packages/core/src/HydrationMetrics.ts",
  "packages/http/src/DecisionLogHttp.ts",
  "packages/http/src/DecisionStreamRoute.ts",
  "packages/devtools/src/model/Source.ts",
  "packages/devtools/src/model/Hydration.ts",
  "packages/react/src/HydrationEvent.ts",
];

const score = (mutants) => {
  const count = (status) => mutants.filter((m) => m.status === status).length;
  const detected = count("Killed") + count("Timeout");
  const valid = detected + count("Survived") + count("NoCoverage");
  return valid === 0 ? null : (100 * detected) / valid;
};

/** Every file each report scored, by package. */
const perPackage = () =>
  Object.fromEntries(
    Object.entries(REPORTS).map(([pkg, path]) => {
      if (!existsSync(path)) return [pkg, {}];
      const files = JSON.parse(readFileSync(path, "utf8")).files ?? {};
      return [pkg, Object.fromEntries(Object.entries(files).map(([file, { mutants }]) => [file, score(mutants)]))];
    }),
  );

const touched = (packages) => {
  const all = Object.assign({}, ...Object.values(packages));
  return Object.fromEntries(TOUCHED.map((file) => [file, all[file] ?? null]));
};

const mode = process.argv[2];
if (mode === "record") {
  const packages = perPackage();
  for (const [pkg, files] of Object.entries(packages)) {
    writeFileSync(join(here, `12-mutation-base-${pkg}.json`), `${JSON.stringify(files, null, 1)}\n`);
  }
  writeFileSync(join(here, "12-mutation-base.json"), `${JSON.stringify(touched(packages), null, 1)}\n`);
  console.log(touched(packages));
} else if (mode === "compare") {
  const base = JSON.parse(readFileSync(join(here, "12-mutation-base.json"), "utf8"));
  const now = touched(perPackage());
  let failed = false;
  for (const file of TOUCHED) {
    const was = base[file];
    const is = now[file];
    const drop = is !== null && (was === null ? is < 80 : is < was);
    failed ||= drop;
    console.log(`${drop ? "FAIL" : "ok  "} ${file}: base ${was?.toFixed(2) ?? "absent"}, now ${is?.toFixed(2) ?? "absent"}`);
  }
  process.exit(failed ? 1 : 0);
} else {
  console.error("usage: node 12-mutation-score.mjs record|compare");
  process.exit(2);
}
