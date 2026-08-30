# @qadi/http

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
