---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 12
subsystem: devtools-model
tags: [constructors, breaking, configure, surface-pin, gate-14, spec]
requires: ["79-11"]
provides:
  - makeTimelineFeed, makeDiagnosticsFeed, makeGatesFeed and makeDockModel take no parameter; their inputs arrive only through configure
  - every consumer (README fence, upgrading After fence, doc 28's compiled fence, gate 14's three probes) builds bare and configures
  - surface pins and gate 14 pin Parameters of the three public feeds as []
  - doc 28 listings, BEH-QD-636's requirement, the overview rows and the website page state the bare constructors
affects: [79-13, 79-14, 79-15, 79-16, 79-17]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/DiagnosticsFeed.ts
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
    - packages/devtools/test/surface.tst.ts
    - packages/devtools/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - apps/website/src/content/docs/docs/packages/devtools.md
    - spec/behaviors/28-devtools-screens.md
    - spec/overview.md
    - scripts/check-package-install.mjs
key-decisions:
  - "The single-line generator signature (function* (): Effect.fn.Return<X, never, Scope.Scope>) is kept, as the plan's artifact states it, even though it is wider than the hand-wrapped ninety columns"
  - "The diagnostics feed's held record starts undefined with no initial start: a bare feed starts nothing"
requirements-completed: []
metrics:
  duration: 75min
  completed: 2026-11-24
status: complete
commits: 3
plan_head_before: d3c07e17b7a84fac5f33b49442386f358a602355
plan_head_after: 34b194ddb305261beb7d8d5cf6efc94577640d45
actuals:
  tokens: 14000
  tasks: 2
  commits: 3
coverage:
  - deliverable: "every consumer builds bare and configures on the old constructors; both doc-fence gates, build and gate 14 green"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-12-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
  - deliverable: "the four constructors lose their argument; the Parameters pins, listings, rows and prose; CR5, CR10, CR15 and CR21 deleted; the whole devtools project, typecheck, tstyche, api-surface (942), doc gates, house-style, build, gate 14, spec:package, pinned and characterisation checks green"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-12-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 12: The constructors lose their argument

**`makeTimelineFeed()`, `makeDiagnosticsFeed()`, `makeGatesFeed()` and `makeDockModel()` take no parameter: inputs reach a feed or the dock only through `configure`, and every consumer, pin, listing and row says so.**

## Accomplishments

- Commit `9b8b3a9d` (`docs(79-12)`, on the old constructors): the README `watch` fence, the upgrading page's After fence, doc 28's compiled diagnostics fence and the packed consumer's timeline, gates and diagnostics probes build bare, then call `configure` with the same argument. Doc 28 revised 1.55 to 1.56 through `spec-revise`.
- Commit `16557256` (`feat(79-12)!`): the four generators are `function* (): Effect.fn.Return<X, never, Scope.Scope>`; the held records start at `complete…({})` (diagnostics: `undefined`, nothing started); the dock drops its build-time `configure`. Each doc comment says the constructor builds bare and takes its inputs only through `configure`.
- `surface.tst.ts` pins `Parameters<typeof makeX>` as `[]` for the timeline, diagnostics and gates feeds in place of the call with an argument. Gate 14's packed consumer has a type alias per public feed that is `true` only when the packed constructor has no parameter, and a `true`-typed constant for each (no `as`).
- Doc 28's four listings read `() => Effect<…, never, Scope>`, BEH-QD-636's requirement reads `makeTimelineFeed()`, the overview rows and the website feeds bullet say the inputs arrive through `configure`; doc 28 revised to 1.57 and the overview to 1.142.
- CR5, CR10, CR15 and CR21 deleted, with `comparable`, the helper only CR21 used. No line was added to the cells in the feat commit.
- Verification: whole devtools project 1858 tests (1862 less the four deleted cells), `pnpm typecheck`, `pnpm test:tstyche`, `scripts/spec-revise.mjs --check`, `scripts/check-api-surface.mjs` (942, unchanged), `scripts/check-doc-examples.mjs` (118 blocks), `scripts/check-website-doc-examples.mjs` (74), `scripts/check-house-style.mjs`, `pnpm build`, `scripts/check-package-install.mjs`, `pnpm spec:package`, the pinned check (15 tests) and the characterisation check.

Red evidence (`79-RED-EVIDENCE.md`, `79-12 the bare constructors`): a scratch optional parameter on `makeGatesFeed` fails gate 14 with TS2322 on the new probe and fails the surface pin; the file was restored from a copy taken before the edit. The gate's alias spelling was reshaped afterwards (the plan's verify looks for the text `Parameters<typeof makeX>`); the logic is the same, and the reshaped form was not re-run against a scratch parameter.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] CR3, CR8 and CR13 built a twin with an argument**
- **Found during:** Task 1 (the plan says CR5, CR10, CR15 and CR21 are the only test calls with an argument)
- **Issue:** CR3 (`makeTimelineFeed({})`), CR8 (`makeDiagnosticsFeed(undefined)`) and CR13 (`makeGatesFeed({})`) each compared a bare build with an argument-built one and a configured one. After Task 2 those calls fail typecheck, and the verify's search refuses them; the feat commit may add no line to the cells, so the fix could not wait for it.
- **Fix:** in the `docs(79-12)` commit each cell drops its argument-built twin (the one build line and its name in the comparison list). The bare and the configured builds, which carry the cells' claim, remain; titles unchanged.
- **Files modified:** `packages/devtools/test/model/ConfigureRule.test.ts` (outside the plan's four Task 1 files)

**2. [Rule 3 - Blocking] The packed consumer's alias text**
- The first alias was a generic `Parameterless<F>`; the plan's verify searches gate 14 for `Parameters<typeof makeX>` per feed, so the aliases state it per feed. The feat commit was amended for this (no later commit existed).

**3. [Rule 3 - Blocking] The generator signature on one line**
- The plan's artifact and verify name `function* (): Effect.fn.Return<X, never, Scope.Scope>` as one line; a hand-wrapped form failed the verify, so the single line was used (amended before any later commit).

**4. [Verify text] The forbidden-construct scan matched namespace imports**
- Task 2's scan pattern `[^a-zA-Z_]as [A-Z{(]` matched `import * as Effect`, which house style requires (it flagged lines added by an earlier plan's new file). Fixed in the PLAN only, as `docs(79-12): fix verify quoting` (34b194dd): the scan skips import lines. The same check ran clean afterwards, with exit 0.

## Decisions Made (autonomous)

- The dock's overview row and prose stay as 79-11 left them; only the four feed rows and the feeds bullet changed.
- No export was added or removed, so no fallback and no api-surface line moved.

## Risks for later plans

- 79-13 (ADR-QD-192) and 79-15 (changeset, 0.13 upgrade section) should state the removal of the constructor parameter as Breaking; the upgrading page's After fence already compiles the bare form.
- 79-16's mutation run now sees `held` initialisers without a build-time `configure`; the diagnostics `held` has no initial start.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: the twelve modified files and 79-RED-EVIDENCE.md
- FOUND commits: 9b8b3a9d (docs), 16557256 (feat), 34b194dd (plan verify fix)
