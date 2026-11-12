# ADR-QD-146 — One evaluation environment states its shadowing

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-146                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-12                                     |
> | Status         | Accepted — amends ADR-QD-050                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-12): Initial (ARCH-81, CCR-QD-424) |

---

## Context

Three places assembled the same evaluation environment, a ports layer, a sequential id layer
and a clock: `@qadi/testing`'s `qadiReviewLayer`, `@qadi/devtools`' `simulationLayer`, and
`@qadi/core`'s own test helpers (`testLayer`, `subjectSetLayer`).

The simulation shadowed `DecisionSink` and `DecisionCache` ([ADR-QD-050](./050-a-simulation-is-sealed.md),
[INV-QD-042](../invariants.md)). The review layer did not, and nothing said that its pass-through
was chosen: a reader comparing the two could not tell a deliberate difference from a forgotten
seal. `Effect.provide` adds to a context and cannot remove from one, so the seal is
shadowing, and an environment built without it is silently unsealed, which is exactly the
defect INV-QD-042 exists to prevent.

The clock had two vocabularies for one choice: `"live" | "test"` in `@qadi/testing`'s
`TestLayerOptions.clock` and `"live" | "deterministic"` in `@qadi/devtools`' `SimulationClock`.
Both mean the same thing (the runtime's own clock, or a reproducible one), and a reader had to
know that `test` and `deterministic` were the same word.

## Decision

**One builder, `evaluationEnvironment(options)` in `packages/core/src/EvaluationEnvironment.ts`,
assembles the environment and makes its shadowing a required, closed choice.** (ARCH-81.)

- **The builder takes no subject** and returns `Layer.Layer<StandingEvaluationServices>`. A caller
  that evaluates for one subject merges `currentSubjectLayer` itself; a subject-set evaluation
  supplies its own per element.
- **Four options, every one required:** `{ ports, idPrefix, clock, shadow }`. `ports` arrive built
  (`Layer.Layer<PortServices>`), so no package's fixture vocabulary (a record, a set of edges, an
  event list) crosses into core. `idPrefix` is the prefix of the sequential ids it mints.
- **`shadow: EvaluationShadowing = "none" | "sinkAndCache"`**, dispatched with `Match.exhaustive`
  (a third choice is a compile error at the one dispatch). `sinkAndCache` installs a discarding
  `DecisionSink` and a private `decisionCacheLayer()`, built fresh per layer build, so an imagined
  decision neither reaches the application's sink nor reads or fills its cache. `none` installs
  nothing, so an outer sink and cache stay in effect and the decisions are real.
- **Who passes what.** `qadiReviewLayer` and core's test helpers pass `shadow: "none"`.
  `simulationLayer` passes `shadow: "sinkAndCache"` and `idPrefix: "sim"`, and adds the panel's
  subject. The seal is therefore the simulator's choice of one builder rather than a property of
  one package's own assembly.
- **The clock arrives as a layer** (`Layer.Layer<never>`): `Layer.empty` for the runtime's own
  clock, a test clock layer otherwise. `Clock` is a default service, so neither leaves a
  requirement behind.
- **`EvaluationClock = "live" | "deterministic"`** is `@qadi/core`'s type-only vocabulary for the
  choice. Core never imports `effect/testing`; `@qadi/testing` and `@qadi/devtools` each map the
  word to a layer in one place (`clockLayer`). Their public `clock` options stay optional with a
  live default.

## Cost

Breaking for `@qadi/testing` (`TestLayerOptions.clock: "test"` becomes `"deterministic"`) and for
`@qadi/devtools` (`SimulationClock` is removed; import `EvaluationClock` from `@qadi/core`).
Additive for `@qadi/core`: `evaluationEnvironment`, `EvaluationEnvironmentOptions`,
`EvaluationShadowing` and `EvaluationClock` are new exports.

`clock: Layer.Layer<never>` admits any layer that provides nothing, not only a test clock. That is
accepted: the only callers are the three in-repo builders, each of which derives the layer from an
`EvaluationClock`, and a wider type would need a second closed union beside the first.

## Alternatives considered

- **A boolean `sealed`.** Rejected: it says nothing about what is shadowed, and `true` reads as
  "merely safer" where it is a different behaviour (decisions that are imagined, not real).
- **A default of `"sinkAndCache"`.** Rejected: the review layer would silently stop passing
  records to a test's sink, and a test asserting on records would pass vacuously.
- **A default of `"none"`.** Rejected: the next simulation-like caller forgets the seal, the defect
  INV-QD-042 exists for. A default makes either choice silent, which is why there is none.
- **A public no-op sink export.** Rejected: a second public way to discard decisions, with no
  caller outside the one arm that needs it.
- **Core taking the clock word and importing `effect/testing`.** Rejected: it puts a test module in
  `@qadi/core`'s runtime graph for the sake of one arm of one option.
- **`@qadi/devtools` depending on `@qadi/testing`'s layer.** Rejected: a test package in a browser
  bundle, and ADR-QD-050 already refuses the simulator that dependency.
- **Keeping the testing literal as an alias** (`"test"` accepted beside `"deterministic"`). Rejected:
  two words for one choice is the problem being removed, and the project is not in production.

## Consequences

- [INV-QD-042](../invariants.md) is restated on the builder; [INV-QD-311](../invariants.md) (the
  review layer never shadows) and [INV-QD-312](../invariants.md) (every environment states its
  shadowing, one of two) are added.
- BEH-QD-501..503 (`06-services.md`) state the builder and its two arms; BEH-QD-226 is restated on
  `EvaluationClock` and BEH-QD-504..505 (`29-devtools-simulator.md`) state the one clock vocabulary
  and the agreement of the review layer and a simulation.
- They are pinned by `packages/core/test/EvaluationEnvironment.test.ts` and `.tst.ts`,
  `packages/testing/test/QadiReviewLayer.test.ts` and
  `packages/devtools/test/model/ReviewSimulationConformance.test.ts`. Stryker measures the new
  module, because `stryker.config.mjs` mutates every file under `packages/core/src`.
- ADR-QD-050 carries a dated amendment pointing here; its body and earlier amendments are unchanged.

## Related

[ADR-QD-050](./050-a-simulation-is-sealed.md),
[ADR-QD-022](./022-subject-set-evaluation.md),
[ADR-QD-094](./094-a-port-is-described-once.md),
[INV-QD-042](../invariants.md),
[INV-QD-311](../invariants.md),
[INV-QD-312](../invariants.md), CCR-QD-424.
