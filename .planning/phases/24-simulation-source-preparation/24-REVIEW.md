---
phase: 24-simulation-source-preparation
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - .changeset/simulation-source-preparation.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/SimulationSource.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/model/SimulationSource.prepare.test.ts
  - packages/devtools/test/surface.tst.ts
  - spec/README.md
  - spec/behaviors/29-devtools-simulator.md
  - spec/decisions/050-a-simulation-is-sealed.md
  - spec/decisions/index.yaml
  - spec/devtools-spec/02-screens.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
  necessity: 0
status: issues_found
---

# Phase 24: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 24 moves the source-availability table and the "a Live run captures" rule out of `SimulationSession.ts` into `prepareSource` (`SimulationSource.ts`). I diffed the moved logic against the base (`2c24f19d`) and found no behaviour change in the session beyond what the phase claims. The moved code is correct: the `Refused`/`Ready` handling, the recorder-per-preparation, and the `Snapshot`/`Fixtures` `captured: undefined` all match the old `resolveSource`/`sourceOptions`/inline-recorder logic. The barrel re-export and `surface.tst.ts` pin are consistent (`prepareSource` stays out of `index.ts`). I traced the spec edits (BEH-QD-455, ADR-QD-050 amendment, overview, traceability, README) against the code and they agree, apart from the items below.

Known and logged in `deferred-items.md`, not re-reported: duplicated BEH-QD-219..221 blocks, the nonexistent `Sources` module in traceability, and the replay/seed-during-`reap` window.

No necessity findings. I did not load `necessity-review.md`, since none of the findings rest on that category.

## Warnings

### WR-01: A Live run's preparation is built before the teardown yield, so `setPorts` during teardown lets the old environment's capture overwrite the cleared one

**File:** `packages/devtools/src/model/SimulationSession.ts:375-399`
**Issue:** `prepareSource(sourceChoice, { ports, capture })` is called at line 375. Then `retire(); yield* reap();` (385-386) suspends while a superseded fiber is interrupted, and `const mine = generation` is read only after that (387). If the host calls `setPorts(B)` during that suspension, `setPorts` clears `capture` and, since `run` is still the old `Running`, calls `retire()`. That bumps `generation`, which `mine` then reads. The run goes on with the recorder built from the old ports `A`. When it finishes, `mine === generation`, so line 403 runs `capture = exit.value.answers` and stores environment A's answers while `ports === B`. `Snapshot` is then enabled and replays A's answers under B's name, which is the mismatch the `setPorts` comment says it prevents ("A capture is the answers of the environment it came from").

This is the same root cause as the logged replay-during-`reap` window (`mine` read after `reap`). It is not the same symptom: a `stale` clause cannot mask this one, because `capture` is written unconditionally. Moving `prepareSource` into `SimulationSource.ts` was the natural moment to put the read and the preparation on the correct side of the yield; the phase kept the base ordering.

**Fix:** Read `mine` and prepare after the last yield, and refuse to start if something superseded the run during it.
```ts
retire();
const mine = generation;
const { prepared } = prepareSource(sourceChoice, { ports, capture });
yield* reap();
if (mine !== generation) return; // a command moved the session while teardown ran
if (prepared._tag === "Refused") { run = { _tag: "Refused", question, refusal: prepared.refusal }; commit(); return; }
```
(`question` must also be built after the last yield, or be discarded by the same `mine` check.) Phase 25's FiberHandle rewrite may remove the window. If so, close this finding there, and add a test that calls `setPorts` while a second run waits on a slow-to-cancel first run.

### WR-02: `SOURCE_ORDER` is a second, unclosed list of sources, which the "fourth source is a compile error" claim does not cover

**File:** `packages/devtools/src/model/SimulationSource.ts:244`
**Issue:** `rowsOf` is closed over `SourceChoice` (TS2741 on a missing key), but the order the options are shown in comes from `const SOURCE_ORDER: ReadonlyArray<SourceChoice> = ["Fixtures", "Snapshot", "Live"]`. A fourth `SimulationSource` variant forces a new row in `rowsOf` and compiles cleanly with `SOURCE_ORDER` untouched. The new source then silently never appears in `options`, so the dock cannot offer it, while it still prepares if chosen programmatically. A duplicate entry would likewise show a button twice. BEH-QD-455, ADR-QD-050 and the doc comment on `rowsOf` all state that a fourth source is a compile error "rather than a missing case in two places". It is two places.

**Fix:** Derive the order from a record closed over `SourceChoice`, e.g. `const POSITION: { readonly [K in SourceChoice]: number } = { Fixtures: 0, Snapshot: 1, Live: 2 }` and sort by it. Or make the options a field of each row and build the array with `Record.keys`, so one table is the only list. Alternatively, weaken the spec wording to say the order is hand-kept.

## Info

### IN-01: `build()` constructs and discards a recorder on every commit while Live is chosen

**File:** `packages/devtools/src/model/SimulationSession.ts:276` (with `SimulationSource.ts:236-239`)
**Issue:** `build()` runs on every `commit()` and calls `prepareSource`, which for a chosen `Live` calls `ready()` and so `capturing(ports)` (five fresh maps plus a `decoratePorts` layer). Of the result, `build()` uses only `options`, the `Refused` refusal and `prepared.source`'s tag (through `sweepPlan` and `causesIO`). The recorder and `captured` are thrown away. Nothing leaks or runs I/O, since layers are lazy, so this is wasted work rather than a bug. It does mean the "each preparation builds its own recorder" property is exercised on every keystroke, not once per run.
**Fix:** Split `prepareSource` into a cheap `describeSources(have)` that returns `options` and the refusal, and a `prepareRun` that calls `ready()`. `build()` then calls only the first. Alternatively, leave it and accept the cost.

### IN-02: The CCR-QD-414 register row cites a stale revision for `spec/README.md`

**File:** `spec/README.md:352`
**Issue:** The row lists `spec/README.md` Rev 1.148, but the same file's header is now Rev 1.149 (the second commit corrected the mutation comparison and bumped it). The register is the document-history record that the repo's gates exist to keep accurate.
**Fix:** Change the row to "Rev 1.149", or word it as the revision the row was added at.

### IN-03: `Ready` is re-derived by hand in the session

**File:** `packages/devtools/src/model/SimulationSession.ts:347` (and `SimulationSource.ts:186`)
**Issue:** `SimulationSource.ts` defines a private `type Ready = Extract<PreparedSource, { readonly _tag: "Ready" }>`, and `program` in the session spells out the same `Extract<...>` inline. Two definitions of one type.
**Fix:** Export `type Ready` (or `ReadySource`) from `SimulationSource.ts` and use it in `program`'s parameter. It stays out of `index.ts` and the API-surface gate.

### IN-04: The new "replayed while that run was starting" test accepts either outcome

**File:** `packages/devtools/test/model/SimulationSession.test.ts` (test added near line 438)
**Issue:** The assertion is `after.run._tag === "Idle" || after.stale`. It passes whether the old run was dropped or ran against the old question. That is the point, because the logged window makes the behaviour either one. The disjunction does pin the invariant that matters (no baseline against the replayed row). The test also relies on `TestClock.adjust("1 second")` interleaving with a 100 ms interrupt sleep, which is ordering-sensitive. If Phase 25 changes the window, this test will not tell you which branch you took.
**Fix:** When Phase 25 settles the behaviour, tighten this to the one expected branch. For now, add a comment that the disjunction is deliberate and tied to `deferred-items.md`.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
