---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 06
subsystem: devtools
tags: [docs, readme, upgrade-guide, changeset, hdls-03, hdls-04, wx-07]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-05]
provides:
  - "the README's headless section over the three feeds, with stop detection (HDLS-03)"
  - "BEH-QD-323's compiled sampleOnce fence over makeDiagnosticsFeed"
  - "the 0.13 upgrade note and the Breaking changeset (HDLS-04, WX-07)"
affects: [60-07, 60-08]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: fb882267769eea78f03555ff679f73ed465f34d2
plan_head_after: a18cd062f62b7a320675a7f7823beac2d2708c0e
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 06: The docs of the change

**The README, the website page and the upgrade guide now teach the feeds, spec 28's `sampleOnce` fence builds `makeDiagnosticsFeed` in `Effect.scoped`, and one Breaking `@qadi/devtools` minor changeset records the break; both doc gates are green and nothing is versioned.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| 1 | `8c6f0487` | `docs(60-06): the README's headless example is the feeds` | `packages/devtools/README.md`, `spec/behaviors/28-devtools-screens.md`, `apps/website/src/content/docs/docs/packages/devtools.md` |
| 2 | `a18cd062` | `docs(60-06): the 0.13 upgrade note and the Breaking changeset` | `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/devtools-headless-interface-is-the-feeds.md` |

`commits: 2` is measured from the ledger (`fb882267..a18cd062`). The SUMMARY commit is separate.

## Verifies

- `node scripts/check-doc-examples.mjs`: `doc-examples: 117 block(s) compile`.
- `node scripts/check-website-doc-examples.mjs`: `website-doc-examples: 70 block(s) compile`.
- Both verbatim fences of the plan (the README's headless fence, the 0.13 "After" fence) and the BEH-QD-323 fence compiled unchanged; no fence needed a fix.
- Task 1's grep clauses: no runner name in the README or the website page; the README has `## Without React: the feeds`, the planned fence line and `must not cross`. Task 2's: the changeset front matter is one `@qadi/devtools` minor with `**Breaking.**`; `upgrading.md` has one headless-interface section, no compiled `DiagnosticsDockOptions` fence and the ADR-QD-173 link; `git diff --name-status phase_base HEAD -- .changeset` is the single `A` of the new file; no CHANGELOG or `packages/*/package.json` changed.

## Deviations from Plan

None - plan executed exactly as written.

The 0.12 "After" fence lost its import and annotation (D-13) and kept its blank line between the imports and `const sampling`; nothing else of the 0.12 section changed.

## Next plan must know

- `spec/behaviors/28-devtools-screens.md` still names `runDiagnostics` and `makeDiagnosticsStore` in its `ts` signature listing (`:647`, `:651`) and in prose; the plan leaves those to 60-07.
- `upgrading.md` links `spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md`, which does not exist yet; 60-07 writes ADR-QD-173 under that file name (the changeset and the note already cite the number).
- `node scripts/check-api-surface.mjs` stays red until 60-07.

## Known Stubs

None.

## Self-Check: PASSED

Commits `8c6f0487` and `a18cd062` are ancestors of `HEAD`; the changeset file exists; both doc gates exit 0.
