---
phase: 18-devtools-http-surface
plan: 02
subsystem: http, examples, acceptance
tags: [address-rule, devtools-routes, prefix, bdd, examples]

requires: [18-01]
provides:
  - "decision-log.feature: \"A reader follows the host's prefix\" — devtoolsRoutes under /x/devtools, read by sourceFromEventSource at devtoolsPath(\"decisions\", prefix), plus a 404 guard at the unprefixed path"
  - "nextjs-newsroom: Dock URL from devtoolsPath; server mounts the devtools surface with one devtoolsRoutes call"
  - "http-advanced: stream and registry under /devtools, URLs logged from devtoolsPath"
affects: [18-03]

key-files:
  modified:
    - features/features/decision-log/decision-log.feature
    - features/features/decision-log/decision-log.steps.test.ts
    - examples/nextjs-newsroom/src/client/Dock.tsx
    - examples/nextjs-newsroom/src/server/api.ts
    - examples/nextjs-newsroom/app/api/[[...route]]/route.ts
    - examples/nextjs-newsroom/README.md
    - examples/http-advanced/server.ts
    - examples/http-advanced/client.ts

key-decisions:
  - "D-02 (from _DECISIONS.md, applied in 18-01): option-b — \"Address rule plus one `devtoolsRoutes(...)` mounting call\". So the Next server uses devtoolsRoutes; http-advanced keeps the per-route constructors (two guard pairs)."
  - "D-04 rewrite decision: nextjs-newsroom's `unprefixed` /api rewrite is KEPT. Next mounts every route family (articles, aggregator ingest, ports, the devtools surface) under /api; a prefix on the devtools routes alone would not remove the need to strip it, and the router stays liftable. Its doc no longer claims the devtools path is fixed."

requirements-completed: [SURF-02, SURF-04]

completed: 2026-11-10
status: complete
---

# 18-02 — The real reader follows the prefix; both examples on the address rule

## Task 1 (tracer) — acceptance under a prefix (SURF-02)

- `serve(log, prefix?)` now mounts `devtoolsRoutes(readDevtools, canReadDevtools, log, { prefix })` (option-b) through
  the real `HttpRouter` web handler. `pipedEventSource` already sent the requested url to the handler (12-01's reconnect
  support kept), so a wrong path is the router's 404.
- New World field `prefix`, new steps "the devtools routes are mounted under {string}" and "a reader at the unprefixed
  path gets no stream" (direct request at `devtoolsPath("decisions")` to the prefixed router: 404).
- RED (`e8430a3`): the new scenario failed with `RouteNotFound (GET /__decisions)` logged by the router, and the reader
  never got its prelude (5 s test timeout). The other 6 scenarios passed.
- GREEN (`842eb46`): both reader urls are `devtoolsPath("decisions", prefix)` / `devtoolsPath("decisions")`. 0 quoted
  `"/__decisions"` left in the steps (1 at baseline). BDD 568/568.

## Task 2 — both examples (SURF-04)

- `Dock.tsx`: `url: "/api" + devtoolsPath("decisions")`, comment: "/api" is where Next mounts the router, the same base
  the ports client uses. Doc comments at ~26/~56 left: they name the external address, which is unchanged.
- `api.ts`: three per-route calls replaced by `devtoolsRoutes(readDevtools, canReadDevtools, log)` (no prefix, so the
  external addresses stay `/api/__decisions`, `/api/__decisions/backlog`, `/api/__permissions`). Module doc rewritten.
- `route.ts`: `unprefixed` kept; doc gives the real reason (see D-04 above).
- `README.md`: the `src/server/api.ts` row says the surface is one `devtoolsRoutes` call with paths from `devtoolsPath`.
- `http-advanced/server.ts`: stream (`reauth` kept) and registry mounted with `{ prefix: "/devtools" }`; new paths are
  `/devtools/__decisions` and `/devtools/__permissions`; the listen callback logs both from `devtoolsPath`; module doc
  items 4 and 5 name the prefixed paths; one comment line says why it does not use `devtoolsRoutes` (two guard pairs).
- Quoted devtools paths in example code (non-comment lines): 1 at baseline (`Dock.tsx:67`), 0 now.

## e2e literals kept

`examples/nextjs-newsroom/e2e/*.spec.ts` still fetch `/api/__decisions…` literally, on purpose: they probe the external
address a browser sees, and deriving them from `devtoolsPath` would stop them noticing if the rule moved the address.
The ROADMAP grep is scoped to `src`/`app` code for this reason. They run in 18-03's `pnpm check:pr`.

## Deviations

- Rule 1 (doc accuracy): `examples/http-advanced/client.ts` (not in the plan's file list) had a comment naming
  `/__decisions`, now wrong under the prefix; reworded to "the decision stream". Comment only.
- The steps' module doc no longer calls the differential "the last scenario" (it is no longer last); it names it.

## Mutation (XC-05)

No `packages/*/src` file changed in this plan, so there is nothing to compare against `18-mutation-base.json`.

## Gate results

- Task 1 `<automated>`: pass (`pnpm typecheck` first, then `pnpm test:bdd` 34 files / 568 tests, both greps, `pnpm lint`).
- Task 2 `<automated>`: pass (example typecheck, example vitest 7 files / 42 tests, http-advanced `tsc --noEmit`,
  `pnpm lint`, path-literal count 0, both `devtoolsPath` greps).
- Plan verification: also root `pnpm typecheck` and `pnpm circular` green after Task 2.
- Not run here: `pnpm example` (Playwright e2e, needs system deps) and `pnpm check:pr` — 18-03.
  `spec:verify:strict` is expected red until 18-03 registers CCR-QD-408.

## Commits

- `e8430a3` test(18-02): a devtools reader under the host's prefix, red: the reader still asks for /__decisions
- `842eb46` feat(18-02): the acceptance reader takes its url from devtoolsPath, so it follows the host's prefix
- `b48c4e1` feat(18-02): both examples build their devtools paths from devtoolsPath
- `docs(18-02): complete plan` (this SUMMARY, ROADMAP, STATE)

## Deferred to 18-03

- Spec: the new acceptance scenario in traceability (alongside REQ-QD-033 / the BEH for the address rule), CCR-QD-408,
  BEH from 419..428, ADR-QD-130 or a stated reason for none.
- Changeset (`@qadi/http` minor); README/website mentions of `devtoolsPath`/`devtoolsRoutes` (and the examples' new shape
  if the website describes http-advanced's paths).
- The open point on the unguarded registry's warning naming `/__permissions` under a prefix (fix test-first, or document).
- Per-file mutation compare for 18-01's files; `pnpm check:pr` incl. the Next e2e probes of the unchanged external URLs.
