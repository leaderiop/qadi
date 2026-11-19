---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 12
subsystem: docs
tags: [changesets, upgrading, readme, ccr, wx-02, wx-07, gfed-05]
requires: ["56-11"]
provides:
  - .changeset/devtools-questions-is-a-dock-input.md (@qadi/devtools minor, one Breaking entry)
  - .changeset/react-feed-hands-questions.md (@qadi/react minor, one Breaking entry)
  - upgrading.md "## 0.13: the questions are a dock input, beside the gates" (prose only, last section)
  - README and website prose naming questions beside gates
  - CCR-QD-447 row in spec/README.md Rev 1.250
affects: [56-13]
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
plan_head_before: 2cd1efacd80767186b4a008e0ca2d88c306482ea
plan_head_after: 93ebe36c13dc70077117a359203fef768c6797cc
tech-stack:
  added: []
  patterns: ["a Breaking changeset is one package at minor, one **Breaking.** paragraph, a not-changed paragraph, and the upgrade-guide pointer last"]
key-files:
  created:
    - .changeset/devtools-questions-is-a-dock-input.md
    - .changeset/react-feed-hands-questions.md
  modified:
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/devtools/README.md
    - packages/react/README.md
    - apps/website/src/content/docs/docs/packages/react/hooks.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - spec/README.md
key-decisions:
  - "Every reserved id was used (checked in spec/, .changeset/ and AGENTS.md), so the CCR row ends Unused: none."
requirements-completed: [WX-02, WX-07, GFED-05]
duration: 15min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 12: the two Breaking changesets, the 0.13 note and CCR-QD-447

Both public breaks (`questions` leaves `diagnostics` in `@qadi/devtools`; `useDevtoolsFeed` returns it beside `gates` in `@qadi/react`) are recorded where a host reads them, the prose that named the old wiring is current, and the phase's change record exists as CCR-QD-447. Nothing is versioned or released.

## Commits

| Task | Commit | What |
| ---- | ------ | ---- |
| 1 | `8e8091b5` | the two changesets and the upgrading.md 0.13 section |
| 2 | `b5501097` | the two READMEs and the two website pages |
| 3 | `93ebe36c` | the CCR-QD-447 row (spec/README.md Rev 1.250) |

## Artifacts

- Changesets: `.changeset/devtools-questions-is-a-dock-input.md`, `.changeset/react-feed-hands-questions.md`.
- New last section of `upgrading.md`: `## 0.13: the questions are a dock input, beside the gates` (no fence; earlier text a byte-identical prefix; links ADR-QD-169).
- Prose: the dock comment is `<DevtoolsDock diagnostics={{ layer: appLayer, collector }} questions={atoms.asked} />`; the feed paragraphs name `gates`, `questions`, `onInvalidate`, `diagnostics`; the reading's `{ wiring, activity, hydration, portCalls, questions }` descriptions are kept.

## Gate results (last lines)

- `spec-revise --check`: every Revision matches its newest Change History entry
- `spec:verify:strict`: PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)
- `spec:gates`: dod-table: 25 step(s) match pnpm check, 143 reference(s) resolve
- `spec:claims`: devtools-claims: 8 claim(s) registered across 6 file(s)
- `spec:api`: api-surface: 935 export(s) documented across 9 package(s)
- `spec:examples`: doc-examples: 116 block(s) compile
- `spec:website-examples`: website-doc-examples: 67 block(s) compile

## Ids

ARCH-103, ADR-QD-169, CCR-QD-447, BEH-QD-616..620 and INV-QD-357..358 each appear in `spec/`; none is in AGENTS.md (unchanged) or `.changeset/` by name. All used, so the row says `Unused: none.`

## Deviations from Plan

**1. [Rule 3 - verify pattern] The Task 3 source-coverage check is vacuous as written.** Found during Task 3: `git diff --name-only <base> HEAD -- 'packages/*/src'` matches nothing below those directories (orchestrator note 1). Fix: I checked the row against `':(glob)packages/*/src/**'`, the test, examples and features globs instead; every changed file's basename is in the row. No file changed, so no commit.

**Total deviations:** 1 (verification method only). **Impact:** none; the row lists the real diff.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Both changesets exist, the three commits are ancestors of HEAD, the commits carry the trailer, and every spec gate exited 0.
