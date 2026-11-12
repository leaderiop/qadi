# Phase 24: Simulation source preparation - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Ticket:** ARCH-72 · review candidate 4 (2026-11-11 architecture review)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base, numbering, overrides)

<domain>
## Phase Boundary

`@qadi/devtools`' rule for turning a reviewer's source choice into something a run can use moves out of
`model/SimulationSession.ts` and into `model/SimulationSource.ts`, as one function:

`prepareSource(choice, { ports, capture })` returns the three source options and either `Ready` (the source a run
evaluates against, plus how to read back what it captured) or `Refused` (the reason). Each source's availability
and the sentence for it are written once, in one table closed over `SourceChoice`. The rule that defines the
three-source design, "a Live run captures so Snapshot unlocks", lives in `SimulationSource.ts` only. The session
stores what `prepareSource` returns and never looks at a `SimulationSource` variant's `_tag`.

No public name is added or removed. `SourceChoice`, `SourceOption` and `SourceRefusal` stay exported from the root
barrel but are declared in `SimulationSource.ts`. `ResolvedSource`, `resolveSource` and `sourceOptions` were
package-private (CCR-QD-321) and are deleted. Phase 25 runs next and builds on this end state; Phase 26 (a headless
dock model) runs after that. Neither is planned here.
</domain>

<evidence>
## Evidence (re-verified by reading at 965ff14c, 2026-11-11)

Matches `_WAVE7-CONTEXT.md`, with three additions marked **new**.

- `packages/devtools/src/model/SimulationSession.ts:43-123` declares `SourceChoice` (:44), `SourceOption` (:47-51),
  `SourceRefusal` (:54-56), `ResolvedSource` (:58-60), the two reason strings (:62-64), `resolveSource` (:73-94) and
  `sourceOptions` (:102-123). `SimulationSource.ts` (149 lines) holds the union, the constructors, `causesIO` and
  `portsOf`, and nothing about availability.
- Availability is written twice: `capture === undefined` at :81 and :109-111, `ports === undefined` at :89 and
  :117-119, each pair sharing one reason constant.
- `SimulationSession.ts:451-466` (in `runEffect`) resolves again, then reaches into the variant:
  `resolved.source._tag === "Live" && ports !== undefined ? capturing(ports) : undefined` (:464-465) and
  `recorder === undefined ? resolved.source : live(recorder.layer)` (:466). `ports !== undefined` re-checks what
  `Live` already carries. `program` (:419-436) takes the recorder and reads `recorder.answers` after the run (:434).
- **new:** `build()` is a third reader. It calls `resolveSource` (:351) and passes `resolved.source` to `sweepPlan`
  only when `Available` (:358), so the plan's `causesIO` comes from the same rule. The snapshot's `options` come from
  `sourceOptions(ports, capture)` (:382) and its `refusal` from the resolution (:383).
- The defining rule (Live captures) has no home: the session's header (:12-17) and the comment at :461-463 state it.
  ADR-QD-050's 2026-10-07 amendment (CCR-QD-199) calls it "the session's rule rather than the component's".
- `capturing(ports)` (`Capture.ts:93-127`) allocates its maps when called, not when run. The session calls it once
  per run today, so each Live run's capture holds only what that run asked. **new:** no test pins that; a
  preparation stored and reused across runs would silently accumulate answers from several runs.
- Tests that restate availability: `test/model/SimulationSession.test.ts` "resolveSource and sourceOptions"
  (:189-215) and "says what each option offers" (:1081-1095, which also calls `resolveSource` and `sourceOptions`
  directly). The session tests that check a refusal becomes the run state are "choosing a source that cannot be
  honoured — C2" (:128-187). Capture lifetime (kept across edits and re-seeds, dropped with the ports) is
  "a Live run captures — C3" (:217-271) and "keeps the capture when a Fixtures run follows a Live one" (:1110-1119).
  `test/model/SimulationSource.test.ts` (217 lines, 15 tests) covers `causesIO`, `portsOf`, the seal and the
  constructors.
- **new:** records that name the old function: BEH-QD-322's fence (`spec/behaviors/29-devtools-simulator.md:685-692`)
  shows `resolveSource` with a "Package-private since CCR-QD-321" note; BEH-QD-220's refusal requirement (:107-117)
  says the session refuses; ADR-QD-050's amendment (:151-166) names `resolveSource`; `test/surface.tst.ts:142-143`
  pins `resolveSource` as not exported. `spec/overview.md:859` lists `SourceChoice`, `SourceOption`, `SourceRefusal`
  with source `model/SimulationSession.ts`.
- Public surface (`packages/devtools/src/index.ts:88-100`): `SourceChoice`, `SourceOption`, `SourceRefusal` are
  type exports from `./model/SimulationSession.ts`. Gate 13 checks names, not the Source column, but the row must stay true.
- Mutation: `stryker.devtools.mjs` mutates `packages/devtools/src/model/**/*.ts` and writes
  `reports/mutation-devtools/mutation.json`; break threshold 80.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (no defect, so no RED-on-base regression test):** this phase is a deepening with no wrong behaviour to fix,
  so WX-06 has nothing to pin. Plan 24-01 instead records the mutation baseline, adds the one missing
  characterisation test (a second Live run's capture holds only what that run asked), and commits the
  `prepareSource` table test red. It is red because the function does not exist yet; that is the only way a new
  seam can be red, and it is kept in its own file so no other suite is red with it.
- **D-02 (the interface):** in `SimulationSource.ts`:
  ```ts
  export type SourceChoice = SimulationSource["_tag"];
  export interface SourceOption { readonly id: SourceChoice; readonly enabled: boolean; readonly why: string }
  export type SourceRefusal =
    | { readonly _tag: "LiveWithoutPorts"; readonly reason: string }
    | { readonly _tag: "SnapshotWithoutCapture"; readonly reason: string };
  export type PreparedSource =
    | { readonly _tag: "Ready"; readonly source: SimulationSource;
        readonly captured: Effect.Effect<CapturedAnswers> | undefined }
    | { readonly _tag: "Refused"; readonly refusal: SourceRefusal };
  export interface SourcePreparation {
    readonly options: ReadonlyArray<SourceOption>;
    readonly prepared: PreparedSource;
  }
  export const prepareSource: (
    choice: SourceChoice,
    have: { readonly ports: EvaluationPortsLayer | undefined; readonly capture: CapturedAnswers | undefined },
  ) => SourcePreparation;
  ```
  `Ready`/`Refused` match the run state's existing `Refused` tag. `captured` is present only for a Live
  preparation: its `source` is `live(recorder.layer)` and `captured` is `recorder.answers`. Both unions are closed
  and written out in full (user rule: closed union over widening).
- **D-03 (availability written once):** one private table closed over `SourceChoice`
  (`{ readonly [K in SourceChoice]: … }`, so a fourth source is TS2741 here) holds, per source, whether it can be had
  and the sentence either way, and both `options` and `prepared` are read from it. The two reason constants keep
  their exact text (the dock shows them and tests pin them).
- **D-04 (the session stores what comes back):** `build()` calls `prepareSource` and reads `options`, the refusal
  and the plan's source from the result. `runEffect` calls `prepareSource` again at the start of every run, so each
  Live run gets a fresh recorder (the characterisation test in 24-01 pins this). A preparation is never cached
  across runs. The session branches only on `prepared._tag` (`Ready`/`Refused`); the `_tag === "Live"` check, the
  `ports !== undefined` re-check and the `live(recorder.layer)` re-wrap are deleted. `program` takes the `Ready`
  value and yields `captured` when it is present.
- **D-05 (tests, SRC-03):** one table test in `test/model/SimulationSource.prepare.test.ts` over all 12
  combinations (3 choices × ports present/absent × capture present/absent): the prepared tag, the refusal tag, the
  source tag, whether `captured` is present, the enabled flags and the exact sentences. Plus one Effect test: a
  Ready Live source evaluated through `simulate` leaves its answers in `captured`, and two preparations do not share
  a recorder. The session's tests stop restating availability: the two describes that call `resolveSource`/
  `sourceOptions` move into the table test and are deleted from `SimulationSession.test.ts` only after the table
  test is green. The C2 refusal tests and the capture-lifetime tests stay in the session suite (the capture belongs
  to its ports, ADR-QD-050 1.3, and that is the session's rule).
- **D-06 (surface):** no public name changes. The barrel's `SourceChoice`, `SourceOption`, `SourceRefusal` line moves
  to `from "./model/SimulationSource.ts"`; `spec/overview.md`'s row is split so its Source column stays true.
  `test/surface.tst.ts` replaces the `resolveSource` "no exported member" pin with `prepareSource`. `prepareSource`,
  `PreparedSource` and `SourcePreparation` stay package-private (ADR-QD-099).
- **D-07 (records):** amend ADR-QD-050 (a dated blockquote, CCR-QD-414): "a Live run captures" is
  `SimulationSource.ts`'s rule, stated once, and the session stores what `prepareSource` returns. No new ADR:
  this relocates a rule ADR-QD-050 already made, so **ADR-QD-136 stays unused** (said in CCR-QD-414). Add
  BEH-QD-455 ("A source choice is prepared in one place") to `29-devtools-simulator.md`; update BEH-QD-220's refusal
  paragraph and BEH-QD-322's fence (replace `resolveSource` with a package-private `prepareSource` note). No new
  invariant (INV-QD-292/293 unused): no new property holds, the existing INV-QD-042/043 are untouched.
  Traceability rows, CCR-QD-414, `spec/README.md` Document history, the overview row, and a `@qadi/devtools` patch
  changeset (internal move, no public change).

### Claude's Discretion
- The private table's shape (a record of small objects, or of functions of `{ports, capture}`), as long as
  `options` and `prepared` both read it and a fourth `SourceChoice` is a compile error there.
- Whether the Live preparation allocates its recorder inside `prepareSource` (calling it from `build()` then
  allocates five empty maps per commit, which nothing can observe) or defers the allocation behind a thunk that
  `prepareSource` itself resolves. Either is fine if the session never re-wraps a source.
- The exact test titles, as long as each carries "ARCH-72" where the plans' `-t` filters need it.
</decisions>

<canonical_refs>
## Canonical References
- `packages/devtools/src/model/SimulationSource.ts`, `SimulationSession.ts`, `Capture.ts` (`capturing`, `replayLayer`),
  `WhatIf.ts` (`sweepPlan`, `causesIO` use), `SimulationInput.ts` (`EvaluationPortsLayer`)
- `packages/devtools/src/index.ts` (barrel), `packages/devtools/test/surface.tst.ts`
- `packages/devtools/test/model/SimulationSession.test.ts`, `SimulationSource.test.ts`
- `features/features/devtools-simulator/devtools-simulator.steps.test.ts` (drives the session; must stay green)
- ADR-QD-050 (three sources; amendment 2026-10-07, CCR-QD-199), ADR-QD-047 (headless model; 1.6 amendment's
  package-private rule), ADR-QD-099 (out of the barrel means not importable)
- `spec/behaviors/29-devtools-simulator.md` (BEH-QD-220, BEH-QD-322), `spec/overview.md` `@qadi/devtools` table,
  `spec/traceability.md` rows for `SimulationSource.test.ts` and `SimulationSession.test.ts`
- `.planning/milestones/archive-pre-gsd/architecture/ARCH-20-simulation-session.md` (D-20-c: refusal as a state)
</canonical_refs>

<deferred>
## Deferred Ideas
- Removing `snapshot.capture` from the public snapshot (no view reads it; tests do). Out of scope: a public change
  with no review finding behind it.
- Making `portsOf(undefined)` non-optional (ARCH-20 D-20-c option C), still unneeded.
</deferred>

---
*Phase: 24-simulation-source-preparation · Context gathered: 2026-11-11*
