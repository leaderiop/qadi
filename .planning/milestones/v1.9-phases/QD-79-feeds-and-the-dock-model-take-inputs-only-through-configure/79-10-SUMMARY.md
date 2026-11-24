---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 10
subsystem: devtools-react
tags: [configure, hooks, useConfigured, scope, first-render, devtools]
requires: ["79-09"]
provides:
  - useConfigured, the one package-private hook that builds in a scope and configures with the latest inputs before anything reads the value
  - useDockModel, useTimeline and useDiagnostics on it, each with a module-scope configure function and no effect of its own
  - useScoped's comment corrected: the build runs once per mount, and a remount or a reveal builds again with the latest committed closure
affects: [79-11, 79-12, 79-13, 79-16]
key-files:
  created:
    - packages/devtools/src/react/useConfigured.ts
    - packages/devtools/test/react/useConfigured.test.tsx
  modified:
    - packages/devtools/src/react/useScoped.ts
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/src/react/useTimeline.ts
    - packages/devtools/src/react/useDiagnostics.ts
key-decisions:
  - "Fold (a): configure inside the scoped build via Effect.tap, so useScoped publishes only a configured value"
  - "No ref: the latest inputs reach a rebuild through the render's closure (confirmed by U4 on the real hook, so the recorded fallback is not needed)"
  - "useTimeline keeps passing a fresh { source, capacity } record per render: the layout effect re-runs and the feed's own rule makes it a no-op"
requirements-completed: []
metrics:
  duration: 20min
  completed: 2026-11-24
status: complete
commits: 3
plan_head_before: 8a684972c963651b1d54dec965182d72e73751c0
plan_head_after: 10306e28728643f2ea29dde3e5a410f88f3a2775
actuals:
  tokens: 9000
  tasks: 2
  commits: 3
coverage:
  - deliverable: "useConfigured with cells U1 to U4, each shown failing once against the nearest wrong fold (H1 to H4); the useScoped comment corrected; the first-render characterisation passes unedited"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-10-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the dock, timeline and diagnostics hooks on useConfigured; whole devtools project (1862 tests) green; characterisation and pinned checks, typecheck, oxlint and house-style pass"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-10-PLAN.md (exit 0, after the verify-text fixes below)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 10: One hook builds in a scope and configures with the latest inputs

**`useConfigured` configures a value inside its scoped build and again whenever the inputs record changes identity; the dock, timeline and diagnostics hooks build through it and no reader can commit an unconfigured value.**

## Accomplishments

- `react/useConfigured.ts` (package-private, in neither barrel): `useScoped(() => Effect.tap(make(), (built) => Effect.sync(() => configure(built, inputs))))` plus a layout effect on `[value, inputs]`. It holds no ref and no state; whether an input moved is the value's `configure` rule.
- A throw from the first configure goes through `useScoped`'s existing `catch`: the scope closes, nothing is published, and the boundary receives the original error.
- `useScoped.ts`'s comment no longer says `make` is read once per mount.
- `useDockModel`, `useTimeline` and `useDiagnostics` call `useConfigured(makeX, configureX, inputs)` with a module-scope configure function. `useDiagnostics` still reads `idleDiagnostics(options)` before the feed exists; `useTimelineStore`'s own resize effect (a hand-fed store, no build) is untouched.
- `ConfigureFirstRender.characterisation.test.tsx` passes unedited. Whole devtools project: 1862 tests, none failing. `pnpm typecheck`, `oxlint`, `scripts/check-house-style.mjs`, the characterisation check and the pinned check pass.

Red evidence (`79-RED-EVIDENCE.md`, `79-10 the hook`): H1 fold (c) fails U1; H2 a swallowed throw fails U2; H3 deps `[value]` fails U3; H4 a first-render closure fails U4. Scratch edits were restored from a copy; nothing was left in `src`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The Task 2 verify failed on its own text, twice, not on the code**
- The hook-effect check refused any `useLayoutEffect` in `useTimeline.ts`, which legitimately holds `useTimelineStore`'s resize effect; it now allows that one call there and still refuses `useScoped(`.
- The forbidden-construct scan matched `import * as Effect` in the new hook's added import lines as a cast; it now skips added `import` lines.
- Commit 10306e28, `docs(79-10): fix verify quoting`, PLAN text only (amended once to cover both).

No other deviation.

## Decisions Made (autonomous)

- The `useDockModel` leading comment (one scope per dock, closing it interrupts the read and a run) sits inside the arrow expression beside the `useConfigured` call, since the function has no body block.
- The inputs record for `useTimeline` is built inline each render, as the plan names; the dependency form that keeps a stable identity was not needed because a no-op configure changes nothing observable.

## Risks for later plans

- U4's reveal and StrictMode cells hold the latest-closure assumption; a React upgrade that stops it fails U4 first (T-79-19). The ref-in-a-layout-effect fallback is for ADR-QD-192 (79-13) to record.
- `UseDockModelInput` is still the hook's input type; 79-11 replaces it.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: packages/devtools/src/react/useConfigured.ts, packages/devtools/test/react/useConfigured.test.tsx
- FOUND commits: 397c0fbe (feat), 16f0ed19 (refactor), 10306e28 (docs fix)
