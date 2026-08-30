# @qadi/react

## 0.3.0

### Minor Changes

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

- 0363a5a: Fix a client-side authorization bypass in decision hydration.

  A server-rendered decision was seeded directly into the decision atom, where
  `AtomRegistry` preserves a seeded value over the one the node computes. An
  asynchronous evaluation escaped that by publishing on a later turn; a
  **synchronous** one publishes by returning, and was discarded. Every policy that
  needs no resolver evaluates synchronously, so a subject could keep a
  server-issued allow they no longer qualified for, for the life of the page.

  A seed now lives in its own atom, and the decision a consumer reads consults it
  only while this client has never answered. Once it has — allow, deny or failure —
  that answer is authoritative, including while a later re-check is in flight.

  Behaviour change: for a synchronously-evaluated policy the client answers on the
  first read, so the seed is not observed and the `evaluationId` reported is the
  client's own rather than the server's. The correlation guarantee of BEH-QD-148
  still holds of the payload and of the seeded decision, and remains observable
  wherever the seed is what is being read.

  See ADR-QD-039, INV-QD-028, BEH-QD-151.

- 39b7cbe: The package declares its client boundary, and server rendering is now tested.

  `QadiProvider`, `Can`/`Cannot`, the hooks and the atom graph carry
  `"use client"`. `Hydration.ts` and the barrel deliberately do **not**:
  `dehydrateDecisions` exists to be called during server rendering, and a blanket
  directive would turn it into a client reference a Server Component cannot
  invoke. Per-file directives keep both halves reachable through one entry point.

  To be clear about what this does and does not change: `"use client"` marks a
  bundler boundary, it does not disable SSR. A Client Component is still rendered
  to HTML on the first request and hydrated afterwards.

  **There was no server-rendering test of any kind.** There is one now, through
  `renderToString`, covering the `getServerSnapshot` path React throws without,
  and the claim hydration exists for — a seeded decision present in the _first_
  HTML rather than after a pending frame.

  One thing that test made clear, and which is worth stating: a policy needing no
  resolver answers during the server pass and never observes its seed. Hydration
  covers policies that reach a resolver, which cannot settle inside a single
  synchronous render however fast the resolver is.

  **`dehydrateDecisions` now says what it dropped.** It discards every entry not
  belonging to the payload's subject — correct, and unchanged — but did so in
  silence, so a server that accidentally mixed subjects shipped one row where it
  meant to ship a thousand and saw nothing wrong. `DehydrateOptions.onDropped`
  takes the same shape as `onHydrationMismatch`: a development-mode warning by
  default, replaced by a supplied callback which then runs in production too.

  The default message carries a count and nothing else — no subject, no policy. A
  dropped decision belongs to another user, and printing it would be the
  disclosure the drop exists to prevent.

  See BEH-QD-067, BEH-QD-146.

- ab7301b: A guard can say that it exists, and the devtools can point at it.

  `QadiProvider` takes `instrument`, off by default. With it on, every `<Can>`,
  `<Cannot>`, `useCan`, `useDecision` and `useDecisionSuspense` records its policy,
  its resource and what it rendered, and the two component guards wrap their output
  in a `display: contents` span — which generates no box, so no layout changes.

  The React panel lists those under each question and offers two directions:
  **highlight**, which draws over every guard asking a question, and **pick**, which
  outlines the guard under the pointer and selects its row. A guard that rendered
  nothing is still pointed at, which is the answer to "why is this button missing".

  This reverses a documented conclusion. The panel previously said a per-instance
  view was unobtainable, on the grounds that `Atom.family` keys structurally and so
  ten gates on one policy are one atom. That is true of the _atom layer_ and does
  not follow for components; the panel is still keyed by question, with the guards
  listed underneath.

  Nothing is a breaking change. `instrument` defaults to `false`, and off means no
  registration and no wrapper element — the DOM is byte for byte what it was.

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

- 0363a5a: A hydration mismatch now says so.

  When a server seed and this client's own answer disagree, the disagreement is
  reported. `makeQadiAtoms` takes an optional second argument:

  ```ts
  makeQadiAtoms(layer); // warns, in development
  makeQadiAtoms(layer, { onHydrationMismatch: report }); // routed, always
  ```

  The previous release made the client's answer supersede the seed, which is
  correct and was silent. Seen from outside, a mismatch is a guarded control that
  renders on first paint and vanishes on hydration — on every page, with no
  explanation. The usual cause is not a grant that changed in the last two hundred
  milliseconds; it is a client wired differently from the server, most often one
  with no `RelationshipResolver` where the server has one. A configuration error
  presenting as a rendering glitch is close to the worst available presentation
  for it.

  ```
  [qadi] hydration mismatch for HasRelationship: the server allowed, this client
  denied — no relationship resolver is wired, so no 'owner' relation to 'doc-1'
  can be confirmed. This client's answer is the one in effect.
  ```

  Nothing about precedence changes. The reporter is handed two decisions and
  returns `void`; by the time it runs, the client's answer is already the one in
  effect.

  Three scoping rules come with it. A mismatch is a difference of **verdict** —
  two allows differing in visible fields are not one. A client-side **failure** is
  not a disagreement, because there was no answer for the server's to disagree
  with. And it reports **once per question**, not once per re-evaluation.

  The callback replaces the console warning rather than adding to it, and runs in
  production: a server and a client disagreeing about an authorization question is
  signal worth reporting, and can indicate a page cached and served to the wrong
  user as readily as a wiring error.

  `console` and `process.env` are new to this package and confined to one file
  that is not exported. A bundler folds `process.env.NODE_ENV` and eliminates the
  warning from a production build.

  See ADR-QD-041, BEH-QD-152.

- 0363a5a: `Can` and `Cannot` now hand their denial to the node that replaces it.

  `Can`'s `fallback` and `Cannot`'s `children` accept `DeniedNode` — a
  `ReactNode`, or a function of the `Deny` that produced it:

  ```tsx
  <Can policy={canEdit} fallback={(denial) => <Hint reason={denial.reason} />}>
    <EditButton />
  </Can>
  ```

  The guard was already holding the denial, with its reason and its whole trace,
  at the moment it decided to render nothing — and discarded it. "Why is this
  control not here?" was the one question the declarative API could not answer.

  A plain node stays the common case, so this is a union rather than a required
  function and every existing `fallback` keeps working.

  One rule comes with it: **a function `fallback` is not reused for the failure
  branch.** `failure` still defaults to a node fallback, but a function fallback
  is written to explain a refusal, and during an outage no refusal happened — so
  it renders nothing instead, which is still closed. Failure is not denial.

  See BEH-QD-072.

### Patch Changes

- 2cbf9e3: A test now pins that a `DecisionSink` provided in the layer `makeQadiAtoms` is
  built from reaches the atom runtime, so browser-side decisions are recorded.

  It always did — `DecisionSink` is optional, so it is absent from
  `QadiRuntimeServices` and nothing in the types said a layer may carry one — but
  that was verified with a throwaway probe rather than a test. It is the client
  half of the server/client pairing a merged devtools timeline depends on, so it is
  asserted rather than assumed.

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
