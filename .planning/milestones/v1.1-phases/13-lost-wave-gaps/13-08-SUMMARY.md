---
phase: 13-lost-wave-gaps
plan: 08
subsystem: http-unguarded-routes-and-guarded-route-loader
tags: [http, unguarded, logging-cadence, addGuardedRoute, overloads, lost-wave-port]

phase_base: 0925c2f
requires: ["13-01"]
provides:
  - "Cadence pins: `http.test.ts` (registry route, two requests → two lines) and `PortRoutes.test.ts` `describe(\"the unguarded form's warning\")` (two served ports, three requests → one line)"
  - "`packages/http/src/UnguardedRoute.ts` (package-private): `Announce`, `DeclaredUnguarded`, `UnguardedRouteSpec<E, R>`, `unguardedRoutes(declared, routes)`"
  - "`addGuardedRoute` overloads: four-argument form evaluates against `NO_RESOURCE`; five-argument form unchanged"
  - "`packages/http/test/PermissionRegistry.tst.ts`"
  - "Spec 34 Rev 1.6 (port routes' once-at-construction warning), spec 23 Rev 1.15 (optional loader, shared constructor), website http.md, `.changeset/guarded-route-default-loader.md` (`@qadi/http` minor)"
affects: [13-11, 13-12, 19]

actuals:
  tokens: 90000
  tasks: 4
  commits: 5

tech-stack:
  added: []
  patterns: ["declared-unguarded routes built by one constructor whose cadence is a closed, required argument"]

key-files:
  created:
    - packages/http/src/UnguardedRoute.ts
    - packages/http/test/PermissionRegistry.tst.ts
    - .changeset/guarded-route-default-loader.md
  modified:
    - packages/http/src/PermissionRegistry.ts
    - packages/http/src/PortRoutes.ts
    - packages/http/src/DecisionStreamRoute.ts
    - packages/http/src/DecisionBacklogRoute.ts
    - packages/http/test/http.test.ts
    - packages/http/test/PortRoutes.test.ts
    - spec/behaviors/34-remote-ports.md
    - spec/behaviors/23-http.md
    - apps/website/src/content/docs/docs/packages/http.md

requirements-completed: [GAP-08, GAP-10]
---

# 13-08 — Both unguarded cadences pinned; one unguarded constructor; `addGuardedRoute`'s loader optional

`phase_base: 0925c2f`. Ports the http half of lost commit `4b1ed49` (L1a, L1b, T3) as ARCH-61.

## Decisions applied

No `checkpoint:decision` in this plan; `_DECISIONS.md` has no 13-08 row. CONTEXT D-01 (test first; a test gap is
shown to discriminate instead of RED) and D-02 (the lost plan's recommended option unless the premise moved):
- **D-57-a option A** (optional loader via overloads): premise unmoved — four routes still passed `loadNoResource`.
- **D-57-b option B** (one constructor, closed cadence): its precondition is met by merged ARCH-46's
  `enforceSubject`, which `portRoutesUnguarded` already used; the port handlers keep it (no re-extraction).
- **D-57-c** (`reportRefused`): obsolete since `e0365e0` (one adapter left in `DecisionLogHttp.ts`). Nothing done.
- **D-57-d option A**: spec 34 states the port routes' cadence.

## What was done

- **Task 1 (f7ffa91).** Re-anchored: the registry test is at `http.test.ts:327-358` (was 313-340); the unguarded
  describe is the last block of `PortRoutes.test.ts` (`:603`), so the new describe was appended after it.
  Baseline re-measured: `grep -c 'serving port routes' packages/http/test/*` = 0 → now ≥ 1. Both cases pass on the
  base. Spec 34 gets one paragraph after the opening example (the only place the unguarded form is described).
- **Task 2 (0447b30).** `UnguardedRoute.ts` ported from `4b1ed49` (doc comment cites BEH-QD-180, ADR-QD-107,
  ARCH-61, `4b1ed49`). `permissionRegistryRouteUnguarded` → `announce: "every-request"`, `portRoutesUnguarded` →
  `announce: "once"`, its handlers still `Effect.flatMap(HttpServerRequest, enforceSubject(answerWithResponse, …))`.
  `Reason given` non-comment lines in `packages/http/src`: 2 → 1. Barrel unchanged.
- **Task 3-RED (6a210e6).** tstyche: `Expected 5 arguments, but got 4. ts(2554)` on the three four-argument calls;
  the five-argument case passed.
- **Task 3 (48ac5b3).** Overloads over a module-private `buildGuardedRoute`, implementation defaulting to
  `loadNoResource`; no `as`. Four calls lose the argument: `permissionRegistryRoute`, `portRoutes`,
  `decisionStreamRoute` (`DecisionStreamRoute.ts:183`), `decisionBacklogRoute` (`DecisionBacklogRoute.ts:50`).
- **Mutation follow-up (99a0683).** One test, "routes no port it does not serve", kills the only survivor.

### Discriminating mutations (D-01; not committed, `git diff --stat packages/http/src` empty after each)

Port routes, warning moved into each handler (`Effect.andThen(warn, handler)`, construction-time warning removed):
```
FAIL |http| test/PortRoutes.test.ts > the unguarded form's warning > is logged once, at construction, however many requests and ports follow
AssertionError: expected [ …(3) ] to deeply equal [ Array(1) ]
  [ [ "qadi/http: serving port routes unguarded — each answers only about the request's own subject. Reason given: test: answers only about the session's own subject" ],
+   [ "…same line…" ],
+   [ "…same line…" ] ]
```
Registry route, warning moved to a `Layer.effectDiscard` beside the route:
```
FAIL |http| test/http.test.ts > @qadi/http > the registry route with no guard serves the same snapshot to an anonymous caller
AssertionError: expected [ Array(1) ] to deeply equal [ …(2) ]
  [ [ "qadi/http: serving /__permissions unguarded — the full authorization topology is public. Reason given: test fixture" ],
-   [ "…same line…" ] ]
```

### Final `loadNoResource` set in `packages/http/src`

`AuthorizeRequest.ts DecisionStreamRoute.ts NoResource.ts PermissionRegistry.ts RequirePermissionMiddleware.ts` —
the plan's expected set. `PermissionRegistry.ts` keeps it only as the overload default; `DecisionStreamRoute.ts`
only for its recheck's `enforceRequest({ …, loadResource: loadNoResource })` (`:139`), which goes through
`enforceRequest`, not `addGuardedRoute`, and takes a required loader; `RequirePermissionMiddleware.ts:67` is the
same `enforceRequest` case; `AuthorizeRequest.ts` is `authorizeRequest`'s default.

## Mutation (XC-05)

Scoped `stryker run stryker.http.mjs --mutate <files>`; base from `13-mutation-base.json`, or (no entry) from a
detached worktree at `0925c2f` in the scratchpad, removed afterwards.

| File | Base | After |
|---|---|---|
| `PermissionRegistry.ts` | 1 | 25/25 = 1 |
| `PortRoutes.ts` | .893 | 33/33 = 1 (32/33 before 99a0683) |
| `DecisionStreamRoute.ts` | 31/31 = 1 (worktree) | 31/31 = 1 |
| `DecisionBacklogRoute.ts` | 8/8 = 1 (worktree) | 8/8 = 1 |
| `UnguardedRoute.ts` | new file | 11/11 = 1 |

The `PortRoutes.ts` survivor (`if (answer === undefined) return []` forced `false` in the unguarded form) was
reachable: an unserved port got a route whose handler calls an undefined answer (500, not 404). Tested, not
called equivalent.

## Deviations

1. **[Rule 1, test]** The RED tst used `// @ts-expect-error <text>` for the narrower-handler case; tstyche checks
   the suppressed diagnostic's text against the comment, so in GREEN it became
   `expect(route).type.not.toBeCallableWith(narrowerHandler)` plus a positive `toBeCallableWith` for `Resource`.
   The RED reason (`Expected 5 arguments`) is unchanged.
2. **[Rule 1, test]** The requirements pin is exact rather than "includes": route requirements are wrapped by
   `HttpRouter.add` as `HttpRouter.Request.From<"Requires", …>`, so the expected type is
   `HttpRouter | PermissionRegistry | HttpRouter.Request.From<"Requires", StandingEvaluationServices | SubjectExtractor>`.
3. **[Beyond plan, XC-05]** 99a0683 adds one test to kill the reachable `PortRoutes.ts` survivor.
4. **[Doc]** spec 23 gains an `addGuardedRoute` overload listing in BEH-QD-180's `ts` fence (there was no
   signature fence before) and a sentence in the `/__permissions` cadence paragraph naming the shared constructor.
5. `spec-revise.mjs` run with `--date 2026-11-10` (13-01's note).
6. Changeset: no pending changeset covers the optional loader (the pending `@qadi/http` ones cover the edge step,
   handler-denial logging, `guardApi`, request-enforced-once, port routes), so the plan's new file was created.
   Not Breaking vs `@qadi/http@0.11.0` (additive overload).

## Gate results

- Task 1 verify: http.test.ts + PortRoutes.test.ts 91/91; grep ≥ 1; `packages/http/src` clean; `spec-revise --check` → VERIFY-OK.
- Task 2 verify: `--project http` 288/288; `pnpm typecheck`, `pnpm lint` (house-style 424 files clean, budgets unchanged), `pnpm circular` green; `Reason given` = 1; both `announce` greps; barrel unchanged → VERIFY-OK.
- Task 3-RED verify: tstyche fails, `PermissionRegistry.ts` untouched → VERIFY-OK.
- Task 3 verify: tstyche (PermissionRegistry, GuardRoute) 7/7 tests, 9 assertions; `--project http` 288/288 (289 after 99a0683); typecheck, lint, circular green; `spec:examples` 103 blocks; `spec:website-examples` 44 blocks; `loadNoResource` set as planned; changeset grep.
- `pnpm spec:api`: the same 10 expected drifts (6 core metrics, 4 devtools types); none from `@qadi/http`.
- `pnpm spec:verify`: 18 pass, 3 expected fails (ADR-QD-123 index/traceability; CCR register, now also citing 402).

## For Plan 13-11

- CCR-QD-402 register row (shared with 13-09): ARCH-61, lost `4b1ed49` L1a/L1b/T3 — the cadence pins, the shared
  unguarded constructor, `addGuardedRoute`'s optional loader; D-57-c obsolete (`e0365e0`).
- Traceability rows: `packages/http/test/http.test.ts` → BEH-QD-180 (per-request cadence);
  `packages/http/test/PortRoutes.test.ts` → ADR-QD-107 / spec 34's port-route cadence (no BEH id; the paragraph is
  unnumbered); `packages/http/test/PermissionRegistry.tst.ts` → BEH-QD-178 and BEH-QD-180 (the `addGuardedRoute`
  signature lives in BEH-QD-180's fence; the `NO_RESOURCE` default is BEH-QD-178's).
- `spec/overview.md`: `addGuardedRoute`'s row should say the loader is optional (four-argument form evaluates
  against `NO_RESOURCE`). No export added or removed.

## Ids

- Used: CCR-QD-402 (cited in spec 34 Rev 1.6 and spec 23 Rev 1.15; register row is 13-11's).
- Cited with merged meanings: BEH-QD-178, BEH-QD-180, ADR-QD-099, ADR-QD-107.
- No BEH/INV/ADR number needed.
- Left free: ADR-QD-121, 122, 124, 125; BEH-QD-360..367, 369..378; INV-QD-255, 256, 258, 260..264; CCR-QD-403.

## Commits

| sha | subject |
|---|---|
| f7ffa91 | test(13-08): pin both unguarded-route warning cadences; spec 34 states the port routes' once |
| 0447b30 | refactor(13-08): one constructor for the declared-unguarded routes, cadence named at the call |
| 6a210e6 | test(13-08): RED — a no-resource guarded route needs no loader |
| 48ac5b3 | feat(13-08): addGuardedRoute's loader is optional; four routes stop naming loadNoResource |
| 99a0683 | test(13-08): the unguarded port form routes no port it does not serve |
