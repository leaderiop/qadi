---
phase: QD-47-port-facts-read-from-the-description
plan: 02
subsystem: testing
tags: [characterisation, services-panel, devtools, capture, tdd]
phase_base: 9f2051228ef4d577262891a4e7882a8683b7754e
plan_head_before: f3f72e4a841520a46c584091ac7f0db06af8e92d
plan_head_after: c04552f660d354ab23eedde71f69470b013fe344
commits: 2
requires: [47-01]
provides:
  - "ServicesPanel.reading.test.tsx: twenty call-row readings and four card rows, byte-exact, green on the base"
  - "Capture.test.ts: the captured-default row (D-17), green on the base"
affects: [47-03, 47-04, 47-07]
tech-stack:
  added: []
  patterns: ["characterisation committed on the untouched base before any packages/*/src edit"]
key-files:
  created:
    - packages/devtools/test/react/ServicesPanel.reading.test.tsx
  modified:
    - packages/devtools/test/model/Capture.test.ts
key-decisions:
  - "Every reading is a whole-string strictEqual on the first span of the row; no substring or regex assertion, no `as`."
requirements-completed: [PFCT-03, WX-06]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
status: complete
---

# Phase 47 Plan 02: Characterise the panel's wording and the captured default Summary

The words the services panel renders for every port's calls and card, and the rule that a captured default stays defaulted, are pinned on the untouched base, so 47-03 and 47-04 can move them without changing one.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `027bc5a2` | `test(47-02): the services panel's wording for every port, characterised on the base` |
| 2 | `c04552f6` | `test(47-02): a captured port reads defaulted exactly when it captured the default` |

Each carries one file and ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer. `packages/*/src` equals `phase_base` (`git diff --quiet 9f205122 -- packages/core/src packages/devtools/src packages/testing/src` exits 0) at both commits.

## Characterisation

`pnpm exec vitest run --project devtools packages/devtools/test/react/ServicesPanel.reading.test.tsx` on the base:

```
 Test Files  1 passed (1)
      Tests  24 passed (24)
```

Twenty readings (every branch of `describeOne` and `describe`: present and absent fields for all five ports, `anywhere`, `no resource`, the depth, the signer role, both `scope` values without a resource, `attempts` at undefined, 1, 2 and 3) and four card rows (the five consequences byte for byte, a retried default, a real adapter, an absent port). No expected string needed correcting: the base rendered every reading exactly as 47-02-PLAN.md and 47-UI-SPEC.md state.

## Captured-default row (D-17)

`pnpm exec vitest run --project devtools packages/devtools/test/model/Capture.test.ts -t "a captured port reads defaulted exactly when what it captured is the default"`:

```
 Test Files  1 passed (1)
      Tests  1 passed | 52 skipped (53)
```

The neighbouring suites (`Capture`, `Wiring`, `ServicesPanel`, `ServicesPanel.reading`; `WiringDefaulted.test.ts` excluded, it is RED until 47-04): `Tests  138 passed (138)`. `pnpm typecheck` and `pnpm lint` exit 0 (house-style: 518 files clean).

## Deviations from Plan

None - plan executed exactly as written. Two small notes:

- The C3 assertion first used `` `if defaulted: ${ATTRIBUTE_CONSEQUENCE}` ``; the plan's own verify requires the literal sentence in the file, so it was written out and the commit amended before anything else was built on it (unpushed).
- `1 as number | undefined` from RESEARCH Q5 was not copied; `durationMillis: 1` is assignable without a type assertion.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: `packages/devtools/test/react/ServicesPanel.reading.test.tsx`
- FOUND: `packages/devtools/test/model/Capture.test.ts` (one additive commit, no removed lines)
- FOUND: `027bc5a2`, `c04552f6` (ancestors of HEAD)
- Plan verify scripts: src equals `phase_base`; both content/commit-shape checks print OK; no `toContain`, `assert.include`, `assert.match`, `isPortDefault`, `PORT_READING`, `describeCall`, `PortReading` in the new file.
