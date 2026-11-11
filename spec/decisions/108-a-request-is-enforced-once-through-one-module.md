# ADR-QD-108 — A request is enforced once, through one module

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-108                                   |
> | Revision       | 1.3                                            |
> | Effective Date | 2026-11-08                                     |
> | Status         | Accepted — amends ADR-QD-036; reads ADR-QD-081, ADR-QD-102 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.3 (2026-11-11): noted: guardRoute is gone and GuardRoute.ts holds addGuardedRoute alone (ARCH-75, CCR-QD-417)<br>1.2 (2026-11-10): Addendum — a third mode, `enforcePublic`, serves `RequirePermission`'s public endpoints through the one handler step (ARCH-61, BEH-QD-359, CCR-QD-399)<br>1.1 (2026-11-10): D-46-e superseded: membership is the access plan's, by endpoint value; `endpointMemberKey` is deleted (ARCH-59, ADR-QD-118, CCR-QD-396)<br>1.0 (2026-11-08): Initial (CCR-QD-385)         |

---

## Context

Four callers in `@qadi/http` each ran the same tail after ARCH-19's edge step: `guardRoute`,
the `RequirePermission` middleware, the decision stream's recheck and the port routes. Each
tapped a handler-raised denial into the log, caught the `HTTP_ENFORCEMENT_TAGS` failures and
projected them to its own answer. The endpoint member key (`<group>/<endpoint>`) was spelled
twice, once where `guardApi` registers an endpoint and once where the middleware checks it.

The copies had drifted, and the drift was a live defect: `portRoutesUnguarded` extracted the
subject by hand (`SubjectExtractor.extract(request)`) and answered `toResponse(extracted.failure)`
without calling `logSubjectExtractionFailed`. A credential-store outage behind an unguarded port
route was answered 502 and written nowhere, where every guarded path logs it. The 2026-11-08
architecture review found it (ARCH-46). ADR-QD-036 Rev 1.5 had said "one enforcement path" and
meant the edge step; the surrounding work was still written five times.

## Decision

| Decision | Choice |
| -------- | ------ |
| D-46-a — where the module lives (D-01) | **`packages/http/src/AuthorizeRequest.ts` is extended, not paralleled.** It already owned the edge step and the single `logSubjectExtractionFailed` tap, so the new functions join it rather than a second `RequestEnforcement.ts` that would import it back. `authorizeRequest` is one level below the module's two entry points, and keeps its `Effect.fn("…")` name and its `"edge"` denial tap |
| D-46-b — the interface (D-02) | **Access, a resource loader, and a caller-supplied projection.** `enforceRequest({ permission, policy, loadResource }, projection, handler)` and `enforceSubject(projection, handler)`. The projection is `EnforcementProjection<B, E, R>`, a function from the closed `HttpEnforcementFailure` to an effect. Two are exported and in use: `answerWithResponse` (`toResponse`, for `guardRoute` and the port routes) and `answerInChannel` (`projectHttpEnforcementFailure`, the in-channel wire value, for the middleware). The decision stream's recheck keeps its own, a module-local `endStream`; the module does not know about streams |
| D-46-c — subject-only mode (D-03) | **`enforceSubject`: extract, log an extraction failure through `logSubjectExtractionFailed`, provide `CurrentSubject`, run the handler, apply no policy.** Its one caller is `portRoutesUnguarded`, which is how the defect is fixed. A failed extraction answers through the projection and the handler does not run |
| D-46-d — the handler step (D-04) | **One step owns the handler-denial tap and the failure catch, written once.** It is module-local (`enforced`): `Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler"))` followed by the array form of `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, project)`. No caller repeats either. `catchTags({...})` stays forbidden (AGENTS.md §4) |
| D-46-e — the endpoint member key (D-05) | **`endpointMemberKey` lives in `AuthorizeRequest.ts`, not `GuardApi.ts`.** `GuardApi.ts` value-imports `makeRequirePermission` from `RequirePermissionMiddleware.ts`; the middleware importing the key back from `GuardApi.ts` would be a `GuardApi` ↔ `RequirePermissionMiddleware` cycle, which `pnpm circular` (madge) refuses. `AuthorizeRequest.ts` is already imported by both and imports neither. The key's type is `EndpointMemberKey` (`` `${string}/${string}` ``), so a registry set of hand-built strings no longer typechecks **Superseded by [ADR-QD-118](./118-guardapi-plans-access-from-the-api-value.md) (2026-11-10):** membership is the plan's, by endpoint value; `endpointMemberKey` and `EndpointMemberKey` are deleted, since an API reusing the names passed the string key |
| D-46-f — the regression test goes first (D-06) | **Red on the then-current tree.** `PortRoutes.test.ts` serves `portRoutesUnguarded` with a failing `SubjectExtractor` and asserts the `SubjectExtractionFailed` line is captured, exactly once, and that the port is never read. It failed on the log assertion only (the 502 already held) and went green with the fix, in separate commits |
| D-46-g — one table over the module (D-07) | **`RequestEnforcement.test.ts` is the caller × failure table.** Rows guard, middleware, stream recheck, guarded port, unguarded port; columns extraction failure, edge denial, edge obligation, edge outage, handler denial, success. It is a mapped type over the caller and column lists, so a new caller or column is a compile error, and each not-applicable cell carries its reason. It replaces seven per-route log-only tests in `http.test.ts` and keeps every test of a route's own body shape or redaction |
| D-46-h — the records (D-08) | **This ADR; ADR-QD-036 Rev 1.8; BEH-QD-335 and BEH-QD-336 and the amended BEH-QD-321 in `23-http.md`; the recheck's wording in `26-decision-stream.md`; INV-QD-243; the traceability rows; CCR-QD-385; a patch changeset for `@qadi/http`** |
| D-46-i — the module is not exported (D-09) | **`AuthorizeRequest.ts` leaves the barrel (ADR-QD-099); `authorizeRequest` and `AuthorizedRequest` stay public through named re-exports in `GuardApi.ts`**, the way `NO_RESOURCE` is through `RequirePermission.ts`. The public export set is unchanged (`pnpm spec:api` reports the same count before and after), so `spec/overview.md` gains no row |
| D-46-j — `GuardRoute.ts` survives | **As the bare-`HttpRouter` adapter** (Claude's discretion in CONTEXT). Its body is `enforceRequest(…, answerWithResponse, …)(request)`. The file's doc comment holds the never-error-channel and `CurrentSubject`-exclusion contract that `GuardRoute.tst.ts` pins and the spec cites, and folding it into `addGuardedRoute` would scatter that contract |
| D-46-k — typing | **An overload pair, not a generic handler error.** `enforced` and `enforceRequest` each have a closed-error overload (the handler's error is `HttpEnforcementFailure`, so the catch leaves `never`) and an `… \| unhandled` overload (the middleware's handler error is open). `Effect.catchTag` cannot narrow over an open or constrained type parameter: a single generic signature fails with TS2345 on `Tags<EH>`, measured against `effect@4.1.2` while planning |

ADR-QD-102's tables are untouched. `ENFORCEMENT_ERROR_WIRE`, `HTTP_ENFORCEMENT_TAGS` and
`projectHttpEnforcementFailure` keep their contents; only the place that applies them moved.

> **Note (ARCH-75, 2026-11-11, CCR-QD-417):** `guardRoute` is gone, and D-46-j's file survives
> as the one home of the bare-route path: `addGuardedRoute` in `GuardRoute.ts` calls
> `enforceRequest(..., answerWithResponse, ...)` directly and carries the typing contract
> (BEH-QD-470). The alternative "Folding `GuardRoute.ts`" below is answered
> the other way round: the contract moved onto the exported function instead of losing its home.

## Consequences

- "What happens to a request" has one file to read. Subject extraction and its log, the edge
  decision and its log, `CurrentSubject`, and a handler-raised denial and its log are in
  `AuthorizeRequest.ts`; a caller supplies a projection and a handler.
- A sixth surface, if one is ever added, writes a projection and a handler and cannot forget a
  log, because it never writes the tap. The table in `RequestEnforcement.test.ts` stops
  compiling until the new row exists.
- The unguarded port route now logs a subject-extraction failure at Error, once. That is a
  behaviour change for a deployment's logs (a line that was missing appears) and none for its
  responses. It ships as a patch of `@qadi/http`.
- No export is added or removed, so there is no `spec/overview.md` row and no semver-minor
  consequence.
- `authorizeRequest` is unchanged for a caller outside the package: it is still the one public
  edge step and still registers nothing.

## Alternatives considered

- **A parallel `RequestEnforcement.ts`.** Rejected (D-46-a). `AuthorizeRequest.ts` already owned
  the edge step and the extraction tap, so a second file would import the first and the
  extraction log would have two homes.
- **A generic handler-error parameter.** Does not compile (D-46-k): `Effect.catchTag` over a
  generic `EH` fails with TS2345.
- **The member key in `GuardApi.ts`.** It is the file that registers, so it reads naturally, and
  it makes a cycle with the middleware (D-46-e).
- **Exporting the new functions publicly.** Costly to retract, and a surface this package does not
  ship can already call `authorizeRequest`. ADR-QD-099 prefers internal until a consumer asks.
- **Folding `GuardRoute.ts` into `addGuardedRoute`.** Possible, but the contract in its doc
  comment would lose its home (D-46-j).

> **Addendum 2026-11-10 (CCR-QD-399) — a third mode, for a public endpoint.**
>
> **What changed.** `AuthorizeRequest.ts` gains `enforcePublic(project, handler)`: it runs the
> handler as `anonymous` through `enforced`, the one handler step (D-46-d), extracting no subject
> and applying no policy. `RequirePermission`'s public arm is now
> `enforcePublic(answerInChannel, () => httpEffect)`, and the middleware's refusal no longer
> provides a `CurrentSubject` to an effect that never needed one. The module has three modes.
>
> **Why.** The public arm provided `anonymous` to the handler itself and did nothing else, so a
> denial the handler's own `guard` raised was answered 403 and logged nowhere, and its outage body
> was redacted only by the encoder's excess-property strip, not by `answerInChannel`'s projection.
> Lost ARCH-47 (`b0b9363`) found it and fixed it with a `serveRequest` step; this module supersedes
> that step, so the fix is ported as a mode here rather than as a tap in the middleware. A tap in
> the middleware would be a second copy of the handler step, the duplication D-46-d removed.
>
> **Records.** BEH-QD-359; BEH-QD-321 and BEH-QD-335 amended (`23-http.md` Rev 1.14); a
> `publicEndpoint` row in `RequestEnforcement.test.ts` (D-46-g's table, now six callers); a patch
> changeset for `@qadi/http`. No export is added or removed: the module is package-private.
