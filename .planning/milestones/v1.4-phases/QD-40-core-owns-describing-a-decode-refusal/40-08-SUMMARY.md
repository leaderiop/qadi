---
phase: QD-40-core-owns-describing-a-decode-refusal
plan: 08
subsystem: release-docs
tags: [decode-refusal, changesets, upgrade-guide, readme, ccr-row]
phase_base: eb5a94063ac2ba730eaff53ac7095b3e0add36ca
plan_head_before: 02110b988ae2691dbfb63227a3b6aff7598a4f1f
plan_head_after: 82bb49a13f2a988ddb8b29ee5cc9780dc943d7d5
requires: [40-07]
provides:
  - "three changesets: @qadi/devtools minor (two Breaking paragraphs, five-word map), @qadi/core minor (six exports), @qadi/audit patch"
  - "upgrading.md: Peers bullets name the refusals; a last ## 0.13 section with the map table, a ts Before and a compiled typescript After"
  - "devtools README example, website devtools page and DecisionStreamRoute.ts comment read core's DecodeRefusal; no drop word remains"
  - "the CCR-QD-431 row completed: 35 files, final Revs, Used and Unused numbers"
affects: [40-09]
requirements-completed: [DREF-07, WX-02, WX-07]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
duration: ~3 min
completed: 2026-11-14
status: complete
commits: 3
---

# Phase 40 Plan 08: Consumer docs and the CCR row Summary

The break is recorded where consumers read it: a Breaking devtools changeset with the five-word map, core and audit changesets, an `upgrading.md` 0.13 section with a compiled After example, the README, website page and route comment reading core's refusal, and the CCR-QD-431 row naming all 35 files the phase changed.

## Commits

- `4e971679` docs(40-08): changesets and the 0.13 upgrade note for onMalformed (four files)
- `12a9cd6b` docs(40-08): the devtools README, website page and stream route comment read core's refusal (three files)
- `82bb49a1` docs(40-08): CCR-QD-431 completed (`spec/README.md` alone)

## Results

- **README fence compiles as `typescript`:** yes. `pnpm spec:examples` reports 114 blocks compiling (113 before, plus the README's), and the fence imports `describeDecodeRefusal` from `@qadi/core` and passes `refusal` to it.
- **Final CCR-QD-431 row:** 35 files (every file changed since `phase_base` outside `.planning/`, including `spec/README.md` itself at Rev 1.176). Spec documents carry their final Rev (153 at 1.1, 095 at 1.7, 143 at 1.3, invariants 1.121, 25-inspection 1.28, 26-decision-stream 1.16, 27-devtools-timeline 1.12, overview 1.103, traceability 1.173), added files are marked new, and the three changesets name their package and bump. The row ends `Used: CCR-QD-431, ADR-QD-153, INV-QD-325, BEH-QD-536, BEH-QD-537, ARCH-87. Unused: BEH-QD-538 to BEH-QD-540 and INV-QD-326 (...)`.
- **Changesets:** devtools has exactly two `**Breaking.**` paragraphs; core and audit have none; `@qadi/http` (a comment only) has no changeset. No `package.json` version, `CHANGELOG.md` or existing changeset changed; nothing consumed or published.
- **Verification:** the three plan verify scripts exit 0; `pnpm run build`, `pnpm spec:examples`, `pnpm spec:website-examples` (59 blocks), `pnpm lint` (no finding in files this plan touched; pre-existing warnings elsewhere), `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` (21 PASS, 0 FAIL) pass.

## Deviations from Plan

**1. [Attribution] Commit trailer is `Claude Sonnet 5.5`, not `Claude Opus 5.5`**
- **Found during:** all three commits
- **Issue:** the plan and brief ask for the Opus line; this executor runs as Sonnet 5.5 and the session's attribution instruction gives the Sonnet line. Same choice as 40-05, 40-06 and 40-07; the Opus line would misstate the author.
- **Fix:** Sonnet line as the last line of every message. If a uniform milestone trailer matters, amend these commits (with the earlier plans') before anything is pushed.
- **Commits:** 4e971679, 12a9cd6b, 82bb49a1

**Total deviations:** 1 attribution. **Impact:** none on content.

## Authentication Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-40-18: the verifies refuse a drop word in the README, website page, route comment and Peers section, and the After and README fences compile. T-40-19: no `changeset version`, publish, version bump, CHANGELOG or existing-changeset change. T-40-SC: no manifest or lockfile change.

## Self-Check: PASSED

- Commits `4e971679`, `12a9cd6b` and `82bb49a1` are ancestors of HEAD (`git rev-list --count` from the plan's recorded base is 3).
- The three changeset files exist under `.changeset/`; `upgrading.md` ends with `## 0.13: onMalformed receives core's DecodeRefusal`; the CCR-QD-431 row follows CCR-QD-430 with four cells.
