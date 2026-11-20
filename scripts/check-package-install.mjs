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
 * Six checks, in order of what they would catch:
 *
 *   0. build    — every public package is referenced by `tsconfig.build.json`,
 *                 *and* by the root `tsconfig.json` (the typecheck graph)
 *   1. protocol — no `catalog:`/`workspace:` survives into the packed manifest
 *   2. exports  — every path the `exports` map points at exists in the tarball
 *   3. runtime  — each entry point imports through that map and has exports
 *   3b. closed  — no wildcard subpath; every declared subpath imports and every
 *                 other `lib/` module is refused with ERR_PACKAGE_PATH_NOT_EXPORTED
 *   4. consumer — a TypeScript consumer type-checks against the shipped
 *                 `.d.ts` and then authorizes correctly when run
 *
 * Check 0 looks redundant beside check 2 and is not, which is why it is first.
 * `tsconfig.build.json` omitted `packages/promise` from the day the facade
 * landed: `pnpm build` never built it, and `pnpm publish` would have shipped a
 * package whose `exports` pointed at a `lib/` that did not exist. Nothing
 * noticed for six commits because `pnpm typecheck` uses a *different* project
 * graph — one that did include it — and emitted the same directory as a side
 * effect. So the artifact appeared to exist whenever anything had type-checked
 * first, and checks 2 to 4 would have inspected output the publish path never
 * produces. Reading the build graph is the only check here that cannot be
 * fooled by a stale `lib/`.
 *
 * AGENTS.md §16 says adding a package "means editing both" graphs — the build
 * graph above, and the root `tsconfig.json` a package needs to have its
 * `test`/`bench` sources type-checked by `pnpm typecheck`/`pnpm check`. Only
 * the first half had a static check; a package present in the build graph but
 * missing from `tsconfig.json` would still pack, install and authorize
 * correctly (this gate would report success), while its own test suite quietly
 * stopped being type-checked by any `tsc` invocation — `vitest` transforms
 * tests without the compiler, so nothing else would notice either. Check 0
 * now reads both graphs for exactly that reason (paul-chiusano, PC-01).
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
 *
 * Check 4 then reads its own fixture. Every `make*Feed` the installed
 * `@qadi/devtools` root exports must be called in it, every name on
 * `TYPE_ONLY_PROBES` must be used in it as a type, and every key of
 * `REFUSED_SHAPE_PROBES` must annotate a literal there that holds a
 * `@ts-expect-error` naming the member paired with it. So a public name the
 * consumer never compiles cannot ship unnoticed, and a refusal cannot be deleted
 * together with its directive or stood in for by a directive on another property.
 * The feed set comes from the artifact, so a new feed is caught without editing
 * this file. TypeScript's parse (`typescript/unstable/*`, loaded when the check
 * runs) decides what is a call, a type use and a refusal, so a comment, a string,
 * an import or `typeof` does not count; and a failure to load or run that parse
 * fails the gate.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const SANDBOX = join(ROOT, ".package-check");

const failures = [];
const fail = (message) => failures.push(message);

/**
 * The type-only names check 4's consumer must use as a type.
 *
 * A type has no runtime key, so unlike the feeds it cannot be read from the
 * artifact and is written out; deleting the whole host-cache probe would
 * otherwise leave the gate green.
 */
const TYPE_ONLY_PROBES = ["DecisionCacheShape"];

/**
 * The type names check 4's consumer must refuse an old shape against, each
 * paired with the member of that shape its directive must name.
 *
 * A refusal is a literal annotated with the type that holds a `@ts-expect-error`
 * naming the refused member. The compiler fails an unused directive, but nothing
 * else keeps the literal, so deleting it together with its directive would
 * otherwise leave the gate green, and a directive on another property would
 * otherwise stand in for it.
 */
const REFUSED_SHAPE_PROBES = new Map([["DecisionCacheShape", "getOrCompute"]]);

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

// The typecheck graph's own reference list. Root `tsconfig.json` references a
// bare package directory (`{ "path": "packages/core" }`), not a `.json` file
// inside it, so the match is exact rather than a `startsWith` prefix test.
const typecheckConfigPath = join(ROOT, "tsconfig.json");
const typecheckConfig = JSON.parse(readFileSync(typecheckConfigPath, "utf8"));
const typechecked = new Set((typecheckConfig.references ?? []).map(({ path }) => path));

for (const { dir, manifest } of publicPackages) {
  const name = dir.split("/").filter(Boolean).at(-1);
  if (!typechecked.has(`packages/${name}`)) {
    fail(
      `${manifest.name}: tsconfig.json (the typecheck graph) has no reference to ` +
        `packages/${name}, so its test/bench sources are never covered by pnpm ` +
        `typecheck — vitest transforms tests without the compiler, so nothing else ` +
        `would notice either`,
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
  // `fs.symlinkSync` with no `type` defaults to a "file" symlink on win32,
  // which fails outright when the target is a directory (every dependency
  // here is one) unless the process holds `SeCreateSymbolicLinkPrivilege` —
  // granted only to admins or an account with Developer Mode enabled. A
  // "junction" needs neither: it is a directory-only reparse point Windows
  // resolves without elevation, so passing it explicitly on win32 is what
  // lets this gate run on an ordinary, non-elevated contributor machine.
  symlinkSync(source, destination, process.platform === "win32" ? "junction" : undefined);
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
// Check 3b — an entry point list is closed (ADR-QD-099).
//
// Every non-root key the packed `exports` map declares imports, and every
// other module the tarball ships under `lib/` is refused with
// `ERR_PACKAGE_PATH_NOT_EXPORTED`. "Out of the barrel" is therefore not
// importable, rather than importable through a `./*` wildcard nobody chose.
// Barreled modules are refused too: their names are reachable from the root,
// which is the one path to them. `check-api-surface.mjs` (gate 13) reads the manifest;
// this reads the artifact, which is what a consumer installs.
// ---------------------------------------------------------------------------

const libModules = (root, relative = "") =>
  readdirSync(join(root, relative), { withFileTypes: true }).flatMap((entry) => {
    const next = relative === "" ? entry.name : `${relative}/${entry.name}`;
    if (entry.isDirectory()) return libModules(root, next);
    return entry.name.endsWith(".js") ? [next.slice(0, -".js".length)] : [];
  });

const declaredSubpaths = [];
const refusedSpecifiers = [];

for (const { name, target } of installed) {
  const packed = JSON.parse(readFileSync(join(target, "package.json"), "utf8"));
  const declared = Object.keys(packed.exports ?? {}).filter((key) => key !== ".");
  for (const key of declared) {
    if (key.includes("*")) {
      fail(`${name}: exports declares the wildcard "${key}"; an entry point list is closed (ADR-QD-099)`);
    } else {
      declaredSubpaths.push(`${name}${key.slice(1)}`);
    }
  }
  const lib = join(target, "lib");
  if (!existsSync(lib)) continue;
  for (const module of libModules(lib)) {
    if (module === "index") continue;
    const specifier = `${name}/${module}`;
    if (!declaredSubpaths.includes(specifier)) refusedSpecifiers.push(specifier);
  }
}

writeFileSync(
  join(SANDBOX, "probe-subpaths.mjs"),
  `const declared = ${JSON.stringify(declaredSubpaths)};
const refused = ${JSON.stringify(refusedSpecifiers)};
const problems = [];
for (const specifier of declared) {
  try {
    const m = await import(specifier);
    if (Object.keys(m).length === 0) problems.push(specifier + " imported but provided no runtime exports");
  } catch (error) {
    problems.push(specifier + " is declared and failed to import: " + (error.code ?? error.message));
  }
}
for (const specifier of refused) {
  try {
    await import(specifier);
    problems.push(specifier + " imported; it is not a declared entry point");
  } catch (error) {
    if (error.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") {
      problems.push(specifier + " failed with " + (error.code ?? error.message) + ", wanted ERR_PACKAGE_PATH_NOT_EXPORTED");
    }
  }
}
console.log(JSON.stringify(problems));
`,
);

try {
  const output = execFileSync("node", ["probe-subpaths.mjs"], {
    cwd: SANDBOX,
    encoding: "utf8",
    stdio: "pipe",
  });
  for (const problem of JSON.parse(output.trim().split("\n").at(-1) ?? "[]")) fail(problem);
} catch (error) {
  fail(`probing the entry-point list failed:\n${error.stderr ?? error.message}`);
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
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServer from "effect/http/HttpServer";
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
  SignatureHistoryNone,
  StoredRecord,
  toPredicate,
} from "@qadi/core";
import { makeQadi } from "@qadi/promise";
import { qadiTestLayer } from "@qadi/testing";
import { QadiProvider } from "@qadi/react";
import {
  type DiagnosticsOptions,
  emptyTimeline,
  type GateInstanceLike,
  type GateRegistryLike,
  ingest,
  makeDiagnosticsFeed,
  makeGatesFeed,
  makeTimelineFeed,
  sourceFromRecords,
  verdictOf,
} from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
import { compileSql } from "@qadi/predicate-sql";
import { compilePrismaWhere } from "@qadi/predicate-prisma";
import { AuditDecisionSinkLive, AuditTrailPortTest } from "@qadi/audit";
import {
  PermissionRegistryLive,
  RequiredPermission,
  RequirePermission,
  guardApi,
  requiresPermission,
  subjectExtractorBearer,
} from "@qadi/http";

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
  SignatureHistoryNone,
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
const stored = new StoredRecord({
  environment: "Server",
  record: new DecisionRecord({
    evaluationId: decided.evaluationId,
    at: 0,
    subjectId: decided.subjectId,
    policy: hasPermission(read),
    outcome: new Decided({ decision: decided }),
  }),
});
const timeline = ingest(emptyTimeline(), stored);
const [only] = timeline.entries;
expect("devtools timeline", timeline.entries.length, 1);
expect("devtools verdict", only === undefined ? "missing" : verdictOf(only), "Allow");
expect("devtools dock", typeof DevtoolsDock, "function");

// The feeds are the headless interface (ADR-QD-099's closed map still reaches them from the root). A feed only
// forks its read, and \`Reading\` is also what a feed that read nothing says, so the entry is asserted too:
// the fiber is let run for fixed turns (no clock), the way the devtools suite's \`settleTurns\` does.
const fed = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const feed = yield* makeTimelineFeed({ source: sourceFromRecords([stored]) });
      for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
      return { status: feed.status.getSnapshot()._tag, entries: feed.timeline.getSnapshot().entries.length };
    }),
  ),
);
expect("devtools feed", fed.status, "Reading");
expect("devtools feed entries", fed.entries, 1);

// A feed built over a registry says what the registry holds, which is not what a feed over none says.
// \`makeGatesFeed\` reads synchronously, so no turn is needed; the registry is a structural literal because
// @qadi/react's real one needs a DOM. Closing the scope must release the one subscription it took.
const gate: GateInstanceLike = { id: "gate-1", kind: "Guard", policy: hasPermission(read), state: "Allowed" };
let registered: ReadonlyArray<GateInstanceLike> = [gate];
const gateListeners = new Set<() => void>();
const gateRegistry: GateRegistryLike = {
  instances: () => registered,
  subscribe: (listener) => {
    gateListeners.add(listener);
    return () => {
      gateListeners.delete(listener);
    };
  },
};
const gated = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const bare = yield* makeGatesFeed();
      const feed = yield* makeGatesFeed({ gates: gateRegistry });
      const read = feed.getSnapshot().registry;
      const watching = gateListeners.size;
      registered = [gate, { ...gate, id: "gate-2" }];
      for (const listener of gateListeners) listener();
      const changed = feed.getSnapshot().registry;
      return {
        initial: bare.getSnapshot().registry._tag,
        read: read._tag,
        count: read._tag === "Read" ? read.instances.length : -1,
        watching,
        changed: changed._tag === "Read" ? changed.instances.length : -1,
      };
    }),
  ),
);
expect("gates feed with no registry", gated.initial, "Unwatched");
expect("gates feed over one instance", gated.read, "Read");
expect("gates feed instance count", gated.count, 1);
expect("gates feed subscribes once", gated.watching, 1);
expect("gates feed follows its registry", gated.changed, 2);
expect("gates feed releases on close", gateListeners.size, 0);

// \`Live\` is set only by an accepted first sample, so a feed that read nothing stays \`Starting\`. A bounded
// yield loop, no clock; closing the scope interrupts the poll's wait for its next sample.
const diagnosed = await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* () {
      const off = yield* makeDiagnosticsFeed();
      const feed = yield* makeDiagnosticsFeed({});
      let turns = 0;
      while (feed.getSnapshot().status._tag !== "Live" && turns < 200) {
        yield* Effect.yieldNow;
        turns += 1;
      }
      const after = feed.getSnapshot();
      return { off: off.getSnapshot().status._tag, after: after.status._tag, hydration: after.reading.hydration !== undefined, turns };
    }),
  ),
);
expect("diagnostics feed handed no options", diagnosed.off, "Off");
expect("diagnostics feed reached Live in " + String(diagnosed.turns) + " turns", diagnosed.after, "Live");
expect("diagnostics feed first read sets hydration", diagnosed.hydration, true);

// DiagnosticsOptions has a cadence in milliseconds and no \`schedule\`.
const noSchedule: DiagnosticsOptions = {
  // @ts-expect-error a cadence is a number, not a Schedule
  schedule: "immediate",
};

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
const prismaWhere = await Effect.runPromise(compilePrismaWhere(predicate, { nullable: new Set(), floating: new Set() }));
expect("predicate-prisma where", JSON.stringify(prismaWhere), JSON.stringify({ AND: [] }));

// @qadi/audit's assembled pipeline: a real evaluation, recorded through
// AuditDecisionSinkLive into a deterministic in-memory AuditTrailPort.
const { layer: auditTrailLayer, written } = AuditTrailPortTest();
const auditDecision = await Effect.runPromise(
  evaluate(hasPermission(read)).pipe(
    Effect.provide(currentSubjectLayer(alice)),
    Effect.provide(services),
    Effect.provide(AuditDecisionSinkLive()),
    Effect.provide(auditTrailLayer),
  ),
);
expect("audit decision allow", auditDecision._tag, "Allow");
expect("audit trail wrote one entry", written().length, 1);

// @qadi/http: a real request/response round trip through HttpRouter.toWebHandler
// (standard Web Request/Response, no @effect/platform-node dependency needed) —
// the ninth and last public package, previously the only one this fixture never
// imported.
const HttpFixtureGroup = HttpApiGroup.make("documents").add(
  HttpApiEndpoint.get("read", "/documents").pipe((endpoint) =>
    endpoint.annotate(
      RequiredPermission,
      requiresPermission(endpoint, { permission: read, policy: hasPermission(read) }),
    ),
  ),
);
const HttpFixtureApi = HttpApi.make("consumer-fixture").add(HttpFixtureGroup).middleware(RequirePermission);
const HttpFixtureHandlers = HttpApiBuilder.group(HttpFixtureApi, "documents", (handlers) =>
  handlers.handle("read", () => Effect.void),
);
const HttpFixtureRoutes = HttpApiBuilder.layer(HttpFixtureApi).pipe(
  Layer.provide(HttpFixtureHandlers),
  Layer.provide(guardApi(HttpFixtureApi)),
);
const HttpFixtureLayer = HttpFixtureRoutes.pipe(
  Layer.provideMerge(PermissionRegistryLive),
  Layer.provideMerge(subjectExtractorBearer(() => Effect.succeed(alice))),
  Layer.provideMerge(services),
  Layer.provideMerge(HttpServer.layerServices),
);
const { handler } = HttpRouter.toWebHandler(HttpFixtureLayer);
const httpAllowed = await handler(new Request("http://localhost/documents", { headers: { authorization: "Bearer any" } }));
expect("http allowed request", httpAllowed.status, 204);
const httpDenied = await handler(new Request("http://localhost/documents"));
expect("http anonymous request denied", httpDenied.status, 403);

// The closed surface (ADR-QD-099, ARCH-36): the layers that enforced without
// registering are not importable from the published package.
const httpSurface = Object.keys(await import("@qadi/http"));
for (const removed of ["RequirePermissionLive", "registerApi", "guardRoute"]) {
  expect(\`\${removed} is not exported\`, httpSurface.includes(removed), false);
}

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

// The consumer's compile, run and probe guard read the sandbox only when the install had no failure.
const consumerReady = failures.length === 0;

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

// The probe guard checks that the fixture exercises every public name it must.
//
// A public name the consumer never compiles can ship broken. The feed set is read
// from the installed artifact, so a new feed is caught without editing this
// script, and TypeScript's parse decides what is a call, a type use or a refusal.
// It runs after the compile and the run, so a guard failure never hides theirs.
if (consumerReady) {
  let feeds;
  try {
    const output = execFileSync(
      "node",
      ["--input-type=module", "-e", 'console.log(JSON.stringify(Object.keys(await import("@qadi/devtools"))))'],
      { cwd: SANDBOX, encoding: "utf8", stdio: "pipe" },
    );
    feeds = JSON.parse(output.trim().split("\n").at(-1) ?? "[]").filter((key) => /^make\w*Feed$/.test(key));
    if (feeds.length === 0) {
      fail("the packed @qadi/devtools root exports no make*Feed; the probe guard would be vacuous");
    }
  } catch (error) {
    feeds = undefined;
    fail(`reading the packed @qadi/devtools exports failed:\n${error.stderr ?? error.message}`);
  }

  let seen;
  try {
    const { API } = await import("typescript/unstable/sync");
    const { isCallExpression, isIdentifier, isTypeReferenceNode, isVariableDeclaration } =
      await import("typescript/unstable/ast/is");
    const { getLeadingCommentRanges } = await import("typescript/unstable/ast/scanner");

    const walk = (file) => {
      const text = file.text;
      const called = new Set();
      const typed = new Set();
      const refused = new Set();

      // True when a node inside the declaration carries a `// @ts-expect-error` naming the member.
      const holdsDirective = (declaration, member) => {
        let found = false;
        const look = (node) => {
          for (const range of getLeadingCommentRanges(text, node.pos) ?? []) {
            const comment = text.slice(range.pos, range.end);
            if (comment.startsWith("// @ts-expect-error") && comment.includes(member)) found = true;
          }
          node.forEachChild((child) => {
            look(child);
          });
        };
        declaration.forEachChild((child) => {
          look(child);
        });
        return found;
      };

      const visit = (node, inRefusal) => {
        let inner = inRefusal;
        if (isCallExpression(node) && isIdentifier(node.expression)) called.add(node.expression.text);
        if (isTypeReferenceNode(node) && isIdentifier(node.typeName) && !inRefusal) {
          typed.add(node.typeName.text);
        }
        if (
          isVariableDeclaration(node) &&
          node.type !== undefined &&
          isTypeReferenceNode(node.type) &&
          isIdentifier(node.type.typeName)
        ) {
          const name = node.type.typeName.text;
          const member = REFUSED_SHAPE_PROBES.get(name);
          if (member !== undefined && holdsDirective(node, member)) {
            refused.add(name);
            inner = true;
          }
        }
        node.forEachChild((child) => {
          visit(child, inner);
        });
      };

      visit(file, false);
      return { called, typed, refused };
    };

    const api = new API({ cwd: SANDBOX });
    try {
      const file = api
        .updateSnapshot({ openProject: join(SANDBOX, "tsconfig.json") })
        .getProjects()[0]
        ?.program.getSourceFile(join(SANDBOX, "consumer.ts"));
      if (file === undefined) fail("the probe guard could not read consumer.ts from the sandbox project");
      else seen = walk(file);
    } finally {
      api.close();
    }
  } catch (error) {
    fail(`the probe guard could not load or run the TypeScript parser: ${error.message}`);
  }

  // No comparison runs against a parse that did not produce the fixture.
  if (seen !== undefined) {
    const unprobed = (feeds ?? []).filter((name) => !seen.called.has(name));
    if (unprobed.length > 0) {
      fail(
        `the consumer fixture never calls ${unprobed.join(", ")}: every make*Feed the packed @qadi/devtools root exports must be probed`,
      );
    }
    const untyped = TYPE_ONLY_PROBES.filter((name) => !seen.typed.has(name));
    if (untyped.length > 0) {
      fail(
        `the consumer fixture never uses ${untyped.join(", ")} as a type: every type-only probe name must be a type reference outside a refused literal`,
      );
    }
    const unrefused = [...REFUSED_SHAPE_PROBES.keys()].filter((name) => !seen.refused.has(name));
    if (unrefused.length > 0) {
      fail(
        `the consumer fixture never refuses a literal typed ${unrefused.join(", ")}: every refused-shape probe name must annotate a declaration holding a @ts-expect-error that names its refused member`,
      );
    }
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
