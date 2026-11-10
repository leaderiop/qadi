---
id: ARCH-42
title: Observation helpers in @qadi/testing — one isolated-metrics, one collecting-logger, one collecting-tracer; one way to set up each port, CustomPredicate included, from one fixture table in core
strength: Speculative   # from the 2026-10-07 architecture review (wave 4), "Speculative" list: "Observation helpers in @qadi/testing"
status: done
evidence_verified_at: e635e68
depends_on: []          # soft ordering, not a dependency: after ARCH-35 (rewrites audit/test/Metrics.test.ts) and ARCH-45 T13 (owns the stale metric comments outside test helpers); see §9
blocks: []
adrs_touched:
  - ADR-QD-094 (read, and amend one sentence under D-42-e = A: each port's fixture builder is listed in the registry's closed fixture table beside its description; the description itself gains no field)
  - ADR-QD-052 (read: the metric mechanism it describes is stale at effect 4.0.0; ARCH-45 I8 amends it, this plan only relies on the corrected fact)
  - ADR-QD-050 (constraint: a simulation is sealed; devtools' Fixtures mode keeps taking data only, never a layer)
  - ADR-QD-037 (constraint: madge scans `packages/*/src` and treats `@qadi/*` as external, so it cannot see a package cycle; this plan adds none)
  - ADR-QD-099 (constraint: closed entry points; new helpers are root exports of `@qadi/testing`)
  - ADR-QD-038 (constraint: changesets, fixed group; D-42-d = B is breaking for `@qadi/testing`, 0.x minor)
packages: ["@qadi/testing", "@qadi/core", "@qadi/devtools", "@qadi/audit", "@qadi/http", "@qadi/predicate-sql", "@qadi/predicate-prisma", "features (Bridge.ts)", "scripts (check-house-style.mjs)", "apps/website (docs)"]
estimate: M   # T1–T4 (helpers + migration + twin gate) ≈ 1 day; T5–T6 (fixture table + one way per port) ≈ 1 day. Minimal path (helpers only, D-42-d = A) ≈ ½ day (S)
---

# ARCH-42 — Observation helpers in @qadi/testing

## 1. Verified evidence (at `e635e68`)

`git log --oneline -1` → `e635e68`. Installed `effect` is **4.0.0** (stable since `ab38290`,
2026-10-02). Probes live in
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-42/`
and run with `cd packages/core && ../../node_modules/.bin/tsx <probe>.mts`:

- `metric-isolation-probe.mts` — touches a counter (plain and `withAttributes`) in the default
  registry, then reads and writes it in a fresh `Map` registry with **no** `CurrentMetricAttributes`.
- `offfiber-registry-probe.mts` — writes a hydration count off fiber (`updateUnsafe(…, Context.empty())`)
  and reads it under a host registry (shared with ARCH-45 I8).

**C1 `isolatedMetrics` is copied five times — CONFIRMED.**

| Copy | Lines | Name | Call sites |
| ---- | ----- | ---- | ---------- |
| `packages/core/test/helpers.ts` | `:96-113` (exported) | `isolatedMetrics` | core: `DecisionCache` 2, `DecisionSink` 6, `Evaluate` 7, `GuardHealthCheck` 1, `Ports` 13, `Predicate` 2 |
| `packages/audit/test/helpers.ts` | `:23-28` (exported) | `isolatedMetrics` | audit: `CircuitBreaker` 5, `Metrics` 16 |
| `packages/predicate-sql/test/Metrics.test.ts` | `:7-12` (local) | `isolatedMetrics` | 2 |
| `packages/predicate-prisma/test/Metrics.test.ts` | `:7-12` (local) | `isolatedMetrics` | 2 |
| `packages/devtools/test/model/Wiring.test.ts` | `:289-292` (local) | `isolated` | 11 occurrences |

`git grep -n "isolatedMetrics(" packages/*/test | cut -d: -f1 | sort | uniq -c` gives the counts.
Every copy is the same two lines: `provideService(Metric.MetricRegistry, new Map())` and
`provideService(Metric.CurrentMetricAttributes, { test: "isolated" })`.

**C2 "each with the same `CurrentMetricAttributes` gotcha" — CONFIRMED that each carries it; CHANGED:
the gotcha no longer exists.** `core/test/helpers.ts:96-108` explains the override: "`effect/Metric`'s
`hook` caches an untagged metric's resolved hooks on the metric object itself, for the process's
lifetime … the first test to touch a given metric would pin it to that test's registry". At effect
4.0.0, `Metric.js:174-193` memoises only the **key** on the metric object and looks the registry up on
every update ("The registry owns the series, so it is looked up on every update"). Probe output:

```
effect version: 4.0.0
default registry: 5 7
fresh registry before update (expect 0 0): 0 0
fresh registry after +1 (expect 1 1): 1 1
default registry unchanged (expect 5 7): 5 7
fresh snapshot attributes: [null,{"outcome":"x"}]
```

So `provideService(Metric.MetricRegistry, new Map())` alone isolates, and the override's only remaining
effect is to stamp `test: "isolated"` onto every series a test reads. Nothing asserts on that attribute
(`git grep -n '"isolated"' packages/*/test` → only the five definitions). The same stale mechanism is
stated in seven other files; ARCH-45 I8 owns those, this plan owns `core/test/helpers.ts:96-108`.

**C3 Off-fiber writes cannot be isolated by a registry — CONFIRMED (limits the helper).** `@qadi/react`
writes hydration counts with `updateUnsafe(…, Context.empty())` (`packages/react/src/HydrationCounts.ts:45`),
i.e. into the default registry whatever the fiber carries. `offfiber-registry-probe.mts`:
`host after off-fiber +3: {"count":0}`, `default registry after: {"count":3}`. Hydration tests
(`core/test/HydrationMetrics.test.ts`, `react/test/HydrationCounts.test.ts`,
`devtools/test/model/Hydration.test.ts`) must stay delta assertions; `isolatedMetrics` is not for them.

**C4 `collectingTracer` is duplicated — CONFIRMED, deliberately.** `packages/testing/src/CollectingTracer.ts:42-52`
and `packages/core/test/helpers.ts:81-92` are the same body. The core copy says why (`:72-79`):
"`@qadi/core` cannot depend on `@qadi/testing`, which depends on it". `spec/overview.md:740` records the
consolidation of the other four (CCR-QD-146).

**C5 New (not in the review): log capture is hand-rolled 27 times in 14 test files — CONFIRMED.**
`git grep -n "Logger.make(" packages/*/test features/step-definitions | wc -l` → 27;
`… | cut -d: -f1 | sort -u | wc -l` → 14. Two shapes: message only
(`http/test/AuthorizeRequest.test.ts:53-58`, `http/test/QadiHttpError.test.ts:65`) and message plus
`References.CurrentLogAnnotations` (`core/test/EncodeRefusalReport.test.ts:156-160`,
`audit/test/Metrics.test.ts:298-304`, `:456-462`, `devtools/test/model/Source.test.ts:594-600`; 16
`CurrentLogAnnotations` reads in tests). It is the third observation helper and the most duplicated.

**C6 `TestLayerOptions` has two ways to configure each port — CONFIRMED.**
`packages/testing/src/QadiReviewLayer.ts:39-112`: four data options (`attributes`, `relationships`,
`history`, `signatures`) and `ports?: PortOverrides`, where "an entry here wins over the matching data
option" (`:100-112`), implemented at `:131-147`. `packages/testing/test/TestLayers.test.ts:209`
("an explicit port wins over the matching data option") pins the precedence.
`features/step-definitions/Bridge.ts:60-88` uses both styles in one call: `history` as data and
`DecisionHistory` as a layer override, chosen by a flag (`:65-67`).

**C7 No CustomPredicate data option, so `Bridge.ts` writes one by hand — CONFIRMED (lines CHANGED).**
The review cites `:72-95`; at HEAD the hand-built fixture is `Bridge.ts:70-86`:
`ports.CustomPredicate = customPredicateFromRecord(Object.fromEntries(Object.entries(w.customPredicates).map(([name, answer]) => [name, () => Effect.succeed(answer)])))`.

**C8 Port fixtures could derive from port descriptions — CHECKED; the mapping exists twice, not once.**
`PortDescription` (`packages/core/src/PortDescription.ts:39-121`) has no fixture field. Each port module
exports its own fixture builder (`attributeResolverFromRecord`, `relationshipResolverFromEdges`,
`decisionHistoryFromEvents`, `signatureHistoryFromSignatures`, `customPredicateFromRecord`), and the
"data option → builder" map is written by hand in two places the review did not connect:
`QadiReviewLayer.ts:131-147` and `packages/devtools/src/model/SimulationSource.ts:123-145`
(`fixtureLayer`, which also declines a custom-predicate fixture: "no form vocabulary", `:131-137`).
Devtools may not depend on `@qadi/testing` (`SimulationSource.ts:111-117`: no test fixtures in a
production bundle), so a shared table can only live in core.

**C9 "Shrinks if #6 (ARCH-35) lands" — CONFIRMED.** `audit/test/Metrics.test.ts` holds 16 of the 56
`isolatedMetrics` call sites and 4 of the 27 `Logger.make`s. ARCH-35 replaces metric-and-log assertions
with an outcome table plus one projection test (its §7), so most of those sites disappear.

**C10 Can `@qadi/testing` depend on what it needs without cycles? — CHECKED.**
- `@qadi/testing`'s `src` imports `@qadi/core` and `effect/*` only
  (`npx madge --extensions ts,tsx --json packages/testing/src` → only intra-package edges). The three
  observation helpers import `effect/*` only, so they add no package edge.
- madge (`package.json:30`, `madge --circular … packages/*/src`) reports 58 skipped (external) imports:
  it does not follow `@qadi/*` at all, so it can neither see nor forbid a package-level cycle.
  `pnpm circular` → "No circular dependency found!".
- `@qadi/core`'s tests cannot import `@qadi/testing` without a cycle in the workspace graph:
  `@qadi/testing` depends on `@qadi/core` (`packages/testing/package.json` `dependencies`), and
  `packages/core/vitest.config.ts` has no `@qadi/*` alias. `tsconfig.base.json:49-59`'s `paths` would
  type-check it (one flat program, `tsconfig.test.json`), so only the declared dependency graph and the
  runtime resolver stand in the way. D-42-c decides.
- Packages that would take `@qadi/testing` as a devDependency: `audit`, `http`, `predicate-sql`,
  `predicate-prisma` (today only `devtools` has it, with an alias at `devtools/vitest.config.ts`).
  `audit/test/SignatureCapturePort.test.ts:33-38` declined the dependency "for one describe block"; this
  plan is the reason that was missing.

## 2. Goal and success criteria

Make **observation** a module with a small interface: three helpers in `@qadi/testing` that capture what
a test needs to see — metrics, log lines, spans — each written once, each correct for effect 4.0.0, and
reused by every package's tests instead of re-derived. Separately, give each port **one** way to be set
up in a test environment: a closed per-port table whose value is either fixture data or a layer, with
the data → layer map written once in core so `@qadi/testing` and `@qadi/devtools` share it. Leverage:
a new port is one fixture-table row and both consumers follow; locality: the metric-registry fact lives
in one helper and one smoke test.

Success criteria:
1. `git grep -n "Metric.CurrentMetricAttributes" packages/*/test` → nothing outside the core twin (D-42-c = A)
   and the v4 smoke test.
2. `git grep -n "const isolatedMetrics\|const isolated = " packages/*/test` → only the core twin.
3. `git grep -n "Logger.make(" packages/*/test features/step-definitions | wc -l` drops from 27 to the
   cases a helper cannot express (each with a one-line reason), target ≤ 5.
4. `packages/core/test/v4-api-smoke.test.ts` pins "a fresh `MetricRegistry` isolates a metric touched in
   another" (AGENTS.md §2: that file pins the v4 APIs we depend on).
5. Under D-42-c = A, `node scripts/check-house-style.mjs` fails when a core twin's body differs from
   `@qadi/testing`'s (shown red on a scratch edit).
6. Under D-42-d = B, `TestLayerOptions` has one per-port key, `ports`, whose value per port is
   `{ answers } | { layer }`; supplying both for one port is a type error (a `.tst.ts` test), and
   `Bridge.ts` contains no `customPredicateFromRecord`.
7. Under D-42-e = A, `git grep -n "attributeResolverFromRecord(" packages/testing/src packages/devtools/src` → nothing
   (both go through core's table).
8. `pnpm check` passes.

## 3. Non-goals

- **Metric isolation for off-fiber writes** (C3). They stay deltas; ARCH-45 I8 settles their registry.
- **Giving devtools' Fixtures mode a custom-predicate form.** D-42-f gives it a vocabulary; building the
  form is devtools UI work.
- **A `PortDescription.fixture` field** (D-42-e option C, rejected).
- **Moving `testLayer`/`subjectWith` out of core's helpers.** Their twins already avoid the hand copy by
  building on `portsLayer` (`helpers.ts:21-35`).
- **Rewriting `audit/test/Metrics.test.ts`** — ARCH-35 does; this plan only swaps its helper import if
  ARCH-35 has not landed.
- **Publishing.**

## 4. Constraints

- **AGENTS.md §1.** New helpers use `effect/*` namespace imports; consumers import them by name from
  `@qadi/testing`'s root. Never a cross-package relative import of `../../testing/src/…`.
- **§2/§3.** No new service. The fixture table is a value in `Ports.ts`, beside `portsLayer`.
- **§5/§5a/§6.** Helpers are plain functions returning layers/effects; no `as`/`any`/`!`; no `switch`.
  `PORT_DOUBLE_BUDGET` is test-scope: `{ layer: scriptedPort(…).layer }` entries keep using
  `scriptedPort`, so no file joins it.
- **§9 / ADR-QD-099.** New `@qadi/testing` modules are barreled (`export *`, alphabetical); gate 13
  (`check-api-surface.mjs`) wants overview rows for each new export, and for core's fixture table.
- **§10.** `packages/testing` is held at 90% coverage, core at 95%; the fixture table needs one test per
  row.
- **§16 / gate 14 (`check-package-install.mjs`).** New devDependencies use `workspace:^`; gate 14 checks
  no workspace protocol reaches a tarball (devDependencies are rewritten or dropped at pack).
- **ADR-QD-037 (madge).** No new `src` import edge except `@qadi/testing → @qadi/core`'s existing one and
  `devtools/SimulationSource.ts → @qadi/core`'s existing one.
- **ADR-QD-050.** `SimulationInput` stays data-only; devtools passes data into core's table, never a
  layer.
- **Gate 11 (`check-dod-table.mjs`).** A new house-style rule (D-42-c = A) lives inside the existing gate
  4 script; the DoD table's step list is unchanged.

## 5. Decisions needed before work starts

### D-42-a — Which observation helpers `@qadi/testing` exports
- **A. Three: `isolatedMetrics`, `collectingLogger`, and the existing `collectingTracer`.**
  `collectingLogger()` returns `{ lines: ReadonlyArray<CapturedLog>, layer: Layer.Layer<never> }` with
  `CapturedLog = { message: unknown; level: string; annotations: Readonly<Record<string, unknown>> }`
  (both C5 shapes are projections of it).
- **B. `isolatedMetrics` only** (the review's scope).
- **Recommendation: A.** C5 is the most duplicated of the three and the review missed it.
- `status: decided (2026-10-08, recommended default)`

### D-42-b — What `isolatedMetrics` does at effect 4.0.0
- **A. Registry only:** `effect.pipe(Effect.provideService(Metric.MetricRegistry, new Map()))`, with the
  v4 smoke test (T1) pinning the fact it relies on, and a doc comment that it does not isolate off-fiber
  writes (C3).
- **B. Keep the `CurrentMetricAttributes` override** "in case". It stamps an attribute on every series
  for a mechanism that no longer exists, and keeps the stale explanation alive.
- **Recommendation: A.**
- `status: decided (2026-10-08, recommended default)`

### D-42-c — How `@qadi/core`'s own tests get the helpers
- **A. Keep core's twins, gated.** `packages/core/test/helpers.ts` keeps `collectingTracer`,
  `isolatedMetrics` and gains `collectingLogger`; a new `check-house-style.mjs` rule
  (`test-helper-twin`) compares each twin's normalized body with `@qadi/testing`'s and fails on drift.
- **B. Declare `@qadi/testing` as a core devDependency and alias it in `core/vitest.config.ts`.** A cycle
  in the workspace graph (core → testing → core): pnpm warns on every install, `pnpm -r` ordering
  becomes ambiguous, and the "core depends on nothing of ours" property every doc relies on goes away.
- **C. Alias only, undeclared.** Works at runtime and type-check time; an undeclared dependency that a
  future `pnpm` strictness setting or tool would flag.
- **Recommendation: A.** The twins are three short bodies, and the gate turns "a divergence would show up
  as a span this file's own tests stopped seeing" (`helpers.ts:78-79`) into a check.
- **Gate change:** a new rule in gate 4 (`check-house-style.mjs`). Flag for the user.
- `status: decided (2026-10-08, recommended default)`

### D-42-d — The shape of `TestLayerOptions`'s port setup
- **A. Add a fifth data option, `customPredicates`** (minimal). Keeps two ways per port and the
  precedence rule.
- **B. One way: `ports?: { readonly [K in PortName]?: PortSetup<K> }`** with
  `PortSetup<K> = { readonly answers: PortFixtureData[K] } | { readonly layer: Layer.Layer<ServiceOf<PortTypes[K]>> }`
  (a closed, tagged-by-key union: no runtime `Layer.isLayer` guessing). The four top-level data options
  are removed, so precedence is gone by construction; `idPrefix` and `clock` stay.
- **C. B, but keep the old data options as deprecated aliases.** Two ways again, for a package with 5
  call-site files outside its own tests (`git grep -n "qadiTestLayer(\|qadiReviewLayer("`: website 3,
  Bridge 7, devtools Wiring 4, testing README 2).
- **Recommendation: B.**
- **Needs user sign-off:** yes — breaking for `@qadi/testing` (0.x minor); migration is mechanical
  (`attributes: x` → `ports: { AttributeResolver: { answers: x } }`).
- `status: decided (2026-10-08, recommended default)`

### D-42-e — Where the data → layer fixture map lives
- **A. In core, as a closed table beside `portsLayer`.** `Ports.ts` gains
  `PortFixtureData = { readonly [K in PortName]: … }` (attribute record, edge list, event list, signature
  list, custom answers), `PORT_FIXTURES: { readonly [K in PortName]: (data: PortFixtureData[K]) => Layer.Layer<ServiceOf<PortTypes[K]>> }`
  (a missing port is TS2741), and `fixturePortsLayer(data: Partial<PortFixtureData>, overrides?: PortOverrides)`.
  `@qadi/testing` and `@qadi/devtools`' `fixtureLayer` both call it. ADR-QD-094 gains one sentence.
- **B. In `@qadi/testing` only.** Devtools keeps its own copy (C8), and a new port needs two edits that
  nothing connects.
- **C. A `fixture` field on `PortDescription`.** Puts a test-data shape into every production
  description, adds an eighth type parameter, and breaks every `PortDescription` literal.
- **Recommendation: A.**
- `status: decided (2026-10-08, recommended default)`

### D-42-f — What a CustomPredicate fixture is
- **A. Answers only: `Readonly<Record<string, boolean>>`**, built with `customPredicateFromRecord` mapping
  each to `() => Effect.succeed(answer)`. Behaviour (reading the subject or resource) is a layer:
  `{ layer: customPredicateFromRecord({...}) }`.
- **B. `boolean | CustomPredicateFn`.** A function is not data; it would make `PortFixtureData`
  non-serializable and unusable by devtools' sealed input.
- **Recommendation: A.**
- `status: decided (2026-10-08, recommended default)`

## 6. Tasks

### T0 — Re-baseline
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch-42/observation-helpers main`.
  2. Re-run both probes (§1 command); outputs must match.
  3. Re-run the counts in C1, C5, C6 (`git grep` commands in §1). If ARCH-35 has landed, re-count
     `audit/test/Metrics.test.ts`'s sites and drop those from T3's list.
  4. Check whether ARCH-45 T13 has landed (`git log --oneline main -- packages/react/src/HydrationCounts.ts`)
     so T1's comment wording matches.
- **Tests:** none
- **Verify:** probe outputs; counts
- **Done when:** §1 re-observed or corrected.

### T1 — Pin the v4 metric fact the helper relies on
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/core/test/v4-api-smoke.test.ts`
- **Steps:**
  1. Add `it.effect("a fresh MetricRegistry isolates a metric already touched in another")`: declare a
     counter, update it in the ambient registry, then under `provideService(Metric.MetricRegistry, new Map())`
     read 0, update 1, read 1; read the ambient one unchanged. Same for a `Metric.withAttributes` view.
  2. Add `it.effect("an off-fiber write with an empty context lands in the default registry")` (C3), so
     the helper's documented limit is pinned too.
- **Tests:** 2 (green today; they are the evidence)
- **Verify:** `pnpm vitest run packages/core/test/v4-api-smoke.test.ts`
- **Done when:** green; a future effect that changes either fact fails here first.

### T2 — The three helpers in `@qadi/testing`
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1; D-42-a; D-42-b
- **Files:** `packages/testing/src/IsolatedMetrics.ts` (*new*); `packages/testing/src/CollectingLogger.ts`
  (*new*); `packages/testing/src/CollectingTracer.ts` (doc only); `packages/testing/src/index.ts`;
  `packages/testing/test/Observation.test.ts` (*new*)
- **Steps (A/A):**
  1. `isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.provideService(effect, Metric.MetricRegistry, new Map())`.
     Doc: what it isolates (on-fiber updates and reads), what it cannot (C3), and that it needs no
     `CurrentMetricAttributes` at effect 4.0.0 (cite the smoke test).
  2. `collectingLogger(): { readonly lines: ReadonlyArray<CapturedLog>; readonly layer: Layer.Layer<never> }`
     — `Logger.layer([Logger.make((o) => lines.push({ message: o.message, level: o.logLevel, annotations: o.fiber.getRef(References.CurrentLogAnnotations) }))])`.
     (`Logger.Options` at effect 4.0.0 is `{ message, logLevel, cause, fiber, date }`, `Logger.d.ts:79-85`.)
     It replaces the ambient loggers rather than adding to them; say so, as `CollectingTracer.ts:14-22` does.
  3. Barrel both, alphabetically.
  4. Tests: each helper in isolation — a metric updated inside `isolatedMetrics` is 0 outside it; a log
     line with an annotation is captured with it; a span is captured (existing `CollectingTracer.test.ts`
     stays).
- **Tests:** ~5
- **Verify:** `pnpm vitest run packages/testing`; `pnpm tsc -b packages/testing`; `node scripts/check-api-surface.mjs` (after T7's rows)
- **Done when:** green.

### T3 — Migrate every package's tests to the helpers
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2
- **Files:** `packages/{audit,http,predicate-sql,predicate-prisma}/package.json` (devDependency
  `"@qadi/testing": "workspace:^"`); `packages/{audit,http,predicate-sql,predicate-prisma}/vitest.config.ts`
  (alias `@qadi/testing` → `../testing/src/index.ts`, as `devtools/vitest.config.ts` does);
  `packages/audit/test/helpers.ts`; `packages/predicate-sql/test/Metrics.test.ts`;
  `packages/predicate-prisma/test/Metrics.test.ts`; `packages/devtools/test/model/Wiring.test.ts`; the 14
  `Logger.make` files (C5); `pnpm-lock.yaml`
- **Steps:**
  1. Add the devDependency and alias per package; `pnpm install` (lockfile only).
  2. Replace each local `isolatedMetrics`/`isolated` with the import. Delete the local definitions and
     `audit/test/helpers.ts:23-28`.
  3. Replace each `Logger.make` capture whose shape is message or message+annotations with
     `collectingLogger()`; a site that needs something else (e.g. a delegating logger) keeps its own with
     a one-line reason.
  4. Delete `audit/test/SignatureCapturePort.test.ts:33-38`'s "rather than adding `@qadi/testing`"
     reasoning if that file now uses it; otherwise leave it.
  5. Every migrated test passes unchanged in its assertions.
- **Tests:** none new; ~70 call sites move
- **Verify:** `pnpm vitest run packages/audit packages/http packages/predicate-sql packages/predicate-prisma packages/devtools/test/model/Wiring.test.ts`;
  `node scripts/check-package-install.mjs` (no `workspace:` in a tarball); `pnpm circular`
- **Done when:** success criteria 2 and 3 hold.

### T4 — Core's twins, gated (D-42-c = A)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2; D-42-c
- **Files:** `packages/core/test/helpers.ts` (`:72-113`); `scripts/check-house-style.mjs`;
  the core tests that hand-roll a logger (C5's core files)
- **Steps:**
  1. Red first: add rule `test-helper-twin` to `check-house-style.mjs`. For each name in a fixed list
     (`collectingTracer`, `isolatedMetrics`, `collectingLogger`), extract the exported arrow's body from
     `packages/core/test/helpers.ts` and from `packages/testing/src/*.ts`, normalize whitespace and
     comments, and require equality. Run: it fails (core's `isolatedMetrics` still sets the attribute;
     `collectingLogger` is missing).
  2. Update core's twins to the T2 bodies; rewrite `helpers.ts:96-108` (the stale mechanism) to the
     effect 4.0.0 fact and point at T1's smoke test.
  3. Migrate core's own `Logger.make` sites to the twin.
  4. Edit a twin body in a scratch copy to see the rule fail; revert.
- **Tests:** the rule; core suite unchanged
- **Verify:** `node scripts/check-house-style.mjs`; `pnpm vitest run packages/core`
- **Done when:** the rule passes and criterion 1 holds.

### T5 — One fixture table in core (D-42-e = A)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0; D-42-e; D-42-f
- **Files:** `packages/core/src/Ports.ts`; `packages/core/test/Ports.test.ts`;
  `packages/devtools/src/model/SimulationSource.ts` (`:111-145`)
- **Steps:**
  1. Red first: in `Ports.test.ts`, `it.effect("every port has a fixture, and each answers from its data")`
     iterating `PORTS`: build `fixturePortsLayer({ [port]: sample })` and ask the port the sample's
     question; it does not compile yet.
  2. Add `PortFixtureData` (mapped over `PortName`: `AttributeResolver: Readonly<Record<string, unknown>>`,
     `RelationshipResolver: ReadonlyArray<RelationshipEdgeInput>`, `DecisionHistory: ReadonlyArray<ActedEventInput>`,
     `SignatureHistory: ReadonlyArray<SignatureInput>`, `CustomPredicate: Readonly<Record<string, boolean>>`),
     `PORT_FIXTURES` (each row the existing builder; `CustomPredicate` maps answers to
     `() => Effect.succeed(answer)` through `customPredicateFromRecord`), and
     `fixturePortsLayer(data, overrides?)` = `portsLayer({ ...fixture layers for present keys, ...overrides })`.
     The table is typed against `PortName`, so a sixth port without a row is TS2741.
  3. Devtools `fixtureLayer` becomes `fixturePortsLayer({ AttributeResolver: input.attributes, … })` with
     absent keys omitted; `CustomPredicate` stays absent (no form), and its comment says the table now has
     a vocabulary for it.
  4. Test green; devtools simulation tests unchanged.
- **Tests:** 1 table test (5 rows); devtools `Simulation*.test.ts` unchanged
- **Verify:** `pnpm vitest run packages/core/test/Ports.test.ts packages/devtools/test/model`; `pnpm tsc -b packages/core packages/devtools`; `pnpm circular`
- **Done when:** green; `git grep -n "attributeResolverFromRecord(" packages/devtools/src` → nothing.

### T6 — One way to set up each port in `@qadi/testing` (D-42-d = B)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5; D-42-d
- **Files:** `packages/testing/src/QadiReviewLayer.ts` (`:39-147`); `packages/testing/test/TestLayers.test.ts`;
  `packages/testing/test/TestLayerOptions.tst.ts` (*new*); `features/step-definitions/Bridge.ts`
  (`:60-88`, `:158`, `:196`, `:225`); `packages/devtools/test/model/Wiring.test.ts`;
  `packages/testing/README.md`; `apps/website/src/content/docs/docs/packages/testing.md`
- **Steps (B):**
  1. Red first: `TestLayerOptions.tst.ts` — `{ ports: { CustomPredicate: { answers: { isOwner: true } } } }`
     is accepted; `{ ports: { AttributeResolver: { answers: {}, layer: x } } }` is rejected; the old
     `{ attributes: {...} }` is rejected. Fails to compile today in the opposite direction.
  2. `TestLayerOptions`: remove `attributes`/`relationships`/`history`/`signatures`; `ports?: { readonly [K in PortName]?: PortSetup<K> }`;
     `PortSetup<K>` as D-42-d. `qadiReviewLayer` maps each entry: `answers` → `PORT_FIXTURES[K](answers)`,
     `layer` → itself; then `portsLayer`. Delete `fixture` (`:150-153`) and the precedence prose.
  3. `TestLayers.test.ts`: rewrite the 33 calls mechanically; delete "an explicit port wins over the
     matching data option" (`:209`) — replaced by the type test (replace, don't layer). Add one runtime test
     for `CustomPredicate: { answers }`.
  4. `Bridge.ts`: `ports: { AttributeResolver: { answers: w.resolvedAttributes }, …, DecisionHistory: w.historyUnreachable ? { layer: unreachableHistory } : w.events && { answers: w.events }, CustomPredicate: w.customPredicates && { answers: w.customPredicates } }`
     (omit undefined keys); remove the `customPredicateFromRecord` import.
  5. Docs: README and website `testing.md` (compiled fences, gate 23).
- **Tests:** 1 type test (red first), ~33 rewritten, 1 new runtime case; BDD suite unchanged in outcome
- **Verify:** `pnpm vitest run packages/testing packages/devtools/test/model/Wiring.test.ts`; `pnpm test:tstyche`;
  `pnpm test:bdd`; `node scripts/check-website-doc-examples.mjs`; `node scripts/check-house-style.mjs`
- **Done when:** criterion 6 holds and the BDD suite is green.

### T7 — Spec, overview, changesets
- **Status:** [x] done (2026-10-08)
- **Depends on:** T2–T6 as landed
- **Files:** `spec/overview.md` (`@qadi/testing` table `:735-740`; core ports table); `spec/decisions/094-*.md`
  (one sentence under D-42-e = A); `spec/README.md` (CCR row); `spec/traceability.md` (new test rows);
  `.changeset/*.md` (*new*)
- **Steps:**
  1. Overview rows: `isolatedMetrics`, `collectingLogger`, `CapturedLog` (`@qadi/testing`); `PortSetup`
     and the reshaped `TestLayerOptions` row (drop "wins over the matching data option"); core
     `PortFixtureData`, `PORT_FIXTURES`, `fixturePortsLayer`. Correct `:740`'s `collectingTracer` row
     ("five test files" → the current consumers, and the core twin gated by `test-helper-twin`).
  2. ADR-QD-094: "Each port's fixture builder is listed in `PORT_FIXTURES`, closed over `PortName`."
  3. Changesets: `@qadi/testing: minor` (**Breaking** under D-42-d = B, with the migration line);
     `@qadi/core: minor` (new exports); `@qadi/devtools: patch` (internal).
  4. CCR-QD-NEXT row.
- **Tests:** none
- **Verify:** `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict`;
  `node scripts/check-dod-table.mjs`
- **Done when:** all pass.

### T8 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T7
- **Files:** none
- **Steps:**
  1. Confirm no sibling agent runs mutation or coverage.
  2. `pnpm check`. Coverage for `packages/testing` (90%) must include both new modules; a Stryker
     survivor in `PORT_FIXTURES` or `qadiReviewLayer`'s mapping gets a killing test.
- **Tests:** whole suite
- **Verify:** `pnpm check`
- **Done when:** exit 0.

### T9 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T8
- **Files:** this plan; hand the README row to the orchestrator
- **Steps:**
  1. Tick tasks; record D-42-x outcomes; `[-] dropped` with a reason for any task a decision removes
     (e.g. T4 under D-42-c = B, T5/T6 under D-42-d = A).
  2. Hand over `ARCH-42 | observation helpers in @qadi/testing | Speculative | <status> | <done>/10 | <open> | M`.
- **Tests:** none
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-42-*.md | sort | uniq -c`
- **Done when:** frontmatter, tasks and §10 agree.

## 7. Test strategy

- **Unchanged assertions.** T3/T4 move helpers; every migrated test keeps its assertions. That is the
  proof the helpers are equivalent.
- **Replace, don't layer.** The precedence test (`TestLayers.test.ts:209`) is replaced by a type test,
  because under D-42-d = B precedence cannot occur. The five local `isolatedMetrics` copies are deleted,
  not wrapped.
- **Pins.** T1's two smoke tests pin the effect facts the helper relies on; T4's `test-helper-twin` rule
  pins the core twins.
- **Table totality.** `PORT_FIXTURES`'s test iterates `PORTS`, so a port added without a fixture row fails
  at compile time and a row that answers wrong fails at run time.
- **Mutation.** Core (`stryker.config.mjs`) covers `Ports.ts`'s table; `@qadi/testing` has no Stryker
  config (`ls stryker*.mjs`: audit, config, devtools, http, predicate-prisma, predicate-sql, react), so
  coverage alone holds it at 90%.

## 8. Spec and documentation updates

| Normative | Docs | Gates |
| --------- | ---- | ----- |
| ADR-QD-094 one sentence (D-42-e = A) | overview rows (`@qadi/testing`, core ports), testing README, website `packages/testing.md` | 13 (`check-api-surface.mjs`), 23 (`check-website-doc-examples.mjs`), 10 (`verify-traceability.sh`), 4 (`check-house-style.mjs`, new rule) |

No behavior doc covers `@qadi/testing` (`ls spec/behaviors` has none); the overview rows and the README
are its specification. CCR number at merge; CHANGELOG from changesets; no release step.

## 9. Risks and rollback

- **D-42-d = B breaks `@qadi/testing` callers.** In-repo callers are migrated in T6; external callers get
  the changeset's migration line. Rollback: restore the four data options as aliases (that is option C).
- **A future effect brings back first-touch memoisation.** T1's smoke test fails first, and
  `isolatedMetrics` regains the attribute override in one place (two with the twin, which the twin rule
  keeps in step).
- **New devDependencies on `@qadi/testing`.** Four packages gain a test-only edge to a package that
  depends only on core: no cycle. Gate 14 confirms nothing leaks into a tarball.
- **The twin rule is brittle to formatting.** It normalizes whitespace and comments; if that proves
  noisy, compare an AST hash instead.
- **Cross-plan coupling.**
  - **ARCH-35** rewrites `audit/test/Metrics.test.ts` (16 metric sites, 4 loggers). Land ARCH-35 first;
    if not, T3 swaps only the imports there and ARCH-35 rebases.
  - **ARCH-45 I8** corrects the stale metric mechanism in src, spec and three hydration tests; this plan
    corrects `core/test/helpers.ts` only. Either order works; T1's smoke test is the shared evidence.
  - **ARCH-31** (remote port codec from port descriptions) adds per-port rows too; if it lands first,
    `PORT_FIXTURES` follows its registry pattern; no file conflict expected beyond `Ports.ts`.
  - **ARCH-34/ARCH-24** (devtools dock) do not touch `SimulationSource.ts`'s fixture path.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` (probes `scratchpad/wave4/ARCH-42/metric-isolation-probe.mts`, `offfiber-registry-probe.mts`) | planner |
| 2026-10-08 | T0 | worktree branch used instead of `arch-42/...`; `pnpm install --offline` for node_modules; probes not re-run (the smoke tests T1 re-prove both facts); counts re-checked by grep: 27 `Logger.make` sites in 14 files, as planned | impl agent |
| 2026-10-08 | T1 | 2 tests added to `v4-api-smoke.test.ts` (green by design): "a fresh MetricRegistry isolates a metric already touched in another", "an off-fiber write with an empty context lands in the default registry" | impl agent |
| 2026-10-08 | T2 | `isolatedMetrics` (registry only, D-42-b = A), `collectingLogger`/`CapturedLog` in `@qadi/testing`; `Observation.test.ts` (4 tests) | impl agent |
| 2026-10-08 | T3 | `@qadi/testing` devDependency + vitest alias in audit, http, predicate-sql, predicate-prisma; 4 local `isolatedMetrics`/`isolated` copies deleted; 17 non-core `Logger.make` sites migrated to `collectingLogger` (audit `driveExit` projects `lines` to its `ObservedLog`); 1 line comment in `SignatureCapturePort.test.ts` reworded, file not migrated | impl agent |
| 2026-10-08 | T4 | red first: `test-helper-twin` rule failed on `collectingLogger` (missing) and `isolatedMetrics` (differs); core twins updated, stale mechanism comment rewritten, 8 core sites migrated; scratch edit to `collectingTracer` showed the rule fail, reverted. `Logger.make(` now appears once outside `@qadi/testing`: the core twin | impl agent |
| 2026-10-08 | T5 | red first: `Ports.test.ts` "fixturePortsLayer" block failed (no export); `PortFixtureData`, `PortFixtures`, `PORT_FIXTURES`, `fixturePortsLayer` added; devtools `fixtureLayer` goes through it | impl agent |
| 2026-10-08 | T6 | red first: `TestLayerOptions.tst.ts` failed 3 tests (removed options still accepted); `TestLayerOptions.ports` is `PortSetups` of `PortSetup<K>` (`answers`/`layer` with `never` exclusion); `TestLayers.test.ts` rewritten, precedence test replaced by a coexistence test, `CustomPredicate` answers test added; `Bridge.ts` has no `customPredicateFromRecord`; BDD 539/539 | impl agent |
| 2026-10-08 | T7 | ADR-QD-094 Rev 1.2 amendment, overview rows (testing + core), traceability rows, CCR-QD-270 (plan said NEXT; 208 was free in the worktree, +50 per brief and the brief's >= 270 floor), README and website docs, two changesets (`@qadi/testing` minor **breaking**; `@qadi/core` minor + `@qadi/devtools` patch) | impl agent |
| 2026-10-08 | T9 | tracker updated; T8 left open (see Status) | impl agent |
