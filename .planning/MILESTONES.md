# Milestones

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

**Carried forward:** Node 26 CI leg times out in mutation (60-minute limit); devtools replay
fail-open on four ports' `none` answers needs a decision; open warning/info review findings
(see PROJECT.md "Known Issues").

---
