# @qadi/core

## 0.3.0

### Minor Changes

- efa3435: Two fail-open defects fixed. Both were found by auditing `@qadi/http`, and both
  live here.

  **`guard` now evaluates the policy against the guarded resource.** It passed
  `resource` to the handler and evaluated with `options.resource`, which no caller
  set — so a resource-scoped policy was checked against nothing.

  This failed **open**, not closed. An absent resource does not deny: a
  `ResourceRef` resolves to `undefined`, and `neq` against `undefined` is `true`.
  A policy written as "the subject's home tenant must differ from the resource's"
  allowed a subject whose home tenant was exactly the resource's, and handed the
  handler an `Authorized<P>` witness for a check that never ran.

  If you use `guardRoute` from `@qadi/http`, its `loadResource` result was reaching
  your handler but not your policy.

  **Breaking**: a `resource` passed in `options` is now overridden by the
  positional one. Two channels for one value is what caused this.

  **The decision cache now keys on the whole subject, not `subject.id`.** An id
  identifies a subject only if it determines that subject's grants. It doesn't:
  a scoped token and a full token for one user share an id and hold different
  permissions, so under an application-scoped cache the first verdict won
  permanently — in both directions. A downgraded token inherited a full token's
  allow; a full token inherited a downgraded token's denial.

  **Breaking**: `DecisionCacheKey.subjectId` is now `DecisionCacheKey.subject`.

  Two structurally equal subjects still hit, so the cache still caches. What
  changes is that staleness is narrower than the docs claimed: a grant revoked in
  the **subject** now re-evaluates, while one revoked only in a store the
  evaluation consults stays cached. Application scope is safe against token
  downgrade and unsafe against backend revocation; per-request scope is safe
  against both.

  Both defects were defended by a doc comment asserting the exact property that
  was missing, which is why neither had been noticed.

  See ADR-QD-043, INV-QD-032, INV-QD-033, BEH-QD-055, BEH-QD-168.

- dc767f2: Six questions the library could pose and could not answer.

  Each was data it already computed and threw away, or a comparison nothing
  implemented. All six were found by auditing a devtools design against the code;
  none of them are devtools features, which is why they live in `@qadi/core`.

  **`policyDepth(policy)`** — `maxDepth` is an evaluation input, so nothing on a
  policy recorded how deep it was, and a caller bounding untrusted decoded input
  had to re-walk the tree and guess at the convention. It counts the way the
  evaluator counts, so `policyDepth(p) <= n` holds exactly when
  `evaluate(p, { maxDepth: n })` does not raise — asserted against `evaluate` in
  both directions, because a depth under-reported by one would declare safe
  precisely the input a caller meant to reject.

  **`permissionProvenance(role)`** — `flattenPermissions` holds the granting
  role's name in its own closure and calls `keys.add` without it, so "inherited via
  viewer" was unanswerable. Kept a separate function because the flatten runs
  inside `makeSubject`, once per subject; the two are held in agreement instead, so
  a screen cannot show a different permission set from the one that decides.

  **`diffTraces` / `flippedAt`** — "which node flipped the verdict" had no
  implementation at all; `isMismatch` compares verdicts and names nothing.
  Differences are addressed by path, ordered parents-first, and a shape divergence
  from short-circuiting is reported rather than descended past.

  **`getOrCompute` reports its outcome**, and a `DecisionRecord` carries it. Cache
  hit/miss was a process-global frequency shared by every cache in the process, so
  an operator could see a rate and never learn about the decision in front of them.
  Absence and `"miss"` are kept distinct: one says nothing was consulted, the other
  says the cache was asked and did not have it. This does not weaken INV-QD-025 —
  a hit still decides identically; only what an observer is told changed.

  **Breaking**: `DecisionCacheShape.getOrCompute` returns `CacheLookup`
  (`{ trace, outcome }`) rather than a bare `Trace`. Only custom `DecisionCache`
  implementations are affected.

  **`DecisionCacheShape.clear`** — a cache could be emptied only by discarding its
  layer scope, which a tool running inside that scope cannot do. In-flight work is
  left alone: those fibers are answering questions asked before the flush.

  **`resolveRoleGraph` reports unknown parents.** The lenient drop is right and
  stays — a partial catalogue is a normal deployment state, and failing closed
  would deny everything rather than granting less. The silence was the defect: a
  typo in one parent name granted fewer permissions than its author wrote, with
  nothing said at any level. Reported once per resolve with every missing name, at
  warning level or through `onUnknownParent`.

  **`@qadi/react` threads the seeded evaluation id into its re-check.** The
  mechanism shipped alongside `DecisionSink` and nothing used it, so a hydrated
  decision and its client re-check still could not be joined. Read with `get.once`,
  so the re-evaluation does not gain a dependency on the seed — the id is
  correlation metadata, not an input to the decision.

  See BEH-QD-189–194, INV-QD-037, INV-QD-038.

- d251db4: Four more screens: the policy explorer, the role viewer, services and cache, and
  the React panel rescoped to questions.

  **The policy rail is observed, not registered.** Every `DecisionRecord` already
  carries the `Policy` it evaluated, so the policies an application uses are in the
  log — `policiesSeen` groups them by `Equal.equals` (structural for plain objects,
  the same property `Atom.family` relies on) and counts their verdicts. An optional
  `catalogue` prop adds names and the policies that have not run yet. No registry,
  no registration call sites, no service whose only consumer is a panel.

  **A structural view states no verdict.** `inspect(policy, undefined)` marks every
  node `NeverResolved`, which reads truthfully in the _inspector_ as "this branch
  was short-circuited" and would say a rule was skipped when it was never run. One
  `PolicyTree` component serves both screens so the difference lives in one place.

  **A required port is never called unwired.** Five of the seven services are in
  `EvaluationServices` — a program that has not provided them does not run — so the
  card reports _defaulted to a fail-closed implementation_ and carries what that
  costs. `name?` says which implementation is behind each port; `portActivity`
  says whether anything ever reached it, read with zero wiring. Those are opposite
  problems with the same symptom.

  **No "acyclic ✓".** A by-value `Role` cannot express a cycle, so the check is
  vacuous there; a tick would report a check that never ran. The screen says why
  there is nothing to report instead.

  **The React panel is keyed by question.** Ten `<Can policy={isAdmin}>` in
  different places are one atom — the library cannot tell them apart, and a panel
  listing ten rows would invent a distinction the architecture does not have. The
  screen says so, because a reader counting rows against their component tree
  would otherwise conclude it is broken.

  `@qadi/core` now exports `portCallsTotal` and `portRetriesTotal`, which existed
  as internal scaffolding and are what makes the "wired but never reached" answer
  possible.

  Two things are deferred with their reasons named: the **simulator**, which runs
  evaluations inside a debug panel rather than reading records and needs a clock
  `@qadi/testing` does not wire; and the **CLI** for the three deployments with no
  browser page, which ADR-QD-049 records as the chosen second shell.

- a61dadc: Field-visibility specs may now be dot-paths, with `*`/`**` wildcards.

  `FieldOptions.fields` stays `ReadonlyArray<string>` — no schema change, no
  new export from `@qadi/core`'s barrel. A spec's terminal segment may now be
  a literal name (unbounded, as today), `**` (unbounded, explicit), or `*`
  (exactly one level: an object-valued child is present but empty, never
  omitted, never shown whole):

  ```ts
  hasPermission(readDoc, { fields: ["id", "author.name", "contact.*"] });
  ```

  Every existing `fields: [...]` array is byte-for-byte behaviorally
  identical after this change: a bare literal is containment-equivalent to
  that key's own `.**`, which is the whole backward-compatibility argument
  for this feature — not just a claim, but a structural property of
  `compareFieldPaths`.

  `intersectFields` gained a real algorithm fix alongside this: the previous
  exact-string-set comparison would have silently denied a field an unbounded
  ancestor spec already covered (`["address.**"]` vs. `["address.street"]`).
  It now compares specs pairwise by containment, and — deliberately — treats
  a `*`-bounded spec against a spec at a different depth as `Incomparable`,
  dropping both sides rather than guessing: whether `*`'s capped disclosure
  of a child is bigger or smaller than a deeper literal spec's own disclosure
  depends on that child's actual runtime shape, not on the specs alone. See
  BEH-QD-056.

- f1c6aa5: Hydration is counted at both ends, and every refusal names its reason.

  `dehydrateDecisions` and `hydrateDecisions` returned their entries and forgot
  them, so the only hydration number a panel could show was the mismatch count —
  and the host had to accumulate that itself. Five metrics now count what crosses
  the network, readable with no wiring through `hydrationActivity`.

  `hydrateDecisions` had three silent exits: a payload naming another subject, an
  atom set `makeQadiAtoms` did not build, and an entry whose policy would not
  decode. All three returned quietly, which is indistinguishable from a page with
  nothing to hydrate. It gains an optional `onDropped` carrying the reason, with a
  development-mode warning by default — the shape `dehydrateDecisions` and
  `onHydrationMismatch` already use.

  The metric declarations are exported from `@qadi/core` rather than restated in
  each package, because `Metric`'s registry key includes the description string: a
  reader re-declaring one with a description that differs by a word gets its own
  registry entry and reads zero, with no error raised.

  Nothing is a breaking change. `hydrateDecisions`'s new parameter is optional, and
  the devtools dock's `hydrationMismatches` prop still works and is shown when the
  new `hydration` prop is absent.

- 50bf38a: The deployment topology is a choice of sink.

  `decisionSinkRing` answers "what did _this_ process decide", and three of the six
  shapes Qadi runs in are not served by that: a replicated server has n rings and a
  reader reaches whichever instance answered its own request, a serverless
  function's ring dies with the invocation, and a browser talking to a separate API
  origin is two processes of which the deciding one has no page.

  **`decisionSinkForwarding({ send })`** projects a record onto the wire and hands
  the encoded value onward. Which socket, which store, which framing and which
  retry policy lie beyond `send` belong to the caller — `@qadi/core` learns nothing
  about transports and gains no dependency that could pull one in. That is the
  payoff for making the port write-only: reading back was left to implementations
  so that the topology could be one.

  **`decisionSinkAll([...])`** writes to every sink in order. The real deployment
  wants both a local ring and a forwarder, and merging two `Layer`s for one service
  does _not_ do that — the later one wins and the first silently sees nothing.

  **`decisionSinkRing(...).ingest(record, environment?)`** is the receiving half.
  `environment` is a parameter rather than the ring's own field because a merged
  log holds rows from several processes, and stamping them all with the
  aggregator's label would erase the one distinction the merge exists to preserve.

  A `send` that fails **or dies** cannot change a decision — a devtools page being
  unreachable is the most ordinary thing that can go wrong here, and an
  authorization request must not fail because nobody is watching. It is reported
  rather than swallowed, through `onFailure` or a warning.

  **`send` must not block.** `record` is awaited inside the evaluation, so records
  stay ordered and reproducible under `TestClock`; a `send` doing a network round
  trip makes every decision wait for it. Enqueue and drain elsewhere. Buffering
  inside the forwarder would remove that hazard rather than warn about it, and is
  deferred rather than guessed at without a real transport to build against.

  See BEH-QD-187, BEH-QD-188, ADR-QD-045.

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

- 39b7cbe: Two lossy projections stopped standing in for the things they projected.

  **A rendered explanation now denotes exactly one policy.** `renderExplanation`
  joined a composite's children with `" and "` / `" or "` and never
  parenthesised, so these two rendered identically:

  ```ts
  anyOf([admin, allOf([editor, onCall])]); // a lone admin IS allowed
  allOf([anyOf([admin, editor]), onCall]); // a lone admin is NOT allowed
  ```

  They are not the same policy. Since this rendering is the only thing an
  administrative screen shows, a reviewer had no way to tell which one they were
  reading. Composite children are parenthesised now; the top level is not, so a
  single requirement or a flat conjunction of them reads exactly as before.

  The same flattening made an obligation ambiguous — `allOf([x, obliged(o, y)])`
  read as though the whole policy owed `o`, when only the second branch does.

  **The decision cache cannot collide.** `keyOf` was `JSON.stringify` over the
  question, and its doc comment defended that as the option with "no chance of
  colliding". It had that backwards:

  | Two different questions                                | One key, because `stringify`        |
  | ------------------------------------------------------ | ----------------------------------- |
  | `{d: new Date(0)}` / `{d: "1970-01-01T00:00:00.000Z"}` | maps a `Date` to its ISO string     |
  | `{a: 1, b: undefined}` / `{a: 1}`                      | drops `undefined`-valued properties |
  | `{n: NaN}` / `{n: null}`                               | renders `NaN` as `null`             |

  A collision served one question's cached decision as another's answer, verdict
  included — so INV-QD-025 ("a hit differs from a miss only in speed and
  identity") was false.

  The fix is a **deletion**: `keyOf` is gone and `DecisionCacheKey` is the
  `HashMap` key itself. Effect's `Equal`/`Hash` compare plain objects
  structurally, which is what `Atom.family` already relied on.

  One behaviour change worth knowing: two structurally equal resources whose
  properties were written in a different order now **hit**. That was previously
  documented as a deliberate miss, and it is safe to drop because the comparison
  is real structural equality rather than a serialization that happens to agree.

  See ADR-QD-042, INV-QD-030, INV-QD-031, BEH-QD-137, BEH-QD-167.

- 0649129: See what your ports were asked, not only that they were asked.

  `qadi_port_calls_total` could tell you an attribute store had been consulted
  ninety-one times and nothing else — its frequency is keyed on the port name, and
  deliberately so, because an attribute name is unbounded and a metric keyed on one
  grows an entry per distinct attribute for the life of the process.

  **In `@qadi/core`**, resolving an attribute through the port now emits a
  `qadi.attribute` span, and `qadi.acted` and `qadi.hasRelationship` carry what they
  asked and what came back: the subject, the attribute or event or relation, the
  resource where there is one, and the answer.

  An attribute the **subject** carries emits nothing — that path asks no port, and
  charging the commonest branch for a debug view would be the wrong trade. Short-
  circuiting is untouched: a branch never reached still performs no lookup and now
  emits no span either.

  **The resolved value is never recorded.** `hasActed` and `hasRelationship` answer
  with closed three-valued enums, safe to report. An attribute resolves to arbitrary
  data and a span attribute reaches whatever backend you wired, so `qadi.resolved`
  is a boolean saying a value came back — never the value. This is the line
  `dehydrateDecisions` already draws with `includeTrace`.

  Costs +4.7 µs on a resolver **miss**, measured against a resolver that answers
  synchronously from a record — an upper bound, since that port costs nothing. Most
  of it is the span rather than the annotations, and it is the same cost the other
  two ports have always paid. If it matters to you, the cheapest fix is to put the
  attribute on the subject, where it measurably costs nothing.

  **In `@qadi/devtools`**, `collectPortCalls()` reads those spans back:

  ```ts
  const collector = collectPortCalls();
  // provide `collector.layer` where your evaluations run
  const log = yield * collector.snapshot;
  ```

  Hand `log` to `<DevtoolsDock portCalls={log} />` and the Services panel lists what
  each port was actually asked, beside the counts it already showed. The two are
  differently scoped and the panel says which is which: the counts come from metrics
  and are process-wide, the calls come from spans and are the recent ones this
  collector saw.

  The collector **wraps** the tracer already in scope rather than replacing it, so
  mounting the dock does not turn your application's tracing off. It is bounded at
  200 calls and reports what it dropped.

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

- 0363a5a: An unwired port now names its own absence.

  **Breaking.** `RelationshipResolverShape.check` returns `RelatedResult` instead
  of `boolean`:

  ```ts
  export type RelatedResult = "Related" | "Unrelated" | "Unknown";
  ```

  Every resolver implementation must change, and so must any `if (yield*
RelationshipResolver.check(...))`. All packages are 0.x, so this rides a `minor`.

  The reason: evaluated with nothing wired, `hasRelationship("owner")` denied with

  > `subject 'u1' has no 'owner' relation to 'doc-1'`

  which is a claim about the contents of a graph that had never been connected. A
  boolean cannot tell the evaluator "the store says no" from "there is no store",
  so an unwired resolver sent readers to audit their edges when the fix was in
  their layer wiring — and the unwired state is the one every ReBAC integration
  starts in. It now denies with

  > `no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed`

  **The verdicts do not move.** Both new arms deny exactly where the boolean
  denied; `RelationshipResolverNever` keeps its name and every default still fails
  closed. What changes is the sentence.

  A three-value union rather than `boolean | "Unknown"`, and _because_ the union
  breaks. The widening would have kept every implementation assignable and every
  truthiness test compiling while `"Unknown"` is truthy — an unwired port silently
  reading as _related_. A compile error is the right failure mode for that.

  Also here: `HasAttribute` and `HasResourceAttribute` distinguish an absent
  attribute from one that compared wrong — `subject attribute 'level' has no
value` rather than `did not match`. Nothing was false before; the diagnosis was
  withheld, and a misconfigured `AttributeResolver` produces the absent case
  exclusively.

  `@qadi/testing`'s `edgeRelationshipResolver` answers `"Related"`/`"Unrelated"`,
  since a fixture edge list is the store and knows.

  See ADR-QD-040, BEH-QD-045, INV-QD-029.

- e2a44d9: A decision can be observed. Until now, nothing could observe one.

  `@qadi/core` had **no observer channel of any kind** — no `PubSub`, no queue, no
  callback, no sink. ADR-QD-009 had deleted all four that once existed, on sound
  reasoning, and what replaced them cannot carry what a reader of a denial needs: a
  span attribute is a flat primitive and a `Trace` is a tree. An `EvaluationError`
  was worse off still — it reached **no** observer at all, so a deployment watching
  `qadi_decisions_total` saw a broken attribute store as a _drop in traffic_.

  **`DecisionSink`** is a new optional service, read through `Effect.serviceOption`
  exactly as `DecisionCache` is. It adds nothing to `EvaluationServices`; an
  application that wires none is unaffected.

  ```ts
  const devtools = decisionSinkRing({ environment: "Server" });

  yield * evaluate(policy, { resource, action: "read" }).pipe(Effect.provide(devtools.layer));

  const records = yield * devtools.snapshot;
  ```

  **A sink cannot change a decision**, enforced twice. `record` returns
  `Effect<void>`, which makes a failing sink _unrepresentable_ — `Effect.fail` is
  not assignable to it. The one gap the type leaves is a **defect**, as
  `Effect.die` or as any body that throws inside `Effect.sync`, which is exactly
  the subversion BEH-QD-175 recorded — so `evaluate` also wraps the call in
  `Effect.catchCause`. Note this is the _opposite_ call from BEH-QD-175 and
  deliberately so: an extractor that cannot reach its token store must change the
  answer; a sink must never be able to. An observer must never be able to deny.

  **A record is complete**, which a `Decision` is not. It carries the `policy`,
  `resource`, `action` and start time — the policy most of all, because `explain`
  takes a `Policy` while a `Decision` carries `trace.policyTag`, a string. The
  explanation of a denial was unreachable from the denial.

  **A failure is a distinct outcome.** `DecisionOutcome` is `Decided | Failed`, so
  a broken dependency can never be mistaken for a denial, and
  `qadi_evaluation_errors_total` is added — a frequency keyed on the error tag.

  **`EvaluateOptions.evaluationId`** is added, opt-in. A decision made on the
  server, dehydrated, and re-checked on the client is one question answered twice,
  and with a freshly minted id at each end nothing joins them. The default is
  unchanged — a fresh id per call, cache hit or miss — because a cache hit is a
  repeat rather than a continuation, and only a caller can tell those apart.

  A record carries **no environment**: core cannot know whether it runs in a
  browser, on a server, or at an edge, so the sink implementation stamps it.
  `decisionSinkRing` requires one, and is bounded by default (500) unlike
  `decisionCacheLayer` — a record log is long-lived by nature, where a cache is
  usually scoped to one request.

  See BEH-QD-181–186, INV-QD-035, INV-QD-036, ADR-QD-044.

- 73508bb: A record can cross a process boundary.

  An in-memory sink hands a consumer real objects. Anything that crosses a
  boundary — a socket to a devtools page, a replica forwarding to a shared store, a
  serverless function shipping its log before it dies — needs a form that survives
  JSON and can be rebuilt on the far side, and `SinkRecord` had none.

  `toWire` / `fromWire` project between the record and its wire shape;
  `encodeRecord` / `decodeRecord` go through the schema. The wire shape lives
  beside the record it describes rather than inside whichever transport carries it
  first, because it is a contract two processes agree on.

  **Decoded as untrusted.** A record crossing a process boundary crosses a trust
  boundary, which is the reasoning ADR-QD-002 applies to policies. `decodeRecord`
  validates rather than casts, so a payload naming a policy shape the ADT does not
  have is refused rather than walked.

  **Errors carry their stable code.** `ERROR_CODES` has said since it was written
  that it exists "for logging and cross-process correlation"; this is that use. The
  code is written on encode and **ignored on decode** — the tag rebuilds the error,
  because trusting a sender's code to choose a class would let it name one error
  and receive another.

  The mapping is hand-written, and that is forced: AGENTS.md §4 requires
  `Data.TaggedError` and explicitly not `Schema.TaggedErrorClass`, so the errors
  cannot be Schema-derived where they are defined. A round-trip property over
  generated policies stands in for the gate the policy codec gets.

  Two losses are recorded rather than hidden:
  - an error's `cause` is `unknown` — possibly an `Error`, a circular object, or a
    function — so it is **rendered to a string**. An `Error` keeps its message; a
    value whose `toString` throws yields a marker, because the encoder a transport
    calls must never be able to break the thing it observes.
  - an explicitly-`undefined` optional field arrives **absent**, since
    `Schema.optional` drops absent keys. Both read as `undefined`.

  A decision record naming neither outcome decodes to a `Failed` that says so.
  Unreachable for anything this library encodes, but the wire is untrusted, and a
  row reading "the sender sent neither outcome" beats a silently dropped record.

  See BEH-QD-199, BEH-QD-200.

- 0363a5a: A denial now explains itself where it surfaces.

  `renderTrace(trace, options?)` renders an evaluation tree as plain text — the
  decision-side counterpart to `renderExplanation`. An explanation says what a
  _rule_ requires and takes no subject; a trace says what _happened_ to one
  subject. Both renderings now live in the library, and neither derives from the
  other.

  `AccessDenied` gained a `trace` field. Its doc comment had claimed to carry one
  since it was written; it did not. Enforcement is where most callers meet a
  denial — `assert`, `enforce`, `enforceProjected`, `guard`, the `@qadi/promise`
  rejection, the `@qadi/http` status mapping — and it was the one path that built
  the whole tree and then dropped it, keeping only the root sentence.

  **Breaking**: `AccessDenied` now requires `trace`. Code constructing one
  directly must pass it; code catching one is unaffected.

  Unchanged on purpose: `toResponse` still returns an empty body for every
  enforcement tag, and hydration still withholds the trace by default. A trace
  names every node's tag, its label and why it refused — it belongs in a log, an
  error or a test failure, not a response body.

  See ADR-QD-039, BEH-QD-054, BEH-QD-144.
