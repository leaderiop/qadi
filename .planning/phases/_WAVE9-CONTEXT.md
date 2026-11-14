# Wave 9 (v1.4): shared context for Phases 37–42

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and XC-05
mutation procedure all apply. **This file overrides only the items it names:** source review, base commit, numbering, and
the per-phase evidence below.

**Source review:** 2026-11-14 architecture review,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/16926f1e-64de-452f-bf60-d41917101ad8/scratchpad/architecture-review-20261114.html`
(local and session-scoped, so it may be gone; this file holds everything a planner needs from it). Checked against
ARCH-01…83 and `spec/decisions/` up to ADR-QD-149.

**Base commit:** `637c0601` (`main`, v1.3 Arch Wave 8 merged as #157, release PR #158). Branch `arch-wave-9`. Every phase's
base is its first commit's parent (rule unchanged from `_SHARED-CONTEXT.md`).

## Execution order
Phases run strictly one at a time, in numeric order (37 → 42). Same reasons as waves 6–8: every records plan edits the same
spec registers, and `use_worktrees` is false. Order: the top recommendation first (37, devtools, self-contained), then the
three core-owned "stated once" phases (38–40), then the devtools render guard (41), then the speculative react phase (42),
which also corrects anything 37–41 left stale.

## Numbering reserved for v1.4
Next free on `637c0601`: ADR-QD-150, CCR-QD-428, BEH-QD-521, INV-QD-319 (`spec/` and the shared reservation file agreed at
ADR 149, CCR 427, BEH 520, INV 318). Highest ARCH is ARCH-83. **The whole block below is reserved in the shared reservation
file** (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json` set to CCR 433, ADR 155, BEH 550, INV 330 on 2026-11-14).
**Never run `node scripts/next-id.mjs` while executing these phases**, because every call writes a reservation. Confirm that a
reserved number is free with grep over `spec/`, `packages/`, `.changeset/` and `AGENTS.md`. Name an unused reservation in the
phase's CCR row ("Unused: …").

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 37 | 84 | 150 | 428 | 521–525 | 319–320 |
| 38 | 85 | 151 | 429 | 526–530 | 321–322 |
| 39 | 86 | 152 | 430 | 531–535 | 323–324 |
| 40 | 87 | 153 | 431 | 536–540 | 325–326 |
| 41 | 88 | 154 | 432 | 541–545 | 327–328 |
| 42 | 89 | 155 | 433 | 546–550 | 329–330 |

ARCH ids below 84 are never reused. ADR Document IDs must equal the file number (gate 10).

## Already deep (do not re-plan)
From the review's "checked, not proposed": http enforcement (`AuthorizeRequest`, `GuardRoute`, `DecisionStreamRoute`,
`DecisionBacklogRoute`, `PortRoutes` all through `enforceRequest`, ADR-108); the port cluster (split for cycles, ADR-037;
wrappers derived, ADR-094/109/114/133/134); the sink fields (ADR-135) and `SinkCodec` owning both directions (ADR-095);
`QadiProvider.gates` (ADR-080 v1.2); `SweepScheduler.withSweepFork` (ADR-148); `Hydration.ts` over `HydrationEngine`
(ADR-039); `DeveloperSignals.ts`; devtools `GateInstanceLike` (ADR-053); the audit write path (ADR-099/110/126).
Too small to act on unless a phase lands there anyway: `FIXTURE_DATA` living in `SimulationFields.ts:568` while only
`SimulationSource.ts` reads it (both lists compile-checked); the literals `"Decision"`/`"Obligations"` at
`DecisionRecord.ts:145/149`. Waves 6–8's "already deep" lists still stand.

Not read in depth by the review (a planner touching them reads them first): `DecisionCache.ts`, `Lifecycle.ts`,
`PortAccess.ts`, `AuditArchive.ts` internals, `Simulator.tsx`, `RoleViewer.tsx`, `PolicyExplorer.tsx`.

## Evidence per phase (from the review; each planner re-verifies against `637c0601` before planning)

### Phase 37: one module for a scoped run that a newer run supersedes (review #1, Strong; top recommendation)
- ADR-QD-137 §7 says the run discipline "is general for the package", but no module owns it. Three stores write the same
  protocol by hand: `let generation`, a `closed` flag, `FiberHandle.make` followed by a finalizer added after it (so it runs
  first), `FiberHandle.runtime(handle)<never>()` to fork, each run capturing `mine` and landing only while `mine === generation`.
  - `packages/devtools/src/model/TimelineFeed.ts:122-161`
  - `packages/devtools/src/model/DiagnosticsFeed.ts:170-240`
  - `packages/devtools/src/model/SimulationSession.ts:350-362, 460-462, 538-544`
- The failure check is repeated verbatim: `mine === generation && Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)`
  at `TimelineFeed.ts:150` and `DiagnosticsFeed.ts:221`.
- **Drift already present:** to stop, `SimulationSession.ts:462` does
  `if (Option.isSome(FiberHandle.getUnsafe(runs))) fork(Effect.void)`; `DiagnosticsFeed.ts:231-233` forks `Effect.void`
  unconditionally. The phase decides which is right and pins it.
- Shape proposed: one package-private module owns the handle, the generation, the close state, the finalizer ordering, the
  replace-and-interrupt step, `stop`, and the "land only if still current" check. Each store keeps only what it does with a
  result that lands. In-process; tested once through its own interface (supersede, close mid-run, stop with/without a run,
  interrupt-vs-failure), then the per-store copies of those tests (≈5 TimelineFeed, ≈4 DiagnosticsFeed, ≈25 SimulationSession
  matching lines) shrink to what each store does with a landed result.
- Constraints: `Effect.fn`, no `Context.Service` needed (closures in a scope), no new `Effect.fnUntraced`. Mutation must not
  fall on the three stores (`_SHARED-CONTEXT.md` XC-05). Prior: ARCH-73 (ADR-137), ARCH-82 applied the rule store by store.

### Phase 38: the sink record wire version stated once (review #2)
- `packages/core/src/SinkWire.ts:48` `export type WireVersion = 2`, `:51` `WIRE_VERSIONS: ReadonlyArray<WireVersion> = [2]`.
- `packages/core/src/SinkCodec.ts:146, 154` `version: Schema.Literal(2)`; `:224, 226` `version: 2 as const` in the encoder;
  `:453` `const WIRE_VERSION: WireVersion = 2`; `:470` the decoder compares `version === WIRE_VERSION`.
- Harm: the schema literals and the encoder's `2 as const` are not tied to `WireVersion`. Retyping it to 3 compiles, the encoder
  keeps writing 2 and the decoder refuses its own output. ADR-QD-096 wants a version bump to be "a full-union edit here"; today it
  is six edits, four unchecked.
- Shape proposed: every one derived from one constant in `SinkWire.ts`. Wire bytes unchanged; the round-trip test unchanged.
  ADRs 095/096. Small; may carry an INV restating "the codec reads what it writes for every supported version".

### Phase 39: each hydration drop reason stated once, with its kind (review #3)
- `packages/core/src/HydrationMetrics.ts`: unions at `:48` (dehydration) and `:71` (client); `hydrationDropReasons` at
  `:130-140` is a hand list typed `ReadonlyArray<HydrationDropReason>`, so a missing reason compiles.
- `packages/react/src/HydrationEvent.ts:85` `PayloadRefusalReason` and `:92` `EntryDropReason` restate the client reasons as
  literals; its own doc says "Written out rather than `Extract`ed … a new reason is placed by hand".
- Completeness is pinned only by tests: `packages/devtools/test/model/Hydration.test.ts:109`
  `assert.strictEqual(hydrationDropReasons.length, 9)`, plus hand lists in core's `HydrationMetrics.test.ts`.
- Shape proposed: one keyed table in core, each reason with its kind (`dehydration` | `payload` | `entry`); the unions, the list,
  and react's two groups derive from it, so a new reason without a kind is a compile error. ADR-QD-123 (metrics declared once),
  ADR-QD-143, ADR-QD-037 (drop-reason meaning lives in core). Check the metric label set is unchanged (`[metric-table]`).

### Phase 40: core owns describing a decode refusal (review #4)
- Encode side already has one owner (`describeEncodeRefusal`/`reportEncodeRefusal`, ADR-QD-116). Decode side has none.
- `packages/devtools/src/model/Source.ts:220-228` `reasonOf` and `:273` `MalformedReason`: a 1:1 kebab-case renaming of core's
  `DecodeRefusal` (`SinkWire.ts:53-83`); the comment at `:250-268` re-explains all five reasons that `SinkWire.ts` documents.
- `packages/audit/src/AuditEntry.ts:159` `asDecodeRefusal`; `decodeAuditEntry` at `:193-209` decodes `input.record` twice, once
  through `decodeSinkRecord` and once through `recordJsonOf` (the latter is budgeted in AGENTS.md §7a's
  `UNTRUSTED_DECODE_BUDGET` table; changing it updates the table and budget together).
- Shape proposed: core gains the decode-side describer (and reporter if a consumer needs one); devtools passes `DecodeRefusal`
  through; audit gets the record's JSON form from one decode. **Breaking** in `@qadi/devtools` (`MalformedReason`, `onMalformed`
  shape): changeset + `upgrading.md`. ADR-QD-110 (audit facts computed once) is touched.

### Phase 41: one guarded value-to-text function in devtools (review #5, latent defect)
- Guarded: `packages/devtools/src/model/Filters.ts:136-146`, `SimulationForm.ts:95-103` (try/catch).
- Unguarded: `model/Remedies.ts:574` `render = (v) => typeof v === "string" ? v : String(JSON.stringify(v))` (used at `:481`,
  `:496`); `model/Inspect.ts:300-310` `outsideUnion` with its own rules; `react/QuestionsPanel.tsx:388` its own `resourceOf`.
- Risk: core `Matcher.ts:284` `contains(value: unknown)` admits a bigint or a circular object; `JSON.stringify` throws on both,
  so the Remedies panel would throw while rendering. Follows from the code; **not reproduced** — the phase reproduces it RED first
  (or refutes it with evidence and downgrades to a pure locality change).
- Shape proposed: one package-private guarded function and one test table; every panel reads through it.

### Phase 42: a seeded question builds its own computing atom (review #6, Speculative; human checkpoint)
- `packages/react/src/HydrationEngine.ts:692-779` `makeSeededQuestion` takes `computedFor`, a callback that receives another
  callback (`seededIn`), so `packages/react/src/QadiAtoms.ts:257-298` (`seededDecision`, `:283-288`) can carry the server's
  `evaluationId` from the seed into the evaluation. The seed→evaluation relationship is split across both modules.
- The liveness rule ("`live()` first inside the reader, release in its finalizer") is stated three times: `QuestionBook.ts`
  (`BookOptions.build` doc), `QadiAtoms.ts:289-296`, `HydrationEngine.ts:704-707`.
- `HydrationEngine.test.ts` tests `makeSeededQuestion` with a fake `computedFor`, past the real way the atom is built.
- Shape proposed: hand the question the runtime and the subject atom so it builds its own computing atom; the inversion goes.
- **ADR conflict:** ADR-QD-103, ADR-QD-148 and ADR-QD-149 (the last two decided 2026-11-12/13). The user put this in scope
  (2026-11-14) on the condition that it runs behind a human checkpoint: the phase's first plan presents the evidence and the
  alternatives, and the human decides go / amend ADRs / record a rejection ADR before any code changes.
