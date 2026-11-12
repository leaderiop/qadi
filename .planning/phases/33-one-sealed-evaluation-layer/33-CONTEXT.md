# Phase 33: One sealed evaluation layer - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Review (`@qadi/testing`'s `qadiReviewLayer`), simulation (`@qadi/devtools`' `simulationLayer`) and core's own test helper (`packages/core/test/helpers.ts`) each assemble the same evaluation environment by hand: a ports layer, a sequential evaluation-id layer, and a clock layer. Only the simulation shadows the decision sink and the decision cache, and nothing states or tests that the review layer deliberately does not. This phase gives `@qadi/core` one evaluation-environment builder that all three are built from. Whether the sink and the cache are shadowed becomes a required closed-union argument, stated in INV-QD-042, in both layers' docs and in ADR-QD-146, and tested in both directions. The two public clock vocabularies are unified.

Devtools keeps no runtime dependency on `@qadi/testing` (ADR-QD-050). Its existing devDependency on testing is what lets the conformance test live in devtools' tests. Core imports nothing from `effect/testing`.

Requirements: SEAL-01..05 and WX-01..07. Records: ARCH-81, ADR-QD-146 (amends ADR-QD-050 Rev 1.5), CCR-QD-424, BEH-QD-501..505, INV-QD-311..312. Changesets for `@qadi/core`, `@qadi/testing` and `@qadi/devtools`.

</domain>

<decisions>
## Implementation Decisions

### The builder (Area 1)
- **D-01 Name and home:** `evaluationEnvironment(options)` lives in a new `packages/core/src/EvaluationEnvironment.ts` and is exported from the barrel (`export *`, alphabetical).
- **D-02 Every argument required:** one options record, `{ ports, idPrefix, clock, shadow }`, with no field optional and no default inside the builder. Each caller states every choice. `qadiReviewLayer` keeps its own `idPrefix` default of `"eval"` on its public surface; the simulation passes `"sim"`; `helpers.ts` passes `"eval"`.
- **D-03 Output:** `Layer.Layer<StandingEvaluationServices>`, imported from Phase 32's `EvaluationServices.ts`, with no current subject. `simulationLayer` and `helpers.ts`' `testLayer` merge `currentSubjectLayer` themselves. The review layer stays subject-less (ADR-QD-022).
- **D-04 Ports arrive built:** `ports` is an already-built `Layer.Layer<EvaluationPorts>`. Review passes `fixturePortsLayer(options?.ports)`, simulation passes `portsOf(source, input)` (Fixtures, Snapshot and Live are unchanged), and `helpers.ts` passes `portsLayer(overrides)`. The builder knows no source modes.

### Shadowing, a required closed union (Area 2)
- **D-05 Exactly two members:** `shadow: "none" | "sinkAndCache"`, the only combinations with a caller. Review and `helpers.ts` pass `"none"`; simulation passes `"sinkAndCache"`. Sink-only and cache-only are not admitted, since nothing would use them; a closed union grows when a caller appears. A boolean pair or a `{ sink, cache }` struct is rejected.
- **D-06 Representation:** an exported string-literal union type `EvaluationShadowing`, dispatched with `Match.value(...)` and `Match.exhaustive` (or an equivalent exhaustive form), so a new member is a compile error. It runs once per layer build, not on the evaluation path.
- **D-07 What `"sinkAndCache"` installs:** a discarding `DecisionSink` (`record: () => Effect.void`) and a private `decisionCacheLayer()`, built fresh on every layer build. Both move from `simulationLayer` together with their explanatory comments: shadowing rather than omission, because `Effect.provide` cannot remove a service. No new public no-op sink export.
- **D-08 Where the rule is written:**
  - INV-QD-042 is restated: shadowing is the builder's required argument, the simulation passes `sinkAndCache`, and the review layer passes `none`.
  - A new INV (from INV-QD-311..312) states that the review layer does not shadow.
  - Both layers' doc comments state their choice.
  - ADR-QD-146 amends ADR-QD-050 (Rev 1.5).

### Clock vocabulary (Area 3, SEAL-05)
- **D-09 Unified on `"live" | "deterministic"`:** the literal names the property the caller wants, not the mechanism, and `"test"` reads wrongly outside a test. **Breaking** for `@qadi/testing`: `clock: "test"` becomes `clock: "deterministic"`. Recorded as Breaking in its changeset and in `apps/website/src/content/docs/docs/reference/upgrading.md`.
- **D-10 Declared once, in core:** core exports a type-only `EvaluationClock = "live" | "deterministic"` beside the builder. Devtools' `SimulationClock` (public, in its named barrel) and testing's inline `"live" | "test"` are deleted, and both packages use `EvaluationClock`. **Breaking** for devtools' `SimulationClock` export, recorded the same way.
- **D-11 Literal to layer outside core:** core never imports `effect/testing`, not even as a type. The builder's `clock` is an already-built layer that admits both `Layer.empty` and `TestClock.layer()`. Testing and devtools each map the literal to a layer in exactly one place, with their own `effect/testing/TestClock` import: `"deterministic"` maps to `TestClock.layer()` and `"live"` to `Layer.empty`. Those two one-line maps are the stated cost of core's rule, recorded in ADR-QD-146. Each existing doc comment explaining why `live` provides no clock stays with its map.
- **D-12 Public defaults stay at the surface:** testing's and devtools' `clock` options stay optional and default to `"live"`. Only the core builder requires the layer.

### Proof and records (Area 4; WX-02, WX-03, WX-05, WX-06, WX-07)
- **D-13 Conformance test in devtools:** placed in `packages/devtools/test/model/`, since devtools already dev-depends on `@qadi/testing`; runtime dependencies are unchanged. On the same fixtures it builds `qadiReviewLayer` and `simulationLayer` and shows they agree on:
  - ids: sequential, each with its own prefix (`"eval-…"`, `"sim-…"`);
  - clock determinism: under `"deterministic"`, `durationMillis` is zero in both;
  - fail-closed ports: a port left unfed fails closed with the same denial in both.
- **D-14 SEAL-03 tests:** new tests in `packages/testing/test` show that under `qadiReviewLayer` an outer recording sink still receives the record and an outer decision cache is still used. The simulation tests assert the `"sim"` id prefix. INV-QD-042's existing tests stay green unchanged. Test-scope budgets apply: metrics are read by their export, never a `qadi_*` literal, and a broken port is scripted with `scriptedPort`.
- **D-15 `helpers.ts` built from the builder:** `testLayer` and `subjectSetLayer` call `evaluationEnvironment` (`shadow: "none"`, a live clock, prefix `"eval"`), and their signatures stay unchanged so their callers do not move.
- **D-16 Characterisation first, then records:**
  - The phase's first commit records the mutation base for the touched src files that carry mutants, measured as in phases 30–32.
  - Pins of today's behavior then come before any `src` change, and must be green on the base: the review layer passes an outer sink and outer cache through, the simulation shadows both, and the ids and clocks behave as they do now.
  - Records: ADR-QD-146; BEH-QD-501..505 for the new behaviors (any unused number named Unused); INV-QD-311..312 (any unused number named Unused); CCR-QD-424 with ARCH-81; traceability rows; the overview's export tables for the new core exports and the removed `SimulationClock`; the behavior docs naming the old clock literal (`spec/devtools-spec/02-screens.md` line ~316, `spec/behaviors/29-devtools-simulator.md`, `apps/website/src/content/docs/docs/packages/testing.md`).
  - Changesets: `@qadi/core` `minor` (new public builder and types); `@qadi/testing` and `@qadi/devtools` with **Breaking** entries for the clock literal and `SimulationClock`.
  - CHANGELOG files are history and are not edited.

### Claude's Discretion
- Plan and wave split, provided D-16's characterisation commit comes first and the mutation bar holds: no touched file falls below its base, and a drop is closed with a test, never re-baselined.
- The exact type of the builder's `clock` parameter, provided it accepts both `Layer.empty` and `TestClock.layer()` with no `effect/testing` import in core and no `as`.
- Exact wording of new and moved doc comments: a one-line summary first, ADR citations only in the paragraphs after it, and no plan or `D-NN` ids.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/testing/src/QadiReviewLayer.ts`: `qadiReviewLayer = Layer.mergeAll(fixturePortsLayer(options?.ports), evaluationIdSequential(options?.idPrefix ?? "eval"), clockLayer(options?.clock))`, plus the long clock doc comment (keep its substance with the map).
- `packages/devtools/src/model/Simulation.ts`: `simulationLayer` merges `currentSubjectLayer`, `portsOf`, `evaluationIdSequential("sim")`, `clockLayer`, a discarding `DecisionSink` and `decisionCacheLayer()`. Its comments explain why the seal is shadowing.
- `packages/core/test/helpers.ts`: `testLayer` and `subjectSetLayer` over `portsLayer(overrides)` and `evaluationIdSequential()`.
- `packages/core/src/EvaluationServicesNone.ts`: the fail-closed bundle (`portsLayer()` plus `EvaluationIdLive`). Not a caller of the builder: it has a live id and no clock choice.
- Existing tests: `packages/testing/test/TestLayers.test.ts` (`qadiReviewLayer`, clock cases near line 180), `packages/devtools/test/model/Simulation.test.ts` (seal tests near 106–132, clock tests near 252–264), `packages/devtools/test/model/SimulationSource.test.ts`.

### Established Patterns
- Barrel `export *`, alphabetical. Devtools' barrel is named (`export type { SimulationClock } from …` at `packages/devtools/src/index.ts:90`), and the `devtools-named-barrel` rule applies.
- `Match`, not `switch`. `import type` for type-only imports. Relative imports carry `.ts`.
- Package boundaries: named imports from `@qadi/core`. `effect/testing/TestClock` is imported only in testing and devtools.
- Gate 13 (`check-api-surface.mjs`): `spec/overview.md` must name every export.

### Integration Points
- New core exports: `evaluationEnvironment`, `EvaluationShadowing`, `EvaluationClock`, and an options type if one is named.
- `@qadi/testing`: `TestLayerOptions.clock` becomes `EvaluationClock`. `qadiTestLayer` is built on `qadiReviewLayer` and is unaffected beyond the literal.
- `@qadi/devtools`: `SimulationOptions.clock` becomes `EvaluationClock`. The Simulator React screen (`packages/devtools/src/react/Simulator.tsx:211, 463`) uses the literals and is unchanged, because the literals are the same.
- Spec mentions: `spec/decisions/050-a-simulation-is-sealed.md`, `spec/invariants.md` (INV-QD-042), `spec/behaviors/29-devtools-simulator.md`, `spec/devtools-spec/00-overview.md`, `spec/devtools-spec/02-screens.md`, `spec/overview.md`, `spec/traceability.md`, `apps/website/src/content/docs/docs/packages/testing.md`.

</code_context>

<specifics>
## Specific Ideas

- The architecture review (`/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`) is the source of this candidate: one sealed evaluation layer.
- The roadmap's opening decisions are settled here: the closed union admits `none` and `sinkAndCache` (D-05), and the clock unifies on `deterministic` (D-09..D-11). The roadmap says not to reopen two things: that the review layer does not shadow (SEAL-03), and that `helpers.ts` is built from the builder (SEAL-04).
- Phase 36 has a hard edge on this phase: carried debt lands there.

</specifics>

<deferred>
## Deferred Ideas

None. The discussion stayed within the phase's scope.

</deferred>
