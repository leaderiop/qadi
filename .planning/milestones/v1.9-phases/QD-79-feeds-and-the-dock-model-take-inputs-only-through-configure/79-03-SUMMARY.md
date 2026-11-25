---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 03
subsystem: devtools-feed-configure-rule-tests
tags: [configure, no-op, bare-build, moved-alone, red-evidence, devtools]
requires: ["79-02"]
provides:
  - packages/devtools/test/builtFeeds.ts, the one helper that builds each feed and the dock bare and configures it inside the build
  - the feed cells (CR1 to CR15) of the per-field rule, written on the phase base
  - the two gates no-op cells RED on the base on the registry read count, every other cell shown failing once
affects: [79-04, 79-05, 79-06, 79-07, 79-08, 79-12]
key-files:
  created:
    - packages/devtools/test/builtFeeds.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
  modified:
    - .planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-RED-EVIDENCE.md
key-decisions:
  - "A moved-alone table row is a `Mover<I, F, O>`: a `pair()` that builds fresh fixtures per call (held inputs, moved inputs, a `read` that turns a feed into a comparable value) and a `reacted(before, after)` predicate. The tables are `Record<keyof Required<I>, Mover<...>>`, so a new input field fails to compile until it has a row, and the bare-versus-built comparison (CR5, CR10, CR15) reads the same `read` from two separate pairs so no two feeds share a counter"
  - "Diagnostics rows hold no explicit `undefined` field (the base `DiagnosticsOptions` refuses one); every diagnostics row moves a defined value, and one `restarted` predicate (one more sample, one more build, one more release) serves the three fields"
  - "A cell whose observation needs a count (reads, builds, samples, thunk calls) keeps the counter in the `pair()` closure, never at module scope"
requirements-completed: []
metrics:
  duration: 35min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: b3dc974059936a9094980ac4d709b7c92242381e
plan_head_after: 7a9ac8fc290d7eac9ef397c49512a1faa0f593ae
actuals:
  tokens: 20000
  tasks: 3
  commits: 1
coverage:
  - deliverable: "builtFeeds.ts exports timelineFeedOf, diagnosticsFeedOf, gatesFeedOf and dockModelOf, each Effect.Effect<X, never, Scope.Scope>"
    verification:
      - kind: command
        ref: "pnpm typecheck; the Task 1 verify (four exports, four bare builds, no cast or any)"
        status: pass
    human_judgment: false
  - deliverable: "ConfigureRule.test.ts cells CR1 to CR15; on the base exactly CR11 and CR12 fail, on the registry read count"
    verification:
      - kind: command
        ref: "pnpm exec vitest run --project devtools packages/devtools/test/model/ConfigureRule.test.ts (13 passed, 2 failed: CR11 and CR12, `expected 2 to equal 1` on the registry reads); the Task 3 verify"
        status: pass
    human_judgment: false
  - deliverable: "every title shown failing once (the base for CR11 and CR12, a scratch edit R1 to R17 for the rest)"
    verification:
      - kind: command
        ref: "79-RED-EVIDENCE.md section `79-03 the feed cells of the rule`; the Task 3 verify checks every title has a `- failed:` line"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 03: The feed half of the configure rule, on the base

**The timeline, diagnostics and gates feeds each have their no-op, presence, bare-equivalence and moved-alone cells written against today's API, plus the one helper (`builtFeeds.ts`) every migrated test will build through; the gates feed's re-read on every configure is RED.**

## Accomplishments

- `packages/devtools/test/builtFeeds.ts`: `timelineFeedOf`, `diagnosticsFeedOf`, `gatesFeedOf`, `dockModelOf`, each `Effect.tap(make...(), built => Effect.sync(() => built.configure(inputs)))`, so a test builds the way a host's hook does. A configure that throws becomes the build's defect.
- `packages/devtools/test/model/ConfigureRule.test.ts`, three `describe`s (the dock's is 79-04's):
  - timeline CR1 to CR5: a fresh literal with the held source and capacity publishes nothing and starts no read; an omitted capacity, an `undefined` one and `DEFAULT_TIMELINE_CAPACITY` keep the snapshot object, and `{}` against `{ source: undefined, capacity: undefined }` likewise; the bare build reads what `makeTimelineFeed({})` and `timelineFeedOf({})` read; each input moved alone; build-with-inputs equals build-then-configure.
  - diagnostics CR6 to CR10: a fresh literal restarts nothing; presence (`undefined` publishes nothing on a bare feed, `{}` starts, a fresh `{}` publishes nothing, `undefined` turns `Off` once, then nothing); the bare build reads `Off` by identity, as `make...(undefined)` and `diagnosticsFeedOf(undefined)` do; each of layer, collector and interval restarts the poll once; build-with-inputs equals build-then-configure.
  - gates CR11 to CR15: a fresh literal reads the registry no more, calls the thunk no more, publishes nothing (CR11, RED on the base); an omitted thunk and interval equal ones holding `undefined` (CR12, RED on the base); the bare build is `Unwatched` and `Unhanded`; each of gates, questions and interval moved alone reacts; build-with-inputs equals build-then-configure.
- CR5, CR10 and CR15 end `, while the constructor takes inputs` so 79-12 can find and remove them with the constructor inputs.

## RED and green evidence

On the base (`packages/devtools/src` unchanged from `phase_base`) exactly CR11 and CR12 fail, both on `double.reads()` (`expected 2 to equal 1`): `GatesFeed.configure` ends with `publish(readRegistry(), asked)`, so a configure with nothing moved still calls `registry.instances()`. They go green in 79-08. The other thirteen cells are green on the base and each is shown failing once by one of seventeen scratch edits (R1 to R17 in `79-RED-EVIDENCE.md`: a configure that always reads or always restarts, one that ignores one field per table, a default read as another bound, a bare build that starts in another state, an `off` that publishes a fresh object). Every scratch edit was restored with `git checkout -- packages/devtools/src`; `git status --porcelain -- packages/devtools/src` printed nothing and no source file differs from `phase_base`.

## Deviations from Plan

None - plan executed exactly as written. One note: the plan names the scratch edits only by example, so the seventeen edits were chosen to give every title a failing run (the three moved-alone tables get one edit per field, the no-op and presence cells get the nearest wrong rule).

## Auth gates

None.

## Known Stubs

None.

## Threat Flags

None. The change is test-only: no network endpoint, auth path, file access or schema change.

## Decisions made autonomously

- The moved-alone rows are one generic `Mover<I, F, O>` shared by the three tables instead of one hand-written shape per feed, so a fourth table (the dock's, in 79-04) reuses it and a compile-forced complete `Record` stays the only per-feed part.
- The gates `read` observes the subscription and registry-read totals across the two registries a row can use, and the thunk count across both thunks, so a row that swaps the registry and a row that swaps the thunk read the same shape.

## Self-Check: PASSED

- FOUND: packages/devtools/test/builtFeeds.ts
- FOUND: packages/devtools/test/model/ConfigureRule.test.ts
- FOUND: commit 7a9ac8fc (test(79-03): pin the rule each feed applies to its inputs), holding exactly the fixture, the cells and the evidence, with the one trailer
- `packages/devtools/src` has no difference from `phase_base`
