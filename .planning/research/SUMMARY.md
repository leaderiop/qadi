# Project Research Summary

**Project:** Qadi, milestone v1.3 "Arch Wave 8" (Phases 30-36)
**Domain:** Effect v4 authorization library (pnpm monorepo); architecture deepenings, no new features
**Researched:** 2026-11-12 (base `aab87576`, HEAD `b8b19f6c`, branch `arch-wave-8`)
**Confidence:** HIGH overall; Phase 35 is MEDIUM-LOW (mechanism unproven, spike mandatory)

## Executive Summary

Wave 8 is six architecture deepenings plus spec debt, each restating one rule in one place. It adds no dependency and no version bump: every API needed ships in the installed `effect@4.1.2` and `@effect/atom-react@4.1.2`. Phases 30-33 are core (strict decode, shared-computation reset, options/services leaf, sealed evaluation layer). Phase 34 is devtools (diagnostics as the dock model's seventh store). Phase 35 is the one speculative react phase (atom set owns its eviction sweep). Phase 36 is spec debt, and it must run last because it corrects whatever 30-35 leave stale. Execution is strictly serial, 30 to 36, because every phase edits the same spec registers.

The recommended approach is behaviour-preserving at every public boundary. Move declarations, do not remove public names. Keep each seam's own refusal mapping, and make the shared module hold only the order of operations. Write characterisation tests on the phase base before moving code, and add tests at the new seam before deleting old ones. This protects both the mutation-score rule (no touched file falls) and the invariants that only exist as pins today.

The main risks are:
- **Phase 30:** a one-shot decode helper that flips refusal precedence at the sink and hydration seams, or widens a public closed union (`ArchiveRefusal`, `DecodeRefusal`).
- **Phase 31:** conflating "superseded" with "abandoned", so waiters hang or a stale claim writes the cache.
- **Phase 33:** silently changing whether `@qadi/testing` shadows the sink and cache.
- **Phase 34:** a poll defect that stops the panel without a trace, and an Activity re-show that blanks the reading.
- **Phase 35:** repeating CCR-QD-150's dropped render, which only the e2e suite catches.
- **Phase 36:** deleting the wrong copy of the duplicated BEH-QD-219..221, which would reinstate fail-open text.

## Key Findings

### Recommended Stack

No new dependency. Everything is read from installed source. `madge@8.0.0` stays the cycle gate. Two facts constrain design. madge counts type-only edges (verified), so `import type` is never a cycle workaround. madge sees only relative imports, so cross-package cycles are the TypeScript project references' job.

**Core technologies (all installed):**
- `effect/Schema` decoders (`decodeUnknownResult`, `Effect.fromResult`): Phase 30 core is a sync `Result` over a closed `Data.TaggedEnum`, with `Effect` and `Option` adapters at the edges. A schema-issue-only cause is converted; a stack-overflow `RangeError` is a defect and throws, so "guard first, decode second" is load-bearing and never wrapped in `Result.try`.
- `HashMap`, `Deferred`, `Fiber` (existing `SharedComputation` state): Phase 31 is a flag flip over existing state, no new primitive.
- `FiberHandle.runtime` plus `Schedule.spaced`: Phase 34 poll on a second handle in the model's scope. Restart is synchronous via `setUnsafe`, stop is a fork of `Effect.void` (the `NO_SOURCE` idiom).
- `AtomContext.mount`/`addFinalizer`, `Effect.runFork`, `Effect.yieldNow`: Phase 35 spike inputs. `runFork` runs synchronously to the first yield, so any sweep started from `live()` or `release` must begin with `yieldNow`.

### Expected Features

"Features" here are behaviours that must survive, behaviours that change, and what is table stakes, differentiator or anti-feature per phase.

**Must have (table stakes):**
- **P30:** one public leaf in `@qadi/core` owning "(parse) -> depth guard -> (prepare) -> strict decode", returning a closed refusal. `Malformed` carries the `SchemaError`. `MAX_DECODE_DEPTH` stays 256. Depth tests at every seam (closes gaps G1 port wire, G2 hydration envelope, G3 `PolicyFromJson`).
- **P31:** `reset` makes every forgotten claim stop settling while still answering its waiters. `generation` is deleted from `DecisionCache`. `clear` is three steps. A new BEH sentence states the staleness rule.
- **P32:** `EvaluateOptions`, `EvaluationServices` and `StandingEvaluationServices` each declared once. `LifecycleOptions` and the hand-spelled union are deleted. All three names stay on the `@qadi/core` root.
- **P33:** one builder in core; the shadowing rule stated in INV-QD-042 and in the doc of both layers.
- **P34:** `DockModelInputs` gains `diagnostics` and `reading`. Per-field identity dispatch. The poll runs on a `FiberHandle`. The merged reading is a model store. Three snapshot hooks collapse into one. Public `useDiagnostics` stays as an adapter.
- **P35:** a spike, with "keep it in the provider, state and test the rule" as a valid recorded outcome.
- **P36:** reconstruct BEH-QD-219..221 in `29-devtools-simulator.md`, fix `traceability.md:71` (`Sources.ts` to `Source.ts`), strike two stale replay lines, and sweep the info items that are still true at the phase base.

**Should have (complete choice, user prefers complete over simple):**
- P30: house-style rule refusing `UNTRUSTED_DECODE_OPTIONS` outside the leaf (confirm in discuss-phase).
- P31: property test over `run`/`reset`/settle/leave interleavings (optional, MEDIUM).
- P33: conformance test that review and simulation agree on ids, clock and fail-closed ports; re-point `core/test/helpers.ts` at the builder.
- P34: `useDiagnostics` as a thin adapter over the same scoped feed.

**Defer / anti-features:**
- Lifting the audit guard to the whole bundle (changes `ArchiveRefusal` for a deep entry).
- A message-only `Malformed` (regresses `ExplorerSession.formatDecodeFailure` and `fromJson`'s `SchemaError` channel).
- Shadowing sink/cache in `qadiReviewLayer`.
- Touching `decide`/`evaluate`/`permitted` (ADR-QD-104).
- `scheduleTask`/`defaultIdleTTL`, any module-scope timer or `setInterval`, sweep-on-`open`.
- Re-baselining a mutation score instead of killing a survivor.
- Editing historical CCR rows.

### Architecture Approach

Three new type or logic leaves appear in core, all below their consumers so `pnpm circular` stays green: `UntrustedDecode.ts` (imports `DecodeDepthGuard.ts` and `effect/*` only), `EvaluationServices.ts` (type-only; imports `CurrentSubject`, `EvaluationId`, `Ports`), and `SealedEvaluation.ts` (imports `DecisionSink`, `DecisionCache`, `EvaluationId`, `Ports`, `EvaluationServices`). Reachability was checked: `Ports.ts`, `CurrentSubject.ts` and `EvaluationId.ts` do not reach `Question.ts`, `Evaluate.ts` or `Lifecycle.ts`. Anything another package must call has to be on the `@qadi/core` barrel (ADR-QD-099), so the strict-decode leaf and the sealed layer are public additions (core minor). ADR-QD-116 is the precedent for moving a public name without re-exporting from its old module.

**Major components:**
1. `UntrustedDecode.ts` (P30): `untrustedDecoder(schema, { maxDepth?, unwalked?, prepare? })` returning `{ decode, decodeText }`. The guard cannot be skipped because `decode` is the only way in.
2. `SharedComputation.ts` / `DecisionCache.ts` (P31): the module owns the supersede rule; the adapter keeps only entries and insertion order.
3. `Question.ts` + `EvaluationServices.ts` (P32): options beside `QuestionOptions`, services in a type-only leaf.
4. `SealedEvaluation.ts` (P33): ports, id prefix, injected clock layer, explicit shadowing argument.
5. `DockModel.ts` + `DiagnosticsStore.ts` (P34): a scoped diagnostics feed as the seventh store; `DiagnosticsDockOptions` moves into the model and `useDiagnostics.ts` re-exports it.
6. `QadiAtoms.ts` / `QuestionBook.ts` / `QadiProvider.tsx` (P35): a qadi-owned sweep trigger outside the registry's synchronous dispose-reread window.

### Critical Pitfalls

1. **One-shot decode flips refusal precedence (P30).** The sink guards, then checks the version, then projects the envelope, then decodes. Hydration guards `{...payload, entries: []}`, then checks the version, then decodes per entry. Keep `prepare` and `unwalked`; run a characterisation table on the base first (rows: not JSON, too deep, deep AND wrong version, wrong version, extra envelope key, excess key, valid).
2. **Re-implementing the depth walk or catching throws (P30).** INV-QD-096 requires the outbound `wireHazard` count to equal `exceedsJsonDepth`. No `try/catch` or `Result.try` around schema decode (only around `JSON.parse`). Do not touch the encode half.
3. **Reusing `abandoned` as-is for `reset` (P31).** Superseded claims still have waiters to answer, and still get interrupted if the last waiter leaves. Skip-settle must stay inside the same synchronous `onExit` step. `forget` stays identity-checked. `reset` must flag every in-flight claim.
4. **Silent shadowing change (P33).** The innermost provide wins, so a review layer that shadows hides a caller's outer sink. The rule must be an explicit required argument.
5. **A diagnostics poll that dies invisibly or re-polls (P34).** `FiberHandle` swallows a poll defect into its deferred. `configure` must compare four fields individually, or an inline literal rebuilds the host layer every render. The builder runs under `Effect.runSync`, so it must fork and never await.
6. **Dropped render from scheduler coupling (P35).** Only the e2e (`pnpm example`) catches it; unit tests do not.
7. **BEH-QD-219..221 is a corrupted splice, not two copies (P36).** Copy 1 has the current text but a change-history fragment at line 173. Copy 2 has the intact tail but the pre-ADR-129 fail-open text. Reconstruct by hand.

## Disagreements Between Research Files, Settled

| Question | Positions | Recommendation |
|----------|-----------|----------------|
| **P31:** reuse `abandoned` or a separate state | STACK: rename/widen the one flag, mechanics identical. ARCH: rename to `dropsExit`/`superseded`. FEATURES: consider a separate flag. PITFALLS: separate state, because the two facts differ | **Reuse the mechanism, not the flag.** Add a separate `superseded` boolean. `onExit` settles only when `!abandoned && !superseded`; `Deferred.done` and the last-leaver interrupt are untouched, so waiters are always answered. `reset` walks `HashMap.values(inFlight)` flagging every claim, then swaps the table, in one synchronous step. Keep the `claim` hook shape (ARCH's `settle(key, exit)` change touches about twenty tests for one allocation; revisit later). Add seam tests (stale-last, stale-first plus third-ask coalescing, two keys, parked-uninterruptible) before deleting `generation`. |
| **P32:** where `EvaluateOptions` lives | ARCH/FEATURES: in `Question.ts` beside `QuestionOptions`. STACK/PITFALLS: a new leaf, to keep `Question.ts` light | **`EvaluateOptions` in `Question.ts`.** It needs only `QuestionOptions` and `effect/Types`, so it adds no heavy edge, and it sits beside the classification test (`Question.test.ts`). **`EvaluationServices` and `StandingEvaluationServices` go in a new type-only leaf `EvaluationServices.ts`.** Putting the services in `Question.ts` would hang it on `Ports.ts`' roughly 41-module closure. No re-export from `Evaluate.ts` (ADR-QD-116), unless TS2883 forces a named re-export. Gate 13 checks names only, so update the `spec/overview.md` module column by hand. |
| **P30:** one call vs guard + decode with `unwalked`/`prepare` | PITFALLS: two steps (guard, then pre-bound decode). ARCH: one `untrustedDecoder` with `unwalked`/`prepare`. STACK: Result core, `maxDepth` as a parameter | **One entry (`untrustedDecoder`) with `maxDepth`, `unwalked` and `prepare` options.** This meets the PITFALLS concern, because `prepare` runs between guard and decode (sink version and projection) and `unwalked` replaces hydration's `{...payload, entries: []}` workaround. A guard-only export would let a new seam skip the guard, which is the defect class. Order is fixed: guard, prepare, decode. `exceedsJsonDepth` stays the single walk and stays public. |
| **P30:** audit `TooDeep` mapping | PITFALLS: widen `ArchiveRefusal` (full closed union) or map to `Malformed`. ARCH: map, do not widen. FEATURES: keep per-entry attribution | **No widening of any public union.** Use `unwalked: ["entries"]` on the envelope and `["record"]` on the row. A deep entry stays `EntryNotDecodable({ index, refusal: TooDeep })` via `decodeSinkRecord`. Envelope or row `TooDeep` and `Malformed` map to the existing `ArchiveRefusal.Malformed`. FEATURES C1 shows audit is already guarded transitively, so the "behaviour change" is vacuous. `recordJsonOf` stays outside the module with its deliberate default options. |
| **P30:** `PolicyFromJson` (public, unguarded, gap G3) | Only FEATURES found it | **Document it as unguarded, with a pointer to `fromJson`, in its doc and the spec. Do not guard or deprecate.** Guarding changes its type; deprecation is churn. Open it as a checkpoint. `Policy.fromJson` keeps its fallback through `PolicyFromJson` for malformed text, because the public error channel is `PolicyDecodeTooDeep \| SchemaError` and the 60,000-deep malformed test pins it. |
| **P30:** where the constants go | ARCH: move to the leaf, no re-export. STACK/PITFALLS: `Policy.ts` may re-export | **Move `MAX_DECODE_DEPTH` and `UNTRUSTED_DECODE_OPTIONS` to the leaf and keep both exported from the `@qadi/core` root. No re-export from `Policy.ts`.** Pin `MAX_DECODE_DEPTH === DEFAULT_MAX_DEPTH * 4` in a test. Port-wire sentences stay seam-local and byte-identical. |
| **P33:** clock | ARCH: core uses `"live" \| "deterministic"` and imports `TestClock`. STACK/PITFALLS: no `TestClock` in core | **Core takes the clock as an already-built `Layer`.** Each package keeps its own public vocabulary (`"test"` for review, `"deterministic"` for simulation) and its own `clockLayer`. Core stays free of `effect/testing`. |
| **P33:** shadowing shape | ARCH: two functions. PITFALLS: required explicit argument | **One builder with a required closed-union argument** (user preference: closed union). Review passes "none", simulation passes "sink and cache". Review does not shadow (see decision below). |
| **P35:** mechanism | ARCH ranks edge-triggered deferred sweep first. STACK ranks a book-level self-terminating fiber first. FEATURES ranks a layer-scoped periodic fork first and rejects sweep-on-`open` | **Spike order: (1) edge-triggered deferred sweep.** `QuestionBook` calls an injected `onPressure()` when over capacity after `open`, or on a release to zero while over capacity. The atom set coalesces calls behind a `pending` flag and forks `yieldNow` then `sweepEvictions`. No timer, no scope, works with no provider. **(2) a self-terminating book-level fiber** (starts on the first live question, ends itself when a tick finds nothing live or over capacity, never interrupted on the 1-to-0 edge). Use (2) only if (1) cannot cover cold entries after release. **(3) layer-scoped periodic fork last.** It inherits the registry's `Scheduler` (the thing §13 warns about), builds nothing for an unmounted atom set, and is per-registry. **Sweep-on-`open` is rejected** (it runs inside the dispose-reread window). **(4) keep it in the provider, state and test the rule,** is a valid recorded conclusion. |
| **P35:** `sweepIntervalMillis` | STACK/ARCH: an edge-triggered mechanism retires the interval; removal is Breaking | **Do not remove it this wave.** If (1) lands, keep the prop accepted and documented as superseded, and do not break its type. Removal is a separate Breaking decision (react minor plus an `upgrading.md` note). If (2) lands, move the interval to `QadiAtomsOptions` and keep the prop as an override. |

## Implications for Roadmap

Keep the given phases 30-36 in numeric order. Every plan edits `spec/overview.md`, `traceability.md`, the README CCR rows, behaviours/invariants and `.changeset/`, so execution is serial and `use_worktrees` stays false.

Standard per-phase record work applies to every phase (ADR/CCR/BEH/INV/traceability/overview prose/changeset). It is not repeated below. Each phase's first plan records per-file mutation base scores (same invocation as the close) and its last plan compares them.

### Phase 30: One strict-decode module for every untrusted JSON seam (ARCH-78, ADR-QD-143)
**Rationale:** Highest risk reduction. It closes G1-G3 and states the trust-boundary rule once. It goes first because it edits files that Phase 36 sweeps and the core barrel that 32 and 33 also touch.
**Delivers:** public leaf `UntrustedDecode.ts` (`MAX_DECODE_DEPTH`, `UNTRUSTED_DECODE_OPTIONS`, `UntrustedRefusal`, `untrustedDecoder`); seams re-pointed (`Policy`, `SinkCodec`, `PortWireEncode`, `PortRemote`, `HydrationEngine`, `AuditArchive`, `AuditEntry`); depth tests at every seam.
**Avoids:** pitfalls 1-5 and 28 (no `switch`, no new `Schema.TaggedError`, no `as`).
**Changesets:** core minor; react and audit patch.
**Plan order:** characterisation table (green on base) first, then the leaf and its property test, then core seams, then audit, then hydration (depends on the core export), then records.
**checkpoint:decision to open on:**
1. `PolicyFromJson` (recommend doc-only, not guard or deprecate).
2. Add a house-style rule refusing `UNTRUSTED_DECODE_OPTIONS` outside the leaf (recommend yes; it is a new rule, not a budget change).
3. Confirm no public union widening (audit maps to `Malformed`).
4. Confirm constants move without a `Policy.ts` re-export.

### Phase 31: A shared computation's reset supersedes its claims (ARCH-79, amends ADR-QD-132)
**Rationale:** Small, internal, no barrel or overview impact; it lowers risk before the larger 32 and 33. Independent of 30.
**Delivers:** `superseded` flag; `reset` flags all in-flight claims; `generation` and `myGeneration` removed; `clear` is three steps; BEH-QD-439 restated; a new BEH sentence under BEH-QD-190 (a stale answer never re-enters the cache, a post-clear ask claims afresh); INV-QD-025 Enforcement restated.
**Avoids:** pitfalls 6 and 7. `DecisionCache.test.ts:749-880` and the issue #64 pins stay unchanged and green.
**Changesets:** core patch. ADR-QD-144 likely unused.
**checkpoint:decision to open on:**
1. Separate `superseded` flag vs one flag (recommend separate).
2. Keep the `claim` hook shape vs `settle(key, exit)` (recommend keep).
3. Add the property test (optional differentiator).

### Phase 32: Evaluation options and services stated once (ARCH-80, amends ADR-QD-105 if anything)
**Rationale:** Low effort, feasibility verified. It should precede 33 so 33 imports from the new leaf once.
**Delivers:** `EvaluateOptions` in `Question.ts`; new `EvaluationServices.ts`; `LifecycleOptions` and the hand-spelled union deleted; `Lifecycle.tst.ts` reduced to one key-set assertion; the `traceability.md:470` row updated.
**Avoids:** pitfalls 8 and 9. Run `pnpm circular` after the first edit and `pnpm typecheck` (TS2883 appears in declaration emit).
**Changesets:** core patch. ADR-QD-145 likely unused.
**checkpoint:decision to open on:**
1. Leaf placement as settled above.
2. No re-export vs a named re-export if TS2883 appears.
3. ADR vs a revision note on ADR-QD-105.

### Phase 33: One sealed evaluation layer (ARCH-81, ADR-QD-146, amends ADR-QD-050 Rev 1.5)
**Rationale:** Small payoff (the real overlap is `evaluationIdSequential`, the clock layer and a `fixturePortsLayer` call). Its one real deliverable is the stated shadowing rule.
**Delivers:** `SealedEvaluation.ts` (public, core minor); `simulationLayer` and `qadiReviewLayer` consume it; INV-QD-042 Source updated; a thin devtools test that it is wired; the `"sim"` id prefix now asserted.
**Avoids:** pitfalls 10-12 and 28. Test-scope budgets apply: read metrics by export, never by a `qadi_*` literal, and script a broken port with `scriptedPort`.
**Changesets:** core minor; testing and devtools patch.
**checkpoint:decision to open on:**
1. Does review shadow the sink and cache (recommend no).
2. Clock via an injected layer (recommend yes).
3. Single builder with a closed union.
4. Re-point `core/test/helpers.ts` at the builder.

### Phase 34: Diagnostics as the dock model's seventh store (ARCH-82, amends ADR-QD-047 Rev 1.13)
**Rationale:** Completes ARCH-74's stated rule. Independent of 30-33 (devtools only). It must precede 36 because it resolves 26 IN-01 and edits `DevtoolsDock.tsx` and `DockModel.test.ts`.
**Delivers:** `DockModelInputs.diagnostics` and `.reading`; per-field dispatch; second `FiberHandle`; merged-reading store computed on input change and never inside `getSnapshot`; `DiagnosticsDockOptions` moved to the model with `useDiagnostics.ts` re-exporting; one `useStoreSnapshot`; BEH-QD-465 (seven stores) and BEH-QD-323 restated.
**Avoids:** pitfalls 13-18. Model tests run under `TestClock` inside `it.effect`, with `settleTurns` before each `adjust`.
**Changesets:** devtools patch. ADR-QD-147 likely unused. `DockModel.ts` mutation base is 100.
**checkpoint:decision to open on:**
1. Reading across a hidden `<Activity>` (recommend accept the reset, state it in the ADR-047 amendment and check it in a real browser).
2. `diagnostics` going `undefined` then defined again (recommend reset to `noDiagnostics`, pin it).
3. Poll defect visibility (recommend a visible failed state, with a test using a throwing `questions` thunk).
4. Accept the poll starting one render later.

### Phase 35: The atom set owns its eviction sweep (ARCH-83; ADR-QD-148 only if a mechanism lands)
**Rationale:** Speculative, so it follows the deterministic phases and precedes 36. It opens on a spike. "Keep it in the provider, state and test the rule" is a successful outcome, recorded as a CCR with ADR-QD-148 unused.
**Delivers:** the spike conclusion with evidence; if a mechanism lands, the limit holds with no provider, observable from a bare `AtomRegistry.make()` graph test.
**Spike pass criteria:**
- The `v4-reactivity-smoke` dispose-reread test passes with the new trigger active.
- The existing `QadiAtoms.test.ts` sweep-across-invalidation pins pass.
- The `examples/nextjs-newsroom` e2e (`pnpm example`, about 30 tests) passes unchanged. It needs Playwright; use CI or the container route if the host lacks it.
- Two providers or registries over one atom set produce no unbounded sweeps.
- StrictMode or hidden-Activity double builds start no second sweeper.
- A leak test (many atom sets, no running fibers, process exits).
- `QadiProvider.test.tsx:340-345` ("stays over the bound after unmount") is reconciled, not ignored.
- No `scheduleTask` or `defaultIdleTTL`, and the sweep never runs from the render path.

**Avoids:** pitfalls 19-21.
**Changesets:** react minor if the interval option moves; Breaking only if the prop is removed (not recommended).
**checkpoint:decision to open on:**
1. Spike order and the stop rule (recommended order above; stop at the first mechanism that passes every criterion).
2. Fallback acceptance criteria for concluding "keep it in the provider".
3. Fate of `sweepIntervalMillis`.
4. AGENTS.md §13 and CCR-QD-150 wording amendment (human-approved edit).

### Phase 36: Carried spec debt and stale records (CCR-QD-427, no ARCH, no ADR)
**Rationale:** Last, because 30, 33 and 34 edit the same files and rows (HydrationEngine for 29 IN-01, `traceability.md:71` and INV-QD-042, `DevtoolsDock.tsx` and `DockModel.test.ts`), and 36 corrects stale prose they create. Re-verify every item at its base before touching it.
**Delivers:**
- BEH-QD-219..221 reconstructed in `29-devtools-simulator.md`: keep copy 1's requirement text (BEH-QD-411), copy 2's intact tail prose after reconciling its first sentence with ADR-QD-129, move the spliced 1.0-1.2 history back to the header, delete the second block, then run `spec-revise.mjs ... --date ... --check`.
- `traceability.md:71` `Sources.ts` to `Source.ts`.
- The two stale replay lines (`PROJECT.md:225`, `MILESTONES.md:76`).
- Wording items still true at base.
- 24 IN-01 and IN-03 as real, tested code changes.
- 28 IN-06 narrowed to the identity-changing rerender gap.

**Drop or verify:** drop 26 IN-01 (34 resolves it). Re-verify 26 IN-02 and IN-03 after 34, 29 IN-01 after 30, and 24 IN-02 (history, exempt per AGENTS.md §15).
**Avoids:** pitfalls 22 and 23. Gates are silent about which BEH-29 copy is kept, so review it as a diff.
**checkpoint:decision to open on:**
1. Which info items are in scope after re-verifying.
2. Whether the 24 IN-01 code split is in scope (recommend yes; it is tested and unobservable).
3. 28 IN-06: narrow or drop.
4. Confirm no CCR/ADR numbers are minted (use the reserved CCR-QD-427 only).

### Cross-phase ordering edges

| Edge | Strength | Reason |
|------|----------|--------|
| 30 -> 36 | hard | 36 corrects prose that 30 creates; 29 IN-01 is in `HydrationEngine.ts`, which 30 edits |
| 32 -> 33 | soft | 33's module imports `StandingEvaluationServices` from the leaf 32 creates; names are public either way |
| 33 -> 36 | hard | both edit `traceability.md:71` and INV-QD-042; 33 must land first |
| 34 -> 36 | hard | 34 resolves 26 IN-01, edits `DevtoolsDock.tsx` (26 IN-02) and `DockModel.test.ts` (26 IN-03) |
| 35 -> 36 | ordering | 36 re-verifies anything 35 touches in spec |
| 31, 34, 35 vs 30/32/33 | none | no shared source files; 31 only calls `decisionCacheLayer()` in 33 |
| All | serial | shared spec registers; this is the reason, not code |
| 30 -> react/audit seams | internal | within 30, hydration and audit plans depend on the core export |

Run `pnpm circular` after the first source edit of Phases 30, 32 and 33.

### Research Flags

Phases likely needing deeper research or a spike during planning:
- **Phase 35:** mechanism unproven; a spike is mandatory, with the e2e as an exit criterion.
- **Phase 34:** needs `/gsd-plan-phase --research-phase` only for the poll-defect behaviour in `FiberHandle` and the Activity decision; the mechanics are otherwise verified.
- **Phase 30:** the exact `prepare` typing for `SinkCodec` and the double-walk cost (measure once) are small research items. The design itself is settled.

Phases with standard patterns (skip research-phase):
- **Phase 31:** the mechanism is existing state and is fully read.
- **Phase 32:** feasibility verified empirically with madge.
- **Phase 33:** one decision, no unknown API.
- **Phase 36:** pure verification and edit work; the risk is reconstruction care, not research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Read from installed `effect@4.1.2` and the repo tree; madge run empirically. Phase 35 APIs are verified, but their composition is not yet run |
| Features | HIGH | Every claim read at HEAD; it corrected nine claims in `_WAVE8-CONTEXT.md` (C1-C9). Phase 33 and 35 recommendations are hypotheses |
| Architecture | HIGH for 30, 31, 32, 34; MEDIUM for 33; LOW-MEDIUM for 35 | Import layering checked with `madge --json`; Phase 35's mechanism is argument, not measurement |
| Pitfalls | HIGH for repo mechanics; MEDIUM for 34 and 35 runtime behaviour | Argued from source and waves 5-7 records, not yet exercised |

**Overall confidence:** HIGH, except Phase 35.

### Gaps to Address

- **Phase 35 mechanism:** unproven. Settle it in the spike. The Playwright e2e may not run on the host.
- **Phase 34 Activity reset and poll-defect surfacing:** consumer-visible. Decide at the checkpoint and confirm the re-show blank in a real browser (human check, as in the v1.2 audit).
- **Phase 30 double walk:** hydration (entry then policy) and sink/audit (record then row) walk twice. Measure once; do not drop the guard.
- **Phase 33 shadowing:** the recommendation (review does not shadow) has no test pinning it today. Add the outer-sink and outer-cache tests in the phase.
- **Gate 13 and the module column:** gate 13 checks export names, not the overview's module column. Moves in 30, 32 and 33 need hand edits to `spec/overview.md`.
- **Numbering:** reserved block is CCR 421-427, ADR 143-148, BEH 486-520, INV 305-318. Never run `node scripts/next-id.mjs`. Unused reservations (likely ADR-QD-144, 145 and 147, plus 148 if Phase 35 concludes keep-in-provider) are named "Unused:" in the phase's CCR row.
- **Website doc fences:** `pnpm check:pr` can skip the website typecheck (an interactive prompt hangs it). Run `pnpm spec:website-examples` explicitly for Phases 32, 33 and 35. Run `pnpm check:pr < /dev/null`.
- **Verification staleness:** Phases 30-33 touch files earlier verification reports cover; plan a re-verify at close and treat "stale" as re-run, not failed.
- **Process:** no release or version-packages merge; per-file mutation must not fall, and a drop is closed with a test, not a re-baseline.

## Sources

### Primary (HIGH confidence)
- `node_modules/effect/src/{Schema,SchemaParser,SchemaAST,FiberHandle,Effect,HashMap}.ts` and `reactivity/{Atom,AtomRegistry}.ts` (`effect@4.1.2`), plus `@effect/atom-react@4.1.2` source: decoder families, defect-versus-issue conversion, `FiberHandle` semantics, atom/registry lifetimes.
- Repo source at base `aab87576` and HEAD `b8b19f6c`: `packages/core/src/{Policy,DecodeDepthGuard,SinkCodec,PortWireEncode,PortRemote,SharedComputation,DecisionCache,Lifecycle,Evaluate,Question}.ts`, `packages/react/src/{HydrationEngine,QadiAtoms,QuestionBook,QadiProvider}`, `packages/audit/src/{AuditArchive,AuditEntry}.ts`, `packages/testing/src/QadiReviewLayer.ts`, `packages/devtools/src/{model,react}/*`.
- `madge@8.0.0` runs: the real tree (210 files, green) and a type-only cycle fixture; BFS reachability over `madge --json`.
- Project authority: `AGENTS.md`, `spec/` ADRs 037, 047, 050, 099, 105, 116, 129, 132; `spec/process/house-rules-evidence.md` section 4 (CCR-QD-150); `.planning/phases/_WAVE8-CONTEXT.md`, `PROJECT.md`, `STATE.md`, v1.2 milestone audit.

### Secondary (MEDIUM confidence)
- Waves 5-7 phase summaries and review dispositions (mutation `ignoreStatic`, `useScoped`/`Activity`, verification staleness).

### Tertiary (LOW confidence, needs validation)
- Phase 35 mechanism rankings (all three research files rank candidates differently; none is run end to end).
- Phase 33 shadowing recommendation (argued from Effect's provide semantics, not pinned by an existing test).

Detail lives in `/Users/mohammadalmechkor/Projects/Perso/qadi/.planning/research/{STACK,FEATURES,ARCHITECTURE,PITFALLS}.md`.

---
*Research completed: 2026-11-12*
*Ready for roadmap: yes*
