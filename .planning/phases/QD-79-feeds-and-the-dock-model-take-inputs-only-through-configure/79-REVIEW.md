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
  info: 0
  total: 1
  necessity: 0
status: issues_found
---

# Phase QD-79: Code Review Report

**Reviewed:** 2026-11-24
**Depth:** standard
**Files Reviewed:** 27
**Status:** issues_found

## Summary

Iteration 2. I re-read the source files the iteration-1 fixes touched and the new test cells,
and re-ran `pnpm exec vitest run --project devtools packages/devtools/test/react packages/devtools/test/model`
(78 files, 1863 tests, all pass) and `oxlint` over `packages/devtools` and the check script
(warnings only, in `HeldChoice.test.ts`, not in scope).

Each iteration-1 fix is correct and introduced nothing new:

- **WR-01 (retry of a failed watch per host re-render):** the two new cells in
  `DockRegistryReads.test.tsx` match the code path. With `watchFailure` set, `GatesFeed.configure`
  passes the early return, re-subscribes, and `readRegistry` returns the previous `Failed` snapshot
  by key, so nothing is published and the registry is never read. The mended cell (subscribe once,
  read once, then quiet) follows from the same lines. The `refusing.on` flag and the `Held`
  carrier are sound, and `assert.isDefined(model)` guards the `model?.` chains from passing
  vacuously.
- **IN-05 (`feedInputsOf` hands `diagnostics` on as given):** `DiagnosticsFeed.configure` normalises
  once with `completeDiagnosticsOptions` and compares with `sameFieldsOrAbsent`, so the dock's
  second normalisation was redundant. `FeedInputs.diagnostics`, the golden in `ConfigureInputs.tst.ts`
  and CR24 follow. `inputs.diagnostics?.intervalMillis` for the gates record is unchanged.
- **IN-03 (wrapping), IN-01, IN-02, IN-04:** whitespace and test-hygiene only. The removed
  `Object.keys(dockProps).length` assertion leaves `dockProps` as a type-check-only literal, which
  the comment above it states; the consumer's `tsconfig` has no `noUnusedLocals`.

The rest of the phase (`useConfigured` ordering, `useScoped`'s closure comment under StrictMode and
`Activity`, `configure` ordering and the `finally` in `DockModel`, the derived-store parents) is
unchanged from iteration 1 and still holds. No `as`, `!`, `any`, `switch`, `async`, module-scope
`let` or `Record<string, unknown>` appears in the diff.

One new finding, outside the iteration-1 fixes: the code, the ADR and a behaviour doc disagree
about whether a bare timeline feed reads the empty source.

## Warnings

### WR-01: ADR-QD-192 and BEH-QD-731 say a bare timeline feed reads the empty source; the code does not, and the ADR lists skipping that read as a rejected alternative

**File:** `packages/devtools/src/model/TimelineFeed.ts:157-159` (code and doc), `spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md:49-51` and `:168-169`, `spec/behaviors/28-devtools-screens.md:3057-3066`
**Issue:** Commit `b20a807f` ("a bare build applies no inputs") removed `readSource(held.source)` from
`makeTimelineFeed`'s build. Nothing in the body of `makeTimelineFeed` starts a read now, so a bare feed
starts no run, and `configure({})` right after it returns at `sameFields(held, wanted)`, so the empty
source is never read at all. The three texts that describe this were not updated:

- ADR-QD-192 decision 1 (line 50): "a bare timeline feed reads the empty source as the constructor read it".
- ADR-QD-192 "Alternatives considered" (line 168): "Skipping the bare timeline feed's read of the empty
  source. It would make 'bare' a third state". That is the shipped behaviour, presented as the rejected one.
- BEH-QD-731: the paragraph after the requirement says "the timeline feed still reads the empty source,
  as it read it when it was handed `{}`", directly under a requirement in the same record that says "the
  timeline feed reads no source and is hand-fed".

The source's own doc (`reads no source until it is handed one`) matches the code and the requirement, so
the ADR and the second BEH sentence are the stale ones. There is no observable difference: the empty source
ends at once, `status` stays `Reading`, and CR3 pins that the bare and the built feed read the same
timeline and status, so this is a record-versus-code mismatch and not a behaviour bug. `AGENTS.md` §11
makes `spec/` normative, and the record currently names as rejected the exact thing that shipped, which is the
kind of drift §15 says gates exist to stop.
**Fix:** Amend ADR-QD-192 (a dated Rev 1.4 entry, as Rev 1.3 did) and BEH-QD-731:

- Decision 1: "a bare timeline feed holds the default capacity and starts no read; the empty source ends at
  once and publishes nothing, so a bare feed and one built with `{}` show the same timeline and status".
- Alternatives considered: replace the "Skipping the bare timeline feed's read" bullet with "Reading the empty
  source at build. It is unobservable (the read ends at once, publishes nothing and leaves `Reading`), so a
  bare feed starts no run, and `restart` and `configure` keep their reads (b20a807f)".
- BEH-QD-731: change "the timeline feed still reads the empty source, as it read it when it was handed `{}`"
  to "the timeline feed starts no read and shows what the empty source showed".

Then run `node scripts/spec-revise.mjs --check` and `bash spec/scripts/verify-traceability.sh --strict`.

---

_Reviewed: 2026-11-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
