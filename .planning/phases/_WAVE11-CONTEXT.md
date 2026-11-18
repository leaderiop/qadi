# Wave 11 (v1.6): shared context for Phases 53–61

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the XC-05
mutation procedure all apply. **This file overrides only what it names:** the source review, the base commit, the
numbering, and the per-phase evidence below.

**Source review:** the 2026-11-16 architecture review,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/b68cdd9b-9a78-4959-9a19-0cc08dad3a0d/scratchpad/architecture-review-20261116.html`.
That file is local and session-scoped and has already been cleared once, so this file holds everything a planner needs from it.
The review was checked against ARCH-01…99 and `spec/decisions/` up to ADR-QD-165. The user chose all nine candidates.

**Base commit:** `44510112`, the head of `main` (v1.5 merged as #162; v1.4 merged as #160). Branch `arch-wave-11`. Each
phase's base is its first commit's parent; that rule is unchanged from `_SHARED-CONTEXT.md`.

## Execution order
Phases run strictly one at a time, in numeric order (53 → 61), for the same reasons as waves 6–10: every records plan edits
the same spec registers, and `use_worktrees` is false.

1. **The defect first (53).** It is a live fail-open in the reference interpreter.
2. **Then the "stated once" deepenings (54–58).**
3. **Then the benchmark-gated phase (59).**
4. **Then the two speculative phases (60–61), each behind a human checkpoint.** Either may end in a recorded rejection
   (an ADR that says no, so a later review does not re-suggest it).

Soft edges between phases:
- 53 and 54 both touch `Walk.ts`, `Predicate.ts` and `LeafNeeds.ts`; 59 touches `Walk.ts` again.
- 55 and 56 both touch devtools' `DockModel`/panels; 56 and 60 both touch the feeds and devtools' `index.ts`.
- 57 and 58 both touch `SinkCodec.ts`.

## Numbering reserved for v1.6
Next free on `44510112`: ADR-QD-166, CCR-QD-444, BEH-QD-601, INV-QD-351. The highest ARCH id is ARCH-99.

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 452, ADR 174, BEH 645, INV 368 on 2026-11-18.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- Confirm a reserved number is free by grepping `spec/`, `packages/`, `.changeset/` and `AGENTS.md`.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …").

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 53 | 100 | 166 | 444 | 601–605 | 351–352 |
| 54 | 101 | 167 | 445 | 606–610 | 353–354 |
| 55 | 102 | 168 | 446 | 611–615 | 355–356 |
| 56 | 103 | 169 | 447 | 616–620 | 357–358 |
| 57 | 104 | 170 | 448 | 621–625 | 359–360 |
| 58 | 105 | 171 | 449 | 626–630 | 361–362 |
| 59 | 106 | 172 | 450 | 631–635 | 363–364 |
| 60 | 107 | 173 | 451 | 636–640 | 365–366 |
| 61 | 108 | 174 | 452 | 641–645 | 367–368 |

ARCH ids below 100 are never reused. ADR Document IDs must equal the file number (gate 10).

## Already deep (do not re-plan)
The review checked these and found nothing to propose:
- `Ports.ts`/`PortAccess.ts`/`PortDerivation.ts` (ADR-094/160): `readPort`/`readScoped` hide span, metric, defect mapping and
  the scoped-id check; the 15 per-port `…Retrying`/`…Bounded`/`…TimingOut` exports stay public on purpose (ADR-094 D-10-c);
- `Compare.ts`, the one owner of operator meaning (ADR-091). Phase 53's module sits beside it;
- audit `CircuitBreaker.ts` (ADR-158), http `AuthorizeRequest.ts` (ADR-108), `Handover.ts`/`Qadi.ts` (ADR-156), the audit
  outcome/report trio (ADR-161);
- devtools `model/Source.ts`, `model/Remedies.ts`; react `SeededQuestion.ts`, `HydrationEvent.ts`, devtools `model/Hydration.ts`.

Explicitly not re-proposed:
- the decision stream's record codec parameter (ADR-097 amendment 1.4 chose "codec-free");
- `QadiProvider`'s registry lifetime (bound to StrictMode; gain uncertain);
- "encode, then report a refusal" in each sink adapter (ADR-095 D-09-e);
- QadiHttpError's `…Response` aliases (ADR-102);
- `devtoolsPath`/`portPath` prefix joining (too small an overlap);
- a shared child-walk driver (ADR-073 addendum), and the three `fnUntraced` functions.

## Evidence per phase
Each planner re-verifies this evidence against `44510112` before planning. Line numbers were read on `0bc85882`
(arch-wave-10's head), whose source tree `44510112` squashes.

### Phase 53: one module owns "the value a leaf compares" (review #1, Strong, top recommendation, live defect)
- **The rule.** A decoded key is untrusted, so it is read as an own property only (`Object.hasOwn`). It is restated at six
  call sites, each with a comment saying it mirrors the others:
  - `packages/core/src/Walk.ts:343-350` (`HasResourceAttribute`);
  - `packages/core/src/PortAccess.ts:348` (`readAttribute`);
  - `packages/core/src/Matcher.ts:341-350` (`getByPath`) and `:725-740` (FieldMatch); `Matcher.ts:321-327` says it "closed
    the one place that hadn't";
  - `packages/core/src/FieldPath.ts:332` (`projectAt`);
  - `packages/core/src/Decision.ts:289`.
- **The defect.** The seventh reader never got the rule: `evaluatePredicate`'s `Compare`/`MemberOf` arms read `row[p.column]`
  directly (`packages/core/src/Predicate.ts:163-164`, verified on `44510112`). Probe (built `lib`, scratch only): policy
  `hasResourceAttribute("constructor", neq(literal("x")))`, resource `{ id: "r1" }` — `evaluate` denies ("resource
  attribute 'constructor' has no value"); `toPredicate` gives `Compare(constructor, Neq, "x")`, and `evaluatePredicate` on
  the same row returns **true**. The reference interpreter fails open, contradicting INV-QD-091's "cannot disagree by
  construction". `evaluatePredicate` is the reference the SQL and Prisma engines are differential-tested against
  (ADR-024).
- **Deepening.** One module owns the value a leaf compares: a single-key cell read and a dot-path read, both own-property
  only, beside `Compare.ts`'s verdicts (the half of a comparison ADR-091 left out). Every interpreter — walk, port reads,
  matcher refs, FieldMatch, predicate reference, projection — fetches values only through it.
- **Tests.** RED first on the base: the probe above as a test. An agreement property over keys including prototype names
  (`constructor`, `toString`, `__proto__`, `hasOwnProperty`, `valueOf`): `evaluate` ≡ `evaluatePredicate ∘ toPredicate`.
  The predicate-sql and predicate-prisma engine-agreement suites stay green.
- **Must keep:** ADR-091, ADR-024 (two walks stay two), the `SWITCH_BUDGET` switches in `Matcher.ts` (`judgeMatcher`,
  `resolveRef`).

### Phase 54: LeafNeeds turns every leaf's answer into a verdict (review #4, Worth exploring)
- ADR-163 moved `holdsRole`, `holdsPermission` and `holdsAction` into package-private `packages/core/src/LeafNeeds.ts`;
  the acted leaf was left out:
  - the polarity map `_tag === "HasActed" ? "Acted" : "NotActed"` is at `Walk.ts:181` and `Predicate.ts:383`;
  - the verdict `answer === wanted` ("Unknown" denies both polarities, ADR-020) is at `Walk.ts:186` and `Predicate.ts:592`;
  - the resource-attribute cell read sat inline in `Walk.ts` (Phase 53 moves it).
- **Deepening.** `LeafNeeds.ts` (or a sibling) is where each leaf's answer becomes a verdict, for every leaf. The walk keeps
  only its reason sentence; the translator keeps only constant folding.
- **Tests.** A per-leaf verdict table (answer × polarity → verdict); the existing evaluate/toPredicate agreement for
  `scope: "Any"` acted leaves.
- **Must keep:** ADR-163, ADR-024, ADR-020.

### Phase 55: a port card is a model row, not a view join (review #3, Strong)
- `packages/devtools/src/react/ServicesPanel.tsx`: `wiringView`'s `Read` arm (≈97-110) pairs each `report.ports` row with
  `activityFor` (:322, `entry.port === port`) and `callsFor` (:271, `call._tag === port`).
- The three keys have three types: `PortReport.port: WiredServiceName` (`model/Wiring.ts:49`), `PortActivity.port: string`
  (`model/Wiring.ts:142`), `PortCall["_tag"]` (`model/PortCalls.ts:40`). A misspelt or renamed port compiles and renders
  "never called".
- Rules living in the view: port state wording (`stateOf`, :281); "never called" vs "no activity reading" vs "absent"; the
  retries/timeouts suffixes; newest-first, five shown, "N earlier"; when the uncollected/unsampled note shows. The
  consequence text, by contrast, is model (`PORT_READING` in `model/PortReading.ts`, ADR-160).
- `ServicesPanel.test.tsx` (692 lines) and `ServicesPanel.reading.test.tsx` (252): ≈30 cases, all render.
- **Deepening.** A pure model function, `joinQuestions`' counterpart, takes `WiringRead`, the activity, the call log and the
  unsampled flag and returns one row per `PortName`: state, activity line, recent calls and the count beyond them,
  consequence voice. The panel renders rows only.
- **Tests.** Most of the ≈30 cases become model tests; one pins that each `PortName` keys all three readings; a short render
  test keeps the `data-testid`s. Wording byte-identical (characterise on the base first).
- **Must keep:** ADR-047 ("the panel renders that model and computes nothing"); follows ADR-162's precedent.

### Phase 56: the gate-registry watch becomes the dock model's third feed (review #2, Strong)
- `packages/devtools/src/model/DockModel.ts` (294 lines) reads two host inputs through scoped feed modules of their own —
  `model/TimelineFeed.ts` (159 lines) and `model/DiagnosticsFeed.ts` (244) — and the third, the gate registry, inline:
  `reasonOf`/`keyOf` (:95-118), `readGates`, `rejoin`, `watchGates` and the finalizer (≈172-257), the `configure` branch
  (≈283-287), and eight mutable `let`s (`gatesNow`, `closed`, `offGates`, `watchFailure`, `watchKey`, `failureKey`,
  `lastKey`, `lastFailureKey`; verified from :174).
- ADR-162 decision 5 was revised three times on the day it was written (rev 1.2–1.5), all about this guard.
- `packages/devtools/test/model/DockModel.test.ts` (1658 lines): ≈650 lines (≈1009-1658, "the questions store") build the
  whole model to exercise the watch.
- Inconsistent failure: a throwing `questions` thunk ends the whole diagnostics poll (`DiagnosticsStore.ts` `runDiagnostics`
  doc), while a throwing registry becomes only `GatesView.Failed`.
- **Deepening.** Move the watch into a scoped feed module shaped like the timeline feed: it holds the subscription, the guarded
  reads and the failure keying, re-subscribes on `configure`, releases in a finalizer, and exposes one snapshot (instances or
  failure) and `subscribe`. `DockModel` composes three feeds and calls `joinQuestions`. Optional follow-up the planner
  surfaces to the user: let the feed own the `questions` thunk too (one failure policy), which takes `questions` out of
  `DiagnosticsDockOptions` (Breaking for `useDevtoolsFeed`, amends ADR-047's 2026-11-12 amendment).
- **Tests.** M31–M47 and P2 rewritten against the feed alone with `gateRegistryDouble.ts`: throw on `instances` or
  `subscribe`, swap the registry, a throwing release, close the scope, the same failure from two paths publishes once.
  `DockModel` keeps one test that the join moves first.
- **Must keep:** ADR-137 (lifetime is the scope), ADR-150 (`SupersedingRun`), ADR-162's decisions.

### Phase 57: untrustedDecoder states the envelope's unknown-key policy (review #5, Worth exploring)
- Five modules wrap a value decoded from its own root inside an envelope; `untrustedDecoder` has no option for "ignore an
  unknown top-level key", so each builds the rule its own way:
  - the record wire: tolerance hand-written in a `prepare` step — `envelopeOf` keeps only `DECISION_KEYS`/`OBLIGATIONS_KEYS`,
    read through `ownValue` (`packages/core/src/SinkCodec.ts` :420, :434, :487, :524);
  - the stored-record envelope: bypasses the decoder, with `isPlainObject`, `Object.hasOwn`, `ownValue` and its own
    `JSON.parse` (`SinkCodec.ts:634, 649-654`; `JSON.parse` verified at :652);
  - audit row (`packages/audit/src/AuditEntry.ts:117, 149-157`), archive (`packages/audit/src/AuditArchive.ts:258`),
    hydration (`packages/react/src/HydrationEngine.ts:193`): `unwalked`, refusing an unknown top-level key.
  - `packages/core/src/UntrustedDecode.ts:140-143, 175-193` for the decoder.
- Two opposite answers, both pinned: `UntrustedSeams.test.ts:195` (a deep unknown key on a record → `TooDeep`, because the
  guard walks before `prepare` drops the key) and `:249` (a 60,000-deep unknown key on a stored envelope succeeds).
- **Deepening.** `untrustedDecoder` takes the envelope's key policy as one stated option (refuse | ignore and do not walk).
  Both SinkCodec envelopes go through it; `ownValue`, `envelopeOf` and the hand-rolled stored reader are deleted.
  `SinkCodec.ts`'s `UNTRUSTED_DECODE_BUDGET` count and AGENTS.md §7a's table move together (a budget edit, not removal).
- **First decision for the user:** is the record's `TooDeep` answer intended? Settle it before planning.
- **Tests.** The UntrustedSeams matrix per policy: shallow unknown key, deep unknown key, excess key inside the policy,
  non-object input.
- **Must keep:** ADR-096 D-15-c and its ADR-143 amendment (order: guard, version, project, decode), ADR-143, ADR-153.

### Phase 58: a stored record is its envelope in memory too (review #6, Worth exploring, Breaking)
- On the wire a stored record is `{ environment, record }` (`StoredRecordJson`, `SinkCodec.ts:585`). In memory it is flattened
  into `StoredDecisionRecord` and `StoredObligationRecord` plus `stampRecordMatch`/`stampRecord`
  (`packages/core/src/DecisionRecord.ts:118-186`). The codec flattens on decode (`SinkCodec.ts:642`) and nests on encode
  (:599). ≈20 lines of doc (`DecisionRecord.ts:155-176`) explain a prototype-loss trap the flattening creates. Devtools writes
  a third spelling, `ObligationRecord & { environment: string }` (`packages/devtools/src/model/Timeline.ts:129, 146, 161`).
  `packages/core/src/DecisionLog.ts:237` stamps.
- Every new `SinkRecord` kind needs its own stored class, a stamp arm and a decode re-stamp. Deletion test: the two classes and
  `stampRecord` only translate one fact between two shapes.
- **Deepening.** The in-memory stored record is the envelope: the producer's label next to a `SinkRecord`. The stored codec is
  the record codec plus one field.
- **Tests.** SinkCodec stored round trip, DecisionLog backlog stamping, `storedRecordOrder` (reads the record's `at`), stored
  byte goldens unchanged.
- **Cost.** Breaking for devtools' timeline and the http encoders; 11 `src` files name `StoredRecord` (verified).
- **Must keep:** ADR-097 D-11-e (environment travels in an envelope) — this makes it true in memory as well.

### Phase 59: admission produces the one walk environment (review #7, Worth exploring, benchmark-gated)
- `evaluateNode` takes `(policy, subject, request, matcherContext, depth, maxDepth)` (`packages/core/src/Walk.ts:46-69,
  301-308, 876-890`). `resource`/`action` are carried both in the `Evaluation` bundle and in `MatcherContext`; the subject
  three times (`subject`, `matcherContext.subject`, `matcherContext.subjectId`). `matcherContext, depth, maxDepth` is
  threaded through 11 call sites; swapping `depth` and `maxDepth` still typechecks (Walk.ts's own comment says so).
- `packages/core/src/Admission.ts`'s `Admitted` already holds the question plus the matcher context, yet `walk` builds
  `supplied` itself and `compileTree` builds a different `supplied` (`resource: true`) by hand (`Predicate.ts:358-362`).
- **Deepening.** Admission produces the one walk environment (subject, resource, action, `supplied`, matcher context,
  `maxDepth`); each interpreter states only what differs. Recursion passes `(policy, env, depth)`.
- **Gate.** Opens on `pnpm bench` (same method as Phase 50: interleaved runs, median of per-run minima); may end in a recorded
  rejection. Not the shared child-walk driver (ADR-073 addendum); the three `fnUntraced` functions stay.
- **Tests.** `admit(question)` gives the environment with each interpreter's `supplied` checked; `RolesAndDepth.test.ts`'s
  depth agreement test still applies.

### Phase 60: devtools' headless interface is the feeds (review #8, Speculative, Breaking, human checkpoint)
- `packages/devtools/src/index.ts` exports `makeTimelineStore` + `runSource` and `makeDiagnosticsStore` + `runDiagnostics`; a
  headless shell must pair, fork, supersede and watch these itself. The modules that do it are package-private
  (`model/TimelineFeed.ts:10`, `model/DiagnosticsFeed.ts:19`).
- `README.md:139` calls `runDiagnostics` "the same loop without React", but it lacks the stop detection whose absence was the
  ADR-047 amendment 1.13 defect. Two option shapes for one poll: `DiagnosticsOptions` (`schedule`, a generic layer) and
  `DiagnosticsDockOptions` (`intervalMillis`), translated by `runOptions` in `DiagnosticsFeed.ts`.
- The root interface was fixed by ADR-047 amendment 1.6 (2026-10-08), before the feeds existed (1.13/1.15, 2026-11-12).
- **Deepening.** Export the two feeds (and Phase 56's gate feed if the user wants it public) as the headless interface; retire
  the pairs from the barrel.
- **Checkpoint.** Amends ADR-047 amendment 1.6 and ADR-099's closed entry list. The user decides before planning whether a
  headless consumer is real; "no" ends in a recorded rejection ADR.
- **Tests.** `TimelineFeed.test.ts` and `DiagnosticsFeed.test.ts` moved to the public entry; `surface.test.ts` updated; gate 13
  (`check-api-surface.mjs`) and `spec/overview.md`.

### Phase 61: DecisionCache is asked only the question (review #9, Speculative, human checkpoint)
- `DecisionCache.getOrCompute(question, compute)` (`packages/core/src/DecisionCache.ts:37-67`) accepts any `compute` for any
  `question`. ADR-031 makes the key the security boundary, so "this trace answers this key" holds only because
  `packages/core/src/Lifecycle.ts:118-121` passes `walk(question, …)`.
- `SharedComputation.ts` (418 lines) has one adapter; fine, it is not exported.
- **Deepening.** The cache is asked only the question; core supplies the matching walk.
- **Checkpoint.** Brushes ADR-031 and ADR-132; wave 10 recorded `DecisionCache`/`SharedComputation` as already deep. The
  `concurrency` value is deliberately not part of the key, so it would need another route to the walk. The user decides
  before planning; "no" ends in a recorded rejection ADR.
- **Tests.** `DecisionCache.test.ts`'s coalescing and interruption tests, driven through a question alone.
