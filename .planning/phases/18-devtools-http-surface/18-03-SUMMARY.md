---
phase: 18-devtools-http-surface
plan: 03
subsystem: http, spec, website
tags: [address-rule, devtools-routes, prefix, spec, changeset, check-pr]

requires: [18-01, 18-02]
provides:
  - "BEH-QD-419 (address rule), BEH-QD-420 (devtoolsRoutes, one guarded mount), INV-QD-285, ADR-QD-130, CCR-QD-408"
  - "The unguarded registry's warning names the path it serves, prefix included"
  - ".changeset/devtools-route-address.md (@qadi/http minor, additive vs 0.11.0)"

mutation_after:
  packages/http/src/DecisionStreamRoute.ts: 100 (32/32)
  packages/http/src/DecisionBacklogRoute.ts: 100 (9/9)
  packages/http/src/PermissionRegistry.ts: 100 (30/30)
  packages/http/src/DevtoolsRouteAddress.ts: 100 (14/14)
  packages/http/src/DevtoolsRoutes.ts: 0 mutants (not a drop)

requirements-completed: [SURF-01, SURF-02, SURF-03, SURF-04]

completed: 2026-11-10
status: complete
---

# 18-03 — Phase 18 recorded in the spec, and the tree proved

## Decision applied

18-01 T1 (D-02) from `_DECISIONS.md`: **`option-b`** — "Address rule plus one `devtoolsRoutes(...)` mounting call".
So ADR-QD-130 was written (a public concept: the devtools surface as one guarded mount) and BEH-QD-420 added.

## Orchestrator decision: the unguarded warning names the served path

The open point from 18-01 (warning still said `/__permissions` under a prefix) was fixed, not documented as a limit.

- RED (`85ded1c`): `DevtoolsRouteAddress.test.ts`'s unguarded-registry test now expects
  `qadi/http: serving /x/devtools/__permissions unguarded — …`; it failed with the old `/__permissions` line (1 failed, 6 passed).
- Fix (`823f4fb`): `permissionRegistryRouteUnguarded` builds `path = devtoolsPath("permissions", options?.prefix)` once
  and uses it for both `what` and the route. The default mount's line is byte-identical; `http.test.ts`'s
  default-mount assertion is unchanged and passes. http project 302/302.
- Recorded in BEH-QD-180 (23-http.md: a requirement plus the two lines), BEH-QD-419, ADR-QD-130 decision item 5, the changeset and CCR-QD-408.

## Spec

Ids re-grepped free before writing. Used: BEH-QD-419, BEH-QD-420, INV-QD-285, ADR-QD-130, CCR-QD-408.
Unused reservations: BEH-QD-421..428, INV-QD-286..289.

- `26-decision-stream.md` Rev 1.15: BEH-QD-419 (default paths, trailing slash and `"/"`, default path 404 under a prefix,
  403 at every prefixed path, client derives the URL), BEH-QD-420; BEH-QD-202 and BEH-QD-315 listings take `prefix`.
- `23-http.md` Rev 1.16: BEH-QD-180 signatures take options; prefix and warning requirements.
- `invariants.md` Rev 1.98: INV-QD-285.
- `traceability.md` Rev 1.140: §1 rows 23 and 26, §2 INV-QD-285, §3 ADR-QD-130, §4 DevtoolsRouteAddress.test.ts/.tst.ts
  and DevtoolsRoutes.test.ts, §5 REQ-QD-033 with the scenario "A reader follows the host's prefix".
- `decisions/130-the-devtools-surface-is-one-guarded-mount.md` (new) + index.yaml; quotes the `option-b` answer.
- `README.md` Rev 1.142: CCR-QD-408 after CCR-QD-407.
- `overview.md` unchanged (1.87/1.88 from 18-01 already carry every export).

## Docs and changeset

- `packages/http/README.md`: "The devtools routes" section.
- Website `packages/http.md`: registry signatures take options; new "The devtools routes" section with a compiled
  `typescript` example (`devtoolsRoutes` under `/devtools`, `devtoolsPath` for the client URL).
  `packages/devtools.md`: a compiled example building `sourceFromEventSource`'s url from `devtoolsPath`.
- `.changeset/devtools-route-address.md`: `@qadi/http` minor. No pending changeset covered the devtools address, so a new
  one. Not Breaking against `@qadi/http@0.11.0` (there, both registry constructors had no options; everything is additive
  and default paths are unchanged).

## Mutation (XC-05)

`stryker.http.mjs` on the five touched files: all 1.0 (85 killed, 0 survived), equal to `18-mutation-base.json` (all 1.0).
Recorded in `18-mutation-after-03.json`.

## Gate results

- `pnpm spec:verify:strict`: 21 PASS, 0 FAIL (the CCR-QD-408 gap closed). `spec-revise --check` green.
- `pnpm spec:api`, `spec:examples` (108 blocks), `spec:website-examples` (50 blocks), `spec:gates`, `spec:claims`, `pnpm lint`: green.
- **`pnpm check:pr`: exit 0**, 16 of 17 steps (mutation skipped by design). Vitest 170 files / 4422 tests; tstyche 43 files /
  199 tests; BDD 34 files / 568 tests; example vitest 7 / 42; Playwright e2e 30 passed.
- `git diff d4d9897 -- stryker*.mjs vitest.config.ts packages/*/vitest.config.ts scripts/check-house-style.mjs spec/scripts`: empty.

## Deviations

None beyond the orchestrator-directed warning fix (in scope, test-first).

## Commits

- `85ded1c` test(18-03): the unguarded registry's warning names its prefixed path, red: it still says /__permissions
- `823f4fb` fix(18-03): the unguarded registry's warning names the path it serves, prefix included
- `b5b7c61` docs(18-03): BEH-QD-419, BEH-QD-420 and INV-QD-285 state the devtools address rule and its one guarded mount
- `5049729` docs(18-03): ADR-QD-130, CCR-QD-408, the website and README pages, and the @qadi/http changeset
- `docs(18-03): complete plan` (this SUMMARY, mutation json, ROADMAP, STATE, REQUIREMENTS)
