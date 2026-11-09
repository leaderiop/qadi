---
phase: 01-http-request-enforcement
reviewed: 2026-11-08T03:30:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - packages/http/src/AuthorizeRequest.ts
  - packages/http/src/DecisionStreamRoute.ts
  - packages/http/src/DenialLog.ts
  - packages/http/src/GuardApi.ts
  - packages/http/src/GuardRoute.ts
  - packages/http/src/index.ts
  - packages/http/src/PortRoutes.ts
  - packages/http/src/RequirePermissionMiddleware.ts
  - packages/http/test/endpointAccess.test.ts
  - packages/http/test/http.test.ts
  - packages/http/test/PortRoutes.test.ts
  - packages/http/test/RequestEnforcement.test.ts
  - packages/http/test/RequestEnforcement.tst.ts
findings:
  critical: 0
  warning: 3
  info: 4
  total: 7
  necessity: 0
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

The refactor is sound. I found no path that fails open, and none that turns an enforcement failure into a defect.

- **Fail-closed:** the handler in `enforced` is built inside `Effect.flatMap` over the edge, so it runs only after the edge succeeds. `enforceSubject` never runs its handler when extraction fails.
- **Logging:** every extraction failure now goes through the single `extractSubject` tap. That fixes the live defect: `portRoutesUnguarded` used to drop the line.
- **Handler step:** the denial tap sits on the handler's effect only, so there is no double log. The `catchTag` uses the array form.
- **No casts:** no `as`, `any` or `!` in the new code, and the house-style gate passes.
- **Verified locally:** the focused vitest files all pass (124 tests). `tstyche` on `packages/http` passes, `tsc -b` is clean, `check-house-style`, `check-api-surface` and `madge --circular` are clean.

The three warnings are not regressions from this phase's logic. They are about what the new test table does not actually pin, and about one silent-failure class the new module now owns and leaves untouched.

On the removed per-route log tests, I checked each against `RequestEnforcement.test.ts`:

| Removed test | Restated by | Notes |
| --- | --- | --- |
| Bare-route denial, one line | `guard × edgeDenial` | The old test used a `HasAttribute` policy; the table uses `HasPermission`. See the note below. |
| Bare-route extraction failure | `guard × extractionFailure` | Equivalent. |
| Middleware extraction failure | `middleware × extractionFailure` | Equivalent. |
| Handler-raised denial (middleware) | `middleware × handlerDenial` | Equivalent. |
| Handler-raised denial (bare route) | `guard × handlerDenial` | Equivalent. |
| Denial-site annotation | `site` is asserted per row | Equivalent. |
| Edge denial still logged once | `middleware × edgeDenial` | Equivalent. |

The `HasAttribute` versus `HasPermission` difference is immaterial. `logDenial` interpolates `error.reason` and does not branch on the policy. The reason text is covered in `QadiHttpError.test.ts:162,177` and `core/test/Evaluate.test.ts`.

What was lost is the "no other line" strength of the old assertions; see WR-02.

## Warnings

### WR-01: A resolver outage at the edge, or raised from a handler's own `guard`, returns 5xx with no log line from this module

**File:** `packages/http/src/AuthorizeRequest.ts:126-128,170,209` and `packages/http/test/RequestEnforcement.test.ts:151,161,169`
**Issue:**
- The module logs exactly two things: an extraction failure (`extractSubject`) and a denial (`logDenialAt`, over `ENFORCEMENT_DENIAL_TAGS`, which is only `AccessDenied` and `UndischargedObligation`).
- Every other tag in `HTTP_ENFORCEMENT_TAGS` is projected to a status with no line. These include `AttributeResolveError`, `RelationshipResolveError`, `DecisionHistoryUnavailable`, `SignatureHistoryUnavailable` and `PolicyTooDeep`. This holds for `guard`, `middleware` and both port forms, at the edge and from a handler's nested `guard`.
- `streamRecheck × edgeOutage` does log, through `endStream`. So the same outage is silent at connect time and logged on recheck. That inconsistency exists only because the stream owns its own projection.
- The module doc claims it owns "the edge decision and its log" and calls itself the single place a failure is logged once. The table then pins the silence as expected: `edgeOutage: expectCell(502)` has zero lines. The `enforcementLines` prefix filter also means the test cannot tell "no line" from "a line with another prefix".
- The silence is pre-existing and documented ("A resolver outage logs nothing at the edge"). But this phase centralised the chain and had the chance to make the outage class loggable once. Core's `logWarning` calls do not cover these routes.
- Core's `Evaluate` may emit `logDebug`. I did not verify whether that line carries enough to diagnose an outage.

**Fix:** Either log the non-denial tags once in the handler/edge step, with the tag and the class, or record explicitly (ADR-QD-108 and BEH) that outage observability is the tracer's job. If you log them, add a table column `handlerOutage` and change `edgeOutage` to expect a line. Sketch:

```ts
const logOutage = (error: HttpEnforcementFailure) =>
  Effect.logError(`qadi/http: enforcement unavailable (${error._tag}, ${classifyHttpEnforcementFailure(error)})`);
// in authorizeRequest's Effect.fn tail and in `enforced`'s handler pipe:
Effect.tapErrorTag(ENFORCEMENT_OUTAGE_TAGS, logOutage)
```

### WR-02: The new table weakens "exactly one line, nothing else" compared with the tests it replaced

**File:** `packages/http/test/RequestEnforcement.test.ts:276-288`
**Issue:**
- The removed tests in `http.test.ts` collected every log message and `deepStrictEqual`ed the whole list. That was how they proved "logged once".
- `enforcementLines` now keeps only lines starting with one of three prefixes before comparing. A duplicated line with a different message (a handler-denial line reworded, a second `Error` from a defect cause, an outage line) passes silently.
- Only a verbatim duplicate or a reworded prefix match is caught. The header claims a "doubled line fails here" and that "a regressed log" fails. That holds only for the three exact prefixes.

**Fix:** Filter out only the known noise (the construction-time unguarded `Warn`, the stream's refused-frame warnings) and assert the remainder, for example by excluding specific known messages rather than allow-listing prefixes. At minimum, assert that every captured line at level Warn or above is accounted for:

```ts
const NOISE = [/serving port routes unguarded/, /refused frame/];
const enforcementLines = (lines) =>
  lines.filter((l) => ["Warn", "Error", "Fatal"].includes(l.level) && !NOISE.some((r) => r.test(textOf(l))));
```

### WR-03: The recheck "carried on" cell asserts an absence after a fixed 20 `yieldNow` turns, so it can pass vacuously

**File:** `packages/http/test/RequestEnforcement.test.ts:439-443`
**Issue:**
- For `streamRecheck × success`, the driver waits for the second extractor lookup (`Deferred`), then yields 20 times, then cancels the body and asserts no enforcement line and result `"carried on"`.
- The `Deferred` fires before the second lookup answers. The recheck still has to resolve the subject, load the resource and evaluate before it could log. Twenty scheduler turns is an unproven bound on that work.
- If the recheck needs more turns, or a future evaluation step is genuinely async, the body is cancelled mid-recheck and the absent-line assertion passes whether or not the recheck would have logged. The comment says an absent line is "a recheck that ran and logged nothing rather than one that never ran". Nothing enforces that.
- The `else` branch drains `response.text()` unbounded, so a regression that fails to end the stream hangs until the vitest timeout instead of failing with a message.

**Fix:** Make completion observable. Signal from the recheck's end, not its start, for example from an `onThird` hook on a third lookup or via a decision-side `Deferred` completed after the `Effect.void` handler. Alternatively, bound the drain with `Effect.timeout` and an explicit assertion message.

## Info

### IN-01: Stale doc comments still describe the pre-ARCH-46 split

**File:** `packages/http/src/AuthorizeRequest.ts:126-128`, `packages/http/src/GuardRoute.ts:45-47`, `packages/http/src/NoResource.ts:40,51-53`
**Issue:**
- `authorizeRequest`'s doc says a handler's denial is "the surface that turns it into a response" who logs it. That is now `enforced`'s step, for every surface.
- `GuardRoute.ts` says the `CurrentSubject` scope is the one `authorizeRequest` and this function provide. `enforced` provides it now.
- `NoResource.ts` says "a caller of `authorizeRequest` omits `loadResource` instead of naming it". Every `enforceRequest` caller (`GuardRoute`, the middleware, the recheck) now names `loadNoResource`.
- `QadiHttpError.ts`'s `toResponse` doc, outside this file set, says it logs nothing because `authorizeRequest` logs an extraction failure. `extractSubject` now logs it for the subject-only mode as well.
- `AGENTS.md` §15 treats claims that drift from the code as defects.

**Fix:** Reword each to point at `enforced` / `enforceRequest` / `extractSubject`.

### IN-02: The first overload's narrower error type is unverified by the compiler

**File:** `packages/http/src/AuthorizeRequest.ts:190-199,265-286`
**Issue:**
- The no-cast claim rests on TypeScript's loose overload-to-implementation compatibility. The first overloads promise an error channel of `EP`, with no `unhandled`. The implementation is typed `EP | unhandled`.
- The compiler does not check that promise. It holds only because overload 1 constrains the handler to a closed error type. A handler typed with `any` in its error channel would select overload 1 and could leak `unhandled` undeclared.
- `RequestEnforcement.tst.ts` pins the two intended shapes but not this boundary.

**Fix:** This is acceptable as written. Add a `tstyche` case asserting that a handler with an `any` error is rejected, or accepted with a deliberately wide result. Alternatively, note in the doc comment that the overload carries the soundness.

### IN-03: `endpointMemberKey` is not injective

**File:** `packages/http/src/AuthorizeRequest.ts:53-56`
**Issue:**
- Group `"a/b"` with endpoint `"c"` and group `"a"` with endpoint `"b/c"` produce the same key, `"a/b/c"`. Registration and enforcement agree, so a collision would let one endpoint's refusal-by-absence pass as registered.
- Practically unreachable, because HttpApi identifiers are code-defined. The `` `${string}/${string}` `` type adds no uniqueness and reads as a stronger guarantee than it is.

**Fix:** Separate the pair with a character identifiers cannot contain, or use a nested `Map<group, Set<endpoint>>`.

### IN-04: Redundant and low-value test assertions

**File:** `packages/http/test/PortRoutes.test.ts:432-469` and `packages/http/test/RequestEnforcement.test.ts:508`
**Issue:**
- The new `PortRoutes.test.ts` case exactly duplicates `unguardedPort × extractionFailure` in the table. D-07 allows this only "where they become redundant", and the D-06 regression test is a deliberate first-written exception. A comment saying the pair is intentional would stop a later cleanup from deleting the regression pin.
- `assert.isAbove(cell.reason.length, 20)` accepts any 21-character string, so it is not a meaningful check of the stated "each with its reason" claim.

**Fix:** Annotate the intentional duplicate. Drop the length check, or assert that the reason is not the empty-ish placeholder text.

---

_Reviewed: 2026-11-08T03:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
