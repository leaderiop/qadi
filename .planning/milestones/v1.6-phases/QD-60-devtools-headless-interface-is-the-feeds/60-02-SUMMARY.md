---
phase: QD-60-devtools-headless-interface-is-the-feeds
plan: 02
subsystem: devtools
tags: [tdd, red, interface, surface, feeds, diagnostics-options]
phase_base: 35a48554388da6c68940c1b94a1cc526b3111eae
requires: [60-01]
provides:
  - a span pin, green on the base, for the diagnostics poll's two Effect.fn names
  - surface.test.ts and surface.tst.ts stating the root's 49 values, 13 new types and the retired names refused
  - the three feed suites reading their public names from the root, and the one DiagnosticsOptions shape stated
affects: [60-03, 60-05, 60-08]
actuals:
  tokens: 28000
  tasks: 3
  commits: 3
plan_head_before: b0a6cdd2
plan_head_after: 22e330a8
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-60 Plan 02: The tests that state the new interface, on the base

**One green span pin, then two RED commits (the root's surface, the feed suites and the one option shape), each failing on the untouched base for the reason it should; no src file changed.**

## Commits

| Task | Commit | Subject | Files |
| ---- | ------ | ------- | ----- |
| 1 | `9f9102b0` | `test(60-02): pin the diagnostics poll's two spans, green on the base` | `test/model/DiagnosticsStore.test.ts` |
| 2 | `ecf7ccfe` | `test(60-02): RED the root's interface is the three feeds, the runners gone` | `test/surface.test.ts`, `test/surface.tst.ts` |
| 3 | `22e330a8` | `test(60-02): RED the feed suites run through the root, one DiagnosticsOptions` | `test/model/{TimelineFeed,DiagnosticsFeed,GatesFeed,DiagnosticsStore}.test.ts`, `test/model/DiagnosticsStore.tst.ts` |

`git diff --name-only 35a48554 HEAD -- ':(glob)packages/*/src/**'` prints nothing.

## Observed RED failures (on the base)

- Task 1: `DiagnosticsStore.test.ts` 27 passed (27), with the new `opens the poll's two spans`; `tsc -p tsconfig.test.json`
  clean.
- Task 2, `surface.test.ts`: `AssertionError: expected [ …(47) ] to deeply equal [ 'AskedRead', …(48) ]`, 1 failed | 1
  passed. `surface.tst.ts` under tstyche: 25 `has no exported member` errors (TS2305 15, TS2724 9 in tsc) and 7 unused
  `@ts-expect-error` (TS2578: `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`,
  `noDiagnostics`, the type `DiagnosticsStore`, and the React entry's `DiagnosticsDockOptions`; the root has never
  exported `DiagnosticsDockOptions`, so its refusal holds on the base), `Targets: 1 failed`.
- Task 3 vitest over the four suites: `Tests 83 failed | 27 passed (110)`. `TimelineFeed` 22 fail
  (`makeTimelineFeed is not a function`, then `yield* … is not iterable`), `GatesFeed` 31 fail
  (`makeGatesFeed is not a function`), `DiagnosticsFeed` 29 fail (`makeDiagnosticsFeed is not a function`,
  `Cannot read properties of undefined (reading 'Off')` for `DiagnosticsStatus`). In `DiagnosticsStore.test.ts` exactly
  one test fails: `honours an interval override` (`AssertionError: expected 1 to equal 3`, since the base ignores
  `intervalMillis`). `DiagnosticsStore.tst.ts` under tstyche: `Targets: 1 failed` (the unused
  `@ts-expect-error not generic`, TS2578, plus the schedule and unmet-requirement pins).
- Classifier, `pnpm exec tsc -p tsconfig.test.json --noEmit --pretty false` after Task 3: **254 `error TS` lines**, all
  in the seven RED files (`surface.test.ts` has none, being a runtime test), each of the five files in Task 3's list has
  at least one.

## Deviations from Plan

**1. [Rule 9 - Plan error] The classifier's allow-list of seven codes is incomplete**
- **Found during:** Task 3 (the type classifier).
- **Issue:** after the feed suites import `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` and `AskedRead` from
  a root that does not export them (TS2305/TS2724), every use is typed `unknown` or `any`, and four more codes follow
  from that and from nothing else: TS18046 (`'feed' is of type 'unknown'`, 45 lines), TS2375 (`Effect<void, unknown,
  unknown>` not assignable to `Effect<void, unknown, Scope>` under `exactOptionalPropertyTypes`, the assignability
  sibling of TS2322; 82 lines), TS377004 (the Effect language service's `missingEffectContext`, same cause; 81 lines) and
  TS7006 (an implicit `any` parameter fed by an unresolved type; 1 line).
- **Fix:** none to the tests; the intent of the check is that no error is a typo and none is outside the RED files, so I
  read the classifier as the seven codes plus those four cascades, in a file that also carries a TS2305, TS2724 or
  TS2353 root error. All but one cascade line mention `unknown` or an implicit `any`; that one, a TS2375 at
  `DiagnosticsStore.test.ts:260`, is the base's `E = never` refusing the test's `Layer<AttributeResolver, string>`, which
  is exactly what D-03's `Layer.Layer<never, unknown>` fixes. No error is in a non-RED file. 60-05's GREEN run is where
  the cascades must all disappear.
- **Files modified:** none. **Commit:** none.

**2. [Rule 9 - Plan error] The React `DiagnosticsDockOptions` and four other React re-exports need an alias in `surface.tst.ts`**
- **Found during:** Task 2.
- **Issue:** the root now exports `DiagnosticsOptions`, `DiagnosticsSnapshot`, `DiagnosticsStatus` and `TimelineStatus`
  and so does the React entry; both lists are `export type { … }` in one module, so the same name twice is TS2300
  (duplicate identifier), a code outside the allow-list and a defect of the test, not a missing name. The same holds for
  the two `DiagnosticsDockOptions` refusals.
- **Fix:** the React list re-exports those four as `ReactDiagnosticsOptions`, `ReactDiagnosticsSnapshot`,
  `ReactDiagnosticsStatus`, `ReactTimelineStatus`, and the React refusal is `DiagnosticsDockOptions as
  ReactDiagnosticsDockOptions`, with a one-line comment. The refusals' and the re-exports' intent (each name importable
  from its entry, the retired one refused from both) is unchanged. **Commit:** `ecf7ccfe`.

## Next plan must know

- 60-03 (GREEN) should expect these to turn green: `surface.test.ts`, `surface.tst.ts`, the three feed suites (their
  import lines name the root), `DiagnosticsStore.test.ts`' `honours an interval override`, and
  `DiagnosticsStore.tst.ts`. Until it lands they are expected red; `pnpm check:pr` is red from this commit to 60-03.
- `DiagnosticsOptions` must be non-generic and exactly `{ layer?: Layer.Layer<never, unknown>; collector?:
  PortCallCollector; intervalMillis?: number }` for `surface.tst.ts`' `toBe` to hold; `runDiagnostics` must take no
  `schedule` and refuse a `Layer<Thing, never, Other>`.
- The root must export `DiagnosticsStatus` and `TimelineStatus` as values and types, and the React entry must keep its
  own re-exports (REACT_VALUES unchanged, 8).
- The span pin `opens the poll's two spans` is on the base at `9f9102b0`; it must stay green after the
  `runDiagnostics`/`wiringReader` rewrite.
- `.planning/config.json` and the `*.iter*.md` files remain untouched and unstaged.

## Self-Check: PASSED

The three commits are ancestors of `HEAD`, each holds exactly the files the plan names with the trailer last, and no src
file differs from `phase_base`.
