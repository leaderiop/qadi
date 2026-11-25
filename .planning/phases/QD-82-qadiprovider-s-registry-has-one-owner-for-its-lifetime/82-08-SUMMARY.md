---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
plan: 08
subsystem: release-records
tags: [changeset, website, spec, ccr, registry-lease, activity]
requires: [82-07]
provides:
  - .changeset/react-registry-recycled-in-place.md, a `"@qadi/react": patch` changeset naming the long-hide fix and the losses a host can see
  - the website's React page restated (one registry for the provider's life, recycled in place)
  - the CCR-QD-474 row completed at spec/README.md Rev 1.396, every changed spec document at its final revision, every reserved id used
affects: [82-09, 82-10]
key-files:
  created:
    - .changeset/react-registry-recycled-in-place.md
  modified:
    - apps/website/src/content/docs/docs/packages/react/index.md
    - spec/README.md
key-decisions:
  - "Decided autonomously: the CCR-QD-474 row lists the documents in the order they were first changed (ADR-QD-195, its index entry, traceability, then the three amended ADRs, then the behaviours, invariants and appendix), with ADR-QD-103 read-and-unchanged last among the spec documents, and the changeset and the website page after them"
  - "Decided autonomously: the row's summary also names the three losses a host can see after a long hide and says no export changed and no reserved id is left Unused"
requirements-completed: [LEASE-05, WX-02, WX-03]
duration: 9min
completed: 2026-11-25
status: complete
commits: 2
plan_head_before: 541909aa6778e1c09caa3cce7d9fe730947bd771
plan_head_after: 6e8554762566a598121afe64d299dc3151ae6a89
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase QD-82 Plan 08: The patch changeset, the website page and the completed CCR row Summary

**A `@qadi/react` patch changeset says a provider hidden by an `<Activity>` past a macrotask no longer throws, that seeds and `initialValues` are not re-applied, and what a host loses; the website page says the provider recycles its one registry rather than disposing it; the CCR-QD-474 row names every changed spec document, uses every reserved id, and the api surface is unchanged at 942 exports.**

## Performance

- **Duration:** 9 min
- **Tasks:** 2
- **Files modified:** 3 (one created)

## Accomplishments

- Task 1 (tracer): the changeset is the only one added and mentions `Activity`, `initialValues`, pending gates (a seeded gate with no subject or an unanswered resolver stays pending until the client answers), a host atom back at its default and a detached direct subscription. The website sentence that said the provider "disposes it on unmount" now says it owns one registry for its life and recycles it in place a macrotask after its last cleanup. `packages/react/README.md` states no disposal and is unchanged, as are `spec/overview.md` and the upgrade guide. `check-api-surface.mjs` last line equals the base's (942 exports), website doc examples compile, `scan-ids` is clean.
- Task 2: the CCR-QD-474 row now begins with `spec/README.md` Rev 1.396 (this row) and names ADR-QD-195, the decisions index, traceability, ADR-QD-014, ADR-QD-148, ADR-QD-149, `09-react.md`, `invariants.md`, the integration appendix, ADR-QD-103 (read, unchanged), the changeset and the website page, each at its final revision. Every reserved id is used (ARCH-129, ADR-QD-195, CCR-QD-474, BEH-QD-746 to BEH-QD-750, INV-QD-409, INV-QD-410); none is Unused; no id past the range was added; the reservation file's sha256 equals the base's. `spec-revise --check` and strict traceability (FAIL: 0) pass.

## Task Commits

1. **Task 1: the @qadi/react patch changeset and the website's React page** - `182b429a` (docs)
2. **Task 2: CCR-QD-474 completed** - `6e855476` (docs)

## Deviations from Plan

None - plan executed exactly as written. The task 1 verify's `check` of added changesets reads `git diff <base>`, which does not list an untracked file, so the changeset was staged before the verify ran; the verify itself was unchanged. The plan's `82-check.mjs commit` helper only judges an existing commit, so the commits were made directly and the helper then confirmed each (subject and exact paths).

## Known Stubs

None.

## Threat Flags

None. No `changeset version`, publish, push or merge was run; no `package.json` or CHANGELOG was touched.

## Next Phase Readiness

Ready for 82-09: the changeset, the website page and the CCR-QD-474 row are final. `pnpm spec:api` and `pnpm spec:package` are 82-10's close and were not run here beyond the api-surface script.

## Self-Check: PASSED

- FOUND: .changeset/react-registry-recycled-in-place.md
- FOUND: 182b429a, 6e855476 (ancestors of HEAD)
