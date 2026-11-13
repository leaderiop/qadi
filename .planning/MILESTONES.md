# Milestones

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
