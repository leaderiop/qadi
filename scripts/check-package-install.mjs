#!/usr/bin/env node
/**
 * Verifies the package a consumer installs, rather than the sources we compile.
 *
 * Every one of the repository's tests imports `src/` by relative path, so no
 * gate had ever resolved a `@qadi/*` specifier through a published `exports`
 * map. That leaves a whole class of defect invisible: the build can be perfect
 * and the tarball still unusable.
 *
 * It is not hypothetical. `npm pack` copies `"effect": "catalog:"` into the
 * tarball verbatim — pnpm's catalog protocol is a workspace-time thing that npm
 * has never heard of — and installing the result fails with
 * EUNSUPPORTEDPROTOCOL. `pnpm pack` rewrites it. So the packages are
 * publishable with exactly one of the two tools, and nothing recorded which
 * (ADR-QD-033).
 *
 * Five checks, in order of what they would catch:
 *
 *   0. build    — every public package is referenced by `tsconfig.build.json`
 *   1. protocol — no `catalog:`/`workspace:` survives into the packed manifest
 *   2. exports  — every path the `exports` map points at exists in the tarball
 *   3. runtime  — each entry point imports through that map and has exports
 *   4. consumer — a TypeScript consumer type-checks against the shipped
 *                 `.d.ts` and then authorizes correctly when run
 *
 * Check 0 looks redundant beside check 2 and is not, which is why it is first.
 * `tsconfig.build.json` omitted `packages/promise` from the day the facade
 * landed: `pnpm build` never built it, and `pnpm publish` would have shipped a
 * package whose `exports` pointed at a `lib/` that did not exist. Nothing
 * noticed for six commits because `pnpm typecheck` uses a *different* project
 * graph — one that does include it — and emits the same directory as a side
 * effect. So the artifact appeared to exist whenever anything had type-checked
 * first, and checks 2 to 4 would have inspected output the publish path never
 * produces. Reading the build graph is the only check here that cannot be
 * fooled by a stale `lib/`.
 *
 * Deliberately offline. `effect` and `react` are symlinked out of the
 * repository's own `node_modules` instead of installed from a registry: a merge
 * gate that needs the network fails for reasons that have nothing to do with
 * the change under review, and this one already runs behind `stryker`.
 *
 * Check 4 compiles the fixture and runs the emitted JavaScript, rather than
 * keeping a `.ts` file for tsc and a `.mjs` copy for node. One source, two
 * uses — two copies of one consumer is the shape of defect this library exists
 * to remove.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SANDBOX = join(ROOT, ".package-check");

const failures = [];
const fail = (message) => failures.push(message);

/** Workspace-time protocols. Valid in a manifest, meaningless in a tarball. */
const UNRESOLVED = /^(catalog:|workspace:|link:|file:|portal:)/;

const DEPENDENCY_FIELDS = ["dependencies", "peerDependencies", "optionalDependencies"];

// ---------------------------------------------------------------------------
// Discover the public packages. `private: true` is excluded, exactly as
// `check-api-surface.mjs`, gate 13, excludes it: @qadi/features is never
// published, so it has no tarball to check.
// ---------------------------------------------------------------------------

const packagesDir = join(ROOT, "packages");
const publicPackages = [];

for (const entry of readdirSync(packagesDir).sort()) {
  const manifestPath = join(packagesDir, entry, "package.json");
  if (!existsSync(manifestPath)) continue;
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.private === true) continue;
  publicPackages.push({ dir: join(packagesDir, entry), manifest });
}

if (publicPackages.length === 0) {
  console.error("package-install: no public packages found — the checker is looking in the wrong place");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Check 0 — the build graph publishes every public package.
//
// Static, so a `lib/` left behind by `pnpm typecheck` cannot hide the omission.
// ---------------------------------------------------------------------------

const buildConfigPath = join(ROOT, "tsconfig.build.json");
const buildConfig = JSON.parse(readFileSync(buildConfigPath, "utf8"));
const referenced = (buildConfig.references ?? []).map(({ path }) => path);

for (const { dir, manifest } of publicPackages) {
  const prefix = `packages/${dir.split("/").filter(Boolean).at(-1)}/`;
  if (!referenced.some((path) => path.startsWith(prefix))) {
    fail(
      `${manifest.name}: tsconfig.build.json has no reference under ${prefix}, so ` +
        `pnpm build never emits it and pnpm publish would ship it empty`,
    );
  }
}

// Build before packing, so the tarballs hold this commit's output rather than
// whatever a previous command happened to leave in lib/.
try {
  execFileSync("pnpm", ["build"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
} catch (error) {
  console.error(error.stdout ?? error.message);
  console.error("\npackage-install: pnpm build FAILED, so there is no artifact to check.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pack and extract. `pnpm pack` and not `npm pack`, which is the point.
// ---------------------------------------------------------------------------

rmSync(SANDBOX, { recursive: true, force: true });
const modules = join(SANDBOX, "node_modules");
mkdirSync(modules, { recursive: true });

const installed = [];

for (const { dir, manifest } of publicPackages) {
  const tarball = execFileSync("pnpm", ["pack", "--pack-destination", SANDBOX], {
    cwd: dir,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.endsWith(".tgz"));

  if (tarball === undefined) {
    fail(`${manifest.name}: pnpm pack produced no tarball`);
    continue;
  }

  const target = join(modules, manifest.name);
  mkdirSync(target, { recursive: true });
  execFileSync("tar", ["xzf", tarball, "-C", target, "--strip-components=1"], { cwd: SANDBOX });
  installed.push({ name: manifest.name, target, source: manifest });
}

// ---------------------------------------------------------------------------
// Check 1 — protocol. The defect that motivated the gate.
// ---------------------------------------------------------------------------

for (const { name, target } of installed) {
  const packed = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  for (const field of DEPENDENCY_FIELDS) {
    for (const [dependency, range] of Object.entries(packed[field] ?? {})) {
      if (typeof range === "string" && UNRESOLVED.test(range)) {
        fail(
          `${name}: ${field}.${dependency} is "${range}" in the packed manifest — ` +
            `a workspace protocol no registry can resolve. Pack with pnpm, not npm.`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Check 2 — the exports map points at files that exist.
//
// A wildcard subpath is checked by substituting `index`: `./lib/*.js` with no
// `./lib/index.js` behind it means the pattern is wrong or `files` omitted the
// directory. That is a real published-package failure and a cheap thing to see.
// ---------------------------------------------------------------------------

const collectExportPaths = (node, out = []) => {
  if (typeof node === "string") out.push(node);
  else if (node !== null && typeof node === "object") {
    for (const value of Object.values(node)) collectExportPaths(value, out);
  }
  return out;
};

for (const { name, target } of installed) {
  const packed = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));

  for (const path of collectExportPaths(packed.exports ?? {})) {
    if (!path.startsWith("./")) continue;
    const concrete = path.replaceAll("*", "index");
    if (!existsSync(join(target, concrete))) {
      fail(
        `${name}: exports "${path}" resolves to ${concrete}, which is not in the tarball ` +
          `(check "files" and that the build ran)`,
      );
    }
  }

  for (const included of packed.files ?? []) {
    if (!existsSync(join(target, included))) {
      fail(`${name}: "files" lists ${included}, which is not in the tarball`);
    }
  }
}

// ---------------------------------------------------------------------------
// Link the third-party dependencies out of this repository's node_modules, so
// the sandbox resolves without a registry.
// ---------------------------------------------------------------------------

const linked = new Set();

const link = (dependency) => {
  if (dependency.startsWith("@qadi/") || linked.has(dependency)) return;
  const source = join(ROOT, "node_modules", dependency);
  if (!existsSync(source)) {
    fail(`${dependency} is not installed at the repository root, so the sandbox cannot resolve it`);
    return;
  }
  const destination = join(modules, dependency);
  mkdirSync(dirname(destination), { recursive: true });
  symlinkSync(source, destination);
  linked.add(dependency);
};

for (const { target } of installed) {
  const packed = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  for (const field of DEPENDENCY_FIELDS) {
    for (const dependency of Object.keys(packed[field] ?? {})) link(dependency);
  }
}

// `@types/react` is a devDependency of @qadi/react rather than a dependency of
// the tarball, and check 4 needs it to type-check the fixture's react import.
link("@types/react");

// ---------------------------------------------------------------------------
// Check 3 — every entry point imports through the exports map.
// ---------------------------------------------------------------------------

const importProbe = installed
  .map(({ name }, index) => `import * as m${index} from "${name}";`)
  .join("\n");

const probeReport = installed
  .map(({ name }, index) => `  console.log("${name}", Object.keys(m${index}).length);`)
  .join("\n");

writeFileSync(
  join(SANDBOX, "probe.mjs"),
  `${importProbe}\n{\n${probeReport}\n}\n`,
);

let runtimeExports = 0;

try {
  const output = execFileSync("node", ["probe.mjs"], {
    cwd: SANDBOX,
    encoding: "utf8",
    stdio: "pipe",
  });
  for (const line of output.trim().split("\n")) {
    const [name, count] = line.split(" ");
    const total = Number(count);
    if (!Number.isInteger(total) || total === 0) {
      fail(`${name}: imported through its exports map but provided no runtime exports`);
    }
    runtimeExports += total;
  }
} catch (error) {
  fail(`importing the packed packages failed:\n${error.stderr ?? error.message}`);
}

// ---------------------------------------------------------------------------
// Check 4 — a TypeScript consumer type-checks against the shipped .d.ts and
// then authorizes correctly.
//
// The fixture asserts the security-relevant thing rather than that it loads:
// a permission the subject holds allows, one it does not holds denies, and the
// Promise facade agrees with the Effect path. `check` resolving `false` on a
// denial rather than rejecting is INV-QD-006 seen from a consumer's position.
// ---------------------------------------------------------------------------

const FIXTURE = `import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  Decided,
  DecisionHistoryUnknown,
  DecisionRecord,
  evaluate,
  EvaluationIdLive,
  fromRoles,
  hasPermission,
  permission,
  RelationshipResolverNever,
  role,
  stampRecord,
  toPredicate,
} from "@qadi/core";
import { makeQadi } from "@qadi/promise";
import { qadiTestLayer } from "@qadi/testing";
import { QadiProvider } from "@qadi/react";
import { emptyTimeline, ingest, verdictOf } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
import { compileSql } from "@qadi/predicate-sql";
import { compilePrismaWhere } from "@qadi/predicate-prisma";

const read = permission("document", "read");
const write = permission("document", "write");
const editor = role({ name: "editor", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [editor] });

const services = Layer.mergeAll(
  AttributeResolverNone,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
);

const decide = (policy: Parameters<typeof evaluate>[0]) =>
  Effect.runPromise(
    evaluate(policy).pipe(
      Effect.provide(currentSubjectLayer(alice)),
      Effect.provide(services),
    ),
  );

const expect = (label: string, actual: unknown, wanted: unknown) => {
  if (actual !== wanted) {
    throw new Error(\`consumer: \${label} was \${String(actual)}, wanted \${String(wanted)}\`);
  }
};

// The Effect path: a held permission allows, an unheld one denies.
expect("effect allow", (await decide(hasPermission(read)))._tag, "Allow");
expect("effect deny", (await decide(hasPermission(write)))._tag, "Deny");

// The Promise facade agrees, and a denial resolves rather than rejecting.
const qadi = makeQadi(services);
expect("promise allow", await qadi.check(alice, hasPermission(read)), true);
expect("promise deny", await qadi.check(alice, hasPermission(write)), false);
await qadi.dispose();

// The other public packages are imported and referenced, so a broken
// declaration file in any of them is a compile error here.
expect("testing layer", typeof qadiTestLayer, "function");
expect("react provider", typeof QadiProvider, "function");

// @qadi/devtools ships TWO entry points, and check 3's import probe only
// reaches package roots — so the second one is exercised here or nowhere.
const decided = await decide(hasPermission(read));
const timeline = ingest(
  emptyTimeline(),
  stampRecord(
    new DecisionRecord({
      evaluationId: decided.evaluationId,
      at: 0,
      policy: hasPermission(read),
      outcome: new Decided({ decision: decided }),
    }),
    "Server",
  ),
);
const [only] = timeline.entries;
expect("devtools timeline", timeline.entries.length, 1);
expect("devtools verdict", only === undefined ? "missing" : verdictOf(only), "Allow");
expect("devtools dock", typeof DevtoolsDock, "function");

// @qadi/predicate-sql and @qadi/predicate-prisma compile what toPredicate
// emits — a held permission folds to True, so both compile to their own
// vacuous-true identity rather than refusing.
const predicate = await Effect.runPromise(
  toPredicate(hasPermission(read)).pipe(
    Effect.provide(currentSubjectLayer(alice)),
    Effect.provide(services),
  ),
);
const sqlFragment = await Effect.runPromise(compileSql(predicate, { dialect: "postgres" }));
expect("predicate-sql fragment", sqlFragment.text, "TRUE");
const prismaWhere = await Effect.runPromise(compilePrismaWhere(predicate));
expect("predicate-prisma where", JSON.stringify(prismaWhere), JSON.stringify({ AND: [] }));

console.log("consumer: the published artifact authorizes correctly");
`;

writeFileSync(join(SANDBOX, "consumer.ts"), FIXTURE);
writeFileSync(
  join(SANDBOX, "tsconfig.json"),
  `${JSON.stringify(
    {
      compilerOptions: {
        module: "nodenext",
        moduleResolution: "nodenext",
        target: "es2022",
        // `esnext.disposable` is required by effect's own declarations; `dom`
        // supplies `console`. Neither is a qadi requirement.
        lib: ["es2023", "esnext.disposable", "dom"],
        strict: true,
        skipLibCheck: false,
        verbatimModuleSyntax: true,
        types: ["react"],
        outDir: "out",
      },
      files: ["consumer.ts"],
    },
    null,
    2,
  )}\n`,
);

if (failures.length === 0) {
  try {
    execFileSync("npx", ["tsc", "-p", join(SANDBOX, "tsconfig.json")], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: "pipe",
    });
  } catch (error) {
    fail(`the consumer does not type-check against the shipped .d.ts:\n${error.stdout ?? error.message}`);
  }
}

if (failures.length === 0) {
  try {
    execFileSync("node", ["out/consumer.js"], { cwd: SANDBOX, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    fail(`the consumer failed at runtime:\n${error.stdout ?? ""}${error.stderr ?? error.message}`);
  }
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    `\npackage-install: ${failures.length} failure(s) across ${installed.length} package(s).`,
  );
  console.error(`Sandbox kept in .package-check/ for inspection.`);
  process.exit(1);
}

rmSync(SANDBOX, { recursive: true, force: true });
console.log(
  `package-install: ${installed.length} package(s) pack, resolve and authorize ` +
    `(${runtimeExports} runtime export(s))`,
);
