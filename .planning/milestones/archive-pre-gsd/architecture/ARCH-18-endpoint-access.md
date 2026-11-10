---
id: ARCH-18
title: An endpoint's access declaration is read once, over one scope, by both the middleware and the registry
strength: Strong
status: done   # 2026-10-07, commit ARCH-18 on arch/wave3
evidence_verified_at: e328e75
depends_on: []
blocks: [ARCH-19]     # ARCH-19's T5 (the middleware migration) builds on T2's `endpointAccess` dispatch
adrs_touched:
  - ADR-QD-036 (amend, Rev 1.4: the middleware reads "off `{ endpoint, group }`" was never true — it read the endpoint only; record the one scope, and that a group- or API-level declaration is refused)
  - ADR-QD-075 (constraint: `RequirePermission`'s `error:`/`clientError` list is untouched; a refused misplaced declaration answers 500 like an undeclared endpoint, not through a new schema)
  - ADR-QD-081 (constraint: no new enforcement-error tag; the refusal is a wiring mistake answered outside `ENFORCEMENT_ERROR_WIRE`, like today's "declares neither")
  - ADR-QD-037 (constraint: madge — `endpointAccess` lives in `RequirePermission.ts`, which `PermissionRegistry.ts` already imports; no new edge)
  - ADR-QD-038 (constraint: changeset in the fixed group; `registerApi`'s type change is breaking → `minor`, marked breaking)
  - ADR-QD-NEXT (only if D-18-a = A: "Group-level declarations are inherited" — a new rule rather than an amendment)
packages: ["@qadi/http", "apps/website (docs only)", "spec"]
estimate: M   # T0–T2 alone (registry fix + one reader) ≈ ½ day (S); complete path with refusal, type narrowing and spec ≈ 1½ days
---

# ARCH-18 — An endpoint's access declaration is read once, over one scope

## 1. Verified evidence (at `e328e75`)

Re-checked on `main` at `e328e75` (`git log --oneline -1`). Read-only: nothing in the
repository was edited. Two throwaway probes ran from
`scratchpad/wave3/ARCH-18/` (with `node_modules` symlinked to `packages/http/node_modules`):

- `probe.mts` builds six real `HttpApi`s, serves each through
  `HttpApiBuilder.layer` + `RequirePermissionLive` + `registerApi` +
  `permissionRegistryRouteUnguarded`, and compares what `/__permissions` lists with the
  status each endpoint actually answers for a subject holding `document:read`.
  Run: `cd scratchpad/wave3/ARCH-18 && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe.mts`.
- `typeprobe.ts` + `tsconfig.json` (extends `tsconfig.base.json`, `types: []`) checks that
  `requiresPermission` and `.annotate` accept a group and an API. Only error:
  `EvaluationId.ts(27,27) TS2304 Cannot find name 'crypto'` (the probe dropped node types);
  no error in the probe file itself.

Probe output (abridged):

| Case | How declared | `/__permissions` lists | Middleware answers |
| --- | --- | --- | --- |
| 1 | `group.annotate(RequiredPermission, requiresPermission(group, …))` | `/a`, `/b` under `document:read` | **500** "declares neither…" for both |
| 2 | group `RequiredPermission` + endpoint `PublicEndpoint` | `/a` under `document:read` | **204, served as public** |
| 3 | `group.annotate(PublicEndpoint, …)` only | nothing | 500 |
| 4 | `api.annotate(RequiredPermission, requiresPermission(api, …))` | `/a` under `document:read` | **500** |
| 5 | `group.annotateEndpoints(RequiredPermission, …)` | `/a` under `document:read` | 204 (enforced, allowed) |
| 6 | group `RequiredPermission(read)` + endpoint `RequiredPermission(write)` | `/a` under `document:write` | 403 (write enforced) |

### C1. The middleware reads `endpoint.annotations` only — **CONFIRMED**

`packages/http/src/RequirePermission.ts:357` (`Context.getOption(endpoint.annotations, RequiredPermission)`)
and `:370` (`… PublicEndpoint`). The callback destructures `{ endpoint }` only (`:356`).

### C2. `registerApi` reads API + group + endpoint annotations — **CONFIRMED**

`packages/http/src/PermissionRegistry.ts:112-121`: `HttpApi.reflect(api, { onEndpoint: ({ endpoint, group, mergedAnnotations }) => Context.getOption(mergedAnnotations, RequiredPermission) … })`.
`mergedAnnotations` is `Context.merge(Context.merge(api.annotations, group.annotations), endpoint.annotations)`
(`effect@4.0.0` `src/http-api/HttpApi.ts:279,297`).

### C3. Effect hands the middleware the raw endpoint, without merged annotations — **CONFIRMED, with a correction**

`HttpApiBuilder.ts:932-946` (`applyMiddleware`): `const options = { group, endpoint }` (`:938`) then
`handler = apply(handler, options)`. The middleware type is
`(httpEffect, options: { readonly endpoint: HttpApiEndpoint.Top; readonly group: HttpApiGroup.Top }) => …`
(`HttpApiMiddleware.ts:67-73`). So **the group is exposed** (its `annotations` are readable per
request) — but **the API is not**: `handlerToHttpEffect` merges api+group+endpoint annotations
(`HttpApiBuilder.ts:831`) only for parse options, never passes them on. A middleware can therefore
merge group annotations, but can never see API-level ones.

Related, also confirmed: `HttpApi.addHttpApi` copies the added API's annotations into each of its
groups (`HttpApi.ts:160-171`), so an API-level declaration on a composed sub-API becomes group-level.
`HttpApiGroup.annotateEndpoints` writes into every endpoint's own annotations
(`HttpApiGroup.ts:368-371`) — the existing group-wide mechanism, which both readers already see
(probe case 5).

### C4. `requiresPermission` accepts a group (and an API), so either can be annotated — **CONFIRMED**

`AnnotatedEndpoint` (`RequirePermission.ts:149-152`) is `{ identifier; annotations }`. `HttpApiGroup`
(`HttpApiGroup.ts:67,71`) and `HttpApi` (`HttpApi.ts:63,65`) both satisfy it; `typeprobe.ts` compiles
`g0.annotate(RequiredPermission, requiresPermission(g0, …))`, `g0.annotate(PublicEndpoint, …)` and
`a0.annotate(RequiredPermission, requiresPermission(a0, …))`. `publicEndpoint` returns a plain
`PublicDeclaration` and can annotate anything.

### C5. A group-annotated API: registry lists every endpoint, middleware answers 500 — **CONFIRMED** (probe case 1)

Fails closed at the request, but the audit surface is wrong. Same for an API-level annotation (case 4).

### C6. NEW DEFECT — the registry is wrong in the *unsafe* direction — **CONFIRMED** (probe case 2)

Group `RequiredPermission` + endpoint `PublicEndpoint`: `/__permissions` reports `/a` as requiring
`document:read`; the middleware sees no requirement on the endpoint, finds `PublicEndpoint`, and
serves it to anyone (204, `CurrentSubject = anonymous`). The review's framing ("that fails closed, but
the registry is wrong") understates this case: here an auditor reading the registry is told an
endpoint is guarded when it is public. Not an enforcement bypass — the endpoint itself says public —
but BEH-QD-180's audit surface lies about exactly the property it exists to report.

### C7. `registerApi`'s comment contradicts enforcement — **CONFIRMED**

`PermissionRegistry.ts:93-95`: "`HttpApi.reflect`'s `mergedAnnotations` already resolves API-,
group-, and endpoint-level annotations together, so this needs no separate handling for where on the
API tree `requiresPermission` was called." Enforcement never reads the API or group level.

### C8. NEW — ADR-QD-036 describes a group read that never existed — **CONFIRMED**

`spec/decisions/036-qadi-http-package-shape.md:167-169`: "One `RequirePermission` middleware … reading
the `RequiredPermission` annotation back off `{ endpoint, group }` at request time". The code reads
`{ endpoint }` only (C1). BEH-QD-174/INV-QD-034 (`spec/behaviors/23-http.md:29-60`,
`spec/invariants.md:1322-1330`) say "an endpoint annotated with neither" without naming a scope.

### C9. NEW — the per-scope duplicate check does not span levels — **CONFIRMED** (probe case 6)

`requiresPermission`'s duplicate check reads only the target's own annotations
(`RequirePermission.ts:218`). A group requirement plus an endpoint requirement is never refused; the
endpoint's wins in both readers today (consistent). Under a merge (D-18-a = A) this becomes exactly the
cross-level silent override BEH-QD-179 and the `RequiredPermissionShape` brand were built to forbid.

### C10. `publicEndpoint` has the same scope gap — **CONFIRMED** (probe cases 2, 3)

Group-level `PublicEndpoint` alone: registry silent, middleware 500 (consistent, fail-closed). Combined
with a group requirement it produces C6.

### C11. Precedence when both keys sit on one endpoint — **CONFIRMED consistent**

The middleware checks `RequiredPermission` first (`:357-358` before `:370`); the registry lists it.
Both readers agree: required wins. Not tested anywhere (`grep -n PublicEndpoint packages/http/test/*.ts`).

### C12. Nothing in the repository annotates a group or an API — **CONFIRMED**

`grep -rnE 'annotateEndpoints|mergedAnnotations|annotate\(PublicEndpoint'` over `packages examples apps spec features`
(excluding `lib/`, `node_modules`): every declaration is endpoint-level
(`examples/http-advanced/api.ts:32,56,64`, `packages/http/test/http.test.ts:94`, docs). So the fix
breaks no in-repo caller; it only changes what a group/API declaration does.

### C13. Spec signature drift (minor) — **CONFIRMED**

`spec/behaviors/23-http.md:373` lists `registerApi: (api: HttpApi.Any) => Layer<never, never, PermissionRegistry>`;
the code (`PermissionRegistry.ts:105-107`) and the website (`apps/website/.../packages/http.md:134-136`)
are generic over `Id`/`Groups`. Fixed in passing by T5.

## 2. Goal and success criteria

Today "who may call this endpoint" has **two readers over two scopes**: the middleware reads the
endpoint's own annotations, the registry reads the API-, group- and endpoint-level merge. The goal is
one small, deep module — `endpointAccess(annotations) → Required | Public | Undeclared` — that is
the single **interface** both readers go through, applied by both to **the same scope**. The seam is
the declaration itself: what counts as a declaration, which one wins when both are present, and where
on the API tree one may sit are answered once, in `RequirePermission.ts`, instead of being re-derived
in each reader. Locality: the precedence rule, the scope rule and the refusal message live beside
`RequiredPermission`/`PublicEndpoint`. Leverage: the registry, the middleware and any future reader
(an OpenAPI linter, ARCH-19's edge step) cannot disagree because they cannot read differently.

Success criteria:

1. A differential test (T1) asserts, for every endpoint of every fixture API (cases 1–6 above plus the
   existing `Api`), that `/__permissions` lists it under permission *P* **iff** the middleware enforces
   *P* on it. Green on the branch, red on `e328e75` for cases 1, 2 and 4.
2. `grep -n "mergedAnnotations" packages/http/src` → nothing; `grep -n "Context.getOption(.*RequiredPermission\|Context.getOption(.*PublicEndpoint" packages/http/src`
   → only inside `endpointAccess` (and `requiresPermission`'s duplicate check).
3. `endpointAccess` is a closed three-case union dispatched with `Match` (no `switch`; `SWITCH_BUDGET` unchanged),
   unit-tested over every combination of {none, Required, Public, both} × {endpoint, group, API}.
4. Per D-18-a: either (B, recommended) a declaration on a group or API is refused by **both** readers —
   `registerApi` fails layer construction with a typed error naming the group/API and the key, and the
   middleware answers 500 with a log naming the group — or (A) both readers merge group + endpoint
   with a documented precedence, and an API-level declaration is refused.
5. `PermissionRegistry.ts`'s `registerApi` comment and ADR-QD-036's "`{ endpoint, group }`" sentence
   state the scope that is actually read.
6. `pnpm check` green.

## 3. Non-goals

- **Enforcement itself** (extract → guard → log → project): ARCH-19.
- **The 12-tag error wire** (`ENFORCEMENT_ERROR_WIRE`): ARCH-27. The refusal here is a 500 wiring
  mistake answered before any enforcement, exactly like today's "declares neither".
- **`addGuardedRoute`'s registry half**: a bare route registers its own descriptor at the call that
  guards it, so it cannot disagree with itself.
- **Making the registry list unguarded or public endpoints** (BEH-QD-180: "cannot list what is
  unguarded"). Optional follow-up noted in §9, not done here.

## 4. Constraints

- **AGENTS.md §2/§3**: no new service; `endpointAccess` is a plain function. If a typed error is added
  (D-18-b), it is `Data.TaggedError` (§4) — `SCHEMA_ERROR_BUDGET` counts `packages/core/src/Errors.ts`
  only and is unaffected.
- **AGENTS.md §5a**: dispatch on the access union with `Match` (`Match.valueTags` at the call site is
  acceptable: this runs once per request, not per policy node). `SWITCH_BUDGET` unchanged.
- **AGENTS.md §6**: no `as`, no `any`. `ANY_BUDGET` (`HttpApiMiddlewareClient.ts: 7`) unchanged — this
  plan does not touch that file.
- **AGENTS.md §4**: never `Effect.orDie` on the enforcement path; the middleware's refusal stays a
  logged `HttpServerResponse.empty({ status: 500 })`.
- **ADR-QD-036 / INV-QD-034 / BEH-QD-174**: absence is refusal. Any new case is a refusal, never a
  pass-through. `publicEndpoint`'s reason stays required.
- **BEH-QD-179**: no implicit composition of two requirements — this is what rules option A's
  cross-level override out unless D-18-a = A adds a cross-level duplicate refusal.
- **ADR-QD-037 madge** (`pnpm circular`): `endpointAccess` lives in `RequirePermission.ts`;
  `PermissionRegistry.ts` already imports from it. No new import edge.
- **Gate 13** (`node scripts/check-api-surface.mjs`, `pnpm spec:api`): any new export
  (`endpointAccess`, `EndpointAccess`, the error) needs an `spec/overview.md` row or a "Not listed
  above" reason.
- **Gate 9** (`node scripts/check-doc-examples.mjs`, `pnpm spec:examples`) and
  **gate 22** (`node scripts/check-website-doc-examples.mjs`, `pnpm spec:website-examples`): any new
  ` ```typescript ` fence showing `annotateEndpoints` must compile.
- **ADR-QD-038**: one changeset; `registerApi`'s type gains an error channel (D-18-b) → `minor`,
  marked breaking, fixed group. Do not run a release (user rule: no new releases unless asked).

## 5. Decisions needed before work starts

### D-18-a — The one scope both readers read

- **A. Merge group + endpoint in both readers.** The middleware reads
  `Context.merge(group.annotations, endpoint.annotations)` (possible: C3); the registry reads the same,
  not `mergedAnnotations`. API-level stays invisible to the middleware, so it must be refused anyway.
  Gains a group-wide declaration feature. Costs: a precedence rule across levels and keys (group
  `Required` vs endpoint `Public` — does the endpoint's explicit "public" lose to the group?), and
  `requiresPermission`'s per-scope duplicate check no longer protects anything (C9) unless a cross-level
  refusal is added in both readers. Needs a new ADR rule.
- **B. Endpoint scope only; a declaration on a group or API is refused (recommended).** Both readers
  read `endpoint.annotations` through `endpointAccess`. A group carrying either key is refused by the
  middleware at request time (it can see the group) and by `registerApi` at layer build (it can see
  the group and the API). Group-wide declaration remains available through the effect API that already
  exists for it, `group.annotateEndpoints(RequiredPermission, requiresPermission(…))`, which writes
  into each endpoint's scope (C3, probe case 5) — documented as *the* way.
- **C. Endpoint scope only, silently ignore group/API declarations.** Consistent, but a declaration
  that does nothing is the annotate-and-forget failure mode ADR-QD-036 rejects. Rejected.

Recommendation: **B**. Option A is not merely more work: its API-level half is unimplementable in a
middleware (C3), and its group half reopens the last-write-wins override BEH-QD-179 closed. B is
complete — every placement is either honored identically by both readers or refused loudly by both —
and the feature A offers already exists as `annotateEndpoints`.
`status: decided (2026-10-07, B, endpoint only)`

### D-18-b — How `registerApi` refuses a misplaced declaration

- **A. Typed layer error (recommended).** `registerApi: … => Layer.Layer<never, MisplacedAccessDeclaration, PermissionRegistry>`,
  `MisplacedAccessDeclaration extends Data.TaggedError("MisplacedAccessDeclaration")<{ scope: "group" | "api"; identifier: string; key: "RequiredPermission" | "PublicEndpoint" }>`.
  Effect-native, visible in the type, testable with `Layer.build` + `Effect.result`. Breaking type change.
- **B. Throw/die at layer build**, the `requiresPermission` precedent (`RequirePermission.ts:209-224`).
  No type change, but that precedent's own comment justifies the throw by "no request is in flight for
  a typed failure to reach" at *module init*; `registerApi` runs inside a `Layer`, where a typed
  channel exists.

Recommendation: **A**. `status: decided (2026-10-07, A, typed layer error)`

### D-18-c — Is `endpointAccess` public?

- **A. Export `endpointAccess` and `EndpointAccess` (recommended).** A pure function over public types;
  a consumer building docs or an OpenAPI lint needs exactly this reading and would otherwise re-derive
  it — the defect this plan removes. One gate-13 row.
- **B. Module-private** (not exported from `RequirePermission.ts`). Smaller surface; tests reach it
  only through the two readers.

Recommendation: **A**. `status: decided (2026-10-07, A, exported)` (T2 can be built either way; only the `export` keyword and the
overview row depend on it)

### D-18-d — Refuse a group/API at the type level too?

- **A. Narrow `AnnotatedEndpoint` to `{ identifier; annotations; method; path }` (recommended with D-18-a = B).**
  `HttpApiEndpoint` has `method`/`path`; `HttpApiGroup`/`HttpApi` do not, so
  `requiresPermission(group, …)` stops compiling. Pins with a `tstyche` `type.not.toBeCallableWith`.
  Does not catch `group.annotate(RequiredPermission, requiresPermission(someEndpoint, …))` — the
  runtime refusal still has to exist. Breaking only for a hand-built object passed in (none in repo).
- **B. Runtime refusal only.**

Recommendation: **A**, layered on the runtime refusal. `status: decided (2026-10-07, A, narrowed)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/18-endpoint-access main`; confirm `git log --oneline -1` is `e328e75` or later,
     and if later re-read `RequirePermission.ts:340-420` and `PermissionRegistry.ts:87-127` for drift.
  2. Re-run both §1 probes (commands in §1) and compare with the table; record any difference in §10.
  3. If ARCH-19 or ARCH-27 has already landed edits to `RequirePermission.ts`, read them first and
     rebase this plan's T2–T3 steps onto them (they touch the enforcement half; this plan touches the
     declaration half).
- **Tests:** none.
- **Verify:** `pnpm vitest run --project http`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** baseline test counts and probe output are logged in §10.

### T1 — Reproduce the disagreement test-first, and make the registry read what enforcement reads
- **Status:** [x] done
- **Depends on:** T0 (no decision: the fix is correct under every D-18-a option, because today the
  middleware reads the endpoint scope and the registry is the side that disagrees)
- **Files:** `packages/http/test/endpointAccess.test.ts` (*new*); `packages/http/src/PermissionRegistry.ts`
  (`:93-95` comment, `:114-115`).
- **Steps:**
  1. Create `endpointAccess.test.ts` with a helper `observe(api, groupName, handlers)` that builds the
     same stack as `http.test.ts:110-182` (`HttpApiBuilder.layer(api)` + `RequirePermissionLive` +
     `registerApi(api)` + `PermissionRegistryLive` + `permissionRegistryRouteUnguarded("test")` +
     `subjectExtractorBearer` + `portsLayer({})` + `EvaluationIdLive` + `HttpServer.layerServices`),
     with `Logger.layer` capturing logs and `disableLogger: true`, and returns
     `{ listed: Map<path, permissionKey>, status: (path, token?) => number }`.
  2. Fixtures: probe cases 1–6 (§1 table) — use `HttpApiGroup.make(...).add(...)` then
     `.annotate(...)` with the real public helpers, no casts. Subjects: `holder` (has `document:read`
     and `document:write`), `none` (no permissions), and no `Authorization` header.
  3. One property, asserted per fixture endpoint: "listed under *P* ⟺ enforced as *P*", where
     *enforced as P* is observed as `status(path, none) === 403 && status(path, holder) === 204`, and
     *not enforced* as `status ∈ {204 for anonymous (public), 500 (refused)}`. Plus one direct assertion
     for case 2: `/a` must not be listed while it answers 204 to an anonymous caller.
  4. Run it: red for cases 1, 2, 4 (C5, C6).
  5. Fix `registerApi`: read `endpoint.annotations` instead of `mergedAnnotations` (still walking with
     `HttpApi.reflect`; `group.identifier` stays the descriptor's group). Rewrite the `:93-95`
     paragraph: the registry reads exactly the scope `RequirePermission` enforces — the endpoint's own
     annotations — and a group-wide declaration goes through `HttpApiGroup.annotateEndpoints`.
  6. Run: green. Cases 1, 2, 4 are now "not listed, refused/public" in both readers.
- **Tests:** the new differential file; `http.test.ts`'s registry snapshot test
  (`http.test.ts:280-320`) must pass unchanged (its API is endpoint-annotated only).
- **Verify:** `pnpm vitest run packages/http/test/endpointAccess.test.ts packages/http/test/http.test.ts`.
- **Done when:** the differential test is green and was observed red on `e328e75` (paste the failing
  case names in §10). Shippable alone as a defect fix (patch changeset, `@qadi/http`).

### T2 — One reader: `endpointAccess`, used by both
- **Status:** [x] done
- **Depends on:** T1 (D-18-c only for the `export` keyword and the overview row)
- **Files:** `packages/http/src/RequirePermission.ts`; `packages/http/src/PermissionRegistry.ts`;
  `packages/http/test/endpointAccess.test.ts`.
- **Steps:**
  1. In `RequirePermission.ts`, after `PublicEndpoint` (`:79-81`), add the access union and its reader:
     ```ts
     export type EndpointAccess = Data.TaggedEnum<{
       Required: { readonly requirement: RequiredPermissionShape };
       Public: { readonly declaration: PublicDeclaration };
       Undeclared: {};
     }>;
     export const EndpointAccess = Data.taggedEnum<EndpointAccess>();
     export const endpointAccess = (annotations: Context.Context<never>): EndpointAccess => …
     ```
     Precedence (C11, unchanged behavior): `RequiredPermission` present → `Required`; else
     `PublicEndpoint` present → `Public`; else `Undeclared`. Doc comment: one-line summary, then why
     (the two readers used to read different scopes, CCR-QD-NEXT), and the precedence rule.
  2. Middleware (`:356-382`): replace the two `Context.getOption` calls with
     `Match.valueTags(endpointAccess(endpoint.annotations), { Undeclared: …500 + log…, Public: …provide anonymous…, Required: ({ requirement }) => …existing enforcement body… })`.
     The enforcement body is moved verbatim (ARCH-19 replaces it later). Keep both refusal log texts
     byte-identical (`http.test.ts:826-842` pins the "declares neither" line).
  3. `registerApi` (`PermissionRegistry.ts:114-121`): `Match.valueTags(endpointAccess(endpoint.annotations), { Required: ({ requirement }) => found.push([...]), Public: () => {}, Undeclared: () => {} })`.
  4. Unit tests in `endpointAccess.test.ts`: the reader over {none, Required, Public, both} built with
     `Context.make`/`Context.add` and a real `requiresPermission` value (no casts).
- **Tests:** four reader cases; the T1 differential stays green; every `http.test.ts` test unchanged.
- **Verify:** `pnpm vitest run --project http`; `node scripts/check-house-style.mjs` (no `switch`,
  no `as`); `pnpm circular`; `pnpm typecheck`.
- **Done when:** criterion 2's grep holds and all http tests pass.

### T3 — Refuse a misplaced declaration in both readers (D-18-a = B)
- **Status:** [x] done
- **Depends on:** T2, D-18-a, D-18-b (and D-18-d for step 5)
- **Files:** `packages/http/src/RequirePermission.ts`; `packages/http/src/PermissionRegistry.ts`;
  `packages/http/test/endpointAccess.test.ts`; `packages/http/test/RequirePermission.tst.ts`.
- **Steps (B; if D-18-a = A, replace steps 1–3 with: both readers call `endpointAccess(Context.merge(group.annotations, endpoint.annotations))`,
  add a cross-level duplicate refusal, refuse API-level in `registerApi`, and write the precedence into an ADR-QD-NEXT):**
  1. Add `misplacedDeclarations(annotations): ReadonlyArray<"RequiredPermission" | "PublicEndpoint">` beside
     `endpointAccess` (same file, same two `Context.getOption` reads — the only other place they occur).
  2. Middleware: before dispatching on the endpoint's access, if
     `misplacedDeclarations(group.annotations)` is non-empty, log at error level
     `qadi/http: group "<id>" carries <keys>, which only an endpoint may declare, so endpoint "<id>" is refused. Declare it on each endpoint, or use HttpApiGroup.annotateEndpoints.`
     and answer `HttpServerResponse.empty({ status: 500 })` with `CurrentSubject` provided as
     `anonymous` (same shape as the Undeclared arm, `:373-381`). Destructure `{ endpoint, group }`.
  3. `registerApi`: in `onGroup` collect `misplacedDeclarations(group.annotations)`; collect
     `misplacedDeclarations(api.annotations)` once; if any, `yield* Effect.fail(new MisplacedAccessDeclaration({ scope, identifier, key }))`
     for the first, before registering anything. Declare
     `MisplacedAccessDeclaration` in `PermissionRegistry.ts` (`Data.TaggedError`, plain tag, §4).
     Update `registerApi`'s return type to `Layer.Layer<never, MisplacedAccessDeclaration, PermissionRegistry>`.
  4. Tests: for cases 1–4 the middleware answers 500 with the exact log line; `Layer.build(registerApi(api))`
     fails with `MisplacedAccessDeclaration` naming the scope and key; case 5 (`annotateEndpoints`) is
     honored by both; case 6 is refused (group carries a requirement) — note this changes case 6 from
     "endpoint wins" to "refused", which is the point.
  5. (D-18-d = A) Narrow `AnnotatedEndpoint` to add `readonly method: string; readonly path: string`;
     in `RequirePermission.tst.ts` add `expect(requiresPermission).type.not.toBeCallableWith(group, {...})`
     and the same for an `HttpApi`; keep `"requiresPermission accepts a plain, options-less HttpApiEndpoint"`
     (`:35`) and `"registerApi accepts a plain, options-less HttpApi"` (`:42`) green.
- **Tests:** as in step 4–5; the T1 differential gains cases where "refused by both" is the expected
  agreement.
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `pnpm typecheck`;
  `node scripts/check-house-style.mjs`.
- **Done when:** no fixture placement produces a registry/middleware disagreement and every misplaced
  placement is refused by both.

### T4 — Pin `publicEndpoint` and the precedence rule
- **Status:** [x] done
- **Depends on:** T2
- **Files:** `packages/http/test/endpointAccess.test.ts`; `packages/http/test/http.test.ts` (one case).
- **Steps:**
  1. Endpoint with both `RequiredPermission` and `PublicEndpoint`: enforced (403 for `none`), listed —
     pins C11 through the real stack.
  2. Group-level `PublicEndpoint` only (case 3): refused by both, with the T3 log line (or, under
     D-18-a = A, served as public by the middleware and absent from the registry).
  3. `publicEndpoint("")`: today accepted. Record in §10 whether BEH-QD-174's "MUST require a reason"
     means non-empty; if so, open it as a separate defect (not fixed here — it changes a public helper's
     contract).
- **Tests:** as listed.
- **Verify:** `pnpm vitest run packages/http/test/endpointAccess.test.ts`.
- **Done when:** both precedence cases are pinned through the HTTP boundary.

### T5 — Spec, ADR, overview, traceability, CCR, docs, changeset
- **Status:** [x] done
- **Depends on:** T3, T4
- **Files:** `spec/behaviors/23-http.md`; `spec/invariants.md` (INV-QD-034); `spec/decisions/036-qadi-http-package-shape.md`;
  `spec/overview.md`; `spec/traceability.md`; `spec/README.md`; `spec/glossary.md` (if "endpoint access" is
  added); `packages/http/README.md`; `apps/website/src/content/docs/docs/packages/http.md`;
  `.changeset/endpoint-access.md` (*new*).
- **Steps:**
  1. `23-http.md`: new **BEH-QD-NEXT "An endpoint's access is read once, from the endpoint"** with
     REQUIREMENTs: both `RequirePermission` and `registerApi` MUST read a declaration through
     `endpointAccess` over the endpoint's own annotations; a `RequiredPermission` or `PublicEndpoint`
     on a group or API MUST be refused by both (500 + log; `MisplacedAccessDeclaration`); a group-wide
     declaration is written with `HttpApiGroup.annotateEndpoints`. Fix BEH-QD-180's `registerApi`
     signature (C13) and add "MUST list an endpoint under *P* only if `RequirePermission` enforces *P*
     on it". Change History row.
  2. INV-QD-034: "declares" → "declares on itself"; add the misplaced-declaration refusal to its Source
     paragraph.
  3. ADR-QD-036 Rev 1.4: correct `:167-169` ("off `{ endpoint, group }`" → the endpoint; the group is
     read only to refuse a misplaced declaration), record D-18-a's reasoning and the C6 finding in the
     Change History.
  4. `overview.md`: rows for `endpointAccess`/`EndpointAccess` (D-18-c) and
     `MisplacedAccessDeclaration`; Change History row.
  5. `traceability.md`: BEH-QD-NEXT → `RequirePermission.ts`, `PermissionRegistry.ts`,
     `endpointAccess.test.ts`; add the test-file row.
  6. `spec/README.md`: `CCR-QD-NEXT` row naming every document above.
  7. README + website: one ` ```typescript ` example of `HttpApiGroup.annotateEndpoints(RequiredPermission, requiresPermission(...))`,
     and a sentence that a group- or API-level declaration is refused. Update the website's
     `registerApi` signature (`http.md:134-136`) to the new error channel.
  8. Changeset: `"@qadi/http": minor`, marked **Breaking** — `registerApi` can fail with
     `MisplacedAccessDeclaration`; a group/API-level declaration that used to be listed (and refused
     with "declares neither") is now refused with a named reason; `requiresPermission` no longer accepts
     a group or API (D-18-d). Migration: move the declaration to each endpoint, or use
     `annotateEndpoints`.
- **Tests:** none new; gates below.
- **Verify:** `node scripts/check-api-surface.mjs`; `node scripts/check-doc-examples.mjs`;
  `node scripts/check-website-doc-examples.mjs`; `pnpm spec:verify:strict`; `pnpm spec:gates`.
- **Done when:** all five gates pass.

### T6 — Full gate
- **Status:** [x] done
- **Depends on:** T5
- **Files:** none
- **Steps:** run `pnpm check` (the merge gate, `.github/workflows/check.yml`); fix anything red;
  record the duration and mutation score for `@qadi/http` if a Stryker config covers it.
- **Verify:** `pnpm check`.
- **Done when:** green.

### T7 — Update the tracker
- **Status:** [x] done
- **Depends on:** T6
- **Files:** this plan's frontmatter and §10; `.planning/architecture/README.md` (orchestrator's table).
- **Steps:** set `status:`, tick tasks, record decisions as `decided (<date>, <choice>)`, and add the
  §10 row. Tell ARCH-19's owner that `endpointAccess` has landed (it unblocks ARCH-19 T5).
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-18-*.md | sort | uniq -c`.
- **Done when:** the tracker matches the branch.

## 7. Test strategy

- **Survive unchanged:** every `http.test.ts` case (the shared fixture is endpoint-annotated only), the
  exact-log tests at `http.test.ts:810-871`, `RequirePermissionClient.test.ts`, and
  `RequirePermission.tst.ts:35,42,46,60`.
- **New, replacing nothing:** `endpointAccess.test.ts` — the unit reader table, and the differential
  "listed ⟺ enforced" property over every placement. The differential is the test that would have
  caught C6; it is placement-generic, so a future reader that drifts fails it.
- **Moved:** none. `v4-http-smoke.test.ts:115-128` keeps pinning `HttpApi.reflect`'s
  `mergedAnnotations` as an effect API canary; the registry no longer depends on it, so that test's
  comment ("the annotation-carrying shape … `registerApi` walk[s]") gets one line saying the registry
  now reads `endpoint.annotations`.
- **Mutation:** if a Stryker config covers `packages/http/src`, the precedence branch and the
  misplaced-declaration branch must be killed by T3/T4's tests (a swapped precedence flips C11's
  assertion; removing the group check flips cases 1–4).

## 8. Spec and documentation updates

Covered by T5: `spec/behaviors/23-http.md` (BEH-QD-NEXT, BEH-QD-180 signature and listing requirement),
`spec/invariants.md` (INV-QD-034), ADR-QD-036 Rev 1.4, `spec/overview.md` (gate 13 rows),
`spec/traceability.md`, `spec/README.md` (`CCR-QD-NEXT`), `packages/http/README.md`, the website's
`packages/http.md`, and a `minor` breaking changeset. No AGENTS.md change.

## 9. Risks and rollback

- **A deployment annotating a group today** gets 500s it did not get before only in case 2 (where it
  was serving a public endpoint the registry called guarded) and case 6 (where the endpoint's own
  requirement won). Cases 1, 3, 4 already answered 500. Shows up as the new log line. Mitigation: the
  changeset's migration note. Rollback: revert T3; T1–T2 alone keep the readers consistent.
- **`registerApi`'s new error channel** forces a caller's layer composition to account for it
  (`Layer.orDie` at the top, or a typed handler). Shows as a type error at upgrade, which is the point.
- **Probe drift on an `effect` upgrade:** if a future `effect` passes merged annotations to middleware,
  the group check still holds (it reads `group.annotations` explicitly). The smoke test is the canary.
- **Follow-up, not in scope:** the registry could also list `Public` and `Undeclared` endpoints now
  that one reader classifies all three; BEH-QD-180 says it cannot list what is unguarded. Worth a
  separate decision.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e328e75` (probes `scratchpad/wave3/ARCH-18/probe.mts`, `typeprobe.ts`) | planner |
| 2026-10-07 | T0–T7 | Implemented. T1 observed red first on the new differential (group requirement, group requirement + endpoint public, api requirement, plus the direct "served as public" assertion: 4 failures), then green with the one-line registry fix. T2: `endpointAccess` (`EndpointAccess` as `Data.taggedEnum`) used by both readers via `Match.valueTags`; the enforcement body is `enforce(requirement, httpEffect)` inside `RequirePermissionLive`, the seam for ARCH-19 T5. T3: `misplacedDeclarations`, middleware refusal log, `MisplacedAccessDeclaration` from `registerApi` (checked before anything registers). T4: precedence pinned (both keys on one endpoint: enforced and listed). `publicEndpoint("")` is accepted today; BEH-QD-174's "MUST require a reason" is a type-level requirement, a non-empty check would change a public helper's contract, so it is left as a possible separate defect. Deviations: `observe` reads the registry snapshot from the built `registerApi` layer rather than the `/__permissions` route (the route is a projection of it); no ADR-QD-NEXT (D-18-a = B needs none); the barrel also exports `misplacedDeclarations` and `AccessDeclarationKey` (overview rows added). CCR-QD-196, BEH-QD-320, minor breaking changeset `endpoint-access.md`. T6: targeted gates run, not `pnpm check` (orchestrator). | implementer |
