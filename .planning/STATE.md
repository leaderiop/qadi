---
gsd_state_version: "1.0"
current_phase: 03
current_phase_name: Audit archive facts
status: verifying
stopped_at: Completed 03-03-PLAN.md
last_updated: "2026-11-08T04:08:01.361Z"
last_activity: 2026-11-08
last_activity_desc: Phase 03 execution started
state_head: 880edca1c03806cdc308ca1d496667b1e812e5a6
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 33
  completed_plans: 12
  percent: 22
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-08)

**Core value:** An authorization decision is never wrong and never silent.
**Current focus:** Phase 03 — Audit archive facts

## Current Position

Phase: 03 (Audit archive facts) — EXECUTING
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-11-08 — Phase 03 execution started

Progress: [█████░░░░░░░░░░░░░░░] 9/33 plans ([██░░░░░░░░] 22%); 2/9 phases

## Performance Metrics

**Velocity:**
- Total plans completed: 9
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 4 | - | - |
| 01 | 5 | - | - |
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P01 | 8 min | 2 tasks | 12 files |
| Phase 02 P02 | 6 min | 2 tasks | 12 files |
| Phase 02 P03 | 18 min | 3 tasks | 10 files |
| Phase 02 P04 | 25min | 3 tasks | 7 files |
| Phase 03 P01 | 5 min | 2 tasks | 1 files |
| Phase 03 P02 | 3 min | 3 tasks | 6 files |
| Phase 03 P03 | 20 min | 3 tasks | 9 files |

## Accumulated Context

### Decisions

- 2026-11-08: There is one phase per review finding; ARCH-46..54, ADR-QD-108..116 and CCR-QD-385..393 are reserved in phase order.
- 2026-11-08: Phase 8 waits on a human checkpoint before amending ADR-QD-094.

- 2026-11-08 (planner): Phase 1 takes `AuthorizeRequest.ts` out of the barrel and re-exports `authorizeRequest`/`AuthorizedRequest` from `GuardApi.ts`, so no export is added or removed.
- 2026-11-08 (planner): Phase 2 keeps `onFile` off both spans (BEH-QD-227 does not promise it). `SignatureQuery` gains optional `meaning`/`signerRole`, which also amends ADR-QD-058.
- 2026-11-08 (planner): Phase 4 implements D-03 by intent. The per-entry lookup lives in `useGates`, memoised on the group atom, because reusing group atoms would break BEH-QD-068.
- 2026-11-08 (planner): Phases 5, 6 and 9 leave ADR-QD-112, ADR-QD-113 and ADR-QD-115 unused (CCR/amendment instead).
- 2026-11-08 (planner): Phase 8 removes `mapPorts`, which is **Breaking** (shipped in @qadi/core 0.10.0). The overloaded `tabulatePorts` implementation signature needs reviewer attention.
- [Phase 02]: Phase 02 P01: pose beside disclose on each port description's span attributes; readPort is the one read body, a plain function that opens no span
- [Phase 02]: Phase 02 P01: D-03 recorded, local and served signature spans are equal including meaning, signer_role and matched; onFile is on neither span
- [Phase 02]: Phase 02 P01: the three resource-scoped reads annotate the question twice with agreeing values on the success path, to keep annotate-then-validate literal (ADR-QD-109 consequence)
- [Phase 02]: 02-02: signature request key is [subjectId, resourceId, meaning, signerRole]; wire question gains optional meaning/signerRole — Injective over every argument the port receives (INV-QD-043). (The original claim that over-keying "can only miss and deny" was false under `not(hasSignature)`; corrected by WR-03/WR-04, see below.) SignatureLedgerTest groups by the requirement-less key because a store answers every signature on file.
- [Phase 02]: INV-QD-244 used for the new span invariant (next-id printed 244; phase 1 took 243)
- [Phase 02]: ADR-QD-109 records onFile on neither span and names PORT-04's inaccurate premise
- [Phase 02]: 02-04: the one-port-read changeset is not marked Breaking; the reshaped PortSpanAttributes and removed PortWireSpan/spanQuestion/spanAnswer were never published (0.11.0 predates ARCH-21 and ARCH-31)
- [Phase 02] review fix WR-01: `disclose` runs under `catchPortDefect`, so a malformed store answer is the port's typed error. Wire-visible change: a served read of one now replies `Unavailable` (was `Refused: Unencodable`)
- [Phase 02] review fix WR-02: the annotate-before-validate question is `pose` of the request plus the read's own `scope: "Resource"`, not hand-written
- [Phase 02] review fix WR-04 (user decision): devtools replay answers an unseen SignatureHistory request as `SignatureHistoryUnavailable`, not an empty list; per-port `UNSEEN_REQUEST_IS_AN_OUTAGE` table in Capture.ts (INV-QD-043 1.80, ADR-QD-109 1.4, BEH-QD-221)
- [Phase 03]: 03-01: ArchiveRoundTrip.test.ts imports only AuditArchive.ts, AuditEntry.ts and helpers.ts so it stays unchanged through plan 03-02 and proves the refactor preserved behavior
- [Phase 03]: ArchiveFacts.ts owns the archive order, claim rule and sequence break; the reader derives its out-of-order index from the writer's comparator and never sorts or repairs
- [Phase 03]: verifySequenceIntegrity is an unnamed Effect.fn over verifiedArchiveFacts, so span qadi.audit.verifySequenceIntegrity opens once per call and UNTRACED_BUDGET is unchanged
- [Phase 03]: ADR-QD-110 and CCR-QD-387 used as reserved; ADR-QD-056 amended; INV-QD-054 Implication left untouched

### Pending Todos

- Confirm the reserved ADR/CCR/ARCH numbers are still free before each phase executes.

### Blockers/Concerns

- [Phase 01] `pnpm example` cannot finish on this Fedora host without sudo (`playwright install --with-deps`); UAT ran its e2e suite directly (30/30). A single uninterrupted `pnpm check` run still needs CI or a host with sudo.
- [Phase 01] 01-VALIDATION.md is still `draft` (nyquist audit not completed); REQUIREMENTS.md has no Traceability rows for ENF-01..06/XC-01..05 and ENF-03 is unregistered (phase.complete warnings).

- Phase 8 Plan 08-01 is a blocking human checkpoint (SERV-01: amend ADR-QD-094 or not).
- `.planning/` is gitignored (`.gitignore:43`) even though `commit_docs: true`. Committing planning docs needs `git add -f` or a .gitignore change.
- Shared spec files (README, traceability, invariants, overview, decisions/index.yaml) are edited by every phase, so parallel worktrees will conflict on revision lines. Use `scripts/spec-revise.mjs`.
- BEH/INV ids are allocated at execution time with `node scripts/next-id.mjs`.
- [Phase 02] Pre-existing, out of scope: in devtools replay the other four ports' `none` answers (attribute `undefined`, relationship/history `Unknown`, custom `false`) still grant under `not(...)` on a capture miss — the INV-QD-007 fail-open an unwired deployment also has. Flipping them is one word each in Capture.ts's `UNSEEN_REQUEST_IS_AN_OUTAGE`; needs a decision.
- Seven info-level review findings for Phase 02 remain open (02-REVIEW-DISPOSITION.md: IN-01..07).

## Session Continuity

Last session: 2026-11-08T04:08:01.282Z
Stopped at: Completed 03-03-PLAN.md
Resume file: None
