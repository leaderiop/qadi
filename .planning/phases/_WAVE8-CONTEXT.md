# Wave 8 (v1.3): shared context for Phases 30–36

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and XC-05
mutation procedure all apply. **This file overrides only the items it names:** source review, base commit, numbering, and
the per-phase evidence below.

**Source review:** 2026-11-12 architecture review, `/var/folders/vn/44p0pxgs4z98v7cl11l4_r4c0000gp/T/architecture-review-20261112-022336.html`
(local, outside the repo; this file holds everything a planner needs from it). Checked against ARCH-01…77 and `spec/decisions/`.

**Base commit:** `aab87576` (`main`, v1.2 Arch Wave 7 merged as #156). Branch `arch-wave-8`. Every phase's base is its first
commit's parent (rule unchanged from `_SHARED-CONTEXT.md`); "RED on the phase base" replaces "RED on `1721a42`".

## Execution order
Phases run strictly one at a time, in numeric order (30 → 36). Same reasons as waves 6 and 7: every records plan edits the
same spec registers, and `use_worktrees` is false. Order: core first (30–33), then devtools (34), then the speculative
react phase (35), then debt (36), which also corrects anything 30–35 left stale.

## Numbering reserved for v1.3
Next free on `aab87576`: ADR-QD-143, CCR-QD-421, BEH-QD-486, INV-QD-305 (the shared reservation file stood one ahead of
`spec/` at CCR 420, ADR 142, BEH 485, INV 304). Highest ARCH is ARCH-77. **The whole block below is reserved in the shared
reservation file** (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json` set to CCR 427, ADR 148, BEH 520, INV 318 on
2026-11-12). **Never run `node scripts/next-id.mjs` while executing these phases**, because every call writes a reservation.
Confirm that a reserved number is free with grep over `spec/`, `packages/`, `.changeset/` and `AGENTS.md`. Name an unused
reservation in the phase's CCR row ("Unused: …").

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 30 | 78 | 143 | 421 | 486–490 | 305–306 |
| 31 | 79 | 144 | 422 | 491–495 | 307–308 |
| 32 | 80 | 145 | 423 | 496–500 | 309–310 |
| 33 | 81 | 146 | 424 | 501–505 | 311–312 |
| 34 | 82 | 147 | 425 | 506–510 | 313–314 |
| 35 | 83 | 148 | 426 | 511–515 | 315–316 |
| 36 | — | — | 427 | 516–520 | 317–318 |

ARCH ids below 78 are never reused. ADR Document IDs must equal the file number (gate 10).

## Correction found while scoping (2026-11-12)
PROJECT.md and STATE.md had carried "devtools replay: four ports' `none` answers grant under `not(...)` on a capture miss
(INV-QD-007 fail-open), needs a decision" since v1.0. **That defect is already closed:** v1.1 shipped ADR-QD-129 ("a replay
miss is an outage on every port", CCR-QD-407, invariants Rev 1.97), and `packages/devtools/src/model/Capture.ts`'s
`unseenReply` fails on every port. The user chose "flip all four" before the error was found. No code work remains. Phase 36
removes the stale line wherever it still appears.

## Already deep (do not re-plan)
From the review's "looked at, not proposed": FieldLattice, TreeFold, Compare (core); the predicate-sql/prisma renderers over
`toRenderable`; http enforcement and `ENFORCEMENT_ERROR_WIRE`; audit `CircuitBreaker`; `Hydration` over `HydrationEngine`.
Too small to act on (leave alone unless a phase lands a new tag there): Trace tag shapes restated in `Decision.ts` vs
`Policy.ts`; `permitted`/`decideOne` in `Qadi.ts` (ADR-104 fixes the surface); the scripted-call pattern repeated across the
audit test doubles. Waves 6–7's "already deep" lists in `_WAVE7-CONTEXT.md` still stand.

## Evidence per phase (from the review; each planner re-verifies against `aab87576` before planning)

### Phase 30: one strict-decode module for every untrusted JSON seam (review candidate 1, Strong; top recommendation)
- The recipe is "guard depth, then strict-decode": a pure helper (`exceedsJsonDepth`, `core/src/DecodeDepthGuard.ts`) plus an
  options constant (`UNTRUSTED_DECODE_OPTIONS`, which lives in `core/src/Policy.ts`). Every seam assembles the order itself,
  about eight times:
  `Policy.ts:1002, 1033–1062` (`Policy.fromJson`), `SinkCodec.ts:423, 502`, `PortWireEncode.ts:104–139` (×3), `PortRemote.ts:123, 151`,
  `react/src/HydrationEngine.ts:198, 440, 480` (strip, guard, decode, with a guard workaround), and
  `audit/src/AuditArchive.ts:252` and `AuditEntry.ts`, which **decode only** with the options and no depth guard.
- Harm: a new seam can skip the guard, and the strict options live in the policy type's module. It is a trust-boundary rule
  restated eight times across three packages, the defect class the library was rewritten to remove (ADR-QD-002).
- Shape proposed: one module owns parse → depth guard → strict decode over `unknown | text` and returns
  `Decoded<A> | NotJson | TooDeep | Malformed` (a closed refusal). Each seam keeps only its mapping: Policy → `PolicyDecodeTooDeep`,
  Sink → `DecodeRefusal`, port wire → message, hydration → drop reason, audit → its own error. A new seam then gets the
  guard by default.
- Wins: locality (the decode order lives in one place); leverage (one interface for eight call sites); testing (one property
  test plus one refusal row per seam); hydration's guard workaround moves inside; `Policy.ts` sheds the JSON concern.
- **Public surface:** `UNTRUSTED_DECODE_OPTIONS` is exported and audit uses it (ADR-QD-099 surface table, gate 13). Whether it
  stays, moves or is replaced is the phase's decision; a removal is **Breaking**. ADRs 090, 095, 096 and 107 only use the helpers,
  and none of them rules this out. Audit picking up the depth guard is a behaviour change: input it accepted before may now be
  refused `TooDeep`.

### Phase 31: a shared computation's reset supersedes its claims (review candidate 3, worth exploring)
- `core/src/SharedComputation.ts:233, 371–374`: `reset` forgets in-flight claims but still lets them write. So
  `core/src/DecisionCache.ts:231–248, 292–301` keeps a `generation` counter and a four-step flush (entries = ∅,
  insertionOrder = ∅, `reset()`, generation += 1), and checks `myGeneration === generation` when a stale claim settles.
- Shape proposed: `reset` marks forgotten claims superseded and reuses the existing **abandoned** path, so a stale claim
  answers its waiters and skips `settle`. The generation counter goes away.
- Tests today: `core/test/DecisionCache.test.ts:749–880`, `core/test/SharedComputation.test.ts:320`. After the change,
  clear-mid-compute races are testable without `evaluate`.
- Extends ADR-QD-132 (ARCH-68) without reversing it. There is only one adapter, so this is about the module keeping its own
  rule. INV-QD-025 (the decision cache) and BEH-QD-439 are the records to restate.

### Phase 32: evaluation options and services stated once, in a leaf (review candidate 4, worth exploring, low effort)
- `core/src/Qadi.ts:222–226` (`decide = evaluate`), `core/src/Evaluate.ts:107–111` (`evaluate = map(ask, .decision)`),
  `core/src/Lifecycle.ts:60–65, 208–209`: `LifecycleOptions` restates `EvaluateOptions`, and the services union is spelled
  out a second time to dodge a madge cycle. Reading the pipeline goes through two pass-through modules.
- Shape proposed: declare `EvaluateOptions`/`EvaluationServices` beside `QuestionOptions` in a leaf (`core/src/Question.ts`
  or a new leaf), delete `LifecycleOptions`, and keep only the public name in `Evaluate.ts`. `Lifecycle.tst.ts` gets simpler.
- ADR-QD-105 keeps the Lifecycle split and ADR-QD-037 sets the cycle rule; this respects both (`pnpm circular` must stay
  green). Check whether `EvaluateOptions`/`EvaluationServices` are public (gate 13), because their declaring module changes.

### Phase 33: one sealed evaluation layer for review and simulation (review candidate 6, speculative, small payoff)
- `testing/src/QadiReviewLayer.ts:145–165` (ports, ids, `clockLayer("test")`) and `devtools/src/model/Simulation.ts:85–112`
  (ports, ids, `clockLayer("deterministic")`, sink, cache) copy about 10 lines verbatim. Each copy decides differently
  whether the sink (and cache) is shadowed, and neither says so.
- Shape proposed: a sealed evaluation layer in `@qadi/core` (ports, id prefix, clock, sink + cache shadowed), consumed by
  both. Devtools still does not depend on testing (ADR-QD-050). The phase must **state** the shadowing rule, and decide
  whether review shadows the sink.

### Phase 34: diagnostics as the dock model's seventh store (review candidate 2, Strong)
- ARCH-74 (Phase 26, ADR-QD-047 Rev 1.12, BEH-QD-465) states "one owned-model hook, and it forks nothing", but the dock
  still forks the diagnostics poll from a React effect and merges readings in the view:
  `devtools/src/react/DevtoolsDock.tsx:148–154` (`useMemo(mergeReading(sampled, reading))`, so "supplied wins per field"
  lives in the view), `devtools/src/react/useDiagnostics.ts:78–92` (`runFork`, hand-written deps, `eslint-disable`),
  `devtools/src/react/useRunningStore.ts`, `devtools/src/model/DockModel.ts:117–131`, `devtools/src/model/DiagnosticsStore.ts`.
- Shape proposed: `makeDockModel` takes `diagnostics` and `reading` as host inputs through `configure`, runs the poll on a
  `FiberHandle` in its scope (as the source read already does), and exposes the merged reading as a store. Public
  `useDiagnostics` stays as an adapter for hosts that don't use the dock. The three snapshot hooks merge into one (this also
  resolves Phase 26 IN-01: they pass a constant `undefined` run to `useRunningStore`).
- Wins: completes ARCH-74's stated rule; the poll-restart rules join `configure`; model tests run under `TestClock` with no
  render; the hand-written deps list is deleted.
- ADR-QD-047 (1.12) and BEH-QD-465 don't mention diagnostics, so this looks like an omission rather than a decision. It
  needs an ADR-047 amendment (ADR-QD-147 may go unused, as ADR-QD-138 did in Phase 26).

### Phase 35: the atom set owns its eviction sweep (review candidate 5, speculative)
- `react/src/QadiAtoms.ts:166, 201, 234, 360` holds `maxTrackedQuestions = 500` as an atom-set option. Its enforcement, the
  sweep, is a provider prop: `react/src/QadiProvider.tsx:130, 193, 343–349` (`sweepIntervalMillis`), over
  `react/src/QuestionBook.ts:155`. Without a provider (a test, a non-React shell) the limit is silently off, and several
  providers over one atom set fork several sweeps.
- Shape proposed: the atom set schedules its own sweep while it is mounted, still on a separate fiber as `QuestionBook`
  requires. The limit then holds wherever the atom set runs, and graph tests can check eviction without rendering.
- **Why speculative:** AGENTS.md §13 and CCR-QD-150 rule out `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL` as the
  scheduler (it reroutes dispatch and dropped a required render). The mechanism is unproven, so the phase **opens on a
  spike or `checkpoint:decision`** to find a scheduler that meets the qadi-owned `sweepEvictions` fork rule, and it may
  conclude "keep it in the provider, but state and test the rule" if no mechanism holds.

### Phase 36: carried spec debt and stale records
- Phase 24 deferred items acknowledged at the v1.2 close: `spec/behaviors/29-devtools-simulator.md` carries
  BEH-QD-219..221 twice; `spec/traceability.md` behaviour 29 names `model/Sources.ts`, but the module is `Source.ts`.
- The stale "replay fail-open undecided" line (see Correction above), wherever it remains in `.planning/` or `spec/`.
- Open info findings from v1.2 (`.planning/milestones/v1.2-MILESTONE-AUDIT.md`), picked by the planner. Prefer those that
  are still true at the phase base and that phases 30–35 did not resolve:
  24 IN-01 (build() makes and drops a recorder per commit while Live is chosen), 24 IN-03 (`Ready` spelled twice);
  25 IN-01 (`BaselineCard` blank sentence), 25 IN-02 (stale comments in `Simulator.test.tsx`);
  26 IN-02 (`DevtoolsDock`'s `nothing` source duplicates the model default), 26 IN-03 (stale "was DevtoolsDock l.N" titles);
  27 IN-01/IN-02 (GuardRoute wording, typo); 28 IN-01..IN-05 (GateWriter docs, INV-QD-064 Source, ADR-140/053 wording),
  28 IN-06 (no StrictMode lifecycle test); 29 IN-01..IN-03 (`DENY_WITHHELD` restating fields, CCR-QD-419 counts, ADR-123 wording).
  Also the pre-existing stale citation `v4-http-smoke.test.ts:106` (`registerApi`) and `stryker.http.mjs` comment placing code in
  `PermissionRegistry.ts`.
