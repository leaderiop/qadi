# Milestones

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
