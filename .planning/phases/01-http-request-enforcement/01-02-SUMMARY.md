---
phase: 01-http-request-enforcement
plan: 02
subsystem: http
tags: [effect-v4, request-enforcement, httpapi-middleware, decision-stream, madge]
requires:
  - phase: 01-http-request-enforcement
    provides: "request-enforcement module (AuthorizeRequest.ts) with enforceRequest, EnforcementProjection, answerWithResponse (plan 01)"
provides:
  - "endpointMemberKey and EndpointMemberKey: the one place <group>/<endpoint> is spelled"
  - "answerInChannel: the HttpApi projection"
  - "RequirePermission's middleware enforcing through enforceRequest"
  - "decision stream recheck enforcing through enforceRequest with its own endStream projection"
affects: [01-03, 01-04, 01-05]
status: complete
requirements-completed: [ENF-01, ENF-04, ENF-05, XC-04]
commits: 3
plan_head_before: e185922ab175bc0261272e8ff05d55036132f572
plan_head_after: b15fc28df84bc230d0fa2103b16cf69b294ff5f0
actuals:
  tokens: 5000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns:
    - "a surface supplies only its projection; the module owns the handler-denial tap and the HTTP_ENFORCEMENT_TAGS catch"
    - "a key both a registrar and a checker need lives in the module both already import, to stay out of a madge cycle"
key-files:
  created: []
  modified:
    - packages/http/src/AuthorizeRequest.ts
    - packages/http/src/GuardApi.ts
    - packages/http/src/RequirePermissionMiddleware.ts
    - packages/http/src/DecisionStreamRoute.ts
    - packages/http/src/DenialLog.ts
    - packages/http/test/endpointAccess.test.ts
key-decisions:
  - "endpointMemberKey lives in AuthorizeRequest.ts, not GuardApi.ts: GuardApi.ts value-imports makeRequirePermission from RequirePermissionMiddleware.ts, so the middleware importing the key from GuardApi.ts would be a GuardApi <-> RequirePermissionMiddleware cycle that pnpm circular (madge) refuses; both files already import AuthorizeRequest.ts (D-05, to be recorded in ADR-QD-108)"
  - "The middleware's error type is unchanged and no cast was needed: httpEffect's error carries unhandled, so enforceRequest's second overload returns the projected wire union plus unhandled"
  - "The recheck's projection is a module-local endStream, the third projection beside answerWithResponse and answerInChannel (D-02)"
completed: 2026-11-08
---

# Phase 1 Plan 02: Remaining callers enter the request-enforcement module Summary

`RequirePermission`'s middleware and the decision stream's recheck now enforce through `enforceRequest`, each supplying only its projection, and `<group>/<endpoint>` is built by the single function `endpointMemberKey`.

## Commits

| Commit | Message |
| ------ | ------- |
| `b0a8e43` | refactor(01-02): the endpoint member key is built by one function (ENF-05) |
| `613217e` | refactor(01-02): RequirePermission's middleware enforces through the request-enforcement module (ENF-01, ENF-04) |
| `b15fc28` | refactor(01-02): the decision stream's recheck runs through the module with its own projection (ENF-01) |

All three tasks were refactors under existing coverage (the plan's tests stay green, no new behavior), so there is no separate red commit.

## Final exports added to `packages/http/src/AuthorizeRequest.ts` by this plan

All package-private (the file is out of the barrel, ADR-QD-099):

- `type EndpointMemberKey` (`${string}/${string}`)
- `const endpointMemberKey(group, endpoint)`
- `const answerInChannel: EnforcementProjection<never, ReturnType<typeof projectHttpEnforcementFailure>, never>`

The module's full package-private set after plans 01 and 02: `EnforcementProjection`, `answerWithResponse`, `answerInChannel`, `enforceSubject`, `RequestAccess`, `enforceRequest`, `EndpointMemberKey`, `endpointMemberKey`. Still public through `GuardApi.ts`: `authorizeRequest`, `AuthorizedRequest`. `pnpm spec:api` still reports 862 exports.

## Why `endpointMemberKey` is in AuthorizeRequest.ts

`GuardApi.ts` value-imports `makeRequirePermission` from `RequirePermissionMiddleware.ts`. Putting the key in `GuardApi.ts` would make the middleware import it back from there, a cycle `pnpm circular` refuses. `AuthorizeRequest.ts` is already imported by both and imports neither. `pnpm circular` passed on the final tree.

## Verification

- `pnpm vitest run --project http`: 10 files, 228 tests pass, no existing test assertion edited.
- tstyche over `GuardApi`, `QadiHttpError`, `RequestEnforcement`, `RequirePermission` and `DecisionStreamRoute` type tests: all pass, unedited.
- `pnpm typecheck`, `pnpm lint` (house-style clean; the oxlint warnings are pre-existing and outside `packages/http`), `pnpm circular`, `pnpm spec:api` green.
- Criterion 4 gate: non-comment lines building the key in `packages/http/src`: 2 to 1, in `AuthorizeRequest.ts`.
- Criterion 2 gates: non-comment handler-denial taps or `HTTP_ENFORCEMENT_TAGS` catches outside `AuthorizeRequest.ts`: 4 to 0 (GuardRoute.ts's 2 went in plan 01, RequirePermissionMiddleware.ts's 2 here). Direct `authorizeRequest(` calls in `DecisionStreamRoute.ts`, `RequirePermissionMiddleware.ts`, `GuardRoute.ts`, `PortRoutes.ts`: 0.
- `RequirePermissionMiddleware.ts` non-comment lines tapping, catching or calling `authorizeRequest(`: 3 to 0.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `endpointAccess.test.ts` built the key by hand against a now-typed set**
- **Found during:** Task 1 (`pnpm typecheck`)
- **Issue:** The `memberKeys` helper at `packages/http/test/endpointAccess.test.ts:87` builds a `ReadonlySet<string>` and passes it to `makeRequirePermission`, which now takes `ReadonlySet<EndpointMemberKey>` (TS2345). The plan listed only src files, but typecheck is part of Task 1's verify.
- **Fix:** The helper now uses `endpointMemberKey` and a `ReadonlySet<EndpointMemberKey>`. No assertion changed. This also makes the test spell the key through the one function.
- **Files modified:** `packages/http/test/endpointAccess.test.ts`
- **Commit:** `b0a8e43`

Other than that, the plan was executed as written. Within-scope choices: `RequirePermissionMiddleware.ts`'s module doc no longer says "moved verbatim ... including `enforce`'s handler-denial log", since that log is now the module's; the `enforce` comment was rewritten as the plan directed.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema surface. T-01-05 to T-01-08 mitigations hold: one function produces both the registered and the checked key (GuardApi "outside its API" 500 test green); `answerInChannel` uses the unchanged `projectHttpEnforcementFailure` (the "no `trace` key" test and `RequirePermissionClient.test.ts` green); the handler-denial log is the module's one tap (edge and handler `qadi.denial_site` tests green); the recheck still runs the full edge step per interval and ends the stream on any failure (`reauth` tests green, no `Effect.orDie`).

## Self-Check: PASSED

- FOUND: packages/http/src/AuthorizeRequest.ts (exports `endpointMemberKey`, `answerInChannel`)
- FOUND commits b0a8e43, 613217e, b15fc28 (ancestors of HEAD)
