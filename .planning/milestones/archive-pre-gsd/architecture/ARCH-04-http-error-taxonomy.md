---
id: ARCH-04
title: One description per enforcement-error tag, from which every HTTP response, stream label and middleware error list derives
strength: Worth exploring
status: implemented
evidence_verified_at: 1caf04c
depends_on: []
blocks: []
adrs_touched:
  - ADR-QD-008   # error taxonomy: a tag-keyed map `satisfies Record<Tag, …>` is the house pattern
  - ADR-QD-022   # SubjectSetServices = Exclude<EvaluationServices, CurrentSubject>
  - ADR-QD-036   # @qadi/http package shape, two adapters over one enforcement path
  - ADR-QD-037   # madge + tstyche are gates
  - ADR-QD-046   # the decision stream and its reauth label
  - ADR-QD-060   # Schema.TaggedError for the nine wire-crossing errors
  - ADR-QD-072   # amend: RequirePermissionLive's hand-conversion is replaced by an in-channel projection
  - ADR-QD-075   # clientError derived from the same array as `error:`
  - ADR-QD-076   # in flight, uncommitted on this branch: ignoreStatic for mutation runs
packages:
  - "@qadi/core"
  - "@qadi/http"
  - "@qadi/react"
  - "@qadi/promise"
  - examples/nextjs-newsroom
  - examples/http-advanced
  - apps/website
estimate: L
---

# ARCH-04 — One description per enforcement-error tag

## 1. Verified evidence (at `1caf04c`)

Re-checked against HEAD `1caf04c` (`chore(release): version packages (#138)`).
`effect` is now a peer dependency at **4.0.0** (`packages/http/node_modules/effect/package.json`),
and the `effect/http-api/*` / `effect/http/*` import paths are the current ones.
Every experiment below ran in a scratch copy of `packages/http` under
`/private/tmp/claude-502/…/scratchpad/http-exp/` (a symlinked `node_modules`, the
same `tsconfig.base.json`, `@qadi/core` aliased to the repo's source). Nothing in
the repository was modified.

### 1.1 The three entry shapes

| # | Claim | Verdict | Evidence |
| - | ----- | ------- | -------- |
| E1 | `guardRoute` extracts the subject, guards, provides `CurrentSubject`, then maps errors through `handleEnforcementErrors` to a bodyless 403/502/500 via `toResponse`. | **CHANGED** (one nuance) | `packages/http/src/GuardRoute.ts:66-81`: extract `:75`, `guard` `:77`, `provideService` `:78`, `handleEnforcementErrors` `:66`. `toResponse` is `HttpServerResponse.empty(...)` (`QadiHttpError.ts:187-188`). The nuance: the twelfth failure, `SubjectExtractionFailed`, is **not** bodyless on this path. It goes through `subjectExtractionFailedResponse` (`QadiHttpError.ts:205-213`, wired at `:274`), which answers a JSON `{"_tag":"SubjectExtractionFailed"}` 502. So the bare route is bodyless for the eleven `EnforcementError` tags only. |
| E2 | `RequirePermissionLive` hand-writes the `AccessDenied` and `UndischargedObligation` arms with JSON bodies and `DENIAL_STATUS`, and leaves the other nine tags to the `HttpApiMiddleware` error schemas. | **CONFIRMED** | `packages/http/src/RequirePermission.ts:455-503`: extract `:457`, `guard` `:458`, `provideService` `:459`, `tapErrorTag` `:469`, `catchTag("AccessDenied")` `:479-485`, `catchTag("UndischargedObligation")` `:494-501`, `catchTag("SubjectExtractionFailed")` `:502`. The nine propagate typed (comment `:451-454`). |
| E3 | `reauthCheck` uses `assert` plus `classifyEnforcementError` and maps the failure to a class string. | **CONFIRMED** | `packages/http/src/DecisionStreamRoute.ts:217-243`: extract `:226`, `assert` `:232`, `provideService` `:233`, `mapError(classifyEnforcementError)` `:240`. The error type is `EnforcementErrorClass \| "extraction-failed"` (`:223`). |
| E4 | `PermissionRegistry.ts` is one of the five taxonomy files. | **CHANGED** | It holds **no** copy of the taxonomy. `addGuardedRoute` (`PermissionRegistry.ts:138-155`) only delegates to `guardRoute` (`:153`). `permissionRegistryRoute` (`:204-211`) and `decisionStreamRoute` (`DecisionStreamRoute.ts:283-289`) reach the taxonomy through it. It changes in this plan only if imports move. |

**New finding, settled by experiment (E5).** The three hand-written arms in
`RequirePermissionLive` (`RequirePermission.ts:479-502`) are **behaviorally
redundant** with the declared schemas. I deleted all three in the scratch copy
and replaced them with only `Effect.tapErrorTag("SubjectExtractionFailed", log…)`.
The result:

- `tsc` reported only unused-import errors (TS6133). The middleware's error type
  still checks, because a real `AccessDenied` is structurally assignable to
  `AccessDeniedPublic`'s type.
- All 67 existing `packages/http` tests still passed. That includes the
  disclosure test (`http.test.ts:806-831`, "never the trace"), the client-decode
  tests (`RequirePermissionClient.test.ts:166-252`), the 502 log test
  (`http.test.ts:860-893`) and the OpenAPI status test (`http.test.ts:672-678`).
- The bodies were **byte-identical** on a dump test: `403 application/json {"_tag":"AccessDenied","subjectId":"alice","policyTag":"HasPermission","reason":"subject lacks permission 'document:read'"}`
  and `403 application/json {"_tag":"UndischargedObligation"}`, with or without the arms.

The last `stryker.http.mjs` report (`reports/mutation-http/mutation.json`, dated
2026-09-20) already marks the `StringLiteral` mutants on
`catchTag("AccessDenied")` and `catchTag("UndischargedObligation")` as
**Survived**. Applying the same mutation by hand at HEAD also survives. HttpApi's
encoder already redacts by selecting declared fields, which is the property
`QadiHttpError.ts:296-300` documents for the five `*Response` structs.

### 1.2 Where the taxonomy is spelled out

The review named five places. All five are **CONFIRMED**. The sweep across every
package found the rest:

| # | Place | `file:line` | Compile-forced when a tag is added? |
| - | ----- | ----------- | ----------------------------------- |
| T1 | `enforcementErrorTags` tuple + `AllTagsCovered` | `packages/http/src/QadiHttpError.ts:57-99` | yes, in both directions (TS2322 via `AllTagsCovered`) |
| T2 | `classifyEnforcementError` (`Match.tagsExhaustive`) | `QadiHttpError.ts:144-179` | yes |
| T3 | nine `*Response` schemas, each with a **hand-picked** `.pipe(outage)` / `.pipe(wiringMistake)`, plus three `*Refused` (`HttpApiSchema.status(DENIAL_STATUS/OUTAGE_STATUS)`) | `QadiHttpError.ts:321-344`, `:379`, `:412-414`, `:434-436` | **no** (see E6) |
| T4 | `REQUIRE_PERMISSION_ERROR_SCHEMAS` | `packages/http/src/RequirePermission.ts:254-267` | yes for the nine that propagate, **no** for the three hand-caught ones (see E7) |
| T5 | `DENIAL_STATUS`/`OUTAGE_STATUS`/`WIRING_MISTAKE_STATUS` + `STATUS_BY_CLASS` | `QadiHttpError.ts:125-127`, `:181-185` | yes (`Record<EnforcementErrorClass, number>`) |
| T6 | the "denied" class, hand-listed a **second and third** time as `tapErrorTag(["AccessDenied","UndischargedObligation"], logDenial)` | `QadiHttpError.ts:272`, `RequirePermission.ts:469` | no (a third denial tag would compile and go unlogged) |
| T7 | the hand arms' own status and schema choice (`DENIAL_STATUS`, `AccessDeniedRefused`, `UndischargedObligationRefused`) | `RequirePermission.ts:479-501` | no |
| T8 | core: `EvaluationError`, `QadiError`, `ERROR_CODES` | `packages/core/src/Errors.ts:305-364` | yes (`satisfies Record<QadiError["_tag"], …>`) |
| T9 | core: `EnforcementError` union | `packages/core/src/Qadi.ts:80` | — (the union itself) |
| T10 | core: `EVALUATION_ERROR_TAGS_BY_TAG` | `packages/core/src/Evaluate.ts:160-175` | yes |
| T11 | core: `EvaluationErrorSchema` | `packages/core/src/SinkCodec.ts:70-80` | yes, indirectly: `toWire` is typed `SinkRecordWire` (`:327`, `:347`) |
| T12 | core test: `everyErrorFactory` | `packages/core/test/SinkCodec.test.ts:44-66` | yes (`Record<EvaluationError["_tag"], …>`) |
| T13 | http test: `toResponse` case table with literal statuses | `packages/http/test/QadiHttpError.test.ts:65-91` | no (tuple array) |
| T14 | example: a partial outage list (8 of 11) that **misclassifies** `UndischargedObligation` as "an outage, not a denial" and **omits** `CustomPredicateError`/`SignatureHistoryUnavailable` | `examples/nextjs-newsroom/src/server/actions.ts:89-105` | no (the omitted two leak to `runPromise` as a rejection) |
| T15 | spec status table | `spec/behaviors/23-http.md:124-128` (BEH-QD-177) | — |
| T16 | docs status tables | `apps/website/src/content/docs/docs/packages/http.md:96-115`, `packages/http/README.md:33-37` | — |

The module doc narrating the drift is **CONFIRMED**: EC-02 at
`QadiHttpError.ts:101-113` and `:116-124`, GR-01/TS-01 at `:129-143` and
`DecisionStreamRoute.ts:137-155`.

**E6 — the two routing shapes can disagree on a status, silently (settled by
experiment).** T3 picks each schema's status by hand, independently of T2.
In the scratch copy I flipped each of the eight non-denial `.pipe(...)` choices
one at a time:

- `PolicyTooDeepResponse` → `.pipe(outage)`: the HttpApi path answers 502 while
  `toResponse` answers 500.
- `SignatureHistoryUnavailableResponse` → `.pipe(wiringMistake)`: the HttpApi
  path answers 500 while the bare route answers 502.

Every flip compiled and all 67 real tests stayed green. The OpenAPI test
(`http.test.ts:678`) checks only the *set* of statuses, which a swap leaves
unchanged. BEH-QD-177's title, "One status mapping, shared by both adapters", is
true today only because nobody has edited it.

**E7 — omission from the middleware list is compile-forced for only nine of the
twelve tags (settled by experiment).**

- Removing `PolicyTooDeepResponse` from `REQUIRE_PERMISSION_ERROR_SCHEMAS` fails
  `tsc` with TS2379 / TS377003 at `RequirePermission.ts:404`. The middleware's
  error type rejects an undeclared propagating tag.
- Removing `AccessDeniedRefused` and `UndischargedObligationRefused` compiles
  **cleanly**. The loss surfaces only at runtime: 3 tests fail with
  `HttpClientError`, plus the OpenAPI status test.

The reason is that the three hand-caught tags never reach the middleware's error
channel.

### 1.3 `Exclude<EvaluationServices, CurrentSubject>`

| Claim | Verdict | Evidence |
| ----- | ------- | -------- |
| `RequirePermissionEvaluationServices` re-lists six services | **CONFIRMED** | `packages/http/src/RequirePermission.ts:392-398`, used at `:403` and `:413`. Its own doc comment (`:384-390`) argues *against* a core export as "a third public export three packages would need to agree stays in sync". |
| The same `Exclude` is spelled in promise, react and DecisionStreamRoute (×2) | **CONFIRMED** | `packages/promise/src/index.ts:47`, `packages/react/src/QadiAtoms.ts:48` (exported `QadiRuntimeServices`), `packages/http/src/DecisionStreamRoute.ts:224`, `:321`. |
| (implied) core has no such export, so one is needed | **CHANGED** | Core **already exports this exact alias** under a domain name: `SubjectSetServices = Exclude<EvaluationServices, CurrentSubject>` (`packages/core/src/SubjectSet.ts:43`, row at `spec/overview.md:156`). Core also spells the `Exclude` a sixth time in `EvaluationServicesNone`'s type (`packages/core/src/EvaluationServicesNone.ts:53-55`). Not duplicates, and they stay: `GuardRoute.ts:64` `Exclude<R \| EvaluationServices, CurrentSubject>` (deliberate, pinned by `packages/http/test/GuardRoute.tst.ts:43-58`) and devtools' `EvaluationPorts = Exclude<EvaluationServices, CurrentSubject \| EvaluationId>` (`packages/devtools/src/model/SimulationInput.ts:77`, a different set). |

### 1.4 "Adding an enforcement error touches …"

**CONFIRMED, with a sharper count.** A new `EvaluationError` member must touch:

- core `Errors.ts`: the class, the union and `ERROR_CODES`;
- `SinkCodec.ts:70` and `Evaluate.ts:160`;
- `SinkCodec.test.ts:44`;
- `QadiHttpError.ts` in three places (T1, T2, a new `*Response` constant **plus a
  hand-picked status**);
- `RequirePermission.ts:254` (T4), and the test table T13.

Of these, the status pick and the test table are **not** compile-forced (E6). A
new *hand-caught* tag would also be uncaught in T4 and T6 (E7).

### 1.5 Stale claims found along the way, fixed by this plan

- **S1.** `spec/behaviors/26-decision-stream.md:93` declares `reauthCheck`'s error
  as `"denied" | "extraction-failed"`. The code is
  `EnforcementErrorClass | "extraction-failed"` (`DecisionStreamRoute.ts:223`),
  which has been true since GR-01/TS-01.
- **S2.** BEH-QD-260 (`spec/behaviors/23-http.md:171-177`) requires the
  `UndischargedObligation`/`SubjectExtractionFailed` body to "stay **empty**". The
  code answers a tag-only JSON body (`RequirePermission.ts:494-501`; BL-01 fix),
  and the client test depends on that (`RequirePermissionClient.test.ts:202-230`).
  ADR-QD-072's Decision paragraph ("hand-converts these three to an empty-body
  response — identical to `toResponse`'s … byte for byte") carries the same
  staleness.
- **S3.** `QadiHttpError.ts:359-360` cites `HttpApiBuilder.ts:1224` for the
  `isNoContent` special case. In effect 4.0.0 that code is at
  `HttpApiBuilder.ts:1268`, `:1296` and `:1332`.
- **S4.** The website (`apps/website/.../packages/http.md:112-115`) and
  `packages/http/README.md:36-37` say "every response body is empty". That is
  true only of the bare route since ADR-QD-072.

### 1.6 Spikes that de-risk the target design (scratch only)

- **P1 — the table compiles with no `as`.** A tag-keyed class table, an HTTP wire
  table built by one `wire(tag, schema, project)` helper (status derived from the
  class, never hand-picked), and a **correlated-record projection** compiled under
  `tsc` 7.0.2 (`effect-tsgo`) with no `as`. The projection is typed
  `projections: { readonly [K in Tag]: { project: (e: FailureByTag[K]) => WireTypeByTag[K] } } = TABLE`
  and called as `projectAt(error._tag, error)` (the TS #47109 pattern). The first
  attempt through `Record.map` lost key correlation (TS2322). Assigning the table
  directly to the mapped type fixed it.
- **P2 — the derived list equals today's.** Deriving the schema list as
  `[...Record.values(TABLE).map((w) => w.schema), SubjectExtractionRefused]` gives
  a `ClientErrorOf` union **mutually assignable** with today's 12-member
  `RequirePermissionClientError` (an `Eq<…> = true` compile check). Its `_tag` set
  is exactly `EnforcementError["_tag"] | "SubjectExtractionFailed"`.
- **P3 — one projection step reproduces today's behavior.** Replacing the three
  arms with `Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (e) => Effect.fail(projectEnforcementError(e)))`
  plus a `tapErrorTag` log gives a clean `tsc` (apart from now-unused imports),
  all 68 tests passing (67 plus the dump test), and byte-identical bodies.
- **P4 — the "missing tag fails" test runs on both compilers.** The type-level
  test passes under **both** `tstyche` (TypeScript 6.0.3, `tstyche.json`) and
  `tsc` 7: `expect<typeof TABLE>().type.not.toBeAssignableTo<Table<EnforcementError | HypotheticalNewError>>()`.
  This matters because `tsconfig.test.json` also compiles `*.tst.ts`, so the test
  must not contain a deliberate compile error.

### 1.7 REFUTED claims

None. E4 (PermissionRegistry.ts holds no copy) and §1.3's "core needs a new
export" are **CHANGED**, not refuted.

## 2. Goal and success criteria

**Goal.** Today the enforcement-error taxonomy is spread across about sixteen
places in five packages (§1.2). This plan collapses it to **two deep modules
joined at one seam**:

- **`@qadi/core` owns the transport-neutral fact** "which of three things this
  failure means": `denied`, `outage` or `wiringMistake`, i.e. INV-QD-006 at the
  type level. It lives as a total, tag-keyed table beside `ERROR_CODES` in
  `Errors.ts`, following ADR-QD-008's own pattern.
- **`@qadi/http` owns one adapter table**, keyed by the twelve tags `@qadi/http`
  can answer. Each entry carries the tag's class (read from core), its status
  (derived from the class, never chosen by hand), its `httpApiStatus`-annotated
  wire schema, and a typed projection from the real error to that schema's
  `Type`. Everything else is *derived* from this one interface:
  - the bare-route `toResponse` status;
  - the HttpApi schemas and their statuses;
  - `RequirePermission`'s `error:` list and its `clientError`;
  - the stream label `reauthCheck` reports;
  - the denial-logging tag list.

Adding an enforcement error then means one entry in each table, and **every**
omission is a compile error. The two routing shapes ADR-QD-072 keeps (bodyless
bare route, JSON HttpApi) can no longer disagree on a status, because both read
the same function. The `Exclude<EvaluationServices, CurrentSubject>` requirement
set gets one name in core, and every adapter reuses it. That improves locality,
because a new port is added in one place, and leverage, because every adapter
benefits.

**Success criteria** (each checkable):

1. `rg -n '"denied"|"outage"|"wiringMistake"' packages/*/src` matches only
   `packages/core/src/Errors.ts` (the closed union and the class table) and
   `packages/http/src/QadiHttpError.ts` (`HTTP_STATUS_BY_CLASS`'s keys and
   `SubjectExtractionFailed`'s class entry).
2. `rg -n 'HttpApiSchema\.status\(' packages/http/src` returns **exactly one**
   match: inside the `wire` helper.
3. `rg -n 'Exclude<EvaluationServices, CurrentSubject>' packages/*/src` returns
   **exactly one** match: the core alias definition.
4. `rg -n 'catchTag\("(AccessDenied|UndischargedObligation)"|DENIAL_STATUS|Match\.tagsExhaustive' packages/http/src`
   returns **zero** matches.
5. `pnpm exec tstyche packages/core/test/Errors.tst.ts packages/http/test/QadiHttpError.tst.ts`
   passes. That includes the two `HypotheticalNewError` tests proving that a tag
   added to `EnforcementError` (or to `@qadi/http`'s failure union) without a
   description fails to type-check.
6. The new differential test in `packages/http/test/QadiHttpError.test.ts` ("the
   two routing shapes answer the same status for every tag") passes. Re-running
   E6's drill (flip any entry's class in a scratch copy) makes it fail, or makes
   the build fail.
7. Bodies and statuses are unchanged for callers: every pre-existing test in
   `packages/http/test/http.test.ts`, `RequirePermissionClient.test.ts` and
   `decisionStream.test.ts` passes **without edits to its assertions**.
8. The scratch drill in T10 (add `| HypotheticalNewError` to `EnforcementError`)
   produces compile errors at every site that must change and at **no** other
   site. In `@qadi/http` that is exactly one: the wire table.
9. `pnpm spec:api`, `pnpm spec:examples`, `pnpm spec:verify:strict` and
   `pnpm spec:website-examples` pass.
10. `pnpm check` is green.

## 3. Non-goals

- **Giving the bare route a body.** ADR-QD-072 and `QadiHttpError.ts:21-36` keep
  the bare-route/HttpApi asymmetry on purpose. `toResponse` stays bodyless for
  the eleven tags, and `SubjectExtractionFailed` keeps its existing tag-only 502
  on the bare route (E1).
- **Moving the disclosure-safe projections into core** (a `*Public` sibling of
  `AccessDeniedPublic` for each cause-bearing tag, which `@qadi/promise` callers
  could use). The phil-freeman report raises this. It needs a per-tag disclosure
  review of its own. It is a follow-up candidate, not this plan.
- **Narrowing per-endpoint `clientError`.** ADR-QD-075 accepted the
  over-approximation.
- **Changing the stable `ACL###` codes**, `EvaluationError`'s membership, or
  `SinkCodec`'s wire.
- **Generalizing `Predicate.ts:372`'s `PredicateError`** (a deliberate subset) or
  devtools' `EvaluationPorts` (a different set: it also excludes `EvaluationId`).
- **Fixing `scripts/check-house-style.mjs:428`'s stale "All eleven current
  members"** next to `SCHEMA_ERROR_BUDGET = 12`. It is unrelated, and the budget
  number itself does not change.
- **A classification helper in `@qadi/promise`.** AGENTS.md §14 forbids a branch
  that decides there.

## 4. Constraints

| Constraint | Consequence for this plan |
| ---------- | ------------------------- |
| AGENTS.md §1 (submodule namespace imports, `.ts` extensions, `import type`) | `effect/Record` for `Record.values`. Cross-package imports are named imports from `@qadi/core`. |
| AGENTS.md §2/§3 (`Context.Service`, top-level layers) | No new service. `RequirePermissionLive` stays a top-level `Layer.effect` const. |
| AGENTS.md §4 + `SCHEMA_ERROR_BUDGET` (`scripts/check-house-style.mjs:439-441`, 12 in `Errors.ts`) | **No new `Schema.TaggedError` class.** The wire table reuses `AccessDeniedPublic` and the four wiring classes, and declares the rest as `Schema.TaggedStruct`s. The budget regex (`:443`) counts only `extends Schema.TaggedError`. `catchTag` stays in **array form** (`no-catchtags-object-form`). |
| AGENTS.md §5 + `UNTRACED_BUDGET` | No new `Effect.fn`/`fnUntraced` site is needed. `toResponse`/`classify` are pure functions. |
| AGENTS.md §5a + `SWITCH_BUDGET` | No `switch`. Classification becomes a table lookup (the `ERROR_CODES`/`errorCode` precedent, `Errors.ts:346-368`). The http `Match.tagsExhaustive` is deleted, not converted. The example's per-request translator may use `Match.value` (§5a allows it once per request). |
| AGENTS.md §6 (no `as`, no `any`) + `ANY_BUDGET` (`HttpApiMiddlewareClient.ts`, 7) | The correlated-record pattern (P1) is how the per-tag projection type-checks with no `as`. `as const` / `satisfies` are allowed (`check-house-style.mjs:134-140`). `HttpApiMiddlewareClient.ts` is **not** edited, so `ANY_BUDGET` is untouched. |
| User memory: no `Record<string, unknown>` hack, closed unions | Every table is a mapped type over the closed tag union, never `Record<string, …>`. `EnforcementErrorClass` stays a closed three-member union. Adding a case means taking the compile errors, not widening. |
| AGENTS.md §8 naming (`…Refused`) | `AccessDeniedRefused`, `UndischargedObligationRefused` and `SubjectExtractionRefused` stay exported **under those names**, now as views onto the wire table (`ENFORCEMENT_ERROR_WIRE.AccessDenied.schema`, …). The nine `*Response` names also stay. |
| AGENTS.md §9 barrels | `CoversExactly` (internal scaffolding) is **not exported**. `packages/core/src/index.ts` and `packages/http/src/index.ts` need no edit, because `export *` already covers `Errors.ts`/`Evaluate.ts`/`QadiHttpError.ts`. |
| AGENTS.md §10 coverage (core 95%, http 90%) | New code paths get tests. `classifyEnforcementError` and `projectEnforcementError` are covered table-wide. |
| AGENTS.md §11/§12 spec is normative; `typescript` fences compile | BEH-QD-177/260, the 26-decision-stream signature, a new behavior and invariant, the ADR and traceability all land in the same change (T8). Signature listings use ` ```ts `; any new runnable example uses ` ```typescript ` and must compile under gate 9 (`node scripts/check-doc-examples.mjs`). |
| AGENTS.md §15 gate 13 (`node scripts/check-api-surface.mjs`) | Every added, moved and removed export gets an `overview.md` row change (§8 lists them). |
| ADR-QD-037: gate 5 (`madge --circular --extensions ts,tsx packages/*/src`), gate 6 (`tstyche`) | No new cross-module edge in http (`QadiHttpError.ts` already imports `SubjectExtractor.ts`, and `RequirePermission.ts` already imports `QadiHttpError.ts`). In core, `Qadi.ts`'s existing `import type … from "./Errors.ts"` gains `EnforcementError`, and `Errors.ts` gains **no** import. `tstyche` pins TypeScript 6.0.3 (`tstyche.json`), and P4 shows the planned assertions pass there and under `tsc` 7. |
| ADR-QD-072 | Keep: transport metadata (`httpApiStatus`) stays in `@qadi/http`, and core gains **no** `effect/http-api` import. Keep: the real `AccessDenied`/`UndischargedObligation`/`SubjectExtractionFailed` classes are never declared in `error:`; their redacted projections are. **Amend**: "hand-converts to a response before the encoder" becomes "projects in-channel, then the encoder answers". |
| ADR-QD-075 | `clientError` stays `ClientErrorOf<typeof REQUIRE_PERMISSION_ERROR_SCHEMAS>`, still one array feeding both `error:` and `clientError`. P2 proves the union is unchanged. |
| ADR-QD-076 (in flight, uncommitted on branch `ci/stryker-ignore-static`) | `ignoreStatic: true` (diff in `stryker.http.mjs`/`stryker.config.mjs`) means Stryker **skips module-scope mutants**. Moving logic from `Match` closures (runtime, mutated today: `QadiHttpError.ts` 47/47 killed) into module-scope tables (static, now ignored) **removes** that mutation coverage. Compensation: table-driven unit tests, the type-level tests, and the differential test (T1, T2, T4) pin every entry. See §9 R3. |
| Merge gate is `pnpm check` (`spec/process/definitions-of-done.md`, 24 steps) | T10 runs it in full. `examples/http-advanced` is **not** in any gate (no `tsconfig.json` reference, no script), so T7 type-checks it by hand. |

## 5. Decisions needed before work starts

### D-04-a — Where the per-tag description lives

- **Option 1: everything in `@qadi/http`.** Merge T1/T2/T3/T5 into one http
  table. This is the least churn. The class stays unreachable to core's other
  adapters, and the Next.js example has already drifted for lack of it (T14).
- **Option 2: split at the transport seam.** The class table, tags tuple and
  `classifyEnforcementError` go in core `Errors.ts`. Status, wire schema and
  projection go in http, derived from core's class. The class is INV-QD-006 and
  transport-neutral. It sits next to `ERROR_CODES`, the same ADR-QD-008 pattern,
  so adding a tag forces its code and its class in one file. Cost: a
  public-interface move (see D-04-d).
- **Option 3: everything in core**, including status and schema. **Wrong, not
  merely expensive**: it violates ADR-QD-072's "an HTTP status code is a
  transport concern, and `@qadi/core` has no dependency on `effect/http-api`".
- **Recommendation: Option 2.** It is the most complete option that is not wrong,
  and it gives core consumers (examples, future adapters) the classification for
  free.
- status: decided (2026-10-04, recommended default) — Option 2 (split at the transport seam)

### D-04-b — A named core alias for `Exclude<EvaluationServices, CurrentSubject>`

- **(a) A new, generically named alias in `Evaluate.ts`**, next to
  `EvaluationServices`. Proposed name: `StandingEvaluationServices`, after
  `RequirePermission.ts:290`'s own "standing requirement" wording. Alternatives:
  `SubjectlessEvaluationServices`, `EvaluationPortServices`. Avoid
  `EvaluationPorts`, which devtools already uses for a different set.
  `SubjectSetServices` (core) and `QadiRuntimeServices` (react) become aliases of
  it, keeping their public names and domain meaning. `EvaluationServicesNone`,
  promise's `QadiLayer`, `DecisionStreamRoute.ts` (×2) and `RequirePermission.ts`
  all use it. Needs one gate-13 row.
- **(b) Reuse `SubjectSetServices` everywhere.** No new export, but the name is
  wrong outside subject sets, which hurts locality of meaning.
- **(c) Only replace `RequirePermission`'s hand list** with an inline `Exclude`.
  This is the minimal fix, and it leaves five spellings.
- **Recommendation: (a).** `RequirePermission.ts:384-390` argued against a new
  export as "a third public export three packages would need to agree stays in
  sync". That premise is false: core already exports one (`SubjectSetServices`),
  and the agreement is enforced by `Exclude` itself, not by convention.
- status: decided (2026-10-04, recommended default) — option (a), name `StandingEvaluationServices`

### D-04-c — What replaces `RequirePermissionLive`'s three hand-written arms

- **(a) Keep the arms** but read their status and schema from the wire table.
  That leaves two response-building paths, and keeps E7's non-forced omission.
- **(b) Delete the arms** and let the encoder redact by field selection. E5
  proves this is byte-identical. But the only thing keeping `trace` out is
  then the schema's declared fields, and ADR-QD-072's Negative Consequences
  explicitly keep the explicit step as mitigation.
- **(c) One in-channel projection step.** Use
  `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (e) => Effect.fail(projectHttpEnforcementFailure(e)))`,
  where each table entry's `project` is typed to return exactly its schema's
  `Type`. `HttpApiMiddleware`'s encoder then builds **every** response. Redaction
  stays explicit and type-checked, all twelve tags become compile-forced into
  `error:` (closing E7), and there is one response-building mechanism. Proven in
  P3.
- **Recommendation: (c)**, with an amendment to ADR-QD-072.
- status: decided (2026-10-04, recommended default) — (c) one in-channel projection

### D-04-d — How the public interface migrates

The moving exports are `ENFORCEMENT_ERROR_TAGS`, `EnforcementErrorClass` and
`classifyEnforcementError` (from `@qadi/http` to `@qadi/core`), `DENIAL_STATUS`
(replaced by `HTTP_STATUS_BY_CLASS`), and `EnforcementError` (from `Qadi.ts` to
`Errors.ts`; the package barrel is unchanged).

- **(a) Move with no re-export shims.** Each name has one home. This is breaking
  for `@qadi/http` importers of the three moved names and of `DENIAL_STATUS`.
  Ship as a changeset `minor` marked breaking; all packages are in one `fixed`
  group (`.changeset/config.json`), and all are 0.x.
- **(b) Re-export the moved names from `@qadi/http`.** Non-breaking, but two
  import paths for one concept, and every re-export needs its own gate-13 row.
- **Recommendation: (a).** This follows the user's standing rule that "source
  compatibility is not a safety argument". The `examples/http-advanced` importers
  are updated in T7.
- status: decided (2026-10-04, recommended default) — (a) move with no re-export shims

### D-04-e — Whether `SubjectExtractionFailed` is a row in the http wire table

- **(a) Yes.** Key the table by `HttpEnforcementTag = EnforcementError["_tag"] | "SubjectExtractionFailed"`,
  and give the http-local tag its class (`"outage"`) in a local extension of
  core's table. Its 502 is then derived, `SubjectExtractionRefused` is
  `ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.schema`, and the `error:` list
  is `Record.values(TABLE)` with no hand-appended member.
- **(b) No.** Keep `SubjectExtractionRefused` and `OUTAGE_STATUS` hand-written
  outside the table.
- **Recommendation: (a).** Twelve rows, one mechanism.
- status: decided (2026-10-04, recommended default) — (a) yes, a row in the wire table

Every task that depends on an open decision says so in §6. T1 depends on none
and can start immediately.

## 6. Tasks

### T1 — Pin today's behavior with characterization and differential tests (test-first)
- **Status:** [x] done
- **Depends on:** —
- **Files:**
  - `packages/http/test/fixtures/everyHttpEnforcementFailure.ts` *(new)*
  - `packages/http/test/QadiHttpError.test.ts`
- **Steps:**
  1. Create the fixture module, exporting
     `everyHttpEnforcementFailure: { readonly [K in EnforcementError["_tag"] | "SubjectExtractionFailed"]: () => Extract<EnforcementError | SubjectExtractionFailed, { readonly _tag: K }> }`.
     It is a mapped type, so a missing tag is TS2741. Each factory builds a real
     instance **with its sensitive fields populated**: `trace` on `AccessDenied`,
     `cause: new Error("postgres://user:pw@db")` on the four cause-bearing tags,
     `reason: "TypeError: boom\n at …"` on `CustomPredicateError`,
     `obligationIds` on `UndischargedObligation`, and `reason` on
     `SubjectExtractionFailed`. Reuse the field values already in
     `QadiHttpError.test.ts:65-91`.
  2. Add the test "the two routing shapes answer the same status for every tag".
     For each `EnforcementError` tag, assert
     `HttpApiSchema.getStatusErrorSchema(<today's named schema for the tag>) === toResponse(factory()).status`.
     Use an explicit `{ tag → schema }` map built from today's named exports
     (`AccessDeniedRefused`, `UndischargedObligationRefused`, the nine
     `*Response`). `getStatusErrorSchema` is exported at
     `effect/http-api/HttpApiSchema.ts:1124`.
  3. Add the test "every HttpApi wire schema encodes only its declared fields".
     For each of the twelve tags, encode the real instance through today's schema
     with `Schema.encodeSync(schema)(projectionOrInstance)`, then assert the
     encoded keys are exactly the expected key set. The expected sets are written
     in the test, not derived:
     - `AccessDenied` → `_tag, subjectId, policyTag, reason`;
     - `UndischargedObligation`/`SubjectExtractionFailed` → `_tag`;
     - `AttributeResolveError` → `_tag, attribute`;
     - and so on for the rest.

     Assert `JSON.stringify(encoded)` contains none of `postgres://`, `trace`,
     `TypeError`, `obligationIds`. Encoding the real `AccessDenied` instance is
     valid today (E5).
  4. Add the missing `AttributeResolveErrorResponse` redaction case beside
     `QadiHttpError.test.ts:207-232`'s four.
  5. Keep the existing `toResponse` case table (`:62-95`) as the independent pin
     of BEH-QD-177's spec table. Re-point it at the fixture only for instance
     construction; the status literals stay hand-written, because they are the
     spec.
- **Tests:** steps 2–4 are the tests.
- **Verify:**
  - `pnpm vitest run packages/http/test/QadiHttpError.test.ts`
  - The drill: in a scratch copy (never the repo), change
    `PolicyTooDeepResponse`'s pipe to `outage` and confirm step 2's test **fails**.
    Record the result in §10.
- **Done when:** all new tests pass at HEAD, and the E6 drill now fails the
  differential test.

### T2 — Core: the enforcement-error class table in `Errors.ts`
- **Status:** [x] done
- **Depends on:** D-04-a (Option 2), D-04-d
- **Files:**
  - `packages/core/src/Errors.ts`
  - `packages/core/src/Qadi.ts`
  - `packages/core/test/Errors.test.ts` *(new)*
  - `packages/core/test/Errors.tst.ts` *(new)*
  - `packages/core/test/Qadi.tst.ts`
- **Steps:**
  1. Move `export type EnforcementError = EvaluationError | AccessDenied | UndischargedObligation;`
     from `Qadi.ts:79-80` to `Errors.ts`, right after `EvaluationError`
     (`:304-314`), keeping its doc line. In `Qadi.ts`, add `EnforcementError` to
     the existing `import type … from "./Errors.ts"` (`:30`) and delete the local
     declaration. Update `Qadi.tst.ts:25` to import `EnforcementError` from
     `../src/Errors.ts`.
  2. Add to `Errors.ts`, after `ERROR_CODES`:
     - `export type EnforcementErrorClass = "denied" | "outage" | "wiringMistake";`
       Its doc leads with "The three things an enforcement failure can mean", then
       cites INV-QD-006 and the http/stream consumers.
     - `export type EnforcementErrorClassTable<E extends { readonly _tag: string } = EnforcementError> = { readonly [K in E["_tag"]]: EnforcementErrorClass };`
       It is generic over the error union so the type-level test can model a tag
       added to `EnforcementError`.
     - `export const ENFORCEMENT_ERROR_CLASSES = { … } as const satisfies EnforcementErrorClassTable;`
       Carry over the eleven entries and **every** rationale comment from
       `QadiHttpError.ts:150-177`, including `PolicyTooDeep`'s 500-not-400
       paragraph.
     - `export const classifyEnforcementError = (self: { readonly _tag: EnforcementError["_tag"] }): EnforcementErrorClass => ENFORCEMENT_ERROR_CLASSES[self._tag];`
       This mirrors `errorCode` (`:367-368`). The structural parameter means
       `AccessDeniedPublic` classifies too.
     - `export type EnforcementErrorTagOf<C extends EnforcementErrorClass> = { readonly [K in EnforcementError["_tag"]]: (typeof ENFORCEMENT_ERROR_CLASSES)[K] extends C ? K : never }[EnforcementError["_tag"]];`
     - `export type EnforcementDenial = Extract<EnforcementError, { readonly _tag: EnforcementErrorTagOf<"denied"> }>;`
     - The module-private `type CoversExactly<T extends ReadonlyArray<U>, U> = [U] extends [T[number]] ? T : never;`
       This is `AllTagsCovered` generalized; carry over its doc from
       `QadiHttpError.ts:71-90`.
     - `export const ENFORCEMENT_ERROR_TAGS: CoversExactly<typeof enforcementErrorTags, EnforcementError["_tag"]> = enforcementErrorTags;`
       The tuple literal moves from `QadiHttpError.ts:57-69`.
     - `export const ENFORCEMENT_DENIAL_TAGS: CoversExactly<typeof enforcementDenialTags, EnforcementErrorTagOf<"denied">> = enforcementDenialTags;`
       where `enforcementDenialTags = ["AccessDenied", "UndischargedObligation"] as const`.
  3. Extend the file header doc (`Errors.ts:1-44`) with one paragraph saying the
     class table is the second tag-keyed map beside `ERROR_CODES`, for the same
     ADR-QD-008 reason.
  4. Write `Errors.test.ts`:
     - a hand-written expected map `{ AccessDenied: "denied", … }` (the BEH-QD-177
       table), with `ENFORCEMENT_ERROR_CLASSES` asserted deep-equal to it;
     - `classifyEnforcementError` checked on a real instance of each tag, plus on
       `toAccessDeniedPublic(...)` → `"denied"`;
     - `new Set(ENFORCEMENT_ERROR_TAGS)` equal to `new Set(Object.keys(ENFORCEMENT_ERROR_CLASSES))`;
     - `ENFORCEMENT_DENIAL_TAGS` equal to the keys whose class is `"denied"`.

     These pin every static entry that ADR-QD-076's `ignoreStatic` will stop
     mutating.
  5. Write `Errors.tst.ts` (`tstyche`; it must also compile under
     `tsc -p tsconfig.test.json`, so it contains no deliberate errors):
     - `expect<keyof typeof ENFORCEMENT_ERROR_CLASSES>().type.toBe<EnforcementError["_tag"]>()`;
     - `expect<(typeof ENFORCEMENT_ERROR_TAGS)[number]>().type.toBe<EnforcementError["_tag"]>()`;
     - `expect<EnforcementErrorClass>().type.toBe<"denied" | "outage" | "wiringMistake">()`;
     - `expect<EnforcementErrorTagOf<"denied">>().type.toBe<"AccessDenied" | "UndischargedObligation">()`;
     - **the required test.** Declare
       `declare class HypotheticalNewError { readonly _tag: "HypotheticalNewError" }`,
       then assert
       `expect<typeof ENFORCEMENT_ERROR_CLASSES>().type.not.toBeAssignableTo<EnforcementErrorClassTable<EnforcementError | HypotheticalNewError>>()`
       and the positive `expect<typeof ENFORCEMENT_ERROR_CLASSES>().type.toBeAssignableTo<EnforcementErrorClassTable>()`.
       The file's doc comment explains that the real table is declared
       `satisfies EnforcementErrorClassTable`, so widening `EnforcementError` makes
       that `satisfies` fail (TS1360). This test pins the mechanism, the way
       `GuardRoute.tst.ts` pins both directions. P4 ran it green on TypeScript
       6.0.3 and 7.
- **Tests:** `Errors.test.ts` and `Errors.tst.ts` (new); `Qadi.tst.ts` (import
  path only).
- **Verify:**
  - `pnpm typecheck`
  - `pnpm vitest run packages/core/test/Errors.test.ts`
  - `pnpm exec tstyche packages/core/test/Errors.tst.ts packages/core/test/Qadi.tst.ts`
  - `pnpm circular`
  - `pnpm lint`
- **Done when:** the core gates are green, and `EnforcementError` is declared
  once, in `Errors.ts`.

### T3 — Core alias for the standing evaluation services, adopted everywhere
- **Status:** [x] done
- **Depends on:** D-04-b
- **Files:**
  - `packages/core/src/Evaluate.ts`
  - `packages/core/src/SubjectSet.ts`
  - `packages/core/src/EvaluationServicesNone.ts`
  - `packages/react/src/QadiAtoms.ts`
  - `packages/promise/src/index.ts`
- **Steps:**
  1. In `Evaluate.ts`, after `EvaluationServices` (`:281-289`), add
     `export type StandingEvaluationServices = Exclude<EvaluationServices, CurrentSubject>;`
     (or the name D-04-b picks). Its doc leads with "Everything an evaluation
     needs except who is asking — the services a runtime holds for its lifetime
     while the subject travels per call", then names its three domain aliases.
  2. `SubjectSet.ts:43` becomes `export type SubjectSetServices = StandingEvaluationServices;`.
     Keep its doc, which is the reason it exists.
  3. `EvaluationServicesNone.ts:53-55`: change the layer type to
     `Layer.Layer<StandingEvaluationServices>` and drop the now-unused
     `CurrentSubject` type import.
  4. `QadiAtoms.ts:48` becomes `export type QadiRuntimeServices = StandingEvaluationServices;`.
  5. `promise/src/index.ts:47` becomes `Layer.Layer<StandingEvaluationServices>`.
     Update the imports.
- **Tests:** the existing `packages/core/test/Ports.test.ts:328-340`
  (`EvaluationServicesNone`) and the react/promise suites must pass unchanged. Add
  one tstyche assertion to `packages/core/test/Errors.tst.ts`, or to a new
  `Evaluate.tst.ts` if you prefer locality:
  `expect<StandingEvaluationServices>().type.toBe<Exclude<EvaluationServices, CurrentSubject>>()`.
- **Verify:**
  - `pnpm typecheck`
  - `pnpm vitest run packages/core packages/react packages/promise`
  - `pnpm test:tstyche`
- **Done when:** in core, react and promise, `rg 'Exclude<EvaluationServices, CurrentSubject>'`
  matches only the `Evaluate.ts` definition.

### T4 — `@qadi/http`: one wire table in `QadiHttpError.ts`, everything else derived
- **Status:** [x] done
- **Depends on:** T1, T2, D-04-a, D-04-d, D-04-e
- **Files:**
  - `packages/http/src/QadiHttpError.ts`
  - `packages/http/test/QadiHttpError.test.ts`
  - `packages/http/test/QadiHttpError.tst.ts` *(new)*
  - `packages/http/test/http.test.ts` (imports only)
- **Steps:**
  1. Delete `enforcementErrorTags`, `AllTagsCovered`, `ENFORCEMENT_ERROR_TAGS`,
     `DENIAL_STATUS`/`OUTAGE_STATUS`/`WIRING_MISTAKE_STATUS`,
     `EnforcementErrorClass`, `classifyEnforcementError`, `STATUS_BY_CLASS`,
     `outage` and `wiringMistake` (`:57-185`, `:321-322`). Import
     `ENFORCEMENT_ERROR_CLASSES`, `ENFORCEMENT_ERROR_TAGS`,
     `ENFORCEMENT_DENIAL_TAGS`, `EnforcementDenial`, `EnforcementErrorClass`,
     `EnforcementErrorClassTable` and `classifyEnforcementError` from `@qadi/core`.
  2. Add:
     - `export type HttpEnforcementFailure = EnforcementError | SubjectExtractionFailed;`
       and `export type HttpEnforcementTag = HttpEnforcementFailure["_tag"];`;
     - a module-private
       `const HTTP_ENFORCEMENT_CLASSES = { ...ENFORCEMENT_ERROR_CLASSES, SubjectExtractionFailed: "outage" } as const satisfies EnforcementErrorClassTable<HttpEnforcementFailure>;`
       (D-04-e). Carry over `subjectExtractionFailedResponse`'s INV-QD-006
       rationale as its comment;
     - `export const HTTP_STATUS_BY_CLASS = { denied: 403, outage: 502, wiringMistake: 500 } as const satisfies { readonly [C in EnforcementErrorClass]: number };`
       Its doc carries over EC-02's history from `:101-124`.
  3. Add the interface and its table type:
     - `export interface EnforcementErrorWire<K extends HttpEnforcementTag, S extends Schema.Top>`
       with readonly `class: EnforcementErrorClass`, `status: number`, `schema: S`
       and `project: (error: Extract<HttpEnforcementFailure, { readonly _tag: K }>) => S["Type"]`;
     - `export type EnforcementErrorWireTable<E extends { readonly _tag: string } = HttpEnforcementFailure> = { readonly [K in E["_tag"]]: EnforcementErrorWire<K & HttpEnforcementTag, Schema.Top & { readonly Type: { readonly _tag: K } }> };`

     The `Type: { _tag: K }` intersection makes a schema filed under the wrong key
     a compile error.
  4. Add a module-private builder (P1):
     `const wire = <K extends HttpEnforcementTag, S extends Schema.Top & { readonly Type: { readonly _tag: K } }>(tag: K, schema: S, project: (error: Extract<HttpEnforcementFailure, { readonly _tag: K }>) => S["Type"]): EnforcementErrorWire<K, S["Rebuild"]>`.
     It computes `class = HTTP_ENFORCEMENT_CLASSES[tag]` and
     `status = HTTP_STATUS_BY_CLASS[class]`, and returns
     `schema: schema.pipe(HttpApiSchema.status(status))`. This is **the only**
     `HttpApiSchema.status` call in the package.
  5. `export const ENFORCEMENT_ERROR_WIRE = { … } satisfies EnforcementErrorWireTable;`
     with twelve entries. The schemas and projections:
     - `AccessDenied`: `AccessDeniedPublic`, `toAccessDeniedPublic`;
     - `UndischargedObligation`: `Schema.TaggedStruct("UndischargedObligation", {})`,
       projecting to `() => ({ _tag: "UndischargedObligation" as const })`;
     - the five cause-bearing tags: the existing redacted `Schema.TaggedStruct`s
       from `:324-340`, each with an explicit field-picking projection, for
       example `(e) => ({ _tag: e._tag, attribute: e.attribute })`.
       `SignatureHistoryUnavailable`'s optional `resourceId` is spread
       conditionally, as in P1;
     - `MissingAction`/`MissingResource`/`MissingResourceId`/`PolicyTooDeep`: the
       class itself, with `(e) => e`;
     - `SubjectExtractionFailed`: `Schema.TaggedStruct("SubjectExtractionFailed", {})`
       with a tag-only projection.

     Move the existing doc prose (`:277-320`, `:346-436`) onto the table and its
     entries. Rewrite the parts S2/S3 make stale: tag-only rather than empty, and
     the corrected `HttpApiBuilder.ts:1268/1296/1332` line refs.
  6. Re-export the twelve named schemas as views, keeping §8's names:
     `export const AccessDeniedRefused = ENFORCEMENT_ERROR_WIRE.AccessDenied.schema;`,
     `UndischargedObligationRefused`, `SubjectExtractionRefused`, and the nine
     `*Response` constants.
  7. Add the projection (P1), with no `as`:
     - `type FailureByTag = { readonly [K in HttpEnforcementTag]: Extract<HttpEnforcementFailure, { readonly _tag: K }> }`;
     - `type WireTypeByTag = { readonly [K in HttpEnforcementTag]: (typeof ENFORCEMENT_ERROR_WIRE)[K]["schema"]["Type"] }`;
     - `const projections: { readonly [K in HttpEnforcementTag]: { readonly project: (e: FailureByTag[K]) => WireTypeByTag[K] } } = ENFORCEMENT_ERROR_WIRE;`;
     - `const projectAt = <K extends HttpEnforcementTag>(tag: K, error: FailureByTag[K]): WireTypeByTag[K] => projections[tag].project(error);`;
     - `export const projectHttpEnforcementFailure = (error: HttpEnforcementFailure): WireTypeByTag[HttpEnforcementTag] => projectAt(error._tag, error);`.

     Do **not** route this through `Record.map`; that loses correlation (P1).
  8. Add the tag tuples and the derived list:
     - `export const HTTP_ENFORCEMENT_TAGS = [...ENFORCEMENT_ERROR_TAGS, "SubjectExtractionFailed"] as const;`
       Confirm that its element type is the 12-tag union; T4's tst pins it;
     - `export const HTTP_ENFORCEMENT_ERROR_SCHEMAS = Record.values(ENFORCEMENT_ERROR_WIRE).map((w) => w.schema);`.
  9. Rewrite the consumers on the table:
     - `toResponse = (error: EnforcementError) => HttpServerResponse.empty({ status: ENFORCEMENT_ERROR_WIRE[error._tag].status })`,
       or `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`. Pick one and
       use it everywhere. **Recommended:** the class route, because it does not
       need correlated indexing;
     - `logDenial(error: EnforcementDenial)`. Keep the message strings
       byte-identical; `http.test.ts` and `QadiHttpError.test.ts:97-133` pin them;
     - a new exported `logSubjectExtractionFailed(error)` with the message
       `qadi/http: subject extraction failed — ${reason}`, byte-identical to
       `:206`;
     - `subjectExtractionFailedResponse` becomes `logSubjectExtractionFailed`,
       then `jsonUnsafe(Schema.encodeSync(ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.schema)(projectHttpEnforcementFailure(error)), { status: ENFORCEMENT_ERROR_WIRE.SubjectExtractionFailed.status })`;
     - `handleEnforcementErrors` uses `tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)`,
       `catchTag(ENFORCEMENT_ERROR_TAGS, …toResponse)` and
       `catchTag("SubjectExtractionFailed", subjectExtractionFailedResponse)`.
       The behavior is unchanged: bodyless for the eleven, tag-only JSON 502 for
       extraction.
  10. Rewrite the module header (`:1-37`) so it describes the single table. The
      doc-comment shape is a one-line summary, then the rationale.
  11. Update the T1 tests to read the table:
      - the differential test becomes "for every key of `ENFORCEMENT_ERROR_WIRE`,
        `getStatusErrorSchema(entry.schema) === entry.status === HTTP_STATUS_BY_CLASS[classifyEnforcementError(factory())]`,
        and for the eleven `EnforcementError` tags `=== toResponse(factory()).status`";
      - the encoder test becomes
        `encode(entry.schema)(projectHttpEnforcementFailure(factory()))` with the
        same hand-written expected key sets.

      Keep the hand-literal BEH-QD-177 table test.
  12. Write `QadiHttpError.tst.ts`:
      - `expect<keyof typeof ENFORCEMENT_ERROR_WIRE>().type.toBe<HttpEnforcementTag>()`;
      - the `HypotheticalNewError` test:
        `expect<typeof ENFORCEMENT_ERROR_WIRE>().type.not.toBeAssignableTo<EnforcementErrorWireTable<HttpEnforcementFailure | HypotheticalNewError>>()`
        and the positive counterpart;
      - a schema filed under the wrong key is rejected:
        `expect<{ readonly AccessDenied: EnforcementErrorWire<"AccessDenied", typeof UndischargedObligationRefused> }>().type.not.toBeAssignableTo<Pick<EnforcementErrorWireTable, "AccessDenied">>()`;
      - `expect<(typeof HTTP_ENFORCEMENT_TAGS)[number]>().type.toBe<HttpEnforcementTag>()`;
      - `expect<ReturnType<typeof projectHttpEnforcementFailure>>().type.toBe<(typeof HTTP_ENFORCEMENT_ERROR_SCHEMAS)[number]["Type"]>()`.
- **Tests:** as above. `http.test.ts:46-63,133` imports `ENFORCEMENT_ERROR_TAGS`
  from `../src/index.ts`; switch it to `@qadi/core`, with no assertion change.
- **Verify:**
  - `pnpm typecheck`
  - `pnpm vitest run packages/http/test/QadiHttpError.test.ts packages/http/test/http.test.ts`
  - `pnpm exec tstyche packages/http/test/QadiHttpError.tst.ts`
  - `pnpm lint`
  - `pnpm circular`
- **Done when:** success criteria 1, 2 and the http half of 4 hold, and every
  pre-existing assertion passes untouched.

### T5 — `RequirePermission`: derived error list, one projection step, standing services alias
- **Status:** [x] done
- **Depends on:** T3, T4, D-04-c
- **Files:**
  - `packages/http/src/RequirePermission.ts`
  - `packages/http/test/RequirePermission.tst.ts`
- **Steps:**
  1. `REQUIRE_PERMISSION_ERROR_SCHEMAS` (`:249-267`) becomes
     `const REQUIRE_PERMISSION_ERROR_SCHEMAS = HTTP_ENFORCEMENT_ERROR_SCHEMAS;`.
     Keep the local name, which ADR-QD-075 and BEH-QD-263 cite.
     `RequirePermissionClientError` stays `ClientErrorOf<typeof REQUIRE_PERMISSION_ERROR_SCHEMAS>`.
  2. Replace the pipe at `:462-503` with:
     - `Effect.tapErrorTag(ENFORCEMENT_DENIAL_TAGS, logDenial)`;
     - `Effect.tapErrorTag("SubjectExtractionFailed", logSubjectExtractionFailed)`;
     - `Effect.catchTag(HTTP_ENFORCEMENT_TAGS, (error) => Effect.fail(projectHttpEnforcementFailure(error)))`.

     Keep the logging-before-projection comments (JD-03/JM-05). Rewrite the
     disclosure comments: redaction is now the per-tag `project`, typed to the
     declared schema's `Type`. Drop the `Schema`, `HttpServerResponse` (if
     unused), `toAccessDeniedPublic`, `DENIAL_STATUS` and per-schema imports.
  3. Delete `RequirePermissionEvaluationServices` (`:375-398`). Use
     `StandingEvaluationServices` at `:403` and `:413`, and reduce the doc to one
     line pointing at the core alias.
  4. Rewrite `RequirePermission`'s class doc (`:288-361`). The parts that change:
     - "Nine are … the other three are declared for OpenAPI visibility … none of
       the three is expected to actually reach this union at runtime" becomes
       "all twelve reach the declared union as their projection".
     - E7 is closed: an omitted schema is now a TS2379/TS377003 on every tag.
  5. In `RequirePermission.tst.ts`, add
     `expect<RequirePermissionClientError["_tag"]>().type.toBe<EnforcementError["_tag"] | "SubjectExtractionFailed">()`
     next to the existing ClientError test (`:72-74`).
- **Tests:** `RequirePermissionClient.test.ts` and `http.test.ts` unchanged
  (criterion 7).
- **Verify:**
  - `pnpm vitest run packages/http`
  - `pnpm exec tstyche packages/http/test/RequirePermission.tst.ts`
  - `pnpm typecheck`
  - `rg -n 'catchTag\("(AccessDenied|UndischargedObligation)"' packages/http/src`
    returns nothing
- **Done when:** criterion 4 holds and all http tests pass with no assertion
  edits.

### T6 — `DecisionStreamRoute`, `GuardRoute`, `PermissionRegistry`: imports and aliases
- **Status:** [x] done
- **Depends on:** T2, T3, T4
- **Files:**
  - `packages/http/src/DecisionStreamRoute.ts`
  - `packages/http/src/GuardRoute.ts` (doc only, if any)
  - `packages/http/src/PermissionRegistry.ts` (no change expected; confirm)
- **Steps:**
  1. `DecisionStreamRoute.ts:57-67`: import `classifyEnforcementError` and
     `EnforcementErrorClass` from `@qadi/core`, and stop importing them from
     `./QadiHttpError.ts`.
  2. `:224` and `:321`: use `StandingEvaluationServices | SubjectExtractor`.
  3. Rewrite the doc block at `:137-155` to say the classification now lives in
     core beside `ERROR_CODES`. Keep the GR-01/TS-01 history.
  4. `GuardRoute.ts:64` stays `Exclude<R | EvaluationServices, CurrentSubject>`.
     It is deliberate and pinned by `GuardRoute.tst.ts`. Do **not** replace it
     with the alias.
- **Tests:** `decisionStream.test.ts` (unchanged) and `GuardRoute.tst.ts`
  (unchanged).
- **Verify:**
  - `pnpm vitest run packages/http/test/decisionStream.test.ts`
  - `pnpm exec tstyche packages/http/test/GuardRoute.tst.ts`
  - `pnpm circular`
- **Done when:** success criterion 3 holds.

### T7 — Examples: consume the core classification
- **Status:** [x] done
- **Depends on:** T2, T4, D-04-d
- **Files:**
  - `examples/nextjs-newsroom/src/server/actions.ts`
  - `examples/http-advanced/server.ts`
  - `examples/http-advanced/client.ts` (comment only)
- **Steps:**
  1. `actions.ts:84-107`: replace the two `catchTag`s with one
     `Effect.catchTag(ENFORCEMENT_ERROR_TAGS, (error) => …)` that matches the
     error per request (`Match.value(error).pipe(Match.tag("AccessDenied", …), Match.orElse(…))`;
     §5a allows a per-request matcher). The `AccessDenied` arm keeps
     `renderTrace`. Every other tag reports by `classifyEnforcementError(error)`:
     `"denied"` gives "refused: an obligation was not met", while
     `"outage"`/`"wiringMistake"` gives "could not decide (tag) — an outage, not a
     denial".

     This fixes T14: `UndischargedObligation` is no longer called an outage, and
     `CustomPredicateError`/`SignatureHistoryUnavailable` no longer escape as a
     rejected Promise. Keep the existing comment's INV-QD-006 intent.
  2. `examples/http-advanced/server.ts:65-76`: import `ENFORCEMENT_ERROR_TAGS`
     from `@qadi/core` instead of `@qadi/http`. `toResponse` stays in `@qadi/http`.
- **Tests:** gate 15's example `check` (vitest, `next build`, Playwright). No e2e
  asserts the action's outage text (grep confirmed: the only string sites are
  `actions.ts:103` and `Guards.tsx:108`).
- **Verify:**
  - `pnpm example`
  - `pnpm exec tsc -p examples/http-advanced/tsconfig.json --noEmit`. This
    example is in no gate; the baseline compiled clean at HEAD.
- **Done when:** both compile and gate 15 passes.

### T8 — Spec: behaviors, invariant, ADR, traceability, overview (gate 13)
- **Status:** [x] done
- **Depends on:** T2–T7 (content), D-04-a…e
- **Files:**
  - `spec/behaviors/07-enforcement.md`
  - `spec/behaviors/23-http.md`
  - `spec/behaviors/26-decision-stream.md`
  - `spec/behaviors/index.yaml`
  - `spec/invariants.md`
  - `spec/decisions/ADR-QD-NEXT-*.md` *(new)*
  - `spec/decisions/072-schema-taggederror-for-accessdenied-and-undischargedobligation.md`
  - `spec/decisions/075-clienterror-typing-for-requirepermission.md` (Implemented note only)
  - `spec/decisions/index.yaml`
  - `spec/traceability.md`
  - `spec/overview.md`
  - `spec/README.md` (CCR row)
- **Steps:**
  1. **07-enforcement.md: new BEH-QD-NEXT**, "Every enforcement failure has
     exactly one class". It gets a ` ```ts ` listing of `EnforcementErrorClass`,
     `ENFORCEMENT_ERROR_CLASSES`, `classifyEnforcementError`,
     `ENFORCEMENT_ERROR_TAGS` and `ENFORCEMENT_DENIAL_TAGS`, plus the 3-row
     class table and this REQUIREMENT: "`ENFORCEMENT_ERROR_CLASSES` MUST be total
     over `EnforcementError`; every adapter that reports an enforcement failure
     MUST derive its classification from `classifyEnforcementError`." Optionally
     add one ` ```typescript ` example that compiles under gate 9
     (`node scripts/check-doc-examples.mjs`).
  2. **23-http.md, BEH-QD-177:**
     - Update the ` ```ts ` block (`:114-117`): `ENFORCEMENT_ERROR_TAGS` now comes
       from core; add `HTTP_STATUS_BY_CLASS` and `ENFORCEMENT_ERROR_WIRE`.
     - Add a REQUIREMENT: "Both adapters MUST derive a tag's status as
       `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`; an HttpApi
       schema's `httpApiStatus` MUST equal `toResponse`'s status for the same
       tag."
     - Record E6 (the shared mapping was true only by coincidence) as the
       motivation.
  3. **23-http.md, BEH-QD-260 (S2):**
     - "MUST stay empty" becomes "MUST carry only `_tag`" for
       `UndischargedObligation`/`SubjectExtractionFailed`.
     - "hand-converts … before the failure reaches the declared schemas" becomes
       "projects each failure through `ENFORCEMENT_ERROR_WIRE[tag].project`, and
       `HttpApiMiddleware`'s encoder answers".
     - Keep the `Schema.Void` finding verbatim.
     - Bump the Change History (1.5).
  4. **23-http.md, BEH-QD-263:** the comment in the ` ```ts ` block at `:241`
     reads "derived from `ENFORCEMENT_ERROR_WIRE`".
  5. **26-decision-stream.md:93 (S1):** fix `reauthCheck`'s signature to
     `Effect<void, EnforcementErrorClass | "extraction-failed", StandingEvaluationServices | SubjectExtractor>`.
  6. **invariants.md: new INV-QD-NEXT**, "An enforcement failure is reported
     with the same meaning on every route". The Source is the two tables plus
     `wire`'s derived status. Enforcement is T1's differential test plus the two
     `*.tst.ts` files. Link INV-QD-006.
  7. **New ADR-QD-NEXT**, "Enforcement-error classes live in core; HTTP
     description is one derived table". Context: §1.2 table, E5, E6, E7.
     Decision: D-04-a…e as decided. Alternatives: the options rejected in §5.
     Consequences: the ADR-QD-076 static-mutant trade-off (R3), and a breaking
     changeset.
  8. **ADR-QD-072 amendment** (revision 1.1):
     - In the Decision paragraph, "hand-converts these three to an empty-body
       response" becomes "projects all twelve in-channel to their redacted wire
       type".
     - Under Negative Consequences, the mitigation becomes the typed `project`
       per tag, not a hand-catch.
     - Note S2's prior staleness.
  9. **traceability.md:**
     - §1 row 07 gains BEH-QD-NEXT and `Errors.ts`.
     - Row 23 is unchanged except the source list.
     - Row 26 notes the signature fix.
     - §2 gains INV-QD-NEXT (with the tests).
     - §3 gains ADR-QD-NEXT.
     - §4 gains `packages/core/test/Errors.test.ts`, `packages/core/test/Errors.tst.ts`,
       `packages/http/test/QadiHttpError.tst.ts` and the fixture's host test.
     - Bump the revision.
  10. **overview.md (gate 13, `node scripts/check-api-surface.mjs`):**
      - Core table: `EnforceOptions, EnforcementError, ObligationHandler`'s Source
        cell (`:164`) becomes "`Qadi.ts`; `EnforcementError` is declared in
        `Errors.ts`" (or split the row).
      - Add rows for `EnforcementErrorClass`, `EnforcementErrorClassTable`,
        `ENFORCEMENT_ERROR_CLASSES`, `classifyEnforcementError`,
        `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS`,
        `EnforcementErrorTagOf`, `EnforcementDenial` (`Errors.ts`) and
        `StandingEvaluationServices` (`Evaluate.ts`).
      - `@qadi/http` table: remove `ENFORCEMENT_ERROR_TAGS`, `DENIAL_STATUS`,
        `EnforcementErrorClass` and `classifyEnforcementError` (`:447-448`).
      - Add `HTTP_STATUS_BY_CLASS`, `HttpEnforcementFailure`,
        `HttpEnforcementTag`, `EnforcementErrorWire`, `EnforcementErrorWireTable`,
        `ENFORCEMENT_ERROR_WIRE`, `projectHttpEnforcementFailure`,
        `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS` and
        `logSubjectExtractionFailed`.
      - Reword the `*Response`/`*Refused` rows (`:451-453`) as "views onto
        `ENFORCEMENT_ERROR_WIRE`" and fix S2/S3 in them.
      - Add a Change History entry.
  11. **spec/README.md:** add a `CCR-QD-NEXT` row.
      `spec/decisions/index.yaml` gets the ADR entry, and
      `spec/behaviors/index.yaml` gets the new BEH if indexed there.
- **Tests:** gates 9–13.
- **Verify:**
  - `pnpm spec:examples`
  - `pnpm spec:verify:strict`
  - `pnpm spec:gates`
  - `pnpm spec:claims`
  - `pnpm spec:api`
- **Done when:** all five pass, and `rg -n 'stay empty|empty-body response' spec/behaviors/23-http.md`
  returns nothing outside the preserved history blockquotes.

### T9 — Docs and changeset
- **Status:** [x] done
- **Depends on:** T4, T5, T8
- **Files:**
  - `apps/website/src/content/docs/docs/packages/http.md`
  - `apps/website/src/content/docs/docs/concepts/enforcement.md` (check `:109`)
  - `packages/http/README.md`
  - `.changeset/<name>.md` *(new)*
- **Steps:**
  1. Website "Status mapping" (`http.md:96-115`):
     - Show the class table and `HTTP_STATUS_BY_CLASS` as the single source.
     - `ENFORCEMENT_ERROR_TAGS` is imported from `@qadi/core`.
     - Correct S4: the bare route is bodyless, while `RequirePermission` answers
       a redacted, `_tag`-carrying body.
     - Keep any ` ```typescript ` fence compiling under gate 22
       (`node scripts/check-website-doc-examples.mjs`).
  2. `packages/http/README.md:33-37`: the same S4 correction.
  3. Changeset: `"@qadi/core": minor` and `"@qadi/http": minor`, with the fixed
     group bumping the rest. State **breaking** for `@qadi/http`: the moved
     `ENFORCEMENT_ERROR_TAGS`/`classifyEnforcementError`/`EnforcementErrorClass`
     and the removed `DENIAL_STATUS`. List the new core exports, and state that
     HTTP bodies and statuses are unchanged.
- **Tests:** gates 22–23.
- **Verify:**
  - `pnpm spec:website-examples`
  - `pnpm website`
- **Done when:** both pass and no doc claims "every response body is empty"
  without the bare-route qualifier.

### T10 — Verification drills, mutation, full gate
- **Status:** [x] done
- **Depends on:** T1–T9
- **Files:** none in the repo. The drills run in a scratch worktree or copy.
- **Steps:**
  1. **Compile-forcing drill (criterion 8).** In a scratch copy, add
     `export class HypotheticalNewError extends Data.TaggedError("HypotheticalNewError")<{}> {}`
     and include it in `EvaluationError`. Run `pnpm typecheck` and record every
     error site. Expected:
     - `ERROR_CODES` (`satisfies`), `EVALUATION_ERROR_TAGS_BY_TAG`, `SinkCodec`'s
       `toWire` and `SinkCodec.test.ts`'s factory;
     - `ENFORCEMENT_ERROR_CLASSES` (`satisfies`) and `ENFORCEMENT_ERROR_TAGS`
       (`CoversExactly`);
     - in `@qadi/http`, **only** `ENFORCEMENT_ERROR_WIRE` (`satisfies`), plus the
       T1 fixture.

     There must be **no** silent site: `toResponse`, `RequirePermission`'s list
     and the stream label all derive. Record the list in §10.
  2. **Status-drift drill (criterion 6).** In a scratch copy, edit one
     `ENFORCEMENT_ERROR_CLASSES` entry. `Errors.test.ts` and the differential
     test must fail.
  3. **Mutation.**
     - Run `pnpm exec stryker run stryker.http.mjs` and `pnpm exec stryker run`
       (core). Both must stay at or above 80% (gates 16 and 21).
     - Inspect survivors in `QadiHttpError.ts`, `RequirePermission.ts` and
       `Errors.ts`.
     - If ADR-QD-076 has landed, note how many static mutants it now skips in
       the two tables. That is the coverage the unit and type tests replace.
       If useful, temporarily set `ignoreStatic: false` locally and confirm the
       table literals are killed.
  4. Run `pnpm check` in full.
- **Verify:**
  - `pnpm check`
- **Done when:** `pnpm check` is green and the drill outputs are recorded in §10.

## 7. Test strategy

- **Survive unchanged (the behavior contract):**
  - `packages/http/test/http.test.ts` (all assertions; only the
    `ENFORCEMENT_ERROR_TAGS` import moves);
  - `RequirePermissionClient.test.ts`, `decisionStream.test.ts` and
    `v4-http-smoke.test.ts`;
  - `GuardRoute.tst.ts`;
  - `packages/core/test/SinkCodec.test.ts`, `Tokens.test.ts` (`ERROR_CODES`) and
    `Ports.test.ts`;
  - the react and promise suites.

  E5 and P3 show these assertions pass against the new design in a scratch copy.
- **Move to the new interface:**
  - `QadiHttpError.test.ts`'s `toResponse` table: keep it as the independent,
    hand-literal pin of BEH-QD-177, re-pointed at the shared fixture for instance
    construction;
  - the four redaction tests: fold them into the table-driven "every wire schema
    encodes only its declared fields" test across all twelve tags. The four
    single-tag tests are then **deleted as redundant** (replace, don't layer),
    keeping their assertions as rows.
- **New:**
  - `packages/core/test/Errors.test.ts` (table pins);
  - `packages/core/test/Errors.tst.ts` and `packages/http/test/QadiHttpError.tst.ts`
    (completeness, including the required `HypotheticalNewError` tests);
  - the differential test (two routing shapes, one status), which is the
    property that kills E6;
  - `RequirePermission.tst.ts`'s exact-tag assertion.
- **Property / differential:** the differential test is exhaustive over a closed
  12-element domain, so a property generator adds nothing. The fixture's mapped
  type makes the domain compile-forced.
- **Mutation (Stryker):**
  - `stryker.config.mjs` (core) and `stryker.http.mjs` (gates 16 and 21) must
    stay at or above 80%.
  - Today `QadiHttpError.ts` kills 47/47 and `RequirePermission.ts` has 7
    survivors, two of them the redundant arms E5 explains. Deleting those arms
    removes the two survivors. Under ADR-QD-076 the tables' literals become
    ignored static mutants. That is acceptable only because every entry is
    pinned by the unit tests above and both completeness directions by tstyche.
    T10.3 records the numbers.

## 8. Spec and documentation updates

- **Behaviors:**
  - `07-enforcement.md`: new BEH-QD-NEXT (class table).
  - `23-http.md`: BEH-QD-177 gets a derived-status requirement; BEH-QD-260's S2
    correction and projection wording; BEH-QD-263's comment.
  - `26-decision-stream.md`: the S1 signature fix.
- **Invariants:** new INV-QD-NEXT (same meaning on every route), linked to
  INV-QD-006.
- **ADRs:** new ADR-QD-NEXT (D-04-a…e); **amend ADR-QD-072** (rev 1.1); a note in
  ADR-QD-075's "Implemented" (the list is now derived). ADR-QD-008 is cited, not
  amended: the class table is its pattern applied a second time.
- **Traceability matrix:** §1 rows 07/23/26, §2 INV-QD-NEXT, §3 ADR-QD-NEXT, §4
  three new test files.
- **`spec/overview.md` (gate 13):**
  - Added in core: `EnforcementErrorClass`, `EnforcementErrorClassTable`,
    `ENFORCEMENT_ERROR_CLASSES`, `classifyEnforcementError`,
    `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS`,
    `EnforcementErrorTagOf`, `EnforcementDenial`, `StandingEvaluationServices`.
  - Moved: `EnforcementError` (Source cell).
  - Removed from http: `ENFORCEMENT_ERROR_TAGS`, `DENIAL_STATUS`,
    `EnforcementErrorClass`, `classifyEnforcementError`.
  - Added in http: `HTTP_STATUS_BY_CLASS`, `HttpEnforcementFailure`,
    `HttpEnforcementTag`, `EnforcementErrorWire`, `EnforcementErrorWireTable`,
    `ENFORCEMENT_ERROR_WIRE`, `projectHttpEnforcementFailure`,
    `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS`,
    `logSubjectExtractionFailed`.
  - Reworded: the `*Response`/`*Refused` rows, and `subjectExtractionFailedResponse`'s
    row.
- **CCR:** a `CCR-QD-NEXT` row in `spec/README.md`.
- **Changeset:** minor, breaking for `@qadi/http` (D-04-d).
- **Docs:** the website `packages/http.md` status section and
  `packages/http/README.md` (S4).
- **AGENTS.md:** no edit required. §4's twelve-class table, §8's `…Refused` row
  and the budgets are unchanged. T8 re-reads §4 and §8 to confirm the wording
  still holds, in particular "`SubjectExtractionRefused` … hand-written … mirror",
  which is still true inside the table.

## 9. Risks and rollback

| # | Risk | How it shows up | Mitigation / rollback |
| - | ---- | --------------- | --------------------- |
| R1 | The correlated-record projection does not type-check in the final shape. P1 was tag-keyed; T4 keys the table type by the error union. | TS2322 at `projections` or `projectAt` | Fall back to P1's tag-keyed `EnforcementErrorWireTable<Tag extends string>` exactly as spiked. The type-level test then uses `HttpEnforcementTag | "HypotheticalNewError"` (P4's shape). Never add `as`. |
| R2 | A projection or encoder mismatch leaks a field (for example a future schema with `onExcessProperty: "preserve"`). | T1's "encodes only its declared fields" test fails | Projections are explicit field picks, typed to the schema's `Type`. The encoder test is the second line. Roll back T5 to the hand arms (option D-04-c(a)) without touching T2–T4. |
| R3 | Mutation coverage drops when logic moves from `Match` closures to module-scope tables, which ADR-QD-076's `ignoreStatic` skips. | Fewer mutants reported in `Errors.ts`/`QadiHttpError.ts`, or a score shift in gates 16/21 | Every entry is pinned by hand-written expected maps (T2.4, T1) and both completeness directions by tstyche. T10.3 runs once with `ignoreStatic: false` locally to confirm the literals die. |
| R4 | OpenAPI document ordering changes, because `Record.values` order differs from the hand list. | A snapshot consumer (none in-repo) diffs | The statuses set test (`http.test.ts:672-678`) is unaffected. Note it in the changeset. |
| R5 | The `HTTP_ENFORCEMENT_TAGS` spread loses tuple-ness, and `catchTag`'s array form rejects it. | TS error at `catchTag` | Declare a literal 12-tuple with `CoversExactly`. That means exporting `CoversExactly` from a non-barrel internal module, or duplicating the 3-line type in http with a doc pointer. |
| R6 | Breaking import moves hit downstream users of `@qadi/http`. | Their compile errors | A minor changeset marked breaking, with migration lines (D-04-d). If rejected, D-04-d(b) shims are a pure addition on top. |
| R7 | Concurrent work: this branch carries uncommitted ADR-QD-076 edits to `stryker*.mjs`, `spec/traceability.md` and `spec/decisions/index.yaml`. | Merge conflicts in `traceability.md`/`index.yaml` | Land ARCH-04 after ADR-QD-076 is committed. Use the `-NEXT` placeholders until merge. |

**Rollback.** T2/T3 are additive in core, apart from the `EnforcementError` move.
T4/T5 are confined to `@qadi/http`. Reverting T4+T5 restores the five-place
taxonomy with no core change needed. HTTP bodies and statuses are unchanged
throughout (criterion 7), so no consumer-observable rollback is required.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-04 | — | Plan written. Evidence re-verified at `1caf04c`. Scratch experiments E5, E6 and E7 run, along with spikes P1–P4, all outside the repo. Five decisions are open. | Claude (plan agent) |
| 2026-10-04 | decisions | D-04-a..e taken at the plan-recommended options (user had not decided): Option 2, `StandingEvaluationServices`, in-channel projection, no re-export shims, `SubjectExtractionFailed` as a table row. Each recorded `decided (2026-10-04, recommended default)` in §5. | Claude (implementation agent) |
| 2026-10-04 | setup | Worktree branch `worktree-agent-a2280e0099273f00e` merged with ARCH-01 (`worktree-agent-a3b97e26f18ad377b`) and ARCH-07 (`worktree-agent-a27b027832b9075cf`); spec conflicts resolved keeping both sides. Both prior branches claim CCR-QD-153; this change uses ADR-QD-081, INV-QD-060, BEH-QD-270, CCR-QD-155 (provisional, renumber at merge). | Claude (implementation agent) |
| 2026-10-04 | T1 | Fixture `everyHttpEnforcementFailure`, differential status test, per-tag encode/redaction tests. E6 drill (flip `PolicyTooDeepResponse` to outage) now fails the differential test. | Claude (implementation agent) |
| 2026-10-04 | T2 | `EnforcementError` moved to `Errors.ts`; `ENFORCEMENT_ERROR_CLASSES`, `classifyEnforcementError`, tag tuples, `Errors.test.ts`, `Errors.tst.ts`. | Claude (implementation agent) |
| 2026-10-04 | T3 | `StandingEvaluationServices` added to `Evaluate.ts` (one alias, confined edit) and adopted in core, react, promise. | Claude (implementation agent) |
| 2026-10-04 | T4-T6 | `ENFORCEMENT_ERROR_WIRE`, `wire`, `projectHttpEnforcementFailure` (no `as`, correlated record compiled first time); `RequirePermissionLive` is one projection; `DecisionStreamRoute` on core imports. All 67 pre-existing http assertions pass unedited. | Claude (implementation agent) |
| 2026-10-04 | T7 | Next.js action classifies by `classifyEnforcementError`; `http-advanced` imports tags from core and compiles (`tsc -p examples/http-advanced/tsconfig.json`); `pnpm example` 26 e2e passed. | Claude (implementation agent) |
| 2026-10-04 | T8-T9 | BEH-QD-270, INV-QD-060, ADR-QD-081, ADR-QD-072 rev 1.1, BEH-QD-177/260/263 and 26 corrected, traceability, overview, README CCR-QD-155, website/README docs, changeset. `spec:examples`, `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:api`, `spec:package`, `spec:website-examples`, `website` all pass. | Claude (implementation agent) |
| 2026-10-04 | T10 | Drills and mutation recorded below. `pnpm check` was not run end to end (see report); its stages were run individually. | Claude (implementation agent) |

### Drill and mutation records (T10)

- **Compile-forcing drill.** Adding `HypotheticalNewError` to `EvaluationError` fails `tsc` at: `ERROR_CODES` (`satisfies`), `ENFORCEMENT_ERROR_CLASSES` (`satisfies`), `ENFORCEMENT_ERROR_TAGS` (`CoversExactly`, TS2322), `EVALUATION_ERROR_TAGS_BY_TAG` (`Evaluate.ts:156`), `SinkCodec.ts` `toWire`; in `@qadi/http`, `HTTP_ENFORCEMENT_CLASSES` and `ENFORCEMENT_ERROR_WIRE` (two `satisfies` sites, the second table being derived from the first), plus follow-on errors in the same file and in `RequirePermission.ts` caused by the unsatisfied derived types (cannot index by the new tag; `error:` list). No silent site: `toResponse`, the middleware list and the stream label all error or derive. Deviation from criterion 8: http reports two sites rather than exactly one, because the local class extension is itself a `satisfies`-checked table; both are in `QadiHttpError.ts`, and the T1 fixture was not reached because core stopped first in the same `tsc -b`.
- **Status-drift drill.** `PolicyTooDeep: "outage"` in `ENFORCEMENT_ERROR_CLASSES` fails 4 tests: `Errors.test.ts` (table pin, classify), `QadiHttpError.test.ts` (BEH-QD-177 literal table, wire entry). The differential test alone passes in that case, by design (both sides derive); the hand-written expectations are what catch it.
- **Mutation.** `stryker.http.mjs`: 95.27% (QadiHttpError.ts 83.33% before the extra projection test; RequirePermission.ts 100%, down from 7 survivors). Core: 93.37% overall; `Errors.ts` has 1 mutant, 100% (the module-scope tables are static and skipped by `ignoreStatic`, ADR-QD-076; their entries are pinned by `Errors.test.ts`/`QadiHttpError.test.ts` and both completeness directions by tstyche). `ignoreStatic: false` was not run.
