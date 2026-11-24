---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 11
subsystem: release-notes
tags: [changeset, upgrade-guide, spec, ccr]
requires: [80-10]
provides:
  - .changeset/react-context-value-drops-instrument.md (@qadi/react minor, Breaking)
  - .changeset/devtools-lens-is-a-headless-session.md (@qadi/devtools patch)
  - the 0.13 upgrade section "QadiContextValue no longer carries instrument", After fence compiled
  - the spec/overview.md QadiContextValue row (Rev 1.143)
  - the CCR-QD-472 row complete (README Rev 1.375 (this row))
affects: [80-12, 80-13]
key-files:
  created:
    - .changeset/react-context-value-drops-instrument.md
    - .changeset/devtools-lens-is-a-headless-session.md
  modified:
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - spec/overview.md
    - spec/README.md
key-decisions:
  - "The After fence reads the context through useQadiContext(\"InstrumentBadge\"): the exported hook takes a hook name, so the plan's useQadiContext().gates is written with the real signature"
  - "The devtools changeset adds one closing sentence that the pick's document listeners are added once per picking session, the listener-churn change the decision records, alongside the four named behaviour changes"
requirements-completed: []
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 2d31cfdc6b865b1470d6c1f46a013c5133895386
plan_head_after: 8664a87141b00b380294cf91f2b105b258a417fe
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase QD-80 Plan 11: The changesets, the upgrade section and CCR-QD-472 complete Summary

A consumer of `@qadi/react` is told, in a Breaking minor changeset and a compiled 0.13 upgrade section, that
`QadiContextValue` is `atoms`, `registry` and `gates` and that the host's own `instrument` flag is what to read instead;
`@qadi/devtools` gets a patch changeset for the lens's four behaviour changes (no export moves); and CCR-QD-472 now
cites every document the change revised, at its final revision.

## Commits

- `bd5c9f99` docs(80-11): the @qadi/react changeset and the 0.13 upgrade section (tracer)
- `8664a871` docs(80-11): the @qadi/devtools changeset, the overview line and CCR-QD-472 complete

## Changesets

- `.changeset/react-context-value-drops-instrument.md`: `"@qadi/react": minor`; opens "**Breaking.** `QadiContextValue` no longer carries `instrument`. It is `atoms`, `registry` and `gates`."
- `.changeset/devtools-lens-is-a-headless-session.md`: `"@qadi/devtools": patch`; opens "The React panel's highlight lens behaves differently in four ways. No export changes: the lens session and the panel's props are package-private."

Exactly these two are added from `phase_base` (`55c79a96`), none deleted (the Task 2 verify checks both).

## Documents and revisions

| Document | Revision |
| -------- | -------- |
| `spec/overview.md` | 1.142 to 1.143 (the `QadiContextValue` row says what the value carries) |
| `spec/README.md` | 1.374 to 1.375 (`Rev 1.375 (this row)`; the row now also cites `spec/overview.md` Rev 1.143 and names BEH-QD-736 to BEH-QD-740, INV-QD-405, INV-QD-406, the restated records and both changesets) |

The row's other citations are unchanged from 80-10: traceability 1.304, 28-devtools-screens 1.61, 09-react 3.18,
invariants 1.218, ADR-QD-193 1.1, ADR-QD-185 1.5, ADR-QD-047 1.22, ADR-QD-111 1.3, `index.yaml`, devtools-spec
01-shell 0.7 and 02-screens 0.22.

## Checks

- `node scripts/check-website-doc-examples.mjs`: `website-doc-examples: 76 block(s) compile` (base 75, plus one)
- `node scripts/check-api-surface.mjs`: `api-surface: 942 export(s) documented across 9 package(s)` (the base line)
- `node scripts/check-doc-examples.mjs`: `doc-examples: 119 block(s) compile`
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0 (strict), run twice (alone, then inside the Task 2 verify)
- `80-check.mjs scan-ids`: no id or phase wording in added lines; `80-check.mjs commit` passed for both commits
- Task 1 and Task 2 `<automated>` verifies: pass (Task 2's printed `VERIFY-OK`)

## Deviations from Plan

**1. [Rule 1 - Bug] The After fence calls `useQadiContext` with its hook name**
- **Found during:** Task 1
- **Issue:** the plan wrote `useQadiContext().gates`, but the exported hook is `useQadiContext(hookName: string)`; a zero-argument call does not compile.
- **Fix:** the fence reads `useQadiContext("InstrumentBadge")` and takes `gates`. The Before fence, which is `ts` and uncompiled, uses the same call shape.
- **Files modified:** apps/website/src/content/docs/docs/reference/upgrading.md. **Commit:** `bd5c9f99`

**2. [Plan wording] The devtools changeset's closing sentence**
- The plan lists four behaviour changes and that leaving the panel still ends picking and clears the highlight. The
  changeset states those and also notes that the pick's document listeners are added once per picking session, which
  ADR-QD-193 records as the listener-churn change; it states no count.

None otherwise: the plan ran as written.

## Known Stubs

None.

## Notes for 80-12 and 80-13

- The README is at Rev 1.375; any later `spec-revise` of it must move `Rev 1.375 (this row)` in the CCR-QD-472 row.
- `spec/overview.md` is at 1.143 and cited in the row at that revision; a further revision of it needs the row updated.
- The upgrade section is the last one in `upgrading.md`; its ADR-QD-193 link points at the `main` blob URL, like the ADR-QD-192 link.
- The `.changeset/` additions are exactly two; `changeset version` was never run.

## Self-Check: PASSED

- Files: both changesets, the upgrade section heading, the overview row and the CCR-QD-472 row: found
- Commits `bd5c9f99`, `8664a871`: ancestors of HEAD
