---
phase: 13-lost-wave-gaps
plan: 01
subsystem: http-enforcement
tags: [http, enforcement, public-endpoint, denial-log, lost-wave-port, mutation-base]

phase_base: 0925c2f
requires: ["12-05"]
provides:
  - "`enforcePublic(project, handler)` in `AuthorizeRequest.ts`: the module's third (public) mode"
  - "`RequirePermission`'s Public arm through `enforcePublic(answerInChannel, () => httpEffect)`; `refuse` provides nothing"
  - "A `publicEndpoint` caller row in `RequestEnforcement.test.ts` (six callers, ten not-applicable cells)"
  - "BEH-QD-359; BEH-QD-321/335 amended (23-http.md Rev 1.14); ADR-QD-108 Rev 1.2 addendum"
  - "Phase base `13-base.txt` and `13-mutation-base.json` (17 files, all six Stryker configs, scoped)"
affects: [13-11, 13-12]

actuals:
  tokens: 70000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/13-lost-wave-gaps/13-base.txt
    - .planning/phases/13-lost-wave-gaps/13-mutation-base.json
  modified:
    - packages/http/src/AuthorizeRequest.ts
    - packages/http/src/RequirePermissionMiddleware.ts
    - packages/http/test/http.test.ts
    - packages/http/test/RequestEnforcement.test.ts
    - packages/http/test/RequestEnforcement.tst.ts
    - spec/behaviors/23-http.md
    - spec/decisions/108-a-request-is-enforced-once-through-one-module.md
    - .changeset/request-enforced-once.md

requirements-completed: [GAP-01]
---

# 13-01 — A public endpoint's handler-raised denial is logged once

`phase_base: 0925c2f` (`13-base.txt`, written by this plan).

## What was done

- **Task 1 (RED, 6d40ea1).** `http.test.ts` gains the `publicRaise`/`publicOutage` probe endpoints, their
  handlers and an `OutageLayer` (`scriptedPort(attributeResolverPort, () => PortReply.fail("SECRET-conn-string"))`,
  so `PORT_DOUBLE_BUDGET` is untouched), and two cases in "RequirePermission's scopes around the handler
  (characterization)". `RequestEnforcement.test.ts` gains caller `publicEndpoint` (after `middleware`),
  `anonymousDeniedWrite`, `PUBLIC_HAS_NO_EDGE`, `publicEndpointDriver` and the ten-cell not-applicable list.
  RED on the base, exactly two failures, both for the stated reason:
  - `http.test.ts > … > a public endpoint's handler-raised denial is logged once, as the handler's`:
    `AssertionError: expected [] to deeply equal [ Array(1) ]` (lines `[]`; status 403 and body already held).
  - `RequestEnforcement.test.ts > … > publicEndpoint × handlerDenial`: expected one `"handler"` line for
    `anonymous`, received `[]`.
  - 54 others passed, including the outage case (encoder strip) and `publicEndpoint × extractionFailure/success`.
- **Task 2 (GREEN, f125042).** Final name and signature of the public mode (a plain function, no span: it takes
  no request and `enforced` adds none):
  ```ts
  export function enforcePublic<H, R, B, EP, RP>(
    project: EnforcementProjection<B, EP, RP>,
    handler: (allowed: { readonly subject: AuthSubject }) => Effect.Effect<H, HttpEnforcementFailure | unhandled, R>,
  ): Effect.Effect<H | B, EP | unhandled, Exclude<R, CurrentSubject> | RP>
  // = enforced(Effect.succeed({ subject: anonymous }), project, handler)
  ```
  The Public arm is `enforcePublic(answerInChannel, () => httpEffect)`; `refuse`'s no-op
  `provideService(CurrentSubject, anonymous)` is gone, and the middleware imports `CurrentSubject` as a type only.
  `RequestEnforcement.tst.ts` pins requirements `never` and error
  `ReturnType<typeof projectHttpEnforcementFailure> | unhandled`.
- **Task 3 (docs, 3dc0d34).** BEH-QD-359 (after BEH-QD-338, numeric order), BEH-QD-321's logging requirement names
  public endpoints, BEH-QD-335 gets `enforcePublic` in its fence, the public-mode REQUIREMENT, the surface list and
  "three modes". ADR-QD-108 Rev 1.2 addendum. No sentence in `packages/http/README.md` or the website's `http.md`
  lists which surfaces log a handler denial, so neither changed.

## How Phase 11 had reshaped the middleware

`Match.valueTags(endpointAccess(endpoint.annotations), { Undeclared, Public, Required })` became
`Match.valueTags(plan.accessOf(group, endpoint), { Public, Required })` (ARCH-59's access plan); an endpoint outside
the plan is `refuse`d before the match. The arm that serves a `publicEndpoint` is still called **`Public`**.
Re-anchored lines: `enforced` at `AuthorizeRequest.ts:172-196`, `enforceSubject` `:207-220`, `answerInChannel` `:72`;
`refuse` at `RequirePermissionMiddleware.ts:77-81`, `Public` arm `:97`; `CALLERS` at `RequestEnforcement.test.ts:74`,
the "seven" test at `:495`; the probe at `http.test.ts:826-879`. Baselines held as planned: public-row count 0,
direct provision literal 1 → 0, non-comment `provideService(CurrentSubject` outside `AuthorizeRequest.ts` 1 → 0.

## Decisions applied

No `checkpoint:decision` in this plan. D-01 (test first) and D-02 (the lost plan's end state, through merged ARCH-46's
module instead of `serveRequest`) applied. `_DECISIONS.md` rows for 13-04 (`A`) and 13-12 T3 (`keep-wave5`) are not
this plan's.

## Ids

- Used: **BEH-QD-359**, ADR-QD-108 (addendum, merged id), CCR-QD-399 (cited in the 23-http.md history and the
  addendum; its register row is Plan 13-11's).
- Unused by 13-A: **BEH-QD-360..362, ADR-QD-121**.
- Code comments cite the lost work by hash (`b0b9363`) only.

## For Plan 13-11

- INV-QD-243 sentence to add: "The public mode (`enforcePublic`) is one of these paths: a `publicEndpoint` runs its
  handler as `anonymous` through the module's handler step, so a denial its own `guard` raises is logged once,
  annotated `"handler"`, and every failure is answered by the caller's projection (BEH-QD-359)."
- Traceability rows: `packages/http/test/http.test.ts`, `packages/http/test/RequestEnforcement.test.ts`,
  `packages/http/test/RequestEnforcement.tst.ts` → BEH-QD-359, BEH-QD-321, BEH-QD-335.
- CCR-QD-399 row. Until it exists, `pnpm spec:verify` fails one check, "CCR register coverage" (399 cited, not in the
  register). Expected, not fixed here (the plan assigns the register to 13-11).
- No export added or removed, so `spec/overview.md` is unaffected.

## Mutation base (XC-05, for 13-12 Task 2)

Taken before any code change, from a detached worktree at `0925c2f` (scratchpad, removed afterwards), with exactly
13-12 Task 2 step 1's six scoped `--mutate` runs and its extractor, output in `13-mutation-base.json` (fractions,
17 files): core DecisionCache .948, Lifecycle .957, Predicate .997; http AuthorizeRequest .889, PermissionRegistry 1,
PortRoutes .893, RequirePermissionMiddleware 1; devtools Edits/Remedies/Replay/SimulationEdit 1, SimulationSession
.963, SimulationSource .941; audit CircuitBreaker .805, AuditWriteReport .966; predicate-sql index .956,
predicate-prisma index .924. 13-12 can skip its worktree step and run step 2 only.
After this plan (http, scoped to the two touched files): AuthorizeRequest 18/20 = .900 (≥ .889; survivors are the two
span-name strings), RequirePermissionMiddleware 18/18 = 1.

## Deviations

1. **[Rule 3, plan vs. orchestrator] The changeset was amended in place, not created.** The plan names a new
   `.changeset/public-endpoint-handler-denial-logged.md`; the pending `.changeset/request-enforced-once.md`
   (`@qadi/http` patch, ARCH-46, after the 0.11.0 tags) already covers "every request path enforces through one
   module", and the orchestrator asked for amend-in-place in that case. Its sentence is the plan's, plus "public
   endpoints included". Task 3's grep was run against that file. No other plan references the planned name.
2. `scripts/spec-revise.mjs` drops its first positional argument when `--date` is absent (`index !== dateFlag + 1`
   with `dateFlag = -1` filters index 0), so the plan's command prints usage. Ran it with `--date 2026-11-10`. Script
   not changed (out of scope); worth a fix in a later plan.
3. The public arm does not `Effect.provide(evaluationServices)` as the `Required` arm does; the plan's form is
   `enforcePublic(answerInChannel, () => httpEffect)` and the handler's nested `guard` already finds its services
   (the RED probe returned 403 on the base).

## Gate results

- Task 1 verify: the two RED cases fail, the outage case and `publicEndpoint × success` pass, `pnpm typecheck` green.
- Task 2 verify: `pnpm vitest run --project http` 287/287; tstyche (RequestEnforcement, RequirePermission, GuardApi)
  19/19; `pnpm typecheck`, `pnpm lint` (house-style 417 files clean, budgets unchanged), `pnpm circular` green; three
  grep baselines as above.
- Task 3 verify: `^## BEH-QD-359` = 1; `enforcePublic` in spec; `"@qadi/http": patch` in the changeset;
  `spec-revise --check` and `pnpm spec:examples` (102 blocks) green.
- `pnpm spec:verify`: 20 pass, 1 expected fail (CCR-QD-399 register row, Plan 13-11).

## Commits

| sha | subject |
|---|---|
| 6d40ea1 | test(13-01): RED — a public endpoint's handler-raised denial is logged once; the matrix gains a publicEndpoint row |
| f125042 | feat(13-01): a public endpoint runs through the request-enforcement module's public mode |
| 3dc0d34 | docs(13-01): BEH-QD-359, BEH-QD-321/335 name the public mode, ADR-QD-108 addendum, changeset |
