# Phase 43: One handover module behind the enforcement entry points - Context

**Gathered:** 2026-11-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Every value-handing enforcement entry point must follow one rule: the resource decided on is the value handed over (INV-QD-108, ADR-QD-104). Today that rule is written in four forms in `packages/core/src/Qadi.ts`, and two of them are a defect:
- `guard` (:406) and the four `filter*` (:483, :527, :555, :585, all through `decideOne` :430) take `EnforceOptions`;
- they overwrite `options.resource` with `{ ...options, resource }` / `{ ...options, resource: item }`;
- so `filter(p, items, { resource: x })` and `guard(perm, p, { resource: x })` compile, and `x` is silently dropped.

This phase:
- puts "decide against this value, then discharge, then release whole or projected" in one package-private module;
- turns the ten enforcing entry points into adapters over it;
- refuses a second resource at the type level on every entry point that hands over a value.

Records:
- ARCH-90; ADR-QD-156; CCR-QD-434; BEH-QD-551..555 and INV-QD-331..332 are reserved (use them only for statements nothing already covers).
- Changesets: `@qadi/core` minor and `@qadi/promise` minor, both **Breaking**.

Requirements: HAND-01..06, plus WX-01..07.

Read first:
- `.planning/phases/_SHARED-CONTEXT.md`
- `.planning/phases/_WAVE10-CONTEXT.md` (the Phase 43 evidence)
- the Phase 43 section of `.planning/ROADMAP.md`
- `spec/decisions/104-a-projected-read-decides-against-the-value-it-projects.md`
- `spec/invariants.md` INV-QD-032 and INV-QD-108

</domain>

<decisions>
## Implementation Decisions

### The refusal type and who refuses (accepted 2026-11-15)
- **D-01: One options type for every entry point that hands over a value.**
  - A new exported `HandoverOptions<E, R>` is `EnforceOptions` with `resource?: never`.
  - It is the options type of all of these: `enforceProjected`, `enforceLoaded`, `enforceProjectedLoaded`, `guard`, `filter`, `filterStream`, `filterProjected`, `filterStreamProjected`.
  - `LoadedEnforceOptions` is **removed** (Breaking). Its name says "loaded", which is wrong for `guard` and `filter`, and one name keeps the one rule in one place.
  - `spec/overview.md` replaces the `LoadedEnforceOptions` row (gate 13).
- **D-02: `@qadi/promise` refuses the second resource too.**
  - Its `filter` and `filterProjected` forward a `FacadeOptions` that today includes `resource`.
  - They take `Omit<FacadeOptions, "resource">`, as the facade's `projected` already does.
  - This is Breaking for `@qadi/promise`. The facade stays branch-free (ADR-QD-032, AGENTS.md §14).
- **D-03: `enforce` and `assert` keep `options.resource`.**
  - They hand over no value: `enforce` wraps work whose result is not a resource, and ADR-104 already says so.
  - Their docs state the reason. There is no change in behaviour or type.
- **D-04: The RED test is a set of tstyche negatives in `packages/core/test/Qadi.tst.ts`.**
  - `guard` and each of `filter`, `filterStream`, `filterProjected`, `filterStreamProjected` must not be callable with `{ resource }` in their options.
  - They are written and committed on the phase base, where they fail.
  - The existing positives for the three loaded entry points stay.

### The handover module's shape (accepted 2026-11-15)
- **D-05: Placement.**
  - A new package-private module `packages/core/src/Handover.ts`, kept out of the barrel (ADR-QD-099).
  - `Qadi.ts` keeps only the public entry points, as adapters by shape (effect, array, stream).
  - `discharge` (with its `qadi.discharge` span and its sink records) moves into the module.
  - `ObligationDischarge`, `ObligationHandler` and `EnforceOptions` stay exported from `Qadi.ts`. If a type has to move to break a cycle, re-export it there so the public surface does not change.
- **D-06: What it owns.**
  - One function decides against a given resource (or none, for `assert`/`enforce`/`enforceProjected`), and discharges the obligations on an allow.
  - It returns a closed verdict: `Admitted { decision: Allow }` or `Refused { decision: Deny }`.
  - The adapters choose what a refusal means:
    - the effect shapes fail with `AccessDenied` (the existing construction: `subjectId`, `policyTag`, `reason`, `trace`, in one place);
    - the collection shapes drop the item (JA-04: `filter` partitions, it does not fail).
  - `permitted` and `decideOne` are deleted, so the allow → discharge / deny branch is written once.
- **D-07: The release step.**
  - A closed `Release` choice (`Whole` | `Projected`) is applied in the module, so `project(decision, value)` is written once.
  - At the base, it is applied in `enforceProjected`, `enforceProjectedLoaded`, `filterProjected` and `filterStreamProjected`.
  - `filter` and `filterStream` release `Whole`: BEH-QD-050, where items come back whole, is unchanged.
- **D-08: No new span.**
  - `qadi.evaluate` (root) and `qadi.discharge` stay exactly as they are.
  - The module's functions follow AGENTS.md §5 without adding a named span. Use `Effect.fn` with no name, or a plain function returning an Effect where nothing is yielded.
  - A test pins the span names that one enforcing call emits (allow with obligations, allow without, deny), so the trace shape is unchanged.

### Behaviour pins and records (accepted 2026-11-15)
- **D-09: Characterisation first, on the base, green before and after.**
  - A table-driven test over all ten entry points uses `qadiTestLayer` plus a recording `DecisionSink`.
  - It pins, for each entry point:
    - the resource the decision record carries (the value handed over, or none for the resource-free ones);
    - the value released (whole or projected);
    - that discharge happens before the guarded work;
    - that a denial hands nothing over;
    - that a binding obligation with no handler fails with `UndischargedObligation` before the handover.
  - For `filter*` it also pins: that it partitions, that the array and stream forms agree on who passes, and that order is kept under `concurrency`.
- **D-10: Runtime "released value is the decided value" (HAND-03).**
  - It is part of D-09's table. For `filter*`, each released item is the item whose decision admitted it, shown with a recording sink and with per-item projection.
- **D-11: Spec.**
  - ADR-QD-156, "A handed-over value is decided through one module", extends ADR-QD-104.
  - INV-QD-108 is restated in place to cover every entry point that hands over a value, naming `Handover.ts` as its source.
  - INV-QD-032's source and implication change from "overrides any `options.resource`" to "a second resource cannot be written; the positional resource is the one evaluated".
  - BEH-QD-551 (`spec/behaviors/07-enforcement.md`) states the `guard`/`filter*` refusal.
  - New INV rows (331..332) only if a statement is not already covered.
  - Traceability, the `spec/README.md` CCR-QD-434 row and `spec/decisions/index.yaml` are updated as in prior phases.
- **D-12: Docs.** Update every place that says `guard` overrides `options.resource`:
  - in `Qadi.ts`, the `guard` doc ("An explicit `options.resource` is overridden rather than merged");
  - on the website: `apps/website/src/content/docs/docs/concepts/enforcement.md`, `concepts/witness-guard.md`, `reference/glossary.md`;
  - `spec/glossary.md`;
  - `spec/overview.md`;
  - `apps/website/src/content/docs/docs/reference/upgrading.md`, which gets entries for `@qadi/core` (the `LoadedEnforceOptions` → `HandoverOptions` rename, and `guard`/`filter*` refusing `resource`) and `@qadi/promise`.
  Both doc-fence gates must stay green.
- **D-13: Changesets.** One per package: `@qadi/core` minor (**Breaking**) and `@qadi/promise` minor (**Breaking**). Nothing is consumed or released.

### Claude's Discretion
- The exact names inside `Handover.ts`: the decide function, the verdict union's constructor names, and the `Release` encoding (a closed string union or a tagged union; it must be closed and exhaustive by construction).
- Whether the collection adapters share one internal per-item helper, as long as the array and stream forms cannot disagree about who passes.
- Plan split. A suggested order:
  1. RED type tests, characterisation tests and the mutation baseline, on the base;
  2. the module, then the adapters;
  3. the call-site, doc and promise sweep;
  4. the records;
  5. the mutation comparison and the merge gate, last.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ask(policy, options)` in `packages/core/src/Lifecycle.ts:195` returns `{ question, decision }`. It is the one evaluation entry the enforcers share (ADR-100). Keep using it.
- `discharge` (`Qadi.ts:131`) holds the sink-record logic for `HandlerFailed` / `Discharged` / `NotRequired` / `Refused`, through `sinkEmitter` and `obligationRecordFor` (`SinkEmit.ts`). Move it unchanged.
- `project` and `isAllowed` come from `packages/core/src/Decision.ts`.
- `AccessDenied` and `UndischargedObligation` come from `packages/core/src/Errors.ts`. `AccessDenied` is a budgeted `Schema.TaggedError`; do not change its shape.
- `qadiTestLayer` (`@qadi/testing`), and the recording sinks used in `packages/core/test/Qadi.test.ts`.

### Established Patterns
- Package-private modules out of the barrel: `SeededQuestion.ts` (react), `SupersedingRun.ts` (devtools), `PortDerivation.ts` (core).
- `Qadi.test.ts` (1162 lines) has a `describe` per entry point plus obligation and concurrency suites. The new table test goes beside it, or in `Handover.test.ts` through the public entry points. Do not test past the interface.
- `Qadi.tst.ts` already pins `LoadedEnforceOptions` positives. Rename them to `HandoverOptions`.
- Closed unions written out in full (memory: "closed union over widening"). Use `Match` for dispatch, never a `switch` (SWITCH_BUDGET).

### Integration Points
- `packages/promise/src/index.ts:88` (`filter`) and `:124` (`filterProjected`): option types for D-02.
- `packages/http/src/AuthorizeRequest.ts:151` calls `guard(permission, policy)(resource, …)` with no options. Unaffected; compile-check it.
- `examples/http-advanced/server.ts:203`, `features/step-definitions/SignatureLoopSteps.ts:53,63` and the spec and website fences call `guard` with only `onObligations`. Unaffected; compile-check them.
- `scripts/check-api-surface.mjs` (gate 13) follows the export rename.

</code_context>

<specifics>
## Specific Ideas

- The rule this phase states once is the one ADR-104 stated for the loaded entry points. `guard` closed it under INV-QD-032 by *overriding*. This phase closes it by *refusal*, so all ten entry points say it the same way.
- The memory notes apply: prefer complete over simple; breaking changes are fine (not in production); compatibility is never the tiebreaker.

</specifics>

<deferred>
## Deferred Ideas

None. Discussion stayed within phase scope.

</deferred>
