---
phase: 18-devtools-http-surface
plan: 01
subsystem: http
tags: [address-rule, devtools-routes, prefix, tracer, mutation-base]

phase_base: d4d9897
mutation_baseline:
  packages/http/src/DecisionStreamRoute.ts: 100 (31/31)
  packages/http/src/DecisionBacklogRoute.ts: 100 (8/8)
  packages/http/src/PermissionRegistry.ts: 100 (25/25)
mutation_after:
  packages/http/src/DecisionStreamRoute.ts: 100 (32/32)
  packages/http/src/DecisionBacklogRoute.ts: 100 (9/9)
  packages/http/src/PermissionRegistry.ts: 100 (30/30)
  packages/http/src/DevtoolsRouteAddress.ts: 100 (14/14, new)
  packages/http/src/DevtoolsRoutes.ts: 0 mutants (new; not a drop)

requires: []
provides:
  - "`DevtoolsRouteAddress.ts` (public, zero imports): `devtoolsPath`, `DevtoolsRoute`, `DevtoolsRouteOptions`"
  - "`DecisionBacklogOptions`; a `prefix` option on `decisionStreamRoute`, `decisionBacklogRoute`, `permissionRegistryRoute`, `permissionRegistryRouteUnguarded`"
  - "`DevtoolsRoutes.ts`: `devtoolsRoutes`, `DevtoolsRoutesOptions` (D-02 option-b)"
affects: [18-02, 18-03]

key-files:
  created:
    - packages/http/src/DevtoolsRouteAddress.ts
    - packages/http/src/DevtoolsRoutes.ts
    - packages/http/test/DevtoolsRouteAddress.test.ts
    - packages/http/test/DevtoolsRouteAddress.tst.ts
    - packages/http/test/DevtoolsRoutes.test.ts
    - .planning/phases/18-devtools-http-surface/18-base.txt
    - .planning/phases/18-devtools-http-surface/18-mutation-base.json
    - .planning/phases/18-devtools-http-surface/18-mutation-after-01.json
  modified:
    - packages/http/src/DecisionStreamRoute.ts
    - packages/http/src/DecisionBacklogRoute.ts
    - packages/http/src/PermissionRegistry.ts
    - packages/http/src/index.ts
    - spec/overview.md

key-decisions:
  - "Applied 18-01 T1 (D-02) from `_DECISIONS.md`: `option-b` — \"Address rule plus one `devtoolsRoutes(...)` mounting call\". Not asked again."
  - "The unguarded registry's warning is built from `what: devtoolsPath(\"permissions\")` (no prefix), so its bytes stay `/__permissions` under any prefix; only `path` takes the prefix."
  - "`devtoolsRoutes` passes its whole options object to `decisionBacklogRoute`: no subset adapter was needed (structural; `reauth` is ignored there)."

requirements-completed: [SURF-01, SURF-03]  # SURF-02 is completed by 18-02's real-reader round trip; XC-* are cross-cutting

completed: 2026-11-10
status: complete
---

# 18-01 — One address rule for the devtools routes, and one call that mounts them

`phase_base: d4d9897` (also in `18-base.txt`).

## Decision applied

18-01 Task 1 (D-02) is pre-answered in `.planning/phases/_DECISIONS.md`: **`option-b`** — "Address rule plus one
`devtoolsRoutes(...)` mounting call". Continued without stopping.

## Mutation base (XC-05)

Taken before any code change with `pnpm exec stryker run stryker.http.mjs --mutate
'packages/http/src/DecisionStreamRoute.ts,packages/http/src/DecisionBacklogRoute.ts,packages/http/src/PermissionRegistry.ts'`
and the 17-02 one-liner into `18-mutation-base.json`: all three at 1.0 (31, 8, 25 killed). After this plan
(`18-mutation-after-01.json`) every touched file is still 1.0; `DevtoolsRouteAddress.ts` is 14/14, and
`DevtoolsRoutes.ts` has 0 mutants (only a `Layer.mergeAll` call). One survivor on the leaf
(`(prefix ?? "/")` → `(prefix ?? "")`, equivalent: both slice to `""`) was simplified away
(`prefix?.slice(1)… ?? ""`), not tested around.

## Task 2 — the address leaf and a prefix on every constructor

- RED first (`8c97750`): 7/7 failed for the right reasons — `devtoolsPath is not a function` (6) and
  `/__decisions: expected 200 to equal 404` (the default-path test: no prefix option, so the routes stayed at the root).
- `DevtoolsRouteAddress.ts`: `DevtoolsRoute = "decisions" | "backlog" | "permissions"`, `DevtoolsRouteOptions { prefix? }`,
  a module-private mapped `SEGMENT` table, `devtoolsPath(route, prefix?)` normalising like `portPath`. Zero imports, in
  the barrel. No `as`, no switch.
- `DecisionStreamOptions` extends `DevtoolsRouteOptions` too; new `DecisionBacklogOptions extends
  DecisionLogServeOptions, DevtoolsRouteOptions`; `permissionRegistryRoute(permission, policy, options?)` and
  `permissionRegistryRouteUnguarded(reason, options?)`. Every log sentence is byte-identical (the recheck line is a
  template literal naming the route, untouched; the unguarded warning is asserted under a prefix).
- Quoted devtools path literals in `packages/http/src` non-comment lines outside the leaf: **5 at the phase base**
  (as predicted after 13-08: stream, backlog, registry, and the unguarded registry's `what:` and `path:`), **0 now**.
- Existing stream, backlog and `http.test.ts` tests pass unedited.

## Task 3 — `devtoolsRoutes` (option-b, SURF-03)

`devtoolsRoutes(permission, policy, log: Pick<DecisionLog, "read" | "readEntries" | "snapshot">, options?)` =
`Layer.mergeAll` of the three guarded constructors. No unguarded form (BEH-QD-202); tst pins that permission and
policy are required and that a read-only `DecisionLogReader` is not enough. Tests: round trip under `/x/devtools`,
defaults with no options, 403 for bob and anonymous on all three, `onRefused` reaches backlog and stream, `reauth`
reaches the stream (failed recheck logs the unchanged closure line), `reauth.interval: 0` throws at construction.

## Overview rows (gate 13, `pnpm spec:api`)

Added in the @qadi/http table: `DecisionBacklogOptions`; `devtoolsPath`, `DevtoolsRoute`, `DevtoolsRouteOptions`;
`devtoolsRoutes`, `DevtoolsRoutesOptions`; `DecisionStreamOptions`'s row names `prefix`. Change History 1.87 and 1.88,
both citing ARCH-66 and CCR-QD-408.

## CONTEXT corrections (found at planning time, confirmed)

- `@qadi/devtools` builds no URL: `sourceFromEventSource` takes `url` from its caller. The client half is the host (the
  example's Dock, the acceptance steps), so `devtoolsPath` is public from `@qadi/http`'s root. No devtools source change.
- Only nextjs-newsroom mounts all three routes under one guard pair; http-advanced mounts the stream and the registry
  under two different pairs and no backlog, so it keeps the per-route constructors (18-02).

## Phases 11–17 vs. the plan's interfaces

Nothing unpredicted: `DecisionStreamRoute.ts` already used core's `encodeDecisionStream`, and
`permissionRegistryRouteUnguarded` was already the 13-08 `unguardedRoutes` call. `UnguardedRoute.ts` is unchanged.

## Deviations

- Rule 1 (house style): the lint's `no-type-assertion` regex matched the word "as" in a test doc comment; reworded.
  An `as const` in a test loop was replaced by a typed `ReadonlyArray<DevtoolsRoute>` before commit.
- Equivalent-mutant simplification in `devtoolsPath` (see Mutation base).

## Gate results

- Task 2 `<automated>`: pass (vitest 4 files, tstyche 3 files, typecheck, lint, circular, spec:api, spec-revise --check, the four greps).
- Task 3 `<automated>`: pass (whole http project 302/302, tstyche, typecheck, lint, circular, spec:api, spec-revise --check, barrel grep).
- `pnpm spec:verify:strict`: **red on "CCR register coverage" (CCR-QD-408)**, expected, until 18-03 registers it.

## Commits

- `8c97750` test(18-01): the devtools routes under a prefix, red: no address rule and no prefix option
- `dda955a` feat(18-01): one address rule for the devtools routes, and a prefix on every constructor
- `ff27fee` feat(18-01): devtoolsRoutes mounts the devtools surface under one guard and one prefix
- `docs(18-01): complete plan` (this SUMMARY, mutation-after json, ROADMAP, STATE)

## Deferred

- 18-02: the BDD scenario through the real reader (SURF-02), both examples onto `devtoolsPath`/`devtoolsRoutes`
  (nextjs-newsroom's `unprefixed` rewrite if the prefix removes the need; http-advanced keeps per-route constructors).
- 18-03: register CCR-QD-408; BEH (from 419..428) for the address rule and `devtoolsRoutes`, INV/traceability as needed;
  ADR-QD-130 (option-b adds the public concept "the devtools surface") or a stated reason for none; changeset
  (`@qadi/http` minor: the four new names plus `prefix` options); README/website mentions; per-file mutation compare
  against `18-mutation-base.json`; `pnpm check:pr`.
