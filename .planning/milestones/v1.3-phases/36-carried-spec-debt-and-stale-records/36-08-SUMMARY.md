---
phase: 36-carried-spec-debt-and-stale-records
plan: 08
subsystem: devtools
tags: [devtools, simulation-source, baseline, changeset, upgrading]
requires:
  - phase: 36-05
    provides: describeSource and D1 (the last devtools RED)
  - phase: 36-07
    provides: the timeline notice the changeset describes
provides:
  - ReadySource, RefusedSource, PreparedSource as their union; describeSource with its own body
  - Baseline.Checked.reading (BaselineReading), decided once in baselineDiff
  - devtools minor changeset with a Breaking lead, and the upgrading section
affects: [36-13, 36-14]
tech-stack:
  added: []
  patterns: ["a description reads the row's plain source; only a preparation builds a recorder", "a derived value lives on the arm it belongs to, so a snapshot cannot hold one without the other"]
key-files:
  created:
    - packages/devtools/test/model/Replay.tst.ts
    - .changeset/devtools-timeline-status.md
  modified:
    - packages/devtools/src/model/SimulationSource.ts
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/model/Replay.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/test/model/SimulationSource.prepare.test.ts
    - packages/devtools/test/model/SimulationSession.test.ts
    - packages/devtools/test/model/Replay.test.ts
    - .changeset/simulator-session-only.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
key-decisions:
  - "A shared Compared Pick type and a private reproduces helper let baselineDiff read the comparison before the Checked arm exists, while matchesBaseline keeps its behaviour"
requirements-completed: [DEBT-04, WX-07]
status: complete
commits: 3
plan_head_before: 8ea7c7e224b4f258b55785d550a58775bd1b145d
plan_head_after: 35bfe8185510c86e459e56a878cd3dcdc37be334
actuals:
  tokens: 9000
  tasks: 3
  commits: 3
duration: 14 min
completed: 2026-11-13
---

# Phase 36 Plan 08: Source description and checked baseline reading Summary

A source description no longer builds a recorder and `Ready` is one interface (D1 green), and a checked baseline carries its own `reading`, recorded as Breaking in a new `@qadi/devtools` minor changeset and in `upgrading.md`.

## Performance

- **Duration:** 14 min
- **Started:** 2026-11-13T00:16:00Z
- **Completed:** 2026-11-13T00:30:17Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- `describeSource` reads `rowsOf` directly and returns the row's plain source; only `prepareSource` wraps Live ports in `capturing`. The session's `build()` describes, its `start()` prepares (the only `prepareSource(` call there). `ReadySource`, `RefusedSource` and `PreparedSource = ReadySource | RefusedSource` replace `SourcePreparation`, the private `Ready` alias and both inline `Extract`s.
- `Baseline`'s `Checked` arm requires `reading: BaselineReading`, decided once in `baselineDiff`; `readBaseline` and `summarise` are module-private over `Compared` (a `Pick` of the arm). `SimulationSnapshot` lost its separate reading field and the baseline card reads `baseline.reading`.
- `Replay.tst.ts` pins `Checked["reading"]` as `BaselineReading` and that the snapshot has no separate reading property.
- `.changeset/devtools-timeline-status.md` (minor, `**Breaking.**` lead), the restated clause in `simulator-session-only.md`, and `## 0.12: a checked baseline carries its own reading` with a compiled `typescript` After fence.

## Results

- D1 and SR1 green; devtools project: 57 files, 1355 tests, none failing.
- `pnpm test:tstyche` exit 0 (51 files, 254 tests); `pnpm build` exit 0; `pnpm spec:website-examples` exit 0 (58 blocks compile); `pnpm typecheck` and `pnpm lint` exit 0.
- Whole-repo `pnpm vitest run`: exactly 10 red tests, all react (SUBJ1..SUBJ3, SD1..SD5, HL1, HL2), as the plan expects.
- The changeset's first line: `**Breaking.** `Baseline`'s `Checked` arm now carries `reading` (`BaselineReading`), decided when the baseline is checked, so code that builds a `Baseline` by hand must add it.`

## Task Commits

1. **Task 1: a description builds no recorder, `Ready` spelled once** - `00d04248` (fix)
2. **Task 2: a checked baseline carries its reading** - `0cbd2f95` (feat!)
3. **Task 3: changesets and upgrading note** - `35bfe818` (docs)

**Plan metadata:** the `docs(36-08): complete` commit that follows this file.

## RED evidence (Task 2, shown in the working tree, not committed alone)

Logged to `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/36-08-red.log` (the session scratchpad). Before the change:

- `pnpm test:tstyche`: `Error: Type 'SimulationSnapshot' has property 'baselineReading'.` (Replay.tst.ts, 2 failed tests, the Checked-arm `reading` expectation failing as well); `Tests: 2 failed, 252 passed`.
- `Replay.test.ts`: `a checked baseline carries its reading, decided once` failed with `AssertionError: expected undefined to deeply equal { matches: true, … }`.

## Decisions Made

- `reproduces(self: Compared)` holds the one match rule; `matchesBaseline` is `self._tag === "Checked" && reproduces(self)`, same behaviour, so the reading can be built before the arm exists.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] D1's `.prepared` access had to change**
- **Found during:** Task 1
- **Issue:** The plan says D1 is unchanged, but D1 read `prepareSource("Live", have).prepared`; `prepareSource` now returns the `PreparedSource` itself, so the file did not typecheck.
- **Fix:** Dropped `.prepared` on that one line. Title, rows and assertions are unchanged.
- **Files modified:** `packages/devtools/test/model/SimulationSource.prepare.test.ts`
- **Committed in:** `00d04248`

**2. [Rule 2 - Missing assertion coverage] The 12-row case also checks `describeSource`'s refusal**
- **Found during:** Task 1
- **Issue:** With options and refusal now coming from `describeSource`, the table needed to show it agrees with `prepareSource`'s refusal.
- **Fix:** Added `assert.strictEqual(refusal === undefined, available)` and `assert.deepStrictEqual(refusal, prepared.refusal)` to that case; no existing assertion was removed.
- **Committed in:** `00d04248`

---

**Total deviations:** 2 (one blocking, one coverage addition). **Impact:** none on scope; both inside the file the plan permits.

## Issues Encountered

None. Pre-existing lint warnings elsewhere are untouched.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface.

## Next Phase Readiness

`spec/overview.md`, `spec/behaviors/29-devtools-simulator.md` and ADR-047 still name the removed snapshot field; 36-13 restates them. Gate 13 stays red until then.

## Self-Check: PASSED

- Files exist: `Replay.tst.ts`, `.changeset/devtools-timeline-status.md`.
- Commits `00d04248`, `0cbd2f95`, `35bfe818` are ancestors of HEAD; each carries the Opus 5.5 trailer.

---
*Phase: 36-carried-spec-debt-and-stale-records*
*Completed: 2026-11-13*
