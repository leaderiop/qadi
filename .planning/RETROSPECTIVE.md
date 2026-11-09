# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Arch Wave 5

**Shipped:** 2026-11-09
**Phases:** 9 | **Plans:** 33 | **Sessions:** not tracked

### What Was Built
- ARCH-46: one enforcement module for every `@qadi/http` request path, which fixed the missing `SubjectExtractionFailed` log on unguarded port routes (ENF-03).
- ARCH-47: one span projection per port (`pose`/`disclose`) and one `readPort` body, so local and served spans are equal.
- ARCH-48: `ArchiveFacts.ts` shared by the audit archive's writer and reader, plus the new `SequenceNumberInvalid` refusal.
- ARCH-49 to ARCH-52: single owners for gate instrumentation, decision-log HTTP, hydration in both directions, and the remote-port route address.
- ARCH-53: serving tables derived from a serving facet on each port description (ADR-QD-114), and `mapPorts` removed (Breaking).
- ARCH-54: `SinkEmit` owns every sink record, and the refusal vocabulary moved to `JsonRefusal.ts`.

### What Worked
- One phase per review finding, each with its own reserved ARCH/ADR/CCR numbers. Phases stayed independent, and an unused number was simply recorded as unused.
- Characterisation tests landed before the refactor moved anything (03-01's fast-check properties, 06-01's pinned outputs), so "behaviour unchanged" was proven, not asserted.
- The code-review → disposition → fix loop caught real defects after verification had passed: WR-01 in phases 02, 03, 07 and 09 (e.g. the obligation record being projected after the handler ran).
- The human checkpoint before amending ADR-QD-094 (Phase 8, D-01) kept the one cross-cutting design change deliberate.

### What Was Inefficient
- The literal `pnpm check:pr` could not run on the Fedora dev host (sudo-only `playwright install --with-deps`), so every phase spent effort on workarounds until Phase 06 found the podman Ubuntu container route.
- The full `pnpm check` (with mutation) does not fit the 60-minute CI job limit on the Node 26 leg, so "green CI" needed per-leg interpretation.
- Verification reports went stale whenever a later phase touched a file they covered. Four phases had to be re-verified at milestone close.
- Requirement ranges (`XC-01..05`) in ROADMAP could not be parsed by `phase.complete`, so traceability rows drifted (ENF-03 stayed unticked though satisfied).

### Patterns Established
- Package-private leaf modules (`AuthorizeRequest.ts`, `ArchiveFacts.ts`, `DecisionLogHttp.ts`, `PortRouteAddress.ts`, `JsonRefusal.ts`) as the home for one concept, kept out of the barrel per ADR-QD-099.
- An ADR only when a documented contract changes; otherwise a CCR row (Phases 5, 6, 7, 9).
- UAT checks that commands can settle are run by the agent (push + `gh workflow run check.yml`), not asked of the user.

### Key Lessons
1. Fix the dev-host merge-gate route before the first phase. A container that runs the literal gate saves a workaround in every phase.
2. Name requirements explicitly in ROADMAP (no ranges), so tooling can keep traceability honest.
3. Expect shared hot-spot files to invalidate earlier verification reports. Re-verify at close rather than treating stale as failed.
4. Run the review-fix loop even after verification passes. It found defects verification missed.

### Cost Observations
- Model mix: planning on opus; verification and plan checking on sonnet.
- Sessions: not tracked.
- Notable: 240 commits in two days. Four parallel re-verifications at close took about 1–2 minutes each.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 9 | First GSD milestone; one phase per architecture-review finding |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | vitest 3974+559+42, e2e 30 (Phase 07 UAT run) | core ≥95%, others ≥90% (enforced) | 0 |

### Top Lessons (Verified Across Milestones)

1. (Needs a second milestone to cross-validate.)
