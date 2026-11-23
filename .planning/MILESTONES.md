# Milestones

## v1.8 Arch Wave 13 (Shipped: 2026-11-23)

**Delivered:** all eight candidates of the 2026-11-22 architecture review, on branch `arch-wave-13`. Not merged, not released.

**Phases completed:** 8 phases (69–76), 63 plans. 630 commits; 198 files, +17,915 / −2,874 outside `.planning`.

**Key accomplishments:**
- 69: one total thrown-value-to-message rule exported by `@qadi/core` (`thrownMessage`, `causeMessage`). Every "never throws" copy uses it, closing the four throw-throughs in `JsonHazard`, `PortKey`, `PortDerivation` and `PortWireEncode` (ADR-QD-182).
- 70: hydration's drop events come from its reason-keyed buckets on both sides, so a bucket no event reports no longer compiles (ADR-QD-183).
- 71: every developer-signal reporter is resolved through one table (where it runs, how often, what it is named), and the `onGateIdCollision` naming drift is fixed (ADR-QD-184).
- 72: the dock model's three computed stores are derived stores built by `makeDerivedStore` (ADR-QD-185).
- 73: gate registration is one pure, id-keyed `reconcile`; `useGate` lost its state-diff effect and the parallel-array contract (ADR-QD-186).
- 74: the simulation session's policy choice is a pure seeded choice beside `HeldChoice`, and the session keeps only runs (ADR-QD-187).
- 75: the evaluate family's spans are declared once. A failed span carries its question, and the outcome has one key, `qadi.outcome` (Breaking; ADR-QD-188).
- 76: whether a fixture row meets a signature or acted leaf is core's answer (`signatureAnswerFromSignatures`, `actedAnswerFromEvents`). Remedies asks core, a refused value fails typed wherever it is read, and three unused classes are removed (Breaking; ADR-QD-189).

**Quality:** each phase was code-reviewed in three iterations, mutation re-closed, secured (0 open threats) and Nyquist-validated. The audit is `passed` (47/47 requirements, 14/14 integration points, 4/4 flows). `check:pr` was last green at `5640572d`.

**Known verification overrides:** none. The audit-open scan was clear, with 2 items acknowledged in an earlier milestone and still suppressed.

---

## v1.7 Arch Wave 12 (Shipped: 2026-11-22)

**Phases completed:** 8 phases, 60 plans, 30 tasks

**Key accomplishments:**
- `makeExternalStore`'s `notify` now calls every listener of the live set and then rethrows what they threw, decided by count (none, the thrown value itself, or one `AggregateError` of all), with each part of that contract shown pinned by a one-edit variant.
- Every listener text in `@qadi/devtools` now says a throwing listener no longer silences the others and what still happens to the publishing call, and one `@qadi/devtools` patch changeset records the change.
- ADR-QD-177, BEH-QD-656, INV-QD-373, the amended BEH-QD-638 rule, the ADR-QD-173 amendment and the CCR-QD-455 register row state the every-listener-is-called contract the code holds since plan 02, with the begin-to-fork window left as out of scope.
- The Stryker close run, the 24-check close scan and a hand review of the phase's diff show the seam, the texts and the records say what the code holds and nothing else, with no touched file's mutation score lower than at the base.
- The mutation base of the three admission files is recorded before any test of the phase exists, and both halves of ARCH-112 (the private constructor and nominal brand refusals, and the single read of the question's resource and action, E7 to E9) are seen failing on the base for the one reason each names.
- `Admitted` has a private constructor and a declared private `nominal` member, and `admit` is its static method exported detached as `admit`, so neither a constructor call nor a same-shape object literal compiles outside `admit` while both call sites stay as they were.
- `Admitted.admit` builds one `MatcherContext` after the depth check and passes it to `SUPPLIED[rowSource](context)`, which stores the same object as the matcher context, so the question's resource and action are each read once and the `"asked"` flags cannot disagree with what the matchers see.
- The committed `packages/core/src` (head `6843e25e54d4bee5d1af1c5e2ba94cd88d95b3af`) is no slower than the phase base on any of the 35 `Evaluate.bench.ts` workloads, beyond its band: Phase 59's harness, 3 + 3 interleaved, gate pass.
- The phase is closed on one tree: the Stryker close run shows no file's score fell (`Admission.ts` rose from 18/18 to 20/20), the 30-check close scan is green over `phase_base..HEAD`, and `pnpm check:pr` ran once and alone on that tree; ADMT-01 to ADMT-04 are ticked and WX-01 to WX-07 stay Pending.
- The ignore projection's reading of an undeclared accessor is pinned by eight cases that fail on the phase base for the reason each names, behind a mutation base of the three untrusted-decode files recorded before any test of the phase existed.
- The `ignore` projection takes `Object.keys`, keeps the keys `keysOf` names and reads each kept value once into an `Object.fromEntries` copy, so an undeclared accessor is never invoked and the eight RED cases from 66-01 are green.
- The committed `ignore` projection against the phase base on six decode workloads, 3 + 3 interleaved: no workload slower, geometric mean -2.13%, gate pass, measured on a loaded host and under a harness shown able to fail.
- ADR-QD-170 amended (D-19 scoped, D-09 closed), INV-QD-377 and BEH-QD-666 added under reserved ids, the register shown red then green, and one `@qadi/core` patch changeset.
- The Stryker close shows no touched file's score fell and no survivor on a line the phase wrote, the 12-check close scan and a single `pnpm check:pr` are green on one tree, and DECL-01 to DECL-04 are ticked.
- The Stryker base of DecisionCache, Lifecycle and SharedComputation is recorded on the phase base by a line-mapping, multiset scorer, and the I5 race test now sweeps each budget until it has seen both orderings, with a cap of 512 that fails loudly and a margin of 3.
- The arm table beat the Match form on the fixed gate: Match slowed both miss workloads by 7.2% and 7.7%, the table passed with a geometric mean of -4.15% and no workload slower, so 67-04 applies the table.
- DecisionCache's eviction loop and its `Option.isSome` guard, whose mutant could not be killed, became `Chunk.splitAt` plus `HashMap.removeMany`, with every test unedited and the split's count shown to fail a test when its `-` becomes `+`.
- `SharedComputation.run` now joins its one synchronous claim step to a row-typed arm table with `Effect.flatMap`; the owner's former 70 lines are the local function `answerOwned`, and all ten hand-applied tag mutants fail tests.
- The final committed source (`Chunk.splitAt` and `HashMap.removeMany` eviction, claim dispatched through the arm table) was measured once, 3 + 3 interleaved, against `phase_base` and passes the fixed gate: no workload slower, geometric mean of the five deltas -2.51%.
- INV-QD-379 for the bound and the FIFO order of the split eviction, BEH-QD-166's reasons rewritten for it, and CCR-QD-458 recording the arm-table dispatch choice, all under reserved ids and traced.
- The Stryker close of the three single-flight files is 38/38, 42/42 and 71/71 with nothing open, both named survivors are gone, and the close scan and `pnpm check:pr` are green on one tree.
- OI-18 fixed (spec-revise kept its first argument only when `--date` was given), OI-24 fixed forward with one shared A/B bench harness that alternates the arm order by round, and the phase's mutation scorer, compiler comparison and staleness check committed, each shown failing on planted defects.
- Fourteen tests added on the unchanged tree: TF26, TF27, TF29 and E11 to E13 fail for the reason named, and the other eight each fail under a plant of the source they read.
- CCR-QD-459 written after every document it cites was bumped (11 at their current Revision, README 1.273), the phase's one `@qadi/devtools` patch changeset, and Phase 61's two settled items confirmed in a new archive file with re-runnable evidence; `verify-traceability.sh --strict` is green again at 21 passes.
- Phases 66 and 67 re-verified against the tree Phase 68 leaves, `pnpm check:pr` green once on it, HYGN-01 to HYGN-07 ticked, and OI-01 to OI-29 each mapped to the commit that fixed it or the CCR-QD-459 line that records it.
- All five Phase 68 defects (odd bench rounds, a failing gate that exits 0, staleness blind spots, a type-blind comparison, an unbounded TypeScript parse) are recorded failing on 0e3f3438, with the base parity answers pinned for the gate fix.
- `analyze.mjs` now exits 1 on a failed gate and 2 on any input it cannot analyze, `pnpm check` runs its end-to-end self-test as tabled step 26, and `ab.sh` refuses an odd round count.
- `68.1-stale.mjs` sees renames, deletions and dotfile paths, `68.1-compare.mjs` compares TypeScript tokens with their types, and every verdict Phase 68 recorded with its comparison held when re-run under both.
- Gate 14's probe guard now runs its TypeScript parse in `scripts/lib/probe-guard-parse.mjs` under `execFileSync(…, { timeout: CHILD_TIMEOUT_MS })`, so a TypeScript server that stops answering fails the gate at the bound every other child has, and every answer the guard gives is byte-identical to before.

---

## v1.6 Arch Wave 11 (Phases 53-61) (Completed: 2026-11-19; not released)

**Phases completed:** 9 phases, 83 plans
**Closeout:** verified_closeout. All 9 phases `passed`, Nyquist-compliant and secured; every code review converged
within three iterations. The three human checkpoints (59 benchmark gate, 60, 61) were all decided "pursue". Milestone
audit: `tech_debt`, accepted by the user (49/49 requirements, 9/9 phases, 5/5 integration seams, 4/4 flows, Nyquist
9/9 after correcting three stale `nyquist_compliant` seeds). Archived as `milestones/v1.6-MILESTONE-AUDIT.md`.
**Known verification overrides:** 0 (2 items acknowledged at an earlier close still suppressed).
**Git range:** `44510112` (v1.5 merged as #162) → this archive commit on `arch-wave-11` (436 commits before the
archive, 2026-11-18 → 2026-11-19); 190 files changed outside `.planning`, +12,895 / −3,178.
**Merge gate:** `pnpm check:pr` exit 0 at the end of every phase and after every review round; each phase's scoped
Stryker compare held (no touched file's score fell).
**Records:** ARCH-100..108, ADR-QD-166..174, CCR-QD-444..452.
**Release:** none. The branch is not merged and nothing was published. Changesets are pending, unconsumed:
`@qadi/core` minor (**Breaking**: Phases 57, 58, 61) and patch (53, 54), `@qadi/devtools` minor (**Breaking**:
Phases 55, 56, 58, 60), `@qadi/http` minor (**Breaking**: Phase 58), `@qadi/react` minor (**Breaking**: Phase 56),
`@qadi/audit` patch (Phase 57).

**Key accomplishments:**
- **ARCH-100 (Phase 53):** one package-private `Operand.ts` owns the own-property read, closing the predicate
  reference interpreter's fail-open (a row `evaluate` denies was allowed through `row[p.column]`) (ADR-QD-166).
- **ARCH-101 (Phase 54):** `LeafNeeds` turns every leaf's answer into a verdict, finishing ADR-QD-163 (ADR-QD-167).
- **ARCH-102/103 (Phases 55, 56):** a port card is a model row keyed by one `PortName`; the gate-registry watch is
  the dock model's third scoped feed (ADR-QD-168, 169).
- **ARCH-104/105 (Phases 57, 58):** `untrustedDecoder` takes a required unknown-key policy, and a stored record is
  its envelope in memory too, one `StoredRecord` (ADR-QD-170, 171).
- **ARCH-106 (Phase 59):** admission produces the one walk environment both interpreters read, typed by its row
  source; the benchmark gate passed (0 of 35 workloads slower beyond their band) (ADR-QD-172).
- **ARCH-107/108 (Phases 60, 61):** devtools' headless interface is its three feeds; a `DecisionCache` is asked
  only the question and core's layer runs the matching walk (ADR-QD-173, 174).

---

## v1.5 Arch Wave 10 (Phases 43-52) (Completed: 2026-11-16; not released)

**Phases completed:** 10 phases, 71 plans
**Closeout:** verified_closeout. All 10 phases `passed`. Phases 43, 44, 45, 46 and 48 were re-verified at the
final head on 2026-11-16, because later phases (and the audit's own fixes) edited files their reports covered;
each goal still held. Milestone audit: `tech_debt`, accepted by the user (52/52 requirements, 10/10 phases, 6/6
integration seams, 3/3 flows, Nyquist 10/10). Archived as `milestones/v1.5-MILESTONE-AUDIT.md`.
**Known verification overrides:** 0 (2 items acknowledged at an earlier close still suppressed).
**Git range:** `dfac377c` → this archive commit on `arch-wave-10` (510 commits before the archive, 2026-11-15 →
2026-11-16); 198 files changed outside `.planning`, +14,406 / −1,559.
**Merge gate:** `pnpm check:pr` exit 0 at the end of every phase; full `pnpm check` (with mutation) exit 0 at the
final head, every Stryker run above the break threshold of 80.
**Records:** ARCH-90..99, ADR-QD-156..165, CCR-QD-434..443.
**Release:** none. The branch is not merged and nothing was published. Changesets are pending, unconsumed:
`@qadi/core` minor (**Breaking**: Phase 43's handover options) and patch, `@qadi/audit` minor (**Breaking**:
Phases 45, 48) and patch, `@qadi/react` minor (**Breaking**: Phases 44, 49), `@qadi/devtools` minor
(**Breaking**: Phase 49) and patch, `@qadi/promise` minor (**Breaking**: Phase 43), `@qadi/predicate-sql` and
`@qadi/predicate-prisma` patch.

**Key accomplishments:**
- **ARCH-90 (Phase 43):** one package-private `Handover.ts` owns ask → discharge → release behind every
  enforcement entry point; `guard` and `filter*` refuse a caller's second `resource` at the type level
  (ADR-QD-156).
- **ARCH-91 (Phase 44):** the hydration seed's fields are stated once, derived from core's wire form, so a field
  the wire gains reaches the seed with no edit in `@qadi/react` (ADR-QD-157).
- **ARCH-92 (Phase 45):** the audit circuit breaker is one pure `step(state, event, now)`; a `NaN`, zero or
  negative threshold, cooldown or store-call timeout is refused at construction with `InvalidAuditSinkOption`
  (ADR-QD-158).
- **ARCH-93 (Phase 46):** `sinkEmitter` contains and reports a failing or dying sink with exactly one warning
  naming it (ADR-QD-159).
- **ARCH-94/95 (Phases 47, 48):** port defaultedness is a mark carried through every wrapper, not a display
  name; audit reports core's `SinkRecordNotEncodable` and derives "lost" from durability (ADR-QD-160, 161).
- **ARCH-96..99 (Phases 49-52):** one gate-state vocabulary in core and gates as the dock model's eighth store;
  what a leaf needs from the request stated once (benchmarked within noise); policy tag arity stated once; core's
  `compilePredicate` owns the compile shell for both SQL dialects (ADR-QD-162..165).

---

## v1.4 Arch Wave 9 (Phases 37-42) (Completed: 2026-11-14; not released)

**Phases completed:** 6 phases, 38 plans
**Closeout:** verified_closeout. All 6 phases `passed`. Phases 38, 39 and 40 were re-verified at the final
head on 2026-11-14, because later phases edited files their reports covered; each goal still held. Milestone
audit: `passed` (41/41 requirements, 6/6 phases, 7/7 integration seams, 5/5 flows, Nyquist 5/6 with Phase 40
partial on recorded plan-verify defects), minor tech debt recorded. Archived as `milestones/v1.4-MILESTONE-AUDIT.md`.
**Known verification overrides:** 0.
**Git range:** `637c0601` → this archive commit on `arch-wave-9` (228 commits before the archive, 2026-11-13 →
2026-11-14); 95 files changed outside `.planning`, +6,124 / −1,115.
**Merge gate:** `pnpm check:pr` exit 0 at the end of every phase and at the final head; `pnpm example` 30/30.
Mutation is run per touched file under WX-05 and never re-baselined. The final milestone re-check has all 15
touched files at their latest recorded score.
**Records:** ARCH-84..89, ADR-QD-150..155, CCR-QD-428..433.
**Release:** none. The branch is not merged and nothing was published. Changesets are pending, unconsumed:
`@qadi/core` minor, `@qadi/devtools` **Breaking** (Phase 40) and patch, `@qadi/audit` patch, `@qadi/react` patch.

**Key accomplishments:**
- **ARCH-84 (Phase 37):** one package-private devtools module, `SupersedingRun.ts`, owns the scoped-run
  protocol (generation, close, finalizer order, stop, land only while current). The timeline feed,
  simulation session and diagnostics feed had each restated it by hand (ADR-QD-150).
- **ARCH-85 (Phase 38):** the sink wire version is stated once (`WIRE_VERSION`). The schema literals, the
  encoder, the decoder's check, `WIRE_VERSIONS` and `WireVersion` derive from it (ADR-QD-151).
- **ARCH-86 (Phase 39):** each hydration drop reason is stated once, in core's `HYDRATION_DROP_TABLE`, with
  its kind. The unions, the value list, the meanings and react's payload and entry groups derive from it
  (ADR-QD-152).
- **ARCH-87 (Phase 40):** core owns describing a decode refusal (`describeDecodeRefusal`, tag-only
  annotations, one `UntrustedValueRefusal` → `DecodeRefusal` mapping). Devtools passes the refusal through,
  which is **Breaking**: `MalformedReason` is removed. Audit decodes a row's record once
  (`decodeSinkRecordWithJson`) (ADR-QD-153).
- **ARCH-88 (Phase 41):** one guarded value-to-text function and one label rule in core (`valueText`,
  `valueLabel`). They are read by `explain` and by devtools' Remedies, Filters and SimulationForm. A bigint
  or circular value no longer throws (ADR-QD-154; user choice: one primitive in core).
- **ARCH-89 (Phase 42):** a seeded question builds its own computing atom in react's package-private
  `SeededQuestion.ts`. The callback-that-takes-a-callback is gone and the fakes are replaced by real-runtime
  tests (ADR-QD-155; user choice: option 1b).

---

## v1.3 Arch Wave 8 (Phases 30-36) (Completed: 2026-11-13; not released)

**Phases completed:** 7 phases, 54 plans, 56 tasks
**Closeout:** verified_closeout. All 7 phases `passed`. Phases 30–35 were re-verified at HEAD on
2026-11-13 because later phases edited files their reports covered; every moved file was an expected
change. Milestone audit: `tech_debt` (45/45 requirements, 7/7 phases, 7/7 integration seams, 4/4
flows, Nyquist 7/7), with the debt accepted by the user. Archived as `milestones/v1.3-MILESTONE-AUDIT.md`.
**Known verification overrides:** 1. DEBT-02 is met by deleting the stale `Sources.ts` token rather
than naming `model/Source.ts` (user decision D-17, recorded in CCR-QD-427).
**Git range:** `aab87576` → this archive commit on `arch-wave-8` (333 commits, 2026-11-12 → 2026-11-13);
220 files changed outside `.planning`, +12,836 / −1,914.
**Merge gate:** `pnpm check:pr` exit 0 at the end of every phase (Playwright e2e 30 passed); mutation
runs per touched file under WX-05, never re-baselined.
**Records:** ARCH-78..83, ADR-QD-143..149 (144, 145 and 147 unused), CCR-QD-421..427.
**Release:** none. The branch is not merged and nothing was published.

**Key accomplishments:**
- **ARCH-78 (Phase 30):** `untrustedDecoder` is the one way to strict-decode untrusted JSON (parse,
  depth guard, optional `prepare`, strict decode, closed `NotJson | TooDeep | Malformed`). The nine
  seams keep only their refusal mapping, and `PolicyFromJson`'s unguarded `RangeError` is gone
  (ADR-QD-143).
- **ARCH-79/80 (Phases 31–32):** `SharedComputation` owns staleness through a closed claim `standing`,
  so `DecisionCache` drops its generation counter. `EvaluateOptions` and `EvaluationServices` are
  each declared once, and `LifecycleOptions` is deleted.
- **ARCH-81 (Phase 33):** one sealed builder, `evaluationEnvironment`, with a closed
  `EvaluationShadowing` and one `EvaluationClock`, serves `@qadi/testing` and devtools' Simulation
  (ADR-QD-146).
- **ARCH-82 (Phase 34):** diagnostics is the dock model's seventh store, polled in the model's scope
  with a closed `DiagnosticsStatus`, and the dock merges nothing.
- **ARCH-83 (Phase 35):** the atom set owns an edge-triggered, deferred, once-per-episode eviction
  sweep, so `maxTrackedQuestions` holds on a bare registry; the provider forks nothing (ADR-QD-148).
- **Carried debt (Phase 36):** two live defects fixed. A server seed is now held by its question
  behind a registry's `SeedGrant` (ADR-QD-149), and a dying timeline feed reads as Stopped with a
  restart. The v1.2 spec debt and every open info finding were closed, resolved or refuted with
  evidence (CCR-QD-427).

---

## v1.2 Arch Wave 7 (Phases 21-29) (Completed: 2026-11-12; not released)

**Phases completed:** 9 phases, 38 plans, 75 tasks
**Closeout:** override_closeout. All 9 phases `passed`. Phases 21–23 were re-verified at HEAD on
2026-11-12 because later phases edited files their reports covered. Milestone audit: `tech_debt`
(44/44 requirements, 9/9 phases, 5/5 integration seams, 5/5 flows, Nyquist 9/9), with the debt
accepted by the user. Archived as `milestones/v1.2-MILESTONE-AUDIT.md`.
**Known verification overrides:** 2 newly acknowledged, 0 carried forward. Both are pre-existing Phase 24
deferred spec items: the duplicate BEH-QD-219..221 blocks in `spec/behaviors/29-devtools-simulator.md`,
and `spec/traceability.md` behaviour 29 naming `model/Sources.ts`, which should be `Source.ts`.
**Git range:** `965ff14c` → `250dbca0` on `arch-wave-7` (272 commits, 2026-11-11 → 2026-11-12);
170 files changed outside `.planning`, +9,900 / −3,457.
**Merge gate:** `pnpm check:pr` exit 0 at the end of every phase (16 of 17 steps; mutation runs
per touched file under WX-05, never re-baselined).
**Records:** ARCH-69..77, ADR-QD-133..140 (136, 138, 139 and 141 unused), CCR-QD-411..419.
**Release:** none. The branch is not merged and nothing was published.

**Key accomplishments:**
- **ARCH-69/70 (Phases 21–22):** each port's request key is derived from its wire question, and the
  request every policy leaf asks is stated once on its description (`asks`). One `readScoped`, with
  a single span, serves the three resource-scoped ports, and `requireScopedResourceId` is gone
  (ADR-QD-133, ADR-QD-134).
- **ARCH-71 (Phase 23):** each sink record's fields are one `Schema.Struct`. Records, v2 wire structs,
  `project` and `rebuild` derive from it with byte-identical wire, and an emitted record equals its
  own round trip (ADR-QD-135).
- **ARCH-72/73/74 (Phases 24–26):** `prepareSource` owns the simulation source rule. The Simulator is
  a scoped session that owns its runs through a `FiberHandle`, and takes `{ session }` only. The
  dock is one headless `makeDockModel` over six stores (ADR-QD-137, ADR-QD-047 amended).
- **ARCH-75 (Phase 27):** `guardRoute` is deleted, so `addGuardedRoute` is the one bare guarded route
  constructor. The `/__permissions` routes moved to `PermissionRegistryRoute.ts`, with no export,
  path, status or log line changed.
- **ARCH-76 (Phase 28):** `GateWriter.ts` is a React-free leaf with a pure `reconcile`, the hooks moved
  into `useGate.ts`, and the test-only `useGateRegistration` is deleted (ADR-QD-140).
- **ARCH-77 (Phase 29):** three facts are each stated once now:
  - the port name and span live in the `PortName.ts` leaf, and `span` is `PortSpanOf<N>`;
  - hydration's withheld fields are `ALLOW_WITHHELD`/`DENY_WITHHELD`;
  - devtools' failure sentence is `FAILURE_IS_NOT_A_DENIAL`.

---

## v1.0 Arch Wave 5 (Shipped: 2026-11-09)

**Phases completed:** 9 phases, 33 plans, 40 tasks
**Closeout:** verified_closeout. All 9 phases `passed` against the final tree; phases 01, 02, 04
and 07 were re-verified at close because later phases had edited files their reports covered.
Open-artifact audit clean. 45/45 requirements checked off.
**Git range:** `8960dae` → `fb45b26` on `arch-wave-5` (240 commits, 2026-11-08 → 2026-11-09);
134 files changed outside `.planning`, +7,660 / −1,815.
**Merge gate:** full `pnpm check` green on Node 22.12.0 (CI run 42676403473 at 127d6fa).
**Records:** ARCH-46..54, ADR-QD-108..116 (112, 113, 115 unused), CCR-QD-385..393.

**Key accomplishments:**
- **ARCH-46:** every `@qadi/http` request path enforces and logs through one package-private
  module (`AuthorizeRequest.ts`), and unguarded port routes now log `SubjectExtractionFailed`.
  That log was missing before (the ENF-03 bug).
- **ARCH-47:** a port's span projection is stated once on its description (`pose`/`disclose`), and
  every local and served read runs through one `readPort` body, so local and served spans of
  one request are equal.
- **ARCH-48:** the audit archive's order, claim and sequence break live in one pure
  `archiveFacts` function shared by writer and reader; the writer refuses sequence numbers the
  reader cannot decode (`SequenceNumberInvalid`, `@qadi/audit` minor).
- **ARCH-49/50/51/52:** single owners for gate instrumentation (`useGates` over a writer resolved
  once), decision-log HTTP encoding and refusal (`DecisionLogHttp.ts`), both directions of
  hydration (`dehydrateWith`), and the remote-port route address (`PortRouteAddress.ts`).
- **ARCH-53:** port serving tables are derived from a serving facet on each port description
  (ADR-QD-114 amends ADR-QD-094); `tabulatePorts` is one body; `mapPorts` removed (**Breaking**,
  shipped in 0.10.0).
- **ARCH-54:** `SinkEmit` owns every sink record projection, and the JSON refusal vocabulary moved to
  the public leaf `JsonRefusal.ts`, so the port wire no longer depends on the sink wire.

**Known verification overrides:** 0 newly acknowledged, 0 carried forward.

**Carried forward:** Node 26 CI leg times out in mutation (60-minute limit); ~~devtools replay
fail-open on four ports' `none` answers needs a decision~~ (closed in v1.1 by ADR-QD-129 /
CCR-QD-407; corrected 2026-11-12); open warning/info review findings
(see PROJECT.md "Known Issues").

---
