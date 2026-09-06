---
title: Decision Lifecycle
description: What happens to a Decision after evaluate returns — an optional cache that skips the recompute, and an optional, write-only sink that neither can see back into.
---

`evaluate` always does the same thing: it walks a `Policy` and returns a
`Decision`. What happens *around* that call is opt-in. Two services sit next
to the evaluator, both absent unless an application wires them, and neither
can change what the decision was — one can only make the same question
cheaper to ask twice, and the other can only watch.

<svg viewBox="0 0 680 260" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: evaluate checks the optional DecisionCache for this exact question. On a hit it skips recomputing the trace; on a miss it computes and stores one. Either way, the resulting Decision is handed to the optional DecisionSink, which fans out to a ring buffer, a forwarder, or an SSE feed. Nothing flows back from the sink into the decision.">
  <defs>
    <marker id="dl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="20" y="10" width="140" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="90" y="32" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">evaluate()</text>
  <path d="M 160 27 L 210 27" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <rect x="210" y="10" width="180" height="34" rx="7" fill="none" stroke="var(--sl-color-accent)"/>
  <text x="300" y="32" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-accent-high)">DecisionCache? (optional)</text>
  <path d="M 260 44 L 200 74" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <text x="150" y="70" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">hit → cached trace</text>
  <path d="M 340 44 L 400 74" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <text x="345" y="70" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">miss → compute + store</text>
  <path d="M 200 78 L 340 108" fill="none" stroke="var(--sl-color-gray-3)"/>
  <path d="M 400 78 L 360 108" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <rect x="270" y="108" width="140" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="340" y="130" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">Decision</text>
  <path d="M 340 142 L 340 172" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <rect x="200" y="172" width="280" height="34" rx="7" fill="none" stroke="var(--sl-color-accent)"/>
  <text x="340" y="194" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-accent-high)">DecisionSink? (optional, write-only)</text>
  <path d="M 260 206 L 150 234" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <path d="M 340 206 L 340 234" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <path d="M 420 206 L 530 234" fill="none" stroke="var(--sl-color-gray-3)" marker-end="url(#dl-arrow)"/>
  <text x="150" y="248" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">ring</text>
  <text x="340" y="248" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">forwarding</text>
  <text x="530" y="248" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-white)">SSE feed</text>
  <text x="480" y="130" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">nothing flows back —</text>
  <text x="480" y="144" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">a sink cannot change a decision</text>
</svg>

## `DecisionCache` — skip the recompute, not the record

Absent by default: `evaluate` reads it through `Effect.serviceOption`, so it
adds nothing to `EvaluationServices`, and an application that never provides
one behaves exactly as if this didn't exist
([ADR-QD-031](https://github.com/leaderiop/qadi/blob/main/spec/decisions/031-decision-cache.md)).
When it *is* wired, the key is the **whole subject** — not just the subject's
id — plus the policy, resource, and action. That's a security boundary, not
an implementation detail: an id-only key would serve one subject's allow to
another subject sharing that id (a scoped token and a full token for the same
user, say), the same class of bug an unbound hydration payload would be.

What's cached is the **trace**, never the `Decision` itself. Every call —
hit or miss — still mints its own evaluation id and stamps its own duration,
so a cache hit is indistinguishable from a fresh evaluation except that it's
faster. Concurrent identical asks coalesce: the first caller runs the
computation, and every other caller asking the same question at the same
time awaits that one result rather than starting a redundant second
evaluation.

```typescript
import * as Effect from "effect/Effect";
import { decisionCacheLayer, evaluate } from "@qadi/core";

declare const policy: import("@qadi/core").Policy;

const askTwice = Effect.gen(function* () {
  yield* evaluate(policy); // miss — computes and stores
  yield* evaluate(policy); // hit — same subject, policy, resource, action
}).pipe(Effect.provide(decisionCacheLayer({ capacity: 1000 })));
```

## `DecisionSink` — write-only, and it cannot change a decision

The ninth service, optional on the same terms as the cache
([ADR-QD-044](https://github.com/leaderiop/qadi/blob/main/spec/decisions/044-an-optional-decision-sink.md)).
`evaluate` hands it every completed evaluation and reads nothing back — its
`record` method returns `Effect<void>` with no error channel, and `evaluate`
additionally catches any defect at the call site, so nothing a sink does can
reach back and alter the decision it was just given
([INV-QD-035](https://github.com/leaderiop/qadi/blob/main/spec/invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).
A cache hit doesn't skip the sink either — the trace was reused, but the
sink still receives a full record for that call.

Three implementations, composable through `decisionSinkAll`:

- **`decisionSinkRing`** — a bounded, in-memory log (default capacity 500,
  oldest dropped first) that a devtools overlay reads directly via
  `snapshot`. Bounded by default, unlike the cache: a record log is by
  nature long-lived, so an unbounded default would leak.
- **`decisionSinkForwarding`** — projects each record onto the wire and
  hands it to a caller-supplied `send`. `send` must return promptly — it
  runs inside the evaluation itself — and a delivery failure is reported and
  swallowed, never raised, for the same INV-QD-035 reason.
- **`decisionSinkFeed`** — buffers records in a sliding `PubSub` and exposes
  them as a `Stream`, the shape an SSE route or socket drains at its own
  pace. Publishing never blocks and never fails: a slow or absent reader
  costs the evaluation nothing.

```typescript
import * as Effect from "effect/Effect";
import { decisionSinkRing, evaluate } from "@qadi/core";

declare const policy: import("@qadi/core").Policy;

const sink = decisionSinkRing({ environment: "Server" });

const recordTwo = Effect.gen(function* () {
  yield* evaluate(policy);
  yield* evaluate(policy);
  return yield* sink.snapshot; // 2 records, one per call
}).pipe(Effect.provide(sink.layer));
```

For the cache's concurrency-coalescing guarantees, the sink's exhaustive
`Decision | Obligations` record shape, and the streaming route built on
`decisionSinkFeed`, see
[21 — Decision Cache](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/21-decision-cache.md),
[24 — Decision Sink](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/24-decision-sink.md), and
[26 — Decision Stream](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/26-decision-stream.md).
