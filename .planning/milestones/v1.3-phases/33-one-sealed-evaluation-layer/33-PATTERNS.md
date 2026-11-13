# Phase 33: One sealed evaluation layer - Pattern Map

**Mapped:** 2026-11-12
**Files analyzed:** 22 (1 new src, 3 new tests, 1 baseline JSON, ~17 modified)
**Analogs found:** all with a tracked analog; two spots need verification at plan time (see "Not verified").

All paths below were checked as tracked (`git ls-files`) where they are src/test; `packages/devtools/coverage/**` hits in greps are untracked build output, ignore them.

## File Classification

| File | Role | Data flow | Closest analog | Match |
|------|------|-----------|----------------|-------|
| `packages/core/src/EvaluationEnvironment.ts` (new) | service-layer builder | layer composition | `packages/core/src/EvaluationServicesNone.ts`; `Ports.ts` `portsLayer` (l.227) / `fixturePortsLayer` (l.305); `testing/src/QadiReviewLayer.ts` `qadiReviewLayer` body | role-match |
| exhaustive dispatch on `EvaluationShadowing` | utility | transform | `packages/audit/src/CircuitBreaker.ts:247` (`Match.value(state).pipe(...)`); AGENTS.md §5a `compare` | role-match |
| `packages/core/src/index.ts` | barrel | n/a | its own lines 18-21 (`export * from "./EvaluationId.ts"` ... alphabetical) | exact |
| `packages/testing/src/QadiReviewLayer.ts` | layer | layer composition | itself (l.145-165) | exact |
| `packages/testing/src/QadiTestLayer.ts` | layer | composition | itself | no change needed (see below) |
| `packages/devtools/src/model/Simulation.ts` | layer | layer composition | itself (l.85-112) | exact |
| `packages/devtools/src/model/SimulationSession.ts`, `react/Simulator.tsx` | model / component | n/a | themselves | rename only |
| `packages/devtools/src/index.ts:90` | named barrel | n/a | its neighbours (l.89-91) | exact |
| `packages/core/test/helpers.ts` | test helper | layer composition | itself (l.35-51) | exact |
| devtools conformance test (new) `packages/devtools/test/model/ReviewSimulationConformance.test.ts` (name suggested) | test | request-response | `packages/devtools/test/model/Simulation.test.ts`, `Wiring.test.ts` (imports `@qadi/testing`) | role-match |
| testing review-layer tests (new, in `packages/testing/test/`) | test | event-driven (sink) | `packages/core/test/DecisionSink.test.ts:451-466`, `DecisionSinkForwarding.test.ts:391`, `TestLayers.test.ts:289` | role-match |
| mutation base JSON + pins | planning artifact | n/a | `.planning/phases/32-evaluation-options-and-services-stated-once/32-mutation-base.json`, `32-01-PLAN.md` | exact |

## Pattern Assignments

### `packages/core/src/EvaluationEnvironment.ts` (service-layer builder)

**Home rules:** layers live beside their service as top-level consts (AGENTS.md §3); submodule imports, `.ts` relative imports, `import type` for types.

**What is being factored (copy these three bodies into one):**

`QadiReviewLayer.ts:145-152`:
```ts
export const qadiReviewLayer = (options?: TestLayerOptions): Layer.Layer<StandingEvaluationServices> =>
  Layer.mergeAll(
    fixturePortsLayer(options?.ports),
    evaluationIdSequential(options?.idPrefix ?? "eval"),
    clockLayer(options?.clock),
  );
```
`Simulation.ts:85-105` (the shadowing block to move, comments included):
```ts
    // A no-op sink rather than no sink: ... Effect.provide cannot remove a service
    Layer.succeed(DecisionSink, { record: () => Effect.void }),
    // A private cache rather than none ...
    decisionCacheLayer(),
```
`core/test/helpers.ts:39,51`: `Layer.mergeAll(currentSubjectLayer(subject), portsLayer(overrides), evaluationIdSequential())` and `Layer.merge(portsLayer(overrides), evaluationIdSequential())`.

**Output type / imports:** `EvaluationServicesNone.ts` ends with `import * as Layer from "effect/Layer"; import { EvaluationIdLive } from "./EvaluationId.ts"; import type { StandingEvaluationServices } from "./EvaluationServices.ts";` and is annotated `Layer.Layer<StandingEvaluationServices>`. Use the same return type. `EvaluationPorts` (ports parameter type) is from Phase 32's `EvaluationServices.ts`; devtools already re-exports `EvaluationPorts`/`EvaluationPortsLayer` types (`devtools/src/index.ts` ~l.95), so confirm the exact name in core before writing (not verified here).

**Shadow dispatch (D-06):** build once per layer build, with `Match.value` (acceptable per §5a: not on the per-node path). Real house sites: `CircuitBreaker.ts:247-253` uses `Match.value(state).pipe(Match.tagsExhaustive({...}))`. For a plain literal union use the §5a form:
```ts
Match.value(op).pipe(
  Match.when("Eq", () => "="),
  Match.when("Lt", () => "<"),
  Match.exhaustive,
)
```
Apply: `Match.when("none", () => Layer.empty)`, `Match.when("sinkAndCache", () => Layer.mergeAll(Layer.succeed(DecisionSink, { record: () => Effect.void }), decisionCacheLayer()))`, `Match.exhaustive`. `decisionCacheLayer` is a function so each call is a fresh cache (DecisionCache.ts:120-153): "built fresh on every layer build" holds only if the Layer.mergeAll is constructed inside the builder call, not at module scope.

**Clock parameter type, verified.** `node_modules/effect/dist/Layer.d.ts:46`: `interface Layer<in ROut, out E = never, out RIn = never>`; `dist/testing/TestClock.d.ts:258`: `layer: (options?) => Layer.Layer<TestClock>`. `in ROut` is contravariant, so `Layer<TestClock>` is assignable to `Layer<never>`? No. Contravariance means `Layer<A>` is assignable to `Layer<B>` when `B` is assignable to `A`. `never` is assignable to everything, so `Layer<TestClock>` and `Layer<Clock>` ARE assignable to `Layer<never>`, and `Layer.empty` (`Layer<never>`) trivially is. So a parameter typed `Layer.Layer<never>` accepts both with no `effect/testing` import and no cast. The caller's claim is confirmed. Cost: the built context then types as providing nothing from the clock, which is correct because `Clock` is a default service (the existing "deliberately unannotated" comment, QadiReviewLayer.ts:154-163, is exactly the argument to carry over). Alternative `<C>` generic keeping `Layer.Layer<C>` output: only matters if a caller reads `TestClock` from the built layer's type; existing sites read the clock via `Context.get(ctx, Clock.Clock)` (TestLayers.test.ts:180-185, Simulation.test.ts:249-265), which needs no widened type. Stay with `Layer.Layer<never>`.

**Type exports:** `export type EvaluationClock = "live" | "deterministic"` and `export type EvaluationShadowing = "none" | "sinkAndCache"`. Doc comment shape: one-line summary, then why/ADR in following paragraphs (AGENTS.md preamble). The builder never imports `effect/testing`.

### `packages/testing/src/QadiReviewLayer.ts` (modify)

- Imports: add `evaluationEnvironment`, `type EvaluationClock` to the `@qadi/core` import (l.7-15); drop `evaluationIdSequential`; keep `import * as TestClock from "effect/testing/TestClock"` (l.17).
- `TestLayerOptions.clock` (l.105): `readonly clock?: EvaluationClock;` and rewrite the doc: `test` becomes `deterministic` in l.54, l.68-70 (`clock: "test"` text), l.89 reference, keep the whole "Corrected" paragraph substance (l.75-103).
- Body: `evaluationEnvironment({ ports: fixturePortsLayer(options?.ports), idPrefix: options?.idPrefix ?? "eval", clock: clockLayer(options?.clock ?? "live"), shadow: "none" })`.
- Replace `clockLayer` (l.154-165) with the one-line map keeping its "no single annotation covers both" and "live provides no clock at all" comment: `clock === "deterministic" ? TestClock.layer() : Layer.empty`. Because the new param is `Layer.Layer<never>` the "deliberately unannotated" rationale changes; reword.
- Doc comment of `qadiReviewLayer` states it does NOT shadow sink/cache (new INV, D-08).
- `QadiTestLayer.ts:17` is `Layer.mergeAll(currentSubjectLayer(subject), qadiReviewLayer(options))`: it needs no edit (it passes `TestLayerOptions` through); its doc may mention the literal, check with grep.

### `packages/devtools/src/model/Simulation.ts` (modify)

- Delete `SimulationClock` (l.37-49; move the "neither changes the trace / 02-screens gap" paragraph to `EvaluationClock` doc in core or to the map). `SimulationOptions.clock?: EvaluationClock` (l.53), import `type EvaluationClock` from `@qadi/core`.
- `simulationLayer` becomes `Layer.mergeAll(currentSubjectLayer(subjectOf(input.subject)), evaluationEnvironment({ ports: portsOf(options?.source, input), idPrefix: "sim", clock: clockLayer(options?.clock ?? "live"), shadow: "sinkAndCache" }))`. Keep the l.87-88 subject comment. Remove `Effect`/`DecisionSink`/`decisionCacheLayer`/`evaluationIdSequential` imports if unused (`Effect` still used by `simulate`).
- Module header (l.10-19) keeps the "shadowing, not omission" explanation by pointing at the builder; the long comments move with the shadow code.
- `clockLayer` (l.107-112): `clock === "deterministic" ? TestClock.layer() : Layer.empty`; keep its comment.

### `SimulationSession.ts`, `Simulator.tsx`, `devtools/src/index.ts`

- `SimulationSession.ts`: l.51 import, l.115, 171, 227, 345, 473, 494 use `SimulationClock`; replace with `EvaluationClock` imported type-only from `@qadi/core`. Literals are unchanged.
- `Simulator.tsx`: l.29 import, l.211 `clocks: ReadonlyArray<SimulationClock>`, l.458 prop type. Same rename.
- `index.ts:90`: delete `export type { SimulationClock } from "./model/Simulation.ts";` (named barrel; do not add a re-export of core's type, since `devtools-named-barrel` lists devtools' own modules). Add nothing.

### `packages/core/test/helpers.ts` (modify)

Keep signatures (l.35-39, 48-51). Bodies: `testLayer` = `Layer.mergeAll(currentSubjectLayer(subject), evaluationEnvironment({ ports: portsLayer(overrides), idPrefix: "eval", clock: Layer.empty, shadow: "none" }))`; `subjectSetLayer` = the same `evaluationEnvironment(...)` call, result typed `Layer.Layer<StandingEvaluationServices>`. Imports are relative here (`../src/...ts`): add `../src/EvaluationEnvironment.ts`, drop `evaluationIdSequential` import (l.12) if unused. `evaluationIdSequential()` default prefix: check it is `"eval"` (QadiReviewLayer default and D-02 say `"eval"`; verify in `EvaluationId.ts`).

### Devtools conformance test (new)

Confirmed: `packages/devtools/package.json:60` has `"@qadi/testing": "workspace:^"` (in devDependencies per CONTEXT D-13; confirm the section), and these devtools tests already import `@qadi/testing`: `test/model/Wiring.test.ts`, `SimulationSession.test.ts`, `PortCalls.test.ts`, `Source.test.ts`, `WhatIf.test.ts`. Copy their import block. Test shape: copy `Simulation.test.ts` (`it.effect`, `Layer.build`, `Context.get(ctx, Clock.Clock).currentTimeMillisUnsafe()` at 249-265) and `TestLayers.test.ts:178-185`. For fail-closed parity: build `qadiReviewLayer()` + `currentSubjectLayer(...)` vs `simulationLayer(input)` with Fixtures source and compare the denial. For ids: `decision.evaluationId` is `"eval-1"` (TestLayers.test.ts:189) vs `"sim-1"`.

### New `packages/testing/test/` review-layer tests

- Outer recording sink: closest real analog `packages/core/test/DecisionSinkForwarding.test.ts:391` and `audit/test/SignatureCapturePort.test.ts:295`, both `Layer.succeed(DecisionSink, { record: ... })`; `makeDecisionLog({ environment: "Server" })` with `log.layer` / `log.snapshot` is already used for exactly this in `Simulation.test.ts:110-122` (the negative twin; flip the assertion: records are non-empty under `qadiReviewLayer`). Prefer `makeDecisionLog` (check it is exported from `@qadi/core`; it is imported in Simulation.test.ts).
- Outer cache used: twin of `Simulation.test.ts:124-135`: provide `decisionCacheLayer()` outermost, evaluate under `qadiReviewLayer()`, assert `(yield* DecisionCache).size` is 1 (it is 0 for simulation). Observe hits by the sink record's `cache` field (`DecisionSink.test.ts:451-466`, `sink.seen[0]?.cache === "miss"`), or the metric by its export: `decisionCacheLookupsTotal` (`EvaluationMetrics.ts:185`, a `Metric.frequency`; core test reads with `isolatedMetrics(Metric.value(...))`, `EvaluationMetrics.test.ts:164`). Never write `"qadi_decision_cache_lookups_total"` (`EvaluationMetrics.test.ts:206` is a budgeted pin, do not copy).
- Broken port: `scriptedPort(attributeResolverPort, () => PortReply.fail("down")).layer` (`TestLayers.test.ts:289`; `scriptedPort` imported l.20). Never construct `AttributeResolveError` by hand.
- Style: `it.effect`, `assert` from `@effect/vitest` as in `TestLayers.test.ts`.

### Mutation baseline and pins

Analog: phase 32 plan 01. Pattern: baseline commit first and alone (`32-mutation-base.json`, a flat `{ "packages/core/src/X.ts": score }` map recorded from a fresh core Stryker report, writer refuses a stale report or an entry-less touched file); characterisation pins second; no `packages/*/src` change before them. `stryker.config.mjs:81-85`: `mutate: ["packages/core/src/**/*.ts", "!packages/core/src/index.ts"]`. So Stryker measures: `packages/core/src/EvaluationEnvironment.ts` (new, no base) and nothing else this phase touches; `packages/testing/src/QadiReviewLayer.ts`, `packages/devtools/src/model/*` and `packages/core/test/helpers.ts` are not mutated (config comment states testing is deliberately excluded; devtools is not in the glob; react has its own `stryker.react.mjs` for `DecisionOutcome.ts` only). So the base JSON may be near-empty: the only core src file this phase edits is `index.ts`, which is excluded; the new file has no base, so the bar is "new file scored in the after-run, killed by tests". Confirm before planning (not run here). Pins for D-16 go through the barrel/public API: review layer passes outer sink and cache through; simulation shadows both (these tests already exist at `Simulation.test.ts:110-135` and `TestLayers.test.ts`, so new pins add only the review-layer pass-through and ids).

Phase-32's gate (`32-04-PLAN.md:129`) fails on any change since base to a "judging file": regexp `F` covering scripts, configs, `AGENTS.md`, `CONTRIBUTING.md`, CHANGELOG, `package.json`, tsconfig, tstyche, `vitest*`, `.github`, and `apps/website/.../reference/upgrading.md`. A phase-33 copy must exempt `upgrading.md` (D-09/D-10 require a Breaking entry there). It lists no test files, so `TestLayers.test.ts`, `Simulation.test.ts` and `surface.tst.ts` are not judged by `F`; but 32's "pin unchanged since its commit" and "no 32-04 commit touches a `.tst.ts` or removes a test line" checks (T-32-06) would trip on `surface.tst.ts` and `TestLayers.test.ts` if reused verbatim: exempt those two (public vocabulary deliberately changes, so this is not editing a test to pass). No `AGENTS.md`/`package.json` edit is expected; `scripts/check-house-style.mjs` must not change unless a budget moves (none does).

## Existing tests that name today's vocabulary

| File | Change |
|------|--------|
| `packages/testing/test/TestLayers.test.ts` l.176, 180, 192, 213 | `clock: "test"` to `clock: "deterministic"` (4 sites; also test titles/comments naming `"test"`, l.~170-205). Deliberate Breaking, not a weakening. |
| `packages/devtools/test/surface.tst.ts:74` | Remove `SimulationClock` from the public-surface type list (it is an exported-names pin). Deliberate. Do not add `EvaluationClock` there (core's surface, not devtools'). |
| `packages/devtools/test/model/Simulation.test.ts` | Seal tests (l.76-135) stay unchanged (INV-QD-042 green, D-14); clock tests (l.180-285) already use `"deterministic"`/`"live"`, so no edit unless they import `SimulationClock` (grep showed they do not). Add `"sim-"` id-prefix assertion (existing l.426 "mints deterministic ids" is the spot). |
| `spec`/other tests | grep found no other `SimulationClock` or `clock: "test"` in `features/`, `examples/`, `apps/` source. `features/step-definitions/Bridge.ts:34,193,231` use `qadiReviewLayer` without a clock option, unaffected. |

## Spec and docs

| File | Kind | Edit |
|------|------|------|
| `spec/decisions/050-a-simulation-is-sealed.md` | prose; header table Revision is **1.4** (l.8), amendments at l.144 (2026-10-05, CCR-QD-181), l.151 (2026-10-07, CCR-QD-199), l.167 (2026-11-11, CCR-QD-414) | Add `## Amendment (2026-11-12, CCR-QD-424)`, bump to Rev 1.5 with a Change History line. Note CONTEXT says "Rev 1.5" as the amended revision; the file reads 1.4 now, so the new revision is 1.5 (confirm no unmerged edit). Also l.101 names `qadiTestLayer({ clock: ...` (prose, check literal). Model for an amendment with Change History row: `094-a-port-is-described-once.md:13` (1.11) and its `## Amendment (2026-11-12, CCR-QD-419)` at l.368. |
| new `spec/decisions/146-*.md` (ADR-QD-146) | prose | Reserve ids with `scripts/next-id.mjs`; add to `spec/decisions/index.yaml` (see CCR-QD-392 row). Placeholder `-NEXT` ids are refused. |
| `spec/invariants.md` ~l.1701 INV-QD-042 | prose | Source line (1708) names `simulationLayer`, restate as builder arg; add INV-QD-311/312. |
| `spec/behaviors/29-devtools-simulator.md` | l.636 is a ` ```ts ` fence (signature listing, not compiled) `export type SimulationClock = ...`; l.659 prose `"live" \| "test"` for `TestLayerOptions.clock`; l.44, 204 prose | edit; BEH-QD-226 section. Add BEH-QD-501..505 where chosen. |
| `spec/devtools-spec/00-overview.md` l.141 | prose `"live" \| "test"` | update (not a compiled fence; folder is gated by `check-devtools-claims.mjs` for absence claims only). |
| `spec/devtools-spec/02-screens.md` l.316 | prose (no code fences in the file: count 0) `qadiTestLayer(subject, { clock: "test" })` | update to `"deterministic"`. |
| `spec/overview.md` | tables; l.815-816 `qadiReviewLayer`/`TestLayerOptions` rows; l.878 `SimulationClock` row (remove); add rows for `evaluationEnvironment`, `EvaluationShadowing`, `EvaluationClock` in core's table beside the `EvaluationServices` row (gate 13 demands every barrel export named). Bump Change History (l.13, currently 1.97). |
| `spec/traceability.md` | new rows; Change History (l.13, 1.156); tst/test file table (~l.484) for new test files. |
| `spec/README.md` | CCR table: add CCR-QD-424 row (newest-first, near l.13 history 1.160 -> 1.161). |
| `spec/models/00-adoption-matrix.md:305` | prose row for `qadiReviewLayer`; likely no change. |
| `apps/website/src/content/docs/docs/packages/testing.md:34-38` | prose; `"live"` or `"test"` -> `"deterministic"`. Website docs fences are compiled by `check-website-doc-examples.mjs`; this snippet text is prose, but check any fence there using `clock:`. |
| `apps/website/.../reference/upgrading.md` | page titled "Upgrading to 0.11" but latest sections are `## 0.12: ...` (l.129-437). Breaking entries are `## 0.12: <what changed>` headings; model after the last one, `## 0.12: untrusted JSON is decoded through \`untrustedDecoder\`` (l.394) and l.168's table form (`| Removed | Instead |`). Add `## 0.12: \`clock: "test"\` is \`"deterministic"\`, and \`SimulationClock\` is \`EvaluationClock\``. Note l.186 lists `simulationLayer`/`SimulationOptions` as removed from devtools' public surface, so `simulationLayer`'s own doc there is already "removed"; do not describe it as current. |

## Changesets

- core, minor with new exports: `.changeset/untrusted-decode-core.md` shape: frontmatter `"@qadi/core": minor`, a bold lead sentence, bullets, a `New exports:` bullet listing names, then a `Migration:` paragraph. Phase 33's core entry is additive only, so no **Breaking.** lead.
- Breaking in another package: the marker is a bold **`**Breaking.**`** at the start of the body text (same file, `untrusted-decode-core.md` line 5), not a frontmatter key; other examples: `.changeset/a-port-is-answered-remotely.md`, `closed-entry-points.md`, `decision-stream-order.md`, `a-decision-is-constructed-from-its-trace.md` (all contain `**Breaking`). `untrusted-decode-devtools.md` is a plain `patch` with no Breaking, so it is not the model. Frontmatter bump level for a Breaking change in a 0.x package: check one of those files (not read here). Files: `.changeset/<kebab-name>.md`, one per package.

## Shared Patterns

- Imports: `import * as X from "effect/X"`, relative with `.ts`, cross-package named imports from `@qadi/core`, `import type` for types.
- No `as`, no `any`, no `switch (_tag)`, no `console`, no `Date.now`.
- Doc comments: one-line summary first, ADR/CCR citation after.
- Fail-closed ports: the review layer's unfed port denies (`fixturePortsLayer({})` leaves defaults).
- `Layer.mergeAll` stays small here (4-6 members), far below the 90-arg limit.

## No analog / not verified

- Exact name and path of core's `EvaluationPorts` layer-input type (devtools re-exports `EvaluationPorts`, `EvaluationPortsLayer`; Phase 32 owns it). Verify in `packages/core/src/EvaluationServices.ts` before writing the options type.
- Whether `evaluationIdSequential()`'s default prefix is `"eval"` (helpers.ts passes none today); verify in `packages/core/src/EvaluationId.ts`.
- Stryker measurability was read from config only, not run.
- Section of `packages/devtools/package.json` that holds `@qadi/testing` (line 60) not confirmed to be `devDependencies`.

## Metadata

**Analog search scope:** packages/core/src, packages/testing/{src,test}, packages/devtools/{src,test}, spec/, apps/website docs, .changeset, .planning/phases/32-*, stryker.config.mjs
**Pattern extraction date:** 2026-11-12
