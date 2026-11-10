---
phase: 11-lost-wave-security
plan: 02
subsystem: http
tags: [security, guardApi, access-plan, test-first, lost-wave-port]

requires: ["11-01"]
provides:
  - "`planApi` (package-private `packages/http/src/AccessPlan.ts`): a closed access plan keyed by the group/endpoint values `HttpApi.reflect` yields (SEC-05)"
  - "The `RequirePermission` middleware only looks an endpoint up in the plan; not in it -> 500 and the membership log line (SEC-05)"
  - "`AccessNotDeclared`, the third `ApiGuardRefusal` member; precedence misplaced > unattached > undeclared"
  - "`guardApi(P)` on `layer(P)` with `P = ApiA.prefix(\"/v1\")` lists exactly `GET /v1/a` (SEC-06)"
  - "Phase-base http mutation scores (`11-mutation-base-http.json`)"
affects: [11-04, 11-06, 11-07]

actuals:
  tokens: 90000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns: ["membership by value identity (`Map<HttpApiGroup.Top, Map<HttpApiEndpoint.Top, PlannedAccess>>`), not by name string"]

key-files:
  created:
    - packages/http/src/AccessPlan.ts
    - packages/http/test/accessPlan.test.ts
    - .planning/phases/11-lost-wave-security/11-mutation-base-http.json
  modified:
    - packages/http/src/GuardApi.ts
    - packages/http/src/RequirePermissionMiddleware.ts
    - packages/http/src/AuthorizeRequest.ts
    - packages/http/src/PermissionRegistry.ts
    - packages/http/test/GuardApi.test.ts
    - packages/http/test/GuardApi.tst.ts
    - packages/http/test/http.test.ts
  deleted:
    - packages/http/test/endpointAccess.test.ts (renamed to accessPlan.test.ts)

key-decisions:
  - "D-49-a (A), per D-02: plan keyed by the group/endpoint values; premise moved two-way (merged ARCH-46 centralised the string key in AuthorizeRequest.ts, package-private), so D-03 deletes it"
  - "D-49-b (A), per D-02: an undeclared endpoint is refused at build with AccessNotDeclared (Breaking vs 0.11.0; changeset is 11-07)"
  - "D-49-d (A), per D-02: package-private AccessPlan.ts; the refusal classes live there; enforceRequest/answerInChannel stay in AuthorizeRequest.ts"
  - "D-49-c deferred to 11-04 as planned: the readers stay exported from RequirePermission.ts and AccessPlan.ts imports them"
  - "No checkpoint:decision in this plan; _DECISIONS.md has no row for 11-02"

requirements-completed: []

coverage:
  - id: D1
    description: "Six API values reusing ApiA's names, served with guardApi(ApiA): 500 x3, three membership log lines, registry lists only GET /a"
    requirement: SEC-05
    verification:
      - kind: test
        ref: "GuardApi.test.ts > the plan is the API value it was built from (6 rows)"
        status: pass
    human_judgment: false
  - id: D2
    description: "guardApi(P) on layer(P), P = ApiA.prefix('/v1'): reader 204 at /v1/a, anonymous refused, registry lists exactly GET /v1/a"
    requirement: SEC-06
    verification:
      - kind: test
        ref: "GuardApi.test.ts > guardApi(P) on the layer serving P = ApiA.prefix('/v1') …"
        status: pass
    human_judgment: false
  - id: D3
    description: "Undeclared endpoint fails the build with AccessNotDeclared(group, endpoint), registers nothing; precedence misplaced > unattached > undeclared"
    requirement: SEC-05
    verification:
      - kind: test
        ref: "GuardApi.test.ts (2 tests), http.test.ts build-time test, accessPlan.test.ts, GuardApi.tst.ts exact union"
        status: pass
    human_judgment: false
---

# Phase 11 Plan 02: guardApi builds a closed access plan; the middleware looks up by identity — Summary

`guardApi(api)` now plans the API *value* it was given (`planApi`, package-private `AccessPlan.ts`), registers from
that plan and hands the middleware the same plan. The middleware only calls `plan.accessOf(group, endpoint)` with
the group/endpoint objects Effect hands it: not in the plan -> 500 and one membership log line. An API value that
reuses a vetted API's group and endpoint names can no longer be served with its own declarations. An undeclared
endpoint fails the build (`AccessNotDeclared`) rather than answering 500 per request. Ported from lost commit
`2ea89d6` onto merged ARCH-46's `AuthorizeRequest.ts` (D-03): `enforceRequest`/`answerInChannel` stay, only the
string membership (`endpointMemberKey`/`EndpointMemberKey`) is deleted.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (RED) | `8bfb81d` | test(11-02): pin an unvetted API value reusing guardApi's names, and the undeclared build refusal (RED) |
| 2 | `1b6c685` | fix(11-02): guardApi plans its API value; the middleware looks an endpoint up by identity |
| 3 | `6c9e022` | test(11-02): decide every placement through guardApi; an undeclared endpoint fails the build |
| XC-05 | `1fcffb8` | test(11-02): hold the touched files' mutation scores at or above the phase base |

## XC-06 evidence: RED on the phase base (`8bfb81d`, `src/` untouched)

Each row is served by `HttpApiBuilder.layer(<it>)` with `guardApi(ApiA)` provided; requests are anonymous, reader,
writer. Expected after the fix: `[500, 500, 500]`, three membership log lines, registry lists only `GET /a`.

| Case (reuses group "a", endpoint "read") | Base answered | Base log |
|------|---------------|----------|
| `Same` (identical declaration, `GET /a`) | `[403, 204, 403]`, served | none |
| `SamePublic` (B1, `publicEndpoint`) | `[204, 204, 204]`, served to anyone | none |
| `SameWrite` (B2, needs write) | `[403, 403, 204]`, writer served, registry lists only A's `GET /a` | none |
| `SameMisplacedGroup` (group carries `RequiredPermission`) | `[500, 500, 500]` | the misplaced-group line, not the membership line |
| `SameApiDeclared` (B4, API-level requirement over a public endpoint) | `[204, 204, 204]`, requirement ignored | none |
| `SamePrefixed` (`ApiA.prefix("/v1")`, the CONTEXT's prefix probe) | `[403, 204, 403]`: `/v1/a` served to the reader while the registry lists `GET /a` | none |
| undeclared endpoint, `guardApi` build | built (`expected false to be true` on `isFailure`) | - |

Passed on the base, as expected: the `guardApi(P)` prefix pin (it pins the correct wiring, not the regression) and
the precedence test (misplaced > unattached held on the base; undeclared was not yet a build refusal, so its rows
resolve the same). The `GuardApi.tst.ts` exact-union test failed to compile on the base (no `AccessNotDeclared`).

## Module split

- `AccessPlan.ts` (new, package-private, not in `src/index.ts`): `RequirePermissionNotAttached` and
  `MisplacedAccessDeclaration` (moved byte-identical), `AccessNotDeclared` (new), `ApiGuardRefusal` (closed union of
  the three, written out), `PlannedAccess`, `AccessPlan { registrations; accessOf }`, `planApi(api): Result<AccessPlan,
  ApiGuardRefusal>`. Dispatch is `Match.valueTags`; no `switch`, `as`, `!` (XC-04). It imports `endpointAccess`,
  `EndpointAccess`, `misplacedDeclarations`, `AccessDeclarationKey` from `RequirePermission.ts` (11-04 moves them in).
- `GuardApi.ts`: `walkApi`/`WalkedApi` and the two classes gone; re-exports the three classes and `ApiGuardRefusal`
  from `AccessPlan.ts`, so the barrel's public names are unchanged plus `AccessNotDeclared`. `guardApi` = `planApi`
  -> fail, or register `plan.registrations` and `makeRequirePermission(plan)`.
- `RequirePermissionMiddleware.ts`: `makeRequirePermission(plan: AccessPlan)`; the body is one lookup. The
  misplaced-group and `Undeclared` request-time branches are gone (the plan refuses both at build). The membership
  message is byte-identical (pinned by `GuardApi.test.ts`).
- `AuthorizeRequest.ts`: `EndpointMemberKey`, `endpointMemberKey` and their doc comment deleted; nothing else.
- `PermissionRegistry.ts`: two comments say `guardApi` registers its plan, not that it "walks".

## Baselines (measured with `/usr/bin/grep` / `git grep` on `5736c96` -> now)

| Measure | Base | Now |
|---------|------|-----|
| `identifier}/${` in `packages/http/src` | 1 | 0 |
| files in `packages/http/src` naming `endpointMemberKey`/`EndpointMemberKey` | 3 (plan said 4) | 0 |
| `endpointAccess(`/`misplacedDeclarations(` in `RequirePermissionMiddleware.ts` | 2 | 0 |
| test files naming `makeRequirePermission`/`endpointMemberKey` | 1 (plan said 2) | 0 |
| `forgotten` in `http.test.ts` | 5 | 3 (the build-time test only) |

## Gate results

- Task 1 verify (mutation base JSON written, greps, `!` RED run): pass on `8bfb81d`.
- Task 2 verify (`GuardApi.test.ts` 15/15, the four greps, `AccessPlan` not in the barrel): pass. `tsc -b` http and
  `pnpm circular` 0.
- Task 3 verify: `pnpm vitest run --project http` 283/283; `pnpm exec tstyche packages/http/test` 39/39;
  `pnpm typecheck` 0; `pnpm lint` 0 (house-style clean, budgets unchanged); `pnpm circular` no cycle.
- XC-05 (`stryker.http.mjs`, phase base -> after): `GuardApi.ts` 84.8% -> 100%, `RequirePermissionMiddleware.ts`
  96.8% -> 100%, `AuthorizeRequest.ts` 84.2% -> 88.9%, `PermissionRegistry.ts` 100% -> 100%, `AccessPlan.ts` (new)
  100%. Package 94.79 -> 97.72. No touched file dropped.
- **Not run by design:** `pnpm spec:api` (gate 13). `AccessNotDeclared` is a new public export with no
  `spec/overview.md` row yet; that row is 11-06's (the only plan editing `spec/`), so gate 13 is red between this
  plan and 11-06.

## SEC-06: what holds, and the accepted residual

Every served path is listed and every listed path is enforced wherever it is served: an endpoint value not in the plan
answers 500, so nothing is served that the registry does not list. The correct prefix wiring, `guardApi(P)` on
`layer(P)`, lists exactly `GET /v1/a`. The mis-wired prefix (`guardApi(ApiA)` on `layer(ApiA.prefix("/v1"))`) fails
closed with a 500 on `/v1/a` (the `SamePrefixed` row), but the registry still lists `GET /a`, which that wiring does
not mount: registration happens when `guardApi`'s layer is built, from the value it was given, and `HttpApiBuilder`
resolves the middleware per request, never telling it at build time which API value it serves. That is the ARCH-36
accepted residual; REQUIREMENTS.md's amended SEC-06 already states it.

## Deviations from Plan

1. **[Rule 1 - Bug] Over-deletion while editing `http.test.ts`** (caught by the run before commit): removing the
   second `forgotten` test also removed the `ProbeLayer` fixtures and a `describe` header; restored from `HEAD`
   before committing. No committed state had it.
2. **[Rule 3 - Blocking] The build-time test in `http.test.ts` needed `HttpRouter.layer`** (`Layer.build` of the
   stack outside `toWebHandler` leaves `HttpRouter` unmet, TS2375); provided it in the test.
3. **XC-05 hold (extra commit `1fcffb8`).** The first after-run dropped `GuardApi.ts` 84.8% -> 66.7% and
   `AuthorizeRequest.ts` 84.2% -> 83.3% (killed mutants moved out or deleted; survivors unchanged). Fixed by tests,
   not by weakening: full-message pins for `RequirePermissionNotAttached` and `MisplacedAccessDeclaration`, a test that
   an endpoint carrying only another middleware is refused (kills `m.key === RequirePermission.key` -> `true`), and a
   `qadi.http.enforceRequest` span pin; `guardApi` registers with a plain `for` loop instead of
   `Effect.forEach(…, { discard: true })` (two equivalent survivors gone).
4. **Precedence test added in Task 1** (ported from `2ea89d6`), as the must_haves name the precedence; it passes on
   the base and pins the order.
5. A lost-wave id (`ARCH-49`) in the ported `accessPlan.test.ts` header was rewritten to `ARCH-59` (shared context:
   lost ids are never new).
6. Baseline counts differ from the plan's (`endpointMemberKey` files 3 not 4; private-import test files 1 not 2);
   both reach 0.

## Threat Flags

None new. T-11-04 (elevation via name-string membership) mitigated by Task 2 and pinned by Task 1's six rows; T-11-05
(undeclared at request time) by `AccessNotDeclared` at build; T-11-06 (registry/served mismatch) by one plan feeding
both, residual stated above; T-11-07 (identity breaks a correct wiring) refuted by the still-green "served through
it is enforced" and "two APIs, each given its own guardApi" tests and the `guardApi(P)` pin.

## Notes for next plans

- 11-04: `examples/http-advanced/server.ts` still says an undeclared endpoint answers "500 + log"; README and website
  page likewise. `endpointAccess`/`EndpointAccess`/`misplacedDeclarations` are still barrel exports and
  `accessPlan.test.ts`'s "endpointAccess: the reader" describe imports them from `../src/index.ts`.
- 11-06: `spec/` still names `endpointMemberKey` (invariants, ADR-QD-108's D-46-e row, README, 23-http) and
  `endpointAccess.test.ts` (invariants, traceability, README); `spec/overview.md` needs the `AccessNotDeclared` row
  (gate 13).
- 11-07: changeset for `AccessNotDeclared` (Breaking: undeclared now fails the build).
- `reports/mutation-http/mutation.json` now holds the after-run; the base is in `11-mutation-base-http.json`.
