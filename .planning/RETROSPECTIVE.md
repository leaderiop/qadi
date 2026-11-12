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

## Milestone: v1.2 — Arch Wave 7

**Completed:** 2026-11-12 (not merged, not released)
**Phases:** 9 | **Plans:** 38 | **Tasks:** 75 | **Sessions:** one autonomous run (`/gsd-autonomous`), with context compactions

### What Was Built
- ARCH-69/70: a port's request key is derived from its wire question, and the request each policy leaf asks is stated once (`asks`). One `readScoped`, with one span, serves the three resource-scoped ports.
- ARCH-71: each sink record's fields are one `Schema.Struct`. The class, the v2 wire struct and the projection derive from it, and the wire stayed byte-identical.
- ARCH-72/73/74: `prepareSource` owns the simulation source rule. The Simulator is a scoped session that owns its runs through a `FiberHandle`, and the dock is one headless `makeDockModel`.
- ARCH-75: `addGuardedRoute` is the one bare guarded route constructor. The `/__permissions` routes moved out of the registry module.
- ARCH-76: the gate writer is a React-free leaf with a pure `reconcile`, and the test-only hook is deleted.
- ARCH-77: three facts are each stated once now: port name and span (`PortName.ts`), hydration's withheld fields, and devtools' failure sentence.

### What Worked
- Human decisions were answered up front, in one file (`_DECISIONS-v1.2.md`, D-01 for 22/23/25/28), so the run paused for the user only twice: the Phase 25 visual check and the tech-debt question.
- Each phase had a per-file Stryker baseline committed before any source change (WX-05). It caught real drops at phase end (`SimulationSession.ts`, `HydrationEngine.ts`) and at the milestone close (`SignatureHistory.ts`). Every drop was closed with a test, never by re-baselining.
- The review → fix → re-review loop found a warning in most phases after verification passed (e.g. Phase 29 WR-01, an ADR still naming the old home of `PortName`).
- Red tests committed before the refactor (26-01's sixteen dock rules, 25-01's 31 session tests) made "behaviour unchanged" checkable.

### What Was Inefficient
- `astro check` waited on an install prompt, and one `pnpm check:pr` run hung for 30 minutes before anyone noticed. The gate only runs reliably with stdin closed.
- Phases 21–23 went stale again because later phases touched the files their reports covered. They were re-verified at close, the same as v1.0.
- `phase.complete` could not update REQUIREMENTS.md's grouped traceability rows, so they were updated by hand again (v1.0's lesson 2, not applied to the table shape).
- `scripts/spec-revise.mjs` silently drops its document argument without `--date`.
- A network failure in 28-03 needed a resume.
- v1.1 was merged (#155) but never closed as a GSD milestone, which left its phases and requirements unarchived for v1.2's close to find.

### Patterns Established
- A decisions file answered before the run (`_DECISIONS-v1.2.md`). Each checkpoint plan quotes the human's words into its ADR.
- A mutation re-check at milestone close (`*-mutation-recheck.json`) on top of the per-phase check, because later phases can lower an earlier phase's file.
- A finding that only an untyped caller can reach is recorded as tech debt, not pinned by a test that would lock in the bad behaviour.

### Key Lessons
1. Close each milestone in GSD as soon as it merges. An unarchived milestone leaks into the next close.
2. Run `pnpm check:pr` with `< /dev/null` until gate 15's install prompt is fixed, and treat a step silent for more than 10 minutes as hung.
3. Make REQUIREMENTS traceability one row per ID, so `phase.complete` can tick it. A grouped table drifts every milestone.
4. Re-measure mutation for every touched file at close, not only per phase.

### Cost Observations
- Model mix: opus for the orchestrator and every subagent (planner, executor, reviewer, verifier).
- Sessions: one long autonomous run across several context compactions.
- Notable: 272 commits over two days. Stryker runs strictly one at a time, and they were the longest step of each phase close.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | n/a | 9 | First GSD milestone; one phase per architecture-review finding |
| v1.2 | 1 (autonomous) | 9 | Decisions answered up front; per-file mutation baseline per phase (WX-05) and a re-check at close |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | vitest 3974+559+42, e2e 30 (Phase 07 UAT run) | core ≥95%, others ≥90% (enforced) | 0 |
| v1.2 | vitest 4400 (core/react/http/devtools/audit at audit), tstyche 233, e2e 30 | core ≥95%, others ≥90% (enforced); no touched file's mutation score fell | 0 |

### Top Lessons (Verified Across Milestones)

1. Re-verify at close: a later phase that touches shared files makes earlier verification stale (v1.0: 4 phases; v1.2: 3 phases).
2. Run review → fix after verification passes: it found warnings verification missed in both milestones.
3. Shape tooling inputs so tools can read them: v1.0's requirement ranges and v1.2's grouped traceability rows both forced hand edits.
