---
phase: 36-carried-spec-debt-and-stale-records
plan: 03
subsystem: testing
tags: [react, effect-reactivity, atom-registry, strictmode, activity, vitest]

requires:
  - phase: 36-carried-spec-debt-and-stale-records
    provides: "36-02 (devtools timeline status shape, RED tests)"
provides:
  - "SUBJ1..SUBJ3 (QadiProvider.subject.test.tsx), RED on the base, the pins 36-09's subject keepAlive turns green"
  - "Two v4-reactivity-smoke canaries for seeded-node removal timing and the node-map read"
  - "GR-S1, GR-S2, GW-S1: green characterisation of an identity-changing rerender under StrictMode on the instrumented path"
affects: [36-04, 36-09, 36-14]

actuals:
  tokens: 5200
  tasks: 3
  commits: 3

plan_head_before: e41426a1a49cb4fc9677842d9a1659ccfa7eb528
plan_head_after: 7b80df021088eed1848aeeceace6025e13993020
commits: 3

tech-stack:
  added: []
  patterns: ["a real 50 ms turn after settle() waits out the registry's macrotask node removal; no test clock"]

key-files:
  created: [packages/react/test/QadiProvider.subject.test.tsx]
  modified:
    - packages/react/test/v4-reactivity-smoke.test.ts
    - packages/react/test/GateRegistry.test.tsx
    - packages/react/test/GateWriter.test.tsx

key-decisions:
  - "SUBJ1..SUBJ3 stay RED on the base (all three measured RED, so SUBJ3 needed no green-pin fallback)"
  - "28 IN-06 is closed with evidence: GR-S1, GR-S2 and GW-S1 are green on the base, so there is no defect and no blocker"

requirements-completed: [DEBT-04, DEBT-05, WX-06]

coverage:
  - id: D1
    description: "The react subject defect is pinned RED before its fix: a gate mounted after a quiet macrotask, or under a hidden-then-shown Activity below the provider, stays pending"
    requirement: "DEBT-04"
    verification:
      - kind: unit
        ref: "packages/react/test/QadiProvider.subject.test.tsx#SUBJ1..SUBJ3 (RED on the base by design)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The registry timings the subject and seed designs rely on are pinned by two canaries"
    requirement: "WX-06"
    verification:
      - kind: unit
        ref: "packages/react/test/v4-reactivity-smoke.test.ts#a node seeded through initialValues is removed a macrotask later unless its atom is keepAlive"
        status: pass
      - kind: unit
        ref: "packages/react/test/v4-reactivity-smoke.test.ts#getNodes().get finds no node for an atom nothing read, and a seeded keepAlive node holds its value before it is built"
        status: pass
    human_judgment: false
  - id: D3
    description: "28 IN-06's narrowed gap (identity-changing rerender under StrictMode, instrumented path) is tested green"
    requirement: "DEBT-05"
    verification:
      - kind: unit
        ref: "packages/react/test/GateRegistry.test.tsx#GR-S1 / GR-S2; packages/react/test/GateWriter.test.tsx#GW-S1"
        status: pass
    human_judgment: false

duration: 6min
completed: 2026-11-13
status: complete
---

# Phase 36 Plan 03: Subject RED pins, registry-timing canaries and StrictMode identity characterisation Summary

**SUBJ1..SUBJ3 pin the lost react subject RED on the base, two canaries pin the AtomRegistry removal and node-map timings the subject and seed fixes depend on, and GR-S1, GR-S2 and GW-S1 show an identity-changing rerender under StrictMode behaves like the non-strict one.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-11-13T00:01:00Z
- **Completed:** 2026-11-13T00:07:17Z
- **Tasks:** 3
- **Files modified:** 4 (one new), no `packages/*/src` file

## Accomplishments

- SUBJ1 (provider outside a hidden-then-shown Activity), SUBJ2 (gate mounted a macrotask after the provider) and SUBJ3 (subject changed while no gate is mounted) all fail on the base. The react project fails exactly these three; the other 480 tests pass.
- Canary A: a node seeded through `initialValues` is removed a macrotask later unless its atom is keepAlive. Canary B: `getNodes().get` finds no node for an unread atom and creates none, and a seeded never-built keepAlive node answers `Option.some("seed")`. Both hold on effect 4.1.2.
- 28 IN-06 is closed with evidence: no defect.

## Task Commits

1. **Task 1: SUBJ1..SUBJ3, RED** - `65d63e36` (test)
2. **Task 2: registry-timing canaries** - `ce282de7` (test)
3. **Task 3: GR-S1, GR-S2, GW-S1** - `7b80df02` (test)

## Measured results

**SUBJ failure messages on the base** (all three identical in kind): `TestingLibraryElementError: Unable to find an element with the text: allowed.` The rendered body is `<div>pending</div>`, so the gate is rendering its `pending` prop where `allowed` is expected. The subject node is gone by the time the gate mounts, and the decision atom answers `Effect.never`.

**Counts** (notifications on the gate registry since the mount, across the rerender that changes identity):

| Case | Non-strict | StrictMode | Entries after | Id kept | Element | After unmount |
|---|---|---|---|---|---|---|
| GR-S1 (policy `canRead` to `canWrite`) | 2 | 2 | 1, the new policy | yes | defined | 0 |
| GR-S2 (resource `docA` to `docB`) | 2 | 2 | 1, the new resource | yes | defined | 0 |
| GW-S1 (different atom, hook only) | after mount + 2 | after mount + 2 | 1 | n/a | n/a | n/a |

GR-S1 and GR-S2 compare the StrictMode count with the non-strict count inside the same test (`expect(strict.notifications).toBe(plain.notifications)`), and assert the non-strict count is 2.

**Canaries:** both pass on the base.

## Decisions Made

- SUBJ1..SUBJ3 are all RED on the base, so the flagged SUBJ3 fallback (record a green pin instead) was not needed.
- 28 IN-06 stays `resolved` in the ledger (row already names 36-03 and GR-S1, GR-S2, GW-S1 as the pin); no `fixed` status, no blocker. The ledger's Closed by column is 36-14's.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded a header comment so the plan's own verify passes**
- **Found during:** Task 1
- **Issue:** The verify rejects the string `TestClock` anywhere in `QadiProvider.subject.test.tsx`; the first draft's header comment named it.
- **Fix:** The comment now says "no test clock controls".
- **Files modified:** packages/react/test/QadiProvider.subject.test.tsx
- **Committed in:** 65d63e36 (before the commit)

**2. Task 3 touched two existing lines in GateWriter.test.tsx**
- **Issue/Fix:** To drive StrictMode, the file's `run` helper gained an optional `wrapper` parameter and the `react` import gained `StrictMode`. No existing case changed; all existing cases pass unchanged. GateRegistry.test.tsx only gained a helper, two file-local resources, `canWrite` and the two cases.
- **Committed in:** 7b80df02

---

**Total deviations:** 1 auto-fixed (Rule 3), 1 noted helper extension
**Impact on plan:** None on scope. No `packages/*/src` change.

## Issues Encountered

None. `pnpm typecheck` exits 0 and `pnpm lint` reports house-style clean; the oxlint warnings it prints are pre-existing and none names a file this plan added.

## Known Stubs

None.

## Next Phase Readiness

- 36-04 and 36-09 can proceed: SUBJ1..SUBJ3 are what 36-09's subject keepAlive turns green, and the canaries guard the removal timing both fixes rely on.
- Expected RED set after this plan: the react project fails exactly SUBJ1, SUBJ2, SUBJ3 (plus the devtools 8 from 36-02 repo-wide).

## Self-Check: PASSED

- FOUND: packages/react/test/QadiProvider.subject.test.tsx
- FOUND commits 65d63e36, ce282de7, 7b80df02 (ancestors of HEAD)
- `git rev-list --count e41426a1..HEAD` = 3 matches `commits: 3`

---
*Phase: 36-carried-spec-debt-and-stale-records*
*Completed: 2026-11-13*
