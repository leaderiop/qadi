---
id: ARCH-36
title: A guarded HttpApi is registered by the layer that guards it — one `guardApi(api)` enforces, registers and refuses an endpoint it cannot enforce, so `/__permissions` lists exactly what `@qadi/http` enforces
strength: Worth exploring   # from the 2026-10-07 architecture review (wave 4, card c7); the probe in §1 found a defect the card did not name, which raises the case
status: done
evidence_verified_at: e635e68
depends_on: []              # ARCH-18 and ARCH-19 are done and are built on, not redone
blocks: []
adrs_touched:
  - ADR-QD-036 (amend, Rev 1.6: "two mechanisms feeding one model" stays, but the HttpApi half is no longer a separate opt-in walk — the layer that provides `RequirePermission` registers its API; the Negative consequence "nothing proves an application's Layer graph registers every route" is closed for both surfaces; a `RequiredPermission` on an endpoint the middleware is not attached to is refused, the annotate-and-forget failure one level up)
  - ADR-QD-075 (constraint: the `RequirePermission` class, its `error:`/`clientError`/`requiredForClient`, and `HttpApiMiddlewareClient.ts` (`ANY_BUDGET` = 7) are untouched; one cross-reference sentence under its "left open" completeness-check paragraph, since T3's compile-time attachment check is a sibling of that idea)
  - ADR-QD-072 (constraint: projection and redaction unchanged; the moved middleware body keeps `projectHttpEnforcementFailure` wrapping `httpEffect`)
  - ADR-QD-081 (constraint: the two new refusals are wiring mistakes answered outside `ENFORCEMENT_ERROR_WIRE` — a layer-build failure and a logged 500 — exactly like ARCH-18's `MisplacedAccessDeclaration` and today's "declares neither")
  - ADR-QD-099 (constraint: `RequirePermissionLive`, `registerApi` and `guardRoute` leave the barrel and so become unimportable; gate 13 STALE rows go in the same commit)
  - ADR-QD-037 (constraint: madge counts type-only edges; new `GuardApi.ts` and `RequirePermissionMiddleware.ts` import `RequirePermission.ts`/`PermissionRegistry.ts`/`AuthorizeRequest.ts` and are imported by nothing in their closure)
  - ADR-QD-038 (constraint: one `minor` changeset marked breaking, fixed group; no release step)
packages: ["@qadi/http", "examples/http-advanced", "examples/nextjs-newsroom (comment only)", "features (decision-log steps, test fixture only)", "scripts (check-package-install.mjs consumer fixture)", "apps/website (docs)", "spec"]
estimate: L   # complete path T0–T10 ≈ 3–4 days. Defect-only path (T1 + T2) ≈ ½ day (S)
---

# ARCH-36 — A guarded HttpApi is registered by the layer that guards it

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68` (`git log --oneline -1`). Read-only: nothing in the repository was
edited. Probes live in `scratchpad/wave4/ARCH-36/` (absolute:
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-36/`),
with `node_modules` symlinked to `packages/http/node_modules`; they import `@qadi/http` by absolute
path to `packages/http/src/index.ts`.

- **`probe.mts`** — serves five real `HttpApi` compositions through `HttpRouter.toWebHandler` with
  `permissionRegistryRouteUnguarded` and one `addGuardedRoute` bare route, then compares what
  `/__permissions` lists with what each endpoint answers to a non-holder and a holder of
  `document:read`. Run: `cd <probe dir> && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe.mts`.
- **`probe-handler-denial.mts`** — a `RequirePermission`-guarded handler whose own `guard` denies;
  captures logs. Same run command.
- **`probe-attached.mts`** — `HttpApi.reflect`'s per-endpoint `middleware` set, for three attachment
  shapes. Same run command (the throwaway probe uses `as never`; T3 must type-check without it).
- **`typeprobe.ts`** (+ `tsconfig.json`, extends `tsconfig.base.json`) — (1) a 7-step inline
  `Layer.provideMerge` chain, every part checked with `IsAny<…>`; (2) the candidate
  `guardApi(api) = Layer.merge(RequirePermissionLive, registerApi(api))` and a served form, checking that
  `PermissionRegistry` and `SubjectExtractor` surface as requirements. Run:
  `<repo>/node_modules/.bin/tsc -p <probe dir>/tsconfig.json` → only the four deliberate
  "is the requirement set empty?" assertions (lines 56–59) report; every `IsAny` assertion holds.
- **`typeprobe-attached.ts`** (+ `tsconfig.attached.json`) — a compile-time refusal of an API with an
  endpoint lacking `RequirePermission`. Run: `<repo>/node_modules/.bin/tsc -p <probe dir>/tsconfig.attached.json`
  → exit clean: the two good APIs compile and the three `@ts-expect-error` lines (middleware before
  `add`, no middleware, middleware on one group only) are all used.

`probe.mts` output (abridged):

| Case | Composition | `/__permissions` lists | Non-holder / holder |
| ---- | ----------- | ---------------------- | ------------------- |
| 1 | `.add(G).middleware(RequirePermission)`, `registerApi` composed | `/a`, `/bare` | `/a` 403 / 204 |
| 2 | same, `registerApi` **forgotten** | `/bare` only | `/a` 403 / 204 — enforced, unlisted |
| 3 | `.middleware(RequirePermission).add(G)` (Effect's own documented gotcha) | `/b`, `/bare` | `/b` **204 / 204** — listed, served to anyone |
| 4 | no `RequirePermission` middleware at all | `/c`, `/bare` | `/c` **204 / 204** — listed, served to anyone |
| 5 | middleware on group `g1` only | `/d`, `/e`, `/bare` | `/d` 403 / 204; `/e` **204 / 204** |

| # | Claim (review card c7, or found here) | Verdict | At `e635e68` |
| - | ------------------------------------- | ------- | ------------ |
| C1 | Four public ways to authorize a request: `addGuardedRoute` registers; `RequirePermissionLive` registers only if the caller also composes `registerApi(Api)`; `guardRoute` and `authorizeRequest` never register | **CONFIRMED** | `addGuardedRoute` `packages/http/src/PermissionRegistry.ts:184-201` (`Layer.merge(HttpRouter.add(…guardRoute…), Layer.effectDiscard(PermissionRegistry.register(…)))`, `:198-200`); `registerApi` `:134-173`; `RequirePermissionLive` `packages/http/src/RequirePermission.ts:369-465` (no registry access); `guardRoute` `packages/http/src/GuardRoute.ts:53-79`; `authorizeRequest` `packages/http/src/AuthorizeRequest.ts:58-98`. All four are in the barrel (`packages/http/src/index.ts:6-14`). |
| C2 | Forget `registerApi` and `/__permissions` silently omits every `HttpApi` endpoint while claiming to list "every permission this application enforces" | **CONFIRMED (probe case 2), with a nuance** | The text: `PermissionRegistry.ts:204-205` ("The introspection payload: every permission this application enforces, and the routes that require it"), repeated at `:239-243` and `DecisionStreamRoute.ts:264-268`. Case 2 answers `200` listing only `/bare` while `/a` is enforced (403). **Nuance:** the normative spec admits it — `spec/behaviors/23-http.md:391-393`, BEH-QD-180: "`registerApi` is opt-in by contrast, and an `HttpApi` application that omits it gets an empty snapshot." So the code comments overclaim and the spec documents a footgun; nothing *fails*. Five in-repo compositions enforce an `HttpApi` without `registerApi` (C4), including the package-install gate's consumer fixture (`scripts/check-package-install.mjs:544-553`) — the most consumer-like code in the repository. |
| C3 | *(found here, not in the card)* **DEFECT — the registry lists an endpoint `RequirePermission` is not attached to, and that endpoint is served to anyone** | **CONFIRMED (probe cases 3–5)** | `registerApi` lists every `Required` endpoint (`PermissionRegistry.ts:151-161`) without asking whether the middleware that enforces it is attached. `HttpApi.reflect` hands it the answer and it is ignored: `onEndpoint` receives `middleware: ReadonlySet<HttpApiMiddleware.AnyService>` (`node_modules/.pnpm/effect@4.0.0/node_modules/effect/src/http-api/HttpApi.ts:271, :296`). Effect documents the trap: "`HttpApi.middleware` … **Endpoints added after this method is called do not receive the middleware.**" (`HttpApi.ts:100-104`; the same on `HttpApiGroup.ts:93`). So `.middleware(RequirePermission).add(G)`, an API with no middleware, or middleware on one group only, all compile, all serve the annotated endpoint with **no authorization** (204 to a non-holder), and `/__permissions` tells an auditor it requires `document:read`. This breaks BEH-QD-180's "MUST list an endpoint under a permission P only if `RequirePermission` enforces P on it" (`23-http.md:395-398`) and is INV-QD-034's annotate-and-forget failure one level up: the endpoint is annotated, the middleware is forgotten. Nothing in-repo hits it today (`grep -rn "\.middleware(RequirePermission)" packages examples scripts` — every API calls it after `.add`), so it is a latent defect, not a live one. **Test-first task: T1.** |
| C4 | "Every caller rebuilds the same ~5-step layer stack (registry → subjects → services → `layerServices`) in named steps … walker counted 9" | **CHANGED — the count is 20, 7 of them named-step, and only 11 involve an `HttpApi`** | `grep -rn "HttpServer.layerServices" packages/*/test examples features scripts` → 24 hits; minus one type-only hit (`endpointAccess.test.ts:77`) and the three `v4-http-smoke.test.ts` Effect canaries (no qadi code) = **20 qadi stacks**. **Named-step** (`withRegistry`/`withSubjects`/`withServices` consts): `http.test.ts:174-185` (`AppLayer`), `decisionStream.test.ts:166-169` and `:242-245`, `decisionBacklog.test.ts:74-77`, `features/features/decision-log/decision-log.steps.test.ts:62-67`, `examples/http-advanced/server.ts:248-268`, `examples/nextjs-newsroom/src/server/api.ts:256-259` = **7**. **Inline**: `http.test.ts:322-327, 384-389, 465-475, 502-509, 701-712, 757-768, 852-860, 895-903, 936-943`, `decisionStream.test.ts:274-280`, `RequirePermissionClient.test.ts:140-151`, `endpointAccess.test.ts:84-107`, `scripts/check-package-install.mjs:550-554` = **13**. **Involving an `HttpApi` + `RequirePermissionLive`**: `http.test.ts` 174-185, 465-475, 502-509, 701-712, 757-768, 852-860, 936-943; `RequirePermissionClient.test.ts`; `endpointAccess.test.ts`; `http-advanced`; `check-package-install.mjs` = **11**, of which **5 never compose `registerApi`** (`http.test.ts:701, :757, :936`, `RequirePermissionClient.test.ts`, `check-package-install.mjs`). Only 2 of the 7 named-step stacks involve an `HttpApi`; the other 5 serve bare/decision routes, and the newsroom has **no `HttpApi` at all**. |
| C5 | Stacks are named "so TypeScript doesn't infer `any`" | **REFUTED at `effect@4.0.0` (`typeprobe.ts`)** | The rationale is written at `http.test.ts:167-170`, `decisionStream.test.ts:137-140`, `examples/http-advanced/server.ts:207-209` and `examples/nextjs-newsroom/src/server/api.ts:11-16`. A 7-step inline chain (the `http-advanced` shape plus a `Logger.layer`) infers no `any` in its `Success`, `Error` or `Services`, and `HttpRouter.toWebHandler` accepts it. The remaining `Services` are `HttpRouter | HttpRouter.Request<"Requires", …>` markers, identical for the named-step form. The comments are stale (they predate the installed `effect@4.0.0`); naming the steps is now a readability choice, not a workaround. |
| C6 | "Deletes 9 copies of the stack" | **REFUTED as framed** | The stack's steps are application inputs — which `SubjectExtractor`, which ports, a `DecisionCache`, a decision log, `HttpServer.layerServices` — and a library layer cannot own them. A guard-the-API layer collapses only the `HttpApi` part: `Layer.provide(RequirePermissionLive)` + `registerApi(Api).pipe(Layer.provideMerge(PermissionRegistryLive))` → `Layer.provide(guardApi(Api))` (+ `PermissionRegistryLive`, which every stack already has or must gain). Deduplicating the *test* stacks is a separate, test-only fixture (D-36-f). |
| C7 | Interface shrinks from 4 entries to 2 | **CHANGED — to 3, with 2 that register by construction** | `authorizeRequest` is not a route and has a legitimate public role: ARCH-19 D-19-b (decided) made it public for "a surface this package does not ship" (WebSocket upgrade, RPC), and the website and README compile a fence that uses it (`apps/website/src/content/docs/docs/packages/http.md:97-111`, `packages/http/README.md:47-61`, gate 22). It stays public, with its doc stating that it registers nothing (D-36-c). `guardRoute` and `RequirePermissionLive` have no such role (C8, C9). |
| C8 | Is `guardRoute` used by anything except `addGuardedRoute`? | **CONFIRMED: no production caller** | In `packages/*/src`: only `PermissionRegistry.ts:199`. Elsewhere: `http.test.ts:369-379` (the extraction-before-load ordering test), `GuardRoute.tst.ts:20` (imports by path), prose in `spec/overview.md:565, :594`, `23-http.md:158, :345, :439, :529`, `26-decision-stream.md:183, :203, :231, :236, :348`, the website (`http.md:75`). No example, feature or app imports it. Its only capability `addGuardedRoute` lacks is *enforcing without registering* — the drift this plan removes. |
| C9 | Is `authorizeRequest` needed publicly — "Next.js route handlers in the newsroom use it?" | **REFUTED that the newsroom uses it; public role CONFIRMED** | `grep -rn "authorizeRequest" examples apps features` → only the two doc fences (C7). The newsroom's HTTP surface is bare routes through `addGuardedRoute` (`examples/nextjs-newsroom/src/server/api.ts:167-181, :245-254`); its Next route handler is a dozen lines over `HttpRouter.toWebHandler` (`app/api/[[...route]]/route.ts`); server actions enforce through `@qadi/core` directly (`src/server/actions.ts`), not `@qadi/http`. |
| C10 | `RequirePermissionLive`'s bare "provides `RequirePermission`" shape has real callers | **CONFIRMED — a design constraint the card did not name** | `HttpApiTest.groups(Api, …)` resolves the server-side middleware from the ambient context (`RequirePermissionClient.test.ts:131-151`), and the install gate's consumer fixture builds `HttpApiBuilder.layer(Api).pipe(Layer.provide(Handlers), Layer.provide(RequirePermissionLive))` (`check-package-install.mjs:544-549`). So the replacement must be a layer that **provides `RequirePermission`** (fits both), not only a served-route form (D-36-a). |
| C11 | ARCH-18 / ARCH-19 must not be redone | **CONFIRMED — reused unchanged** | ARCH-18 (done): `endpointAccess`, `misplacedDeclarations`, `MisplacedAccessDeclaration` (`RequirePermission.ts:92-141`, `PermissionRegistry.ts:99-110`) — this plan calls them, moves `registerApi`'s walk, and adds one more refusal beside them. ARCH-19 (done): `authorizeRequest` and the `enforce` body (`RequirePermission.ts:387-421`) — this plan moves the middleware closure into an internal module **without editing `enforce`'s body**. |
| C12 | Overlap: "an in-handler `guard` denial becomes a 403 and is never logged; only `authorizeRequest` calls `logDenial`; contradicts `spec/overview.md` ~584" (owned by ARCH-45) | **CONFIRMED (`probe-handler-denial.mts`), and its origin is a recorded trade-off** | Output: `status 403 body {"_tag":"AccessDenied",…}`, `log lines: []`. `enforce` (`RequirePermission.ts:408-420`) taps nothing on `httpEffect`'s failure; `authorizeRequest`'s taps (`AuthorizeRequest.ts:93-97`) cover only its own step. ARCH-19 D-19-d chose this ("a handler-raised denial … is projected but no longer logged by the edge … the changeset names the lost log line"), and the same change wrote `spec/overview.md:584` ("so a denial leaves one server-side record on every surface"). `http.test.ts:946-956` pins the projection but asserts nothing about logs. ARCH-45 owns the fix; ordering in §4. |
| C13 | ADR-QD-036 is reopened in part | **CONFIRMED** | `spec/decisions/036-qadi-http-package-shape.md:185-197` (two mechanisms "differ only because the two frameworks offer different extension points") and `:268-271` (Negative: "nothing in the type system currently proves an application's `Layer` graph actually orders every route registration before the registry is read"). The second is about ordering, which `Layer` already settles; the real gap is *whether* the `HttpApi` half registers at all — which only `addGuardedRoute`'s side made compulsory (`23-http.md:391-392`). |
| C14 | Attachment is detectable both at layer build and at compile time | **CONFIRMED (`probe-attached.mts`, `typeprobe-attached.ts`)** | Runtime: `middleware.has(RequirePermission)` is `true` for add→middleware, `false` for middleware→add, and per-group correct. Compile time: a conditional over `HttpApiGroup.Endpoints<Groups>` and `HttpApiEndpoint.Middleware<E>` (both exported by `effect@4.0.0`), intersected into `guardApi`'s parameter, rejects all three bad shapes with no `as`/`any`. Constraining through `HttpApiGroup.Top`/`HttpApiEndpoint.Top` silently matches nothing — the same options-less-endpoint assignability gap `RequirePermission.ts:222-231` documents — so T3 must use the unconstrained `infer` form the probe settled on. |
| C15 | *(orphan, found here)* `examples/http-advanced` is in no gate | **CONFIRMED** | Not in `tsconfig.json`/`tsconfig.test.json`; `pnpm example` is `pnpm --filter @qadi/example-nextjs check` (the newsroom only). `node_modules/.bin/tsc -p examples/http-advanced/tsconfig.json --noEmit` is clean today. ARCH-19's T9 text ("`pnpm example` (both `examples/http-advanced` and `examples/nextjs-newsroom` …)") was wrong. Recorded for the orchestrator; this plan verifies the example by hand (T7). |

**Other facts the plan relies on.**

- Two `HttpApi`s in one application can be one: `HttpApi.addHttpApi` copies an API's groups in
  (`HttpApi.ts:160-171`). An application that keeps two APIs provides each `guardApi` to its own
  `HttpApiBuilder.layer` with `Layer.provide`, which is local; merging both into one context would let
  the later `RequirePermission` shadow the earlier, which T4's membership refusal turns into a loud 500
  rather than an unregistered pass (§9).
- `stryker.http.mjs` mutates `packages/http/src/**`; coverage threshold for http is 90%.
- `RequirePermission.tst.ts:44-66` pins `registerApi`'s generic signature and error; `GuardRoute.tst.ts:43-57`
  pins `guardRoute`'s `CurrentSubject`/`LR` exclusion. Both type properties must survive the move (T5).

## 2. Goal and success criteria

**Goal.** Today an `HttpApi` is enforced by one layer (`RequirePermissionLive`) and described to
auditors by another (`registerApi`), composed independently, so the audit surface can omit what is
enforced (C2) and — worse — list what is not enforced at all (C3). The goal is one deep **module**,
`GuardApi.ts`, whose small **interface** is `guardApi(api)`: a `Layer` that provides `RequirePermission`
*for that API*, and that, as a consequence of being built, registers every endpoint it will enforce,
refuses an endpoint it cannot enforce (a misplaced declaration, ARCH-18; or a missing middleware, C3), and
at request time refuses an endpoint that is not part of the API it registered. The **seam** is the
layer itself: whatever is enforced through it was registered by it, so "listed ⟺ enforced" holds by
construction rather than by remembering a second call. **Locality:** the walk over the API, the three
refusals and the middleware's binding to its API live in one file. **Leverage:** the bare-route side
already has this shape (`addGuardedRoute`); after this plan both surfaces register as a consequence of
guarding, the registry's claim becomes true, and the public interface for guarding narrows to
`guardApi` + `addGuardedRoute`, with `authorizeRequest` kept as the documented primitive for surfaces
this package does not ship.

**Success criteria.**

1. Probe cases 3–5 (C3) are refused: `Layer.build(guardApi(api))` fails with
   `RequirePermissionNotAttached` naming the group and endpoint, and the same API does not compile as an
   argument to `guardApi` (T3, `tstyche`). Before T3, T1's `registerApi` refuses them the same way.
   `pnpm vitest run packages/http/test/endpointAccess.test.ts packages/http/test/GuardApi.test.ts`.
2. The registry/enforcement differential (`endpointAccess.test.ts`'s "listed under P iff P is enforced")
   gains the three attachment cases and a "forgot to register" case, and all are green (T1, T3).
3. `grep -rn "RequirePermissionLive\|registerApi\|guardRoute" packages/http/src/index.ts` → nothing, and
   none of the three is importable from `@qadi/http` (gate 14, `node scripts/check-package-install.mjs`).
4. A request to an endpoint of an API *other* than the one `guardApi` was given is answered 500 with one
   log line naming it, never served (T4).
5. `grep -rn "every permission this application enforces" packages` returns only text that is true:
   the claim names the two registering entry points and `PermissionRegistry.register` (T2).
6. `examples/http-advanced/server.ts`, `scripts/check-package-install.mjs`'s consumer and every
   `packages/http/test` stack that serves an `HttpApi` use `guardApi`; `node_modules/.bin/tsc -p examples/http-advanced/tsconfig.json --noEmit`
   and `node scripts/check-package-install.mjs` are clean (T7).
7. The four stale "infers `any`" comments (C5) are corrected (T7).
8. `pnpm check` green, with `ANY_BUDGET`, `SWITCH_BUDGET`, `UNTRACED_BUDGET`, `SCHEMA_ERROR_BUDGET`,
   `PORT_DOUBLE_BUDGET` unchanged, `pnpm circular` clean, `stryker.http.mjs` ≥ `break` (T9).

## 3. Non-goals

- **The in-handler denial log** (C12). ARCH-45 owns it; this plan does not edit `enforce`'s body
  (`RequirePermission.ts:387-421`), only moves the closure around it. Ordering in §4.
- **Listing `Public` and `Undeclared` endpoints** in the registry (ARCH-18 §9's follow-up; BEH-QD-180
  "cannot list what is unguarded"). Unchanged.
- **Owning the application stack** (subjects, ports, cache, log, `layerServices`). These are the
  application's inputs (C6); no public composer is added (D-36-f). Test stacks may share a test-only fixture.
- **Changing the `RequirePermission` class** (`RequirePermission.ts:356-367`): `error:`, `clientError`,
  `requiredForClient` and `provides: CurrentSubject` are ADR-QD-075's and untouched; the client side
  (`passthroughClientLayer`) is unchanged.
- **Registering server actions or any non-`@qadi/http` enforcement** (the newsroom's `actions.ts`).
  The registry describes `@qadi/http` surfaces.
- **Gating `examples/http-advanced`** (C15). Reported as an orphan; this plan only verifies it by hand.

## 4. Constraints

- **AGENTS.md §1.** Namespace submodule imports; `.ts` relative imports; `import type` for
  `HttpApiGroup`, `HttpApiEndpoint` type-only uses.
- **§2/§3.** No new service. `guardApi` is a top-level exported function returning a `Layer`, like
  `registerApi`/`subjectExtractorBearer` today — never a class member. `GuardApi.ts` is a standalone
  file because it has its own dependency surface (the registry, the middleware, the walk) distinct from
  `RequirePermission.ts`, §3's rule for a separate file.
- **§4.** `RequirePermissionNotAttached` is a `Data.TaggedError` with a plain tag; `SCHEMA_ERROR_BUDGET`
  (counts `packages/core/src/Errors.ts`) is untouched. Never `Effect.orDie` on the enforcement path.
  `catchTag` array form only.
- **§5/§5a.** The walk is pure and synchronous inside the layer's `Effect.gen`; no `Effect.fnUntraced`
  (`UNTRACED_BUDGET`), no `switch` (`SWITCH_BUDGET`); dispatch on `EndpointAccess` with
  `Match.valueTags` as `registerApi` does today (`PermissionRegistry.ts:152-161`).
- **§6.** No `as`, `!`, `any`. The compile-time attachment check must be the probe's unconstrained
  `infer` form (C14); `ANY_BUDGET` (`HttpApiMiddlewareClient.ts: 7`) unchanged; no new test may
  hand-construct a port error (`PORT_DOUBLE_BUDGET`); use `scriptedPort`.
- **§9 / ADR-QD-099.** Out of the barrel = unimportable. `RequirePermissionLive` cannot stay in
  `RequirePermission.ts` (which is `export *`'d), so the middleware factory moves to an internal
  `RequirePermissionMiddleware.ts`; `registerApi`'s walk moves into `GuardApi.ts`; `GuardRoute.ts`'s
  barrel line is removed (`PermissionRegistry.ts` imports it by path). Any type a public signature
  names (`UnguardedEndpoints`) is exported and gets a gate-13 row (TS2883 rule).
- **ADR-QD-037 (`pnpm circular`).** Edges after the change: `GuardApi.ts → {RequirePermission.ts,
  RequirePermissionMiddleware.ts, PermissionRegistry.ts}`; `RequirePermissionMiddleware.ts →
  {RequirePermission.ts, AuthorizeRequest.ts, QadiHttpError.ts}`; `PermissionRegistry.ts → {GuardRoute.ts,
  RequirePermission.ts (type AccessDeclarationKey), NoResource.ts}`. Nothing imports `GuardApi.ts`
  except the barrel.
- **ADR-QD-081 / ADR-QD-036.** Both new refusals are wiring mistakes answered outside
  `ENFORCEMENT_ERROR_WIRE`: a typed layer-build failure and, at request time, a logged
  `HttpServerResponse.empty({ status: 500 })` with `CurrentSubject` provided as `anonymous`, the same
  shape as the existing `refuse` (`RequirePermission.ts:429-433`). Absence is refusal (INV-QD-034).
- **BEH-QD-321.** Every surface still authorizes through `authorizeRequest`; the middleware's `Required`
  arm keeps calling `enforce` unchanged.
- **Gates 13/14/9/22.** `node scripts/check-api-surface.mjs` (STALE rows for the three removed names,
  rows for the new ones), `node scripts/check-package-install.mjs` (its fixture uses `RequirePermissionLive`
  today and must migrate in the same commit as the removal), `node scripts/check-doc-examples.mjs`,
  `node scripts/check-website-doc-examples.mjs` (a new `typescript` fence for `guardApi` must compile).
- **Ordering with ARCH-45 (C12).** Both touch the middleware: ARCH-45 adds a denial tap around
  `httpEffect` inside `enforce`; this plan moves `RequirePermissionLive`'s closure (which contains
  `enforce`) into `RequirePermissionMiddleware.ts`. **Rule:** ARCH-45's denial-log fix lands first (it
  is a small, test-first patch and fixes a live doc contradiction); ARCH-36's T5 then moves the closure
  verbatim, carrying the tap with it. If ARCH-36 T5 lands first, ARCH-45 applies its tap in
  `RequirePermissionMiddleware.ts`'s `enforce` instead — the body is moved byte-for-byte, so the edit
  is the same three lines. T0 checks which happened.
- **ADR-QD-038.** One `minor` changeset marked **Breaking**; never a release step.

## 5. Decisions needed before work starts

### D-36-a — The shape of "one layer per HttpApi"

- **(A) `guardApi(api)`: a layer that provides `RequirePermission` for that API (recommended).**
  `guardApi: <Id, Groups>(api: HttpApi<Id, Groups> & EveryEndpointGuarded<Groups>) =>
  Layer.Layer<RequirePermission, ApiGuardRefusal, SubjectExtractor | StandingEvaluationServices | PermissionRegistry>`.
  Building it walks the API once (registration, misplaced declarations, attachment) and returns the
  middleware closure bound to the API's endpoint set. It drops into the exact slot `RequirePermissionLive`
  occupies (`HttpApiBuilder.layer(Api).pipe(Layer.provide(Handlers), Layer.provide(guardApi(Api)))`), so it
  serves `HttpApiTest.groups` and the install fixture (C10); `PermissionRegistry` becomes a visible
  requirement (`typeprobe.ts` confirms), so forgetting the registry is a compile error, as it already is
  for `addGuardedRoute`.
- **(B) A served form `guardedApi(api, handlers, options?)`** that also owns `HttpApiBuilder.layer` and
  `Layer.provide(handlers)` (compiles: `typeprobe.ts`'s `serveGuardedApi`). Names the API once, so a
  mismatched API is impossible by construction — but it cannot serve `HttpApiTest.groups` (which needs the
  middleware, not a router), and it would be a second name for the same concept.
- **(C) Both.** Two public names, one concept; rejected for the same reason the card wants 4 → 2.

(A)'s one weakness — `guardApi(A)` provided to `HttpApiBuilder.layer(B)` — is closed at request time by
D-36-e. **Recommendation: (A).** Not breaking on its own (additive). `status: decided (2026-10-08, recommended default)`

### D-36-b — `RequirePermissionLive` and `registerApi` leave the public surface (**breaking**, needs sign-off)

- **(A) Remove both from the barrel (recommended).** `RequirePermissionLive` becomes the internal
  `makeRequirePermission(members)` in `RequirePermissionMiddleware.ts`; `registerApi`'s walk becomes
  `GuardApi.ts`'s internal `walkApi`. Migration is mechanical: `Layer.provide(RequirePermissionLive)` +
  `registerApi(Api)…` → `Layer.provide(guardApi(Api))`. In-repo callers: `examples/http-advanced/server.ts`,
  `check-package-install.mjs`, 11 test stacks (C4). As long as `RequirePermissionLive` is public, C2's
  omission stays one forgotten line away.
- **(B) Keep both, documented as low-level.** Source-compatible; C2 remains possible and the registry's
  claim stays conditional.
- **(C) Deprecate for one minor, remove in the next.** Every package is 0.x in one fixed group and the
  precedent (ADR-QD-081 D-04-d, ARCH-19 D-19-c/e) is a direct breaking minor; a deprecation window adds a
  second migration for the same change.

**Recommendation: (A).** **Breaking → user sign-off.** `status: decided (2026-10-08, recommended default)`

### D-36-c — `guardRoute` and `authorizeRequest`

- **(A) `guardRoute` private; `authorizeRequest` stays public and says it registers nothing (recommended).**
  `guardRoute` has no production caller but `addGuardedRoute` (C8), and its only distinct capability is
  enforcement without registration. `authorizeRequest` is the primitive ARCH-19 D-19-b (decided) exposed
  for surfaces this package does not ship (C7); it is not a route, so "registered" has no meaning for it
  until the caller mounts something — its doc and the registry's claim name `PermissionRegistry.register`
  (already public, `PermissionRegistry.ts:68-69`) as that surface's registration.
- **(B) Both private.** Reverses a decided ARCH-19 recommendation and the compiled website/README fence
  with no in-repo replacement for a custom surface.
- **(C) Both public** (status quo). Leaves an unregistered bare-route path one import away.
- **(D) (A) plus a `registerSurface(method, path, permission)` helper** beside `authorizeRequest`. It would
  be `Layer.effectDiscard(PermissionRegistry.register(permission, { method, path, group: undefined }))`,
  one line over an existing public static; not worth a name.

**Recommendation: (A).** Removing `guardRoute` is **breaking → user sign-off.** `status: decided (2026-10-08, recommended default)`

### D-36-d — What `guardApi` does with an endpoint `RequirePermission` is not attached to (C3)

- **(A) Refuse every such endpoint of the API, at compile time and at layer build (recommended).**
  Compile time: `guardApi`'s parameter is `HttpApi<Id, Groups> & EveryEndpointGuarded<Groups>`, where
  `EveryEndpointGuarded` is `unknown` when `UnguardedEndpoints<Groups>` is `never` and otherwise
  `{ readonly "qadi: endpoints without RequirePermission": UnguardedEndpoints<Groups> }` — the shape
  `typeprobe-attached.ts` proved, whose error names the offending identifiers. Layer build: the walk
  fails with `RequirePermissionNotAttached { group, endpoint }` for the first endpoint whose
  `middleware` set lacks `RequirePermission` — the defense for a widened `HttpApi` type. "Every
  endpoint", including undeclared ones: an endpoint of a guarded API with no middleware is served with no
  check at all, which is exactly what INV-QD-034 forbids; one meant to be open is declared with
  `publicEndpoint`, which needs the middleware attached to take effect.
- **(B) Refuse only declared (`Required`/`Public`) endpoints that lack the middleware.** Narrower; an
  undeclared, unattached endpoint stays silently unguarded inside a "guarded" API.
- **(C) Runtime refusal only.** Simpler types; the mistake is found at boot instead of at compile.

**Recommendation: (A)**, layered: compile-time where the type is precise, runtime always. T1's defect
fix (before `guardApi` exists) applies (B)'s scope to `registerApi`, which is correct under every option.
`status: decided (2026-10-08, recommended default)`

### D-36-e — An endpoint outside the API `guardApi` registered, at request time

- **(A) Refuse with 500 and one error log naming the group and endpoint (recommended).** The middleware
  closure carries the set of `group/endpoint` identifier keys the walk registered; an endpoint not in it
  was neither registered nor checked for misplacement/attachment, so serving it would reopen C2. Same
  `refuse` shape as "declares neither".
- **(B) Enforce it anyway and log a warning.** Keeps C2 alive, with a log line.
- **(C) No check** (accept the mismatch). The one way `guardApi` could still enforce without registering.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-36-f — Who owns "the stack"

- **(A) No public composer; a test-only fixture `packages/http/test/fixtures/serve.ts` (recommended).**
  `serve(routes, { subjects, services, cache?, logs? })` returns `{ handler, dispose }` over
  `routes → PermissionRegistryLive → subjects → services → (cache) → layerServices (→ Logger)`, used by
  the 15 `packages/http/test` stacks that have that shape. Examples and the feature keep their own
  composition (they are documentation of composition). The four stale "infers `any`" comments are
  corrected (C5).
- **(B) A public `qadiHttpLayer({ routes, subjects, services })`.** A `Layer.provideMerge` chain under a
  name; it would have to grow an option for every application input (cache, log, logger), and C5 removes
  its original justification.
- **(C) Nothing.** Leaves 15 near-identical test compositions and four false comments.

**Recommendation: (A).** Not breaking. `status: decided (2026-10-08, recommended default)`

### D-36-g — ADR form and the invariant

- **(A) Amend ADR-QD-036 (Rev 1.6) and add INV-QD-NEXT "`/__permissions` lists what `@qadi/http` enforces,
  and only that" (recommended).** Matches ARCH-18/19's practice (Rev 1.4, 1.5). The invariant gives
  BEH-QD-180's "listed ⟺ enforced" requirement an enforcement row: `endpointAccess.test.ts`'s differential
  and `GuardApi.test.ts`.
- **(B) A new ADR-QD-NEXT "A guarded HttpApi registers itself".** Clearer as a standalone record, but it
  reopens one paragraph of 036 rather than deciding something 036 did not.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08: worktree branched from the merged wave-4 head; ARCH-45's denial tap is already inside `enforce` and moved verbatim; the T1 state was already present)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/36-guarded-httpapi main`; record `git rev-parse --short HEAD`.
  2. `git diff --stat e635e68 HEAD -- packages/http/src packages/http/test examples/http-advanced scripts/check-package-install.mjs spec/behaviors/23-http.md`.
     If anything moved, re-read §1's line numbers and correct them in §10.
  3. Re-run the five probes with the commands in §1 (copy them to a fresh scratch directory, symlink
     `node_modules` to `packages/http/node_modules`, keep the absolute import of `packages/http/src/index.ts`).
     Expect the §1 table, `log lines: []`, and both type probes as described.
  4. Check ARCH-45: `git log --oneline main -- packages/http/src/RequirePermission.ts`. If its denial-tap
     fix landed, note that T5 moves the tap with `enforce`; if not, note that ARCH-45 will apply it in
     `RequirePermissionMiddleware.ts` (§4).
  5. Check ARCH-31 (remote port serving route in `@qadi/http`): if it added a route built on `guardRoute`
     or an `HttpApi` served with `RequirePermissionLive`, add it to T5/T7's migration list.
- **Tests:** none.
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** baseline counts and probe output are recorded in §10.

### T1 — Test-first: the registry never lists an endpoint `RequirePermission` is not attached to (defect C3)
- **Status:** [x] done (2026-10-08, branch `wave4/security-patches`, uncommitted)
- **Depends on:** T0. No decision: refusing a *declared* endpoint without the middleware is correct
  under every D-36-d option.
- **Files:** `packages/http/test/endpointAccess.test.ts`; `packages/http/src/PermissionRegistry.ts`;
  `packages/http/test/RequirePermission.tst.ts`.
- **Steps:**
  1. In `endpointAccess.test.ts`, add three cases beside `case1…case7` (`:146-216`), using `ep`, `required`
     and `done`:
     - `case8` "middleware before add": `HttpApi.make("t").middleware(RequirePermission).add(HttpApiGroup.make("g").add(ep("a").pipe((e) => e.annotate(RequiredPermission, required(e)))))`.
     - `case9` "no middleware": the same group, `HttpApi.make("t").add(group)` with no `.middleware`.
     - `case10` "middleware on one group only": `g1` with `.middleware(RequirePermission)` holding `/a`,
       `g2` without it holding `/b`, both endpoints `required(e)`.
     Append them to `placements` (`:218-226`) so the existing "listed under P if and only if P is
     enforced" loop (`:233-242`) covers them.
  2. Add one direct test: `"an endpoint the middleware is not attached to is refused by registerApi, naming it"` —
     `observe(case8…)` returns `registryError._tag === "RequirePermissionNotAttached"`, `group === "g"`,
     `endpoint === "a"`, and `statuses.get("/a") === 204` (documenting that the *serving* is Effect's and
     only `guardApi` (T3) refuses the composition outright).
  3. Run: **red** for cases 8–10 (listed `document:read`, enforced `undefined`), matching probe cases 3–5.
  4. Fix in `PermissionRegistry.ts`: declare
     `export class RequirePermissionNotAttached extends Data.TaggedError("RequirePermissionNotAttached")<{ readonly group: string; readonly endpoint: string }>`
     with a `message` getter: `endpoint "<endpoint>" of group "<group>" declares access, but the RequirePermission middleware is not attached to it, so nothing would enforce it. Call .middleware(RequirePermission) after the group is added (HttpApi.middleware applies only to endpoints already added).`
     Doc: one-line summary, then why (C3, Effect's `HttpApi.ts:100-104` gotcha, CCR-QD-NEXT).
  5. In `registerApi`'s `onEndpoint` (`:151-162`), read `middleware` from the reflect options; in the
     `Required` and `Public` arms, if `!middleware.has(RequirePermission)` push a
     `RequirePermissionNotAttached` into a second `unattached` array instead of registering. Fail with the
     first misplaced declaration, else the first unattached endpoint, before registering anything (same
     "nothing half-registered" rule as `:164-168`). Widen the return type to
     `Layer.Layer<never, MisplacedAccessDeclaration | RequirePermissionNotAttached, PermissionRegistry>`.
     Import `RequirePermission` (value) from `./RequirePermission.ts` — an existing edge.
  6. `RequirePermission.tst.ts:62-66`: extend "registerApi can fail with MisplacedAccessDeclaration" to the
     two-member union.
  7. Run: green; every existing `endpointAccess.test.ts` and `http.test.ts` case unchanged.
- **Tests:** three differential cases + one direct test, red first; one type test widened.
- **Verify:** `pnpm vitest run packages/http/test/endpointAccess.test.ts packages/http/test/http.test.ts`;
  `pnpm test:tstyche`; `node scripts/check-house-style.mjs`; `pnpm circular`.
- **Done when:** green, and §10 records the red case names. Shippable alone: `@qadi/http` `minor`
  (registerApi's error union widens), "an annotated endpoint the middleware is not attached to is no
  longer listed as guarded; `registerApi` refuses it". The overview row for the new error is added here
  (gate 13).

### T2 — Make the registry's claim true today, and pin the omission it currently allows (C2)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision.
- **Files:** `packages/http/src/PermissionRegistry.ts` (`:73-78`, `:203-205`, `:239-243`);
  `packages/http/src/DecisionStreamRoute.ts` (`:264-268`); `packages/http/src/DecisionBacklogRoute.ts` (`:21`);
  `packages/http/test/http.test.ts`.
- **Steps:**
  1. Reword the three overclaims to what holds: "every permission registered with `PermissionRegistry` —
     by `addGuardedRoute`, by `registerApi` for an `HttpApi`, or by a caller's own
     `PermissionRegistry.register` — and the routes that require it". `PermissionRegistryLive`'s doc
     (`:73-78`) keeps its "compose `registerApi`" sentence until T5 replaces it with `guardApi`.
  2. In `http.test.ts`, add `"an HttpApi enforced without registerApi is absent from /__permissions (the omission guardApi removes)"`:
     the `http.test.ts:701-712` attribute stack plus `PermissionRegistryLive` and
     `permissionRegistryRouteUnguarded("test")`; assert `/attribute-checked` answers 403 to Bob and the
     snapshot is `[]`. It passes today, pinning C2 as observed behavior; T5 deletes it when the
     composition stops being expressible (the name says so).
- **Tests:** one characterization.
- **Verify:** `pnpm vitest run packages/http/test/http.test.ts`; `grep -rn "every permission this application enforces" packages`.
- **Done when:** the grep finds no unconditional claim. Shippable with T1 as the same patch.

### T3 — `GuardApi.ts`: one layer that enforces, registers and refuses
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, D-36-a (= A), D-36-d (= A)
- **Files:** `packages/http/src/GuardApi.ts` (*new*); `packages/http/src/RequirePermissionMiddleware.ts` (*new*);
  `packages/http/src/RequirePermission.ts`; `packages/http/src/index.ts`; `packages/http/test/GuardApi.test.ts` (*new*);
  `packages/http/test/GuardApi.tst.ts` (*new*).
- **Steps:**
  1. Create `RequirePermissionMiddleware.ts` (internal, not in the barrel). Move `RequirePermissionLive`'s
     `Layer.effect` body (`RequirePermission.ts:375-464`) into
     `export const makeRequirePermission = Effect.fn(function* (members: ReadonlySet<string> | undefined) { … })`
     (or a plain function returning the `Effect.gen` if `Effect.fn` cannot carry the middleware closure's
     inferred type without a cast — check with `pnpm typecheck`). Move `enforce` and `refuse`
     **verbatim**; add no tap (§4, ARCH-45). `members === undefined` means "no membership check" and is
     used only by T3's transition and by tests that build the bare middleware. In `RequirePermission.ts`,
     `RequirePermissionLive` becomes `Layer.effect(RequirePermission, makeRequirePermission(undefined))`
     for now (T5 removes it).
  2. Create `GuardApi.ts`. Module doc: one-line summary ("The one layer that guards an `HttpApi`: it
     provides `RequirePermission` for that API and, by being built, registers every endpoint it
     enforces"), then why — C2, C3, ADR-QD-036 Rev 1.6, CCR-QD-NEXT.
  3. Move `registerApi`'s walk into a module-private pure `walkApi(api)` returning
     `{ found: ReadonlyArray<[Permission, EndpointDescriptor]>, refusal: ApiGuardRefusal | undefined, members: ReadonlySet<string> }`.
     It applies, in order: `misplacedDeclarations(api.annotations)`, per-group `misplacedDeclarations`,
     per-endpoint attachment (`middleware.has(RequirePermission)`, every endpoint per D-36-d = A), then
     `endpointAccess` → `found` for `Required`. `members` holds `${group.identifier}/${endpoint.identifier}`
     for every endpoint. `registerApi` (still public until T5) becomes a call to `walkApi` + register, so
     T1's behavior is preserved by one implementation.
  4. Export `export type ApiGuardRefusal = MisplacedAccessDeclaration | RequirePermissionNotAttached;`
     (closed union) and the compile-time check from `typeprobe-attached.ts`:
     `export type UnguardedEndpoints<Groups>` (unconstrained `infer`, C14) and
     `export type EveryEndpointGuarded<Groups> = [UnguardedEndpoints<Groups>] extends [never] ? unknown : { readonly "qadi: endpoints without RequirePermission": UnguardedEndpoints<Groups> }`.
  5. Write
     ```ts
     export const guardApi = <Id extends string, Groups extends HttpApiGroup.Constraint>(
       api: HttpApi.HttpApi<Id, Groups> & EveryEndpointGuarded<Groups>,
     ): Layer.Layer<RequirePermission, ApiGuardRefusal, SubjectExtractor | StandingEvaluationServices | PermissionRegistry> =>
       Layer.effect(RequirePermission, Effect.gen(function* () {
         const walked = walkApi(api);
         if (walked.refusal !== undefined) return yield* Effect.fail(walked.refusal);
         const registry = yield* PermissionRegistry;
         yield* Effect.forEach(walked.found, ([p, d]) => registry.register(p, d), { discard: true });
         return yield* makeRequirePermission(walked.members);
       }));
     ```
     Doc: what it provides, that registration is a consequence of building it, the three refusals, that
     one `guardApi` serves one API (compose APIs with `HttpApi.addHttpApi`, or provide each `guardApi`
     to its own `HttpApiBuilder.layer` with `Layer.provide`), and that a surface this package does not
     ship uses `authorizeRequest` and registers with `PermissionRegistry.register`.
  6. `index.ts`: add `export * from "./GuardApi.ts";` alphabetically (before `GuardRoute.ts`).
  7. `GuardApi.test.ts`: (a) built over the `http.test.ts` `Api`, the snapshot equals today's registry
     snapshot for that API; (b) the differential "listed ⟺ enforced" over all ten `endpointAccess`
     placements, served with `Layer.provide(guardApi(api))` — attachment cases fail layer build and
     list nothing; (c) a "forgot to register" case is unrepresentable: one test serves an API through
     `guardApi` and asserts `/__permissions` lists it with no `registerApi` anywhere (the C2 regression);
     (d) a failing build registers nothing (a pre-existing `addGuardedRoute` entry is the only one left);
     (e) `HttpApiTest.groups(Api, ["documents"])` runs with `Layer.provideMerge(guardApi(Api))` +
     `PermissionRegistryLive` (C10).
  8. `GuardApi.tst.ts` (tstyche): `guardApi` accepts `.add(G).middleware(RequirePermission)` and the
     options-less `HttpApi` (`RequirePermission.tst.ts:44`'s fixture); `type.not.toBeCallableWith` for
     middleware-before-add, no middleware, one group only; the layer's requirement includes
     `PermissionRegistry` and its error is exactly `ApiGuardRefusal`.
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/http/test/GuardApi.test.ts packages/http/test/endpointAccess.test.ts`;
  `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs` (rows for `guardApi`, `ApiGuardRefusal`, `UnguardedEndpoints`,
  `EveryEndpointGuarded` added now).
- **Done when:** green, no `as`/`any`, madge clean.

### T4 — The middleware refuses an endpoint outside the API it registered (D-36-e)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, D-36-e (= A)
- **Files:** `packages/http/src/RequirePermissionMiddleware.ts`; `packages/http/test/GuardApi.test.ts`.
- **Steps:**
  1. In the returned closure, before the group-misplacement check: when `members !== undefined` and
     `!members.has(`${group.identifier}/${endpoint.identifier}`)`, `return refuse(...)` with
     `qadi/http: endpoint "<endpoint>" of group "<group>" is not part of the HttpApi this RequirePermission was built for, so it was never registered and is refused. Provide guardApi(<that api>) to the HttpApiBuilder.layer that serves it.`
  2. Test: `guardApi(A)` provided to `HttpApiBuilder.layer(B)` (B shares no endpoint keys with A) →
     500, exactly one log line with that text, `/__permissions` lists A's endpoints only.
  3. Test: two APIs each provided their own `guardApi` locally, merged into one router — both enforced,
     both listed.
- **Verify:** `pnpm vitest run packages/http/test/GuardApi.test.ts`.
- **Done when:** both pass and the log is exact.

### T5 — Remove `RequirePermissionLive`, `registerApi` and `guardRoute` from the surface (D-36-b, D-36-c)
- **Status:** [x] done (2026-10-08; D-36-b/c = A, breaking)
- **Depends on:** T3, T4, D-36-b (= A), D-36-c (= A), T0 step 4 (ARCH-45 ordering)
- **Files:** `packages/http/src/RequirePermission.ts`; `packages/http/src/PermissionRegistry.ts`;
  `packages/http/src/RequirePermissionMiddleware.ts`; `packages/http/src/GuardApi.ts`;
  `packages/http/src/index.ts`; `packages/http/src/AuthorizeRequest.ts` (doc only);
  `packages/http/test/RequirePermission.tst.ts`; `packages/http/test/GuardRoute.tst.ts`;
  `packages/http/test/http.test.ts`; `packages/http/test/endpointAccess.test.ts`;
  `packages/http/test/RequirePermissionClient.test.ts`.
- **Steps:**
  1. Delete `RequirePermissionLive` from `RequirePermission.ts`; move its doc paragraphs that describe
     the middleware (`:286-355` stay on the class; the "resolved once at layer-build time" comment moves
     with `makeRequirePermission`). `makeRequirePermission`'s parameter becomes required
     (`ReadonlySet<string>`), deleting the transitional `undefined`.
  2. Delete `registerApi` from `PermissionRegistry.ts` (its walk already lives in `GuardApi.ts`);
     `MisplacedAccessDeclaration` and `RequirePermissionNotAttached` move to `GuardApi.ts` beside
     `ApiGuardRefusal` (public, same names). `PermissionRegistryLive`'s doc says: "compose `guardApi` for
     an `HttpApi`; `addGuardedRoute` for a bare route".
  3. `index.ts`: delete `export * from "./GuardRoute.ts";`. `PermissionRegistry.ts` keeps
     `import { guardRoute } from "./GuardRoute.ts"`.
  4. `AuthorizeRequest.ts` doc: add "It registers nothing: a surface built on it that should appear in
     `/__permissions` registers with `PermissionRegistry.register` when its layer is built."
  5. Tests: `RequirePermission.tst.ts:44-66` (`registerApi` tests) move to `GuardApi.tst.ts` as `guardApi`
     tests (accepts options-less API; error is `ApiGuardRefusal`); `GuardRoute.tst.ts` already imports by
     path and stays. In every test stack listed in C4 that uses `RequirePermissionLive` and/or
     `registerApi`, replace with `Layer.provide(guardApi(Api))` (+ `PermissionRegistryLive` where absent).
     `endpointAccess.test.ts`'s `observe` reads the registry from a built `guardApi` (it already reads a
     built layer). `RequirePermissionClient.test.ts:140-151` uses `Layer.provideMerge(guardApi(Api))` +
     `PermissionRegistryLive`. Delete T2's characterization (no longer expressible). Keep
     `http.test.ts:369-379` (ordering) — it may import `guardRoute` from `../src/GuardRoute.ts`.
  6. `grep -rn "RequirePermissionLive\|registerApi" packages/http/src` → only history-bearing doc text,
     reworded to name `guardApi`.
- **Tests:** every migrated test passes with unchanged assertions (statuses, bodies, exact logs).
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`;
  `node scripts/check-api-surface.mjs` (remove the STALE `guardRoute`, `RequirePermissionLive`, `registerApi`
  rows in the same commit).
- **Done when:** criterion 3's grep holds and all http tests pass.

### T6 — One test-only stack fixture (D-36-f)
- **Status:** [x] done (2026-10-08; partial adoption, see section 10)
- **Depends on:** T5, D-36-f (= A)
- **Files:** `packages/http/test/fixtures/serve.ts` (*new*); `packages/http/test/http.test.ts`;
  `packages/http/test/decisionStream.test.ts`; `packages/http/test/decisionBacklog.test.ts`;
  `packages/http/test/endpointAccess.test.ts`.
- **Steps:**
  1. Write `serve(routes, { subjects, services, cache?: boolean, logs?: Array<unknown> })` →
     `HttpRouter.toWebHandler(app, logs ? { disableLogger: true } : undefined)` over
     `routes → PermissionRegistryLive → subjects → services → (decisionCacheLayer()) → HttpServer.layerServices (→ Logger.layer capturing into logs)`.
     Its parameter types are generic over the route layer's requirements; no `any`.
  2. Replace the 15 `packages/http/test` compositions with that shape (C4's inline and named lists minus
     the three `v4-http-smoke.test.ts` canaries, which stay Effect-only). A stack that differs (the
     `http.test.ts:322-327` registry-only one) keeps its own composition.
  3. Delete the stale "infers `any`" comments at `http.test.ts:167-170` and `decisionStream.test.ts:137-140`.
- **Tests:** none added; every assertion unchanged.
- **Verify:** `pnpm vitest run --project http`; `pnpm coverage` for `packages/http` (≥ 90%).
- **Done when:** green and `grep -c "HttpServer.layerServices" packages/http/test/*.test.ts` drops to the
  canaries plus the documented exceptions.

### T7 — Examples, the install gate's consumer, the feature, stale comments
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5
- **Files:** `examples/http-advanced/server.ts`; `examples/nextjs-newsroom/src/server/api.ts` (comment
  only); `scripts/check-package-install.mjs`; `features/features/decision-log/decision-log.steps.test.ts` (none
  unless it imports a removed name — it does not today).
- **Steps:**
  1. `http-advanced/server.ts`: `ApiRoutes` (`:154-157`) becomes
     `HttpApiBuilder.layer(Api).pipe(Layer.provide(DocumentsHandlers), Layer.provide(guardApi(Api)))`;
     `RegistryLayer` (`:259`) becomes `PermissionRegistryLive`; the header list item 5 (`:24-25`) and the
     comment at `:256-258` say registration happens because `guardApi` built. Correct the "silently infer
     `any`" comment (`:207-209`): named steps are for reading, the inference failure is not reproducible
     on `effect@4.0.0` (C5).
  2. Newsroom `api.ts:11-16`: the same correction. No code change (it has no `HttpApi`).
  3. `check-package-install.mjs:430-436, :544-553`: import `guardApi`, `PermissionRegistryLive`; build
     `Layer.provide(guardApi(HttpFixtureApi))` and add `Layer.provideMerge(PermissionRegistryLive)`. Add
     one assertion that `RequirePermissionLive` is **not** an export of the packed `@qadi/http` (the
     closed-surface check, ADR-QD-099), next to the existing allow/deny assertions.
- **Verify:** `node_modules/.bin/tsc -p examples/http-advanced/tsconfig.json --noEmit` (by hand — not gated,
  C15); `pnpm example`; `node scripts/check-package-install.mjs`; `pnpm test:bdd`.
- **Done when:** all clean.

### T8 — Spec, ADR, overview, traceability, CCR, docs, changeset
- **Status:** [x] done (2026-10-08; CCR-QD-311, INV-QD-180, BEH-QD-328)
- **Depends on:** T3–T7, D-36-g
- **Files:** `spec/behaviors/23-http.md`; `spec/behaviors/26-decision-stream.md`; `spec/behaviors/07-enforcement.md`;
  `spec/invariants.md`; `spec/decisions/036-qadi-http-package-shape.md`; `spec/decisions/075-clienterror-typing-for-requirepermission.md`;
  `spec/overview.md`; `spec/traceability.md`; `spec/README.md`; `packages/http/README.md`;
  `apps/website/src/content/docs/docs/packages/http.md`; `.changeset/guarded-httpapi.md` (*new*).
- **Steps:** every edit in §8, then the gates below.
- **Verify:** `node scripts/check-api-surface.mjs`; `node scripts/check-doc-examples.mjs`;
  `node scripts/check-website-doc-examples.mjs`; `pnpm spec:verify:strict`; `pnpm spec:gates`; `pnpm spec:claims`.
- **Done when:** all pass.

### T9 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T8
- **Files:** none.
- **Steps:** `pnpm check`. In `stryker.http.mjs`, the walk's three refusal branches, the attachment check,
  the membership refusal and the registration loop must be killed by T1/T3/T4's tests; a survivor is a
  missing test or a recorded finding, never suppressed (ADR-QD-076).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T10 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T9
- **Files:** this plan's frontmatter and §10; the orchestrator owns `.planning/architecture/README.md`.
- **Steps:** set `status:`, tick tasks, record decisions as `decided (<date>, <choice>)` and the assigned
  CCR/BEH/INV numbers; tell the ARCH-45 owner where `enforce` now lives.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-36-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **Survive unchanged (assertions):** all of `http.test.ts` (statuses, bodies, exact logs `:806-871`, the
  ordering test `:360-399`, cache `:400-492`, disclosure, the two `ProbeLayer` characterizations
  `:944-969`), `RequirePermissionClient.test.ts`, `decisionStream.test.ts`, `decisionBacklog.test.ts`,
  `AuthorizeRequest.test.ts`, `GuardRoute.tst.ts`, `RequirePermission.tst.ts`'s class/client tests. Only
  their *composition* moves (T5 `guardApi`, T6 fixture).
- **New:** T1's three attachment placements and direct refusal test (red first); `GuardApi.test.ts`
  (registration-by-construction, differential over ten placements, no-half-registration, `HttpApiTest`
  compatibility, membership refusal ×2); `GuardApi.tst.ts` (compile-time attachment refusal, requirement
  and error types).
- **Moved, not layered:** `RequirePermission.tst.ts`'s two `registerApi` tests become `GuardApi.tst.ts`
  tests; T2's characterization of the omission is deleted in T5 once it is unexpressible.
- **Differential:** `endpointAccess.test.ts`'s "listed under P iff P is enforced" is the property; it
  grows from 7 to 10 placements and runs against `guardApi` after T5. It is INV-QD-NEXT's enforcement.
- **Type-level:** `tstyche` is the only thing that can pin D-36-d's compile-time half.
- **Mutation:** `stryker.http.mjs`. The attachment check (`middleware.has`), the misplaced/unattached
  precedence, the "fail before register" ordering and the membership key are each flipped by a named test.

## 8. Spec and documentation updates

- **BEH-QD-NEXT** (`23-http.md`) "A guarded `HttpApi` is registered by the layer that guards it", with
  a `ts` signature fence for `guardApi`, `ApiGuardRefusal`, `RequirePermissionNotAttached`,
  `UnguardedEndpoints`/`EveryEndpointGuarded`, and REQUIREMENTs: `guardApi(api)` MUST register every
  endpoint it enforces when it is built, and nothing if it refuses; an endpoint of the API without the
  `RequirePermission` middleware MUST be refused (compile time where the type is precise, layer build
  always); the middleware MUST refuse (500 + log) an endpoint outside the API it was built for.
- **BEH-QD-180:** replace the `registerApi` fence with `guardApi`; delete "`registerApi` is opt-in by
  contrast, and an `HttpApi` application that omits it gets an empty snapshot" (`:391-393`) and state that
  both surfaces register as a consequence of guarding; keep "MUST list … only if `RequirePermission`
  enforces P" and point it at BEH-QD-NEXT. `:439`: "Enforcement runs through `addGuardedRoute`".
- **BEH-QD-320:** `registerApi` → `guardApi` in both REQUIREMENTs and the fence; `MisplacedAccessDeclaration`'s
  declared file becomes `GuardApi.ts`.
- **BEH-QD-321:** the surface list says "`RequirePermission` (through `guardApi`), `addGuardedRoute` and
  the decision stream's recheck"; add "`authorizeRequest` registers nothing; a surface built on it
  registers with `PermissionRegistry.register`". `:158`, `:345`: `guardRoute` → `addGuardedRoute`.
- **`26-decision-stream.md`** (`:183, :203, :231, :236, :348`) and **`07-enforcement.md:201`**: present-tense
  `guardRoute`/`RequirePermissionLive` become `addGuardedRoute`/"the `RequirePermission` middleware".
  Change History rows stay as written (AGENTS.md §15 exemption).
- **INV-QD-034:** Source names `guardApi` and the attachment refusal. **INV-QD-NEXT** (D-36-g = A):
  "`/__permissions` lists what `@qadi/http` enforces, and only that" — Source: `GuardApi.ts`,
  `PermissionRegistry.ts`'s `addGuardedRoute`; Enforcement: `endpointAccess.test.ts`'s differential,
  `GuardApi.test.ts`; Related: INV-QD-034, BEH-QD-180, BEH-QD-320.
- **ADR-QD-036 Rev 1.6** (CCR-QD-NEXT): the registry paragraph (`:185-197`) gains "Rev 1.6: the `HttpApi`
  half is the layer that provides `RequirePermission` (`guardApi`), so it registers because it guards";
  the Negative bullet (`:268-271`) is answered; record C3 and the Effect gotcha; record that
  `guardRoute`/`RequirePermissionLive`/`registerApi` left the surface (D-36-b/c).
- **ADR-QD-075:** one sentence under "left open" (`:200-210`): the compile-time attachment check is a
  sibling (ARCH-36), not the client-typing completeness check, which stays open.
- **`spec/overview.md`** (gate 13): remove rows `guardRoute` (`:565`), `RequirePermissionLive` from `:558`,
  `registerApi` from `:568`; move `MisplacedAccessDeclaration` to `GuardApi.ts`; add rows `guardApi`
  (layer factory), `ApiGuardRefusal`, `RequirePermissionNotAttached`, `UnguardedEndpoints`,
  `EveryEndpointGuarded`; update `endpointAccess` (`:554`) and `NO_RESOURCE` row wording; rewrite the
  narrative (`:593-616`) for `guardApi` + `addGuardedRoute`; Change History row (breaking). Do **not**
  edit `:584` — that is ARCH-45's.
- **`spec/traceability.md`:** BEH-QD-NEXT and INV-QD-NEXT rows → `GuardApi.ts`, `GuardApi.test.ts`,
  `GuardApi.tst.ts`, `endpointAccess.test.ts`; INV-QD-034 row (`:116`) Source → `guardApi`.
- **`spec/README.md`:** CCR-QD-NEXT naming every document above.
- **`packages/http/README.md`** (`:28-31`, `:95-106`) and **website `packages/http.md`** (`:34-38`, `:69-71`,
  `:73-78`, `:166-190`): `guardApi` replaces `RequirePermissionLive`/`registerApi`; `guardRoute` is no
  longer mentioned; the registry section says both surfaces register because they guard and that a custom
  surface on `authorizeRequest` registers with `PermissionRegistry.register`. Add one compiled
  ` ```typescript ` fence to the website (gate 22) and README (gate 9 does not read READMEs; check
  `check-doc-examples.mjs`'s inputs in T8):
  `HttpApiBuilder.layer(Api).pipe(Layer.provide(Handlers), Layer.provide(guardApi(Api)))` with the imports.
- **Changeset** `.changeset/guarded-httpapi.md`: `"@qadi/http": minor`, **Breaking**: `RequirePermissionLive`,
  `registerApi` and `guardRoute` removed (replacement: `guardApi(api)`, which also requires
  `PermissionRegistry`; `addGuardedRoute`); an endpoint of a guarded API without the `RequirePermission`
  middleware no longer compiles/builds (`RequirePermissionNotAttached`); an endpoint outside the API its
  `RequirePermission` was built for answers 500. Added: `guardApi`, `ApiGuardRefusal`,
  `RequirePermissionNotAttached`, `UnguardedEndpoints`, `EveryEndpointGuarded`. Migration snippet included.
  (T1 alone ships a patch-sized `minor` changeset of its own if split out.)

## 9. Risks and rollback

- **An application that never wanted a registry** now must provide `PermissionRegistryLive` to use
  `guardApi`. It is a compile-time requirement and a one-line fix; `addGuardedRoute` has always required it.
  Shows as a type error at upgrade.
- **Two APIs in one context.** Merging two `guardApi` layers into one context lets the later
  `RequirePermission` shadow the earlier; T4 makes the shadowed API's endpoints answer 500 with a log
  naming the fix, instead of being enforced unregistered. Documented on `guardApi`; `HttpApi.addHttpApi` is
  the recommended composition.
- **Compile-time check brittleness.** `UnguardedEndpoints` relies on `HttpApiGroup.Endpoints` and
  `HttpApiEndpoint.Middleware`, which an `effect` upgrade could reshape. `GuardApi.tst.ts` is the canary;
  the runtime refusal holds regardless.
- **Handler-scope regression.** The middleware body moves files; if `enforce` or the
  `Effect.provide(evaluationServices)`/projection wrapping changed, `http.test.ts:944-969`'s
  characterizations fail. Move verbatim.
- **ARCH-45 conflict.** Same closure, different lines; the ordering rule in §4 decides who rebases.
- **ARCH-31 (wave 4)** adds a remote-port serving route to `@qadi/http`. If it is a bare route it should use
  `addGuardedRoute`; if it is an `HttpApi`, `guardApi`. T0 step 5 checks.
- **Rollback.** T1 and T2 are independent patches. T3–T4 are additive and revert alone. T5–T8 revert
  together (the breaking removal and its spec/docs/changeset).

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e635e68` (probes `scratchpad/wave4/ARCH-36/probe.mts`, `probe-handler-denial.mts`, `probe-attached.mts`, `typeprobe.ts`, `typeprobe-attached.ts`) | planner |
| 2026-10-08 | T1 | Red cases 8, 9, 10 (middleware before add, none, one group): listed `document:read`, enforced `undefined`. Added `RequirePermissionNotAttached`; `registerApi` refuses before registering. Case 10 (one group only) is a direct test, not a `placements` row: the registry is all-or-nothing, so `/a` (enforced) is deliberately unlisted. Overview row + changeset `registry-refuses-unenforced-endpoints.md`. `pnpm typecheck`, `vitest packages/http` (169), `test:tstyche`, `check-house-style`, `circular`, `check-api-surface` green | claude |
| 2026-10-08 | T0, T2 | Re-baselined on the merged wave-4 head (T1 present; ARCH-45's tap already inside `enforce`). T2: the three `/__permissions` overclaims reworded; the "enforced without registerApi is absent" characterization passed on first run (observed behavior), then was deleted in T5 | claude |
| 2026-10-08 | T3, T4, T5 | Done as one change: `makeRequirePermission(members)` in `RequirePermissionMiddleware.ts` (body moved with `enforce` and the handler-denial tap byte-for-byte, re-indented; the membership check is the only added code; `members` is required from the start, so no transitional `undefined`), `guardApi`/walk/errors in `GuardApi.ts`. `RequirePermissionLive`, `registerApi`, `guardRoute` out of the barrel. Plan corrections: (1) `endpointAccess.test.ts`'s `observe` cannot pass cases 8-10 to `guardApi` (it refuses them at compile time and at build), so those three carry a `@ts-expect-error` (which also pins the compile-time refusal) and the enforcement half serves the bare middleware built from `makeRequirePermission` over the API's own member keys; the integrated served path is `GuardApi.test.ts`. (2) T1's attachment check covered only Required/Public endpoints; `guardApi` widens it to every endpoint, per D-36-d = A. (3) T3's tests were written with the code, not red-first: `guardApi` is new and additive, so there was nothing for them to fail against except a missing import | claude |
| 2026-10-08 | T6 | `fixtures/stack.ts` (`stack`, `stackWithCache`). Adopted by the five compositions with exactly that shape in `http.test.ts` (`AppLayer`, both attribute stacks, `ProbeLayer`, the unguarded-registry test), `decisionStream.test.ts` (2), `decisionBacklog.test.ts`, `GuardApi.test.ts`. Left as they were: the ad-hoc partial stacks in `http.test.ts` built on `WithRegistry` or with a broken extractor, `endpointAccess.test.ts`'s `observe` (needs the bare middleware and two builds), `RequirePermissionClient.test.ts` (`HttpApiTest`, no router) and the `decisionStream` flaky-extractor test. The plan's "15 stacks" count was optimistic; 9 moved. Stale "infers `any`" comments corrected in `http.test.ts`, `decisionStream.test.ts`, `examples/http-advanced/server.ts`, `examples/nextjs-newsroom/src/server/api.ts` | claude |
| 2026-10-08 | T7, T8 | Example and install-gate consumer migrated to `guardApi` (+ `PermissionRegistryLive`); the consumer asserts `RequirePermissionLive`, `registerApi`, `guardRoute` are not exported (`Object.keys(await import("@qadi/http"))`, no widening cast). Spec: BEH-QD-328 new, BEH-QD-180/320/321 reworded, INV-QD-180 new, INV-QD-034 updated, ADR-QD-036 Rev 1.7, ADR-QD-075 sibling note, overview rows (gate 13), traceability, CCR-QD-311, README/website docs with a compiled `typescript` fence, changeset `guarded-httpapi.md` (`@qadi/http` minor, breaking). Numbering: next free were CCR-QD-271 / INV-QD-131 / BEH-QD-328; CCR +40 = 311; INV set to 180 to meet the brief's floor (131+40 would be 171) | claude |
| 2026-10-08 | T9 | Run: `pnpm typecheck`, `pnpm lint` (house-style clean, budgets unchanged), `pnpm circular`, `pnpm test:tstyche` (131), `node scripts/check-api-surface.mjs`, `node scripts/check-package-install.mjs`, `pnpm spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:examples`, `spec:website-examples`, `vitest --project http` (179), `pnpm test:bdd` (559), `tsc -p examples/http-advanced/tsconfig.json`. Not run: `pnpm check` as a whole, `pnpm mutation` (survivors in `stryker.http.mjs` unknown), `pnpm example`, e2e, website build | claude |
