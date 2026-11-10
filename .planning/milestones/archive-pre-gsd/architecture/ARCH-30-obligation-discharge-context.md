---
id: ARCH-30
title: Discharge an obligation against the question it answered — the handler receives the decided question, the obligation record names who and what, and a captured signature lands where hasSignature reads it
strength: Strong          # from the 2026-10-07 architecture review (wave 4), card c1, the review's top recommendation
status: done
evidence_verified_at: e635e68
depends_on: []
blocks: []                # soft ordering only (§9): ARCH-32 and ARCH-39 edit what T2 moves; land T2 first or rebase onto it
adrs_touched:
  - ADR-QD-019 (amend: "callers who want to discharge obligations pass a handler" gains what the handler is told — the question the allow answered and the allow itself; the handler shape itself was only ever written in BEH-QD-085, never in the ADR)
  - ADR-QD-057 (amend: `SignatureCaptureRequest` gains the question's key — `evaluationId`, `resourceId`, `action`, `resource`; `signatureObligationHandler`'s signature changes and its `R` loses `CurrentSubject`; the signer is the decided subject, not the ambient one)
  - ADR-QD-058 (amend, one paragraph: "typically `@qadi/audit`'s capture flow through `ObligationHandler`" becomes true for a default-scope `hasSignature`; the ledger is the documented way to make it so)
  - ADR-QD-096 (amend, one paragraph: the `Obligations` envelope gains three optional keys under version 2, the ADR's own "additive, optional envelope metadata needs no version" rule; no wire version 3)
  - ADR-QD-100 (constraint: a question is built once — so discharge receives the lifecycle's `Question`, never a second `questionOf` call)
  - ADR-QD-011 (constraint: enforcement is an aspect; discharge still precedes the guarded effect)
  - ADR-QD-016 / BEH-QD-255 (constraint: no default `SignatureCapturePort`, not even a no-op; the ledger is a store, not a capture, and its in-memory form is a `…Test` like `AuditTrailPortTest`)
  - ADR-QD-037 (constraint: madge counts type-only edges — `Lifecycle.ts` must not import `Evaluate.ts`)
  - ADR-QD-044 / INV-QD-035 (constraint: the obligation record is still emitted through `sinkEmitter`, and still cannot change the outcome)
  - ADR-QD-051 (constraint: no new span; `qadi.evaluate` stays the root and keeps its name when the lifecycle moves)
  - ADR-QD-038 (constraint: changesets only, fixed version group; no release step)
  - ADR-QD-NEXT (new, recommended by D-30-h: "An obligation is discharged against the question it answered")
packages: ["@qadi/core", "@qadi/audit", "@qadi/devtools", "features", "spec", "apps/website"]
estimate: L   # ≈ 4–5 days for T0–T11. Defect-only path (T1 + T3a + T4, D-30-a = A) ≈ 1 day (S/M)
---

# ARCH-30 — Discharge an obligation against the question it answered

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68` (`git log --oneline -1`). Every file the review cites is unchanged since
ARCH-16 landed: `git log --oneline -3 -- packages/core/src/Qadi.ts packages/core/src/DecisionRecord.ts packages/audit/src/SignatureCapturePort.ts`
shows nothing newer than `e635e68`'s wave-3 commit.

**Probes** (all in `scratchpad/wave4/ARCH-30/`, never in the repo). They need the workspace's `effect` and
`@qadi/core`, so the scratch directory gets a symlink to `@qadi/audit`'s `node_modules`, and `@qadi/audit`
itself is imported by absolute path:

```sh
P=<scratchpad>/wave4/ARCH-30
ln -sfn <repo>/packages/audit/node_modules "$P/node_modules"
cd "$P" && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe-loop.mts
cd "$P" && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe-retry.mts
cd "$P" && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe-website.mts
cd "$P" && NODE_OPTIONS="--conditions=bun" <repo>/node_modules/.bin/tsx probe-website2.mts
```

- `probe-loop.mts` is the end-to-end loop. A capture port persists every signature into a store
  using the most its request lets it know. A `SignatureHistory` layer reads that same store. Then
  `guard(approve, obliged(obligation("sig.approve"), hasPermission(approve)), { onObligations: signatureObligationHandler(port, "approved") })({ id: "doc-1" }, …)`
  runs, followed by `decide(hasSignature("approved"), { resource: { id: "doc-1" } })`. Output:
  ```
  guard result: approved
  capture request keys: [ [ 'meaning', 'obligationIds', 'signerId' ] ]
  store rows: [ { subjectId: 'alice', resourceId: undefined } ]
  hasSignature('approved') default scope: Deny no signatures are on file for subject 'alice'
  hasSignature('approved', { scope: 'Any' }): Allow
  ```
- `probe-retry.mts` runs `assert(obliged(obligation("notify"), …), { onObligations })` under
  `Effect.retry({ times: 1 })`, with a handler that fails once. Output: the handler is called with **one**
  argument on each attempt (`[1, 1]`). The two `ObligationRecord`s carry **different** `evaluationId`s
  (`499c10e5…` `HandlerFailed`, `26af96da…` `Discharged`), and each has exactly the keys
  `_tag, at, evaluationId, obligationIds, outcome`.
- `probe-website.mts` / `probe-website2.mts` run the website's `concepts/signatures.md` example as written
  (C15).

| # | Claim (review card c1) | Verdict | At `e635e68` |
| - | ---------------------- | ------- | ------------ |
| C1 | `Qadi.ts:66-125`: `ObligationHandler` is `(obligations: ReadonlyArray<Obligation>) => Effect`, and `discharge` passes only `decision.obligations` | **CONFIRMED** (lines refined) | The interface is at `Qadi.ts:66-68`, `EnforceOptions.onObligations` at `:70-76`, and `discharge` at `:78-123`. The single invocation is `handler(decision.obligations)` at `:98`. `discharge` holds the whole `Allow` (`decision: Allow`, `:79`) and passes one field of it. The `Question` that `evaluate` built (`Evaluate.ts:254`, `questionOf(subject, policy, options)`) never leaves `evaluate`, which returns only the `Decision` (`:352`). `permitted` (`Qadi.ts:143-160`) and `decideOne` (`:326-341`) are the only two callers of `discharge`. `probe-retry.mts` confirms that one argument arrives. |
| C2 | Qadi.ts's doc says the missing context is "tracked separately", and nothing tracks it | **CONFIRMED** | `Qadi.ts:45-57`: "passing `{ evaluationId, subjectId, resource }` through this callback … is a real gap, tracked separately as an API-shape change rather than made here." Searched `spec/roadmap.md`, `spec/decisions/*`, `spec/README.md` (CCR register), `.planning/` and the repo (`grep -rn "API-shape change"` finds only `Qadi.ts:57`), plus GitHub (`gh issue list --state all --search "obligation handler"` returns #15/#79/#10/#68, all closed, none about the handler's arguments; `gh issue list --state open` is empty). The sentence was added by `be76b5b` (#132, "Resolve the 2026-09-19 100-lens audit findings"), which documented the gap instead of fixing it. |
| C3 | `ObligationRecord` carries only `evaluationId/at/outcome/obligationIds` | **CONFIRMED** | `DecisionRecord.ts:134-140`. Wire: `SinkCodec.ts:150-157` (`obligationsV2Fields`), projection `:197-204`, rebuild `:244-250`. The golden is `test/fixtures/sinkWireV2.ts:34-35`. The record's own doc (`DecisionRecord.ts:119-124`) blames the handler contract for its limits. Consequence found during verification: a devtools **orphan** (an obligation row whose decision never arrived, `devtools/src/model/Timeline.ts:45-58`) can say only "something was refused" (`Inspector.tsx:111-120`), and its filter haystack (`Filters.ts:109-113`) has no subject, action or resource to search. |
| C4 | `SignatureCapturePort.ts:166-181`: `signatureObligationHandler` reads ambient `CurrentSubject` for `signerId` | **CONFIRMED** | `:174` `const subject = yield* CurrentSubject;`, `:177` `signerId: subject.id`. Its own doc (`:143-153`) warns that this is "asserted, not verified" and wrong for a service account or a review flow. ADR-QD-057 wrote the resulting type down: `… => Effect.Effect<void, SignatureCaptureError, CurrentSubject>` (`057-…md:79-83`). |
| C5 | `SignatureCaptureRequest` has no `resourceId` | **CONFIRMED** | `:59-64`: `{ meaning, signerId, signerRole?, obligationIds }`. `probe-loop.mts` prints exactly `['meaning','obligationIds','signerId']`. A `capture` implementation has `R = never` (`:102-104`), so it cannot read the resource from context either. Nothing it is given identifies the resource. |
| C6 | The `Signature` returned by `capture` is discarded | **CONFIRMED** | `:175` `yield* port.capture({...})`: the value is unused, and the handler returns `void`. |
| C7 | `validate` has no callers outside tests | **CONFIRMED, not a defect** | The only callers are the static accessor (`:121-122`) and `SignatureCapturePort.test.ts:138,158`. This is by design: `:105-108` says "a caller reviewing an archived signature later needs to re-validate it without ever calling `capture` again". ADR-QD-058 keeps `hasSignature` trust-on-presence, so nothing in the evaluation path should call it. This plan leaves `validate` alone (§3). |
| C8 | `hasSignature` defaults to `scope: "Resource"`, and `SignatureHistory` is queried by `(subjectId, resourceId)` | **CONFIRMED** | `Policy.ts:752-761` (`scope: options?.scope ?? "Resource"` at `:758`). `Walk.ts:263` passes `resource?.["id"]`. `PortAccess.ts:424-454` (`askSignature`): a scoped read needs a string id or fails with `MissingResourceId` (`:440-442`, `requireResourceId` `:216-224`), then queries `{ subjectId, resourceId }` (`:444`). The fixture store keys by `JSON.stringify([subjectId, resourceId ?? null])` (`SignatureHistory.ts:153, 215, 235`). A resource-scoped query sees only rows stored with that resource, and a subject-global query sees only rows stored with none (`:194-200`). |
| C9 | **DEFECT**: obligation → capture → `SignatureHistory` → `hasSignature` cannot satisfy a default-scope policy | **CONFIRMED (probe)** | `probe-loop.mts`: the captured row is stored with `resourceId: undefined`, so `hasSignature("approved")` on `doc-1` **denies** with "no signatures are on file for subject 'alice'". The same row **allows** `scope: "Any"`. So the loop does not merely fail: it silently produces **subject-global** signatures that satisfy a policy written for *any* resource. That is wider than the signer attested, because the signing act was about `doc-1`. ADR-QD-058 names this loop as the expected way the port gets populated: "whoever populates the port's data already validated the signature (typically `@qadi/audit`'s capture flow through `ObligationHandler`)" (`058-…md:113-115`). The website's concept diagram says it too (C15). **Test-first: T1.** |
| C10 | No existing test covers the loop | **CONFIRMED** | `grep -rln hasSignature packages/*/test features` lists only core test files fed by fixtures (`signatureHistoryFromSignatures`). `grep -rln signatureObligationHandler packages/*/test features examples` lists only `audit/test/SignatureCapturePort.test.ts`, which never evaluates a `hasSignature`. No `features/features/*` file mentions signatures. |
| C11 | Idempotency keys for retries (PH-01) have nothing to derive from | **CONFIRMED** that the handler gets nothing. **REFUTED in part**: the review says "retry idempotency keys get a source" | PH-01 is a finding id from the 2026-09-19 100-lens audit. In the repo it survives only as the citation at `Qadi.ts:49` and in the untracked `.reports/data.js`. `probe-retry.mts` shows that **`evaluationId` changes on every retry**, because `evaluate` mints a fresh id per call (`Evaluate.ts:230-231`). So passing the evaluation id gives a handler a per-*attempt* key, not a per-*request* key. The question (subject, resource, action, obligations) is stable across retries, but it is also shared by two legitimately distinct requests (two approvals of one document). A library-derived key would merge them and silently drop a real duty. The honest source of a per-request key is the caller's own request id, which the per-call `onObligations` closure can already capture. The plan therefore hands the handler the facts and documents the recipe. It does **not** mint a key (D-30-g). |
| C12 | ADRs: ADR-QD-019 is the handler shape, and ADR-QD-057/058 cover signature harmonization and trust-on-presence | **CHANGED** | ADR-QD-019 never states the handler type. It says only "Callers who want to discharge obligations pass a handler" (`019-…md:112-114`). The shape lives in BEH-QD-085's `ts` fence (`spec/behaviors/11-obligations.md:132-139`). ADR-QD-057 states the handler signature with `CurrentSubject` in `R` (C4). ADR-QD-058 states the loop as the expected path (C9). All three are amended here (D-30-h). |
| C13 | "Two adapters exist, so the seam is real" | **CONFIRMED** | The in-repo handler implementations are `signatureObligationHandler` (audit), `features/step-definitions/Bridge.ts:109-110`, the BEH-QD-087 compiled fence, the website `concepts/obligations.md` fence (`auditLog`), and 14 test handlers (C18). |
| C14 | *(found during verification)* A captured signature's signer is the **ambient** subject, not the subject the decision was about | **CONFIRMED (read)** | Inside `permitted` the two are the same value today (`evaluate` reads `CurrentSubject` at `Evaluate.ts:227`). But the handler's `R` re-requires `CurrentSubject` (`:174`), so a handler run under a different provision would sign as someone else, and its doc (`:143-153`) concedes this. Taking the signer from `discharge.question.subject.id` makes "the signer is the subject the allow was about" a property of the value (T4). |
| C15 | *(found during verification)* The website's signatures concept example does not do what it says | **CONFIRMED (probe), doc defect** | `apps/website/src/content/docs/docs/concepts/signatures.md`: the fenced example ends `// → runs: u1 has an "approved" signature on file.`. `probe-website.mts` (as written) prints `Failure AccessDenied`: `fromRoles({ id: "u1", roles: [] })` holds no `doc:publish`. `probe-website2.mts` grants the permission and prints `Failure MissingResourceId`: default-scope `hasSignature` with no resource. The fence compiles (gate `check-website-doc-examples.mjs`) but is never run. The page's diagram `aria-label` says "SignatureCapturePort … writes a Signature record into the SignatureHistory port at enforcement time", and C6 shows nothing writes anything. Rewritten in T9 as the working loop. |
| C16 | *(found during verification)* `@qadi/http` cannot discharge an obligation at all | **CONFIRMED (read), out of scope** | `authorizeRequest` calls `guard(permission, policy)(resource, …)` with no options (`AuthorizeRequest.ts:89`). `guardRoute` and `RequirePermission` both route through it (`RequirePermission.ts:402-407`). So a binding obligation on any HTTP-guarded route always answers 403 `UndischargedObligation`. `@qadi/promise` documents its equivalent gap (`promise/src/index.ts:58-66`, README `:55-69`). `@qadi/http`'s README and BEH 23 do not. This is an orphan finding (§3, D-30-j). |

**C18 — every caller of the handler interface** (`grep -rn "onObligations\|ObligationHandler\|signatureObligationHandler"` over
`packages examples features apps/website/src spec`, excluding `node_modules`, `lib`, CHANGELOGs):

| Where | Role | Migrated in |
| ----- | ---- | ----------- |
| `core/src/Qadi.ts:78-123` `discharge` | the only **invoker** | T3 |
| `core/src/Qadi.ts:143-160` `permitted` → `assert`, `enforce`, `enforceProjected`, `guard` | passes `options?.onObligations` | T3 |
| `core/src/Qadi.ts:326-341` `decideOne` → `filter`, `filterStream` | passes `options?.onObligations` per item | T3 |
| `audit/src/SignatureCapturePort.ts:166-181` `signatureObligationHandler` | **implementation** (shipped) | T4, T5 |
| `features/step-definitions/Bridge.ts:109-113` | implementation (acceptance) | T3 |
| `core/test/Qadi.test.ts:417, 527, 543, 561, 577, 597, 634, 665` | 8 test handlers | T3 |
| `core/test/DecisionSink.test.ts:553, 599, 665, 689` | 4 test handlers | T3 |
| `audit/test/SignatureCapturePort.test.ts:64, 88, 91, 110, 185, 209` | direct calls + wired | T4 |
| `core/test/Qadi.tst.ts:42-60` | `EnforceOptions<E,R>` channel tests | T3 (gains a param test) |
| `spec/behaviors/11-obligations.md:132-139` (`ts`), `:241-247` (`typescript`, compiled) | spec | T9 |
| `apps/website/…/concepts/obligations.md:74-90` (`typescript`, compiled) | docs | T9 |
| `apps/website/…/packages/audit/signatures.md:54-77`, `packages/audit/README.md:85-106` | docs | T9 |
| `core/src/DecisionRecord.ts:116-133`, `devtools/src/react/Inspector.tsx:182-188`, `spec/behaviors/25-inspection.md:457-462` (BEH-QD-195), `27-devtools-timeline.md:418` (BEH-QD-209) | prose that says the handler "receives the whole array" | T3, T7, T9 |
| `http/src/AuthorizeRequest.ts:89`, `examples/http-advanced/server.ts:197`, `examples/nextjs-newsroom/src/server/actions.ts:78`, `promise/src/index.ts` (`assert`/`filter`) | **non-callers**: enforce with no handler, so they need no change | — |
| `react`, `testing`, `devtools` (src) | no enforcement entry point | — |

**Other facts the plan relies on.**

- ADR-QD-096's rule for the future: "Additive, optional envelope metadata … needs no version: a reader ignores a
  top-level key it does not declare. Any change to content … or to a required envelope field needs a new version"
  (`096-…md`, "The rule for the future"). The `Obligations` key set is read from the schema (`SinkCodec.ts:174-175`),
  and `envelopeOf` keeps exactly those keys (`:550-553`). So adding optional keys to `obligationsV2Fields` makes
  every reader at this release keep them, while every 0.11 reader drops them silently.
- `EvaluationServices` already includes `CurrentSubject` (`Evaluate.ts:194`), so an `ask` that reads it adds no
  requirement to `permitted`/`decideOne`.
- `Evaluate.ts` is imported by `Qadi.ts`, `SubjectSet.ts`, `GuardHealthCheck.ts` and `EvaluationServicesNone.ts`
  (types). Nothing `Lifecycle.ts` would import (`Walk.ts`, `SinkEmit.ts`, `Question.ts`, `DecisionCache.ts`,
  `DecisionRecord.ts`, `EvaluationId.ts`, `Ports.ts`) imports `Evaluate.ts`, so the move is cycle-free (T2 checks it with `pnpm circular`).
- `AuditTrailPortTest`/`AuditStagingPortTest` are the precedent for a public, deterministic, in-memory `…Test`
  factory returning a handle (`AuditTrailPortTest.ts:19-37`). BEH-QD-255 forbids only a default
  `SignatureCapturePort`.
- `signatureHistoryPort.key` (`SignatureHistory.ts:153`) is exported through the port description, so a ledger can
  group rows by exactly the request key the port reads with.

## 2. Goal and success criteria

**Goal.** The obligation gate is a **seam** with a real **adapter** population (audit's signature handler,
the acceptance bridge, every caller's audit-log handler). Its **interface** today is shallower than the
module behind it. `discharge` holds the whole decided question and hands across one array, so every adapter
rebuilds context from ambient services, and the one shipped adapter cannot rebuild the resource at all. This
plan makes the gate's interface carry what the gate knows: one `ObligationDischarge` value, made of the
lifecycle's own `Question` and the `Allow`, built **once** in the lifecycle (**locality**: ADR-QD-100's "built
once" extends to the discharge). The obligation record carries the question's identity (who, what, which
resource), so an orphan row and an audit row can say what was refused. On the audit side,
`SignatureCaptureRequest` carries the question's key. A `SignatureLedger` records the signature `capture`
returned, keyed exactly as `SignatureHistory` is asked, so obligation → capture → history → `hasSignature`
closes **by construction** for the default scope. **Leverage:** every present and future handler (a webhook,
a purpose record, a step-up) receives the resource and action without ambient plumbing.

**Success criteria.**

1. `pnpm vitest run packages/audit/test/SignatureLoop.test.ts` passes. In it, a `guard` over `{ id: "doc-1" }`
   discharging `signatureObligationHandler(port, "approved", { ledger })`, followed by
   `decide(hasSignature("approved"), { resource: { id: "doc-1" } })` against
   `signatureHistoryFromLedger(ledger)`, is an `Allow`. The same signature does **not** satisfy `doc-2` and
   does **not** satisfy `scope: "Any"`. The test was red first (T1).
2. A handler passed to each of `assert`, `enforce`, `enforceProjected`, `guard`, `filter` and `filterStream`
   receives `discharge.question` equal (`Equal.equals`) to the `Question` the lifecycle cached and recorded,
   and `discharge.decision` is the same `Allow` the caller gets back (where one is returned). This is pinned
   per entry point in `packages/core/test/Qadi.test.ts`.
3. `grep -n "questionOf(" packages/core/src/*.ts` shows exactly one call site, in `Lifecycle.ts`'s `ask` (T2).
   `pnpm circular` is clean.
4. `signatureObligationHandler`'s requirement channel is `never`: tstyche asserts the handler's return type
   `toBe<Effect.Effect<void, SignatureCaptureError | SignatureLedgerError, never>>()` in
   `packages/audit/test/SignatureCapturePort.tst.ts` (*new*), and
   `grep -n CurrentSubject packages/audit/src/SignatureCapturePort.ts` returns nothing.
5. An `ObligationRecord` emitted by `discharge` carries `subjectId`, plus `action` and `resourceId` when the
   question had them. It round-trips through `encodeSinkRecord`/`decodeSinkRecord`. The existing
   `V2_OBLIGATIONS` golden still decodes and re-encodes byte-identically (`pnpm vitest run packages/core/test/SinkCodec.test.ts`).
6. The devtools inspector's orphan panel shows the orphan's subject, action and resource id when present, and a
   filter search for the subject id finds the orphan (`pnpm vitest run packages/devtools/test`).
7. `node scripts/check-api-surface.mjs`, `pnpm spec:examples` (with the rewritten BEH-QD-087 fence) and
   `node scripts/check-website-doc-examples.mjs` pass. The website signatures example is the working loop.
8. `pnpm check` is green, including `stryker.config.mjs` (core) and `stryker.audit.mjs` at or above
   `break: 80` (T10).

## 3. Non-goals

- **An `@qadi/http` obligation handler** (C16, D-30-j). `authorizeRequest`/`guardRoute`/`RequirePermission`
  are ARCH-36's files. This plan adds one documentation sentence to BEH 23 and the http README stating the
  current fact, and records the follow-up.
- **A library-minted idempotency key** (C11, D-30-g). The handler gets the facts. The per-request key belongs
  to the caller.
- **Per-obligation outcomes.** `ObligationOutcome` stays per decision (BEH-QD-195's "honest limit"). This plan
  changes what the handler is *told*, not what it *reports*.
- **Live re-validation in `hasSignature`** (ADR-QD-058 trust-on-presence) and any caller for `validate` (C7).
- **`Allow` carrying its `Question`.** That would change `Decision`, `DecisionWire` and hydration, which is
  ARCH-32's ground (D-30-c option C).
- **The obligation gate's place relative to `enforceProjected`'s projected value** (ARCH-39). T2's `ask` is the
  primitive ARCH-39 can use, but nothing here changes `enforceProjected`'s semantics.
- **`UndischargedObligation` gaining `evaluationId`.** It is a `Schema.TaggedError` inside `SCHEMA_ERROR_BUDGET`
  (ADR-QD-072), and its HTTP wire form is tag-only. That is plausible, but it is a separate change.

## 4. Constraints

- **AGENTS.md §1.** Namespace imports from `effect/*`, `.ts` relative imports, and `import type` for
  `Question`/`Allow` in `Qadi.ts`. Audit imports from `@qadi/core` by name (`import type { ObligationDischarge } from "@qadi/core"`).
- **§2 / §3.** `SignatureLedger` is a `Context.Service` with an exported `SignatureLedgerShape`. The tag id is
  `"qadi/audit/SignatureLedger"`. Its layers (`signatureHistoryFromLedger`) are top-level consts or factories
  beside the service in `SignatureLedger.ts`. `SignatureLedgerTest` gets its own file because it is substantial
  (precedent: `AuditTrailPortTest.ts`).
- **§4.** No new `Schema.TaggedError`, so `SCHEMA_ERROR_BUDGET` is unchanged. `SignatureLedgerError` is a
  `Data.TaggedError` in `@qadi/audit` (ADR-QD-054: the companion owns its errors). The handler's signer/meaning
  mismatch reuses `SignatureCaptureError`. The array form of `catchTag` only.
- **§5.** `discharge` stays `Effect.fn("qadi.discharge")`. `decideQuestion` keeps the span name
  `"qadi.evaluate"` (ADR-QD-051: no new span, the root unchanged). `ask` and `evaluate` become plain functions
  returning an `Effect` (precedent: `decide`, `check`, `walk`), and no `Effect.fnUntraced` is added, so
  `UNTRACED_BUDGET` is unchanged.
- **§5a.** No `switch`. The `SWITCH_BUDGET` file keys (`Walk.ts`, `Matcher.ts`) are unaffected.
- **§6.** No `as`/`!`/`any`. A test reads a request field it may lack through
  `Object.getOwnPropertyDescriptor(…)?.value` (T1), never a cast. `PORT_DOUBLE_BUDGET`: no new test constructs
  `SignatureHistoryUnavailable` by hand. The ledger's read side constructs it in `src`, which is allowed, and
  the T1 interim store needs none. `HAS_CUSTOM_BUDGET`, `ANY_BUDGET` and `DECISION_READ_BUDGET` are untouched.
  `sink-read-once` is unchanged: `discharge` keeps `sinkEmitter`.
- **ADR-QD-100.** `questionOf` is called once per ask. T2 moves the lifecycle so that `discharge` receives
  that value. It never calls `questionOf` again.
- **ADR-QD-037 / `pnpm circular`.** `Lifecycle.ts` imports nothing that imports `Evaluate.ts`. It declares
  its own `LifecycleOptions` rather than importing `EvaluateOptions` (a type-only edge counts).
- **ADR-QD-096.** The three new `Obligations` keys are **optional** envelope keys, appended after
  `obligationIds`, so a record without them encodes byte-identically to `V2_OBLIGATIONS`. No `version: 3`.
- **ADR-QD-099.** `Lifecycle.ts` stays out of the barrel (package-private). `ObligationDischarge`
  (`Qadi.ts`) and `resourceIdOf` (`Resource.ts`) are public because their modules already are.
- **BEH-QD-255.** No default `SignatureCapturePort`. `SignatureLedgerTest` is a store double, named `…Test`.
- **INV-QD-013 / INV-QD-035.** Discharge still precedes the guarded effect, a failing handler still stops it,
  and the obligation record still cannot change the outcome.
- **Gate 13 (`node scripts/check-api-surface.mjs`).** Every new export of `@qadi/core` and `@qadi/audit`
  needs a row in `spec/overview.md`.
- **Coverage / mutation.** Core is held at 95% and audit at 90%. `stryker.config.mjs` and `stryker.audit.mjs`
  run with `ignoreStatic` (ADR-QD-076).
- **Changesets (ADR-QD-038).** `@qadi/core` minor, `@qadi/audit` minor, `@qadi/devtools` patch. Never a release
  step.

## 5. Decisions needed before work starts

### D-30-a — What does a handler receive? (**breaking**, needs sign-off)

- **(A) Additive: `(obligations, discharge: ObligationDischarge)`.** Every existing one-parameter handler still
  type-checks, so this ships as a minor. The cost is that `obligations` and `discharge.decision.obligations`
  are two paths to one array, kept forever. This is the **defect-only path** (T1 + T3a + T4).
- **(B) One value: `(discharge: ObligationDischarge) => Effect<void, E, R>`.** Every handler changes from
  `(obligations) =>` to `({ decision }) =>`, or reads `discharge.decision.obligations`. The handler has one
  argument with one meaning.
- **(C) Ambient: keep the array, and provide a `CurrentDischarge` service around the handler call.** This is the
  ambient lookup the defect came from, and it puts a service in `R` that every handler must remember to read.

**Recommendation: (B).** ADR-QD-019's principle is that "the obligations on a decision are those contributed
by the allow that was actually returned", and (B) makes the allow the one source of them. Source compatibility
alone does not justify (A)'s permanent duplicate. In-repo, 14 test handlers, the Bridge, audit's handler and two
doc fences migrate (C18). `status: decided (2026-10-08, recommended default)`

### D-30-b — What is in `ObligationDischarge`?

- **(A) `{ question: Question; decision: Allow }`.** The question carries subject, policy, resource, action and
  maxDepth. The allow carries evaluationId, obligations, trace and visibleFields. Nothing is restated.
- **(B) (A) plus a top-level `obligations`**, for ergonomics. It duplicates `decision.obligations`.
- **(C) A flattened `{ evaluationId, subject, resource, action, obligations }`.** That is a third shape for facts
  that already have two named types, it loses `policy`/`trace`, and it drifts from `Question`.

**Recommendation: (A)**, as a plain exported `interface` in `Qadi.ts` (constructed only by `discharge`; a test
builds one with `questionOf`). `status: decided (2026-10-08, recommended default)`

### D-30-c — How does `discharge` get the lifecycle's `Question`?

- **(A) The lifecycle is split from its subject read.** A package-private `packages/core/src/Lifecycle.ts`
  holds `decideQuestion(question, options)` (the body that is now `evaluate`'s, with its metrics and its
  `"qadi.evaluate"` span) and `ask(policy, options)`, which reads `CurrentSubject`, builds the question once
  and returns `{ question, decision }`. `evaluate` becomes `Effect.map(ask(…), (a) => a.decision)`.
  `permitted` and `decideOne` call `ask` and pass `{ question, decision }` to `discharge`.
- **(B) `permitted` calls `questionOf(yield* CurrentSubject, policy, options)` a second time.** The value is
  equal today, but nothing makes the two constructions agree, which is the exact defect ADR-QD-100 removed.
- **(C) `Allow` carries its `Question`.** This changes `Decision`, `DecisionWire`, hydration and the record
  wire's `decision`. It is out of scope and belongs to ARCH-32.
- **(D) Export `decideQuestion` publicly.** It would be a second public decision path over an arbitrary
  subject (ADR-QD-100 rejected exporting `walk` for the same reason).

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-30-d — What does an `ObligationRecord` carry? (wire, needs sign-off)

- **(A) Nothing new.** The record pairs with its `DecisionRecord` by `evaluationId`, and an orphan stays
  anonymous.
- **(B) Three optional envelope keys under version 2: `subjectId?`, `action?`, `resourceId?`.** These are the
  question's identity, not its content. The resource stays on the `DecisionRecord` only, so customer data is
  not disclosed twice to every sink (`DecisionRecord.ts:82-97`). `discharge` always sets `subjectId`. In memory
  the fields are optional, because a row written by 0.11 lacks them. Under ADR-QD-096's own rule there is no
  version bump, and a 0.11 reader drops the keys silently, so there is no rolling-deploy hazard.
- **(C) Version 3 with a required `subjectId`.** Readers would need v2+v3, and a v2 obligation row still decodes
  without one, so the in-memory type is optional anyway. Alternatively, v3 only, following the 0.11
  precedent: then 0.11 rows need a migration that joins each obligation row to its decision row. (C) buys
  nothing (B) lacks and costs a version.
- **(D) The whole question** (policy and resource included). This duplicates the decision row's disclosure on
  every obligation row.

**Recommendation: (B)**, amending ADR-QD-096 with one paragraph that says this is the rule's first use.
`status: decided (2026-10-08, recommended default)`

### D-30-e — Where does the captured signature go? (the audit lifecycle)

- **(A) The capture port persists it.** The request now carries the key (D-30-f), the handler still discards
  the returned `Signature`, and `capture`'s doc gains a MUST: "persist where your `SignatureHistory` reads,
  keyed by `(signerId, resourceId)`". This is minimal and correct when a deployment's e-sign system is also its
  history.
- **(B) A ledger, layered over (A).** `@qadi/audit` gains a `SignatureLedger` service: `append(entry)` plus a
  read side shaped as `SignatureHistoryShape.signaturesFor`. It also gains `signatureHistoryFromLedger(ledger): Layer<SignatureHistory>`,
  `SignatureLedgerTest()` (in-memory, grouped by `signatureHistoryPort.key`) and a `ledger` option on
  `signatureObligationHandler`. With a ledger, the handler appends the signature `capture` **returned**, keyed by
  the question, after checking that its `signerId` and `meaning` match the request; a mismatch fails the
  discharge with `SignatureCaptureError` (fail closed). Without a ledger, (A)'s contract applies. Either way,
  the key the write uses and the key the read uses come from one function.
- **(C) Put `resourceId` on core's `Signature`.** This breaks ADR-QD-057/058's canonical shape and every stored
  signature, and the history port already carries the scope in its query.

**Recommendation: (B).** It is the complete path. It turns "the loop closes" from a documented duty on every
deployment's capture code into a property the library tests, and it keeps (A) for deployments whose e-sign
system is the store. `status: decided (2026-10-08, recommended default)`

### D-30-f — What does `SignatureCaptureRequest` carry? (**breaking** for code that constructs a request)

- **(A) The question's key as required fields**, with no optional `?:`, so a constructor cannot forget them:
  `evaluationId: string`, `resourceId: ResourceId | undefined` (derived by `resourceIdOf`, the same rule the
  read side applies), `action: string | undefined`, `resource: Resource | undefined` (so a ceremony can show
  *what* is being signed), plus the existing `meaning`, `signerId`, `signerRole?` and `obligationIds`.
  `signerId` becomes `discharge.question.subject.id` (C14).
- **(B) (A) without `resource`.** It is smaller, but a real capture UI then has to re-fetch the thing being
  signed from an id.
- **(C) Embed the whole `ObligationDischarge`.** The port would depend on core's enforcement types, and the
  policy and trace would reach a third-party e-sign adapter.

**Recommendation: (A).** In-repo, only `SignatureCapturePort.test.ts:131-135` constructs a request by hand.
Capture **implementors** are unaffected: they receive more fields. `status: decided (2026-10-08, recommended default)`

### D-30-g — Does the library mint a retry idempotency key?

- **(A) No.** The handler doc states what is stable: the question is stable across retries,
  `decision.evaluationId` is per attempt, and two distinct requests can share a question. The recipe is to
  close `onObligations` over the caller's own request id. This corrects the review (C11).
- **(B) `dischargeKey(discharge)` derived from the question.** It merges two distinct approvals of one document
  into one, silently dropping a duty.
- **(C) Recommend pinning `options.evaluationId` to the request id.** Every retry's decision row would then
  share an id, and the devtools timeline (which dedupes on `evaluationId` + environment, `Timeline.ts`)
  collapses the attempts into one.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-30-h — A new ADR, or amendments?

- **(A) A new ADR-QD-NEXT, "An obligation is discharged against the question it answered".** It records the
  handler shape (D-30-a/b), the lifecycle split (D-30-c), the record keys (D-30-d) and the ledger (D-30-e). It
  amends ADR-QD-019, -057, -058 and -096, and each gets a dated pointer paragraph. This follows the 054→024 and
  057→056 pattern.
- **(B) Four in-place amendments.** The decision would end up spread over four records.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

### D-30-i — Is `resourceIdOf` public?

- **(A) Yes, in `Resource.ts`:** `resourceIdOf(resource: Resource | undefined): ResourceId | undefined` (a string
  `id` → `makeResourceId(id)`, otherwise `undefined`). `@qadi/audit` needs it across the package boundary
  (ADR-QD-099: a module another package needs is exported from the barrel). A third-party capture
  implementation needs it too.
- **(B) Audit re-derives `typeof resource?.id === "string"` itself.** That is a second copy of the read side's
  rule.

**Recommendation: (A).** `Walk.ts`'s three raw `resource?.["id"]` reads stay as they are, because they must tell
"no id" from "a non-string id" (`MissingResourceId`). `resourceIdOf` is documented as the **writer's** reading
of the same rule. `status: decided (2026-10-08, recommended default)`

### D-30-j — `@qadi/http` and obligations (C16)

- **(A) Out of scope here.** Add one sentence each to BEH 23 and the http README: "an HTTP-guarded route
  passes no obligation handler, so a binding obligation answers 403 `UndischargedObligation`". File the
  follow-up as a candidate after ARCH-36.
- **(B) Add `onObligations` to `authorizeRequest`/`guardRoute`/`RequirePermissionLive` now.** These are
  ARCH-36's files, and `RequirePermission`'s handler would be per-API, so it would need the discharge's
  question to tell routes apart. That is exactly what this plan provides, so it is better done right after.

**Recommendation: (A).** `status: decided (2026-10-08, recommended default)`

## 6. Tasks

### T0 — Re-baseline on a fresh branch from `main`
- **Status:** [x] done (2026-10-08)
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/30-obligation-discharge main`. Record `git rev-parse --short HEAD` in §10.
  2. Re-run the four probes as in §1. Expect `default scope: Deny`, `scope: 'Any': Allow`, handler arg counts
     `[ 1, 1 ]` with two distinct `evaluationId`s, and `Failure AccessDenied` / `Failure MissingResourceId`.
  3. `git diff --stat e635e68 HEAD -- packages/core/src/{Qadi,Evaluate,DecisionRecord,SinkCodec,Question,Resource}.ts packages/audit/src packages/devtools/src/react/Inspector.tsx packages/devtools/src/model/Filters.ts`.
     If anything moved, correct §1's line numbers.
  4. Check whether ARCH-32 or ARCH-39 has landed: `git log --oneline main -- packages/core/src/Evaluate.ts packages/core/src/Qadi.ts`.
     If either has, re-target T2/T3 to the code as it now stands (§9 ordering).
  5. Re-run C18's grep and confirm the caller table, adding any new site.
- **Tests:** none.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Test-first: the signature loop closes, and a handler sees its question (defect C9)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0. No decision: the assertions hold under every option of D-30-a…f.
- **Files:** `packages/audit/test/SignatureLoop.test.ts` (*new*), `packages/core/test/Qadi.test.ts`.
- **Steps:**
  1. In `SignatureLoop.test.ts`, write `describe("obligation → capture → SignatureHistory → hasSignature")`,
     using the probe's structure. Set `alice = makeSubject({ id: "alice", permissions: ["doc:approve"] })`,
     `approve = permission("doc", "approve")`, and
     `approval = obliged(obligation("sig.approve"), hasPermission(approve))`. Use a test-local `rows: Array<{ subjectId; resourceId; signature }>`.
     The capture port pushes `{ subjectId: request.signerId, resourceId: requestResourceId(request), signature }`,
     where `requestResourceId` reads `Object.getOwnPropertyDescriptor(request, "resourceId")?.value` and keeps it
     only if it is a string. This compiles today, and T4 replaces it with `request.resourceId`. The history layer
     is `Layer.succeed(SignatureHistory, { name: "test-store", signaturesFor: (q) => Effect.sync(() => rows.filter(…).map((r) => r.signature)) })`,
     wired through `portsLayer({ SignatureHistory: history })` with `EvaluationIdLive` and `currentSubjectLayer(alice)`.
  2. `it.effect("a signature captured while approving doc-1 satisfies hasSignature('approved') on doc-1")`:
     run `guard(approve, approval, { onObligations: signatureObligationHandler(port, "approved") })({ id: "doc-1" }, () => Effect.void)`,
     then `decide(hasSignature("approved"), { resource: { id: "doc-1" } })`, and assert `_tag === "Allow"`.
     **Red today**: `Deny`, "no signatures are on file for subject 'alice'".
  3. `it.effect("…does not satisfy doc-2")` → `Deny`. `it.effect("…is not a subject-global signature")`:
     `hasSignature("approved", { scope: "Any" })` → `Deny`. **Red today**: it allows (C9's widening). This is the
     one that proves the defect is a widening and not just a miss.
  4. In `Qadi.test.ts`, add `describe("a handler is handed the question its allow answered")` with one
     `it.effect` per entry point: `assert`, `enforce`, `enforceProjected`, `guard`, `filter`, `filterStream`.
     The handler records its single argument. Assert `discharge.question.resource` deep-equals the resource,
     `discharge.question.action === "approve"` (pass `action`), `discharge.question.subject.id === alice.id`,
     and `discharge.decision.evaluationId` equals the id on the paired `ObligationRecord`. Write it against
     D-30-a (B)'s shape. It is red at runtime today (`question` is `undefined` on an array) and does not
     type-check until T3. T1 and T3 therefore land in one commit, and T1 is observed red with
     `pnpm vitest run` before T3 (esbuild strips types).
- **Tests:** 3 audit + 6 core, all written red-first.
- **Verify:** `pnpm vitest run packages/audit/test/SignatureLoop.test.ts packages/core/test/Qadi.test.ts`
  (expect the new tests red, the rest green).
- **Done when:** the red output is recorded in §10.

### T2 — Core: the lifecycle takes a `Question`; `ask` builds it once (pure move)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0, D-30-c (= A)
- **Files:** `packages/core/src/Lifecycle.ts` (*new*, package-private), `packages/core/src/Evaluate.ts`,
  `packages/core/test/Lifecycle.test.ts` (*new*).
- **Steps:**
  1. Create `Lifecycle.ts`. Its module doc gives a one-line summary ("The lifecycle around one question:
     id, clock, cache, walk, metrics, span, records"), then why it exists (ADR-QD-100: one build; this plan:
     `discharge` needs the same value), then "out of the barrel (ADR-QD-099)".
  2. Move from `Evaluate.ts` the metric declarations (`:51-131`, **moved, never re-declared**, because the
     metric registry keys on `type:id:description` and a second declaration would fail silently), plus
     `EvaluationLookup`, and the body of `evaluate` from `:226` (mint id) to `:352`, as
     `export const decideQuestion = Effect.fn("qadi.evaluate")(function* (question: Question, options?: LifecycleOptions) { … })`.
     It must not read `CurrentSubject`: the subject is `question.subject`. Keep the read order (`EvaluationId.next`,
     then `Clock`), per ADR-QD-012.
  3. Declare `export interface LifecycleOptions { readonly concurrency?: Concurrency; readonly evaluationId?: string }`
     in `Lifecycle.ts`, with one-line docs pointing to `EvaluateOptions` (so that no import goes back to
     `Evaluate.ts`).
  4. Add `export interface Asked { readonly question: Question; readonly decision: Decision }` and
     `export const ask = (policy: Policy, options?: QuestionOptions & LifecycleOptions): Effect.Effect<Asked, EvaluationError, CurrentSubject | EvaluationId | PortServices> => CurrentSubject.use((subject) => { const question = questionOf(subject, policy, options); return Effect.map(decideQuestion(question, options), (decision) => ({ question, decision })); })`.
     This is the **only** `questionOf` call in `src`.
  5. `Evaluate.ts`: `evaluate` becomes `(policy: Policy, options?: EvaluateOptions): Effect.Effect<Decision, EvaluationError, EvaluationServices> => Effect.map(ask(policy, options), (asked) => asked.decision)`.
     Its doc comment is kept (and says it is `ask`'s decision). `EvaluateOptions`, `EvaluationServices` and
     `StandingEvaluationServices` stay in `Evaluate.ts`, unchanged.
  6. Tests in `Lifecycle.test.ts`: `ask`'s `question` `Equal.equals` the key a recording `DecisionCache`
     receives, and equals the request half of the `DecisionRecord` a capturing sink receives (subject id,
     policy, resource, action). The existing `Evaluate.test.ts`, `DecisionCache.test.ts`, `DecisionSink.test.ts`,
     `GuardHealthCheck.test.ts` and the span/metric tests pass **unmodified** (the regression net for "pure move").
- **Tests:** `Lifecycle.test.ts` (new). Everything else unchanged.
- **Verify:** `pnpm vitest run packages/core/test`; `pnpm typecheck`; `pnpm circular`;
  `grep -n "questionOf(" packages/core/src/*.ts` (exactly `Lifecycle.ts` and the definition in `Question.ts`);
  `node scripts/check-house-style.mjs` (budgets unchanged).
- **Done when:** all green, with no test edited outside `Lifecycle.test.ts`.

### T3 — Core: `ObligationDischarge`, the new handler shape, and `resourceIdOf`
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1, T2, D-30-a (= B), D-30-b (= A), D-30-i (= A)
- **Files:** `packages/core/src/Qadi.ts`, `packages/core/src/Resource.ts`, `packages/core/src/DecisionRecord.ts`
  (doc only here), `packages/core/test/Qadi.test.ts`, `packages/core/test/DecisionSink.test.ts`,
  `packages/core/test/Qadi.tst.ts`, `packages/core/test/Resource.test.ts` (*new*, or the existing resource test
  if T0 finds one), `features/step-definitions/Bridge.ts`.
- **Steps:**
  1. `Qadi.ts`: add `export interface ObligationDischarge { readonly question: Question; readonly decision: Allow }`.
     Its doc gives a one-line summary, then: built once by the lifecycle (ADR-QD-100); `decision.obligations`
     is the one source of the duties (ADR-QD-019); what is stable across a retry (C11/D-30-g: the question yes,
     `decision.evaluationId` no, and a caller's own request id is the per-request key, captured by the
     closure); and that the subject is the decided subject, so a handler needs no `CurrentSubject`.
  2. `ObligationHandler<E, R>` becomes `(discharge: ObligationDischarge): Effect.Effect<void, E, R>`. Rewrite its
     doc (`:38-65`): delete "tracked separately", and keep the at-least-once and no-parallelism paragraphs.
  3. `discharge(asked: { question; decision: Allow }, handler)`: the handler is called with
     `{ question, decision }`. The record builder is unchanged until T6.
  4. `permitted`: `Effect.flatMap(ask(policy, options), ({ question, decision }) => isAllowed(decision) ? Effect.as(discharge({ question, decision }, options?.onObligations), decision) : Effect.fail(new AccessDenied({…})))`.
     `decideOne` does the same with `ask(policy, { ...options, resource: item })`. `guard` is unchanged (it
     already routes `resource` through `enforce`).
  5. `Resource.ts`: `export const resourceIdOf = (resource: Resource | undefined): ResourceId | undefined`.
     Its doc says it is the writer's half of the rule `askSignature`/`askActedForResource` read with: a string
     `id` is the resource's id, anything else is "no id". Import `makeResourceId`/`ResourceId` from
     `Identity.ts` (both leaves; check with `pnpm circular`).
  6. Migrate the 12 core test handlers (C18). `(obligations) =>` becomes `({ decision }) =>`, reading
     `decision.obligations`. A zero-argument handler `() =>` needs no edit (it is still assignable). Migrate
     `Bridge.ts:109-110` to `({ decision }) => Ref.update(…, decision.obligations.map((o) => o.id))`.
  7. `Qadi.tst.ts`: add `test("onObligations' parameter is ObligationDischarge", …)` with
     `expect<Parameters<ObligationHandler>[0]>().type.toBe<ObligationDischarge>()`, plus a `@ts-expect-error` on
     a handler typed `(obligations: ReadonlyArray<Obligation>) => …`.
  8. `Resource.test.ts`: `resourceIdOf({ id: "a" }) === "a"`, `resourceIdOf({ id: 1 }) === undefined`,
     `resourceIdOf(undefined) === undefined`, and `resourceIdOf({})` → `undefined`.
  9. **T3a (defect-only path, only if D-30-a = A):** steps 1–5 with `ObligationHandler` as
     `(obligations: ReadonlyArray<Obligation>, discharge: ObligationDischarge)`. Skip step 6 (one-parameter
     handlers stay valid). Step 7 asserts `Parameters<ObligationHandler>[1]`.
- **Tests:** T1's six core tests turn green. Migrated tests keep their assertions.
- **Verify:** `pnpm vitest run packages/core/test/Qadi.test.ts packages/core/test/DecisionSink.test.ts packages/core/test/Resource.test.ts`;
  `pnpm test:tstyche`; `pnpm typecheck`; `pnpm vitest run --root features features/features/obligations` (or the
  acceptance command `package.json` names; confirm in T0).
- **Done when:** everything passes, and `grep -rn "handler(decision.obligations)" packages/core/src` is empty.

### T4 — Audit: the capture request carries the question's key; the signer is the decided subject
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, D-30-f (= A)
- **Files:** `packages/audit/src/SignatureCapturePort.ts`, `packages/audit/test/SignatureCapturePort.test.ts`,
  `packages/audit/test/SignatureCapturePort.tst.ts` (*new*), `packages/audit/test/SignatureLoop.test.ts`.
- **Steps:**
  1. `SignatureCaptureRequest` gains `readonly evaluationId: string; readonly resourceId: ResourceId | undefined; readonly action: string | undefined; readonly resource: Resource | undefined;`.
     Doc: derived from the discharged question and never built by hand. `resourceId` is `resourceIdOf(question.resource)`,
     which is the key a resource-scoped `hasSignature` asks with.
  2. Add an internal (module-private) `captureRequestOf(discharge, meaning, signerRole)`, the one place a
     request is built.
  3. `signatureObligationHandler` takes `(discharge: ObligationDischarge)`. It drops `CurrentSubject` (and the
     import) and uses `signerId: discharge.question.subject.id`. Rewrite its doc: delete the "asserted, not
     verified — ambient" paragraph and replace it with "the signer is the subject the allow was decided for,
     carried on the question". The `signerRole` caveat stays.
  4. `capture`'s doc (`:89-101`) gains, for D-30-e (A) mode: "When no ledger records the result, an
     implementation MUST persist the signature where the deployment's `SignatureHistory` reads, keyed by
     `(signerId, resourceId)`, or a resource-scoped `hasSignature` will never see it."
  5. Tests: update `:64-73` (the request shape now includes the four keys, built from a `questionOf`-made
     discharge with no `CurrentSubject` provided at all), `:88-97`, `:110` and `:131-135`. Add "the signer is
     the question's subject even when a different `CurrentSubject` is provided" (C14). In `SignatureLoop.test.ts`
     replace `requestResourceId` with `request.resourceId`. T1's three audit tests turn green in capture-persists mode.
  6. `SignatureCapturePort.tst.ts`: the handler's `R` is `never`, and `SignatureCaptureRequest["resourceId"]` is
     `ResourceId | undefined` (required key).
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/audit/test`; `pnpm test:tstyche`;
  `grep -n CurrentSubject packages/audit/src/SignatureCapturePort.ts` (empty).
- **Done when:** T1's audit tests pass and the grep is empty. T1+T3+T4 form a coherent minor and can ship
  alone (with T9's spec subset for the touched behaviours).

### T5 — Audit: `SignatureLedger`, the store capture writes and `hasSignature` reads
- **Status:** [x] done (2026-10-08)
- **Depends on:** T4, D-30-e (= B)
- **Files:** `packages/audit/src/SignatureLedger.ts` (*new*), `packages/audit/src/SignatureLedgerTest.ts` (*new*),
  `packages/audit/src/SignatureCapturePort.ts`, `packages/audit/src/index.ts`,
  `packages/audit/test/SignatureLedger.test.ts` (*new*), `packages/audit/test/SignatureLoop.test.ts`.
- **Steps:**
  1. `SignatureLedger.ts`:
     - `export interface SignatureLedgerEntry { readonly subjectId: SubjectId; readonly resourceId: ResourceId | undefined; readonly evaluationId: string; readonly signature: Signature }`
     - `export class SignatureLedgerError extends Data.TaggedError("SignatureLedgerError")<{ readonly evaluationId: string; readonly cause: unknown }> {}`
     - `export interface SignatureLedgerShape { readonly name?: string | undefined; readonly append: (entry: SignatureLedgerEntry) => Effect.Effect<void, SignatureLedgerError>; readonly signaturesFor: SignatureHistoryShape["signaturesFor"] }`
     - `export class SignatureLedger extends Context.Service<SignatureLedger, SignatureLedgerShape>()("qadi/audit/SignatureLedger") { static readonly append = (e: SignatureLedgerEntry) => SignatureLedger.use((l) => l.append(e)) }`
     - `export const signatureHistoryFromLedger = (ledger: SignatureLedgerShape): Layer.Layer<SignatureHistory> => Layer.succeed(SignatureHistory, { name: ledger.name ?? "signatureHistoryFromLedger", signaturesFor: ledger.signaturesFor })`
     - `export const ledgerEntryOf = (request: SignatureCaptureRequest, signature: Signature): SignatureLedgerEntry`.
       This is where the write key is computed: `subjectId: signature.signerId`, `resourceId: request.resourceId`.
     The module doc gives a one-line summary, then why: the write key and the read key come from one rule
     (C9), the ledger is a store and not a capture (BEH-QD-255), and trust-on-presence still holds (ADR-QD-058).
  2. `SignatureLedgerTest.ts`: `SignatureLedgerTest(): SignatureLedgerTestHandle` with `{ ledger: SignatureLedgerShape; entries: () => ReadonlyArray<SignatureLedgerEntry> }`.
     It is in-memory, groups by `signatureHistoryPort.key([{ subjectId, resourceId }])`, and returns a copy per
     read (as `signatureHistoryFromSignatures` does, `SignatureHistory.ts:231-236`). This mirrors `AuditTrailPortTest.ts`.
  3. `signatureObligationHandler(port, meaning, options?: { readonly signerRole?: string; readonly ledger?: SignatureLedgerShape })`.
     After `capture`, if `signature.signerId !== request.signerId` or `signature.meaning !== request.meaning`,
     fail with `new SignatureCaptureError({ reason: "capture returned a signature for a different signer or meaning" })`.
     A capture that attests something other than what was asked must not discharge the duty. Then, if a ledger
     is given, `yield* ledger.append(ledgerEntryOf(request, signature))`. The handler's `E` becomes
     `SignatureCaptureError | SignatureLedgerError`. A ledger failure makes the discharge `HandlerFailed` and
     refuses enforcement, which is fail-closed (INV-QD-013).
  4. Barrel: `export * from "./SignatureLedger.ts"` and `export * from "./SignatureLedgerTest.ts"`, alphabetical.
  5. Tests in `SignatureLedger.test.ts`: append then read under resource scope and global scope; a copy per
     read; a mismatch fails with `SignatureCaptureError`, nothing is appended, and the `ObligationRecord` says
     `HandlerFailed` (INV-QD-055's outcome match); a failing ledger (an `append` that fails, built in the test as
     a plain shape, not a port error) produces `HandlerFailed`, the guarded effect does not run, and capture was
     called exactly once.
  6. `SignatureLoop.test.ts` gains a second `describe` running T1's three cases in **ledger mode**
     (`SignatureLedgerTest()` + `signatureHistoryFromLedger`). Both modes stay.
- **Tests:** as above.
- **Verify:** `pnpm vitest run packages/audit/test`; `pnpm typecheck`; `pnpm circular`; `node scripts/check-house-style.mjs`.
- **Done when:** both loop modes pass, and success criterion 1 holds verbatim.

### T6 — Core: the obligation record names who and what (record, codec, goldens)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3, D-30-d (= B)
- **Files:** `packages/core/src/DecisionRecord.ts`, `packages/core/src/Qadi.ts`, `packages/core/src/SinkCodec.ts`,
  `packages/core/test/fixtures/sinkWireV2.ts`, `packages/core/test/SinkCodec.test.ts`, `packages/core/test/DecisionSink.test.ts`.
- **Steps:**
  1. `ObligationRecord` gains `readonly subjectId?: SubjectId | undefined; readonly action?: string | undefined; readonly resourceId?: ResourceId | undefined;`,
     **after** `obligationIds`. Doc: identity, not content (the resource stays on the decision row); optional
     only because rows written before this release lack them, and `discharge` always sets `subjectId`. Rewrite
     the class doc's "Per decision … `ObligationHandler` receives the whole array" to say what the handler now
     receives, while keeping the per-decision limit.
  2. `discharge`'s `record` sets `subjectId: question.subject.id`, `...(question.action === undefined ? {} : { action })`,
     and `...(resourceIdOf(question.resource) === undefined ? {} : { resourceId })`.
  3. `SinkCodec.ts`: `obligationsV2Fields` gains `subjectId: Schema.optional(Schema.String), action: Schema.optional(Schema.String), resourceId: Schema.optional(Schema.String)`,
     appended last. Update `project` (`:197-204`) with conditional spreads and `rebuild` (`:244-250`) with
     `makeSubjectId`/`makeResourceId`. `OBLIGATIONS_KEYS` follows automatically.
  4. Fixtures: keep `V2_OBLIGATIONS` unchanged and add
     `V2_OBLIGATIONS_FULL_ENVELOPE = '{"_tag":"Obligations","version":2,"evaluationId":"g","at":1,"outcome":"Discharged","obligationIds":["audit.log"],"subjectId":"u1","action":"approve","resourceId":"doc-1"}'`.
  5. Tests in `SinkCodec.test.ts`: the old golden decodes and re-encodes byte-identically; the full-envelope
     golden round-trips; the writer writes the full-envelope golden from its record; decoding the old golden
     yields a record whose `subjectId`, `action` and `resourceId` are absent (`Object.hasOwn` false) — the view
     every row written by 0.11 gives this release. In `DecisionSink.test.ts`: a discharged allow's record carries `subjectId`,
     `action` and `resourceId`, and an allow with no resource omits `resourceId` (key absent, `Object.hasOwn`).
- **Verify:** `pnpm vitest run packages/core/test/SinkCodec.test.ts packages/core/test/DecisionSink.test.ts packages/audit/test packages/http/test/decisionStream.test.ts`
  (audit and stream tests decode obligation rows).
- **Done when:** all green, and `V2_OBLIGATIONS` is unchanged in the diff.

### T7 — Devtools: an orphan says who and what
- **Status:** [x] done (2026-10-08)
- **Depends on:** T6
- **Files:** `packages/devtools/src/react/Inspector.tsx`, `packages/devtools/src/model/Filters.ts`,
  `packages/devtools/test/Filters.test.ts`, `packages/devtools/test/Inspector.test.tsx` (names confirmed in T0).
- **Steps:**
  1. `Filters.ts:109-113`: the `TimelineOrphan` haystack adds `subjectId`, `action` and `resourceId` when present,
     with the same "no `"undefined"` string" rule as the decision arm (spreads of `[]`).
  2. `Inspector.tsx:111-120`: `OrphanPanel` takes `entry` and, when present, renders "for subject X, action Y,
     resource Z" above the existing paragraph. `data-testid="qadi-orphan-question"`. Fix the doc at `:182-188` to
     say what the handler receives, keeping the per-duty limit.
  3. Tests: a filter on the subject id finds an orphan carrying it; an orphan without the keys renders as before
     (pinned: the existing orphan test passes unchanged).
- **Verify:** `pnpm vitest run packages/devtools/test`.
- **Done when:** green. Coordinate with ARCH-33/ARCH-34 if either touched `Inspector.tsx` first (§9).

### T8 — Acceptance: the loop and the handler's view as BDD scenarios
- **Status:** [x] done (2026-10-08)
- **Depends on:** T5
- **Files:** `features/features/obligations/obligations.feature`, `features/step-definitions/Obligation*Steps.ts`,
  `features/step-definitions/Bridge.ts`, `features/features/signatures/signatures.feature` (*new*, `@signatures @REQ-QD-NEXT`),
  its `.steps.test.ts` and step file (*new*), following the existing feature layout.
- **Steps:**
  1. `obligations.feature` (`@REQ-QD-011`): "Scenario: the handler is told which resource the allow was for".
     Given a subject "rania" with role "auditor", when they read "doc-7" under an audited requirement, then
     the handler discharged "log-access" for resource "doc-7". Extend the World with `dischargedFor: Array<string | undefined>`.
  2. `signatures.feature`: "a signature captured while approving a document answers that document's
     hasSignature", "it does not answer another document", "it is not a subject-global signature". Use
     `SignatureLedgerTest` and `signatureHistoryFromLedger`, plus a capture port in the step file.
- **Verify:** the acceptance command from `package.json` (e.g. `pnpm test:features`; confirm in T0), and
  `pnpm spec:verify:strict` (tags join the matrix).
- **Done when:** green, and the new REQ appears in `spec/traceability.md` §5 (T9).

### T9 — Spec, ADR, overview, traceability, docs, website, changeset
- **Status:** [x] done (2026-10-08)
- **Depends on:** T3–T8
- **Files:** see §8 for every edit. Also `.changeset/*` (*new*).
- **Steps:** perform §8. Then:
  1. `node scripts/check-api-surface.mjs` (gate 13).
  2. `node scripts/check-doc-examples.mjs` (BEH-QD-087 fence, rewritten to `({ decision }) => Effect.forEach(decision.obligations, …)`).
  3. `node scripts/check-website-doc-examples.mjs` (the `concepts/obligations.md` and `concepts/signatures.md` fences).
  4. Changesets: `@qadi/core` minor ("**Breaking:** `ObligationHandler` receives one `ObligationDischarge` —
     `{ question, decision }`; `ObligationRecord` names `subjectId`/`action`/`resourceId`; new `resourceIdOf`"),
     `@qadi/audit` minor ("**Breaking:** `SignatureCaptureRequest` gains required `evaluationId`/`resourceId`/`action`/`resource`;
     `signatureObligationHandler` takes a discharge and no longer requires `CurrentSubject`; new `SignatureLedger`,
     `signatureHistoryFromLedger`, `SignatureLedgerTest`; a captured signature now answers a resource-scoped
     `hasSignature`"), and `@qadi/devtools` patch.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:verify:strict && pnpm spec:gates`.
- **Done when:** all four pass.

### T10 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T9
- **Files:** none.
- **Steps:**
  1. `pnpm check`. Watch the mutation stage. In core (`stryker.config.mjs`), `discharge`'s record spreads and
     `resourceIdOf`'s branch are killed by T3/T6's key-presence tests, and `ask`'s `{ question, decision }` by T1's
     per-entry-point tests. In audit (`stryker.audit.mjs`), the mismatch condition (both halves) and the
     `ledger !== undefined` branch are killed by T5's tests.
  2. A surviving mutant is either a missing test (add it) or a recorded finding, never suppressed (ADR-QD-076).
- **Verify:** `pnpm check`.
- **Done when:** green.

### T11 — Update the tracker
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T10
- **Files:** this plan (frontmatter `status`, task boxes, §10). The orchestrator owns `.planning/architecture/README.md`'s row.
- **Steps:** set `status: done`, tick the tasks, record SHAs and the assigned ADR/CCR/BEH/INV/REQ numbers in §10.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-30-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **The loop is tested once, end to end, in two modes** (`SignatureLoop.test.ts`: capture-persists and
  ledger), plus once as acceptance (`signatures.feature`). The negative cases (another resource, `scope: "Any"`)
  are the ones that catch a regression back to subject-global keying, which is the widening C9 found.
- **The handler's view is pinned per entry point** (six tests, T1). `INV-QD-013`'s second path (`decideOne`)
  is covered by `filter` and `filterStream`.
- **Pure move (T2): replace nothing.** `Evaluate.test.ts`, `DecisionCache.test.ts`, `DecisionSink.test.ts`,
  `GuardHealthCheck.test.ts` and the span and metric tests run unmodified. Any edit there means the move was not
  pure. `Lifecycle.test.ts` adds only the "same question everywhere" property.
- **Migrated, not layered:** the 12 core handler tests and audit's six call sites change signature and keep
  their assertions. `SignatureCapturePort.test.ts`'s ambient-subject test is **replaced** by "the signer is the
  question's subject", because the old property no longer holds by design.
- **Wire:** the `V2_OBLIGATIONS` golden is untouched (the backward-compatibility oracle), and a new
  full-envelope golden pins the writer.
- **Type tests:** `Qadi.tst.ts` (the parameter type, and a `@ts-expect-error` on the old shape) and
  `SignatureCapturePort.tst.ts` (`R = never`, required request keys).
- **Property:** optional. A `fast-check` property over generated resources (string, number and absent `id`)
  checks that `resourceIdOf` and the read side's acceptance agree: a resource whose `resourceIdOf` is
  `undefined` makes a scoped `hasSignature` fail `MissingResourceId`, and one with an id queries that id. Add it
  in `Resource.test.ts` if T10's mutation run shows `resourceIdOf` survivors.
- **Mutation:** core and audit configs, as in T10.

## 8. Spec and documentation updates

- **ADR-QD-NEXT** (new, D-30-h): "An obligation is discharged against the question it answered". The Context is
  C1/C9/C11/C14. The Decision covers D-30-a…g. The Alternatives are the rejected options above. It amends 019,
  057, 058 and 096, and goes in `spec/decisions/index.yaml`.
- **ADR-QD-019 / -057 / -058 / -096:** each gets a dated amendment block (2–4 sentences) pointing to ADR-QD-NEXT,
  and its revision row is bumped. 057's quoted handler signature is kept, with the new one quoted under it.
  058's "typically … through `ObligationHandler`" gains "keyed by the question since ADR-QD-NEXT". 096 says that
  the `Obligations` envelope's three optional keys are the "rule for the future"'s first use.
- **`spec/behaviors/11-obligations.md`:** the BEH-QD-085 `ts` fence shows `ObligationDischarge` and the new
  `ObligationHandler`. **BEH-QD-NEXT** (new): "A handler is handed the question its allow answered", with the
  REQUIREMENT "`onObligations` MUST receive the lifecycle's own `Question` and the `Allow`; it MUST NOT need any
  ambient service to learn the subject, resource or action", plus a paragraph on what is and is not stable
  across a retry (D-30-g). Rewrite the BEH-QD-087 `typescript` fence (compiled). Bump the change history.
- **`spec/behaviors/33-audit-pipeline.md`:** BEH-QD-256's REQUIREMENT changes "derived from the current
  subject" to "derived from the discharged question", and gains "the request MUST carry `resourceId`
  `resourceIdOf(question.resource)`". **BEH-QD-NEXT** (new): "A signature captured for a discharged question
  answers that question's `hasSignature`, and no other", with REQUIREMENTs for the ledger key, the
  signer/meaning mismatch refusal and the ledger failure → `HandlerFailed`. BEH-QD-255 gains one sentence: a
  ledger is a store, not a capture. BEH-QD-257's worked example gains the loop, or a new worked example.
- **BEH-QD-195** (`25-inspection.md:441-462`): the REQUIREMENT is unchanged. The "per decision" paragraph
  names what the handler receives, and the record's three keys. **BEH-QD-209** (`27-devtools-timeline.md:418`)
  gets the same wording fix, plus "an orphan shows its subject, action and resource id when the record carries them".
- **BEH 23 / `packages/http/README.md`:** one sentence (D-30-j A).
- **`spec/behaviors/24-decision-sink.md:43`:** the `ObligationRecord` shape note.
- **Invariants:** **INV-QD-NEXT**, "A signature recorded for a discharge is keyed by the question it
  discharged". Source: `SignatureLedger.ts`'s `ledgerEntryOf`, `Resource.ts`'s `resourceIdOf`. Enforcement:
  `SignatureLoop.test.ts`, `SignatureLedger.test.ts`, `signatures.feature`. **INV-QD-055:** restate "a request
  built from the current subject" as "from the discharged question", and add that a returned signature
  for a different signer or meaning fails the discharge. **INV-QD-013:** its Source names `ask` as the shared
  front of `permitted` and `decideOne`.
- **`spec/overview.md`** (gate 13): core rows `ObligationDischarge` (type, `Qadi.ts`, beside `EnforceOptions`,
  `ObligationHandler` at `:177`) and `resourceIdOf` (function, `Resource.ts`). The `ObligationRecord` row or
  prose names its optional keys. Audit table (`:700-711`): `SignatureLedger`, `SignatureLedgerShape` (service),
  `SignatureLedgerEntry` (type), `SignatureLedgerError` (error), `signatureHistoryFromLedger`, `ledgerEntryOf`
  (function), `SignatureLedgerTest` (function), `SignatureLedgerTestHandle` (type). The `:721` sentence becomes
  "pure functions, an `ObligationHandler` and the ledger it writes". Bump the revision.
- **Traceability:** rows for `Lifecycle.test.ts`, `SignatureLoop.test.ts`, `SignatureLedger.test.ts`,
  `SignatureCapturePort.tst.ts`, `Resource.test.ts`; `Qadi.test.ts` gains BEH-QD-NEXT (11); the new INV row;
  §5 gains `signatures.feature` → REQ-QD-NEXT, and REQ-QD-011's row gains the new scenario.
- **CCR register** (`spec/README.md`): CCR-QD-NEXT, listing every file above.
- **Code docs:** `Qadi.ts:38-65` (T3), `DecisionRecord.ts:116-133` (T6), `Inspector.tsx:182-188` (T7), and
  `SignatureCapturePort.ts`'s module doc `:14-19` ("what makes it actually assembled" now includes the ledger).
- **Website:** `concepts/obligations.md` fence (handler shape); `concepts/signatures.md`: rewrite the example
  as the working loop (C15), fix the diagram's `aria-label` and caption to name the ledger, and add
  `resource: { id: … }`; `packages/audit/signatures.md` (`:54-77`, the handler's request and the ledger);
  `packages/audit/index.md:26` (ledger in the list).
- **`packages/audit/README.md`** (`:85-106`): the snippet with `ledger`, and the testing section names
  `SignatureLedgerTest`.
- **Changesets:** as in T9.

## 9. Risks and rollback

- **Breaking handler shape (D-30-a B).** Every third-party `onObligations` fails to compile, which is loud and
  not silent. A handler written `() => …` keeps compiling. Mitigation: the changeset gives the one-line migration
  (`(obligations) =>` → `({ decision }) =>` + `decision.obligations`). Fallback: the defect-only path (T3a).
- **The lifecycle move (T2).** A subtle reorder (the id minted before the subject read) or a re-declared metric
  would change behaviour silently. Mitigation: no test outside `Lifecycle.test.ts` may change in T2, and the
  metrics are moved, not copied. Metric registries key on `type:id:description` and memoise per object, so a
  duplicate declaration would split the counters without any error.
- **Signer/meaning mismatch refusal (T5).** A deployment whose `capture` legitimately normalises `meaning` (for
  example, upper-casing it) would now be refused. That is fail-closed, and it is loud (`HandlerFailed`, an error).
  The changeset says so.
- **Wire skew (T6).** A 0.11 reader drops the three keys silently (ADR-QD-096, "Ignored envelope keys are
  silent"). No reader refuses a record. A 0.11 audit row has no keys, and the in-memory type says so.
- **Disclosure.** `resourceId` and `action` now reach every sink on obligation rows. Both are already on the
  paired decision row, together with the whole resource, so nothing new is disclosed.
- **Ordering with other wave-4 plans.**
  - **ARCH-32** (a Decision is constructed from its Trace) edits the `Allow`/`Deny` construction that T2 moves into
    `Lifecycle.ts`. Rule: land T2 first, or if ARCH-32 lands first, T2 moves ARCH-32's version.
  - **ARCH-39** (enforceProjected decides against its value) edits `permitted`/`enforceProjected`. Rule: ARCH-39 lands
    after T3 and uses `ask` for its second question.
  - **ARCH-33/ARCH-34** may touch `Inspector.tsx`/`Filters.ts`. T7 is small, so it rebases.
  - **ARCH-36** owns the http files (D-30-j). There is no edit there besides the README sentence.
  - **ARCH-31** reads `SignatureHistory.ts`'s description. T5 only reads `signatureHistoryPort.key`, so there is
    no conflict.
- **Rollback.** T1+T3+T4 revert together (the shape change). T5 (the ledger) and T6/T7 (record keys) are
  independent and can each be reverted alone. T2 is a pure move and can stay even if the rest is reverted.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; C9 reproduced by `probe-loop.mts`, C11 corrected by `probe-retry.mts`, C15 found by `probe-website*.mts` | planner |
| 2026-10-08 | decisions | D-30-a..j all taken at the recommendation: a = B (one `ObligationDischarge` value, breaking), b = A (`{ question, decision }`), c = A (package-private `Lifecycle.ts`: `decideQuestion` + `ask`), d = B (three optional v2 envelope keys), e = B (ledger over capture-persists), f = A (required key fields, breaking), g = A (no minted idempotency key), h = A (ADR-QD-105), i = A (`resourceIdOf` public), j = A (http untouched, one sentence) | impl agent |
| 2026-10-08 | T0 | re-baselined on the worktree (ARCH-33/35/37/39/41 merged); `questionOf(` call sites in src are now `Lifecycle.ts` (decisions), `Predicate.ts` (ARCH-41, a probe with `resource: undefined`) and `GuardHealthCheck.ts` (a probe): the plan's "exactly one" holds for decisions only | impl agent |
| 2026-10-08 | T1 | red first. Audit `SignatureLoop.test.ts`: `a signature captured while approving doc-1 satisfies hasSignature('approved') on doc-1` and `...is not a subject-global signature` failed (`Allow` expected `Deny`; the second is C9's widening, reproduced); `...does not satisfy doc-2` passed vacuously. Core `Qadi.test.ts` "a handler is handed the question its allow answered": 10 of 10 red at runtime (assert, enforce, enforceProjected, enforceLoaded, enforceProjectedLoaded, guard, filter, filterProjected, filterStream, filterStreamProjected), the plan's six plus the four siblings ARCH-39 added | impl agent |
| 2026-10-08 | T2 | `Lifecycle.ts` (`decideQuestion`, `ask`, `LifecycleOptions`, `Asked`, metrics moved not copied); `evaluate` is `ask`'s decision; `Lifecycle.test.ts` added; all other core tests unmodified and green; `pnpm circular` clean | impl agent |
| 2026-10-08 | T3 | `ObligationDischarge`, new `ObligationHandler`, `discharge`/`permitted`/`decideOne` over `ask`, `resourceIdOf` + `Resource.test.ts`, `Qadi.tst.ts` (parameter type, legacy shape not assignable); 4 core test handlers and `Bridge.ts` migrated (the other 8 sites were zero-argument handlers that needed no edit) | impl agent |
| 2026-10-08 | T4 | `SignatureCaptureRequest` carries the key; `captureRequestOf`; handler needs no `CurrentSubject` (tstyche `R = never`); tests rewritten around a discharge built with `questionOf` + `Allow`; new "signer is the question's subject" test | impl agent |
| 2026-10-08 | T5 | `SignatureLedger.ts`, `SignatureLedgerTest.ts`, `ledger` option; the signer/meaning mismatch refusal applies with or without a ledger (INV-QD-055 as restated); `ledgerEntryOf` takes a structural `LedgerKeySource` so `SignatureLedger.ts` does not import the capture port (madge counts type edges); ledger-mode loop tests | impl agent |
| 2026-10-08 | T6 | `ObligationRecord` + `obligationsV2Fields` optional keys; `V2_OBLIGATIONS` untouched, `V2_OBLIGATIONS_FULL_ENVELOPE` added; absent-key and byte-identity tests | impl agent |
| 2026-10-08 | T7 | Inspector `OrphanPanel` (`qadi-orphan-question`) and `Filters.ts` haystack; tests in `Filters.test.ts` and `DevtoolsDock.test.tsx` | impl agent |
| 2026-10-08 | T8 | `obligations.feature` gains two scenarios (resource told / none told) and `signatures.feature` (REQ-QD-034, 3 scenarios, `SignatureLoopSteps.ts`); `features/tsconfig.json` gains a reference to `@qadi/audit` | impl agent |
| 2026-10-08 | T9 | ADR-QD-105 (+ amendments to 019/057/058/096), BEH-QD-325 (doc 11) and BEH-QD-326 (doc 33), INV-QD-120, CCR-QD-220 (offset +10 per brief), REQ-QD-034, overview rows, traceability, website + READMEs, three changesets. `check-api-surface`, `spec:examples`, `spec:website-examples`, `spec:verify:strict`, `spec:gates`, `spec:claims` green. The website concept example was run as a probe (it runs, and the original did not) | impl agent |
| 2026-10-08 | gates | green: typecheck, oxlint (excluding stray untracked `.d.ts`), house-style (same), circular, tstyche, full `vitest run` (3481), features (559). Not run: `pnpm check`, mutation (stryker core/audit), e2e, `spec:package` | impl agent |
