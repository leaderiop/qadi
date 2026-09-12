# @qadi/http

## 0.6.1

### Patch Changes

- `0.6.0` was published from a checkout where `pnpm build` had never been run, so all 9 tarballs shipped `src/` and `package.json` only — no `lib/`, no `.d.ts`, no `index.js`. `0.6.0` could not be unpublished (no OTP access at the time), so it stays on the registry as a known-broken release; `npm deprecate` points installers at `0.6.1` instead. This release ships the intended build output, no source changes otherwise.

  Root cause fixed: each public package now has a `prepack` script (`pnpm -w run build`, not a package-local `tsc -b` — `@qadi/testing`, `@qadi/audit`, etc. depend on other workspace packages and a local-only build would not rebuild them) that runs automatically before `npm pack`/`npm publish`/`pnpm pack`/`pnpm publish`, so this can no longer happen regardless of which checkout the publish step runs from.

- Updated dependencies
  - @qadi/core@0.6.1

## 0.6.0

### Minor Changes

- 47e5683: `effect` bumped from `4.0.0-rc.112` to `4.0.0-rc.115` (`4.0.0-rc.113` shipped a broken `.d.ts` bundle — missing `Match`/`Schema` type exports — fixed in `rc.115`).

  **Breaking: the minimum supported Node version is now `>=22.12.0`, up from `>=20.19.0`.** This is forced by the bump: `@effect/vitest@4.0.0-rc.115` requires `vitest@^5.0.0`, and `vitest` 5 does not run on Node 20 at any patch level. There is no path that keeps both effect's newest rc and Node 20 support — see ADR-QD-074. If you run these packages on Node 20, stay on `effect@4.0.0-rc.112` and the previous published version until you can move to Node 22.12+.

  No public API changed. Internal-only: `effect/testing/FastCheck` was removed upstream, so this repo's own tests depend on `fast-check` directly now; `vitest`'s benchmark API moved to a `test`-context fixture, so `packages/core/bench/*.bench.ts` were ported to the new shape; `@stryker-mutator/vitest-runner` doesn't yet support `vitest` 5's `testNamePattern` change ([stryker-js#6210](https://github.com/stryker-mutator/stryker-js/issues/6210)), so it's patched via `pnpm patch` to backport the pending upstream fix (dev-only, not part of the published packages).

### Patch Changes

- Updated dependencies [47e5683]
  - @qadi/core@0.6.0

## 0.5.0

### Minor Changes

- Resolved all 202 findings from a full-codebase audit (2026-09-06), plus the two follow-up human-decision items it surfaced. Correctness fixes, spec-consistency corrections, and hardening spanning every package — no single public API change dominates; see the merged PRs (#28-#32) for the itemized findings.
- Resolved all 191 Low/Info findings from a second full-codebase audit (2026-09-07, issue #49), including several genuine correctness fixes surfaced along the way:
  - `Neq` now denies whenever either resolved operand is `undefined` (including the both-absent case), matching `Eq`'s existing fail-closed stance — previously matched on one side being absent (H2).
  - `projectAt` (`FieldPath.ts`) walks an explicit stack instead of the call stack, closing a stack-overflow on deeply-nested field specs.
  - The untrusted-decode depth guard is now shared between `Policy.ts` and `SinkCodec.ts` (H6), and the circuit breaker releases its probe claim on abnormal exit (H4).
  - `predicate-prisma`'s compiler constant-folds vacuous AND/OR identities so they never nest (C1); `predicate-sql`/`predicate-prisma` guard non-finite bounds so both interpreters agree.
  - `DecisionCache`'s coalesced-waiter interruption path was closed; its `maxDepth` key issue was confirmed already fixed.

  Also: spec-consistency sweeps across every behavior/invariant/traceability document, gate-blind-spot closures (dod-table, api-surface, doc-examples, mutation-upload), and house-style/BDD cleanup.

- Effect built-in adoption sweep (`packages/core` and downstream consumers), each replacing a hand-rolled equivalent: `EvaluationServicesNone` is now actually used at its ~37 call sites instead of being hand-retyped; `Effect.provideService` replaces `currentSubjectLayer` construction on the per-request path; `Schema.Finite`/`Schema.is` tighten `Predicate.ts`'s bounds and `isSecurityLabel`; `Array.dedupeWith`/`groupBy`, `Record.fromIterableWith`, `Struct.omit` replace hand-rolled equivalents in `Obligation.ts`/`Gates.ts`/`Pairing.ts`/`Permission.ts`/`Edits.ts`; `Metric.frequency`'s `preregisteredWords` option is now set on the frequencies that lacked it, and the circuit breaker's state is a tagged frequency instead of a 0/1/2 gauge; `resetTimeoutMs` is `Duration.Input`; `toWire`'s per-record encode uses `Schema.encodeSync` where the input is provably total.

  **Behavior change**: `decideSubjects`/`filterSubjects` (`SubjectSet.ts`) now use `Effect.partition` and never fail outright — a subject whose evaluation breaks is reported in a `failures` array instead of discarding every other subject's decision in the batch. `Qadi.filter`'s enforcement-path semantics are unchanged (still fail-fast, per `@qadi/promise`'s own contract and INV-QD-006).

- **Error-wire schema model** (ADR-QD-060, ADR-QD-072): all eleven `EnforcementError` tags — the nine that cross the `SinkCodec` wire, plus `AccessDenied`/`UndischargedObligation` for the HTTP response boundary — are now `Schema.TaggedError` instead of `Data.TaggedError`. This deletes ~200 lines of hand-mapped bridge code from `SinkCodec.ts` (`ErrorSchema`/`encodeError`/`decodeError`, replaced by `EvaluationErrorSchema`, their union directly).

  **HttpApi adoption** (`@qadi/http`): `RequirePermission`'s `HttpApiMiddleware` now declares `error: [...]`, letting the framework's own encoder answer nine of the eleven `EnforcementError` tags declaratively (real status + body, OpenAPI-visible) — the three disclosure-sensitive tags (`AccessDenied`, `UndischargedObligation`, `SubjectExtractionFailed`) stay tag-only-schema with an empty body. SSE framing in `DecisionStreamRoute.ts` now calls `effect/unstable/encoding/Sse`'s real encoder instead of a hand-built template string.

  **Breaking**: `handleMiddlewareEnforcementErrors` is removed from `@qadi/http`'s public API — `RequirePermission`'s declared `error:` now lets `HttpApiMiddleware` encode those tags itself, so the function it replaced no longer exists. `handleEnforcementErrors` (the bare-`HttpRouter` counterpart) is unaffected.

### Patch Changes

- Smaller fixes and consolidation rounding out this release:
  - `@qadi/audit`'s `encodeAuditEntry` now guards the whole record (`isRecordJsonSafe`) instead of `resource` alone — a circular or `BigInt`-valued `HasCustom.params` previously sailed past the guard and threw uncaught at the store write.
  - `@qadi/react`'s `Hydration.ts` now decodes with `UNTRUSTED_DECODE_OPTIONS`, refusing an excess property on a dehydrated entry or its embedded policy instead of silently stripping it.
  - `SinkCodec.ts`'s `toWire`/`fromWire`/`isRecordJsonSafe` dispatch is now `Match.tagsExhaustive` instead of a ternary/`if` chain — a third `SinkRecord` tag is now a compile error instead of a silent fall-through.
  - Five hand-built one-shot test gates now use `Latch`; `TestClock.testClockWith` replaces a cast-requiring fixture pattern; five duplicated `CollectingTracer` test helpers are consolidated into one shared `@qadi/testing` implementation.
  - The docs' flagship error-handling example now uses `Effect.catchTag` instead of `_tag ===` narrowing.

- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @qadi/core@0.5.0

## 0.4.0

### Minor Changes

- **`decisionStreamRoute` gains an optional `reauth` option.** Without it,
  `/__decisions` authorizes only once, at connect — a revoked or logged-out
  principal whose connection stayed open kept receiving every decision the
  process made for as long as the stream stayed up. `reauth: { interval }`
  re-extracts the subject from the same request and re-evaluates the policy
  against it on that interval, ending the stream on the first failed recheck;
  `EventSource`'s own reconnect recovers through a fresh connect-time check.
  Off by default — it is meaningless without a `SubjectExtractor` whose lookup
  actually consults something revocable. Adds `DecisionStreamOptions` and
  `reauthCheck` (the latter exported so the recheck is testable directly
  against `TestClock`, without a live SSE connection).

  **A frame with a non-JSON-safe resource no longer crashes the whole feed.**
  `decisionStreamRoute` now shares `@qadi/core`'s `isJsonSafe` guard (previously
  duplicated as a private helper inside `@qadi/audit`, now a single shared
  implementation): one bad decision's resource —
  a circular reference, a `BigInt` — drops just that one SSE frame instead of
  throwing out of `JSON.stringify` and ending every subscriber's connection
  over it.

### Patch Changes

- Updated dependencies
- Updated dependencies
  - @qadi/core@0.4.0

## 0.3.0

### Minor Changes

- 6136e3f: The HTTP boundary now fails in the right direction, and the package finally has
  a behaviour specification.

  **An endpoint that declares no authorization is refused.** `RequirePermission`
  served any endpoint carrying no `RequiredPermission` annotation — so adding an
  endpoint to a guarded group and forgetting one line published it, with no signal
  at build time, layer-build time or request time.

  ADR-QD-036 had rejected exactly this, by name, in its Alternatives section:
  _"annotate-and-forget … Rejected: it inverts this library's fail-closed posture
  … by making the **absence** of a permission requirement mean 'unguarded'."_ The
  rejected alternative shipped anyway, and a test asserted it was correct.

  **Breaking.** An endpoint meant to be reachable without authorization now says
  so:

  ```ts
  HttpApiEndpoint.get("health", "/health").pipe((e) =>
    e.annotate(PublicEndpoint, publicEndpoint("liveness probe, no subject exists yet")),
  );
  ```

  The `reason` is required and never read by the middleware — it is there so a
  reviewer can see that someone chose this. An endpoint declaring neither gets
  **500**, not 403: a missing declaration is a wiring mistake in the service, and
  reporting it as a permissions decision sends an operator to audit the wrong
  system. The endpoint's identifier is logged at error level.

  **`SubjectExtractorShape.extract` can now fail.** Its error channel was `never`,
  so an implementor whose token store broke had two options and both violated
  INV-QD-006: `Effect.die`, which escapes the adapters' `catchTag` entirely and
  turns an authorization path into a defect, or falling back to `anonymous`, which
  renders an outage as a denial. It now fails with `SubjectExtractionFailed` and
  both adapters map that to **502**.

  **Breaking**: `subjectExtractorBearer`'s `lookup` may return a failing Effect.
  A request carrying _no_ credential is still a success resolving to `anonymous` —
  that is a different answer from a broken store, and keeping the two apart is the
  point.

  **The Bearer scheme is matched case-insensitively**, per RFC 7235 §2.1. It
  compared `startsWith("Bearer ")`, so a legal `bearer …` had its credential
  silently discarded and was served as anonymous — which denied, so a parsing bug
  presented as a permissions problem.

  **`PolicyTooDeep` maps to 500, not 400.** No path in this package lets a request
  supply a policy, so the "malformed or hostile input" a 400 asserts cannot reach
  it — and a 400 is classified non-retryable client error, so the operator whose
  policy tree is too deep would never have been paged.

  Finally, **`spec/behaviors/23-http.md`** — the package shipped with no behaviour
  document, entering the traceability chain at the Decision link, which is how it
  came to contradict its own ADR unnoticed.

  See BEH-QD-174–180, INV-QD-034, ADR-QD-036 rev 1.3.

- f03d75c: The remaining gaps closed in code, and one open security default decided.

  **The obligation gate is recorded.** A binding obligation nobody discharges turns
  an allow into a refusal at the enforcement boundary, so a log of decisions alone
  showed such a request as `ALLOW` while the caller received
  `UndischargedObligation`. `ObligationRecord` now reports `Discharged`,
  `HandlerFailed`, `Refused` or `NotRequired`, paired to its decision by evaluation
  id.

  Per decision, not per obligation — `ObligationHandler` receives the whole array
  and returns `void`, so which individual duty was met is not knowable without
  changing that contract, and a handler reporting falsely would be unverifiable.
  Reporting cannot change the outcome: a failing handler reports `HandlerFailed`
  and then fails unchanged.

  **Breaking**: `DecisionSinkShape.record` takes `SinkRecord`, a tagged union of
  `DecisionRecord | ObligationRecord`, because discharge happens in `Qadi.ts` after
  `evaluate` has already emitted. `DecisionRecord` gains `_tag: "Decision"`.

  **Ports say which implementation they are.** A service value was an anonymous
  object literal, so the only way to tell a fail-closed default from a real store
  was to call it and infer from the answer — an operator seeing "everything denies"
  could not see that `AttributeResolverNone` was wired. Every port Shape gains an
  optional `name`; every shipped implementation sets it, wrappers compose it
  (`"attributeResolverFromRecord (retrying)"`), and nothing branches on it.

  **Port activity is counted.** `qadi_port_calls_total` and
  `qadi_port_retries_total`. An attribute already on the subject counts nothing,
  which is the short-circuit guarantee visible as an absence. Metrics rather than
  the sink, because `MetricRegistry`'s default is memoised and therefore readable
  with zero wiring, where per-decision correlation would mean threading a collector
  through `evaluateNode` and risking INV-QD-005 for a debug view.

  **`QadiAtoms.asked()`** records the distinct questions an atom set has been
  asked. `Atom.family` keys structurally, so several `<Can>` on one policy are one
  atom; a panel keyed by component instance would invent a distinction the
  architecture does not have, and DOM highlighting is dropped rather than bought
  with a registry [AGENTS.md §13](https://github.com/leaderiop/qadi/blob/main/AGENTS.md) forbids.

  **`/__permissions` is guarded by default.** It publishes every guarded path and
  the permission each requires — a map of what to attack and where — and shipped as
  a bare `PermissionRegistryRoute` constant with no guard of its own.

  **Breaking**: that constant is replaced by
  `permissionRegistryRoute(permission, policy)`.
  `permissionRegistryRouteUnguarded(reason)` is the explicit opt-out and logs a
  warning on every request, so a local choice that reaches production is visible in
  the logs of the environment it is wrong in.

  Two things were **refused** rather than built, and the reasons are recorded: a
  cache TTL, whose natural use ("cache for five minutes") is exactly the
  backend-revocation hazard `DecisionCache`'s own documentation warns about; and
  per-obligation discharge state, above.

  Finally, every package now has a **README** — all five npm pages would have
  rendered blank — plus `homepage`, `bugs`, `engines` and keywords.

  See BEH-QD-195–198, BEH-QD-180 rev 1.1.

- 2227e5e: A live decision feed, and the route that serves it.

  **`decisionSinkFeed`** is the buffering sink ADR-QD-045 deferred — deferred then
  because building one against no transport would have been speculative, built now
  because there is one. Publishing **never blocks and never fails**, whatever the
  reader is doing and including when there is none: a `PubSub.sliding` with
  `publishUnsafe` drops its oldest entry rather than waiting. That is the only
  acceptable behaviour for something an authorization decision waits on.

  Sliding rather than dropping, so a reader that reconnects gets the most recent
  decisions — matching how `decisionSinkRing` evicts, so a reader sees one policy
  rather than two. `replay` hands a joining reader recent records before live ones.

  **`decisionStreamRoute(permission, policy, stream)`** serves `/__decisions` as
  Server-Sent Events.

  **Guarded, with no unguarded variant** — unlike `/__permissions`, and the
  asymmetry is the disclosure. A topology is a map; decisions are the traffic on
  it, including subject ids, verdicts, resources and whatever a `Trace` names about
  why something refused.

  There is deliberately **no `NODE_ENV` gate**. An ambient value deciding who may
  read authorization data is precisely the inversion BEH-QD-174 rejects:
  authorization comes from a policy, and a variable that merely happens to be unset
  must never be what opens a route. A deployment that wants this off does not mount
  it.

  **SSE rather than a WebSocket**, decided by the traffic. Records flow one way, so
  SSE keeps the route on plain HTTP and therefore inside the same router,
  middleware and `guardRoute` as everything else here; a socket's upgrade path sits
  outside all three and would re-answer authorization on its own terms.
  `EventSource` reconnects by itself, which pairs with `replay`.

  Recorded as a cost rather than hidden: SSE is one-way, so a devtools that later
  wants to send something — a replay request, a filter — needs a second channel.

  See BEH-QD-201, BEH-QD-202, ADR-QD-046.

### Patch Changes

- Updated dependencies [efa3435]
- Updated dependencies [dc767f2]
- Updated dependencies [d251db4]
- Updated dependencies [a61dadc]
- Updated dependencies [f1c6aa5]
- Updated dependencies [50bf38a]
- Updated dependencies [2227e5e]
- Updated dependencies [39b7cbe]
- Updated dependencies [0649129]
- Updated dependencies [f03d75c]
- Updated dependencies [0363a5a]
- Updated dependencies [e2a44d9]
- Updated dependencies [73508bb]
- Updated dependencies [0363a5a]
  - @qadi/core@0.3.0
