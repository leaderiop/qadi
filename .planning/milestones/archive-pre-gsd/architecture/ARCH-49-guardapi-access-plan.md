---
id: ARCH-49
title: guardApi builds a closed access plan from the API value it was given; the RequirePermission middleware only looks an endpoint up in it and answers
strength: Strong   # from the 2026-10-13 architecture review (wave 5, card 4); the probe in §1 found a live defect the card did not name, which raises the case
status: superseded-by-phase-11
disposition: "ported by Phase 11 (ARCH-59; SEC-05, SEC-06) from rescue/wave5-1013 2ea89d6; was `done` on the unmerged branch only (wave 6, 2026-11-10)"
evidence_verified_at: b655b3b
depends_on: []             # ARCH-18 and ARCH-36 are done and are built on, not redone. ARCH-47 (soft): same middleware module, see §4 "Ordering"
blocks: []
adrs_touched:
  - ADR-QD-036 (amend, Rev 1.8: the HttpApi half reads each endpoint's access once, at layer build, into one plan that both registers and enforces; membership is by the API *value* guardApi walked, not by identifier strings; if D-49-b = A, an undeclared endpoint is refused at layer build rather than with a 500 per request)
  - ADR-QD-075 (constraint: the `RequirePermission` class, its `error:`/`clientError`/`requiredForClient`, and `HttpApiMiddlewareClient.ts` with `ANY_BUDGET` = 7 are untouched)
  - ADR-QD-081 (constraint: a new refusal, if any, is a wiring mistake answered outside `ENFORCEMENT_ERROR_WIRE`, like `MisplacedAccessDeclaration` and `RequirePermissionNotAttached`)
  - ADR-QD-099 (constraint: the new `AccessPlan.ts` is package-private, not in the barrel; if D-49-c = A, `endpointAccess`/`EndpointAccess`/`misplacedDeclarations` leave the barrel — none of them has ever been published)
  - ADR-QD-037 (constraint: madge counts type-only edges; the refusal classes must live in `AccessPlan.ts`, not `GuardApi.ts`, or the middleware's type import of the plan closes a cycle)
  - ADR-QD-038 (constraint: changeset in the fixed group; no release step — the open version PR must not be merged without the user's explicit go-ahead)
packages: ["@qadi/http", "examples/http-advanced (comment only)", "apps/website (docs)", "spec"]
estimate: M   # complete path T0–T8 ≈ 1½–2 days. Defect-only path (T0 + T1) ≈ 2–3 h (S)
---

# ARCH-49 — guardApi builds a closed access plan; the middleware only looks it up

## 1. Verified evidence (at `b655b3b`)

Checked on `main` at `b655b3b` (`git rev-parse --short HEAD`). Read-only: nothing in the repository was
edited. Probes live in `scratchpad/wave5/ARCH-49/` (absolute:
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/f10e9d09-77ac-4671-a5f3-770ae101c6fe/scratchpad/wave5/ARCH-49/`),
with `node_modules` symlinked to `packages/http/node_modules`, a `vitest.config.ts` aliasing `@qadi/core`
and `@qadi/testing` to their `src/index.ts`, and run with the repo's own binary
(`/Users/mohammadalmechkor/Projects/Perso/qadi/node_modules/.bin/vitest run --root . --silent=false --reporter=verbose`;
`npx vitest` resolves a second vitest and `@effect/vitest`'s `describe` fails with "reading 'config'").
`collision.probe.ts` and `prefix.probe.ts` import `@qadi/http` by absolute path to
`packages/http/src/index.ts`. A second directory, `spike/`, is a copy of `packages/http/{src,test}` with the
proposed design applied (§1 "Spike"). The scratchpad is ephemeral; T0 re-creates the probes from the code
quoted in T1.

> Hygiene note for whoever re-runs a type spike: the first `tsc -p` over the spike (the installed `tsc` is
> `7.0.2+effect-tsgo`) emitted 154 `.d.ts`/`.d.ts.map` files into `packages/core/src` and `packages/http/src`
> despite `noEmit`, because the config carried an error (`baseUrl`). They were deleted (all timestamped
> 00:53:47, `git status` clean afterwards). Give any spike tsconfig an `outDir` inside the scratchpad.

| # | Review claim | Verdict | How it was settled |
| - | ------------ | ------- | ------------------ |
| C1 | `walkApi` (`GuardApi.ts`) reads every endpoint's access and every group's misplaced declarations at build time, then hands the middleware only `members: ReadonlySet<string>` of `"<group>/<endpoint>"` keys | **CONFIRMED** | `GuardApi.ts` — `WalkedApi` (`:105-109`), `walkApi` (`:126-163`): `misplacedDeclarations(api.annotations)` and per-group in `onGroup`, the attachment check and `Match.valueTags(endpointAccess(endpoint.annotations), …)` in `onEndpoint`, `members.add(\`${group.identifier}/${endpoint.identifier}\`)` (`:143`); `guardApi` (`:183-197`) returns `makeRequirePermission(walked.members)` (`:195`). |
| C2 | Per request the middleware reads all of it again: membership, `misplacedDeclarations(group.annotations)`, then `endpointAccess(endpoint.annotations)` | **CONFIRMED that it reads it all again; REFUTED that it is per request** | The re-read is real: `RequirePermissionMiddleware.ts` — the `middleware` closure (`:113-153`) does `members.has(…)` (`:118`), `misplacedDeclarations(group.annotations)` (`:129`), `endpointAccess(endpoint.annotations)` (`:142`). But Effect calls that closure **once per endpoint, when `HttpApiBuilder.group` builds its routes**, not per request: `node_modules/effect/src/http-api/HttpApiBuilder.ts` — `group` (`:130-170`) → `handlerToRoute` (`:917`) → `handlerToHttpEffect` (`:823`) → `applyMiddleware` (`:931-945`) calls `apply(handler, { group, endpoint })` and returns the wrapped effect. Probe `collision.probe.ts` "dispatch runs once per endpoint at build": a counting wrapper around the provided middleware reports **`CALLS after 5 requests: 1`**. Only the *refusal* runs per request (its `Effect.logError` is inside the returned effect). So the case for this plan is locality, one reading and the test surface — not request cost. |
| C3 | The group-misplaced branch is unreachable through `guardApi`, because a misplaced group fails the layer build | **CHANGED — unreachable for the API `guardApi` was given; reachable through the defect in C11** | A misplaced group makes `walkApi` fail (`:138-140`, `:160-162`), so the branch never runs for `guardApi(api)` served by `HttpApiBuilder.layer(api)`. But the membership check compares identifier strings, so `guardApi(A)` provided to `HttpApiBuilder.layer(B)`, where B has a group `"g"` with endpoint `"read"` like A's and B's group carries a `RequiredPermission`, passes membership and reaches the branch: probe B3 → `500` with log `qadi/http: group "g" carries RequiredPermission, which only an endpoint may declare, so endpoint "read" is refused. …`. Under the plan in §2 that request is refused one step earlier, as not in the plan, and the branch is gone. |
| C4 | Key format written three times: `GuardApi.ts` `onEndpoint`, middleware `members.has(...)`, and the test's own `memberKeys` | **CONFIRMED** | `GuardApi.ts:143`, `RequirePermissionMiddleware.ts:118`, `test/endpointAccess.test.ts` — `memberKeys` (`:68-79`, `keys.add(\`${group.identifier}/${endpoint.identifier}\`)` at `:75`). `git grep -n 'identifier}/\${' packages/http` → exactly these three. |
| C5 | The test imports package-private `makeRequirePermission` and builds a `bareMiddleware` to see what the middleware does with a placement `guardApi` would refuse | **CONFIRMED** | `endpointAccess.test.ts:32` (`import { makeRequirePermission } from "../src/RequirePermissionMiddleware.ts"`), `bareMiddleware` (`:85-87`), used by `observe` (`:134`) for every placement. ARCH-36's progress log (row T3–T5) records why: cases 8–10 cannot be passed to `guardApi`. Five tests assert request-time behavior of placements `guardApi` refuses to build: "a group requirement over a public endpoint is refused…" (`:348-356`), "a group requirement refuses every endpoint under it…" (`:358-375`), "a group-level publicEndpoint is refused by both readers" (`:377-387`), "an api-level requirement … the middleware cannot serve it" (`:389-401`), "a group requirement over an endpoint requirement…" (`:403-408`). |
| C6 | An `Undeclared` endpoint is visible at build time (`Undeclared: () => {}` in the walk) yet refused only per request with a 500 | **CONFIRMED** | `GuardApi.ts:156`. Probe "undeclared endpoint builds, then 500 per request": `guardApi(U)` builds, two requests → `[500, 500]` and **two** error log lines (one per request). Pinned today by `http.test.ts` — the `forgotten` endpoint in `DocumentsGroup` (`:98-100`, handler `:109`) and two tests, "AN ENDPOINT DECLARING NEITHER IS REFUSED, not served" (`:215-229`) and "an endpoint declaring neither logs the wiring mistake it refuses for, exactly" (`:808-827`). |
| C7 | `endpointAccess` / `misplacedDeclarations` are exported publicly; check overview rows and outside users | **CONFIRMED exported, and never released** | Barrel `index.ts:15` `export * from "./RequirePermission.ts"`; `spec/overview.md:586-587` rows. `git grep -nE "endpointAccess\|misplacedDeclarations\|EndpointAccess\b\|AccessDeclarationKey" -- . ':!packages/http/src'` → only `packages/http/test/endpointAccess.test.ts`, `spec/` (BEH-QD-320 fence, INV-QD-034/180 Source, overview, traceability, README CCR row) and the pending changeset `.changeset/endpoint-access.md`. No use in `examples/`, `apps/website`, `features/`, `scripts/`. **Release state:** the last published `@qadi/http` is `0.11.0` (`npm view @qadi/http versions`); its barrel at `d0884e6` has neither `GuardApi.ts` nor `endpointAccess` (`git show d0884e6:packages/http/src/RequirePermission.ts \| grep -c endpointAccess` → 0). `guardApi`, `endpointAccess`, `misplacedDeclarations`, `EndpointAccess`, `AccessDeclarationKey`, `ApiGuardRefusal` and both refusal classes are **unreleased**; they ship with the open version PR `origin/changeset-release/main` (`a29bf80`, `@qadi/http` → `0.12.0`, based on `b655b3b`). |
| C8 | How Effect's HttpApi middleware receives group/endpoint identity per request, and whether the lookup key can be derived from the same values the walk saw | **SETTLED — the very same objects** | Middleware options are `{ group: api.groups[id], endpoint: group.endpoints[id] }` of the API passed to `HttpApiBuilder.group` (`HttpApiBuilder.ts` `group` `:150`, `registerHandler` `:671`, `applyMiddleware` `:937`); `HttpApiTest.groups` does the same (`HttpApiTest.ts:70-87`). `HttpApi.reflect` (`HttpApi.ts:254-309`) hands `onEndpoint` the same `self.groups[…]` / `group.endpoints[…]` objects. Both sides type them `HttpApiGroup.Top` / `HttpApiEndpoint.Top` (`HttpApiMiddleware.ts:70-71`, `HttpApi.ts:268-269`), so a `Map` keyed by them needs no cast (spike compiles with zero `as`/`any`). `HttpApi.annotate` keeps the group objects (`HttpApi.ts:190-195`); `prefix`, `middleware` and `addHttpApi` build new ones (`:160-188`). |
| C9 | Can "anything not in the plan" actually occur? | **YES, three ways; one more cannot be seen by any middleware** | (a) `guardApi(A)` provided to `HttpApiBuilder.layer(B)` with different identifiers — pinned today by `GuardApi.test.ts` "refuses an endpoint outside the API it was built for" (`:185-211`); (b) the same with colliding identifiers (C11); (c) `guardApi(A)` with `HttpApiBuilder.layer(A.prefix("/v1"))` (C12). Not visible: an API B whose endpoints carry no `RequirePermission` at all — Effect never calls the middleware for them, so `guardApi(A)` provided there is inert. That residual is D-36-a's, not this plan's (§3). |
| C10 | `misplacedDeclarations`/`endpointAccess` should run once at build, in one module | **CONFIRMED feasible** | Spike: both readers move to a package-private `AccessPlan.ts`; the middleware imports only the plan's *type*; `madge --circular --extensions ts src` → "No circular dependency found". |
| C11 | *(new)* **Defect:** the membership refusal is keyed by identifier strings, so an API that reuses a group/endpoint identifier pair defeats it | **CONFIRMED — live on `main`, unreleased** | `collision.probe.ts`, A = group `g`, endpoint `read`, `GET /a`, requires `document:read`; each B reuses `g`/`read` at `GET /b`; `HttpApiBuilder.layer(B)` with `Layer.provide(guardApi(A))`. **B1** (B's endpoint public): `/b` anonymous → **204**, `/__permissions` → `[{document:read, [GET /a g]}]` (`/a` is not served: 404). **B2** (B's endpoint requires `document:write`): `/b` → anonymous 403, reader 403, writer **204** — enforced `document:write` on `/b`, while the registry lists only `GET /a` under `document:read`. **B3**: B's group misplaced → 500 from the group branch (C3). **B4** (B carries an API-level `RequiredPermission`, endpoint public): `/b` anonymous → **204**, whereas `guardApi(B4)` itself refuses to build with `MisplacedAccessDeclaration` — the API-level declaration ARCH-18 refuses is silently ignored. Every B violates BEH-QD-328's third REQUIREMENT ("MUST NOT serve … an endpoint that is not part of the API `guardApi` was given") and INV-QD-180 (B2: enforced and not listed). Plausible trigger: versioned APIs (`v1`/`v2` sharing group and endpoint names) or an API built by a factory. |
| C12 | *(new)* `guardApi(A)` serving `A.prefix("/v1")` | **CONFIRMED — low** | `prefix.probe.ts`: `A.groups.g === P.groups.g` → `false`; `/v1/a` as a reader → 204 (enforced), `/__permissions` lists `GET /a` — a path nothing serves. The listed permission is right, the listed path is wrong. |
| C13 | ARCH-18 / ARCH-36 must not be redone | **CONFIRMED — reused** | ARCH-18 (done): one scope (endpoint only, D-18-a = B), the refusal of group/API declarations (D-18-b), `AnnotatedEndpoint` narrowing (D-18-d). ARCH-36 (done): `guardApi` as the only way to obtain the middleware (D-36-a/b), attachment refusal compile-time + build (D-36-d), request-time 500 for an endpoint outside the API (D-36-e, kept and made exact here), "first misplaced, then first unattached" precedence. This plan reverses one decided item only if D-49-c = A: **D-18-c** (`endpointAccess` exported). |

**Spike** (`scratchpad/wave5/ARCH-49/spike/`, a copy of `packages/http/{src,test}`): `AccessPlan.ts` with
`planApi(api): Result.Result<AccessPlan, ApiGuardRefusal>` and
`AccessPlan = { registrations; accessOf(group, endpoint): PlannedAccess | undefined }` over a
`Map<HttpApiGroup.Top, Map<HttpApiEndpoint.Top, PlannedAccess>>`; `guardApi` registers from
`plan.registrations` and passes the plan to `makeRequirePermission(plan)`; the middleware is
`accessOf` → `undefined` ⇒ refuse, else `Match.valueTags(access, { Public, Required })`; `Undeclared`
refused at build as a third `ApiGuardRefusal` member. Results: the copy type-checks with no `as`/`any`
(the only errors are the eight pre-existing `Response.json()` → `unknown` ones the scratch environment
also shows on the untouched copy); **202 of 204 http tests pass unchanged** once `forgotten` is removed from
`http.test.ts`'s fixture — the two failures are exactly the two `forgotten` tests C6 names, which T3 moves;
B1/B2/B3 and the prefix case all answer **500** with the membership log; the undeclared API fails to build
with the new refusal; `CALLS after 5 requests: 1` is unchanged.

A runtime-enumerated placement differential (loop over declaration × middleware placement) does **not**
type-check against `guardApi` — the compile-time attachment check (`EveryEndpointGuarded`) rejects the
union of built API types, as designed (spike `test/enumerated.test.ts`, TS2345). The placement
differential therefore stays a hand-written table (§7).

## 2. Goal and success criteria

**Goal.** Today the `RequirePermission` middleware is a shallow module with a leaky interface: it takes a
set of identifier strings and then re-derives, from annotations, facts `guardApi`'s walk already computed
and threw away — membership, misplacement, and each endpoint's declaration. The two halves of one
decision ("what does this endpoint get?") live in two modules, joined by a key format spelled three times,
and the join is wrong (C11). This plan makes `planApi` the one deep module that reads an `HttpApi` value:
its interface is a closed **access plan** — for each endpoint value it walked, `Required(requirement)` or
`Public(declaration)` (plus `Undeclared` only if D-49-b keeps the request-time refusal) — and the
registrations that follow from it. Its implementation hides the endpoint-only scope rule, the misplaced
and attachment refusals and their precedence, and the identity map. `guardApi` becomes a thin adapter
(plan → fail or register → middleware), and the middleware's dispatch shrinks to *look up, then answer*;
an endpoint value not in the plan is refused. The seam is the plan value: the walk is the only reader of
annotations, so listing and enforcement have one source by construction (locality), and tests exercise
the whole path through `guardApi` and a request — the interface — rather than reaching past it into
`makeRequirePermission`. Leverage: a future reader (a docs or OpenAPI lint, or ARCH-47's edge step) gets
the decided access from one value instead of re-reading annotations.

**Success criteria**

1. No identifier key format anywhere: `git grep -n 'identifier}/\${' packages/http` → 0 hits.
2. The middleware reads no annotations: `grep -nE "annotations|endpointAccess|misplacedDeclarations" packages/http/src/RequirePermissionMiddleware.ts` → 0 hits.
3. Tests cross the interface only: `git grep -n "makeRequirePermission\|RequirePermissionMiddleware" packages/http/test` → 0 hits.
4. The defect is closed: `GuardApi.test.ts`'s "the plan is the API value it was built from" cases (T1) answer
   500 with the membership log for B1, B2, B3, B4 and the prefixed API, and `/__permissions` is unchanged by them.
5. Every placement is decided once: `pnpm vitest run packages/http/test/accessPlan.test.ts` — for each placement,
   either the composed application fails to build with the named `ApiGuardRefusal` and the registry is empty,
   or the listed permission equals the enforced one for every path (INV-QD-180's differential, now through `guardApi`).
6. If D-49-b = A: an endpoint declaring neither fails `guardApi`'s build with `AccessNotDeclared` naming
   group and endpoint, and registers nothing; `GuardApi.tst.ts` pins `ApiGuardRefusal` as exactly three members.
7. If D-49-c = A: `endpointAccess`, `EndpointAccess`, `misplacedDeclarations` are not exported
   (`node scripts/check-api-surface.mjs` green with their rows removed); `AccessDeclarationKey` still is.
8. Gates: `node scripts/check-house-style.mjs` (budgets unchanged), `pnpm circular`, `pnpm test:tstyche`,
   `pnpm vitest run --project http` with coverage ≥ 90%, `stryker run stryker.http.mjs` ≥ 80, then `pnpm check`.

## 3. Non-goals

- **Listing `Public` or `Undeclared` endpoints in the registry.** BEH-QD-180 says the registry cannot list
  what is unguarded; ARCH-18 §9 and ARCH-36 §3 both deferred it. The plan makes it a one-line change later;
  it is not made here.
- **The handler half of the middleware** (`enforce`: extraction, `authorizeRequest`, the handler-denial log,
  projection). ARCH-47 owns it. This plan replaces only the dispatch in front of it and the factory's
  parameter; `enforce` and `refuse` move with zero edits.
- **Refusing at build an endpoint value outside the plan.** The middleware is called during
  `HttpApiBuilder.group`'s layer build (C2), but its signature returns the wrapped effect; the only way to
  fail that build from inside is a synchronous throw → a defect, which AGENTS.md §4 rules out on an
  enforcement path, and which would depend on an undocumented Effect evaluation order. D-36-e's 500 + log
  stays.
- **An API whose endpoints carry no `RequirePermission`, served with someone else's `guardApi`** (C9). Effect
  never calls the middleware, so nothing in it can refuse; and `guardApi(A)`'s registrations stay listed
  although A is not mounted (already pinned as accepted by `GuardApi.test.ts:205-209`). Closing both needs a
  served form that names the API once (ARCH-36 D-36-a option B, rejected 2026-10-08). Reported, not reopened.
- **Reporting every refusal at once.** `guardApi` keeps failing with the *first* refusal by precedence; an
  aggregate error is a different public type.
- **The `RequirePermission` class, `HttpApiMiddlewareClient.ts`, `passthroughClientLayer`** (ADR-075).
- **`addGuardedRoute` and `PermissionRegistry`'s shape.** ARCH-57 owns `addGuardedRoute`'s loader; the
  registry's `register`/`snapshot` interface is unchanged.

## 4. Constraints

- **AGENTS.md §1 Imports.** `effect` submodules as namespaces (`import * as Result from "effect/Result"`,
  `import type * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint"`); relative `.ts`; `import type`
  for the plan type in the middleware (it needs no value from `AccessPlan.ts`).
- **§4 Errors.** A new refusal (D-49-b = A) is `Data.TaggedError("AccessNotDeclared")`, unprefixed tag
  (`[no-prefixed-error-tag]`), with a `message` getter like its two siblings. It is not part of any codec, so
  `SCHEMA_ERROR_BUDGET` (core's `Errors.ts` only) is untouched. Handled with `Effect.catchTag` array form only.
- **§5 `Effect.fn`.** `planApi` is pure and synchronous (as `walkApi` is today), so it is a plain function
  returning `Result.Result`, not an Effect. `makeRequirePermission` stays
  `Effect.fn("qadi.http.makeRequirePermission")`. `UNTRACED_BUDGET` unchanged.
- **§5a Match.** Dispatch with `Match.valueTags` (two or three arms, exhaustive); no `switch`; `SWITCH_BUDGET` unchanged.
- **§6 Forbidden.** No `as`, `!`, `any`: the identity `Map` is keyed by `HttpApiGroup.Top`/`HttpApiEndpoint.Top`,
  the types both `HttpApi.reflect` and the middleware options carry (C8). `ANY_BUDGET` (= 7, `HttpApiMiddlewareClient.ts`) untouched.
  No `Record<string, unknown>` widening (user rule).
- **§9 / ADR-099 Barrels.** `AccessPlan.ts` is **not** added to `packages/http/src/index.ts`. `GuardApi.ts`
  re-exports by name what stays public from it (precedent: `RequirePermission.ts`'s `export { NO_RESOURCE } from`).
  `[barrel-order]` is unaffected.
- **ADR-037 madge.** Edges: `GuardApi.ts` → `AccessPlan.ts`, `RequirePermissionMiddleware.ts`, `PermissionRegistry.ts`;
  `RequirePermissionMiddleware.ts` → `AccessPlan.ts` (type only); `AccessPlan.ts` → `RequirePermission.ts`
  (values: `RequiredPermission`, `PublicEndpoint`, `RequirePermission.key`), `PermissionRegistry.ts` (type).
  The refusal classes must be declared in `AccessPlan.ts`: if they stayed in `GuardApi.ts`, `planApi` would
  import them from `GuardApi.ts`, which imports `AccessPlan.ts` — a cycle. Spike: clean.
- **ADR-081.** Refusals are wiring mistakes: a typed layer-build failure or a logged 500, never an
  `ENFORCEMENT_ERROR_WIRE` tag.
- **ADR-036 Rev 1.4–1.7.** Endpoint-only scope; group/API declarations refused; one enforcement path
  (`authorizeRequest`); handler-denial log at the surface; `guardApi` the only way to obtain the middleware.
  All kept.
- **§11 Spec is normative.** BEH-QD-174/180/320/328, INV-QD-034/180, ADR-036, traceability and overview
  change in the same commit as the behavior (T6).
- **Gates.** 4 (house style), 5 (madge), 6 (tstyche), 7 (coverage: `@qadi/http` ≥ 90%), 9/23 (compiled fences —
  the website's `guardApi` fence must still compile), 10 (traceability), 13 (`check-api-surface.mjs`),
  14 (`check-package-install.mjs`: its consumer fixture `HttpFixtureApi`, `scripts/check-package-install.mjs:536-550`,
  declares its one endpoint, so it still builds under D-49-b = A — re-check in T8), 21 (`stryker run stryker.http.mjs`, break 80).
- **Release.** Nothing here releases. The open version PR (`origin/changeset-release/main`, `0.12.0`) must
  not be merged on this plan's account; merging or publishing needs the user's explicit go-ahead.
- **Ordering with ARCH-47.** Both edit `RequirePermissionMiddleware.ts`: ARCH-47 the `enforce`/`refuse`/public
  pass-through *answers*, this plan the *dispatch* in front of them and `makeRequirePermission`'s parameter.
  Recommended order: ARCH-47 first (the review's top pick, with its own live defect), this plan's T2/T3 rebased
  on it; T1 is two lines in the dispatch and can land before or after either. Spec: both edit
  `spec/behaviors/23-http.md` and ADR-036 — whichever lands second takes the next revision number.

## 5. Decisions needed before work starts

### D-49-a — What the plan is keyed by (how the middleware finds an endpoint)

- **(A) The values `guardApi` walked: `Map<HttpApiGroup.Top, Map<HttpApiEndpoint.Top, PlannedAccess>>`
  (recommended).** The middleware is handed the very objects `HttpApi.reflect` yielded when it serves the same
  API value (C8), so a hit means "this exact endpoint, with these exact annotations and middleware, was vetted
  and planned". Fixes C11 and C12 by construction; no key format exists anywhere (criterion 1). Group then
  endpoint, not endpoint alone: Effect allows endpoint-level `.middleware(…)` (`HttpApiEndpoint.ts:219`), so one
  endpoint object can sit in two groups, and the registry descriptor carries the group. Cost: an application
  that passes `guardApi` a *structurally equal but different* API value (a factory called twice, or
  `Api` vs `Api.prefix(…)`) now gets the 500 + log on every endpoint instead of being served — loudly, on
  the first request, with a message that names the fix. No in-repo caller does this (`git grep -n "guardApi("`:
  every site passes the same const it serves).
- **(B) Identifier strings, written once** (an `endpointKey(group, endpoint)` helper in the plan module).
  Fixes the three spellings (C4) but not C11/C12: an identifier collision still serves an unvetted endpoint.
- **(C) Identifier key plus an identity check on hit**, so the refusal can say "an endpoint with the same
  identifiers but a different value". Same safety as A with a second key format kept only for a message; the
  message can be produced from the objects on a miss without it.

**Recommendation: (A).** `status: open`

### D-49-b — An endpoint that declares neither: refused at layer build, or per request?

- **(A) Refuse at build: `guardApi` fails with a third `ApiGuardRefusal` member (recommended).**
  `export class AccessNotDeclared extends Data.TaggedError("AccessNotDeclared")<{ readonly group: string; readonly endpoint: string }>`,
  message reusing today's text: `endpoint "<e>" of group "<g>" declares neither a permission requirement nor
  publicEndpoint(...), so guardApi refuses it. Annotate it with RequiredPermission, or with PublicEndpoint if it is
  meant to be reachable without authorization.` Precedence: misplaced (API, then groups) > unattached >
  undeclared, so an unattached undeclared endpoint is still reported as unattached (D-36-d's wording "every
  endpoint, declared or not"). `PlannedAccess` closes to `Required | Public`. Consistent with every other
  wiring mistake `guardApi` can see — ARCH-18 moved misplacement and ARCH-36 moved attachment to build
  for the reason this one applies: "the mistake surfaces when the application is built rather than as a 500
  on a first request" (`MisplacedAccessDeclaration`'s doc). The 500 is logged once per *request*, so today an
  undeclared endpoint is noise in production logs rather than a failed deploy. **Behavior change**:
  BEH-QD-174's first REQUIREMENT ("MUST be refused, with status 500") and INV-QD-034's Source change; an
  application that ships with one undeclared endpoint stops starting. Measured against `0.11.0` (the last
  release, where the 500 came from `RequirePermissionLive`) it is breaking → `minor` with a breaking note.
  Names considered: `AccessNotDeclared` (parallels `RequirePermissionNotAttached`), `UndeclaredEndpoint`,
  `EndpointAccessUndeclared`.
- **(B) Keep the request-time 500.** `PlannedAccess` stays `Required | Public | Undeclared` and the middleware
  keeps the `Undeclared` arm with its log. No behavior change; the plan still removes C2–C5 and C11. Leaves the
  one wiring mistake `guardApi` can see but does not refuse.

**Recommendation: (A)** — the complete option; (B) is a strict subset of the work. **Behavior change →
user sign-off.** `status: open`

### D-49-c — Do `endpointAccess`, `EndpointAccess`, `misplacedDeclarations` stay public?

- **(A) Remove the three from the barrel; keep `AccessDeclarationKey` as a type (recommended).** They become
  `AccessPlan.ts`'s private implementation. `AccessDeclarationKey` stays exported because it is the type of
  the public `MisplacedAccessDeclaration.key` field (re-exported from `GuardApi.ts`). **None of the three has
  ever been published** (C7), so if this lands before `0.12.0` no consumer migrates anything; after it, the
  removal is breaking. Reverses ARCH-18 **D-18-c** (decided 2026-10-07, "a consumer building docs or an
  OpenAPI lint needs exactly this reading"): no such consumer exists in or outside the repo, and if one appears
  the right export is the plan read over a whole API, not a per-scope reader that cannot see attachment,
  precedence or membership.
- **(B) Keep `endpointAccess`/`EndpointAccess` public (D-18-c's use case), make `misplacedDeclarations` private.**
  The plan module owns both readers either way; this only keeps a second, partial reading of the same
  annotations in the public interface.
- **(C) Keep all three public** (status quo).

**Recommendation: (A).** Reverses a decided decision → **user sign-off**; not breaking for any released
version if it ships before `0.12.0`. `status: open`

### D-49-d — Where the plan lives

- **(A) A package-private `AccessPlan.ts` (recommended).** Holds `planApi`, `AccessPlan`, `PlannedAccess`,
  the two readers (moved from `RequirePermission.ts`), `AccessDeclarationKey`, and the refusal classes and
  `ApiGuardRefusal` (moved from `GuardApi.ts`). `GuardApi.ts` keeps `guardApi`, `UnguardedEndpoints`,
  `EveryEndpointGuarded`, and re-exports the public names. One module owns "what does each endpoint of this
  API value get", the madge cycle is avoided (§4), and `RequirePermission.ts` goes back to being the
  declaration vocabulary (`RequiredPermission`, `PublicEndpoint`, `requiresPermission`, the class).
- **(B) Everything in `GuardApi.ts`, the plan type declared in `RequirePermissionMiddleware.ts`.** No new
  file; the consumer owns the shape it consumes; `GuardApi.ts` grows to ≈ 230 lines and keeps both its public
  adapter and the reading rules.
- **(C) The plan and readers in `RequirePermission.ts`.** Puts the walk beside the declarations it reads,
  but makes the class's module depend on `HttpApi.reflect` and the registry descriptor type.

**Recommendation: (A).** Not breaking (public names unchanged, re-exported). `status: open`

### D-49-e — Release notes for names that never shipped

- **(A) If this lands before `0.12.0` is released (recommended):** a new `.changeset/access-plan.md`
  describing the change against `0.11.0`, and the pending `.changeset/endpoint-access.md` edited so its
  "Added …" bullet stops announcing `endpointAccess`, `EndpointAccess`, `misplacedDeclarations` (D-49-c = A).
  `0.12.0`'s notes then describe the surface that actually ships.
- **(B) Separate changeset only**, saying "removed" about names no released version had. Correct after a
  release, confusing before one.

**Recommendation: (A)** before the release; (B) automatically if `0.12.0` has shipped by T6 (T0 checks).
`status: open`

## 6. Tasks

Blocked-on summary: **T0–T2, T4 (minus its D-49-b step), T7–T8 need no decision.** T3 is D-49-b; T5 is
D-49-c; T2's file split follows D-49-d (its default is written below); T6's changeset follows D-49-e.

### T0 — Re-verify the evidence at the branch point
- **Status:** [ ] todo
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/49-access-plan main`; record `git rev-parse --short HEAD`.
  2. `git diff --stat b655b3b HEAD -- packages/http/src packages/http/test spec/behaviors/23-http.md spec/invariants.md spec/overview.md .changeset`.
     If `RequirePermissionMiddleware.ts` changed, find which sibling did it: `git log --oneline b655b3b..HEAD -- packages/http/src/RequirePermissionMiddleware.ts`
     (ARCH-47 expected). Re-locate by symbol: `walkApi`, `guardApi`, `makeRequirePermission`, the `middleware`
     closure, `endpointAccess`, `misplacedDeclarations`, `memberKeys`, `bareMiddleware`; correct §1's hints in §10.
  3. Release state: `npm view @qadi/http version` and `git tag --list "@qadi/http@*" | tail -1`. If it is
     `0.12.0` or later and `git show "@qadi/http@<it>":packages/http/src/RequirePermission.ts | grep -c endpointAccess`
     is non-zero, D-49-c = A is now breaking and D-49-e falls to (B); record it.
  4. Re-create the probe in a fresh scratch directory (symlink `node_modules` → `packages/http/node_modules`, a
     `vitest.config.ts` aliasing `@qadi/core`/`@qadi/testing` to `src/index.ts`, run with the repo's
     `node_modules/.bin/vitest run --root .`): the B2 case from T1 step 1. Expect statuses `[403, 403, 204]`
     and `/__permissions` listing only `GET /a`. Also confirm `CALLS after 5 requests: 1` with a counting wrapper
     (`Layer.effect(RequirePermission, Effect.map(Effect.service(RequirePermission), (mw) => …))` provided over `guardApi(A)`).
  5. `git grep -n 'identifier}/\${' packages/http` → the three C4 sites.
- **Tests:** none.
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** §10 records the HEAD, the release state, the probe output and any moved symbols.

### T1 — Test-first: the middleware serves only the endpoint values `guardApi` walked (defect C11, C12)
- **Status:** [ ] todo
- **Depends on:** T0. No decision: refusing an endpoint `guardApi` never vetted is D-36-e (decided); this
  only makes the membership test exact. Shippable alone ahead of the refactor.
- **Files:** `packages/http/test/GuardApi.test.ts`; `packages/http/src/GuardApi.ts`;
  `packages/http/src/RequirePermissionMiddleware.ts`; `packages/http/test/endpointAccess.test.ts` (its
  `memberKeys` helper only, until T4 deletes it).
- **Steps:**
  1. In `GuardApi.test.ts`, add `describe("the plan is the API value it was built from", …)` beside
     "the middleware guardApi provides". Fixtures, all with group `"g"` and endpoint `"read"` so their
     identifiers collide with a new `Same = HttpApi.make("same").add(HttpApiGroup.make("g").add(get("read", "/a") requiring readP)).middleware(RequirePermission)`:
     - `SamePublic`: `get("read", "/b")` annotated `PublicEndpoint`.
     - `SameWrite`: `get("read", "/b")` requiring `writeP`.
     - `SameMisplacedGroup`: `SamePublic`'s group with `.annotate(RequiredPermission, requiresPermission(HttpApiEndpoint.get("x", "/x"), …))`.
     - `SameApiDeclared`: `SamePublic`'s API with `.annotate(RequiredPermission, …)` (B4).
     - `SamePrefixed = Same.prefix("/v1")`.
     Each served as `HttpApiBuilder.layer(X).pipe(Layer.provide(HttpApiBuilder.group(X, "g", (h) => h.handle("read", done))), Layer.provide(guardApi(Same)))`
     through the file's existing `serve(routes, logger)`.
  2. One `it.effect` per fixture: anonymous, `read-token` and `write-token` requests to its path all answer
     **500**; the collected log is exactly one line per request, the membership message
     (`qadi/http: endpoint "read" of group "g" is not part of the HttpApi this RequirePermission was built for, …`);
     `/__permissions` is exactly `[{ permission: document:read, endpoints: [{ GET, /a, g }] }]`.
  3. Run: **red** — `SamePublic` 204, `SameWrite` 403/403/204, `SameMisplacedGroup` 500 with the *group* log,
     `SameApiDeclared` 204, `SamePrefixed` 204. Record the names in §10.
  4. Fix, smallest change: `WalkedApi.members` becomes `ReadonlyMap<HttpApiGroup.Top, ReadonlySet<HttpApiEndpoint.Top>>`,
     filled in `walkApi`'s `onEndpoint` from the `group`/`endpoint` objects; `makeRequirePermission`'s
     parameter takes that type and the check becomes `members.get(group)?.has(endpoint) !== true`. The
     membership message is unchanged (it stays true). Doc comments: `WalkedApi`, `walkApi` ("the values of
     every endpoint", not "the key"), `guardApi` ("an endpoint value that is not one `api` holds — another API,
     or `api.prefix(…)` — is refused"), `makeRequirePermission`.
  5. `endpointAccess.test.ts` `memberKeys` → `memberValues`, building the same `Map` from `HttpApi.reflect`
     (it is deleted in T4; this keeps the suite compiling until then).
  6. Run: green; every existing `GuardApi.test.ts`, `endpointAccess.test.ts`, `http.test.ts` and
     `RequirePermissionClient.test.ts` case unchanged.
- **Tests:** five new cases, red first.
- **Verify:** `pnpm vitest run packages/http/test/GuardApi.test.ts packages/http/test/endpointAccess.test.ts packages/http/test/http.test.ts packages/http/test/RequirePermissionClient.test.ts`;
  `pnpm typecheck`; `node scripts/check-house-style.mjs`; `pnpm circular`.
- **Done when:** green, red names recorded. Release note: before `0.12.0`, one sentence appended to
  `.changeset/guarded-httpapi.md`'s membership paragraph ("…an endpoint outside the API value it was built
  for, including one that reuses its group and endpoint names or a `prefix`ed copy"); after it, a `minor`
  changeset `guardapi-membership-by-value.md` with that sentence and the migration ("pass `guardApi` the
  same `HttpApi` value `HttpApiBuilder.layer` serves").

### T2 — Introduce the access plan; the middleware looks up and answers
- **Status:** [ ] todo
- **Depends on:** T1. D-49-d (written for its default (A); under (B) the same code lands in `GuardApi.ts`
  and the type in `RequirePermissionMiddleware.ts`). Neutral on D-49-b and D-49-c: this task keeps the
  `Undeclared` case in the plan and keeps the three public names exported.
- **Files:** *new* `packages/http/src/AccessPlan.ts`; `packages/http/src/GuardApi.ts`;
  `packages/http/src/RequirePermissionMiddleware.ts`; `packages/http/src/RequirePermission.ts`.
- **Steps:**
  1. Create `AccessPlan.ts` with a module doc (one-line summary: "What each endpoint of one `HttpApi` value
     gets, decided once when `guardApi` is built"; then why: ARCH-18's one scope, ARCH-36's refusals, C11).
     Move in, unchanged in behavior:
     - from `RequirePermission.ts`: `EndpointAccess` (type + `Data.taggedEnum` constructor), `endpointAccess`,
       `AccessDeclarationKey`, `misplacedDeclarations`, with their doc comments ("both readers" → "the plan");
     - from `GuardApi.ts`: `RequirePermissionNotAttached`, `MisplacedAccessDeclaration` (with `message` getters),
       `ApiGuardRefusal`.
  2. In `AccessPlan.ts` declare
     `export type PlannedAccess = EndpointAccess` (closed to `Required | Public` in T3),
     `export interface AccessPlan { readonly registrations: ReadonlyArray<readonly [Permission, EndpointDescriptor]>; readonly accessOf: (group: HttpApiGroup.Top, endpoint: HttpApiEndpoint.Top) => PlannedAccess | undefined }`
     (doc: "`undefined`: this endpoint value was never walked; refuse it"), and
     `export const planApi = <Id extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<Id, Groups>): Result.Result<AccessPlan, ApiGuardRefusal>`
     — `walkApi`'s body, with `members` replaced by `byGroup: Map<HttpApiGroup.Top, Map<HttpApiEndpoint.Top, PlannedAccess>>`
     filled for every attached endpoint, `found` renamed `registrations`, and the result
     `refusal !== undefined ? Result.fail(refusal) : Result.succeed({ registrations, accessOf: (g, e) => byGroup.get(g)?.get(e) })`.
     Dispatch with `Match.valueTags(endpointAccess(endpoint.annotations), { Required, Public, Undeclared })`.
  3. `GuardApi.ts`: delete `WalkedApi`, `walkApi` and the three moved declarations; import `planApi`;
     `export { MisplacedAccessDeclaration, RequirePermissionNotAttached } from "./AccessPlan.ts";` and
     `export type { AccessDeclarationKey, ApiGuardRefusal } from "./AccessPlan.ts";`. `guardApi`'s body:
     `const plan = planApi(api); if (Result.isFailure(plan)) return yield* Effect.fail(plan.failure);` then
     register `plan.success.registrations` (unchanged loop) and `return yield* makeRequirePermission(plan.success)`.
     Keep `RequirePermission` a **value** import from `./RequirePermission.ts` (`Layer.effect(RequirePermission, …)`
     needs it; the spike's first compile failed with TS1361 when it was made type-only). Drop the now-unused
     `Data`/`Match`/`HttpApi` value imports. Module doc: "the walk" → "the plan".
  4. Keep the three still-public names exported until T5 by re-exporting them from **`GuardApi.ts`**
     (`export { EndpointAccess, endpointAccess, misplacedDeclarations } from "./AccessPlan.ts";`), not from
     `RequirePermission.ts`: `AccessPlan.ts` imports `RequirePermission.ts`, so a re-export there is a cycle
     madge reports. Gate 13 checks names, not files. In `RequirePermission.ts`, drop the now-unused `Data` and
     `Option` imports only if nothing else uses them (`requiresPermission` still uses `Option`).
  5. `RequirePermissionMiddleware.ts`: `import type { AccessPlan } from "./AccessPlan.ts"`; delete the import of
     `endpointAccess`/`misplacedDeclarations`; `makeRequirePermission(plan: AccessPlan)`. The `middleware`
     closure becomes: `const access = plan.accessOf(group, endpoint); if (access === undefined) return refuse(<membership message, unchanged>);`
     then `Match.valueTags(access, { Undeclared: <unchanged refuse>, Public: <unchanged>, Required: <unchanged> })`.
     The group-misplaced branch is deleted: no group in a successful plan carries a declaration, and group
     annotations are immutable. `enforce` and `refuse` are not edited (ARCH-47). Module doc: "what the endpoint
     declares" → "what the plan decided for the endpoint".
  6. Run the whole http suite: green except the five `endpointAccess.test.ts` tests that assert the *request-time*
     group refusal (C5), which now see the membership 500 instead — `bareMiddleware` builds a plan-less middleware.
     Do not patch them; T4 rewrites that file. Mark them `it.effect.skip` with `// ARCH-49 T4` only if T4 does not
     land in the same commit (preferred: T2 and T4 in one commit).
- **Tests:** none new here (T1's and the existing suite pin behavior); T4 replaces the bypassing file.
- **Verify:** `pnpm vitest run packages/http/test/GuardApi.test.ts packages/http/test/http.test.ts packages/http/test/RequirePermissionClient.test.ts`;
  `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`; `node scripts/check-api-surface.mjs`;
  criteria 1 and 2 greps.
- **Done when:** criteria 1–2 hold, the listed suites are green, madge and gate 13 are clean.

### T3 — Refuse an undeclared endpoint at layer build (D-49-b = A)
- **Status:** [ ] todo
- **Depends on:** T2, **D-49-b**. (If D-49-b = B, mark `[-] dropped` and keep the `Undeclared` arm.)
- **Files:** `packages/http/src/AccessPlan.ts`; `packages/http/src/GuardApi.ts`;
  `packages/http/src/RequirePermissionMiddleware.ts`; `packages/http/test/GuardApi.test.ts`;
  `packages/http/test/GuardApi.tst.ts`; `packages/http/test/http.test.ts`; `examples/http-advanced/server.ts` (comment).
- **Steps:**
  1. Test first, `GuardApi.test.ts` `describe("guardApi")`:
     - "refuses an endpoint that declares neither, naming it, and registers nothing": an API with a declared
       `GET /a` (readP) and an undeclared `GET /u` in group `"g"`; build through the file's `snapshotOf`
       → `Result.isFailure`, `_tag === "AccessNotDeclared"`, `[group, endpoint] === ["g", "u"]`, `message`
       equal to the D-49-b text; and the prior-registration variant of "a refusal registers nothing" shows only
       the pre-registered entry.
     - "precedence: a misplaced declaration, then an unattached endpoint, then an undeclared one": three APIs
       combining two mistakes each; assert the `_tag` reported (`MisplacedAccessDeclaration` over the others;
       `RequirePermissionNotAttached` over `AccessNotDeclared` for an endpoint that is both).
     Red: the first builds successfully today.
  2. `GuardApi.tst.ts`: `expect<ApiGuardRefusal>().type.toBe<MisplacedAccessDeclaration | RequirePermissionNotAttached | AccessNotDeclared>()`
     (closed union, full form — not `old | "New"`).
  3. `AccessPlan.ts`: declare `AccessNotDeclared` (doc: summary line, then why — D-49-b, BEH-QD-174); widen
     `ApiGuardRefusal` to the three members; in `planApi` the `Undeclared` arm pushes into an `undeclared` array
     and does not enter `byGroup`; `refusal = misplaced[0] ?? unattached[0] ?? undeclared[0]`.
     `PlannedAccess = Exclude<EndpointAccess, { readonly _tag: "Undeclared" }>` — the plan can no longer hold it.
  4. `RequirePermissionMiddleware.ts`: delete the `Undeclared` arm (`Match.valueTags` over `Public`/`Required`;
     a missing arm is now a compile error, an extra one too).
  5. `GuardApi.ts`: re-export `AccessNotDeclared`; `guardApi`'s doc names the third refusal.
  6. `http.test.ts`: remove `forgotten` from `DocumentsGroup` (`HttpApiEndpoint.get("forgotten", …)` and its
     comment) and from `DocumentsHandlers`; delete "AN ENDPOINT DECLARING NEITHER IS REFUSED, not served" and
     "an endpoint declaring neither logs the wiring mistake it refuses for, exactly" — step 1's tests replace
     them at the layer that now refuses. Keep their history in the new test's comment (ADR-036's rejected
     alternative, why 500 and not 403 is moot now: nothing is served).
  7. `examples/http-advanced/server.ts` comment above `DocumentsHandlers`: `→ 500 + log` becomes
     `→ guardApi refuses to build (AccessNotDeclared)`.
- **Tests:** two new runtime tests (red first), one type test.
- **Verify:** `pnpm vitest run packages/http/test/GuardApi.test.ts packages/http/test/http.test.ts`;
  `pnpm test:tstyche`; `pnpm typecheck`; `pnpm example` (the http-advanced example still builds);
  `node scripts/check-package-install.mjs` (consumer fixture still builds).
- **Done when:** criterion 6 holds; no test or example composes an undeclared endpoint into a guarded API.

### T4 — Every placement through `guardApi`; delete the bypass
- **Status:** [ ] todo
- **Depends on:** T2 (and T3 if D-49-b = A — the expected outcomes below are written for A; under B, the
  "declares neither" placement stays a served 500).
- **Files:** `packages/http/test/endpointAccess.test.ts` → renamed *new* `packages/http/test/accessPlan.test.ts`
  (`git mv`); `packages/http/test/GuardApi.test.ts` (header comment).
- **Steps:**
  1. `git mv packages/http/test/endpointAccess.test.ts packages/http/test/accessPlan.test.ts`. Header: the
     differential is now "every placement is decided once, by the plan".
  2. Delete the import of `makeRequirePermission`, `memberValues`/`memberKeys`, `bareMiddleware`. Rewrite
     `observe(api, guard, routes, paths, logger)` to build **one** application:
     `routes.pipe(Layer.provide(guard), …stack…)` — the `guard` argument is provided into the routes it guards,
     exactly as an application does, instead of being built separately beside a bare middleware — and return either `{ refused: ApiGuardRefusal }` when building that application
     fails (use `Layer.build` + `Effect.result` on the composed layer, reading `PermissionRegistry` from the built
     context for `listed` when it succeeds) or `{ listed, enforced, statuses }` from requests. One build, one
     registry, one middleware: what is served is what was listed.
  3. Restate the differential loop: for each placement, `refused` is defined **xor** every path has
     `listed.get(path) === enforced.get(path)`; and when `refused` is defined, nothing was registered (read the
     registry through a pre-built `PermissionRegistryLive` instance passed with `Layer.succeed`, as
     "a refusal registers nothing" does) and the handler is never constructed.
  4. Replace the five request-time group-refusal tests (C5) with build-time assertions on the same cases:
     case1 → `MisplacedAccessDeclaration{scope:"group", identifier:"g", key:"RequiredPermission"}`; case2 → same
     (group requirement over an endpoint `publicEndpoint` is refused, not served, not listed); case3 →
     `{scope:"group", key:"PublicEndpoint"}`; case4 → `{scope:"api", identifier:"t", key:"RequiredPermission"}`;
     case6 → `MisplacedAccessDeclaration`. Case 8–10 tests keep their `@ts-expect-error` and now assert the
     composed application **fails to build** with `RequirePermissionNotAttached` naming the endpoint, instead of
     "served 204 by Effect" (the bare-middleware artefact disappears: nothing is served).
  5. Add a placement case11 "endpoint declares neither" (D-49-b = A: refused with `AccessNotDeclared`).
  6. Replace `describe("endpointAccess: the reader")` (C7 readers are private after T5) by observations through
     `guardApi`: "a group carrying both keys is reported by its first key, RequiredPermission" (a group with both
     keys → `key === "RequiredPermission"`, the `misplacedDeclarations` order pin); "both keys on one endpoint:
     the requirement wins" stays as case7 (listed and enforced `READ_KEY`, 403 for the writer). Keep "names the
     scope, identifier and key in a MisplacedAccessDeclaration's message" (public class).
  7. `GuardApi.test.ts` header: `endpointAccess.test.ts` → `accessPlan.test.ts`.
- **Tests:** the file is rewritten, not layered: 10 placements + case11 through the interface, five request-time
  tests replaced by build-time ones, the reader unit tests replaced by two `guardApi` observations.
- **Verify:** `pnpm vitest run packages/http/test/accessPlan.test.ts packages/http/test/GuardApi.test.ts`;
  criterion 3 grep; `pnpm vitest run --project http --coverage` (http ≥ 90%).
- **Done when:** criteria 3 and 5 hold; no http test imports a module outside `src/index.ts` except
  `GuardRoute.ts` (already private, `http.test.ts:64`, out of scope).

### T5 — The readers leave the public interface (D-49-c = A)
- **Status:** [ ] todo
- **Depends on:** T4, **D-49-c**. (Under B: drop only `misplacedDeclarations`; under C: `[-] dropped`.)
- **Files:** `packages/http/src/RequirePermission.ts` (or `GuardApi.ts`, wherever T2 step 4 put the re-export);
  `spec/overview.md`.
- **Steps:**
  1. Delete the `export { EndpointAccess, endpointAccess, misplacedDeclarations } from "./AccessPlan.ts"` line.
     `AccessDeclarationKey` stays re-exported from `GuardApi.ts` as a type.
  2. `spec/overview.md`: delete rows `endpointAccess`, `EndpointAccess` (`:586`) and the `misplacedDeclarations`
     half of `:587`; keep `AccessDeclarationKey` as its own row, source `GuardApi.ts` — "the declaration key a
     `MisplacedAccessDeclaration` names". Change History row (breaking only relative to the pending `0.12.0`).
  3. `git grep -nE "\bendpointAccess\b|\bmisplacedDeclarations\b|\bEndpointAccess\b" -- packages/http/test examples scripts apps features`
     → 0 hits.
- **Tests:** none (gate 13 is the test).
- **Verify:** `node scripts/check-api-surface.mjs`; `pnpm typecheck`; `node scripts/check-package-install.mjs`.
- **Done when:** criterion 7 holds and gate 13 is green.

### T6 — Spec, ADR and release notes
- **Status:** [ ] todo
- **Depends on:** T3 (or its drop), T5 (or its drop), **D-49-e**.
- **Files:** `spec/behaviors/23-http.md`; `spec/invariants.md`; `spec/decisions/036-qadi-http-package-shape.md`;
  `spec/traceability.md`; `spec/overview.md`; `spec/README.md`; `.changeset/access-plan.md` (*new*);
  `.changeset/endpoint-access.md` (D-49-e = A only).
- **Steps:** apply §8 item by item; bump each document's revision and Change History with `CCR-QD-NEXT`.
- **Tests:** none.
- **Verify:** `bash spec/scripts/verify-traceability.sh --strict`; `node scripts/check-doc-examples.mjs`;
  `node scripts/check-api-surface.mjs`; `node scripts/check-dod-table.mjs`.
- **Done when:** the four gates are green and every requirement §8 names is edited.

### T7 — Package docs, website and doc comments
- **Status:** [ ] todo
- **Depends on:** T3–T5 (their outcomes).
- **Files:** `packages/http/README.md`; `apps/website/src/content/docs/docs/packages/http.md`;
  `packages/http/src/PermissionRegistry.ts` (module doc only); `stryker.http.mjs` (comment only).
- **Steps:**
  1. README (`:12-31`, `:42-51`) and website (`:17-22`, `:33-38`, `:66-78`, `:213-220`): "refused, with a 500 and a
     log naming it" → (D-49-b = A) "`guardApi` refuses to build, naming it (`AccessNotDeclared`)"; the misplaced
     paragraph drops "the middleware answers 500 for every endpoint under that group" (only `guardApi` refuses
     it now); "reading the annotation back off at request time" → "`guardApi` reads each endpoint's declaration
     once, when it is built, and the middleware looks the endpoint up"; "an endpoint outside the API it was built
     for" → "an endpoint that is not part of the `HttpApi` value it was built from (another API, or a `prefix`ed
     copy)"; the `guardApi` signature block's error union gains `AccessNotDeclared`.
  2. `PermissionRegistry.ts` module doc: "`guardApi` walks an `HttpApi`'s `RequiredPermission` annotations" →
     "`guardApi` registers its access plan's `Required` endpoints".
  3. `stryker.http.mjs` header: it still names `registerApi` (removed by ARCH-36); reword to `guardApi`/`addGuardedRoute`.
- **Tests:** none.
- **Verify:** `node scripts/check-website-doc-examples.mjs`; `node scripts/check-website-build.mjs`;
  `git grep -n "500 and a log naming it\|reading the annotation back off" -- packages/http apps/website` → 0.
- **Done when:** no document describes a request-time reading or (A) a request-time undeclared refusal.

### T8 — Mutation and the full gate
- **Status:** [ ] todo
- **Depends on:** T1–T7.
- **Files:** none expected; tests added if a mutant survives.
- **Steps:**
  1. `pnpm stryker run stryker.http.mjs`. Read every survivor in `AccessPlan.ts`, `GuardApi.ts` and the
     middleware's dispatch. Each of these must be killed by a named test: the attachment predicate
     (`m.key === RequirePermission.key`) — case8–10; the precedence chain `??` order — T3's precedence test;
     the `Required` registration push — `GuardApi.test.ts` "registers every endpoint it enforces"; `accessOf`'s
     outer lookup (`byGroup.get(g)`) — T1's five cases, all of which miss on the group object; the inner lookup
     (`.get(e)`) returns the access every served test reads, but it cannot *miss* for a planned group: group
     objects are immutable, so a hit on the group means the endpoint is one of that group's own, and the only
     endpoints a planned group holds outside the plan are unattached ones Effect never hands the middleware. A
     surviving mutant that only changes the miss is equivalent — record it in §10 with this reason rather than
     force a test; the `Undeclared` push (A) — T3 step 1.
  2. Score ≥ 80 (break); record score and survivors in §10.
  3. `pnpm check`.
- **Tests:** only what step 1 demands.
- **Verify:** `pnpm stryker run stryker.http.mjs`; `pnpm check`.
- **Done when:** `pnpm check` is green and §10 has the mutation score.

## 7. Test strategy

- **Survive unchanged:** everything in `http.test.ts` except the `forgotten` endpoint and its two tests (D-49-b = A);
  `RequirePermissionClient.test.ts` (`HttpApiTest.groups` hands the middleware the same objects, C8 — the spike
  ran it green); `GuardApi.test.ts`'s existing six cases, including the exact membership log line and
  "two APIs, each given its own guardApi"; `decisionStream.test.ts`, `decisionBacklog.test.ts`,
  `AuthorizeRequest.test.ts`, `PortRoutes.test.ts`, `QadiHttpError.test.ts`; all `*.tst.ts` except one added
  assertion. The spike ran the whole suite against the new design: 202 of 204 pass untouched.
- **New, red first:** T1's five value-membership cases (C11 B1–B4, C12); T3's undeclared refusal and precedence;
  T3's closed-union type test.
- **Moved to the interface (replace, don't layer):** `endpointAccess.test.ts` becomes `accessPlan.test.ts` and
  serves every placement through `guardApi` — the `makeRequirePermission` import, `memberKeys` and `bareMiddleware`
  are deleted; five tests that asserted request-time refusals of placements `guardApi` refuses to build become
  build-refusal assertions; the reader unit tests (`describe("endpointAccess: the reader")`) become two
  observations through `guardApi`; the two `forgotten` tests in `http.test.ts` become T3's build refusal.
- **Deleted as redundant:** the request-time group-misplacement behavior (no code path left); the request-time
  undeclared behavior (A).
- **Differential:** the placement table (now 11 cases) is INV-QD-180's enforcement: for every placement, the
  composition is refused at build **xor** listed = enforced on every path. An enumerated or generated placement
  space was tried and does not type-check against `guardApi`'s compile-time attachment check (§1 spike), and
  `@qadi/http` has no `fast-check` dev dependency; the finite hand table plus the five value-membership cases
  is the complete space of *distinct* outcomes (scope × key × attachment × membership), so no property test is
  added.
- **Type-level:** `GuardApi.tst.ts` keeps the attachment refusal and gains the three-member union pin.
- **Mutation:** `stryker.http.mjs` (break 80) now mutates `AccessPlan.ts`; T8 names the test that kills each
  decision point. Note: the middleware's dispatch runs during `HttpApiBuilder.group`'s layer build inside each
  test (C2), not at import time, so `ignoreStatic` does not hide its mutants.

## 8. Spec and documentation updates

- **BEH-QD-174** (`23-http.md`): under D-49-b = A, the first REQUIREMENT becomes "An endpoint of an API passed to
  `guardApi` that itself carries neither `RequiredPermission` nor `PublicEndpoint` MUST be refused:
  `guardApi` MUST fail layer construction with `AccessNotDeclared`, naming its group and identifier, before it
  registers anything." The "500 rather than 403" paragraph is kept as history under a "Before CCR-QD-NEXT" note:
  nothing is served now, so neither status arises. Under B: unchanged.
- **BEH-QD-180:** the second REQUIREMENT's justification paragraph: "The registry reads an endpoint through
  `endpointAccess`, … which is what the middleware reads" → "`guardApi` registers from the access plan the
  middleware enforces, so the two cannot read different things (BEH-QD-320, BEH-QD-328)".
- **BEH-QD-320:** title kept ("read once, from the endpoint" is now literally once). Signature fence: drop
  `endpointAccess`/`EndpointAccess`/`misplacedDeclarations` (D-49-c = A), keep `MisplacedAccessDeclaration`,
  `AccessDeclarationKey`. REQUIREMENT 1 → "`guardApi` MUST read each endpoint's access once, over that endpoint's
  own annotations and no other scope, into the access plan its middleware enforces; the middleware MUST NOT read
  annotations. When both keys are present, `RequiredPermission` MUST win." REQUIREMENT 2 → "A `RequiredPermission`
  or `PublicEndpoint` on a group or an API MUST be refused: `guardApi` fails layer construction with
  `MisplacedAccessDeclaration` before it registers anything." (the request-time half is gone). Prose: the
  middleware's group read is removed; keep the ARCH-18 history.
- **BEH-QD-328:** fence — `ApiGuardRefusal` gains `AccessNotDeclared` (A) and its class. REQUIREMENT 3 → "The
  middleware `guardApi` provides MUST answer 500 with one error log line, and MUST NOT serve the request, for an
  endpoint value that is not one `guardApi` walked — an endpoint of another API, including one reusing the same
  group and endpoint identifiers, or of a `prefix`ed copy." Prose: record C11 (found by ARCH-49's probe; the
  identifier key let a colliding API through, unvetted and unlisted).
- **INV-QD-034** (`invariants.md`): Source → "`packages/http/src/AccessPlan.ts` — `planApi` reads each endpoint's
  own annotations once; an endpoint carrying neither key fails `guardApi` with `AccessNotDeclared` (A), a group or
  API carrying either with `MisplacedAccessDeclaration`, an endpoint without the middleware with
  `RequirePermissionNotAttached`; `RequirePermissionMiddleware.ts` serves only what the plan holds." Statement
  unchanged.
- **INV-QD-180:** statement gains one sentence: "`guardApi` lists and its middleware enforces from one access plan,
  built once from the `HttpApi` value it was given; an endpoint value outside that plan is refused, never served."
  Source names `AccessPlan.ts`. Enforcement: `accessPlan.test.ts` (renamed) and `GuardApi.test.ts`'s
  value-membership cases. Implication: add C11.
- **ADR-QD-036 Rev 1.8** (CCR-QD-NEXT): in the registry paragraph after Rev 1.7: "Rev 1.8 (ARCH-49): the `HttpApi`
  half reads each endpoint's access once, into one plan that registers and enforces; the middleware looks the
  endpoint up by the value `guardApi` walked, so an API reusing the same identifiers is refused rather than served
  unvetted (found by probe); an endpoint that declares neither is refused when the layer is built (D-49-b)." The
  "One `RequirePermission` middleware … reading the annotation back off … at request time" sentence (`:167-170`)
  becomes "… looking up, per endpoint, what `guardApi` decided when it was built". Change History row.
- **`spec/overview.md`** (gate 13): rows per T5; `ApiGuardRefusal` row → three members; new `AccessNotDeclared`
  row (error, `GuardApi.ts` — re-exported from the private `AccessPlan.ts`); `guardApi` row (`:599`) names the third
  refusal and "an endpoint value outside the API it was given"; `RequirePermission` row (`:590`) "the middleware …
  reads" → "looks up"; narrative `:631`, `:649` unchanged unless they say "reads at request time". Change History.
- **`spec/traceability.md`:** row 65's source list adds `AccessPlan`; rows 117 (INV-QD-034) and 137 (INV-QD-180)
  name `AccessPlan.ts`/`planApi`; row 324 `endpointAccess.test.ts` → `accessPlan.test.ts`, its description "the
  registry and the middleware agree…" → "every placement is decided once by the plan: refused at build, or listed
  = enforced"; row 325 adds the value-membership and undeclared cases.
- **`spec/README.md`:** CCR-QD-NEXT row naming every document above.
- **Website and README:** T7.
- **Changeset** (D-49-e = A, before `0.12.0`): `.changeset/access-plan.md`, `"@qadi/http": minor`, **Breaking**
  (against `0.11.0`): "An endpoint of a guarded API that declares neither a permission requirement nor
  `publicEndpoint` now fails `guardApi`'s layer build with `AccessNotDeclared` (it used to answer 500 on every
  request). `guardApi`'s middleware serves only the endpoint values of the `HttpApi` it was given: pass it the same
  value `HttpApiBuilder.layer` serves — an API that reuses the same group and endpoint names, or a `prefix`ed copy,
  is refused with a 500." Migration: annotate every endpoint, or mark it `PublicEndpoint`; pass the same API value.
  And `.changeset/endpoint-access.md`'s "Added …" bullet loses `endpointAccess`, `EndpointAccess` and
  `misplacedDeclarations` (D-49-c = A). Under D-49-e = B: the same new changeset plus "Removed: `endpointAccess`,
  `EndpointAccess`, `misplacedDeclarations`". **No release without the user's explicit go-ahead.**

## 9. Risks and rollback

- **An application that guards one API value and serves another** (a factory called twice, `Api.prefix(…)` built
  separately) answers 500 on every endpoint after T1. Shows on the first request with a log naming the fix; the
  changeset says it. It was already wrong before: the listing named paths nothing served (C12) or an unvetted
  API was served (C11).
- **D-49-b = A stops an application from starting** if it has one undeclared endpoint. That is the point, and
  the same trade ARCH-18/ARCH-36 made for misplacement and attachment; the error names group and endpoint.
- **Effect changes when it calls the middleware or which objects it passes.** If a future `effect` handed the
  middleware copies of the endpoint objects, every endpoint would 500 — loud, fail-closed, caught by every served
  test in the suite (it is not a silent widening). `v4-http-smoke.test.ts` is the canary; consider adding one
  assertion there that the middleware's `endpoint` is `api.groups[g].endpoints[e]` (T1, optional).
- **ARCH-47 conflict** in `RequirePermissionMiddleware.ts` and in `23-http.md`/ADR-036 revision numbers (§4
  "Ordering"). The dispatch (this plan) and the answers (ARCH-47) are separate blocks of the closure; the second to
  land rebases.
- **ARCH-57** edits `addGuardedRoute` and BEH-QD-180's prose: textual conflict in `23-http.md` only.
- **Release timing.** If the open version PR is merged before this lands, D-49-c = A becomes a breaking removal of
  three released names and D-49-e falls to (B). T0 step 3 checks; neither changes the code.
- **Rollback.** T1 is an independent patch (revert restores string membership and C11). T2 + T4 revert together
  (they share the test rewrite). T3 reverts alone (restores the `Undeclared` arm and the `forgotten` fixture).
  T5 reverts alone (re-export line + overview rows). T6/T7 follow whatever was reverted.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-13 | — | Plan written against `b655b3b`; probes `collision.probe.ts`, `prefix.probe.ts` and the `spike/` copy in `scratchpad/wave5/ARCH-49/` | claude |
| 2026-10-13 | T0-T8 | Implemented in one commit 2ea89d6 (CCR-QD-384, ADR-036 Rev 1.9); stryker.http 96.44; check:pr green. T1 red names: SamePublic 204, SameWrite 403/403/204, SameMisplacedGroup group log, SameApiDeclared 204, SamePrefixed 204/403 | claude |
