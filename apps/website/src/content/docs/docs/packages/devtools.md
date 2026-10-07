---
title: "@qadi/devtools"
description: A headless decision timeline for @qadi/core, plus a React dock that renders it — observability tooling, not part of enforcement.
---

`@qadi/devtools` turns Qadi's decisions into something a person reads. Qadi
decides authorization in whichever process holds the policy — a browser, a
server, an edge worker, several replicas at once — and `@qadi/core`'s
`DecisionSink` makes those decisions observable, with `@qadi/http`'s
`/__decisions` making them reachable over the network. This package is the
consumer: tracing spans, port metrics, and decision sinks, assembled into a
timeline and a set of panels.

It is observability tooling. Nothing in it is wired into production
enforcement — a policy's outcome does not depend on whether this package is
installed, imported, or mounted.

## Two entry points, and the split is the point

```ts
import { emptyTimeline, ingest, sourceFromEventSource } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
```

`@qadi/devtools` is **headless**: decoding, merging, ordering, pairing, and
inspection, with no React anywhere in it. `@qadi/devtools/react` renders that
model and computes nothing of its own. `react` is an optional peer dependency
for exactly that reason — a backend aggregator can consume the model without
pulling in a UI at all.

## The model absorbs a hostile feed

Decision records arrive from several processes at once, and none of them
promises order, uniqueness, or completeness: a reconnecting `EventSource` reads
the server's backlog again, so a record may arrive twice; merging two sources interleaves two
clocks; and a decision's obligation outcome is emitted after `evaluate`
already returned, so the two halves of one story can arrive out of sequence.
`Timeline` absorbs all of that, so everything downstream may assume its
entries are ordered, unique, and joined.

```ts
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { makeDecisionLog } from "@qadi/core";
import { emptyTimeline, ingestAll } from "@qadi/devtools";

const program = Effect.gen(function* () {
  // One value per process: `log.layer` goes to the application as its
  // `DecisionSink`, and the log itself is a `Source` devtools reads.
  const log = yield* makeDecisionLog({ environment: "Server", capacity: 512 });

  return yield* Effect.scoped(
    Effect.gen(function* () {
      // One read: the backlog, then the live stream — each record exactly once.
      const { backlog, live } = yield* log.read;
      const next = yield* Stream.runCollect(Stream.take(live, 10));
      return ingestAll(emptyTimeline(), [...backlog, ...next]);
    }),
  );
});
```

A `Source` is one scoped `read` that hands over the past and the future
together, so nothing made between them is lost or repeated. Three shapes cover
it:

| | Answers for the past | Answers for the future |
| - | - | - |
| `sourceFromRecords` | a fixed array | — |
| a `DecisionLog`, passed as is | its backlog | in-process |
| `sourceFromEventSource` | the server's prelude, when it sends one | across processes, over SSE |

The environment label is stated once, where the log is made; over SSE it
travels inside each frame, so `sourceFromEventSource` states none. A frame must
be a `{ environment, record }` envelope whose record is wire version 2. A bare
record from a server older than 0.10 is reported as `"not-a-record"`, and a
version-1 record as `"unsupported-version"`; see
[Upgrading to 0.11](/docs/reference/upgrading/#peers-on-09-or-earlier).

A frame that is not JSON, one that does not decode, or a server that
disconnects each drops one row and reports why via an `onMalformed`/
`onDisconnect` callback, rather than taking the panel down — a devtools panel
is what you look at when something is already wrong, so it has to survive a
bad frame.

## What it renders

`DevtoolsDock` (and the panels it composes — `DecisionLog`, `Inspector`,
`PolicyExplorer`, `RoleViewer`, `ServicesPanel`, `Simulator`, `WhatIfTable`,
`QuestionsPanel`) is a dock the host mounts explicitly; nothing in the package
runs on import or installs itself. Beyond the raw decision log, the model
supports:

- **Inspection** (`inspect`, `flattenTree`) — walking a decision's evaluation
  tree, including nodes that never resolved or were truncated.
- **Simulation and what-if** (`simulate`, `whatIf`, `sweepPlan`) — replaying a
  decision against edited inputs to see what would have changed. The simulator
  screen's state is a headless `SimulationSession` (`makeSimulationSession`): a
  source that cannot be honoured is refused rather than answered from fixtures,
  a Live run captures for `Snapshot`, and a superseded run never lands.
- **Wiring and gate reports** (`wiringReport`, `gateGroups`) — which ports are
  in use, and which mounted `Can`/`Cannot` gates are asking what.
- **Hydration activity** (`hydrationActivity`) — the counters
  `@qadi/react` writes and this package reads, covering drops, mismatches, and
  rechecks between a server render and its client.

`environment` is a plain `string` on every record, not a closed union, because
nothing here branches on it — it is a label a reader sees, and an unfamiliar
value degrades to an unfamiliar badge rather than to a wrong reading.

See [behavior 27](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/27-devtools-timeline.md)
and [`spec/devtools-spec/`](https://github.com/leaderiop/qadi/tree/main/spec/devtools-spec)
for the full design.
