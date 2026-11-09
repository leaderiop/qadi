---
phase: 07-port-route-address
plan: 01
subsystem: http-port-routes
tags: [http, port-routes, remote-ports, address, refactor, effect-v4]
status: complete

requires:
  - phase: 01
    provides: "portRoutesUnguarded routed through enforceSubject (ARCH-46), the precondition of this plan"
provides:
  - "PortRouteAddress.ts: PORT_ROUTE_PREFIX and portPath, the one definition of a port route's address"
  - "The reply-body contract (whatever the status) stated beside the address and cited by both adapters"
  - "Round-trip test of both route forms, every port, under a non-default prefix, with controls"
affects: [07-02 records plan (spec rows, traceability, CCR-QD-391, changeset), 07-03 reconcile]

actuals:
  tokens: 3600
  tasks: 2
  commits: 4
plan_head_before: 1cb87a31ef394f3f9e8ffd275e69de0238fcd324
plan_head_after: db3526b4d21c5047802ecf0f3214102b0556f188

tech-stack:
  added: []
  patterns:
    - "Characterization test committed green on the pre-refactor tree before the refactor (D-04)"
    - "A shared leaf module states a cross-adapter contract so neither adapter imports the other"

key-files:
  created:
    - packages/http/src/PortRouteAddress.ts
  modified:
    - packages/http/src/PortRoutes.ts
    - packages/http/src/RemotePorts.ts
    - packages/http/test/PortRoutes.test.ts

key-decisions:
  - "The address lives in a leaf module, PortRouteAddress.ts, not in PortRoutes.ts. madge would allow either, but RemotePorts.ts is the client half a browser bundles, and importing PortRoutes.ts would pull HttpRouter, the permission registry and the request-enforcement module into the client. A leaf both import states the shared contract with neither side depending on the other."
  - "portPath's signature is tightened from D-01's string to the template-literal types (`/${string}` in, `/${string}` out) that both options interfaces and HttpRouter.PathInput use, so no call site needs a cast."
  - "PORT_REPLY_STATUS and REFUSAL_STATUS stay in PortRoutes.ts and only the contract prose moved to PortRouteAddress.ts. The table is the server's half, the client never reads a status, and moving it would need a named re-export to keep @qadi/http's export set unchanged."
  - "PortRouteAddress.ts is kept out of the barrel (ADR-QD-099); pnpm spec:api is unchanged at 862 exports."

requirements-completed: [ADDR-01, ADDR-02, ADDR-03, XC-04]

coverage:
  - id: D1
    description: "Both adapters build every port path through portPath; the default prefix is spelled once in packages/http/src outside comments"
    requirement: "ADDR-01"
    verification:
      - kind: command
        ref: "grep gates in 07-01-PLAN Task 1 verify (one non-comment /__ports line, in PortRouteAddress.ts; no DEFAULT_PREFIX; no inline path template)"
        status: pass
      - kind: unit
        ref: "packages/http/test/PortRoutes.test.ts#the address (ARCH-52)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The reply-body contract is stated beside the address and both adapters reference it by name"
    requirement: "ADDR-02"
    verification:
      - kind: unit
        ref: "packages/http/test/PortRoutes.test.ts#the client reads the reply from the body, whatever the status (ARCH-52)"
        status: pass
      - kind: command
        ref: "grep gates in 07-01-PLAN Task 2 verify"
        status: pass
    human_judgment: false
  - id: D3
    description: "A host mounting either route form under /x/ports, with remotePortsLayer on the same prefix, is answered for every port; a mismatched client fails closed"
    requirement: "ADDR-03"
    verification:
      - kind: unit
        ref: "packages/http/test/PortRoutes.test.ts#one address on both sides (ARCH-52)"
        status: pass
    human_judgment: false
---

# Phase 7 Plan 01: One port route address Summary

**The server and client adapters for remote ports now build every route path through one leaf module, `PortRouteAddress.ts`, which also states the contract that a client reads the reply from the body whatever the HTTP status; a round trip under `/x/ports` proves both forms and all five ports.**

## Accomplishments

- `PortRouteAddress.ts` exports `PORT_ROUTE_PREFIX = "/__ports"` and `portPath(prefix, port)`. `PortRoutes.ts` (both forms) and `RemotePorts.ts` use `portPath`; both `DEFAULT_PREFIX` constants, `pathOf` and both inline path templates are gone. The string `/__ports` now appears once in `packages/http/src` outside comments.
- The client does not import the server module, and the leaf is not in the barrel. `@qadi/http`'s export set is unchanged (`pnpm spec:api`: 862 exports).
- The reply-body contract (POST with a JSON question, `PortWireReply` as the body under every status, the client never reads an answer from a status, a non-reply body is the port's own error) is stated in the `PortRouteAddress.ts` module doc. `PORT_REPLY_STATUS`'s doc points to it, and `RemotePorts.ts` names both and carries a comment at the decode step that the status is deliberately not checked. No behavior changed.
- The `ADR-QD-NEXT` placeholder is replaced with `ADR-QD-107` in the three files named by the plan (`PortRoutes.ts`, `RemotePorts.ts`, `PortRoutes.test.ts`).

## Tests added (exact `describe` titles, for Plans 02 and 03)

In `packages/http/test/PortRoutes.test.ts`:

- `describe("one address on both sides (ARCH-52)")`, with, for each of `guarded` and `unguarded`:
  - `${form}: every port answers under /x/ports, asked by a client on the same prefix`
  - `${form}: the routes are at /x/ports and nowhere else`
  - `${form}: a client left on the default prefix gets the port's own error, never an answer`
  - plus `guarded: a subject without the permission is still denied under the prefix`
- `describe("the address (ARCH-52)")`: `the default prefix is /__ports and a path is <prefix>/<PortName>`
- `describe("the client reads the reply from the body, whatever the status (ARCH-52)")`:
  - `an answer under a 503 is still read as the answer`
  - `a refusal under a 200 is still the port's own error, never an answer`
  - `a proxy's HTML page under a 502 is the port's own error, never an answer`

The file went from 49 tests to 60, all green; the whole `http` project is 268 green.

## Failure kind of the proxy-page case

The proxy's HTML 502 page surfaced as the port's own error whose rendered form includes `Transport` (a `RemotePortFailure.Transport`, from the JSON parse failure of `response.json` going through `Effect.mapError(transport)`), as the plan expected.

## Commits

| Task | Commit | Type |
| ---- | ------ | ---- |
| 1 (characterization, committed first, green on the pre-refactor tree) | 5834368 | test(07-01) |
| 1 (leaf, both adapters, address unit test) | 393b37b | refactor(07-01) |
| 2 (three status-contract cases) | ca0d940 | test(07-01) |
| 2 (comment-only contract pointers) | db3526b | docs(07-01) |

## Deviations from Plan

None - plan executed exactly as written.

The task 1 `<precondition>` (`enforceSubject` present in `PortRoutes.ts`) was met. The address unit test was added in the refactor commit rather than the characterization commit, because it imports the module that did not yet exist.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. No new network endpoint, auth path or schema; the threat register's T-07-01..T-07-04 mitigations are covered by the added tests and `pnpm spec:api`.

## Issues Encountered

None. `pnpm lint` reports only pre-existing warnings in unrelated files.

## Verification

Plan-level `<verification>` re-run at the end: `pnpm vitest run --project http` (268 green), `pnpm typecheck`, `pnpm lint` (house-style: 406 files clean), `pnpm circular` (no cycle), `pnpm spec:api` (862 exports), and the grep gates of both tasks all pass.

## Self-Check: PASSED

- FOUND: packages/http/src/PortRouteAddress.ts
- FOUND commits: 5834368, 393b37b, ca0d940, db3526b (all ancestors of HEAD)
