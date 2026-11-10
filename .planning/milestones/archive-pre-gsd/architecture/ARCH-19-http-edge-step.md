---
id: ARCH-19
title: One authorization step at the HTTP edge — extract, load, guard and log once; each surface keeps only its answer
strength: Strong
status: done   # T0–T2 need no decision; T3+ wait on D-19-a/b (D-19-a is settled by a probe, recommendation only needs sign-off)
evidence_verified_at: e328e75
depends_on: [ARCH-18]  # sequencing, not a hard block: only T5 (the middleware) needs ARCH-18's `endpointAccess` dispatch; T0–T4 and T6 can run in parallel with it
blocks: []
adrs_touched:
  - ADR-QD-036 (amend: "one enforcement path" becomes literal — both adapters and the stream recheck call one `authorizeRequest`; the edge no longer builds the handler before the policy is checked)
  - ADR-QD-046 (amend: the recheck classifies through the HTTP class table — a broken credential store on recheck is `outage`, not a fifth `"extraction-failed"` label; `reauthCheck` leaves the public surface if D-19-c = A)
  - ADR-QD-081 (amend, one paragraph: `@qadi/http`'s extended class table gets its reader, `classifyHttpEnforcementFailure`, which the stream now uses; D-04-e's "SubjectExtractionFailed is outage" stops being contradicted inside the same package)
  - ADR-QD-072 (constraint: redaction stays the per-tag `project`; the middleware's projection still wraps the handler's own effect; bare routes keep empty bodies except `SubjectExtractionFailed`)
  - ADR-QD-075 (constraint: `RequirePermission`'s `error:`/`clientError`/`requiredForClient` untouched; `ANY_BUDGET` file untouched)
  - ADR-QD-035 (read: `guard`'s witness and resource pinning — the edge step calls `guard`, never re-implements it)
  - ADR-QD-097 (read: `decisionFrames`/`frame` stay as they are; their exports are ARCH-28's question)
  - ADR-QD-037 (constraint: madge — the new module may import only `QadiHttpError.ts` and `SubjectExtractor.ts`)
  - ADR-QD-038 (constraint: one `minor` changeset marked breaking, fixed group; no release run)
packages: ["@qadi/http", "examples/http-advanced (verify only)", "examples/nextjs-newsroom (verify only)", "apps/website (docs)", "spec"]
estimate: M   # ≈ 2 days complete (T0–T10); T1–T2 alone ≈ ½ day
---

# ARCH-19 — One authorization step at the HTTP edge

## 1. Verified evidence (at `e328e75`)

Re-checked on `main` at `e328e75`. Read-only: nothing in the repository was edited. One throwaway
type probe ran from `scratchpad/wave3/ARCH-19/` (`generic.ts`, `tsconfig.json` extending
`tsconfig.base.json` with `types: []`, `node_modules` symlinked to `packages/http/node_modules`;
`<repo>/node_modules/.bin/tsc -p tsconfig.json`). It compiled two candidate shapes for the shared step
(see C9). Every other claim was settled by reading the files cited.

### C1. Three call sites hand-write extract → provide `CurrentSubject` → guard/assert → log → map — **CONFIRMED**

- `packages/http/src/RequirePermission.ts:394-417`: `extractor.extract(request)` → `guard(permission, policy)(NO_RESOURCE, () => httpEffect)`
  under `Effect.provideService(CurrentSubject, subject)` and `Effect.provide(evaluationServices)` →
  `tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)` → `tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)`
  → `catchTag(HTTP_ENFORCEMENT_TAGS, project)`.
- `packages/http/src/GuardRoute.ts:66-81`: `SubjectExtractor.extract(request)` → `loadResource(request)` →
  `guard(permission, policy)(resource, handler)` under `provideService(CurrentSubject, subject)`, wrapped by
  `handleEnforcementErrors` (`QadiHttpError.ts:467-474`: `tapErrorTag(DENIAL, logDenial)` → `catchTag(ENFORCEMENT_ERROR_TAGS, toResponse)`
  → `catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse)`, which logs through
  `logSubjectExtractionFailed`, `:401-427`).
- `packages/http/src/DecisionStreamRoute.ts:324-350` (`reauthCheck`): `SubjectExtractor.extract(request)` →
  its own `tapError` log → `mapError(() => "extraction-failed")` → `assert(policy, { resource })` under
  `provideService(CurrentSubject, subject)` → its own `tapError` log → `mapError(classifyEnforcementError)`.

So the two log taps have **three homes** today: inline in the middleware, inside
`handleEnforcementErrors`/`subjectExtractionFailedResponse` for bare routes, and hand-written in
`reauthCheck`. The first two agree; the third does not (C4).

### C2. `() => Effect.succeed(NO_RESOURCE)` is repeated three times — **CONFIRMED**

`PermissionRegistry.ts:210`, `DecisionStreamRoute.ts:397`, `DecisionBacklogRoute.ts:77` (each the
fifth argument of `addGuardedRoute`). `NO_RESOURCE` itself is `RequirePermission.ts:142`, public, and
its doc comment (`:136-140`) already says the three share it "rather than each reimplementing".

### C3. `reauthCheck` invents an `"extraction-failed"` class; the table says `"outage"`, and is not exported — **CONFIRMED**

`DecisionStreamRoute.ts:330,337`: error type `EnforcementErrorClass | "extraction-failed"`. 
`QadiHttpError.ts:88-91`: `const HTTP_ENFORCEMENT_CLASSES = { ...ENFORCEMENT_ERROR_CLASSES, SubjectExtractionFailed: "outage" }`
— module-private, read only by `wire` (`:166`). ADR-QD-081 D-04-e
(`spec/decisions/081-enforcement-error-classes-live-in-core.md:71-72`) declares that class. The connect
path answers the same failure 502 (`outage`); the recheck labels it something no table contains.
The label is public through `reauthCheck`'s type and pinned by
`packages/http/test/decisionStream.test.ts:353-377` and `spec/behaviors/26-decision-stream.md:154-158`.

### C4. `reauthCheck` skips `logDenial` and writes its own log text — **CONFIRMED**, and the levels differ too

`DecisionStreamRoute.ts:335` logs `subject extraction failed during reauth — <reason>` (connect path:
`subject extraction failed — <reason>`, `QadiHttpError.ts:402`). `:342-345` logs **every** assert
failure at **error** level as `reauth check failed (<tag>), reporting <class>`; the connect path logs a
denial at **warning** level through `logDenial` (`QadiHttpError.ts:446-452`) with code, subject and
reason, and does not log outages at all. Pinned by `decisionStream.test.ts:372-376` and `:415-417`.

### C5. `reauthCheck`, `frame`, `decisionFrames` are public "for testability" — **CONFIRMED**

`spec/overview.md:533` (`frame`), `:535` (`DecisionStreamSynced`, `syncedFrame`), `:536` (`decisionFrames`),
`:537` (`reauthCheck`); source comments `DecisionStreamRoute.ts:150-152, 207-209, 320-322`. No consumer
outside `packages/http/test` (`grep -rn 'reauthCheck\|decisionFrames\|syncedFrame' packages examples apps features`).
`DecisionStreamSynced` is a real wire schema a reader decodes, so it is not merely test-facing.

### C6. NEW — the middleware's catch/project and service scopes wrap the handler too — **CONFIRMED**

At `RequirePermission.ts:397-400` the wrapped `httpEffect` runs *inside* `guard`, so (a) the
`tapErrorTag`/`catchTag` at `:409-416` also see any enforcement failure the **handler** raises (a
defense-in-depth `guard` inside it), and project it; and (b) `Effect.provide(evaluationServices)`
(`:399`) supplies the captured standing services to the handler as well. Any refactor that runs the
handler outside those regions changes both. This is a constraint the review did not name.

### C7. NEW — `guard` builds the handler before the policy is checked — **CONFIRMED**

`packages/core/src/Qadi.ts:314-325`: `enforce(policy, …)(handler(witness, resource))` — the handler
function is *called* eagerly (documented as BS-05/ED-05/EM-05, `:290-301`). Both adapters inherit
this. A step that returns the witness and lets the surface call the handler afterwards invokes the
handler only on an allow — strictly better, and a behavior change worth one line in the changeset.

### C8. NEW — the brief's `resource` *value* parameter would regress `guardRoute`'s ordering — **CONFIRMED**

`GuardRoute.ts:68-76`: extraction runs **before** `loadResource`, so a broken credential store never
pays `loadResource`'s cost; pinned by `http.test.ts:360-399`. A step taking a resource value forces the
caller to load first. The step must take the **loader** (`(request) => Effect<A, never, LR>`), and
keep `LR` outside the `CurrentSubject` discharge (`GuardRoute.tst.ts:50-57` pins that).

### C9. Probe — the step must return a value over a closed error union, not take a continuation — **CONFIRMED**

`generic.ts` shape 1 — `authorizeRequest(permission, policy, loadResource)(request): Effect<AuthorizedRequest<P, A>, HttpEnforcementFailure, StandingEvaluationServices | SubjectExtractor | LR>`
returning `{ authorized, resource, subject }`, with both `tapErrorTag`s inside — **compiles**.
Shape 2 — a continuation `(request, handler: (…) => Effect<B, E, R>)` with the taps over
`E | HttpEnforcementFailure` — fails with TS2345 on both `tapErrorTag` calls
(`ExtractTag<E, "AccessDenied" | …>` is not assignable to `EnforcementDenial`), the same open-`E`
limit `GuardRoute.ts:24-36` documents for `catchTag`. The middleware's `httpEffect` error type is
`HttpApiMiddleware`'s `unhandled`, not `never`, so a `never`-only continuation cannot serve it either.

### C10. `StandingEvaluationServices` is the right requirement — **CONFIRMED**

`packages/core/src/Evaluate.ts:244,261`: `StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>`.
`guardRoute`'s declared `Exclude<R | EvaluationServices, CurrentSubject> | LR | SubjectExtractor`
(`GuardRoute.ts:64`) equals `Exclude<R, CurrentSubject> | StandingEvaluationServices | LR | SubjectExtractor`,
so a migrated `guardRoute` keeps its exact type.

### C11. Budgets touched — **CONFIRMED by reading `scripts/check-house-style.mjs`**

- `ANY_BUDGET` (`:421-425`, `"packages/http/src/HttpApiMiddlewareClient.ts": 7`): this plan does not
  touch that file; a new `any` anywhere fails gate 4 (`node scripts/check-house-style.mjs`).
- `PORT_DOUBLE_BUDGET` (`:524-562`): `packages/http/test/QadiHttpError.test.ts: 12`,
  `decisionStream.test.ts: 1`, `fixtures/everyHttpEnforcementFailure.ts: 5`. Deleting or moving tests
  that `new AttributeResolveError(...)` etc. by hand changes these counts, and the budget fails in both
  directions — update the entry in the same commit.
- `UNTRACED_BUDGET`, `SWITCH_BUDGET`, `SCHEMA_ERROR_BUDGET`, `DECISION_READ_BUDGET`,
  `HAS_CUSTOM_BUDGET`: not touched (no `fnUntraced`, no `switch`, no `Schema.TaggedError`).

### C12. Breaking-change policy — **CONFIRMED**

`.changeset/config.json`: every public package in one `fixed` group. Precedent for removing exports:
ADR-QD-081 D-04-d — "shipped as a `minor` changeset marked breaking (every package is 0.x and in one
`fixed` group)"; `9d9f249`'s `.changeset/pure-v2.md` and the website's `reference/upgrading.md`.
Gate 13 (`scripts/check-api-surface.mjs`) fails on a **STALE** overview row, so removing an export
without removing its row fails `pnpm check`.

## 2. Goal and success criteria

The HTTP edge has one job before any handler runs — *who is asking, against what, and may they* — and
it is written three times, with the third copy already drifted (C3, C4). The goal is one **deep module**,
`AuthorizeRequest.ts`, whose small **interface** is
`authorizeRequest(permission, policy, loadResource?)(request) → Effect<AuthorizedRequest<P, A>, HttpEnforcementFailure, StandingEvaluationServices | SubjectExtractor | LR>`
and which hides extraction order, the `CurrentSubject` scope of the check, the `guard` call, and both
log taps. Each **adapter** keeps only its own last step: the middleware projects to the declared wire
schema (and provides the subject to `httpEffect`), `guardRoute` answers through `toResponse`, and the
stream maps a failure to its class through `classifyHttpEnforcementFailure` — the reader of the ADR-081
table that `wire` already uses. **Locality:** the order, the scope and the log text live in one file.
**Leverage:** a new surface (a WebSocket upgrade, an RPC handler) gets correct, logged authorization by
calling one function. The **seam** is the `AuthorizedRequest` value: it is all a surface needs.

Success criteria:

1. `grep -n "SubjectExtractor.extract\|extractor.extract" packages/http/src` → only `AuthorizeRequest.ts`.
2. `grep -n "logDenial\|logSubjectExtractionFailed" packages/http/src` → only their definitions in
   `QadiHttpError.ts` and the two taps in `AuthorizeRequest.ts`.
3. `grep -rn "extraction-failed" packages spec apps` → nothing; the stream's failure is an
   `EnforcementErrorClass` read from the table (test: a broken credential store on recheck is `outage`).
4. `grep -n "Effect.succeed(NO_RESOURCE)" packages/http/src` → nothing.
5. Every existing log-exact test (`http.test.ts:810-871`, and the new bare-route ones from T1) passes
   unchanged: one line per failure, no doubles.
6. `GuardRoute.tst.ts` and `RequirePermission.tst.ts` pass unchanged (types preserved); `http.test.ts:360`
   (extraction before `loadResource`) passes unchanged.
7. A handler-raised enforcement failure under `RequirePermission` is still projected to its redacted
   wire value (T1 characterization stays green).
8. `pnpm check` green, with `ANY_BUDGET` and every other budget at its pre-change value except the
   `PORT_DOUBLE_BUDGET` entries T6 adjusts deliberately.

## 3. Non-goals

- **The declaration read** (`RequiredPermission`/`PublicEndpoint` scope): ARCH-18.
- **SSE frame vocabulary** (`frame`, `decisionFrames`, `syncedFrame`, `DecisionStreamSynced`) and
  whether they stay public: ARCH-28. This plan removes only `reauthCheck` (D-19-c).
- **Refusal reporting** in `DecisionStreamRoute`/`DecisionBacklogRoute` (`reportRefused`): ARCH-25.
- **The error descriptor table** (`ENFORCEMENT_ERROR_WIRE` → one descriptor per tag): ARCH-27.
  `classifyHttpEnforcementFailure` reads whichever table exists when it lands.
- **Bare-route response bodies** for the eleven `EnforcementError` tags (still empty; ADR-QD-072's
  "not-yet-decided change").
- **The stream-failure-as-defect noise** noted at `decisionStream.test.ts:530-545` (a failed recheck
  surfaces through the platform as an unhandled fiber failure). Out of scope; recorded in §9.

## 4. Constraints

- **AGENTS.md §1**: submodule imports; `.ts` extensions; `import type` for `Authorized`, `AuthSubject`.
- **AGENTS.md §4**: `Effect.catchTag` array form only (`no-catchtags-object-form`); never `Effect.orDie`
  on this path.
- **AGENTS.md §5**: the inner step is `Effect.fn("qadi.http.authorizeRequest")` (a span per request is
  product observability, ADR-QD-051's reasoning; not a per-node hot path). If `Effect.fn` loses the
  generics `P`/`A`/`LR` (check in T3), fall back to a plain function returning `Effect.gen`, like
  `guardRoute` today, and say so in the doc comment. No `Effect.fnUntraced` (`UNTRACED_BUDGET`).
- **AGENTS.md §6**: no `as`, `any`, `!`. `ANY_BUDGET` stays 7 in `HttpApiMiddlewareClient.ts`.
- **AGENTS.md §9**: if D-19-b = B (internal), `AuthorizeRequest.ts` is not re-exported by
  `packages/http/src/index.ts`; `NO_RESOURCE` keeps its public home through an explicit re-export.
- **ADR-QD-037 (`pnpm circular`)**: `AuthorizeRequest.ts` imports only `QadiHttpError.ts`,
  `SubjectExtractor.ts` and `@qadi/core`. `NO_RESOURCE` moves into it (RequirePermission.ts would
  otherwise import it while it imports RequirePermission.ts) and `RequirePermission.ts` re-exports it.
- **ADR-QD-072/081**: projection, statuses and schemas are untouched; the middleware's projection keeps
  wrapping `httpEffect` (C6a).
- **ADR-QD-075**: `RequirePermission`'s class declaration (`:328-339`) is not edited.
- **BEH-QD-178**: the middleware still evaluates against the empty `NO_RESOURCE`, never an absent one.
- **BEH-QD-26 reauth requirements**: re-extract from the same request; refuse an undischarged
  obligation (the step calls `guard`, which is `enforce` — the same `permitted` `assert` uses, so the
  `Obliged` test at `decisionStream.test.ts:493-528` stays green).
- **Gate 13** (`node scripts/check-api-surface.mjs`): every add/remove updates `spec/overview.md`.
- **Gate 9** (`node scripts/check-doc-examples.mjs`): `26-decision-stream.md:154-158` is a ` ```ts `
  listing (not compiled) — edit by hand; any new ` ```typescript ` fence must compile.

## 5. Decisions needed before work starts

### D-19-a — The step's shape

- **A. Value form (recommended):** `authorizeRequest(permission, policy, loadResource?)(request)` →
  `Effect<AuthorizedRequest<P, A>, HttpEnforcementFailure, StandingEvaluationServices | SubjectExtractor | LR>`,
  `AuthorizedRequest = { authorized: Authorized<P>; resource: A; subject: AuthSubject }`. Compiles (C9);
  keeps extraction before loading (C8); the surface runs its handler with
  `Effect.provideService(CurrentSubject, subject)`. `resource` is the evaluated one, so INV-QD-032 holds by
  construction (`guard` pins it; the surface must use the returned `resource`, not reload).
- **B. Continuation form** `(request, handler)`: does not compile over an open handler error (C9) and
  cannot serve the middleware's `unhandled` error. Rejected.
- **C. The brief's literal shape**, a resource *value* and `Authorized<P>` only: loses the subject the
  middleware must provide to `httpEffect` (`provides: CurrentSubject`, `RequirePermission.ts:331`) and
  regresses ordering (C8). Rejected.

Recommendation: **A**. `status: decided (2026-10-07, A, recommended)`

### D-19-b — Is `authorizeRequest` public?

- **A. Public (recommended):** export `authorizeRequest`, `AuthorizedRequest` and
  `classifyHttpEnforcementFailure`. A consumer building a surface this package does not ship gets the
  same order, scope and logs instead of a fourth hand-written copy — the failure mode this plan exists
  to end. Three gate-13 rows. Pairs with D-19-e = A (the removed helpers have a replacement).
- **B. Internal:** `AuthorizeRequest.ts` out of the barrel; tests import it by path.
  Smallest surface; but then D-19-e must keep `handleEnforcementErrors` for consumers.

Recommendation: **A**. `status: decided (2026-10-07, A, recommended)`

### D-19-c — Does `reauthCheck` leave the public surface? (breaking)

- **A. Remove it (recommended).** It exists for tests (C5). With D-19-b = A its tests move onto
  `authorizeRequest` (same request, same policy, the same `TestClock` merge) and the class mapping onto
  `classifyHttpEnforcementFailure`; what was `reauthCheck` becomes a three-line private `recheck` in
  `DecisionStreamRoute.ts`. Remove the overview row, the BEH-26 signature, the source comment.
- **B. Keep it, re-typed** to `Effect<void, EnforcementErrorClass, …>` (drops `"extraction-failed"`).
  Still breaking (the literal changes), and keeps a test seam in the public surface.

`frame`/`decisionFrames`/`syncedFrame` are **not** decided here — ARCH-28 moves the frame vocabulary
and decides their surface; doing it twice would conflict. Recommendation: **A**. `status: decided (2026-10-07, A, recommended)`

### D-19-d — Where the two log taps live

- **A. Inside `authorizeRequest` (recommended).** Every surface logs a denial and an extraction failure
  the same way, by construction; the stream gains `logDenial`'s code/subject/reason. Cost: a
  *handler-raised* denial under the middleware (C6a) is still projected but no longer logged by the
  edge — it is the handler's own `guard`'s failure, and its own business. T1 pins the projection (the
  security-relevant half) and the changeset names the lost log line.
- **B. One shared `tapHttpEnforcementFailure` applied by each surface's last step**, over the whole
  effect. Preserves the handler-raised log, but every surface must remember to apply it — the drift
  `reauthCheck` already shows.

Recommendation: **A**. `status: decided (2026-10-07, A, recommended)`

### D-19-e — The bare-route answer helpers once the step logs

`handleEnforcementErrors` logs denials and `subjectExtractionFailedResponse` logs extraction failures
(`QadiHttpError.ts:417-427, 467-474`); under D-19-d = A, `guardRoute` must answer without logging, or
every bare-route denial logs twice (T1's exact-log tests catch it).

- **A. Widen `toResponse` to all twelve tags (additive) and remove the two logging helpers
  (recommended).** `toResponse(error: HttpEnforcementFailure)` answers `SubjectExtractionFailed` with its
  existing tag-only JSON 502 and the eleven with empty bodies, as today. `guardRoute` becomes
  `authorizeRequest(…)(request)` → handler → `catchTag(HTTP_ENFORCEMENT_TAGS, (e) => Effect.succeed(toResponse(e)))`.
  `handleEnforcementErrors` and `subjectExtractionFailedResponse` leave the surface (loud, compile-time
  break; replacement: `authorizeRequest` + `toResponse`). `logDenial`/`logSubjectExtractionFailed` stay
  public.
- **B. Keep both names, make them pure** (no logging). Same signatures, silently fewer logs for a
  direct caller — the quiet kind of break.
- **C. Keep both, logging, and add an internal pure mapper for `guardRoute`.** Two answer paths derived
  from one table, one of which logs.

Recommendation: **A**. `status: decided (2026-10-07, A, recommended)`

### D-19-f — What the stream logs when a recheck ends a connection

Under D-19-d = A a denial or extraction failure is logged by the step. Today's recheck also logs
outages and wiring mistakes (`reauth check failed (AttributeResolveError), reporting outage`), which the
connect path does not.

- **A. One line at the stream's last step for every failure (recommended):**
  `qadi/http: /__decisions recheck ended the stream (<tag>, <class>)` at warning level, then
  `mapError(classifyHttpEnforcementFailure)`. A connection closing is a fact of its own; an outage that
  ends one stays visible, as today. A denial yields two lines (the decision, the closure) — different
  facts.
- **B. Nothing beyond the step's taps.** An outage on recheck ends a stream silently. Regresses C4's
  one useful property.

Recommendation: **A**. `status: decided (2026-10-07, A, recommended)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done
- **Depends on:** —
- **Files:** none
- **Steps:**
  1. `git switch -c arch/19-http-edge-step main` (or from ARCH-18's branch if it has landed; see §9).
  2. Re-read every `file:line` in §1; re-run the type probe
     (`cd scratchpad/wave3/ARCH-19 && <repo>/node_modules/.bin/tsc -p tsconfig.json`): expect errors only on
     shape 2 (and the unrelated `crypto` TS2304).
  3. Check whether ARCH-25, ARCH-27 or ARCH-28 has edited `QadiHttpError.ts`, `DecisionStreamRoute.ts`
     or `DecisionBacklogRoute.ts`; if so, rebase the steps below onto their names.
- **Tests:** none.
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`;
  `node scripts/check-api-surface.mjs`; `pnpm circular`.
- **Done when:** counts are logged in §10.

### T1 — Characterize what must not move (test-first, no production change)
- **Status:** [x] done
- **Depends on:** T0
- **Files:** `packages/http/test/http.test.ts`.
- **Steps:**
  1. Bare route, exact logs: with `appLayerWithLogger`, POST `/documents/write` as Bob → 403 and
     `logs` deep-equals exactly one `request denied (…)` line; with a failing `subjectExtractorBearer`
     → 502 and exactly one `subject extraction failed — …` line. (Today's code produces exactly these;
     the test exists to fail on a double log in T4.)
  2. Middleware, handler-raised enforcement failure (C6a): add an endpoint to a local API whose handler
     runs `guard(writePermission, writePolicy)({}, …)` for Bob and lets the failure out. First establish
     whether `HttpApiBuilder` lets a handler's error type include `AccessDenied` (the endpoint must
     declare an error schema accepting it); if it cannot compile, record "unreachable" in §10 and drop
     this step. If it compiles, assert 403 and that the body has no `trace` key.
  3. Middleware, service scope (C6b): a handler that calls `guard` again for Alice under
     `decisionCacheLayer()` hits the cache (mirror `http.test.ts:400-412` for the HttpApi surface), so a
     change in which services reach the handler shows up.
- **Tests:** two to four new `it.effect`s, all green on `main`.
- **Verify:** `pnpm vitest run packages/http/test/http.test.ts`.
- **Done when:** green on unchanged source; §10 records step 2's outcome.

### T2 — Classify a recheck failure through the HTTP class table (test-first defect fix, C3)
- **Status:** [x] done
- **Depends on:** T0 (no decision: correct under every option; touches today's `reauthCheck` only)
- **Files:** `packages/http/src/QadiHttpError.ts`; `packages/http/src/DecisionStreamRoute.ts`
  (`:324-350`); `packages/http/test/decisionStream.test.ts` (`:353-377`); `packages/http/test/QadiHttpError.test.ts`.
- **Steps:**
  1. Change the test at `decisionStream.test.ts:353` to expect `result.failure === "outage"` and the
     connect-path log text `qadi/http: subject extraction failed — token service unreachable`. Run: red.
  2. In `QadiHttpError.ts` add, after `HTTP_ENFORCEMENT_CLASSES` (`:88-91`):
     `export const classifyHttpEnforcementFailure = (self: { readonly _tag: HttpEnforcementTag }): EnforcementErrorClass => HTTP_ENFORCEMENT_CLASSES[self._tag];`
     (doc: one-line summary; then "the reader of the table `wire` derives statuses from — the stream's
     recheck labels a failure with it, so the two cannot disagree (CCR-QD-NEXT)"). Use it in `wire` (`:166`).
  3. Rewrite `reauthCheck` as `SubjectExtractor.extract(request)` → `assert(...)` (unchanged), then one
     `tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)`, one
     `tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)`, and one `mapError(classifyHttpEnforcementFailure)`.
     Error type: `EnforcementErrorClass`. Keep the outage log line per D-19-f's recommendation, or leave
     it for T6 if D-19-f is still open.
  4. Add a `QadiHttpError.test.ts` case: `classifyHttpEnforcementFailure` over
     `everyHttpEnforcementFailure` agrees with `ENFORCEMENT_ERROR_WIRE[tag].class` for all twelve.
  5. Update `decisionStream.test.ts:332-351` (`"denied"` stays), `:379-419` (log text per D-19-f),
     `:493-528` (`"denied"` stays).
- **Tests:** as above; red-first for step 1.
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts packages/http/test/QadiHttpError.test.ts`;
  `node scripts/check-api-surface.mjs` (add the `classifyHttpEnforcementFailure` row now).
- **Done when:** green; `grep -rn "extraction-failed" packages/http` → nothing. Shippable alone as a
  `minor` breaking changeset (`reauthCheck`'s error type narrows).

### T3 — Build `AuthorizeRequest.ts`, the one step
- **Status:** [x] done
- **Depends on:** T2, D-19-a, D-19-b, D-19-d
- **Files:** `packages/http/src/AuthorizeRequest.ts` (*new*); `packages/http/src/RequirePermission.ts`
  (`NO_RESOURCE` becomes a re-export); `packages/http/src/index.ts` (if D-19-b = A, alphabetical
  `export * from "./AuthorizeRequest.ts"`); `packages/http/test/AuthorizeRequest.test.ts` (*new*);
  `packages/http/test/AuthorizeRequest.tst.ts` (*new*).
- **Steps:**
  1. Move `NO_RESOURCE` (and its doc comment, `RequirePermission.ts:105-142`) into
     `AuthorizeRequest.ts`; in `RequirePermission.ts` write `export { NO_RESOURCE } from "./AuthorizeRequest.ts";`
     (explicit re-export, §9). Add a module-private `loadNoResource = () => Effect.succeed(NO_RESOURCE)`.
  2. Write `AuthorizedRequest<P, A>` and `authorizeRequest` exactly as probe shape 1
     (`scratchpad/wave3/ARCH-19/generic.ts:11-35`), with `loadResource` optional, defaulting to
     `loadNoResource` (overload or a default type parameter `A extends Resource = Resource`; whichever
     compiles without a cast). The `guard` call is `guard(permission, policy)(resource, (authorized) => Effect.succeed(authorized))`
     under `Effect.provideService(CurrentSubject, subject)`. Taps per D-19-d = A:
     `tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)`, `tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)`.
     Wrap the inner function in `Effect.fn("qadi.http.authorizeRequest")` if generics survive (§4).
  3. Doc comment: one-line summary ("Authorizes one HTTP request: extracts the subject, loads the
     resource, and guards it, logging a denial or an extraction failure once"); then why — the three
     hand-written copies and the drift (CCR-QD-NEXT), extraction-before-load (C8), the handler is not
     built until allowed (C7), and that the surface must use the returned `resource`.
  4. Tests (`AuthorizeRequest.test.ts`): allow → `{ authorized.permission, resource, subject }`; deny →
     `AccessDenied` + one `logDenial` line; obligation undischarged → `UndischargedObligation` (port the
     `obliged` case from `decisionStream.test.ts:493-528`); extraction failure → `SubjectExtractionFailed`,
     one log line, and `loadResource` **not** called (counter); outage → `AttributeResolveError`, **no**
     edge log line; `loadResource` result is what was evaluated (port `decisionStream.test.ts:421-460`'s
     `hasRelationship` case); default loader evaluates against `{}` (a `Neq` policy denies, BEH-QD-178).
     Use `scriptedPort` for broken ports (no hand-built port errors → `PORT_DOUBLE_BUDGET` untouched).
  5. Type tests (`AuthorizeRequest.tst.ts`): `CurrentSubject` is not in the requirement; `LR` is
     carried through unchanged (incl. a loader that needs `CurrentSubject`).
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/http/test/AuthorizeRequest.test.ts`; `pnpm test:tstyche`;
  `pnpm circular`; `pnpm typecheck`; `node scripts/check-house-style.mjs`.
- **Done when:** green, madge clean, no `as`/`any`.

### T4 — `guardRoute` keeps only its answer
- **Status:** [x] done
- **Depends on:** T1, T3, D-19-e
- **Files:** `packages/http/src/GuardRoute.ts`; `packages/http/src/QadiHttpError.ts`;
  `packages/http/test/QadiHttpError.test.ts`; `scripts/check-house-style.mjs` (`PORT_DOUBLE_BUDGET`, if counts move).
- **Steps:**
  1. Widen `toResponse` to `(error: HttpEnforcementFailure) => HttpServerResponse` (D-19-e = A): the
     `SubjectExtractionFailed` arm is today's `subjectExtractionFailedResponse` body **without** the log
     (`HttpServerResponse.jsonUnsafe(Schema.encodeSync(…schema)(…project(error)), { status })`); the
     eleven stay `HttpServerResponse.empty({ status: HTTP_STATUS_BY_CLASS[classifyHttpEnforcementFailure(error)] })`.
     Branch on `error._tag === "SubjectExtractionFailed"` (a two-way test, not a `switch`).
  2. `guardRoute`'s body: `authorizeRequest(permission, policy, loadResource)(request)` →
     `Effect.flatMap(({ authorized, resource, subject }) => handler(authorized, resource).pipe(Effect.provideService(CurrentSubject, subject)))`
     → `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) => Effect.succeed(toResponse(error)))`. Keep the
     declared return type verbatim (C10). Keep the doc comment's `never`-error and `LR` paragraphs;
     replace the ordering comment (`:68-74`) with a pointer to `authorizeRequest`.
  3. Remove `handleEnforcementErrors` and `subjectExtractionFailedResponse` (D-19-e = A); move their
     `QadiHttpError.test.ts` cases (`:154-215`) to `toResponse` (status + body, no logs) — the log
     assertions now live in `AuthorizeRequest.test.ts` (T3). Recount hand-built port errors in
     `QadiHttpError.test.ts` and update `PORT_DOUBLE_BUDGET["packages/http/test/QadiHttpError.test.ts"]` to match.
  4. Update `QadiHttpError.ts`'s header (`:15-39`) "Two routing shapes read that table" paragraph.
- **Tests:** T1's exact-log bare-route tests green (one line each); `http.test.ts:351-399` green;
  `GuardRoute.tst.ts` green.
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `node scripts/check-house-style.mjs`.
- **Done when:** criteria 1, 2, 5, 6 hold for `GuardRoute.ts`.

### T5 — `RequirePermission` keeps only its projection
- **Status:** [x] done
- **Depends on:** T1, T3, ARCH-18 T2 (`endpointAccess` dispatch in place)
- **Files:** `packages/http/src/RequirePermission.ts`.
- **Steps:**
  1. In the `Required` arm of ARCH-18's dispatch, replace `:394-417` with:
     ```ts
     Effect.gen(function* () {
       const request = yield* HttpServerRequest.HttpServerRequest;
       const { subject } = yield* authorizeRequest(permission, policy)(request);
       return yield* Effect.provideService(httpEffect, CurrentSubject, subject);
     }).pipe(
       Effect.provide(evaluationServices),
       Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) => Effect.fail(projectHttpEnforcementFailure(error))),
     )
     ```
     `Effect.provide(evaluationServices)` and the `catchTag` wrap `httpEffect` too — the C6 scopes are
     preserved deliberately; say so in a two-line comment.
  2. At layer build, replace `const extractor = yield* SubjectExtractor` and the
     `Effect.context<StandingEvaluationServices>()` capture (`:348,354`) with one
     `Effect.context<StandingEvaluationServices | SubjectExtractor>()`, and provide that around the whole
     (step 1's `Effect.provide(evaluationServices)`), since `authorizeRequest` reads `SubjectExtractor`
     from context. Drop the now-unused imports (`guard`, `ENFORCEMENT_DENIAL_TAGS`, `logDenial`,
     `logSubjectExtractionFailed`). The layer's type (`:341-345`) stays
     `Layer<RequirePermission, never, SubjectExtractor | StandingEvaluationServices>`.
- **Tests:** every `http.test.ts` and `RequirePermissionClient.test.ts` case unchanged, incl. the exact
  logs at `:810-871` (one line, not two) and T1's characterizations.
- **Verify:** `pnpm vitest run --project http`; `pnpm test:tstyche`; `pnpm typecheck`.
- **Done when:** criteria 1, 2, 5, 7 hold for `RequirePermission.ts`.

### T6 — The stream's recheck keeps only its class; `reauthCheck` leaves (D-19-c)
- **Status:** [x] done
- **Depends on:** T2, T3, D-19-c, D-19-f
- **Files:** `packages/http/src/DecisionStreamRoute.ts`; `packages/http/test/decisionStream.test.ts`;
  `packages/http/test/AuthorizeRequest.test.ts`; `scripts/check-house-style.mjs` (only if a moved test
  changes `PORT_DOUBLE_BUDGET["packages/http/test/decisionStream.test.ts"]`).
- **Steps:**
  1. Replace `reauthCheck` with a module-private
     `recheck = (permission, policy, request) => authorizeRequest(permission, policy)(request).pipe(Effect.tapError(<D-19-f line>), Effect.mapError(classifyHttpEnforcementFailure), Effect.asVoid)`,
     and use it at `:425`. The recheck now carries the route's `permission` (it used `assert`, which has
     none) — same `permitted` semantics.
  2. Delete the orphaned comment block `:238-257` (it documents a function that is gone) and the
     `reauthCheck` doc (`:277-323`); move its still-true content (re-extraction is the point; `assert`
     semantics → `guard`; fail closed on extraction failure) into the module header's reauth paragraph.
  3. Tests: `decisionStream.test.ts`'s `describe("reauth")` (`:331-547`) — rewrite each case against
     `authorizeRequest` + `classifyHttpEnforcementFailure` (the classification cases) or move it to
     `AuthorizeRequest.test.ts` where it duplicates T3; keep the `TestClock` merge test
     (`:462-491`) as `Effect.repeat(authorizeRequest(readPermission, readPolicy)(request), Schedule.spaced("10 seconds"))`.
     Delete duplicates rather than keeping both (§7).
  4. Remove `reauthCheck` from `spec/overview.md:537` in the same commit (gate 13 STALE).
- **Tests:** as above; `decisionStream.test.ts:222-257` (route builds the reauth branch) unchanged.
- **Verify:** `pnpm vitest run packages/http/test/decisionStream.test.ts packages/http/test/AuthorizeRequest.test.ts`;
  `node scripts/check-api-surface.mjs`; `node scripts/check-house-style.mjs`.
- **Done when:** criteria 1–3 hold for `DecisionStreamRoute.ts`.

### T7 — One no-resource loader
- **Status:** [x] done
- **Depends on:** T3
- **Files:** `packages/http/src/PermissionRegistry.ts` (`:204-211`, `:138-155`);
  `packages/http/src/DecisionStreamRoute.ts` (`:392-398`); `packages/http/src/DecisionBacklogRoute.ts` (`:72-78`).
- **Steps:**
  1. Make `addGuardedRoute`'s `loadResource` optional, forwarding `undefined` to `guardRoute`, which
     forwards it to `authorizeRequest` (default `loadNoResource`); or, if an optional fifth curried
     argument cannot keep `A`'s inference without a cast, export nothing new and import the
     module-private `loadNoResource` by path in the three files.
  2. Delete the three `() => Effect.succeed(NO_RESOURCE)` arguments and the now-unused `NO_RESOURCE` /
     `Effect` imports. Update `NO_RESOURCE`'s doc (`:136-140`): it is the default loader's value.
- **Tests:** `http.test.ts`'s registry and `/__permissions` tests, `decisionStream.test.ts`,
  `decisionBacklog.test.ts` unchanged.
- **Verify:** `pnpm vitest run --project http`; criterion 4's grep.
- **Done when:** criterion 4 holds.

### T8 — Spec, ADRs, overview, traceability, CCR, docs, changeset
- **Status:** [x] done
- **Depends on:** T4, T5, T6, T7
- **Files:** `spec/behaviors/23-http.md`; `spec/behaviors/26-decision-stream.md`;
  `spec/decisions/036-qadi-http-package-shape.md`; `spec/decisions/046-a-decision-feed-is-sse-and-guarded.md`;
  `spec/decisions/081-enforcement-error-classes-live-in-core.md`; `spec/overview.md`; `spec/traceability.md`;
  `spec/README.md`; `packages/http/README.md`; `apps/website/src/content/docs/docs/packages/http.md`;
  `apps/website/src/content/docs/docs/reference/upgrading.md` (or the next release's page);
  `.changeset/http-edge-step.md` (*new*).
- **Steps:**
  1. `23-http.md`: new **BEH-QD-NEXT "One authorization step at the edge"** — REQUIREMENTs: every
     `@qadi/http` surface MUST authorize through `authorizeRequest`; the subject MUST be extracted before
     the resource is loaded; a denial and an extraction failure MUST each be logged exactly once, by the
     step; the handler MUST NOT be invoked unless the step allowed. Amend BEH-QD-177's prose where it
     names `handleEnforcementErrors`. Change History.
  2. `26-decision-stream.md`: remove the `reauthCheck` signature (`:154-158`); restate BEH reauth
     requirements without the name; add "a recheck failure is classified by the same table as the
     connect-time status (`classifyHttpEnforcementFailure`)". Change History.
  3. ADR-QD-036 (Rev bump): "one enforcement path" now literal; C7 noted. ADR-QD-046 (Rev bump): the
     recheck's classes; `reauthCheck` removed. ADR-QD-081 (one paragraph): the extended table's reader.
  4. `overview.md`: rows for `authorizeRequest`, `AuthorizedRequest`, `classifyHttpEnforcementFailure`
     (D-19-b); remove `reauthCheck`, `handleEnforcementErrors`, `subjectExtractionFailedResponse`
     (D-19-c/e); update `toResponse` (twelve tags), `NO_RESOURCE` (source file, default loader),
     `logDenial`/`logSubjectExtractionFailed` (wired by `authorizeRequest`). Change History.
  5. `traceability.md`: BEH-QD-NEXT → `AuthorizeRequest.ts`, `AuthorizeRequest.test.ts`,
     `AuthorizeRequest.tst.ts`; update row 65's file list and the `decisionStream.test.ts` row.
  6. `spec/README.md`: `CCR-QD-NEXT`.
  7. README/website: a short "building your own surface" ` ```typescript ` example with
     `authorizeRequest` + `toResponse` (compiled by gates 9/22).
  8. Changeset `"@qadi/http": minor`, **Breaking**: `reauthCheck`, `handleEnforcementErrors`,
     `subjectExtractionFailedResponse` removed (replacement: `authorizeRequest` + `toResponse`);
     recheck failure on a broken credential store is `outage`; a handler-raised denial under
     `RequirePermission` is projected but not logged by the edge (D-19-d); the edge no longer invokes a
     handler function before the policy allows (C7). Added: `authorizeRequest`, `AuthorizedRequest`,
     `classifyHttpEnforcementFailure`; `toResponse` accepts all twelve tags.
- **Tests:** none new.
- **Verify:** `node scripts/check-api-surface.mjs`; `node scripts/check-doc-examples.mjs`;
  `node scripts/check-website-doc-examples.mjs`; `pnpm spec:verify:strict`; `pnpm spec:gates`.
- **Done when:** all gates pass.

### T9 — Full gate
- **Status:** [-] full `pnpm check` deferred to the orchestrator's single end run; the targeted gates and `pnpm example` ran
- **Depends on:** T8
- **Files:** none
- **Steps:** `pnpm check`; fix; confirm `pnpm example` (both `examples/http-advanced` and
  `examples/nextjs-newsroom` build against the changed exports — neither imports a removed name today:
  `examples/http-advanced/server.ts:66-75`, `examples/nextjs-newsroom/src/server/api.ts:42-49`).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T10 — Update the tracker
- **Status:** [x] done
- **Depends on:** T9
- **Files:** this plan's frontmatter and §10; `.planning/architecture/README.md` (orchestrator).
- **Steps:** set `status:`, tick tasks, record decisions as `decided (<date>, <choice>)`, add the §10
  row; notify ARCH-25/27/28 owners of the moved names (`NO_RESOURCE` source, removed helpers,
  `classifyHttpEnforcementFailure`).
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-19-*.md | sort | uniq -c`.
- **Done when:** the tracker matches the branch.

## 7. Test strategy

- **Survive unchanged:** all of `http.test.ts` (incl. exact logs `:810-871`, ordering `:360`, cache
  `:400-492`, disclosure `:669-808`), `RequirePermissionClient.test.ts`, `decisionBacklog.test.ts`,
  the frame/backlog/resume blocks of `decisionStream.test.ts`, `GuardRoute.tst.ts`,
  `RequirePermission.tst.ts`, `DecisionStreamRoute.tst.ts`.
- **New:** `AuthorizeRequest.test.ts` (the step's whole contract: order, scope, both logs, no log for
  outages, evaluated resource, default loader) and `AuthorizeRequest.tst.ts` (requirement types);
  T1's characterizations in `http.test.ts`.
- **Moved, not layered:** `decisionStream.test.ts`'s `describe("reauth")` — the cases that test the
  check itself move to `AuthorizeRequest.test.ts`; only the class mapping and the `TestClock` merge stay
  in `decisionStream.test.ts`. `QadiHttpError.test.ts`'s `handleEnforcementErrors`/
  `subjectExtractionFailedResponse` cases become `toResponse` cases; their log assertions are deleted
  (the step's tests own logging). Net test count should drop slightly, not grow.
- **Property/differential:** `classifyHttpEnforcementFailure` agrees with every wire entry's `class`
  over `everyHttpEnforcementFailure` (T2).
- **Mutation:** if a Stryker config covers `packages/http/src`, the step's taps and the
  `SubjectExtractionFailed` arm of `toResponse` must be killed by the exact-log and body tests.

## 8. Spec and documentation updates

Covered by T8: BEH-QD-NEXT in `23-http.md`, BEH-QD-177 prose, `26-decision-stream.md` (signature and
requirements), ADR-QD-036/046/081 amendments, `spec/overview.md` (three rows added, three removed, four
edited — gate 13), `spec/traceability.md`, `spec/README.md` `CCR-QD-NEXT`, package README, website
`packages/http.md` and the upgrading page, and one `minor` breaking changeset. No AGENTS.md change.

## 9. Risks and rollback

- **Sequencing with ARCH-18.** Both rewrite `RequirePermissionLive`'s body: ARCH-18 the declaration
  half (`:356-382`), this plan the enforcement half (`:384-417`). Land ARCH-18 first (it is smaller and
  fixes a live registry defect); T5 then edits only the `Required` arm. T0–T4 and T6–T7 do not touch
  `RequirePermission.ts` beyond T3's `NO_RESOURCE` move, which conflicts with nothing in ARCH-18.
- **Overlaps:** ARCH-25 rewrites `reportRefused` in `DecisionStreamRoute.ts`/`DecisionBacklogRoute.ts`
  (textual conflicts only); ARCH-27 may restructure `ENFORCEMENT_ERROR_WIRE`/`HTTP_ENFORCEMENT_CLASSES`
  (`classifyHttpEnforcementFailure` must read its result; land T2 after ARCH-27 or rebase it);
  ARCH-28 moves `frame`/`decisionFrames`/`syncedFrame` — do not touch them here.
- **Double or lost logs.** Shows as an exact-log test failure (T1, `http.test.ts:810-871`). Rollback:
  revert the surface's task; the step is additive until a surface uses it.
- **Handler-scope regression (C6).** If T5 moved `httpEffect` outside `Effect.provide(evaluationServices)`
  or the `catchTag`, T1's characterizations fail. Do not "simplify" the middleware's pipe.
- **Breaking removals.** Mitigated by the changeset's replacement list; no in-repo consumer imports a
  removed name (C5, T9).
- **Known, unchanged:** a failed recheck still surfaces through the platform as an unhandled fiber
  failure (`decisionStream.test.ts:530-545`); not made worse, not fixed here.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; evidence verified at `e328e75` (type probe `scratchpad/wave3/ARCH-19/generic.ts`) | planner |
| 2026-10-07 | T0–T10 | Implemented, one commit. T0: ARCH-18/25/27/28 landed first; names rebased (ARCH-28 left `frame`/`decisionFrames`/`syncedFrame` in http, untouched). T1: five characterizations green on unchanged source; the handler-raised denial compiles (HttpApiBuilder lets a handler's error include `AccessDenied`), so step 2 was kept: 403, tag `AccessDenied`, no `trace`. T2: the recheck test was red first (`'extraction-failed'` vs `'outage'`), then green once the recheck went through `authorizeRequest` + `classifyHttpEnforcementFailure` (T2's interim `reauthCheck` rewrite was skipped because T6 deletes it in the same commit). T3: `AuthorizeRequest.ts` (overloaded `authorizeRequest`; the inner step is `Effect.fn("qadi.http.authorizeRequest")` with the two taps as its pipeable; generics survive). T4–T7 as planned. T8: BEH-QD-321, CCR-QD-197, ADR-QD-036 Rev 1.5 / 046 Rev 1.4 / 081 Rev 1.1, overview, traceability, README, website, changeset. | implementer |
| 2026-10-07 | deviation | `NO_RESOURCE` and the default loader `loadNoResource` live in a new internal `NoResource.ts`, not in `AuthorizeRequest.ts`: the api-surface gate does not follow a named re-export out of a barrel module, and T7 needs the loader importable by path without a public export. `RequirePermission.ts` re-exports `NO_RESOURCE` from it. `addGuardedRoute` was not made loader-optional (no cast-free way to keep `A`); the three routes pass `loadNoResource`. D-19-f: the stream logs one warning, `qadi/http: /__decisions recheck ended the stream (<tag>, <class>)`. `PORT_DOUBLE_BUDGET` unchanged (QadiHttpError.test.ts still 12). The upgrading page was not edited (the changeset carries the migration). Unrelated, pre-existing in the full run: `packages/devtools/test/react/useTimeline.test.tsx` "closes the connection when the panel unmounts" fails. | implementer |
