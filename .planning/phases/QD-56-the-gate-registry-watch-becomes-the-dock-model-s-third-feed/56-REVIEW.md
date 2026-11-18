---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
reviewed: 2026-11-18T22:10:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - examples/nextjs-newsroom/src/client/Dock.tsx
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/Gates.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/test/collectorDouble.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DiagnosticsStore.test.ts
  - packages/devtools/test/model/DiagnosticsStore.tst.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/Gates.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/react/DevtoolsDock.test.tsx
  - packages/devtools/test/react/DiagnosticsScreens.test.tsx
  - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
  - packages/devtools/test/react/QuestionsPanel.thunk.test.tsx
  - packages/devtools/test/react/questionsProp.ts
  - packages/devtools/test/react/useDiagnostics.test.tsx
  - packages/devtools/test/surface.tst.ts
  - packages/react/src/DevtoolsFeed.ts
  - packages/react/test/DevtoolsFeed.test.tsx
  - packages/react/test/DevtoolsFeed.tst.ts
findings:
  critical: 0
  warning: 0
  info: 6
  total: 6
  necessity: 2
status: issues_found
---

# Phase 56: Code Review Report

**Reviewed:** 2026-11-18T22:10:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Reviewed the new `GatesFeed.ts`, the slimmed `DockModel.ts`, the `questions` move out of the diagnostics
options and poll, the `Failed` questions view, the React adapters, the `@qadi/react` feed and the tests.

No blocker and no warning. I tried to break the feed on each ADR-QD-162 decision-5 revision and found
no counter-example:
- A throwing registry or watch is stated as `Failed`.
- A release is guarded, taken out of the feed's state before it is called, and never repeated.
- Failures are compared by name and message, and `stated` is total.
- A `configure` after a failed watch re-subscribes.
- A `configure` swaps the registry before `remerge` publishes.

Verified with `pnpm vitest run --project devtools --project react` (103 files, 2158 tests, all green) and
`node scripts/check-house-style.mjs` (clean).

**Late commit c02f2c43 (behaviour drift): no drift found.** Each rewrite is behaviour-neutral:
- `readRegistry` reads `watchFailure` before the no-registry answer. A watch failure implies a registry:
  `watch()` clears `watchFailure` before it returns for an undefined registry, and `configure` always routes
  a changed `gates` through `watch`. The reorder therefore cannot change an answer.
- The dropped trailing `rejoin()` in `DockModel.configure` is covered. A `gatesFeed.configure` publish
  rejoins through its subscription. A `diagnosticsFeed.configure` status change goes `show` -> `remerge` ->
  `shownReading.set` -> `rejoin`. A moved `reading` always yields a new `shownReading` snapshot, because
  `mergeReading` allocates whenever `supplied !== undefined`, and `mergedOf(fed, undefined)` returns `fed`,
  which differs from the previously merged object. An unchanged supplied `questions` list is a `rejoin` no-op.
- `JoinInput.gates` and `failed` optional: no reader distinguishes absent from `undefined`.
- `questionsFailed: asked.failed`: `questionsViewOf` tests `input.questions !== undefined` first, so a supplied
  list still makes the failure moot.

The findings below are Info only.

## Info

### IN-01: A throw downstream of `publish` ends the thunk cadence with nothing said

**File:** `packages/devtools/src/model/GatesFeed.ts:205-224`
**Issue:** The header promises "nothing the host throws leaves ... a tick". That holds for the thunk and the
registry, which are guarded. `tick` ends in `publish` -> `store.set` -> every subscriber, and `DockModel`'s
`rejoin` is one of them: it runs `joinQuestions` over the host's questions (`gateGroups`, `policyLabel`,
`Equal.equals`). A throw there goes through `Effect.sync(tick)` as a defect. `cadence()` calls `runs.fork`
without `onFailure`, and `SupersedingRun`'s own doc says a dead fiber is dropped without a word. The
questions list then freezes with no status, the exact failure `DiagnosticsFeed`'s header records as the
reason it watches its run's exit.

I could not demonstrate a concrete throwing input: `policyLabel` is typed over `Policy` and `foldAligned`
looked total. The same throw at build or in `configure` would escape `makeDockModel` or the layout effect,
so this is robustness only and not new in kind.

**Fix:** Either wrap the tick's publish so a subscriber's throw is not a fiber death, or give the cadence the
hook the diagnostics feed uses:
```ts
runs.fork(token, run, { onFailure: (cause) => publish(readRegistry(), AskedRead.Failed({ reason: Cause.pretty(cause) })) });
```

### IN-02: The poll's "unsampled" withholding no longer protects anything, and is asymmetric with failure

**File:** `packages/devtools/src/model/DockModel.ts:154-163`
**Category:** necessity
**Issue:** `joinInputOf` hides a healthy thunk's answer while `key.unsampled` (poll `Starting`, or `Stopped`
before a sample). The only reason was that the questions came from the poll's sample. They no longer do: the
gates feed reads the thunk at build and on its own cadence. Two consequences:
1. A poll stopped before its first sample, for example a throwing collector, hides a thunk that reads fine,
   for as long as the stop lasts.
2. A failing thunk is stated in the same situation (J4, `DockModel.test.ts:1328`), so the panel shows a
   failure the user cannot see success for.

Evidence that the state is not needed for correctness: `GatesFeed` has no dependency on the poll. The
behaviour is deliberate. D-04 requires `Unsampled` vs `Absent` to read as on the base, and characterisation
cells 3 and 6 pin it, so it is Info and not fixable without editing a pinned file.

**Fix:** Leave as is for this phase. Record the asymmetry for a follow-up: once the pinned cells can move,
drop `unsampled` from the questions view and keep it for `Hydration`.

### IN-03: `JoinInput` mixes required-undefined and optional fields; `readRegistry` keeps a relocated impossible branch

**File:** `packages/devtools/src/model/Gates.ts:305-314` and `packages/devtools/src/model/GatesFeed.ts:128-149`
**Issue:** After c02f2c43, `gates` and `failed` are optional but `questionsFailed` is still
`string | undefined` and required. A caller of the exported `joinQuestions` must pass `questionsFailed` and may
omit the others, for no reason in the type. In `readRegistry`, `if (registryNow === undefined) return UNWATCHED`
now sits inside `failure === undefined`, guarding a state the new comment says cannot pair with a watch
failure. The code is correct, but the control flow was bent to make a mutant observable and is harder to read
than the original two-line guard.

**Fix:** Make `questionsFailed` optional like its siblings. For `readRegistry`, keep the shape and add a
`Gates.test.ts`-style pin of the invariant ("a watch failure implies a registry"), so the comment is checked.

### IN-04: The poll still carries a `questions` field it can only ever set to `undefined`

**File:** `packages/devtools/src/model/DiagnosticsStore.ts:169-176, 224`
**Category:** necessity
**Issue:** `runDiagnostics` now builds `store.accept({ ...reading, questions: undefined })`, and `accept` runs
`keep(current.questions, next.questions)` and an `=== current.questions` check on every sample. The sampled side
of that field is always `undefined`, and only `mergeReading` fills it, from a supplied reading, outside the
store. The comparison is dead per field. `Diagnostics.questions` itself is needed, so only the store's
per-field handling and the spread allocation are redundant. Evidence: `DiagnosticsStore.ts:224` is the only
production `accept` caller and passes `undefined`.

**Fix:** Judgement call. Either accept this as the cost of keeping `Diagnostics` one shape, or have `accept`
take `Omit<Diagnostics, "questions">` and keep `current.questions`.

### IN-05: Over-long lines against the hand-wrapped style

**File:** `packages/devtools/src/react/useDockModel.ts:52, 57-58` and `packages/devtools/src/model/DockModel.ts:118`
**Issue:** AGENTS.md section 17 says hand-wrapping at about 90 columns wins. The `makeDockModel({ ... })` and
`model.configure({ ... })` calls, and the `registryInput` annotation, run 110 to 130 columns. They grew by one
field each in this phase. The gate does not catch it.

**Fix:** Wrap the object literals one field per line.

### IN-06: `diagnostics.intervalMillis` now paces the questions thunk, and its own doc does not say so

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:94` and `packages/devtools/src/model/GatesFeed.ts:24`
**Issue:** `DockModel` forwards `inputs.diagnostics?.intervalMillis` to the gates feed. The field doc still
reads "How often to sample, in milliseconds", and a host that sets it to slow the poll also slows how fast a
newly asked question appears. The dock's `questions` prop doc says "on the diagnostics cadence" but not that
the knob is shared. `GatesFeed.ts` also imports `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS` from `DiagnosticsStore.ts`
purely for that default.

**Fix:** Extend the `intervalMillis` doc: "also how often the questions input is read". Optionally move the
constant to a neutral module.

---

_Reviewed: 2026-11-18T22:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
