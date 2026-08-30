#!/usr/bin/env node
/**
 * Runs apps/website's own check on every runtime whose Node satisfies the
 * toolchain that app depends on, and states the omission where it does not.
 *
 * Astro declares `engines.node` above the workspace's own floor
 * (`>=20.19.0`), and the workspace floor is a claim about what the nine
 * *published* packages support — this app is private and publishes nothing,
 * so the two floors are allowed to differ. A skip that cannot be seen is the
 * defect this repository keeps finding (the DoD table drifting from
 * `pnpm check` itself, `spec/devtools-spec/` claiming absence of things
 * already built), so this one prints instead of passing quietly. The floor
 * is read from Astro's own manifest rather than restated here, which is what
 * keeps this file correct after the next dependency bump rather than rotting
 * the moment Astro moves its own floor. See ADR-QD-059 and CCR-QD-092.
 */
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const WEBSITE = join(ROOT, "apps", "website");
const WORKFLOW = join(ROOT, ".github", "workflows", "check.yml");
const PREFIX = "website-build: ";

const say = (message) => console.log(`${PREFIX}${message}`);
const die = (message) => {
  console.error(`${PREFIX}${message}`);
  process.exit(1);
};

const explain = process.argv.includes("--explain");

// ---------------------------------------------------------------------------
// 1. Resolve the floor from Astro's own manifest.
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);

let astroManifestPath;
try {
  astroManifestPath = require.resolve("astro/package.json", { paths: [WEBSITE] });
} catch (error) {
  if (error.code === "MODULE_NOT_FOUND") {
    die("astro/package.json did not resolve from apps/website — run `pnpm install`.");
  }
  throw error;
}

const astroManifest = JSON.parse(readFileSync(astroManifestPath, "utf8"));
const declaredFloor = astroManifest.engines?.node;

if (declaredFloor === undefined) {
  die(
    `${astroManifestPath} no longer declares engines.node — the skip condition ` +
      "has lost its source. Read Astro's manifest and update this script deliberately.",
  );
}

// ---------------------------------------------------------------------------
// 2. Parse it, narrowly. Only a bare `>=MAJOR.MINOR.PATCH` is understood.
// ---------------------------------------------------------------------------

const FLOOR_PATTERN = /^>=(\d+)\.(\d+)\.(\d+)$/;
const floorMatch = FLOOR_PATTERN.exec(declaredFloor.trim());

if (floorMatch === null) {
  die(
    `astro's engines.node is "${declaredFloor}", which this script understands only ` +
      "as a bare >=MAJOR.MINOR.PATCH range. Widen the parser deliberately rather than " +
      "guess which runtimes a compound range admits.",
  );
}

const floor = {
  major: Number(floorMatch[1]),
  minor: Number(floorMatch[2]),
  patch: Number(floorMatch[3]),
};

const compareVersions = (a, b) => {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
};

const satisfiesFloor = (version) => compareVersions(version, floor) >= 0;

// ---------------------------------------------------------------------------
// 3. Read the matrix. Parse the workflow's text rather than adding a YAML
//    dependency — the shape is fixed, and a dependency here would be a
//    dependency inside the thing that decides whether the build passes.
// ---------------------------------------------------------------------------

const workflowText = readFileSync(WORKFLOW, "utf8");
const matrixMatch = /node-version:\s*\[([^\]]*)\]/.exec(workflowText);

if (matrixMatch === null) {
  die(
    `${WORKFLOW} has no inline node-version: [...] array — this gate can no longer ` +
      "tell which runtimes build the site. Update this parse alongside the workflow.",
  );
}

const legs = matrixMatch[1]
  .split(",")
  .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
  .filter((entry) => entry.length > 0);

/** A bare major (`"26"`) is that major with zero minor and patch. */
const parseLeg = (leg) => {
  const parts = leg.split(".").map(Number);
  return {
    major: parts[0] ?? 0,
    minor: parts[1] ?? 0,
    patch: parts[2] ?? 0,
  };
};

const legVerdicts = legs.map((leg) => ({ leg, satisfies: satisfiesFloor(parseLeg(leg)) }));

// ---------------------------------------------------------------------------
// 4. Assert coverage. No satisfying leg is a failure, not a silent skip.
// ---------------------------------------------------------------------------

const satisfyingLegs = legVerdicts.filter((v) => v.satisfies).map((v) => v.leg);

if (satisfyingLegs.length === 0) {
  die(
    `no leg in ${WORKFLOW}'s matrix (${legs.join(", ")}) satisfies astro's floor ` +
      `(>=${floor.major}.${floor.minor}.${floor.patch}) — check-website-build.mjs ` +
      "would otherwise skip on every leg. Either the matrix gains a satisfying " +
      "runtime or the site's toolchain comes back down.",
  );
}

// ---------------------------------------------------------------------------
// 5. Build, or state the skip.
// ---------------------------------------------------------------------------

const runtimeVersion = process.versions.node
  .split(".")
  .map(Number);
const runtime = { major: runtimeVersion[0], minor: runtimeVersion[1], patch: runtimeVersion[2] };
const runtimeSatisfies = satisfiesFloor(runtime);

if (explain) {
  say(`floor: >=${floor.major}.${floor.minor}.${floor.patch} (read from ${astroManifestPath})`);
  for (const { leg, satisfies } of legVerdicts) {
    say(`check.yml leg ${leg}: ${satisfies ? "build" : "skip"}`);
  }
  say(`verdict: ${runtimeSatisfies ? "build" : "skip"}`);
  process.exit(0);
}

if (!runtimeSatisfies) {
  say(
    `Node ${process.versions.node} is below astro's floor ` +
      `(>=${floor.major}.${floor.minor}.${floor.patch}, read from apps/website's ` +
      `installed astro manifest) — skipped here; built on the ${satisfyingLegs.join(", ")} leg(s) of check.yml.`,
  );
  process.exit(0);
}

say(`Node ${process.versions.node} satisfies astro's floor — building apps/website.`);

try {
  execFileSync("pnpm", ["--filter", "@qadi/website", "check"], {
    cwd: ROOT,
    stdio: "inherit",
  });
} catch (error) {
  process.exit(typeof error.status === "number" ? error.status : 1);
}
