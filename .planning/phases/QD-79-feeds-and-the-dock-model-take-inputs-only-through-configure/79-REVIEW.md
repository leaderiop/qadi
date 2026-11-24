---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
reviewed: 2026-11-24T00:00:00Z
depth: standard
files_reviewed: 27
files_reviewed_list:
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/useConfigured.ts
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/src/react/useScoped.ts
  - packages/devtools/src/react/useTimeline.ts
  - packages/devtools/test/builtFeeds.ts
  - packages/devtools/test/model/ConfigureInputs.tst.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DockModel.characterisation.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/model/ExternalStore.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx
  - packages/devtools/test/react/DockRegistryReads.test.tsx
  - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  - packages/devtools/test/react/useConfigured.test.tsx
  - packages/devtools/test/surface.tst.ts
  - scripts/check-package-install.mjs
findings:
  critical: 0
  warning: 1
  info: 5
  total: 6
  necessity: 1
status: issues_found
---

# Phase QD-79: Code Review Report

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

I read every changed source file in full and the diff of each test file, and checked the
diff for `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`, module-scope `let`, and
`Record<string, unknown>`. None appear. The new `useConfigured` ordering holds: a child
never sees an unconfigured value, and `useScoped`'s closure comment is correct for
StrictMode and `Activity` (U4 pins it). `configure` ordering in `DockModel`, the
`finally` structure, and the derived-store parents match the pre-phase behaviour. I
found no data-loss, security or evaluation-path defect.

`ConfigureRule.test.ts`, `DockRegistryReads.test.tsx` and `useConfigured.test.tsx` ran
green (31 files, 417 tests, `pnpm exec vitest run --project devtools`).

One behavioural finding, confirmed by a throwaway probe that I deleted afterwards: moving
`configure` into a per-render layout effect makes the gate registry's "retry a failed
watch on any configure" rule run on every host re-render. The remaining items are quality
and test-hygiene points, including both orchestrator-observed items, which I confirmed.

The necessity rubric was read. One judgement-based Info finding follows from it (IN-05).
The two characterisation-held test files were read but no finding is raised against them.

## Warnings

### WR-01: A registry whose `subscribe` throws is re-subscribed on every host render

**File:** `packages/devtools/src/model/GatesFeed.ts:279-285` (reached from `packages/devtools/src/react/useConfigured.ts:28-30`)
**Issue:** `GatesFeed.configure` returns early only when `sameFields(held, wanted) &&
watchFailure === undefined`. While a watch has failed, every `configure` calls
`watch(registryNow)` and so calls the host's `registry.subscribe` again.
`useConfigured`'s layout effect depends on `[value, inputs]`, and `useDockModel` passes
the rest-spread `inputs` record, which is a new object on every render. So `configure`
runs on every render of the component that mounts `DevtoolsDock`, and each run re-invokes
host code that is already known to throw. Before this phase the hook's dependency list was
the individual fields, so the retry fired only when a field changed.

I confirmed this with a probe: a registry whose `subscribe` throws, mounted under
`useDockModel({ gates, questions })`, was subscribed 2 times after mount and 7 times after
5 plain re-renders with identical inputs. The existing test, "a registry whose subscribe
throws is subscribed again by each build and read never" in
`DockRegistryReads.test.tsx`, pins only the build count and never re-renders.

This follows from the recorded rule ("a failed watch is retried by any `configure`"), so
it is an unexamined interaction rather than a slip. It means host code with side effects
(logging, metrics, a registry that opens a connection in `subscribe`) is hit once per
render for as long as the registry stays broken.
**Fix:** Pick one and pin it in `DockRegistryReads.test.tsx`:
- Keep the rule and have `useConfigured` skip a `configure` whose inputs are field-for-field
  the last ones it handed over, so the "any configure" retry fires only on a changed record.
  This still needs the same-fields comparison to live in one place, so it would have to
  reuse `sameFields` rather than add a second rule.
- Or restrict the retry to a `configure` whose inputs moved, and update the decision
  record and the `GatesFeed.configure` doc.
- Or leave it and add a re-render cell asserting the subscribe count, so the per-render
  retry is a stated behaviour and not an accident.

## Info

### IN-01: `ConfigureRule.test.ts` imports from two modules twice each, as two value imports

**File:** `packages/devtools/test/model/ConfigureRule.test.ts:20-21` and `:39-40`
**Issue:** Lines 20 and 21 are both value imports from `../../src/model/DockModel.ts`.
Lines 39 and 40 are both value imports from `../builtFeeds.ts`. This confirms
orchestrator item 1. Other duplicated modules in the changed test files are
`import type` plus value splits, which the codebase uses on purpose, so only these two are
real duplicates.
**Fix:**
```ts
import {
  completeDockInputs,
  feedInputsOf,
  makeDockModel,
  type DockModelInputs,
} from "../../src/model/DockModel.ts";
...
import { diagnosticsFeedOf, dockModelOf, gatesFeedOf, timelineFeedOf } from "../builtFeeds.ts";
```

### IN-02: Stale test documentation naming constructors that take inputs

**File:** `packages/devtools/test/model/ConfigureRule.test.ts:7-8`, `packages/devtools/test/model/DockModel.test.ts:591`
**Issue:** The file header says "The cells that build with inputs exist only while the
constructors take them; the rest hold for the bare build a host's hook makes." No
constructor takes inputs any more (79-12), and no cell in the file builds with them (a
grep for `make(Timeline|Diagnostics|Gates)Feed(` with an argument and `makeDockModel(` with
an argument finds none in `src/` or `test/`). The sentence describes a state that no longer
exists. The `DockModel.test.ts` title "a catalogue given at construction fills both rails"
(M2 (b)) has the same drift, since it now goes through `dockModelOf`, which configures after
the build.
**Fix:** Delete the sentence from the header, or replace it with "Every cell builds bare
and configures, as a host's hook does". Reword the M2 (b) title to "a catalogue handed to a
bare model's first `configure` fills both rails and the role list at once". Check first
that the 15 pinned tests held by `79-pinned-check.mjs` do not include M2.

### IN-03: The four bare-constructor signatures run far past the hand-wrapping width

**File:** `packages/devtools/src/model/TimelineFeed.ts:161` (142 columns),
`packages/devtools/src/model/GatesFeed.ts:150` (133), `packages/devtools/src/model/DiagnosticsFeed.ts:160` (151),
`packages/devtools/src/model/DockModel.ts:310` (133)
**Issue:** This confirms orchestrator item 2. Dropping the parameter list collapsed the
previously wrapped signature onto one line, which is the longest line in each of those files
by 20 or more columns. Related new lines are also past ~100 columns: `DockModel.ts:164` (the
`source` field's doc, 175), `DockModel.ts:186` (the `FeedInputs` doc, 126),
`DockModel.ts:206` (109), and `DiagnosticsFeed.ts:148` (107). Other lines in these files
were already over 100 before this phase, so only the signatures and the two one-line doc
comments stand out. AGENTS.md §17 says hand-wrapping is the house style.
**Fix:**
```ts
export const makeGatesFeed = Effect.fn("qadi.devtools.makeGatesFeed")(function* (): Effect.fn.Return<
  GatesFeed,
  never,
  Scope.Scope
> {
```
Do the same for the other three. Wrap the `source` field doc as a multi-line block, like
the other seven fields.

### IN-04: The packed-artifact check's runtime assertion on the dock's props is vacuous

**File:** `scripts/check-package-install.mjs:688-703`
**Issue:** `expect("devtools dock props", Object.keys(dockProps).length, 10)` counts the keys
of an object literal written on the lines above, so it can never fail. The comment says the
literal "names all ten", and the real check is that the literal type-checks against
`DevtoolsDockProps` from the packed `.d.ts`. That check is sound, because a missing or extra
key fails under the consumer's `tsc`. The `expect` adds nothing and suggests a guarantee it
does not give. `surface.tst.ts` already pins `keyof DevtoolsDockProps` for the real count.
**Fix:** Delete the `expect` line, or replace it with a type-level count over the packed type,
as the `…IsBare` aliases do:
```ts
type DockPropKeys = keyof DevtoolsDockProps;
const dockPropKeys: DockPropKeys[] = ["source", "capacity", "catalogue", "ports", "diagnostics",
  "reading", "gates", "questions", "unknownParents", "onInvalidate"];
```
Typing the array against the packed union at least rejects a renamed key.

### IN-05: `feedInputsOf` normalises the diagnostics options a second time that the feed normalises itself

**File:** `packages/devtools/src/model/DockModel.ts:206`
**Category:** necessity
**Issue:** `feedInputsOf` calls `completeDiagnosticsOptions(inputs.diagnostics)`, and
`DiagnosticsFeed.configure` normalises its argument again at `DiagnosticsFeed.ts:209`, so
the dock's copy is rebuilt and then rebuilt. The evidence that it is unneeded is that
`diagnosticsFeed.configure` is typed `(options: DiagnosticsOptions | undefined)` and
accepts the raw value, so a `FeedInputs.diagnostics` of the raw options would be compared
identically. It exists to keep `FeedInputs` symmetric with the other two feed records and
for the golden in `ConfigureInputs.tst.ts`, so this rests on judgement and I rate it Info.
It is harmless today; it only costs one extra object per render now that `configure` runs
per render.
**Fix:** Either keep it and say in the `FeedInputs` doc that the dock hands the feed a
complete record on purpose (so the golden and the doc agree), or pass
`inputs.diagnostics` through and relax `FeedInputs.diagnostics` to
`DiagnosticsOptions | undefined`, updating the golden in `ConfigureInputs.tst.ts` with it.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
