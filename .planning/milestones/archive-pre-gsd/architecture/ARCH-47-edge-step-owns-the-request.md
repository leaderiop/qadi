---
id: ARCH-47
title: The HTTP edge step owns the whole request — identify once, serve as the subject once; each surface supplies only its answer
strength: Strong   # 2026-10-13 review, candidate #2 ("top recommendation"); live gap
status: superseded-by-phase-13
disposition: "T1/T2 fixed on main by merged ARCH-46 ENF-03 (e0365e0); the public-endpoint denial log (T3/T4) is ported by Phase 13 (GAP-01) from rescue/wave5-1013 b0b9363; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []   # sequencing notes with ARCH-49, ARCH-57, ARCH-54 in §9; none is a hard block
blocks: [ARCH-57]   # soft: ARCH-57's `addUnguardedRoute` should be built on T6's `identifyRequest`/`serveRequest` (§9)
adrs_touched:
  - ADR-QD-036 (amend, Rev 1.8: the edge step is two steps — `identifyRequest` and `serveRequest` — and every surface that turns a request into a response goes through them; an unguarded route identifies through the same step; refines Rev 1.5's "one enforcement path" and Rev 1.6's handler-denial log)
  - ADR-QD-107 (amend, one sentence: `portRoutesUnguarded` identifies through `identifyRequest`, so a broken credential store is logged like on every other route)
  - ADR-QD-072 / ADR-QD-081 (constraint: redaction stays the per-tag `project`; `toResponse` stays bodyless for eleven tags; statuses unchanged; the public arm's handler failures become projected in-channel rather than stripped by the encoder)
  - ADR-QD-075 (constraint: `RequirePermission`'s class declaration and `HttpApiMiddlewareClient.ts` untouched; `ANY_BUDGET` stays 7)
  - ADR-QD-035 (read: `guard` builds its handler eagerly; `authorizeRequest` keeps returning the witness so the handler is built only on an allow)
  - ADR-QD-037 (constraint: madge — `AuthorizeRequest.ts` keeps importing only `QadiHttpError.ts`, `DenialLog.ts`, `NoResource.ts`, `SubjectExtractor.ts`)
  - ADR-QD-099 (constraint: anything in `AuthorizeRequest.ts` is public through `export *`; a package-private helper needs its own non-barrel module)
  - ADR-QD-038 (constraint: patch changesets for the two defects, one `minor` for the additive exports, fixed group; no release run)
packages: ["@qadi/http", "examples/http-advanced (verify only)", "examples/nextjs-newsroom (verify only)", "apps/website (docs)", "scripts (house style)", "spec"]
estimate: M   # ≈ 1½–2 days complete (T0–T11). Defect-only path (T0–T4) ≈ ½ day (S)
---

# ARCH-47 — The HTTP edge step owns the whole request, not just the check

## 1. Verified evidence (at `b655b3b`)

Re-checked on `main` at `b655b3b`. Nothing in the repository was edited. Three throwaway probes ran
from `scratchpad/wave5/ARCH-47/` (session scratchpad; `node_modules` symlinked to
`packages/http/node_modules`; runtime probes with
`NODE_OPTIONS=--conditions=bun <repo>/node_modules/.bin/tsx <probe>.mts`, the type probe with
`<repo>/node_modules/.bin/tsc -p tsconfig.json`, a `tsconfig.json` extending `tsconfig.base.json` with
`types: []`). Every other claim was settled by reading the symbol cited. `pnpm vitest run packages/http`
at `b655b3b`: **10 files, 227 tests, green** (the baseline T0 compares against).

### C1. Two surfaces hand-write the same tail after `authorizeRequest` — **CONFIRMED**

- `RequirePermissionMiddleware.ts` — `makeRequirePermission` → `enforce` (≈`:84-98`):
  `authorizeRequest(permission, policy)(request)` → `Effect.provideService(httpEffect, CurrentSubject, subject)`
  → `Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler"))` (on the handler only) →
  `Effect.provide(evaluationServices)` → `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (e) => Effect.fail(projectHttpEnforcementFailure(e)))`.
- `GuardRoute.ts` — `guardRoute` (≈`:77-91`): `authorizeRequest(permission, policy, loadResource)(request)`
  → `handler(authorized, resource)` under `Effect.provideService(CurrentSubject, subject)` →
  `Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler"))` (handler only) →
  `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (e) => Effect.succeed(toResponse(e)))`.

The only difference is the answer (`projectHttpEnforcementFailure` in-channel vs `toResponse` as a
success). The handler tap was added to both by ARCH-45 I3 (`ARCH-45-loose-ends.md` T6, D-45-d), which
is what "the surface logs a handler-raised denial" (BEH-QD-321) costs today: one hand-placed tap per
surface, whose *placement* (handler only, never the whole pipeline) is what keeps an edge denial from
being logged twice. `DenialLog.ts`'s doc comment states that rule; nothing enforces it.

### C2. LIVE DEFECT — `portRoutesUnguarded` answers a broken credential store with an unlogged 502 — **CONFIRMED by probe**

`PortRoutes.ts` — `portRoutesUnguarded` (≈`:178-187`): `Effect.result(SubjectExtractor.extract(request))`,
then `if (extracted._tag === "Failure") return toResponse(extracted.failure)`. `toResponse`'s doc comment
(`QadiHttpError.ts`) says "It logs nothing: `authorizeRequest` logs a denial and an extraction failure
once", and `logSubjectExtractionFailed` has exactly one caller, `authorizeRequest`'s tap
(`grep -rn "logSubjectExtractionFailed" packages/http/src` → its definition and `AuthorizeRequest.ts`).
`probe-unlogged-502.mts` (both forms over `stack(…)` with a `subjectExtractorBearer` whose lookup fails
`"token service unreachable"`, a `collectingLogger` merged into the layer, `disableLogger: true`):

```
unguarded status 502 body {"_tag":"SubjectExtractionFailed"} log lines: [["qadi/http: serving port routes unguarded — each answers only about the request's own subject. Reason given: probe"]]
guarded   status 502 body {"_tag":"SubjectExtractionFailed"} log lines: [["qadi/http: subject extraction failed — token service unreachable"]]
```

The unguarded form's only line is its construction-time warning; the outage's `reason` is nowhere. This
breaks BEH-QD-321's third requirement ("a `SubjectExtractionFailed` MUST … be logged exactly once, by the
step that turned it into a response") and BEH-QD-175's reason for existing (an operator must be able to
tell an outage from a denial; the 502 body deliberately carries no reason, so the log is the only
answer). It also contradicts `PortRoutes.ts`'s own module doc ("Both forms take it from
`SubjectExtractor`"): only one goes through the step. **Severity: medium** (observability of an outage
on a route hit on every client re-check; no wrong answer — the status is right). No test covers either
form's extraction failure (`grep -n "SubjectExtractionFailed\|502" packages/http/test/PortRoutes.test.ts` → nothing).

How it happened: ARCH-19's success criterion 1 ("`SubjectExtractor.extract` appears only in
`AuthorizeRequest.ts`") was a grep in a plan, not a gate. ARCH-31 T6 (`ARCH-31-remote-port-codec.md`
step 606, "`portRoutesUnguarded` … does the same with `SubjectExtractor.extract` (a failure →
`toResponse`)") landed in the same wave and nothing re-ran the grep. D-47-c below turns it into a rule.

### C3. NEW DEFECT — a `publicEndpoint`'s handler-raised denial is answered 403 with no log line — **CONFIRMED by probe**

`RequirePermissionMiddleware.ts` — the `Public` arm of `Match.valueTags(endpointAccess(…))`:
`Public: () => Effect.provideService(httpEffect, CurrentSubject, anonymous)`. No handler tap, no
in-channel projection. BEH-QD-321 says a denial a handler's own `guard` raises is logged "by the surface
(`RequirePermission`, `addGuardedRoute`)" — and a public endpoint is served by `RequirePermission`.
`probe-public-handler-denial.mts` (one public and one required endpoint, each handler running
`guard(write, hasPermission(write))({}, …)`):

```
/pub 403 {"_tag":"AccessDenied","subjectId":"anonymous","policyTag":"HasPermission","reason":"subject lacks permission 'document:write'"} logs: []
/req 403 {"_tag":"AccessDenied","subjectId":"alice","policyTag":"HasPermission","reason":"subject lacks permission 'document:write'"} logs: [["qadi/http: request denied (ACL001) — subject \"alice\": …"]]
```

The review did not find this; it is the same class as ARCH-45 I3, on the one arm I3 did not touch.
**Severity: low–medium** (a defense-in-depth denial invisible server-side; the status is right).

**Redaction holds on that arm, but by accident — CONFIRMED by probe.** `probe-public-handler-outage.mts`
(a handler `guard` over `hasAttribute` with a scripted failing `AttributeResolver` whose message is
`"SECRET-conn-string"`): `/pub 502 {"_tag":"AttributeResolveError","attribute":"clearance"}`. The
`trace` (C3 body above) and the `cause` are absent because `HttpApiBuilder`'s encoder encodes the raw
error with the matching declared `…Response`/`AccessDeniedRefused` schema, which drops excess
properties — not because the per-tag `project` ran (ADR-QD-072/081 say redaction *is* `project`). Today
every wire schema is a field subset of its class, so the two agree; a projection that ever transformed
rather than selected would diverge silently on the public arm only. T3 pins the body; T7 routes the arm
through the same projection as `Required`.

### C4. Every other hand extraction — **CONFIRMED: none besides C2**

`grep -rn -E "SubjectExtractor\.extract\s*\(|tapErrorTag\s*\(\s*ENFORCEMENT_DENIAL_TAGS|tapErrorTag\s*\(\s*\"SubjectExtractionFailed\"|provideService\([^)]*CurrentSubject" packages/*/src`
(excluding generated `.d.ts`):

| Site | What it does | Logs an extraction failure? |
| ---- | ------------ | --------------------------- |
| `AuthorizeRequest.ts` — `authorizeRequest` | the step | yes, its tap |
| `GuardRoute.ts` — `guardRoute` (via `addGuardedRoute`, so also `permissionRegistryRoute`, `decisionStreamRoute`'s connect, `decisionBacklogRoute`, `portRoutes`) | `authorizeRequest` + C1 tail | yes (through the step) |
| `RequirePermissionMiddleware.ts` — `enforce` | `authorizeRequest` + C1 tail | yes (through the step) |
| `RequirePermissionMiddleware.ts` — `refuse`, `Public` | `provideService(CurrentSubject, anonymous)`; no extraction | n/a — but see C3, and C5 |
| `DecisionStreamRoute.ts` — `recheck` | `authorizeRequest(permission, policy)(request)` + its own "recheck ended the stream" line | yes (through the step) |
| `PermissionRegistry.ts` — `permissionRegistryRouteUnguarded` | no subject at all; warns per request | n/a |
| **`PortRoutes.ts` — `portRoutesUnguarded`** | **extracts by hand, answers `toResponse`** | **no (C2)** |
| `packages/promise/src/index.ts`, `packages/react/src/QadiAtoms.ts` | provide a caller-given subject; not HTTP | n/a |

Examples: `examples/http-advanced/server.ts` reads `CurrentSubject` inside handlers and lets a handler
`guard` fail through (ARCH-45 removed its catch) — fine. `examples/nextjs-newsroom/src/server/api.ts`
defines a cookie `SubjectExtractor` that never fails and mounts `portRoutesUnguarded` — the defect is
latent there (its extractor cannot fail), live for any host whose extractor can. `IngestRoute` reads no
subject. Website: `apps/website/src/content/docs/docs/packages/http.md` § "Building your own surface"
is a fourth copy of the tail (`authorizeRequest(…).pipe(Effect.map(…), Effect.catchTag(HTTP_ENFORCEMENT_TAGS, toResponse))`),
correct only because its body runs no handler effect that could deny.

Test fixture note: `http.test.ts`'s `WriteRoute` handler still catches `ENFORCEMENT_ERROR_TAGS` with
`toResponse` by hand (the pre-ARCH-45 shape), so its handler denial is answered without a log line by
design of the fixture. Not a product defect; T7 leaves it (it pins that a handler *may* answer its own
failure) but names it.

### C5. `refuse`'s `provideService(CurrentSubject, anonymous)` is a no-op — **CONFIRMED by reading**

`refuse` provides `CurrentSubject` to `Effect.logError(message).pipe(Effect.as(HttpServerResponse.empty({ status: 500 })))`,
which requires nothing; `httpEffect` is never run on that arm. Its comment ("every endpoint it guards …
must actually receive one for that declaration to stay honest") is true of `Public`, not of `refuse`.
Removing it changes nothing at runtime; it matters only so that D-47-c's rule can say "`CurrentSubject`
is provided in `@qadi/http` by the edge step and nowhere else" with zero exceptions. T7 checks it with
`pnpm typecheck`.

### C6. The tap-over-an-open-error limit — **CONFIRMED; and a closed shape that serves both surfaces compiles (probe)**

The review's caveat: `AuthorizeRequest.ts`'s doc and ARCH-19 C9 say a tap over a caller's open error
type does not typecheck. `shapes.ts` compiled seven candidates against the real modules
(`<repo>/node_modules/.bin/tsc -p tsconfig.json`; the only other errors are the unrelated
`EvaluationId.ts` `crypto` TS2304 and TS2877 for absolute `.ts` imports, both artefacts of the probe
setup):

| Shape | Result |
| ----- | ------ |
| S1 `runAs(subject)<A, E, R>(handler: Effect<A, E \| HttpEnforcementFailure, R>)` + `tapErrorTag(ENFORCEMENT_DENIAL_TAGS, …)` | **TS2345** (`ExtractTag<NoInfer<E \| HttpEnforcementFailure>, …>` not assignable to `EnforcementDenial`) — C9 re-confirmed |
| S2 same, `E extends HttpEnforcementFailure \| unhandled` | **TS2345** (`ENFORCEMENT_DENIAL_TAGS` not assignable to `Tags<E>`) |
| S3 `runAs(subject)` with **two closed overloads**: handler error `HttpEnforcementFailure`, or `unhandled \| HttpEnforcementFailure`; one implementation over the wider union | **compiles**; `guardRoute`'s tail infers `never`, the middleware's `unhandled \| <projected>` |
| S4 open `E`, `Effect.tapError` with an `instanceof AccessDenied \|\| instanceof UndischargedObligation` refinement | **compiles** for any `E` |
| S5 `answeredAs<B, U = never>(answer)(subject)(handler: Effect<A, U \| HttpEnforcementFailure, R>)` with tap + `catchTag` | **TS2345** on both (open `U`) |
| S6 `respondAs(answer)(who, handler)`, closed overloads on the handler's residual (`never` / `unhandled`) | **compiles** |
| **S7 `serveRequest(who, handler, answer)`**, same closed overloads, `who: Effect<X extends IdentifiedRequest, HttpEnforcementFailure, R0>` | **compiles**: bare route → `Effect<HttpServerResponse, never, …>`; middleware → error `<projected> \| unhandled`; unguarded port route over `identify` → `Effect<…, never, SubjectExtractor>`; a handler with its own `NotFound` failure is **refused** (`@ts-expect-error` consumed), the rule `GuardRoute.ts`'s doc already states for bare routes |

So the caveat is real for an *open* error and does not bind here: the two error shapes a surface hands
the step are closed and known (`HttpEnforcementFailure` from a bare route, `unhandled | HttpEnforcementFailure`
from `HttpApiMiddleware`), and two overloads name exactly them. This **refines, not reverses,** ARCH-19
D-19-a: `authorizeRequest` stays value-form (the "who"); D-19-a's rejected continuation was over an open
`E`, and S7's is over a closed residual. `authorizeRequest` itself already uses function overloads, so the
form has precedent in the module.

### C7. Return types are preserved under S7 — **CONFIRMED by probe and reading**

S7's result requirement is `R0 | Exclude<R, CurrentSubject>`: `CurrentSubject` is discharged from the
handler's `R` only, never from `who`'s (where a `loadResource` needing `CurrentSubject` lives). That is
exactly what `GuardRoute.tst.ts`'s three tests pin ("discharges CurrentSubject from the wrapped handler's
own R", "accepts a handler whose own guard may deny", "does NOT discharge CurrentSubject from
loadResource's own LR"), and ARCH-19 C10's identity
`Exclude<R | EvaluationServices, CurrentSubject> = Exclude<R, CurrentSubject> | StandingEvaluationServices`
still makes `guardRoute`'s declared type equal.

### C8. Budgets and gates touched — **CONFIRMED by reading `scripts/check-house-style.mjs`**

- `ANY_BUDGET` (`"packages/http/src/HttpApiMiddlewareClient.ts": 7`): untouched.
- `PORT_DOUBLE_BUDGET` http entries (`QadiHttpError.test.ts: 12`, `decisionStream.test.ts: 1`,
  `fixtures/everyHttpEnforcementFailure.ts: 5`): untouched by this plan. The new tests script broken
  ports through `scriptedPort` and build `SubjectExtractionFailed` (not a port error) — neither counts.
  If T6's tests hand-construct a port error (they need not), the budget fails in both directions; use
  `scriptedPort(…, () => PortReply.fail(…))` instead.
- `UNTRACED_BUDGET`, `SWITCH_BUDGET`, `SCHEMA_ERROR_BUDGET`, `HAS_CUSTOM_BUDGET`, `DECISION_READ_BUDGET`:
  not touched (no `fnUntraced`, no `switch`, no `Schema.TaggedError`, no `hasCustom`).
- Gate 13 (`node scripts/check-api-surface.mjs`): every export added to `AuthorizeRequest.ts` is public
  through `packages/http/src/index.ts`'s `export * from "./AuthorizeRequest.ts"` and needs an overview row.
- Gate 23 (`node scripts/check-website-doc-examples.mjs`): the website's "Building your own surface"
  fence is ` ```typescript ` and compiled.
- Gate 21 (`stryker run stryker.http.mjs`): mutates `packages/http/src/**/*.ts`; break 80.
- No rule today confines extraction or the denial tap to the edge step (`grep -n "SubjectExtractor\|authorizeRequest\|logDenial" scripts/*.mjs` → nothing). That is why C2 shipped.

### C9. Spec state — **CONFIRMED by reading**

- BEH-QD-321 (`spec/behaviors/23-http.md` Rev 1.10) lists the surfaces as "`RequirePermission`,
  `addGuardedRoute` and the decision stream's recheck" — `portRoutesUnguarded` (ARCH-31, same day) is in
  none of its requirements. Its logging requirement already covers C2 and C3 by the "step that turned it
  into a response" wording.
- BEH-34 (`spec/behaviors/34-remote-ports.md` Rev 1.0) and ADR-QD-107 say nothing about how the
  unguarded form logs a failed extraction (only that it logs its reason once at construction).
- `spec/overview.md` rows: `authorizeRequest, AuthorizedRequest` (names the surfaces that "keep only their
  own answer"), `logSubjectExtractionFailed` ("wired by `authorizeRequest`"), `logDenial` (names
  `RequirePermission`, `guardRoute`, `addGuardedRoute` as the handler-site loggers), `toResponse` ("logs
  nothing"), `portRoutes, portRoutesUnguarded, …`.
- ADR-QD-036 is at Rev 1.7 (ARCH-36).

### C10. Environment note (not this plan's) — stray generated declarations in `src`

While probing, 154 untracked `*.d.ts`/`*.d.ts.map` files appeared in `packages/core/src` (140) and
`packages/http/src` (14), timestamped `00:53:47` — not from this plan's probes (re-running them left the
timestamps unchanged; this plan's `tsconfig.json` inherits `noEmit: true`). Likely a sibling wave-5
probe compiled with emit on. They are untracked and harmless to `git`, but `stryker.http.mjs` mutates
`packages/http/src/**/*.ts`, which matches `*.d.ts`. T0 checks `git status --short packages/*/src` is
clean before anything runs; whoever owns them should delete them.

## 2. Goal and success criteria

A request reaching `@qadi/http` goes through one **module** that answers *who is asking* and then *run
the handler as them*, and every surface supplies only its answer. Today the module answers only the
check: `authorizeRequest` is **deep** (extract → load → guard → log, behind one call), but the tail —
scope the handler to `CurrentSubject`, log a handler-raised denial, catch every enforcement failure — is
hand-written by each surface, and a surface that needs *identity without a check* has no step at all, so
it extracts by hand and forgets the log (C2). The goal is to deepen `AuthorizeRequest.ts` into the whole
edge **interface**: `identifyRequest` (extract + log an extraction failure; the step every path to a
subject goes through, and what `authorizeRequest` is built on) and `serveRequest(who, handler, answer)`
(provide the subject, log a handler-site denial once, answer every `HttpEnforcementFailure` through the
surface's `answer`). The **seam** is the `who` value — an `IdentifiedRequest`, of which `AuthorizedRequest`
is the checked kind — and the `answer` function. Each surface becomes an **adapter** that names only its
`answer`: `projectHttpEnforcementFailure` in-channel for `HttpApiMiddleware`, `toResponse` for a bare
route. **Locality:** the order (identify before load), the scope (`CurrentSubject` on the handler only,
never on `loadResource`), the placement of both log taps (edge failures in the who-step, handler denials
on the handler only) and the catch (around both) live in one file. **Leverage:** `portRoutesUnguarded`,
the `publicEndpoint` arm, ARCH-57's `addUnguardedRoute`, ARCH-49's access-plan arms and any host-built
surface get logged identity and handler-denial logging by calling two functions, and a rule makes the
hand-written alternative fail the gate.

Success criteria:

1. `pnpm vitest run packages/http/test/PortRoutes.test.ts` — "the unguarded form" has a test where a
   failing extractor yields 502, body `{"_tag":"SubjectExtractionFailed"}`, and exactly one
   `qadi/http: subject extraction failed — …` line beside the construction warning (T1; green after T2).
2. `pnpm vitest run packages/http/test/http.test.ts` — a `publicEndpoint` whose handler's `guard` denies
   answers 403 with a redacted body and logs exactly one denial line annotated
   `qadi.denial_site: "handler"` (T3; green after T4).
3. `git grep -n -E "SubjectExtractor\.extract\s*\(|tapErrorTag\s*\(\s*ENFORCEMENT_DENIAL_TAGS|tapErrorTag\s*\(\s*\"SubjectExtractionFailed\"|provideService\([^)]*CurrentSubject" packages/http/src`
   → `AuthorizeRequest.ts` only; and `node scripts/check-house-style.mjs` fails if any of them is
   reintroduced elsewhere in `packages/http/src` (T8, D-47-c = A).
4. `grep -n "catchTag(HTTP_ENFORCEMENT_TAGS" packages/http/src` → `AuthorizeRequest.ts` only.
5. Every existing exact-log test passes unchanged: `http.test.ts` ("a bare route's denial logs exactly
   one line", "a bare route's extraction failure logs exactly one line", "a handler-raised denial is
   logged once, as the handler's", "the log line says which step raised the denial", the middleware
   outage line), `AuthorizeRequest.test.ts` (all eight), `decisionStream.test.ts`'s recheck lines.
6. `pnpm test:tstyche` green with `GuardRoute.tst.ts`, `AuthorizeRequest.tst.ts`, `RequirePermission.tst.ts`
   and `GuardApi.tst.ts` unchanged, plus the new `ServeRequest.tst.ts` (T5).
7. `node scripts/check-api-surface.mjs` green with rows for `identifyRequest`, `IdentifiedRequest`,
   `serveRequest` (D-47-b = A) and the corrected `authorizeRequest`/`logSubjectExtractionFailed`/`logDenial`
   rows.
8. `pnpm check` green; every budget at its `b655b3b` value (`ANY_BUDGET` 7, `PORT_DOUBLE_BUDGET` http
   entries 12/1/5); `stryker run stryker.http.mjs` ≥ 80 with no new survivor in `AuthorizeRequest.ts`.

## 3. Non-goals

- **The decision stream's recheck.** It authorizes and classifies; it serves no handler. It stays
  `authorizeRequest(…)` + its own "recheck ended the stream" line (ARCH-19 D-19-f). The SSE protocol order
  is ARCH-54's.
- **The middleware's dispatch** (`members`, `misplacedDeclarations`, `endpointAccess`, `refuse`'s messages):
  ARCH-49 replaces it with a closed access plan. This plan changes only what the `Required` and `Public`
  arms *call* (§9 ordering).
- **`addUnguardedRoute` and an optional `addGuardedRoute` loader:** ARCH-57. This plan supplies the steps
  it builds on and migrates `portRoutesUnguarded` directly.
- **`permissionRegistryRouteUnguarded`:** it reads no subject; nothing to identify.
- **Bare-route response bodies** for the eleven `EnforcementError` tags (ADR-QD-072's "not-yet-decided
  change") and the `401`/`WWW-Authenticate` gap `subjectExtractorBearer`'s doc records.
- **Providing the captured standing services on the `Public` arm.** `Required` provides
  `evaluationServices` to the handler; `Public` does not, and a public handler's `guard` gets its services
  from the group layer, which the type system already demands. Unifying that changes which service
  instances a public handler sees; out of scope, recorded in §9.
- **A span per `serveRequest`.** The handler's spans are the application's; `authorizeRequest` keeps
  `qadi.http.authorizeRequest`, and `identifyRequest` adds one nested span (§4).
- **An invariant for denial logging.** BEH-QD-321 already requires it and C2/C3 violate that requirement;
  the new rule (D-47-c) enforces the locality that makes it hold. No INV row.

## 4. Constraints

- **AGENTS.md §1:** submodule imports (`effect/Effect`, `effect/http/HttpServerRequest`); `.ts` extensions;
  `import type` for `AuthSubject`, `HttpEnforcementFailure`, `unhandled` (`effect/Types`).
- **AGENTS.md §4:** `Effect.catchTag` array form only (`HTTP_ENFORCEMENT_TAGS`); never `Effect.orDie`;
  `SubjectExtractionFailed` stays `Data.TaggedError` (not in `SCHEMA_ERROR_BUDGET`).
- **AGENTS.md §5:** `identifyRequest` is `Effect.fn("qadi.http.identifyRequest")` with the extraction tap
  in its pipe argument (the shape `authorizeRequest` uses) — a span per request is product observability
  (credential-store latency), ADR-QD-051's reasoning; not a per-node hot path. `serveRequest` is an
  overloaded combinator returning a piped `Effect` (like `guardRoute`), not an effectful function of its
  own; no `Effect.fnUntraced` (`UNTRACED_BUDGET`).
- **AGENTS.md §6:** no `as`/`any`/`!`. The overload implementation is typed on the wider residual; no
  cast is needed (C6, S7). If D-47-a = C, the `instanceof` refinement is legal (`Predicate.ts` uses
  `instanceof Refusal`) but is a second list of "what is a denial" beside `ENFORCEMENT_DENIAL_TAGS`.
- **AGENTS.md §9 / ADR-QD-099:** `AuthorizeRequest.ts` is `export *`'d. If D-47-b = B, the two steps go in
  a new package-private `EdgeStep.ts` that `index.ts` does not re-export, and `AuthorizeRequest.ts`
  imports from it (madge: `EdgeStep.ts` must not import `AuthorizeRequest.ts`).
- **ADR-QD-037 (`pnpm circular`):** `PortRoutes.ts` gains an import of `AuthorizeRequest.ts`;
  `AuthorizeRequest.ts` imports nothing that imports `PortRoutes.ts`. Checked in T6/T7.
- **ADR-QD-072/081:** statuses from `HTTP_STATUS_BY_CLASS`; redaction is the per-tag `project`; the
  middleware's answer still wraps the handler's failures (ARCH-19 C6a). The `Public` arm gains the same
  in-channel projection (C3): the body is unchanged, the mechanism becomes the specified one.
- **ADR-QD-075:** `RequirePermission`'s `error:`/`clientError`/`requiredForClient` untouched.
- **ADR-QD-036 Rev 1.5/1.6 (BEH-QD-321):** extraction before `loadResource`; the handler is built only on
  an allow (the witness is returned first); a denial is logged exactly once, by the step that turned it
  into a response, annotated `qadi.denial_site`; a resolver outage is not logged by the edge.
- **ARCH-45 D-45-d** (decided): the handler-denial tap is on the handler's effect only. Under this plan
  it lives in `serveRequest`; the annotation pair (`DenialSite`, `DenialLog.ts`) is unchanged and
  `DenialLog.ts` stays package-private.
- **ARCH-19 D-19-b/D-19-e** (decided): `authorizeRequest` and `toResponse` stay public with their current
  signatures; `toResponse` still logs nothing.
- **Gates:** 4 (`node scripts/check-house-style.mjs`), 5 (`pnpm circular`), 6 (`pnpm test:tstyche`),
  13 (`node scripts/check-api-surface.mjs`), 21 (`stryker run stryker.http.mjs`), 23
  (`node scripts/check-website-doc-examples.mjs`), all inside `pnpm check`.
- **Releases:** changesets only. A version-packages PR or publish needs the user's explicit go-ahead.

## 5. Decisions needed before work starts

### D-47-a — The shape of the "run as the subject" step

- **A. `serveRequest(who, handler, answer)` with two closed overloads (recommended).** The step owns the
  `CurrentSubject` scope on the handler, the handler-site denial tap and the `catchTag` around *both* the
  who-step and the handler. Overloads: handler error `HttpEnforcementFailure` → result error = `answer`'s;
  handler error `unhandled | HttpEnforcementFailure` → result error = `answer`'s `| unhandled`. Compiles
  for all three surfaces and refuses an own-error handler (C6, S7). Deepest: a surface cannot misplace
  the tap (double log) or the catch (an unprojected handler failure reaching the encoder). Cost: an
  `unhandled` (an `HttpApiMiddleware`-ism) appears in an `@qadi/http` signature — it is this package's.
- **B. `runAs(subject)(handler)` (scope + tap), surfaces keep `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, answer)`.**
  Also closed overloads (S3). Shallower: each surface still places a catch that must wrap both halves.
  Forgetting it is a type error on both surfaces today, so it is safe, just repeated.
- **C. Either of A/B generic over an open `E` through an `instanceof` refinement (S4).** Any handler
  error passes through. Adds a runtime class list of "what is a denial" beside `ENFORCEMENT_DENIAL_TAGS`
  (a third denial class would compile and go unlogged unless both are edited) — the drift
  `ENFORCEMENT_DENIAL_TAGS`'s `CoversExactly` exists to prevent. Rejected unless a surface with an open
  error appears.
- **D. Defect fixes only (T0–T4), no deepening.** Leaves C1's two tails and the next unguarded surface
  free to forget the log.

Recommendation: **A**. Needs user sign-off: yes (new public interface shape; not breaking).
`status: open`

### D-47-b — Are `identifyRequest`, `IdentifiedRequest` and `serveRequest` public?

- **A. Public, in `AuthorizeRequest.ts` (recommended).** `authorizeRequest` is public for "a surface this
  package does not ship" (ADR-QD-036 Rev 1.7, D-19-b); that surface needs the tail too, or it is the
  fourth hand-written copy (the website's "Building your own surface" is that copy today, C4). Three
  gate-13 rows, one additive `minor`. `AuthorizedRequest` gains `extends IdentifiedRequest` (additive).
  Names: `identifyRequest` (parallel to `authorizeRequest`), `serveRequest` (it serves a request as the
  subject the who-step established). Rejected names: `runAs` (too generic for a flat barrel, AGENTS §9),
  `respond` (collides with `PortRoutes.ts`'s private `respond`).
- **B. Package-private, in a new non-barrel `EdgeStep.ts`.** Smallest surface. The website example stays
  `authorizeRequest` + `catchTag(toResponse)` and a host's handler-raised denial stays its own business.
  Contradicts the reason `authorizeRequest` is public.

Recommendation: **A**. `status: open`

### D-47-c — Make "the edge step owns identity" a gate rule

- **A. A house-style check scoped to `packages/http/src` (recommended):** `edge-step-owns-identity`
  refuses `SubjectExtractor.extract(`, `tapErrorTag(ENFORCEMENT_DENIAL_TAGS`, `tapErrorTag("SubjectExtractionFailed"`,
  `catchTag(HTTP_ENFORCEMENT_TAGS` and `provideService(…CurrentSubject…)` outside
  `packages/http/src/AuthorizeRequest.ts` (on stripped lines, so prose never trips it). Zero exceptions
  once C5's no-op provide is removed. ARCH-19's grep criterion rotted within one wave (C2); this is the
  `no-ambient-console` pattern (one module, enforced) applied to the edge. If D-47-b = B, the exempt file
  is `EdgeStep.ts`.
- **B. Keep it a plan-level grep.** Free; already failed once.

Recommendation: **A**. `status: open`

## 6. Tasks

Branches: **defect path** T0 → T1 → T2 (C2) and T0 → T3 → T4 (C3), each a `patch` that ships ahead of the
refactor. **Refactor path** T5 → T6 → T7 → T8 → T9 → T10 → T11, after D-47-a/b (T8 after D-47-c).

### T0 — Re-verify the evidence at the branch point
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git status --short packages/*/src` must be empty (C10: delete stray untracked `*.d.ts` only if they
     are yours; otherwise ask). `git switch -c arch/47-edge-step-owns-the-request main`.
  2. Re-read every symbol in §1 (`enforce`, the `Public` arm, `refuse`, `guardRoute`, `portRoutesUnguarded`,
     `authorizeRequest`, `toResponse`, `logSubjectExtractionFailed`, `logDenialAt`); re-run the C4 grep.
  3. Re-run the probes from `scratchpad/wave5/ARCH-47/` if the scratchpad survives; otherwise T1 and T3
     reproduce C2/C3 as red tests, and T5 reproduces C6's type results. Expected `shapes.ts` errors: only
     S1 (`:22`), S2 (`:29`), S5 (`:60-61`) plus the `crypto`/TS2877 setup noise.
  4. Check sibling landings: `git log --oneline main -- packages/http/src/RequirePermissionMiddleware.ts packages/http/src/PermissionRegistry.ts packages/http/src/PortRoutes.ts packages/http/src/DecisionStreamRoute.ts packages/http/src/GuardRoute.ts`.
     If ARCH-49 landed, rename this plan's "`Required`/`Public` arm" to its access-plan arms; if ARCH-57
     landed `addUnguardedRoute`, T2/T7's `PortRoutes.ts` steps move into it (§9).
- **Tests:** none.
- **Verify:** `pnpm vitest run packages/http` (expect 10 files, 227 tests at `b655b3b`; record the count);
  `pnpm test:tstyche`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** counts and any rebased names are logged in §10.

### T1 — Red: an unguarded port route's extraction failure is logged once (C2)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/http/test/PortRoutes.test.ts` (`describe("the unguarded form")`, and `describe("the guarded form")`)
- **Steps:**
  1. Add a `broken = subjectExtractorBearer(() => Effect.fail(new SubjectExtractionFailed({ reason: "token service unreachable" })))`
     fixture (import `SubjectExtractionFailed` from `../src/SubjectExtractor.ts`) and a `serveWith(subjects, logger)`
     variant of `serve` that takes the extractor and merges `collectingLogger()`'s layer
     (`stack(routes, subjects, …).pipe(Layer.provideMerge(logger))`, `disableLogger: true` — the
     `appLayerWithLogger` pattern `http.test.ts` documents).
  2. "the unguarded form": `it.effect("a broken credential store is a 502, logged once with its reason")` —
     POST `/__ports/AttributeResolver` with a bearer token; assert status 502, body
     `{"_tag":"SubjectExtractionFailed"}`, and `lines.map((l) => l.message)` deep-equals
     `[[<construction warning>], ["qadi/http: subject extraction failed — token service unreachable"]]`
     (the construction warning is logged at layer build into the same logger, first). **Red today**:
     only the warning.
  3. "the guarded form": the same request against `portRoutes(readPorts, readPolicy, serving)` → 502 and
     exactly the extraction line. Green today (characterization: it is the step's, through `addGuardedRoute`).
- **Tests:** 2 runtime cases (1 red).
- **Verify:** `pnpm vitest run packages/http/test/PortRoutes.test.ts`
- **Done when:** exactly the unguarded case is red, failing on the missing log line, not on status/body.

### T2 — Patch: log an unguarded port route's extraction failure (C2)
- **Status:** [x] done
- **Depends on:** T1
- **Files:** `packages/http/src/PortRoutes.ts` (`portRoutesUnguarded`); `.changeset/unguarded-port-route-logs-extraction.md` (*new*)
- **Steps:**
  1. Minimal, decision-free fix: replace the `Effect.result(SubjectExtractor.extract(request))` branch with
     `SubjectExtractor.extract(request).pipe(Effect.tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed))`
     inside the existing `Effect.result`, keeping the `toResponse(extracted.failure)` answer. Import
     `logSubjectExtractionFailed` from `./QadiHttpError.ts`. (T7 replaces this with `identifyRequest`; the
     patch exists so the fix can ship alone.)
  2. Correct the module doc's "Both forms take it from `SubjectExtractor`" paragraph to say a failed
     extraction is a 502, logged once with its reason, on both forms.
  3. Changeset, `"@qadi/http": patch`: "An unguarded port route (`portRoutesUnguarded`) now logs a
     credential-store outage (`qadi/http: subject extraction failed — <reason>`) like every other route; it
     answered 502 with no server-side line."
- **Tests:** T1 green; `PortRoutes.test.ts` otherwise unchanged.
- **Verify:** `pnpm vitest run packages/http`; `node scripts/check-house-style.mjs`; `pnpm circular`;
  `pnpm tsc -b packages/http`
- **Done when:** green; can merge on its own.

### T3 — Red: a public endpoint's handler-raised denial is logged once, as the handler's (C3)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/http/test/http.test.ts` (`describe("RequirePermission's scopes around the handler (characterization)")`, `ProbeGroup`/`ProbeHandlers`)
- **Steps:**
  1. Add to `ProbeGroup` an endpoint `HttpApiEndpoint.get("publicRaise", "/probe/public-raise")` annotated
     `PublicEndpoint, publicEndpoint("probe: a public handler that re-checks")`; its handler runs
     `guard(writePermission, hasPermission(writePermission))({}, () => Effect.void)` (anonymous is denied).
     And `publicOutage` (`/probe/public-outage`) whose handler guards `hasAttribute("clearance", exists())`
     — under a `ProbeLayer` variant whose `AttributeResolver` is
     `scriptedPort(attributeResolverPort, () => PortReply.fail("SECRET-conn-string")).layer` (a script, so
     `PORT_DOUBLE_BUDGET` is untouched).
  2. `it.effect("a public endpoint's handler-raised denial is logged once, as the handler's")`: 403; body
     `_tag === "AccessDenied"`, `"trace" in body === false`; `logs` deep-equals one `request denied (ACL001) — subject "anonymous": …`
     line; the `qadi.denial_site` annotation is `"handler"` (the `References.CurrentLogAnnotations` reader
     "the log line says which step raised the denial" uses). **Red today** (`logs` is `[]`).
  3. `it.effect("a public endpoint's handler-raised outage is answered redacted")`: 502, body deep-equals
     `{ _tag: "AttributeResolveError", attribute: "clearance" }`, and the response text does not contain
     `SECRET`. Green today (encoder strip, C3) — it must stay green when T7 changes the mechanism.
- **Tests:** 2 runtime cases (1 red).
- **Verify:** `pnpm vitest run packages/http/test/http.test.ts`
- **Done when:** exactly the denial-log case is red.

### T4 — Patch: log a public endpoint's handler-raised denial (C3)
- **Status:** [x] done
- **Depends on:** T3
- **Files:** `packages/http/src/RequirePermissionMiddleware.ts` (the `Public` arm); `.changeset/public-endpoint-handler-denial-logged.md` (*new*)
- **Steps:**
  1. `Public: () => Effect.provideService(httpEffect, CurrentSubject, anonymous).pipe(Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler")))`.
     `httpEffect`'s declared error is `unhandled`; widen exactly as `enforce` does, by typing the arm's
     effect `Effect<HttpServerResponse, unhandled | HttpEnforcementFailure, CurrentSubject>` (a local
     annotation, no cast) so `tapErrorTag` can read the tags.
  2. Extend the arm's comment: a public endpoint has no edge check, so the only denial it can produce is a
     handler's own, logged here once (BEH-QD-321).
  3. Changeset, `"@qadi/http": patch`: "A denial raised by a `publicEndpoint`'s own handler `guard` is now
     logged once (`qadi.denial_site: "handler"`), as it already was on an endpoint with a requirement."
- **Tests:** T3 green; every other `http.test.ts` case unchanged.
- **Verify:** `pnpm vitest run packages/http`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`
- **Done when:** green; can merge on its own.

### T5 — Red: type tests for the two steps
- **Status:** [x] done
- **Depends on:** T0; D-47-a; D-47-b
- **Files:** `packages/http/test/ServeRequest.tst.ts` (*new*); `packages/http/test/AuthorizeRequest.tst.ts`
- **Steps (A/A):**
  1. `ServeRequest.tst.ts`, modelled on `GuardRoute.tst.ts`'s `RequirementsOf`/`ErrorOf` helpers:
     - "a bare handler's failures are answered": `serveRequest(who, handler: (x) => Effect<B, HttpEnforcementFailure, CurrentSubject>, (e) => Effect.succeed(toResponse(e)))`
       has error `never`.
     - "a middleware handler keeps its unhandled residual": handler error `unhandled`; `answer` fails with
       `projectHttpEnforcementFailure(e)`; result error is `ReturnType<typeof projectHttpEnforcementFailure> | unhandled`.
     - "CurrentSubject is discharged from the handler, never from who": `who` requiring `CurrentSubject`
       (a loader that needs it) keeps it; a handler requiring it does not.
     - "a handler with its own failure is refused": `expect(serveRequest).type.not.toBeCallableWith(who, () => effectWithNotFound, answer)`.
     - "who may be identified or authorized": `identifyRequest(request)` and `authorizeRequest(p, policy)(request)`
       are both accepted as `who`.
  2. `AuthorizeRequest.tst.ts`: `identifyRequest(request)` is
     `Effect<IdentifiedRequest, SubjectExtractionFailed, SubjectExtractor>`; `AuthorizedRequest<P, A>`
     is assignable to `IdentifiedRequest`.
- **Tests:** ~7 type cases, all red (the names do not exist yet).
- **Verify:** `pnpm test:tstyche`
- **Done when:** the new cases fail to compile for the expected reason (missing exports) and nothing else is red.

### T6 — Build `identifyRequest` and `serveRequest`; base `authorizeRequest` on `identifyRequest`
- **Status:** [x] done
- **Depends on:** T5
- **Files:** `packages/http/src/AuthorizeRequest.ts` (or *new* `EdgeStep.ts` if D-47-b = B); `packages/http/test/AuthorizeRequest.test.ts`
- **Steps:**
  1. Write the runtime tests first, in `AuthorizeRequest.test.ts` (new `describe("identifyRequest")`,
     `describe("serveRequest")`, reusing `requestAs`, `withLogs`, `standing`):
     - `identifyRequest`: a failing extractor fails `SubjectExtractionFailed` with exactly one extraction line;
       a success returns `{ subject }` and logs nothing.
     - `serveRequest(authorizeRequest(…)(req), handler, answer)`: a handler whose own `guard` denies is
       answered by `answer` and logged once with `qadi.denial_site: "handler"`; an edge denial is answered
       by `answer` and logged once (`"edge"`) — not twice; the handler sees the returned subject as
       `CurrentSubject`; the handler is never invoked on an edge denial (a counter); a handler-raised
       resolver outage is answered and logs nothing.
  2. Implement, in this order:
     ```ts
     /** Who is asking: the subject a request carries. `AuthorizedRequest` is its checked kind. */
     export interface IdentifiedRequest {
       readonly subject: AuthSubject;
     }
     /** Extracts the subject, logging a broken credential store once (BEH-QD-175, BEH-QD-321). */
     export const identifyRequest = Effect.fn("qadi.http.identifyRequest")(
       function* (request: HttpServerRequest.HttpServerRequest) {
         const subject = yield* SubjectExtractor.extract(request);
         return { subject } satisfies IdentifiedRequest;   // or a typed const; no `as`
       },
       (self) => self.pipe(Effect.tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)),
     );
     ```
     `AuthorizedRequest<P, A> extends IdentifiedRequest`. `authorizeRequest`'s body becomes
     `const { subject } = yield* identifyRequest(request)`, and its outer pipe drops the
     `"SubjectExtractionFailed"` tap (else every extraction failure logs twice — the existing
     "an extraction failure logs one line and never loads the resource" test catches it).
     `serveRequest`: the three function-declaration overloads of S7 (§1 C6) — two public signatures and one
     implementation typed on `unhandled | HttpEnforcementFailure` — whose body is
     `who.pipe(Effect.flatMap((x) => handler(x).pipe(Effect.provideService(CurrentSubject, x.subject), Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenialAt("handler")))), Effect.catchTag(HTTP_ENFORCEMENT_TAGS, answer))`.
  3. Doc comments (AGENTS.md doc-comment shape): one-line summary first. `serveRequest`'s rationale
     paragraph says why it takes the handler (ARCH-19 D-19-a's rejection was over an open error; the two
     closed residuals are the only error shapes a surface hands it), why the tap is on the handler only
     (an edge denial is already logged by the who-step), why the catch wraps both (ARCH-19 C6a: a
     handler-raised failure is projected, never escapes undeclared), and the "resolve your own failures
     first" rule `GuardRoute.ts` states. Rewrite the module doc: two steps, which surfaces use which.
  4. `QadiHttpError.ts`: `toResponse`'s and `logSubjectExtractionFailed`'s doc comments name
     `identifyRequest` as the step that logs. `DenialLog.ts`'s doc: "the surface" → "`serveRequest`, for
     the surface".
- **Tests:** T5 green; the new runtime cases; all eight existing `authorizeRequest` cases unchanged.
- **Verify:** `pnpm vitest run packages/http/test/AuthorizeRequest.test.ts`; `pnpm test:tstyche`;
  `pnpm tsc -b packages/http`; `pnpm circular`; `node scripts/check-house-style.mjs`
- **Done when:** green, and `grep -n "logSubjectExtractionFailed" packages/http/src` → the definition and `identifyRequest` only.

### T7 — Each surface supplies only its answer
- **Status:** [x] done
- **Depends on:** T6 (and T2, T4 merged or rebased in)
- **Files:** `packages/http/src/GuardRoute.ts`; `packages/http/src/RequirePermissionMiddleware.ts`;
  `packages/http/src/PortRoutes.ts`; `packages/http/test/http.test.ts` (one comment)
- **Steps:**
  1. `guardRoute`: `(request) => serveRequest(authorizeRequest(permission, policy, loadResource)(request), ({ authorized, resource }) => handler(authorized, resource), (error) => Effect.succeed(toResponse(error)))`,
     keeping the declared return type verbatim (C7). Drop the `CurrentSubject`, `ENFORCEMENT_DENIAL_TAGS`,
     `logDenialAt`, `HTTP_ENFORCEMENT_TAGS` imports. The doc's open-error paragraph stays (it is now the
     rule `serveRequest`'s overloads enforce) and points at `serveRequest`.
  2. `enforce`: `Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => serveRequest(authorizeRequest(permission, policy)(request), () => httpEffect, (error) => Effect.fail(projectHttpEnforcementFailure(error)))).pipe(Effect.provide(evaluationServices))`.
     The `httpEffect` parameter keeps its widened annotation (overload 2 is selected by it).
  3. `Public` arm: `serveRequest(Effect.succeed(ANONYMOUS_REQUEST), () => httpEffect, (error) => Effect.fail(projectHttpEnforcementFailure(error)))`
     with a module-private `const ANONYMOUS_REQUEST: IdentifiedRequest = { subject: anonymous }`. This
     replaces T4's tap and adds the in-channel projection (C3). Remove `refuse`'s no-op
     `Effect.provideService(CurrentSubject, anonymous)` (C5) and correct its comment ("the public
     pass-through provides `anonymous`"; refusal runs no handler). Drop now-unused imports
     (`CurrentSubject`, `ENFORCEMENT_DENIAL_TAGS`, `logDenialAt`, `HTTP_ENFORCEMENT_TAGS`).
  4. `portRoutesUnguarded`: the route body becomes
     `Effect.flatMap(HttpServerRequest.HttpServerRequest, (request) => serveRequest(identifyRequest(request), () => Effect.map(Effect.flatMap(questionOf, answer), respond), (error) => Effect.succeed(toResponse(error))))`
     — the same handler `portRoutes` passes `addGuardedRoute`. Drop the `SubjectExtractor`, `CurrentSubject`
     and T2's `logSubjectExtractionFailed` imports.
  5. `http.test.ts`'s `WriteRoute` fixture: one comment above its in-handler `catchTag` saying it pins that
     a handler *may* answer its own failure (and so logs nothing for it); not a pattern to copy.
- **Tests:** unchanged suites stay green: `http.test.ts`, `PortRoutes.test.ts` (T1 included),
  `decisionStream.test.ts`, `decisionBacklog.test.ts`, `GuardApi.test.ts`, `RequirePermissionClient.test.ts`,
  `endpointAccess.test.ts`; `GuardRoute.tst.ts`, `RequirePermission.tst.ts`, `GuardApi.tst.ts`,
  `DecisionStreamRoute.tst.ts` unchanged.
- **Verify:** `pnpm vitest run packages/http`; `pnpm test:tstyche`; `pnpm tsc -b packages/http`;
  `pnpm circular`; `node scripts/check-house-style.mjs`; the C4 grep (§2 criterion 3, 4)
- **Done when:** green; §2 criteria 3 (grep half) and 4 hold.

### T8 — Gate it: `edge-step-owns-identity`
- **Status:** [x] done
- **Depends on:** T7; D-47-c
- **Files:** `scripts/check-house-style.mjs`
- **Steps (A):**
  1. Add a check scoped to `packages/http/src/**/*.ts` (not a `RULES` entry: those apply to every package,
     and `@qadi/promise`/`@qadi/react` provide `CurrentSubject` legitimately — C4's table), next to the
     `devtools-named-barrel` check, run on comment-stripped lines. Patterns:
     `/\bSubjectExtractor\.extract\s*\(/`, `/\btapErrorTag\s*\(\s*ENFORCEMENT_DENIAL_TAGS\b/`,
     `/\btapErrorTag\s*\(\s*"SubjectExtractionFailed"/`, `/\bcatchTag\s*\(\s*HTTP_ENFORCEMENT_TAGS\b/`,
     `/\bprovideService\s*\([^)]*\bCurrentSubject\b/`. Allowed file:
     `packages/http/src/AuthorizeRequest.ts` (fail with `[stale-exemption]`-style wording if it does not
     exist). Message: `[edge-step-owns-identity] … identify through identifyRequest and serve through serveRequest (BEH-QD-321, ADR-QD-036 Rev 1.8); a hand-written copy forgot its log once (ARCH-47 C2).`
  2. Prove it bites: temporarily restore `portRoutesUnguarded`'s pre-T7 body on the branch, run the gate,
     see it fail naming `PortRoutes.ts`, revert. Note the run in §10.
  3. Doc comment above the check in the script's header list (the file documents each rule there).
- **Tests:** the gate itself; no runtime test.
- **Verify:** `node scripts/check-house-style.mjs`
- **Done when:** green on the branch; red on the planted copy.

### T9 — Examples and website
- **Status:** [x] done
- **Depends on:** T7
- **Files:** `apps/website/src/content/docs/docs/packages/http.md` (§ "Building your own surface", § "Subject extraction"); `apps/website/src/content/docs/docs/concepts/enforcement.md` (verify only);
  `examples/http-advanced/server.ts`, `examples/nextjs-newsroom/src/server/api.ts` (verify only)
- **Steps:**
  1. "Building your own surface": state the two steps and show
     `serveRequest(authorizeRequest(readPermission, hasPermission(readPermission))(request), ({ subject }) => Effect.succeed(HttpServerResponse.text(\`hello ${subject.id}\`)), (error) => Effect.succeed(toResponse(error)))`
     in the compiled ` ```typescript ` fence, plus one sentence: a surface that needs only *who* (no
     permission) passes `identifyRequest(request)` instead. Keep "It registers nothing".
  2. "Subject extraction": one sentence that a failed extraction is logged once with its reason on every
     route, guarded or not.
  3. Examples need no edit (no hand extraction); compile them:
     `node_modules/.bin/tsc -p examples/http-advanced/tsconfig.json --noEmit` (not in any gate, ARCH-36 C15);
     the newsroom is gate 15.
- **Tests:** gate 23 compiles the fence.
- **Verify:** `node scripts/check-website-doc-examples.mjs`; `pnpm --filter @qadi/example-nextjs check` (or rely on `pnpm check`)
- **Done when:** green.

### T10 — Spec, overview, traceability, ADRs, changeset
- **Status:** [x] done
- **Depends on:** T7 (T8 for the ADR's rule sentence)
- **Files:** `spec/behaviors/23-http.md`, `spec/behaviors/34-remote-ports.md`,
  `spec/decisions/036-qadi-http-package-shape.md`, `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md`,
  `spec/decisions/index.yaml` (only if the amendment needs a row), `spec/overview.md`, `spec/traceability.md`,
  `spec/README.md` (CCR register), `.changeset/edge-step-owns-the-request.md` (*new*),
  `.changeset/http-edge-step.md` (migration line, see step 6)
- **Steps:** as §8, using `node scripts/next-id.mjs` / `node scripts/spec-revise.mjs` for CCR numbers and
  revision bumps when the work lands (placeholders `CCR-QD-NEXT`, `ADR-QD-036 Rev 1.8` until then).
- **Tests:** gates 9, 10, 13.
- **Verify:** `node scripts/check-api-surface.mjs`; `bash spec/scripts/verify-traceability.sh --strict`;
  `node scripts/check-doc-examples.mjs`
- **Done when:** green.

### T11 — Mutation and the full gate
- **Status:** [x] done
- **Depends on:** T8, T9, T10
- **Files:** tests only, if a survivor needs one
- **Steps:**
  1. `pnpm exec stryker run stryker.http.mjs` (or `pnpm mutation` scoped by the config). Read every
     survivor in `AuthorizeRequest.ts`, `GuardRoute.ts`, `PortRoutes.ts`, `RequirePermissionMiddleware.ts`.
     Expected killers: removing the handler tap (T6's "logged once, handler"), moving the tap onto `who`
     (the "edge denial not logged twice" case), removing `provideService` (the handler-sees-subject case),
     removing `identifyRequest`'s tap (T1 and `AuthorizeRequest.test.ts`), swapping the `catchTag` to wrap
     the handler only (T5's type tests + an edge-denial answered case).
  2. `pnpm check`.
- **Tests:** any killer a survivor shows is missing, added test-first.
- **Verify:** `pnpm check`
- **Done when:** `pnpm check` green; stryker http ≥ 80 with no new survivor in the four files.

## 7. Test strategy

- **Survive unchanged** (the regression oracle): every `http.test.ts` exact-log test, the two
  handler-scope characterizations ("still projected to its redacted wire value", "logged once, as the
  handler's", "which step raised the denial"); all eight `AuthorizeRequest.test.ts` cases; the recheck
  line tests in `decisionStream.test.ts`; `GuardRoute.tst.ts`, `AuthorizeRequest.tst.ts` (extended, not
  edited), `RequirePermission.tst.ts`, `GuardApi.tst.ts`, `DecisionStreamRoute.tst.ts`. If any of these
  needs editing to pass, the refactor changed behavior — stop and re-read C7.
- **Move to the new interface:** the order/scope/log-placement assertions now owned by `serveRequest` are
  tested against it directly in `AuthorizeRequest.test.ts` (plain effects, no router), the same
  "step directly, surfaces in `http.test.ts`" split ARCH-19 set. The surface tests keep only their answer
  (status, body, projection).
- **Delete:** nothing. No existing test is redundant after the move: each surface test pins a status or
  body the step cannot know. (Replace, don't layer: the new step tests replace nothing because the tail
  had no direct tests — it was only observable through the surfaces.)
- **New:** T1 (2), T3 (2), T5 (~7 type), T6 (~7 runtime). Defect tests (T1, T3) are red first.
- **Property / differential:** none warranted — the step is a fixed pipeline over a closed error union; the
  "every tag" coverage already lives in `fixtures/everyHttpEnforcementFailure.ts` (`QadiHttpError.test.ts`
  answers each of the twelve). Optional: run `everyHttpEnforcementFailure` through `serveRequest` with a
  handler that fails with each, asserting `answer` saw it and exactly the two denial tags logged — a cheap
  table test, and it reuses the budgeted fixture without constructing new port errors.
- **Mutation:** gate 21 (`stryker.http.mjs`, break 80) covers all four edited files; T11's list names the
  mutants each new test exists to kill.
- **Types:** tstyche (gate 6) carries the overload contract, with `expect(...).type.not.toBeCallableWith`
  for the refusal (the form `Matcher.tst.ts` and `Retention.tst.ts` use). A `@ts-expect-error` in a
  runtime test (as `endpointAccess.test.ts` does) would also work but proves less: it passes on any error.

## 8. Spec and documentation updates

- **`spec/behaviors/23-http.md` (Rev 1.10 → 1.11), BEH-QD-321:**
  - Signature listing (` ```ts `, not compiled): add `IdentifiedRequest`, `identifyRequest`,
    `serveRequest` (both overloads), `AuthorizedRequest extends IdentifiedRequest`.
  - First requirement: "Every `@qadi/http` surface that reads a subject (`RequirePermission`, including a
    `publicEndpoint`; `addGuardedRoute`; `portRoutesUnguarded`; the decision stream's recheck) MUST obtain
    it through `identifyRequest` — directly, or through `authorizeRequest`, which is built on it; none MAY
    extract a subject, provide `CurrentSubject`, or call `guard` for the edge check itself."
  - New requirement: "A surface that runs a handler MUST run it through `serveRequest`, which provides the
    subject as `CurrentSubject` to the handler only, logs a denial the handler's own `guard` raises once
    (annotated `"handler"`), and answers every `HttpEnforcementFailure` from either step through the
    surface's `answer`."
  - Logging requirement: name `identifyRequest` (extraction) and `serveRequest` (handler site) as the
    steps; drop "the surface (`RequirePermission`, `addGuardedRoute`)".
  - Prose: the two-step split; why `serveRequest` takes the handler where D-19-a rejected a continuation
    (closed residuals, C6); C2 and C3 as the two places the hand-written tail was missing, and the rule
    (D-47-c) that now refuses a third.
- **`spec/behaviors/34-remote-ports.md` (Rev 1.0 → 1.1):** one paragraph after the example: both forms
  identify through `identifyRequest`, so a failed extraction is 502 with its reason logged once
  (BEH-QD-321); the unguarded form's construction warning is in addition to it.
- **`spec/decisions/036-qadi-http-package-shape.md` (Rev 1.7 → 1.8):** Change History row; in the decision
  body after Rev 1.5's "both reach it through `authorizeRequest`": "(Rev 1.8: and serve the handler through
  `serveRequest`; a surface with no permission — an unguarded route, a public endpoint — identifies through
  `identifyRequest`, so every path to a subject logs a broken credential store and a handler's own denial
  the same way. `@qadi/http`'s house-style check refuses a hand-written copy.)"
- **`spec/decisions/107-…md`:** Change History row (amended); one sentence in the route bullet:
  "`portRoutesUnguarded` identifies through `identifyRequest` like every other route (ARCH-47)."
- **`spec/overview.md`:** new row `identifyRequest`, `IdentifiedRequest`, `serveRequest` (function + type,
  `AuthorizeRequest.ts`, BEH-QD-321, ADR-QD-036 Rev 1.8); `authorizeRequest` row: "built on
  `identifyRequest`; a surface serves its handler through `serveRequest` and keeps only its answer";
  `logSubjectExtractionFailed`: "wired by `identifyRequest`"; `logDenial`: "by `serveRequest`, for every
  surface that runs a handler (including a `publicEndpoint`)"; `portRoutes…` row: "both forms identify
  through `identifyRequest`". Change History row.
- **`spec/traceability.md`:** BEH-23 row's source list unchanged in shape (files already listed;
  `PortRoutes.ts` added); `AuthorizeRequest.test.ts` row gains "`identifyRequest` and `serveRequest`";
  `PortRoutes.test.ts` row gains BEH-QD-321 and BEH-QD-175 ("a failed extraction on both forms"); new row
  for `packages/http/test/ServeRequest.tst.ts` (BEH-QD-321); `http.test.ts` row: "a public endpoint's
  handler denial". Change History row.
- **`spec/README.md`:** CCR-QD-NEXT register row (ARCH-47: the edge step owns the whole request; two
  defects fixed; ADR-036 Rev 1.8, ADR-107 amended; BEH-23 Rev 1.11; BEH-34 Rev 1.1).
- **No invariant change** (§3).
- **Website:** T9.
- **Changesets:** T2 and T4 each a `patch` for `@qadi/http` (defects; shippable alone). The refactor:
  `.changeset/edge-step-owns-the-request.md`, `"@qadi/http": minor`, **not breaking**: "Added
  `identifyRequest`, `IdentifiedRequest` and `serveRequest`: the two steps every `@qadi/http` surface goes
  through. A surface built on `authorizeRequest` can now serve its handler with `serveRequest` and get the
  same handler-denial log and answer every built-in route has. `AuthorizedRequest` extends
  `IdentifiedRequest`. A `publicEndpoint`'s handler failures are now projected in-channel (the body is
  unchanged). Extraction gains a `qadi.http.identifyRequest` span under `qadi.http.authorizeRequest`."
  Optional, recommended: the unreleased `.changeset/http-edge-step.md`'s "Migration:" line points at
  `serveRequest` instead of the hand-written `catchTag` tail, since both ship in the same release (the
  wave-3/4 changesets are unreleased; editing one before release is a correction, not history).
- **Release:** none. A version-packages PR or publish needs the user's explicit go-ahead.

## 9. Risks and rollback

- **Double logging.** Moving the extraction tap from `authorizeRequest` into `identifyRequest` without
  removing the old one logs every extraction failure twice; placing `serveRequest`'s tap on `who` logs
  every edge denial twice. Both show as an exact-log test failure (`AuthorizeRequest.test.ts`,
  `http.test.ts`). Rollback: revert T6.
- **Overload drift.** A third residual (a future `HttpApi` error marker, or ARCH-49 changing what the
  middleware hands the step) would not match either overload and fail to compile at the call site — loud,
  not silent. If it happens, add an overload with its own tstyche case; do not reach for D-47-a's C.
- **`effect` upgrade changes `unhandled` or `tapErrorTag`'s typing.** T5's tstyche cases are the canary;
  `packages/http/test/v4-http-smoke.test.ts` is where an API pin belongs if one is needed.
- **The public arm's mechanism change** (encoder strip → in-channel `project`): bodies are byte-identical
  today (C3); T3's outage test and the `RequirePermissionClient.test.ts` decode round-trips pin it.
- **Public handlers keep the group layer's services** (non-goal): a deployment that relied on the captured
  `evaluationServices` reaching a public handler never had that; nothing changes. Recorded for ARCH-49,
  which owns the arms.
- **New span.** `qadi.http.identifyRequest` appears under `qadi.http.authorizeRequest` (and alone on the
  unguarded port route). No test asserts span names in `@qadi/http`
  (`grep -rn "qadi.http.authorizeRequest" packages/http/test` → nothing); a host's tracer sees one more
  child span per request.
- **Rule false positives.** `edge-step-owns-identity` runs on stripped lines in `packages/http/src` only;
  `RequirePermission.ts` mentions `provideService(CurrentSubject, subject)` in a comment, which stripping
  removes (verify in T8).
- **Sibling overlaps:**
  - **ARCH-49** (closed access plan; middleware looks it up) edits `RequirePermissionMiddleware.ts`'s
    dispatch. Land **ARCH-47 first** (the review's own ordering: "it also gives #4's access plan a single
    place to plug into"): ARCH-49's `Required`/`Public` entries then call `serveRequest` and carry no tail.
    If ARCH-49 lands first, T7 steps 2–3 move onto its arm names; nothing else changes.
  - **ARCH-57** (`addUnguardedRoute`, optional `addGuardedRoute` loader) should build `addUnguardedRoute`
    on `serveRequest(identifyRequest(request), handler, toResponse)`, and `portRoutesUnguarded` then becomes
    its caller. If ARCH-57 lands first with its own extraction, T8's rule fails it — which is the point;
    coordinate so ARCH-57 takes T6 as a dependency. Its optional loader changes `guardRoute`'s/`addGuardedRoute`'s
    signature, not the tail T7 rewrites.
  - **ARCH-54** (decision-stream protocol order) edits `DecisionStreamRoute.ts`; this plan does not touch
    it (the recheck stays `authorizeRequest`). The stream's connect path goes through `addGuardedRoute` and
    so through `serveRequest` after T7 — no edit on either side.
  - **ARCH-55** (named-export core barrel): `ENFORCEMENT_DENIAL_TAGS`, `CurrentSubject`, `anonymous` must
    stay exported from `@qadi/core`'s root; they are used across the package boundary today.
- **Rollback.** T2 and T4 are independent patches. T5–T11 revert as one branch; the public additions are
  additive, so reverting before a release removes them cleanly (and their gate-13 rows with them).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ---- | -- |
| 2026-10-13 | — | plan written; evidence verified at `b655b3b` (probes under `scratchpad/wave5/ARCH-47/`: `probe-unlogged-502.mts`, `probe-public-handler-denial.mts`, `probe-public-handler-outage.mts`, `shapes.ts`); baseline `pnpm vitest run packages/http` 10 files / 227 tests green | planner |
| 2026-10-13 | T0-T11 | implemented on wave5 branch as one commit; defect patches folded in; CCR-QD-383; stryker http not run | wave5 agent |
