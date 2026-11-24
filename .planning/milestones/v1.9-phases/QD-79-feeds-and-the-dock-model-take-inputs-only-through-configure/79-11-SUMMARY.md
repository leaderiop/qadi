---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 11
subsystem: devtools-react
tags: [dock-props, DockModelInputs, surface-pin, gate-14, devtools]
requires: ["79-10"]
provides:
  - DevtoolsDockProps extends DockModelInputs and declares only unknownParents and onInvalidate; the eight inputs and their docs are declared once, on DockModelInputs
  - UseDockModelInput deleted; useDockModel and configureDock take DockModelInputs
  - a surface pin of the ten prop names and of undefined accepted for each
  - gate 14's packed consumer compiles a ten-prop DevtoolsDockProps literal
affects: [79-12, 79-13, 79-15, 79-16, 79-17]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/test/surface.tst.ts
    - spec/overview.md
    - scripts/check-package-install.mjs
key-decisions:
  - "DockModelInputs stays package-private: the packed declaration file names it without a barrel export, so the recorded fallback was not taken"
  - "The doc comments moved onto DockModelInputs fields, host-facing text first and the model's sentence merged after it; references to 'the prop below' became 'the input'"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 3
plan_head_before: 6e348625ea8a18be5e7ca42952c71b49dd3a82d4
plan_head_after: 22010773ec7a0458c01422aa1e82885f556acaf9
actuals:
  tokens: 9000
  tasks: 2
  commits: 3
coverage:
  - deliverable: "DevtoolsDockProps extends DockModelInputs plus the host's two; UseDockModelInput deleted; the dock hands inputs whole; surface pin shown failing once (P1); overview row and revision 1.141"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-11-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "gate 14's packed consumer compiles a ten-prop literal and asserts ten keys, shown failing once (P2); pnpm build, scripts/check-package-install.mjs and pnpm spec:package pass"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-11-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 11: The dock's props are the dock model's inputs plus the host's own

**`DevtoolsDockProps extends DockModelInputs` and names only `unknownParents` and `onInvalidate`; the dock hands its inputs to `useDockModel` whole, and the packed consumer proves the published type resolves.**

## Accomplishments

- `DockModel.ts`: `DockModelInputs` is the one place the eight inputs are declared, with the doc comments the props carried merged into the fields' own. It stays out of both barrels.
- `DevtoolsDock.tsx`: `DevtoolsDockProps` is the two host props over `DockModelInputs`, each accepting `undefined`. The component destructures `{ unknownParents, onInvalidate, ...inputs }`, calls `useDockModel(inputs)` and hands `{ unknownParents, onInvalidate }` to the frame. The unused type imports went with the old declaration.
- `useDockModel.ts`: `UseDockModelInput` deleted; the hook and `configureDock` take `DockModelInputs`.
- `surface.tst.ts`: a pin that `keyof DevtoolsDockProps` is the ten names and that a record of all ten written `undefined` is assignable to it.
- `spec/overview.md`: the `DevtoolsDock`, `DevtoolsDockProps` row says what the ten props are; revision 1.140 to 1.141 through `spec-revise`.
- `scripts/check-package-install.mjs`: the packed consumer imports `type DevtoolsDockProps` from `@qadi/devtools/react`, builds a literal with all ten props (placed beside the gate registry it uses) and asserts ten keys.
- Whole devtools project: 1862 tests passing. `pnpm typecheck`, `pnpm test:tstyche`, oxlint (devtools), `scripts/check-house-style.mjs`, `scripts/check-api-surface.mjs` (the line is unchanged: 942 exports), `scripts/spec-revise.mjs --check`, the pinned check, the characterisation check, `pnpm build`, gate 14 and `pnpm spec:package` pass.

fallback not taken: the packed declaration file names `DockModelInputs` through the props type without it being exported, so no barrel and no overview row changed for it.

Red evidence (`79-RED-EVIDENCE.md`, `79-11 the dock props`): P1 a scratch `extra` field on `DockModelInputs` fails the new surface pin (and the dock-input pin from the earlier plan); P2 a scratch `extra: 1` in the packed consumer's literal fails gate 14 with TS2353. Both were restored from copies.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first surface pin imported the type under an alias**
- **Found during:** Task 1 verify, which looks for the text `keyof DevtoolsDockProps` in `surface.tst.ts`
- **Issue:** the existing import list aliased names the root also exports; `DevtoolsDockProps` is not a root export, so the alias was unneeded and the pin read `keyof ReactDevtoolsDockProps`.
- **Fix:** import the type under its own name. Commit 22010773 (`test(79-11)`), after the feat commit, since a later commit already existed.
- **Files modified:** `packages/devtools/test/surface.tst.ts`

**2. [Rule 3 - Blocking] The RED restore step in the plan would have deleted the work**
- The plan restores a scratch edit with `git checkout -- packages/devtools/src`; with the change uncommitted that discards the whole task. The scratch edit was applied to a copy-backed `DockModel.ts` and restored from the copy instead.

**3. Test title without apostrophes.** The pin's title is "the dock takes eight model inputs and two host props, each accepting undefined", because the plan's verify body is single-quoted.

**4. Placement.** The packed consumer's props literal sits beside the gate registry it names, not directly after the `devtools dock` expectation, since the registry is declared later in the template.

## Decisions Made (autonomous)

- Fallback export not needed (see above); kept `DockModelInputs` private.
- `DevtoolsDockProps` keeps the one-line doc comment naming where the inputs are stated, so a reader of the props finds them.

## Risks for later plans

- 79-12's constructor change touches `DockModel` only; `DevtoolsDockProps` needs no further change.
- The overview row's text names ADR-QD-192, which 79-13 writes.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: the six modified files and 79-RED-EVIDENCE.md
- FOUND commits: bd717989 (feat), d8d9375d (test), 22010773 (test)
