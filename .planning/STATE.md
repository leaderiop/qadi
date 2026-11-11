---
gsd_state_version: "1.0"
milestone: v1.2
milestone_name: Arch Wave 7 (Phases 21-29)
current_phase: 24
current_phase_name: Simulation source preparation
status: verifying
stopped_at: Completed 24-03-PLAN.md
last_updated: "2026-11-11T06:17:31.021Z"
last_activity: 2026-11-11
last_activity_desc: Phase 23 complete, transitioned to Phase 24
state_head: 8bca7c2f7b8bc515fb32979d2871184e37889443
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 37
  completed_plans: 16
  percent: 33
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-11)

**Core value:** An authorization decision is never wrong and never silent.
**Current focus:** Phase 23 — Sink record fields stated once

## Current Position

Phase: 24 — Simulation source preparation
Plan: 3 of 3
Status: Phase complete — ready for verification
Last activity: 2026-11-11 — Phase 23 complete, transitioned to Phase 24

## Performance Metrics

**Velocity:**
- Total plans completed: 48
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 4 | - | - |
| 01 | 5 | - | - |
| 03 | 3 | - | - |
| 04 | 4 | - | - |
| 05 | 2 | - | - |
| 06 | 2 | - | - |
| 06 | 2 | - | - |
| 07 | 3 | - | - |
| 08 | 6 | - | - |
| 09 | 4 | - | - |
| 21 | 5 | - | - |
| 22 | 4 | - | - |
| 23 | 4 | - | - |
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
| Phase 04 P01 | 3 min | 2 tasks | 6 files |
| Phase 04 P02 | 5 min | 3 tasks | 3 files |
| Phase 04 P03 | 10 min | 3 tasks | 10 files |
| Phase 04 P04 | 3 min | 2 tasks | 0 files |
| Phase 05 P01 | 4 min | 2 tasks | 5 files |
| Phase 05 P02 | 6 min | 3 tasks | 6 files |
| Phase 06 P01 | 6 min | 2 tasks | 6 files |
| Phase 06 P02 | 6 min | 3 tasks | 7 files |
| Phase 07 P01 | 5 min | 2 tasks | 4 files |
| Phase 07 P02 | 10 min | 2 tasks | 5 files |
| Phase 07 P03 | ~1h | 2 tasks | 0 files |
| Phase 08 P01 | 10min | 2 tasks | 1 files |
| Phase 08 P02 | 25min | 2 tasks | 11 files |
| Phase 08 P03 | 35min | 3 tasks | 15 files |
| Phase 08 P04 | 15min | 2 tasks | 7 files |
| Phase 08 P06 | 35min | 3 tasks | 5 files |
| Phase 09 P01 | 5 min | 2 tasks | 3 files |
| Phase 09 P02 | 12 min | 3 tasks | 14 files |
| Phase 09 P03 | 10 min | 3 tasks | 9 files |
| Phase 09 P04 | 15 min | 2 tasks | 3 files |
| Phase 11 P01 | 15 min | 3 tasks | 8 files |
| Phase 11 P07 | 20 min | 2 tasks | 6 files |
| Phase 12 P05 | 40 min | 3 tasks | 21 files |
| Phase 13 P12 | 25 min | 4 tasks | 6 files |
| Phase 14 P07 | 40 min | 2 tasks | 9 files |
| Phase 20 P04 | 40 min | 3 tasks | 8 files |
| Phase 21 P01 | 8 min | 3 tasks | 5 files |
| Phase 21 P02 | 10 min | 2 tasks | 5 files |
| Phase 21 P03 | 18 min | 3 tasks | 9 files |
| Phase 21 P04 | 12 min | 2 tasks | 7 files |
| Phase 21 P05 | 25 min | 3 tasks | 11 files |
| Phase 22 P01 | 3 min | 1 tasks | 2 files |
| Phase 22 P02 | 3 min | 3 tasks | 4 files |
| Phase 22 P03 | 70min | 3 tasks | 23 files |
| Phase 22 P04 | 17 min | 3 tasks | 20 files |
| Phase 23 P01 | 26 min | 4 tasks | 5 files |
| Phase 23 P02 | 31 min | 3 tasks | 7 files |
| Phase 23 P03 | 8 min | 2 tasks | 3 files |
| Phase 23 P04 | 35 min | 3 tasks | 11 files |
| Phase 24 P01 | 8 min | 2 tasks | 3 files |
| Phase 24 P02 | 10 min | 2 tasks | 6 files |
| Phase 24 P03 | 12 min | 3 tasks | 10 files |

## Accumulated Context

### Decisions

- v1.0 Arch Wave 5 decisions are logged in PROJECT.md (Key Decisions) and in full in
  `.planning/milestones/v1.0-phases/*/` (CONTEXT, SUMMARY, REVIEW-DISPOSITION files).
- [Phase 21]: 21-01: phase base is ba38f367; PREQ-04 shown by hand (dropped signerRole compiles, caught only by PortConformance); ARCH-69 key law red on the four derived ports, wire bytes pinned green
- [Phase 21]: 21-02: QuestionOf<Q> types toQuestion; portWire drops undefined members (presentMembers) before encodeUnknownResult; wire bytes unchanged
- [Phase 21]: 21-03: makePortDescription derives key (canonicalKey of the wire question) and defect (failure of the squashed cause) for four ports; CustomPredicate states its own, documented; the ARCH-69 law replaced their key and defect pins
- [Phase 21]: 21-04: portSpan (typed identity) holds each pose to PoseOf its span question: every member but interpreter, required key | undefined; an omitted member is a compile error, span attributes unchanged
- [Phase 21]: Pending key changeset amended in place for ARCH-69; ADR-QD-107 pointer is a dated amendment section
- [Phase 22]: D-02 = A: missing resource id leaves only the port span; requireResourceId deleted
- [Phase 22]: D-05 = state once: leaf->request mapping stated once on each port description (asks); reads and servingFor derive from it; ADR-QD-134 records the override
- [Phase 22]: 22-02: negative tstyche call pins over Effect-returning reads use a result-dropping Params<F> alias (a bare call is a floating-effect diagnostic, so it reads as not callable and could never be RED)
- [Phase 22]: PortDescription carries exact per-port Asks (LeafRequests<P>) so d.asks[tag] correlates without a cast; askActed overloaded on AnyActedLeaf to keep toPredicate's error type unchanged
- [Phase 22]: ADR-QD-134 records D-02 = A and D-05 = state once, quoted from _DECISIONS-v1.2.md with the standing instruction; D-05 overrides the planner's earlier choice
- [Phase 22]: Predicate.ts Folded is { value } | undefined, removing its one equivalent mutant so the file's mutation score holds at its phase base
- [Phase 23]: 23-01: record shape A (one Schema.Struct per record, Data.TaggedClass typed by it) with keys absent, from _DECISIONS-v1.2.md; the bench shows Schema.TaggedClass costs 5.3x to 140x per record on the evaluation path
- [Phase 23]: 23-02: cache-outcome literals live in the package-private leaf SinkRecordFields.ts; CacheOutcome stays exported from EvaluationMetrics.ts as the schema's Type
- [Phase 23]: 23-02: undefined-valued optional keys are dropped by one generic in-place omitUndefined in project, not a per-field encode transformation (0.2 to 0.3 us per field measured)
- [Phase 23]: 23-02: SinkRecordTag is derived from the record tags (type-only import of the leaf); pnpm circular green. Small-record encode costs 5 to 10 percent more, inherent to the spread projection
- [Phase 23]: 23-03: decisionRecordFor takes cache as an optional last parameter and builds resource, action and cache with conditional spreads, so absent stays absent (no shared keyed helper: a computed key needs a cast)
- [Phase 23]: 23-04: ADR-QD-135 file is 135-sink-record-fields-stated-once.md (the leaf already links that path); rebuild strips only version because the _tag and outcome strips were no-ops that left surviving mutants
- [Phase 24]: 24-01: prepareSource table test is red by absence in its own file; no defect to pin (D-01)
- [Phase 24]: prepareSource's table builds a Ready lazily (thunk), so build() makes a recorder only for the chosen Live row
- [Phase 24]: ADR-QD-136 unused: the source-choice rule moved, so ADR-QD-050 is amended (CCR-QD-414)
- [Phase 24]: SimulationSession.ts mutation score 0.9612 vs base 0.9619; all 12 survivors equivalent, left for human acceptance

### Pending Todos

- v1.2: phases open on a `checkpoint:decision` (23-01, 25-01, 28-01; see ROADMAP); answer each once when its phase starts. 22-01's two were already answered in `_DECISIONS-v1.2.md` (done 2026-11-11).
- v1.2: v1.1's phase dirs (10-20) are not yet archived to `.planning/milestones/v1.1-phases/`; do it with /gsd-complete-milestone when v1.1 is released or explicitly closed.

- Before each phase executes, confirm its reserved numbers against PROJECT.md's wave-6 reservation table
  (grep `spec/` first). ARCH ids below 59 are never reused; CCR-QD-394 is used by ARCH-58.

### Blockers/Concerns

- [CI] The Node 26 matrix leg exceeds the 60-min `timeout-minutes` during mutation on a full `pnpm check` (seen at c807b64 and 127d6fa); release PRs will hit it.
- [Host] `pnpm example` needs sudo on this Fedora host (`playwright install --with-deps`). Route that works: the literal `pnpm check:pr` in a rootless podman Ubuntu Playwright container (`mcr.microsoft.com/playwright:v1.65.0-noble`), or CI.
- [Host] Run vitest from the repo root with `--project <pkg>`; running inside a package dir fails at collection.
- `.planning/` is tracked (no `.gitignore` line). `.planning/architecture/` was archived under `.planning/milestones/archive-pre-gsd/` (tracked) by Phase 10 on 2026-11-10.
- Shared spec files (README, traceability, invariants, overview, decisions/index.yaml) are edited by every phase, so parallel worktrees will conflict on revision lines. Use `scripts/spec-revise.mjs`. BEH/INV ids are allocated with `node scripts/next-id.mjs`.
- Devtools replay: the other four ports' `none` answers still grant under `not(...)` on a capture miss (INV-QD-007 fail-open). Flipping each is one word in Capture.ts's `UNSEEN_REQUEST_IS_AN_OUTAGE`; needs a decision.
- Write requirement lines as explicit ID lists, never ranges like `XC-01..05`: `phase.complete` cannot parse ranges.
- Open review findings carried from v1.0 (warning/info): 01 WR-02/WR-03/IN-03; 02 IN-01..07; 04 IN-01..03; 05 WR-01/IN-01/IN-02; 07 IN-01..03; 09 IN-01. 01 and 08 VALIDATION.md files are still `draft`.
- [Phase 22] Review findings (22-REVIEW-DISPOSITION.md): all seven fixed (WR-01 23e54421, WR-02 d4d62133, IN-01..05 3371400e..9e2b90bc). Phase 21's six findings also fixed (f0977945..7144dfba; 21-REVIEW-DISPOSITION.md).
- [Phase 22] `phase.complete` cannot match REQUIREMENTS.md's grouped traceability table (one row per phase listing several IDs), so v1.2 rows stay `Pending`; update them by hand or reshape the table.

## Session Continuity

Last session: 2026-11-11T06:17:30.626Z
Stopped at: Completed 24-03-PLAN.md
Resume file: None

## Operator Next Steps

- Execute Phase 21: /gsd-execute-phase 21 (plans in `.planning/phases/21-port-request-derivation/`)
