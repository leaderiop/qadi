---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 08
subsystem: react-provider
tags: [react, context, instrument, breaking, type-pin]
requires: [80-03, 80-07]
provides:
  - "QadiContextValue is atoms, registry and gates; the instrument prop stays and decides registration through the once-resolved writer"
  - "packages/react/test/QadiProvider.tst.ts pins the key set and the absence of an instrument field"
affects: [80-09, 80-10, 80-11, 80-13]
key-files:
  created:
    - packages/react/test/QadiProvider.tst.ts
  modified:
    - packages/react/src/QadiProvider.tsx
    - packages/react/test/InstrumentToggle.characterisation.test.tsx
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "The type pin's negative read is `expect(String(value.instrument)).type.toBe<string>()` under a bare-reason `@ts-expect-error does not exist`: tstyche reads text after the directive as a message to match, and `expect` of an `any` is rejected (decided autonomously)"
  - "The per-context rationale (per authorization context, no process state) moved to the prop's doc, with one added sentence that the field is not on the context because the provider resolves it once into the writer"
requirements-completed: []
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: 0061bcd8b21407f0f1aff7d4d2af3e82b40ac1d5
plan_head_after: 86d6753896d2737ecf610d1e8d1229f73a478634
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
---

# Phase QD-80 Plan 08: QadiContextValue drops instrument Summary

The unread public `QadiContextValue.instrument` is gone: the context value is `atoms`, `registry` and `gates`, memoised on
`[atoms, registry, gates]`, so a toggle of the provider's `instrument` prop no longer hands a memoised consumer a new
value. The prop and the writer it resolves are unchanged.

Commit: `86d67538` `feat(80-08)!: QadiContextValue drops instrument` (four files, one trailer).

## Seen failing

The type pin was written first and run on the unchanged provider (`pnpm test:tstyche
packages/react/test/QadiProvider.tst.ts`: 2 failed, 2 total, both passes). After the pin's final text was settled, the
unchanged provider was restored from a file copy and the pin rerun: still 2 failed; the changed provider passes 2 of 2.
Recorded in `80-RED-EVIDENCE.md` under `## 80-08 the context value`:

- failed: the context value is the atoms, the registry and the gates
- failed: a consumer reads the gates from the context, and instrumentation is not a field of it

## Checks

- Characterisation: `Lens.dock.characterisation` 4 of 4 flips applied; `InstrumentToggle.characterisation` 1 of 1 flips
  applied (`flip` applied `toggle-no-rerender`; the registration cell is unedited).
- React project: 40 files, 650 tests passed. Devtools project: 83 files, 1897 passed.
- `pnpm test:tstyche`: both passes, 77 files, 416 / 415 passed (1 / 2 skipped, the floating-effect characterisation).
- `pnpm typecheck` green.
- `house-style: 602 file(s) clean (3 declared switch(es), 77 type-test file(s))`
- `api-surface: 942 export(s) documented across 9 package(s)` (equals the 80-01 base line)
- `80-pinned-check.mjs`: 4 files hold their base text, 3 of 3 declared edits applied. Phase 79 scripts still pass.
- `80-check.mjs`: `commit`, `seen-failing`, `scan-forbidden`, `scan-ids` clean; `trailers`: 19 plan commits, each one trailer.

## Search after the change

`<S>/d22-after.txt`: `instrument-read: none`. `QadiContextValue` is named in `QadiProvider.tsx` (51, 61, 69), `useGate.ts`
(10, 139), the two changelogs, `spec/README.md`, ADR-QD-111 and `spec/overview.md`; no source reader reads an `instrument`
member of it. (`prop-uses` was rebuilt with a wider pattern than 80-01's, so its file list is larger; it is not a
comparison line.)

## Deviations from Plan

None in behaviour. One adjustment of the pin's text: the plan's `// @ts-expect-error instrumentation is the provider's
prop, not a context field` is read by tstyche as a diagnostic message to match and did not match, so the directive carries
`does not exist` and the reason sits on the comment line above it. No negative callable or constructable pin was added.

## Known Stubs

None.

## For the next plans

- A spec search of several phrasings finds no sentence describing `instrument` as a context field: `spec/overview.md:570`
  only lists the type, and ADR-QD-111's rows (40, 65, 107) describe the writer on `GateScopeContext`. 80-09 / 80-10 still
  own the ADR-QD-111 amendment; 80-11 owns the changesets and the upgrade guide (this commit's `BREAKING CHANGE:` footer is
  the source for the `@qadi/react` Breaking entry).
- `packages/react/CHANGELOG.md:145` and `packages/devtools/CHANGELOG.md:325` mention the field historically; leave them.

## Self-Check: PASSED

`packages/react/test/QadiProvider.tst.ts` exists; commit `86d67538` is an ancestor of HEAD; `80-check.mjs commit` passes.
