# Requirements: Qadi — v1.3 Arch Wave 8

**Defined:** 2026-11-12
**Core Value:** An authorization decision is never wrong and never silent.

Source: the 2026-11-12 architecture review (all six candidates) plus carried v1.2 debt. Evidence and numbering:
`.planning/phases/_WAVE8-CONTEXT.md`. Research: `.planning/research/SUMMARY.md`.

**Standing direction for this milestone (user, 2026-11-12):** "we should have the most clean solution not the simplest, we
don't care about the complexity", and "we are not in prod yet, so you break changes". Keeping a public name, avoiding a
Breaking changeset, or keeping source compatibility is **not** a reason to choose a design. Where the research recommended
the compatible option only for compatibility, these requirements take the clean one. Every break is recorded (changeset
marked **Breaking**, `apps/website/.../reference/upgrading.md`). Releasing is still manual only.

## v1.3 Requirements

### One strict-decode module (Phase 30)

- [x] **DEC-01**: One public core leaf (`UntrustedDecode.ts`) owns the untrusted decode order: parse (for text), depth guard, an optional seam-supplied preparation step, then strict decode. It returns a closed refusal union (`NotJson | TooDeep | Malformed`, with `Malformed` carrying the `SchemaError`). It is the only way to strict-decode untrusted input, so a caller cannot skip the guard.
- [x] **DEC-02**: Every untrusted JSON seam in `packages/*/src` decodes through the module: `Policy.fromJson`, `SinkCodec`, the three `PortWireEncode` decoders, `PortRemote`, `HydrationEngine` and the audit archive/entry decoders, plus any seam the phase's inventory finds. Each seam keeps only a total mapping from the closed refusal into its own error. Refusal precedence at every seam is unchanged and pinned by a characterisation table written green on the phase base.
- [x] **DEC-03**: The public `PolicyFromJson` codec no longer decodes untrusted JSON without the depth guard. It is removed, or it is routed through the module; discuss-phase picks whichever is cleaner, and either way it is Breaking and recorded.
- [x] **DEC-04**: No refusal is reported as a different kind. A too-deep input surfaces as too-deep at every seam, including audit (no `TooDeep` folded into `Malformed`). A public refusal union that needs a new arm is written out as the full closed union, and the break is recorded.
- [x] **DEC-05**: The strict decode options and the decode-depth constant live in the leaf. `Policy.ts` no longer declares or re-exports them. `UNTRUSTED_DECODE_OPTIONS` leaves the public surface (Breaking) unless discuss-phase finds a consumer that cannot use the decoder. Whether `exceedsJsonDepth`/`MAX_DECODE_DEPTH` stay public is decided toward the narrowest surface, and the hydration spec requirement that names them is restated to match.
- [x] **DEC-06**: The workarounds for seams that walk only part of a payload (hydration's `{ ...payload, entries: [] }`, the audit envelope's `entries` and the row's `record`) are module options, not hand-built copies at the seams. Per-entry attribution (`EntryNotDecodable{ index, refusal }`, hydration's per-entry drop reasons) is preserved.
- [x] **DEC-07**: Every guarded seam has a test deeper than the bound, closing today's gaps: the port-wire decoders, the hydration envelope, and `PolicyFromJson` or its replacement. The module has one property test (the guard always precedes decode; the refusal kind is a function of the input). `wireHazard`'s outbound depth count still equals `exceedsJsonDepth` (INV-QD-096).
- [x] **DEC-08**: A `scripts/check-house-style.mjs` rule refuses strict decode options or a hand-assembled guard-then-decode outside the leaf, checked in both directions like the other budgets, and AGENTS.md states the rule.

### A shared computation's reset supersedes its claims (Phase 31)

- [ ] **SUPR-01**: `SharedComputation.reset` marks every in-flight claim superseded in one synchronous step. A superseded claim still answers its waiters, and its compute is still interrupted when the last waiter leaves, but its exit never reaches `settle`. This state is distinct from `abandoned`.
- [ ] **SUPR-02**: `DecisionCache` keeps no generation counter. `generation`/`myGeneration` and the stale-write check are deleted, and `clear` is reduced to the steps the adapter still owns.
- [ ] **SUPR-03**: Clear-mid-compute races are tested at the `SharedComputation` seam without `evaluate`, and these tests land before `generation` is deleted: stale-last, stale-first then a third ask coalescing, two keys, and a parked uninterruptible compute. The existing `DecisionCache.test.ts` race pins stay green unchanged.
- [ ] **SUPR-04**: A property test over generated `run`/`reset`/settle/leave interleavings holds: no superseded exit is ever settled, every waiter is answered exactly once, and a post-reset ask claims afresh.
- [ ] **SUPR-05**: The staleness rule is written down: a stale answer never re-enters a cleared cache, and an ask after `clear` computes afresh (a new BEH under the decision-cache behaviour). BEH-QD-439 and INV-QD-025's Enforcement are restated, and ADR-QD-132 is amended.

### Evaluation options and services stated once (Phase 32)

- [ ] **EOPT-01**: `EvaluateOptions` is declared once, beside `QuestionOptions` in `Question.ts`. `LifecycleOptions` is deleted and every use reads `EvaluateOptions`.
- [ ] **EOPT-02**: `EvaluationServices` and `StandingEvaluationServices` are declared once, in a new type-only leaf (`EvaluationServices.ts`). The hand-spelled services union in `Lifecycle.ts` is deleted.
- [ ] **EOPT-03**: `Evaluate.ts` declares only `evaluate`. It holds no option or service type and no restatement of one, and the pipeline reads `Qadi.ts` → `Evaluate.ts` → `Lifecycle.ts` → `Walk.ts` with no duplicated type.
- [ ] **EOPT-04**: `pnpm circular` stays green, and declaration emit stays clean (no TS2883). `Lifecycle.tst.ts` pins the option key set once. `spec/overview.md`'s module column and `spec/traceability.md` name the new declaring modules.

### One sealed evaluation layer (Phase 33)

- [ ] **SEAL-01**: `@qadi/core` exports one evaluation-environment builder (ports, evaluation-id prefix, an injected clock layer). Both `@qadi/testing`'s `qadiReviewLayer` and devtools' `simulationLayer` are built from it, and the copied lines are gone. Devtools still does not depend on testing (ADR-QD-050).
- [ ] **SEAL-02**: Whether the sink and the decision cache are shadowed is a **required** closed-union argument of the builder, never a default and never a boolean pair. The rule is stated in INV-QD-042 and in both layers' docs.
- [ ] **SEAL-03**: The review layer does not shadow: a test's outer sink still receives records and an outer cache is still used, both pinned by new tests. The simulation layer shadows both (INV-QD-042's existing tests stay green). The `"sim"` id prefix is asserted.
- [ ] **SEAL-04**: A conformance test shows that the review and simulation layers agree on ids, clock determinism and fail-closed ports, and `packages/core/test/helpers.ts` is built from the same builder.
- [ ] **SEAL-05**: The clock vocabulary is settled cleanly. Core gains no `effect/testing` import (the clock arrives as a layer). Whether the two public clock literals (`"test"`, `"deterministic"`) are unified is decided in discuss-phase on cleanliness, not compatibility.

### Diagnostics as the dock model's seventh store (Phase 34)

- [ ] **DIAG-01**: `makeDockModel` takes `diagnostics` and `reading` as host inputs through `configure` (compared per field, so an inline literal does not restart the poll). It runs the diagnostics poll on its own `FiberHandle` in the model's scope. The dock forks nothing from a React effect, and the hand-written deps list and its `eslint-disable` are deleted.
- [ ] **DIAG-02**: The "supplied reading wins per field" merge is computed in the model, when an input changes, and exposed as a store. `DevtoolsDock` renders it and merges nothing.
- [ ] **DIAG-03**: Public `useDiagnostics` is a thin adapter over the same scoped diagnostics feed, so there is one poll implementation. `DiagnosticsDockOptions` is declared in the model.
- [ ] **DIAG-04**: The dock's snapshot hooks collapse into one store-snapshot hook, which removes the constant-`undefined` run passed to `useRunningStore` (v1.2 Phase 26 IN-01).
- [ ] **DIAG-05**: A poll defect is visible as a failed state, not a silently stopped panel, and is tested with a throwing source. The behaviour across a hidden `<Activity>` and across `diagnostics` going `undefined` and back is decided, stated and pinned.
- [ ] **DIAG-06**: Model tests cover the poll's start, restart, stop and merge under `TestClock` with no render. ADR-QD-047 is amended, BEH-QD-465 (seven stores) and BEH-QD-323 are restated, and `DockModel.ts` keeps its mutation score.

### The atom set owns its eviction sweep (Phase 35)

- [ ] **SWEEP-01**: The phase opens on a spike that tries candidate mechanisms in the research order (edge-triggered deferred sweep; self-terminating book-level fiber; layer-scoped periodic fork). It never uses `scheduleTask`/`defaultIdleTTL`, never sweeps from the render path or inside the registry's dispose-reread window, and uses no module-scope timer. The spike's evidence and conclusion are recorded.
- [ ] **SWEEP-02**: A mechanism is accepted only if it passes every criterion: the dispose-reread smoke, the existing sweep pins, the `examples/nextjs-newsroom` e2e unchanged (CI or the container route if the host cannot run it), one sweep per atom set however many providers or registries, no second sweeper under StrictMode or a hidden `<Activity>`, and no leaked fibers across many atom sets.
- [ ] **SWEEP-03**: If a mechanism passes, `maxTrackedQuestions` holds wherever the atom set runs, including with no provider, as shown by a bare-registry graph test. The provider no longer forks a sweep, and a superseded `sweepIntervalMillis` is removed (Breaking, recorded) or moved to the atom set's options if the mechanism still needs an interval.
- [ ] **SWEEP-04**: If no mechanism passes, the sweep stays in the provider, but the rule is stated (in the spec and the atom set's docs) and tested: what happens without a provider, and under several providers. `QadiProvider.test.tsx`'s "stays over the bound after unmount" pin is reconciled either way.
- [ ] **SWEEP-05**: AGENTS.md §13 and `spec/process/house-rules-evidence.md` §4 describe the outcome. Any new reliance on an `@stability unstable` atom API is pinned in `v4-reactivity-smoke.test.ts`.

### Carried spec debt and stale records (Phase 36)

- [ ] **DEBT-01**: `spec/behaviors/29-devtools-simulator.md` has one BEH-QD-219..221 block, reconstructed by hand. It keeps the current fail-closed replay text (ADR-QD-129, BEH-QD-411) and the intact tail prose, moves the spliced change-history fragment back to the header, and deletes the stale fail-open copy.
- [ ] **DEBT-02**: `spec/traceability.md` behaviour 29 names `model/Source.ts`, not `model/Sources.ts`.
- [ ] **DEBT-03**: No live record still claims the replay fail-open is undecided. Historical change-history rows stay exempt (AGENTS.md §15).
- [ ] **DEBT-04**: Every open v1.2 info finding listed in `_WAVE8-CONTEXT.md` is re-verified at the phase base. Each one still true is fixed, and each one resolved by phases 30–35 (e.g. 26 IN-01) is recorded as resolved. 24 IN-01 (a recorder built and dropped per commit) and 24 IN-03 (`Ready` spelled twice) are fixed as tested code changes.
- [ ] **DEBT-05**: The pre-existing stale citations are corrected: `v4-http-smoke.test.ts:106` (`registerApi`) and the `stryker.http.mjs` comment placing code in `PermissionRegistry.ts`. 28 IN-06 is narrowed to its remaining gap (an identity-changing rerender under StrictMode) and tested, or closed with evidence.

### Cross-cutting (every v1.3 phase)

- [x] **WX-01**: `pnpm check:pr < /dev/null` is green at the end of each phase.
- [x] **WX-02**: Each phase records its ADR (or names it "Unused" in its CCR row), its CCR row, and its BEH/INV/traceability changes, using only its reserved numbers. `node scripts/next-id.mjs` is never run.
- [x] **WX-03**: `spec/overview.md` names every added export and drops every removed one (gate 13), and its module column is corrected by hand for every moved declaration.
- [x] **WX-04**: No new `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await`, ambient `console`/`process.env`/clock. Budgets change only together with their AGENTS.md table.
- [x] **WX-05**: Coverage thresholds hold (core at least 95%, others at least 90%). The Stryker score of touched files does not fall (per-phase `NN-mutation-base.json`), and a drop is closed with a test, never re-baselined.
- [x] **WX-06**: Every behaviour change is preceded by a characterisation or regression test written on the phase base (RED for a defect, green for preserved behaviour).
- [x] **WX-07**: Every public break is recorded in its package's changeset as **Breaking** and in `upgrading.md`. Nothing is released or published, and no version-packages PR is merged.

## v2 Requirements

None deferred. Every candidate of the 2026-11-12 review is in scope.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Devtools replay fail-closed on four ports | Already done in v1.1 (ADR-QD-129, CCR-QD-407); only the stale records are cleaned (DEBT-03) |
| Collapsing `decide`/`evaluate`/`permitted`/`decideOne` | ADR-QD-104 fixes that surface; the review lists it as too small to act on |
| Trace tag shapes restated in `Decision.ts` vs `Policy.ts` | Too small (review); do it when the next tag lands |
| The scripted-call pattern across the audit test doubles | Too small (review); audit doubles stay outside core's registry (ADR-QD-126) |
| Re-planning modules the reviews found deep | `_WAVE8-CONTEXT.md` "Already deep" and `_WAVE7-CONTEXT.md`'s list |
| `scheduleTask`/`defaultIdleTTL` as the sweep scheduler | Ruled out by AGENTS.md §13 / CCR-QD-150 (dropped a required render) |
| `oxfmt` in the gate | AGENTS.md §17 |
| Releasing or publishing any package | Standing instruction: release only when the user explicitly asks for "the release" |

## Traceability

Which phases cover which requirements. One row per ID (`phase.complete` cannot parse grouped rows or ranges).
The seven WX rows apply to every phase 30 to 36, so each phase's Requirements line in `ROADMAP.md` lists all seven.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEC-01 | Phase 30 | Complete |
| DEC-02 | Phase 30 | Complete |
| DEC-03 | Phase 30 | Complete |
| DEC-04 | Phase 30 | Complete |
| DEC-05 | Phase 30 | Complete |
| DEC-06 | Phase 30 | Complete |
| DEC-07 | Phase 30 | Complete |
| DEC-08 | Phase 30 | Complete |
| SUPR-01 | Phase 31 | Pending |
| SUPR-02 | Phase 31 | Pending |
| SUPR-03 | Phase 31 | Pending |
| SUPR-04 | Phase 31 | Pending |
| SUPR-05 | Phase 31 | Pending |
| EOPT-01 | Phase 32 | Pending |
| EOPT-02 | Phase 32 | Pending |
| EOPT-03 | Phase 32 | Pending |
| EOPT-04 | Phase 32 | Pending |
| SEAL-01 | Phase 33 | Pending |
| SEAL-02 | Phase 33 | Pending |
| SEAL-03 | Phase 33 | Pending |
| SEAL-04 | Phase 33 | Pending |
| SEAL-05 | Phase 33 | Pending |
| DIAG-01 | Phase 34 | Pending |
| DIAG-02 | Phase 34 | Pending |
| DIAG-03 | Phase 34 | Pending |
| DIAG-04 | Phase 34 | Pending |
| DIAG-05 | Phase 34 | Pending |
| DIAG-06 | Phase 34 | Pending |
| SWEEP-01 | Phase 35 | Pending |
| SWEEP-02 | Phase 35 | Pending |
| SWEEP-03 | Phase 35 | Pending |
| SWEEP-04 | Phase 35 | Pending |
| SWEEP-05 | Phase 35 | Pending |
| DEBT-01 | Phase 36 | Pending |
| DEBT-02 | Phase 36 | Pending |
| DEBT-03 | Phase 36 | Pending |
| DEBT-04 | Phase 36 | Pending |
| DEBT-05 | Phase 36 | Pending |
| WX-01 | All v1.3 phases | Complete |
| WX-02 | All v1.3 phases | Complete |
| WX-03 | All v1.3 phases | Complete |
| WX-04 | All v1.3 phases | Complete |
| WX-05 | All v1.3 phases | Complete |
| WX-06 | All v1.3 phases | Complete |
| WX-07 | All v1.3 phases | Complete |

**Coverage:**
- v1.3 requirements: 45 total (38 phase-specific, 7 cross-cutting)
- Mapped to phases: 45
- Unmapped: 0 ✓

---
*Requirements defined: 2026-11-12*
*Last updated: 2026-11-12 after roadmap creation (Phases 30-36)*
