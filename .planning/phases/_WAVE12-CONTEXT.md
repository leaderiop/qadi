# Wave 12 (v1.7): shared context for Phases 62–68

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the XC-05
mutation procedure all apply. **This file overrides only what it names:** the source, the base commit, the numbering, the
owner decisions and the per-phase evidence below.

**Source:** the v1.6 milestone audit's tech debt (`.planning/milestones/v1.6-MILESTONE-AUDIT.md`, frontmatter
`tech_debt:`, 13 items in 6 groups), investigated on 2026-11-20 at `8b22bd66`. Two probes were run that day and their
results are recorded below, because the probe files were deleted afterwards. The milestone resolves every one of the 13
items, either with a change or with a recorded decision; none is carried forward again.

**Base commit:** `8b22bd66`, the head of `arch-wave-11` after v1.6 was archived (not merged, not released). Branch
`arch-wave-12`, stacked on `arch-wave-11`. Each phase's base is its first commit's parent; that rule is unchanged from
`_SHARED-CONTEXT.md`.

## Owner decisions (asked once, 2026-11-20; locked)
- **D1 (Phase 64):** a throwing `subscribe` listener in devtools' `ExternalStore` no longer stops the others. Every
  listener is called; one error is rethrown as-is after the loop, several as one `AggregateError`. Nothing is swallowed.
- **D2 (Phase 66):** the hydration payload (`HydrationEngine.ts`) keeps `unknownKeys: "refuse"`. ADR-QD-170's D-09 report
  is resolved by recording why (same-build, version-checked payload; strict refusal catches tampering). No behaviour change.
- **D3 (Phase 68, defaulted to the recommendation; the owner did not object):** port cards (`PortCards.ts`) stay
  package-private. An ADR-QD-173 amendment records the reason and how a headless consumer derives the same view from the
  timeline feed. No new public API.
- **D4 (Phase 66):** `UntrustedDecode.ts`'s `project` is changed so its doc claim becomes true: it reads only the
  declared keys (and the `_tag` its `keysOf` needs), so an undeclared accessor is never invoked. Not a wording-only fix.
- **D5 (Phase 67):** the two surviving equivalent mutants are restructured away. No `// Stryker disable` convention is
  introduced (there are none in `packages/*/src` today).

## Execution order
Phases run strictly one at a time, in numeric order (62 → 68): every records plan edits the same spec registers, and
`use_worktrees` is false.

1. **62 first:** every later phase adds type pins, which must be written in the corrected form.
2. **63 next:** 62 and 63 together protect what v1.6 ships, so the v1.6 PR may be cut after 63 if the owner asks.
3. **64–67:** behaviour, admission, decoder, mutation robustness. 65 and 66 touch core hot paths; each has its own bench.
4. **68 last:** it re-wraps lines that 64–67 could otherwise shift again.

## Numbering reserved for v1.7
Next free on `8b22bd66`: ADR-QD-175, CCR-QD-453, BEH-QD-646, INV-QD-369. The highest ARCH id is ARCH-108.

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 459, ADR 181, BEH 680, INV 382 on 2026-11-20.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …"). A phase that needs no new ADR (an amendment
  of an existing one suffices) leaves its ADR number unused and says so.

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 62 | 109 | 175 | 453 | 646–650 | 369–370 |
| 63 | 110 | 176 | 454 | 651–655 | 371–372 |
| 64 | 111 | 177 | 455 | 656–660 | 373–374 |
| 65 | 112 | 178 | 456 | 661–665 | 375–376 |
| 66 | 113 | 179 | 457 | 666–670 | 377–378 |
| 67 | 114 | 180 | 458 | 671–675 | 379–380 |
| 68 | 115 | 181 | 459 | 676–680 | 381–382 |

ADR Document IDs must equal the file number (gate 10).

## Per-phase evidence

### Phase 62: Type pins that can fail (ARCH-109) — audit item 60b, upgraded
- **Probe 1 (confirmed):** in this repo (tstyche 7.2.5, TypeScript 6.0.3, `tsconfig.test.json`),
  `expect(f).type.not.toBeCallableWith(args)` **passes whenever `f` returns an `Effect`, even for valid `args`**. Probed
  with `(o: { environment?: string; capacity?: number }) => Effect.Effect<number>` and `{ capacity: 10 }`, and with
  `(n: number) => Effect.Effect<number>` and `1`: both negative pins passed. The same pin on a plain-return function failed
  as it should.
- **So `packages/core/test/DecisionLog.tst.ts:30`** (`expect(makeDecisionLog).type.not.toBeCallableWith({ capacity: 10 })`)
  cannot fail: making `environment` optional would leave it green.
- **Scale:** 86 `not.toBeCallableWith` pins in 27 `*.tst.ts` files (`packages/{core,audit,devtools,http,promise,react}/test`).
- **Probe 2 (flip):** turning all 86 into `toBeCallableWith` made 81 fail. That does **not** clear those 81: a negative
  pin on an Effect-returning function that is genuinely not callable also flips to failing, yet the negative can never
  fail. Classification must be by the subject's return type (Effect or not), with a positive control per remaining pin.
- **Known workarounds already in the repo:** `PortAccess.tst.ts` header (~lines 6, 35) and `Qadi.tst.ts:171` use
  `Parameters<…>` for exactly this reason; `DecisionCache.tst.ts` (Phase 61) uses `Params<F>`. Phase 60 IN-02 used
  `@ts-expect-error` pins in `DiagnosticsStore.tst.ts`. These are the replacement patterns.
- **Required:** a committed characterisation `.tst.ts` that pins tstyche's behaviour (the known-wrong control), every
  vacuous pin rewritten and broken once by hand to show it fails, and a durable gate: a `NOT_CALLABLE_PIN_BUDGET` in
  `scripts/check-house-style.mjs` (exact per-file counts, both directions, like `UNTRACED_BUDGET`) plus its AGENTS.md §6
  paragraph. Remaining `not.toBeCallableWith` uses are allowed only on plain-return subjects, each with a positive control.
- An upstream tstyche issue is **not** filed without the owner's explicit OK (it posts outside).
- Tests and gate only; no changeset.

### Phase 63: The packed-install gate probes every new public name (ARCH-110) — audit item I-a
- `scripts/check-package-install.mjs` (merge gate 14) imports from `@qadi/devtools` only
  `emptyTimeline, ingest, makeTimelineFeed, sourceFromRecords, verdictOf` (line ~425) and runs `makeTimelineFeed` once
  (line ~507, fixed `Effect.yieldNow` turns, no clock). `makeGatesFeed`, `makeDiagnosticsFeed` and the type-only
  `DecisionCacheShape` (`@qadi/core`) are never compiled through the packed `exports` map.
- Required: probe all three (gates feed over an empty registry; diagnostics feed with an immediate schedule; a typed host
  cache that wraps `decisionCacheLayer()` plus a `@ts-expect-error` for the pre-0.13 `(question, compute)` shape),
  deterministic, no wall clock; and a derived guard: the script fails if any `make*Feed` root export of `@qadi/devtools`
  is absent from its consumer source. A deliberately removed probe must fail the gate.
- Script only; DoD table unchanged (same command); no changeset.

### Phase 64: One throwing listener cannot silence the rest (ARCH-111) — audit item 60a, D1
- `packages/devtools/src/model/ExternalStore.ts:34-36`: `const notify = () => { for (const listener of listeners) listener(); };`
  The first throw stops the loop and later listeners (including the React dock's `useStoreSnapshot`) are never called.
- 13 importers in `packages/devtools/src`: `TimelineFeed`, `GatesFeed`, `DiagnosticsFeed`, `DiagnosticsStore`,
  `DockModel`, `DockSession`, `SimulationSession`, `ExplorerSession`, `HeldChoice`, `TimelineStore`, `react/ServicesPanel`,
  `react/QuestionsPanel`, `react/useStoreSnapshot`.
- Phase 60 (WR-03) documented "a listener must not throw" on each feed's `subscribe`, in the devtools README and the
  "a feed that stops says so" line; those texts change with D1. Also check spec 28's fence and the website devtools page.
- RED first: L1 throws → L2 still called; two throw → `AggregateError` with both; none throw → unchanged; unsubscribe
  during notify still safe. The dock's `*.characterisation.test.tsx` files must pass unedited.
- Records: BEH amendment (BEH-QD-636 area, spec 28) and a new INV; `@qadi/devtools` patch changeset.

### Phase 65: Only `admit` builds an `Admitted` (ARCH-112) — audit items 59a, 59b
- `packages/core/src/Admission.ts`: `export class Admitted<Source extends RowSource = RowSource>` (line ~81) has a public
  constructor; `admit` (line ~97) calls `new Admitted(rowSource, question.policy, question.subject,
  SUPPLIED[rowSource](question), { subject, subjectId, resource: question.resource, action }, question.maxDepth, …)`.
- 59a: `SUPPLIED[rowSource](question)` and `matcherContext.resource` both read `question.resource` separately; agreement
  is pinned only by tests (E1–E5, `LeafMatrix.test.ts`). Derive the flag from the matcher context so they agree by
  construction.
- 59b: private constructor; `admit` becomes the class's static method and `export const admit = Admitted.admit`, so
  `Walk.ts:878` (`admit(question, "asked")`) is unchanged. No test does `new Admitted` today (checked 2026-11-20).
  Pin with a `@ts-expect-error` construction (not `not.toBeConstructableWith`, see Phase 62).
- Bench gate: Phase 59's harness and bands, 3 + 3 interleaved against the phase base, on the committed source.
- Records: ADR-QD-172 amendment; INV; no changeset (`Admitted` is package-private, ADR-QD-099).

### Phase 66: The decoder reads only what it declares; hydration's policy recorded (ARCH-113) — audit items 57a, 57b, D2, D4
- 57b / D4: `packages/core/src/UntrustedDecode.ts:166` documents `project` as "It reads no value, so it cannot recurse",
  but `Object.entries(input)` (line ~171) invokes every own enumerable getter, declared or not, before `keysOf` filters.
  True for `JSON.parse` output; false for the in-process values the `decodeSinkRecord` family accepts. The same sentence
  is in ADR-QD-170 D-19. RED: an in-process object with an undeclared throwing getter, decoded under `"ignore"`, throws
  today. Hot path: a decode micro-bench before/after; Stryker on `UntrustedDecode.ts` and `EnvelopeKeys.ts` (mind
  `ignoreStatic`, see Phase 57 RESEARCH §pitfalls). `UNTRUSTED_DECODE_BUDGET` counts must stay consistent.
- 57a / D2: `HydrationEngine.ts` keeps `unknownKeys: "refuse"`; an ADR-QD-170 amendment resolves the D-09 report.
- Records: ADR-QD-170 amendment(s), INV; `@qadi/core` patch changeset for the D4 change (in-process accessor no longer invoked).

### Phase 67: No equivalent mutants, no magic race bound (ARCH-114) — audit items 61a, 61b, D5
- `packages/core/src/DecisionCache.ts:287`: `if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);`
  The comment above it (lines ~278-284) says the loop condition guarantees non-empty, so the guard's mutant is equivalent.
  Restructure so no impossible-empty branch exists.
- `packages/core/src/SharedComputation.ts:319`: `return { _tag: "Claimed", entry };` survives because the only check is
  `claimed._tag === "Hit"` (line 322). Dispatch with `Match.tagsExhaustive` (or an equivalent closed dispatch) so the tag
  matters. `SharedComputation.ts` is not in `SWITCH_BUDGET`; no new `switch`.
- `packages/core/test/DecisionCache.test.ts:1250`: `for (let gap = 0; gap <= 48; gap++)` depends on `walk`'s step count.
  Replace with "iterate until both orderings were observed, cap 512, assert both seen".
- Phase 61 scores: `DecisionCache.ts` 0.977, `SharedComputation.ts` 0.986, `Lifecycle.ts` 1.000. None may drop.
- Records: CCR; no changeset unless behaviour changes (it should not).

### Phase 68: Hygiene and recorded close-outs (ARCH-115) — audit items 58a, 58b, 61c, 61d, I-b
- 58a: over-width lines. Measured 2026-11-20: `packages/core/src/SinkCodec.ts:616` (137 chars),
  `features/features/decision-log/decision-log.steps.test.ts:197` (135 chars); `DecisionLog.ts:215` has moved (now 55
  chars; the file has 5 lines over 100), so locate by content from 58-REVIEW IN-02. Phase 58's mutant ids are archived,
  so re-wrapping is free; re-run Stryker on touched files.
- 58b: `packages/devtools/test/model/Source.test.ts:291` title "never stamped" → "never given a label";
  `packages/core/test/StoredEnvelope.test.ts` header (lines 1-14) and the N1-N4 "RED on the base" title (a pinned
  characterisation file: this is its one recorded edit); confirm `DecisionLog.ts` `ingest` doc names the uncontained
  defect path (ADR-QD-171), add if missing.
- 61c: `spec/decisions/174-a-decision-cache-is-asked-the-question.md` line 73 is 189 chars; re-wrap, `spec-revise` bump.
- I-b / D3: ADR-QD-173 amendment (port cards stay private; derive from the timeline feed).
- 61d: prove `packages/devtools/test/react/Simulator.test.tsx`'s Phase 61 diff is comments-only (strip comments, diff
  empty) and record it in the Phase 61 archive. The archived `61-scan.mjs` is not edited.
- Records: CCR; spec revisions; no changeset.
