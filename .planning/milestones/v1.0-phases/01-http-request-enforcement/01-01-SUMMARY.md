---
phase: 01-http-request-enforcement
plan: 01
subsystem: http
tags: [effect-v4, request-enforcement, subject-extraction, logging, tstyche]
requires: []
provides:
  - request-enforcement module (AuthorizeRequest.ts) with subject-only and guarded modes
  - ENF-03 fix: an unguarded port route logs a subject extraction failure
  - guardRoute routed through the module
affects: [01-02, 01-03, 01-04, 01-05]
status: complete
requirements-completed: [ENF-01, ENF-02, ENF-03, ENF-04, XC-04]
commits: 3
plan_head_before: 8960dae12b1e025e4c13e0595042464079cad9e9
plan_head_after: 37b4c16c07630e15c94f72ba3dab03978e3d264e
actuals:
  tokens: 4900
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns:
    - "overload pair (closed error / error | unhandled) instead of a generic error parameter, to keep Effect.catchTag typable without a cast"
    - "private module, public name: named re-export from GuardApi.ts"
key-files:
  created:
    - packages/http/test/RequestEnforcement.tst.ts
  modified:
    - packages/http/src/AuthorizeRequest.ts
    - packages/http/src/GuardRoute.ts
    - packages/http/src/PortRoutes.ts
    - packages/http/src/GuardApi.ts
    - packages/http/src/index.ts
    - packages/http/test/PortRoutes.test.ts
key-decisions:
  - "GuardRoute.ts survives as the bare-HttpRouter adapter: its doc comment carries the never-error-channel and CurrentSubject-exclusion contract that GuardRoute.tst.ts pins and the spec cites"
  - "authorizeRequest and AuthorizedRequest stay public through named re-exports in GuardApi.ts; the rest of AuthorizeRequest.ts is package-private"
completed: 2026-11-08
---

# Phase 1 Plan 01: Request-enforcement module, tracer and guarded mode Summary

An unguarded port route now logs `qadi/http: subject extraction failed — <reason>` exactly once and never reads the port, because `AuthorizeRequest.ts` is now the request-enforcement module and `portRoutesUnguarded` and `guardRoute` both enforce through it.

## Commits (red then green, for ADR-QD-108)

| Commit | Message |
| ------ | ------- |
| `3748e0b` | test(01-01): an unguarded port route must log a subject extraction failure (ENF-03, red) |
| `99ec0f5` | fix(01-01): an unguarded port route enforces through the module's subject-only mode (ENF-03) |
| `37b4c16` | feat(01-01): the module's guarded mode, and guardRoute enforces through it |

The red test failed on the log assertion only (502 status already held, as the plan predicted). `plan_head_before` is `8960dae`.

## Exact exports added to `packages/http/src/AuthorizeRequest.ts`

All package-private (the file left the barrel, ADR-QD-099):

- `type EnforcementProjection<B, E, R>`
- `const answerWithResponse` (the `toResponse` projection)
- `function enforceSubject` (subject-only mode, no policy)
- `interface RequestAccess<P, A, LR>`
- `function enforceRequest` (guarded mode, two overloads)

Module-local, not exported: `extractSubject` (the single `tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)` in the package) and `enforced` (the one handler step: handler-denial tap annotated `"handler"` plus the single `catchTag(HTTP_ENFORCEMENT_TAGS, project)`).
`authorizeRequest` keeps its `Effect.fn` name and its `"edge"` denial tap, and now calls `extractSubject`. Still public: `authorizeRequest`, `AuthorizedRequest`.

## Decisions

- **GuardRoute.ts survives** as the bare-`HttpRouter` adapter. Its signature and declared return type are unchanged; its body is `enforceRequest({ permission, policy, loadResource }, answerWithResponse, ...)(request)`. Reason: the file's doc comment holds the `never`-error-channel and `CurrentSubject`-exclusion contract that `GuardRoute.tst.ts` pins and the spec cites.
- **GuardApi.ts re-export choice:** `export { authorizeRequest }` and `export type { AuthorizedRequest }` from `./AuthorizeRequest.ts`, placed in `GuardApi.ts` because its `guardApi` doc already points a surface this package does not ship at `authorizeRequest`. `pnpm spec:api` still reports 862 exports, so the public set is unchanged. The overview's Source-column prose is deferred to Plan 05 as planned.
- **Overload pair, not a generic handler-error parameter** in `enforced` and `enforceRequest` (doc comments cite the TS2345 measured in planning).

## Verification

- `pnpm vitest run --project http`: 10 files, 228 tests pass (includes the new regression test).
- `pnpm exec tstyche` on RequestEnforcement, GuardRoute and AuthorizeRequest `.tst.ts`: 3 files, 11 tests pass; GuardRoute.tst.ts and AuthorizeRequest.tst.ts unedited.
- `pnpm typecheck`, `pnpm circular`, `pnpm spec:api` green. `pnpm lint`: house-style clean; oxlint prints 64 pre-existing warnings, none in `packages/http`.
- All grep gates from both tasks hold: direct `SubjectExtractor.extract(` outside the module 1 to 0; barrel star line 1 to 0; `catchTag(HTTP_ENFORCEMENT_TAGS` in the module exactly 1; extraction-failure taps exactly 1; handler-denial tap or projection catch in GuardRoute.ts 2 to 0; direct `authorizeRequest(` call in GuardRoute.ts 1 to 0.

## Deviations from Plan

None - plan executed exactly as written. Small within-scope choices: `GuardRoute.ts` now imports `Effect` and `HttpServerResponse` as type-only (they became type-only uses), and `CurrentSubject` joins the single `@qadi/core` type import.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or schema surface; T-01-01 to T-01-04 mitigations are in place (single extraction log, handler runs only after successful extraction with an empty-calls assertion, projections stay caller-supplied, public export set unchanged).

## Self-Check: PASSED

- FOUND: packages/http/test/RequestEnforcement.tst.ts
- FOUND commits 3748e0b, 99ec0f5, 37b4c16 (ancestors of HEAD)
