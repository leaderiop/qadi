---
"@qadi/core": minor
---

A decision can be observed. Until now, nothing could observe one.

`@qadi/core` had **no observer channel of any kind** — no `PubSub`, no queue, no
callback, no sink. ADR-QD-009 had deleted all four that once existed, on sound
reasoning, and what replaced them cannot carry what a reader of a denial needs: a
span attribute is a flat primitive and a `Trace` is a tree. An `EvaluationError`
was worse off still — it reached **no** observer at all, so a deployment watching
`qadi_decisions_total` saw a broken attribute store as a *drop in traffic*.

**`DecisionSink`** is a new optional service, read through `Effect.serviceOption`
exactly as `DecisionCache` is. It adds nothing to `EvaluationServices`; an
application that wires none is unaffected.

```ts
const devtools = decisionSinkRing({ environment: "Server" });

yield* evaluate(policy, { resource, action: "read" }).pipe(
  Effect.provide(devtools.layer),
);

const records = yield* devtools.snapshot;
```

**A sink cannot change a decision**, enforced twice. `record` returns
`Effect<void>`, which makes a failing sink *unrepresentable* — `Effect.fail` is
not assignable to it. The one gap the type leaves is a **defect**, as
`Effect.die` or as any body that throws inside `Effect.sync`, which is exactly
the subversion BEH-QD-175 recorded — so `evaluate` also wraps the call in
`Effect.catchCause`. Note this is the *opposite* call from BEH-QD-175 and
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
