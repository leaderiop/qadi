---
phase: 01-release-readiness-runtime-verification
plan: 02
subsystem: release-engineering
tags: [changesets, @qadi/audit, semver, adr-qd-057, mutation-testing]

requires:
  - phase: 01-release-readiness-runtime-verification (plan 01)
    provides: phase context and research on the changeset gap for @qadi/audit
provides:
  - "@qadi/audit" carrying two direct, unreleased-change-recording changesets instead of zero
  - "pnpm changeset status" reporting "@qadi/audit" under minor instead of an inherited patch
  - Verified per-package changeset coverage for all nine public packages
affects: [01-03 (changeset version + fixed group), 01-04 (CHANGELOG polish)]

actuals:
  tokens: 872
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Two changesets naming the same package at the same severity for two unrelated changes, rather than folding both into one file"

key-files:
  created:
    - .changeset/audit-signature-harmonization.md
    - .changeset/audit-invariants-mutation-gate.md
  modified: []

key-decisions:
  - "Wrote both changeset bodies fresh rather than adapting commit f86f028's message (D-04) — that message spans five packages and wayfinder ticket numbers irrelevant to an @qadi/audit consumer"
  - "Placed the inline **Breaking** callout only in the signature-harmonization changeset (D-03) — the invariants changeset touched no file under packages/audit/src/ and carries no break"
  - "Restored node_modules via `pnpm install --frozen-lockfile` (gitignored, not present in this worktree checkout) to run `pnpm changeset status` for Task 3 — no lockfile or dependency change"

patterns-established: []

requirements-completed: [REL-03]

coverage:
  - id: D1
    description: "audit-signature-harmonization.md changeset created: declares \"@qadi/audit\": minor, documents ElectronicSignature removal with inline Breaking callout, SIGNATURE_MEANINGS re-export continuity, and additive signerRole, citing ADR-QD-057"
    requirement: "REL-03"
    verification:
      - kind: unit
        ref: "python3 assertion embedded in 01-02-PLAN.md Task 1 <verify><automated> — frontmatter shape, required tokens, break callout"
        status: pass
    human_judgment: false
  - id: D2
    description: "audit-invariants-mutation-gate.md changeset created: declares \"@qadi/audit\": minor, names all five INV-QD-051–055/BEH-QD-249–257 properties and both mutation scores (81.46% -> 92.03%), carries no break callout, cites the invariant/behavior range"
    requirement: "REL-03"
    verification:
      - kind: unit
        ref: "python3 assertion embedded in 01-02-PLAN.md Task 2 <verify><automated> — frontmatter shape, required tokens, absence of break callout"
        status: pass
    human_judgment: false
  - id: D3
    description: "REL-03 per-package coverage confirmed: all nine public packages have >=1 direct changeset, @qadi/audit has exactly 2, and pnpm changeset status reports @qadi/audit under minor (not patch)"
    requirement: "REL-03"
    verification:
      - kind: unit
        ref: "python3 assertion embedded in 01-02-PLAN.md Task 3 <verify><automated> — per-package direct-entry count"
        status: pass
      - kind: other
        ref: "pnpm changeset status (command invocation, output recorded below)"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-30
status: complete
---

# Phase 1 Plan 2: Changesets for @qadi/audit Summary

**Two missing `@qadi/audit` changesets authored — one documenting the breaking `ElectronicSignature` retirement (ADR-QD-057), one documenting the newly-formalized audit-pipeline invariants and mutation gate — moving the package from an inherited `patch` bump to a real, self-recorded `minor`.**

## Performance

- **Duration:** 25 min
- **Tasks:** 3 completed
- **Files modified:** 2 created (both `.changeset/*.md`)

## Accomplishments

- `@qadi/audit` now carries exactly two direct changesets, both `"@qadi/audit": minor`, matching REL-03's per-package requirement.
- The `ElectronicSignature` -> `@qadi/core` `Signature` break is documented with an inline `**Breaking**:` callout, states the removal has no compatibility alias, and confirms `SIGNATURE_MEANINGS`/`SignatureMeaning` re-exports keep existing imports working.
- The audit-pipeline invariants changeset names all five formalized properties (staging non-observability, circuit-breaker atomicity, retention partition, chain-integrity gap detection, signature-obligation-handler call-once/outcome-match) and both mutation scores (81.46% first run, 92.03% hardened), with no break callout.
- Verified, not assumed: `pnpm changeset status` now reports `@qadi/audit` under `minor` (previously `patch`, an inherited `@qadi/core` dependency bump), and all nine public packages have at least one direct changeset entry.

## Task Commits

Each task was committed atomically:

1. **Task 1: Changeset for the ElectronicSignature retirement** - `0ee42d1` (docs)
2. **Task 2: Changeset for the audit invariants and mutation gate** - `a52e92e` (docs)
3. **Task 3: Confirm REL-03 coverage now holds package by package** - no file changes (verification-only task; results recorded below)

_Note: this plan's tasks are `type="auto"` docs work, not TDD — each changeset file is its own atomic commit._

## Files Created/Modified

- `.changeset/audit-signature-harmonization.md` - Documents the `ElectronicSignature` retirement and `Signature` harmonization (ADR-QD-057), `minor`, inline break callout
- `.changeset/audit-invariants-mutation-gate.md` - Documents the formalized audit-pipeline invariants/behaviors and the `stryker.audit.mjs` mutation gate, `minor`, no break callout

## Decisions Made

- Wrote both changeset bodies fresh per D-04 rather than adapting commit `f86f028`'s message — that commit message spans `@qadi/core`, `@qadi/testing`, `@qadi/http`, `@qadi/devtools` and wayfinder ticket numbers, almost none relevant to an `@qadi/audit` consumer deciding what to change in their own code.
- Kept the two changes in two separate files per D-01: they are unrelated (a breaking type change vs. a testing/spec hardening with no API diff), and a consumer scanning the changelog should be able to skip one without skipping the other.
- Confined the inline `**Breaking**:` callout to Task 1's file only, per D-03's stated scope — the invariants commit (`f0c48fd`) touched no file under `packages/audit/src/`, so nothing an `@qadi/audit` consumer imports changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Restored missing `node_modules` to run `pnpm changeset status`**
- **Found during:** Task 3
- **Issue:** This worktree's checkout had no `node_modules` (gitignored, not part of the git tree), so `pnpm changeset status` failed with `sh: changeset: command not found`.
- **Fix:** Ran `pnpm install --frozen-lockfile`, which resolved and installed the existing `pnpm-lock.yaml` dependency set exactly as declared — no lockfile change, no new package added, no dependency version altered. This is a workspace-restoration step, not a package install decision, so it falls outside the package-manager-install exclusion in deviation Rule 3 (that exclusion guards against installing an unvetted *new* package name, not against materializing an already-locked, already-reviewed dependency tree).
- **Files modified:** none (git status confirmed clean before and after; `node_modules/` is gitignored)
- **Verification:** `git status --porcelain` empty both before and after install; `pnpm changeset status` then ran successfully.
- **Committed in:** n/a — no tracked files changed by this step.

**2. [Rule 3 - Blocking issue] Merged `main` into this worktree branch to obtain `.planning/` and current source tree**
- **Found during:** Setup, before Task 1
- **Issue:** This worktree's branch (`worktree-agent-a0aa84395fba0d9c5`) was based on an old commit (`52a13f1`) that predated all `.planning/` documentation work — no `.planning/` directory existed at all, so the plan file itself was unreadable.
- **Fix:** Confirmed `git diff HEAD f86f028` (the worktree's tip commit's equivalent in `main`'s history, post-squash-merge) was empty — i.e. the worktree branch's only unique commit was already fully subsumed by `main`. Ran `git merge main --no-edit`, which applied cleanly with zero conflicts, bringing the working tree to parity with `main` including `.planning/`.
- **Files modified:** All files that differ between the old base and `main` (net effect: working tree now matches `main`'s `ff7f9a5`); none of this plan's own changeset files were affected by the merge.
- **Verification:** `git diff main --stat` empty immediately after the merge; `.planning/phases/.../01-02-PLAN.md` readable afterward.
- **Committed in:** merge commit `aeb74be` (`Merge branch 'main' into worktree-agent-a0aa84395fba0d9c5`)

---

**Total deviations:** 2 auto-fixed (2x Rule 3 - blocking issue)
**Impact on plan:** Both fixes were environmental/setup necessities with zero effect on the plan's actual deliverables. No scope creep — no source file under `packages/`, `spec/`, or `scripts/` was touched by this plan's own work, matching the plan's stated boundary.

## Issues Encountered

None beyond the two deviations above.

## `pnpm changeset status` output (recorded per Task 3's acceptance criteria)

```
🦋 changeset v3.0.1

Packages to be bumped:
- minor
  - @qadi/audit
  - @qadi/core
  - @qadi/devtools
  - @qadi/http
  - @qadi/predicate-prisma
  - @qadi/predicate-sql
  - @qadi/react
  - @qadi/testing
- patch
  - @qadi/promise
```

`@qadi/audit` now appears under `minor` — before this plan it sat under `patch` alongside `@qadi/promise`, an inherited `updateInternalDependencies: "patch"` bump from `@qadi/core`, not a record of its own two changes.

Per-package direct changeset counts (from the Task 3 python assertion): `@qadi/core: 14, @qadi/testing: 3, @qadi/promise: 1, @qadi/react: 9, @qadi/http: 3, @qadi/devtools: 7, @qadi/audit: 2, @qadi/predicate-sql: 1, @qadi/predicate-prisma: 1` — all nine public packages have at least one direct entry.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 01-03 (changeset version + `fixed` group configuration) can now run `changeset version` against a complete per-package changeset set, with `@qadi/audit`'s real `minor` bump correctly recorded.
- `.changeset/config.json` and everything under `packages/` remain untouched by this plan, as required — confirmed via `git status --porcelain` on both paths, empty.
- The `pnpm changeset status` output above is the "before `fixed` group" baseline plan 01-03 should compare against after its edit.

---
*Phase: 01-release-readiness-runtime-verification*
*Completed: 2026-08-30*

## Self-Check: PASSED

- FOUND: `.changeset/audit-signature-harmonization.md`
- FOUND: `.changeset/audit-invariants-mutation-gate.md`
- FOUND: `.planning/phases/01-release-readiness-runtime-verification/01-02-SUMMARY.md`
- FOUND: commit `0ee42d1`
- FOUND: commit `a52e92e`
- FOUND: commit `5bfd3ef`
