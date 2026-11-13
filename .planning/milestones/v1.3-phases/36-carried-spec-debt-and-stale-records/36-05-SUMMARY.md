---
phase: 36-carried-spec-debt-and-stale-records
plan: 05
subsystem: testing
tags: [devtools, simulator, contrast, wcag, focus-ring, vitest]
status: complete

requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-02 (TF9..TF16, M29, UT1 RED), 36-04 (react RED set)"
provides:
  - "SourceDescription and describeSource (package-private, SimulationSource.ts), read off prepareSource for now"
  - "D1 RED: a description's Live source must hold the host's own ports; today it holds the recorder's layer"
  - "SR1 and M30 green characterisation of the snapshot's options/refusal and of the dock's empty source"
  - "contrast.ts (luminance, over, contrast) and CT1..CT6 green, computed from the tokens"
  - "N14 and N15 RED on the rendered root and Restart button"
affects: [36-06, 36-07, 36-08, 36-14]

actuals:
  tokens: 3800
  tasks: 3
  commits: 6

plan_head_before: 1607af7d522d8412c12b8562b9b684ac075328bc
plan_head_after: 4fb31e6460129aa4ad60723cdf7ef3ca2c5d9c5f
commits: 6

tech-stack:
  added: []
  patterns:
    - "a seam shape lands apart from the behaviour that uses it: describeSource is a view of prepareSource until 36-08 gives it its own body"
    - "contrast is computed from the token source (colors, withAlpha), never restated beside a hex"

key-files:
  created:
    - packages/devtools/test/react/contrast.ts
    - packages/devtools/test/react/theme.contrast.test.ts
  modified:
    - packages/devtools/src/model/SimulationSource.ts
    - packages/devtools/test/model/SimulationSource.prepare.test.ts
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/react/DiagnosticsNotice.test.tsx

key-decisions:
  - "SR1 iterates 12 rows through the session; the (no ports, capture taken) combination is unreachable there (setPorts(undefined) drops the capture), so it is driven by taking the capture then dropping the ports and expecting the capture-less literals"
  - "N15 reads the border through a third probe, borderOf, beside outlineOf and colorOf, because the border shorthand normalises differently from borderColor"

requirements-completed: []

coverage:
  - id: D1
    description: "describeSource exists and its identity pin D1 is RED for the reason 36-08 fixes"
    requirement: "DEBT-04"
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSource.prepare.test.ts#D1 a description holds the host's own ports; only a preparation wraps them in a recorder (RED by design)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The snapshot's options and refusal, and the dock's empty source, are pinned green before they change"
    requirement: "DEBT-04"
    verification:
      - kind: unit
        ref: "SimulationSession.test.ts#SR1; DockModel.test.ts#M30"
        status: pass
    human_judgment: false
  - id: D3
    description: "The colour pairs are measured from the tokens, and the ring and the button are pinned RED on the rendered elements"
    requirement: "WX-06"
    verification:
      - kind: unit
        ref: "theme.contrast.test.ts#CT1..CT6 (pass); DiagnosticsNotice.test.tsx#N14, N15 (RED by design)"
        status: pass
    human_judgment: false
---

# Phase 36 Plan 05: The description seam, SR1, M30, the contrast pins and N14/N15 Summary

**`describeSource` exists as a package-private view of `prepareSource` so D1 can fail on the recorder-wrapped Live source, SR1 and M30 pin the snapshot and the empty source green, CT1..CT6 measure the dock's colour pairs from its tokens, and N14 and N15 are RED on the rendered ring and Restart button.**

## Performance

- **Tasks:** 3 (one refactor commit, five test commits)
- **Files:** 2 created, 5 modified (one src file, `SimulationSource.ts`)

## Task Commits

1. **Task 1: SourceDescription and describeSource** - `546a9a65` (refactor)
2. **Task 1: D1 RED** - `3629ec39` (test)
3. **Task 2: SR1** - `3499e478` (test)
4. **Task 2: M30** - `2fa3fe7c` (test)
5. **Task 3: contrast.ts and CT1..CT6** - `a98125a6` (test)
6. **Task 3: N14 and N15** - `4fb31e64` (test)

## D1's failure message

```
AssertionError: the description's Live source holds the host's own ports: expected { build: [Function] } to equal { build: [Function] }

Compared values have no visual difference.
```

It fails on the first identity assertion (the layer is the recorder's, not the host's), not on a missing export. The three existing prepare cases pass.

## CT ratios as computed

| Test | Pair | Ratio | Needs |
|---|---|---|---|
| CT1 | `colors.text` on the tint | 12.10 | 4.5 |
| CT2 | `colors.error` on the tint | 6.57 | 4.5 |
| CT3 | `colors.accent` on `surface` | 6.78 | 3 |
| CT4 | `colors.accent` on `surfaceRaised` | 6.18 | 3 |
| CT5 | `colors.accent` on the tint | 5.56 | 3 |
| CT6 | helper fixed points | `#ffffff`/`#000000` 21.00, a colour on itself 1.00, tint `#2d2718` | |

All six match the UI-SPEC's recorded values.

## N14 and N15 on the base

- **N14:** `AssertionError: expected '' to equal '#4ea1ff solid 2px'` after `root.focus()` (the root keeps the browser's ring).
- **N15:** `AssertionError: expected '#8b93a3' to equal '#e6e8ec'` (the button reads `colors.textMuted`; its border is `1px solid #2a2f39`, `colors.border`, so the border assertion that follows would fail too).

## Failing sets after this plan

- devtools, exactly 11: TF9, TF10, TF11, TF14, TF15, TF16, M29, UT1, D1 (by full title), N14, N15. No suite fails to load.
- react, unchanged from 36-04, exactly 10: SUBJ1..SUBJ3, SD1..SD5, HL1, HL2.

## Deviations from Plan

**1. [Rule 3 - Blocking] A third probe, `borderOf`, in `DiagnosticsNotice.test.tsx`**
- **Found during:** Task 3
- **Issue:** the plan names two new probes (`outlineOf`, `colorOf`), but N15's border assertion is on the `border` shorthand, which `borderColorOf` (a `borderColor` probe) cannot normalise.
- **Fix:** added `borderOf` of the same shape beside them; no existing line changed.
- **Files modified:** `packages/devtools/test/react/DiagnosticsNotice.test.tsx`
- **Commit:** `4fb31e64`

**2. SR1 row shape.** Not a rule deviation: the (no ports, capture taken) row cannot exist in a session (a capture dies with its ports), so SR1 reaches it by taking the capture and then dropping the ports, and asserts `snapshot.capture` is undefined for it. 12 rows are counted and asserted.

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on behaviour; one extra test probe.

## Known Stubs

None. `describeSource` is deliberately a view of `prepareSource` until 36-08 gives it its own rows; that is the plan's stated shape, not a stub that prevents a goal.

## Requirements

DEBT-04 and WX-06 are declared by sibling plans of this phase that have no SUMMARY yet; `requirements.ready-ids` lists neither, so neither is marked complete here.

## Self-Check: PASSED

- Created files exist: `contrast.ts`, `theme.contrast.test.ts`, this SUMMARY.
- Commits `546a9a65`, `3629ec39`, `3499e478`, `2fa3fe7c`, `a98125a6`, `4fb31e64` are ancestors of HEAD; each message ends with the required trailer.
- `pnpm typecheck && pnpm lint` exit 0 (pre-existing oxlint warnings only; `house-style: 489 file(s) clean`).
- No src file changed but `SimulationSource.ts`; neither devtools barrel names the description.
