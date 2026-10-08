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

## Keeping the Services and React panels current

The wiring report, port activity, hydration counts and port calls are pulled,
not pushed, so something has to read them again. That is the dock's job when
handed `diagnostics`; a host hands over what it already owns and runs no Effect
and no timer. Under a `QadiProvider`, `@qadi/react` hands over all of the atom
set's half in one call:

```tsx
import { collectPortCalls } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
import type { AuthSubject } from "@qadi/core";
import { QadiProvider, makeQadiAtoms, useDevtoolsFeed } from "@qadi/react";
import type { QadiLayer } from "@qadi/react";

declare const AppLayer: QadiLayer;
declare const currentUser: AuthSubject;

const atoms = makeQadiAtoms(AppLayer); // once, at module scope
const collector = collectPortCalls({ capacity: 200 });

// Held at module scope: the run restarts when one of these changes identity.
const extras = { collector };

const Dock = () => {
  const feed = useDevtoolsFeed(extras);
  return <DevtoolsDock {...feed} />;
};

export const App = () => (
  <QadiProvider atoms={atoms} subject={currentUser}>
    <Dock />
  </QadiProvider>
);
```

`useDevtoolsFeed` returns `gates`, `onInvalidate` and `diagnostics`, and
`diagnostics` carries your `extras` plus the two fields the feed owns: a `layer`
that is the provider's own built services, and `questions`. Because that layer is
the registry's own build, a service that keeps state in its constructor, such as
`decisionCacheLayer`'s cache, is one instance shared by the decisions and the
dock; nothing needs hoisting out of the atom set. Setting `layer` or `questions`
in your extras is a compile error.

The layer is held while the dock is mounted and released when it unmounts, a
reading keeps its identity while nothing changed, so the dock does not re-render
on every tick, and a layer that fails to build is stated on the Services panel,
with the other reads carrying on. Gates are not sampled: they come from the
provider's registry and the feed reads them for you.

**A host with no `QadiProvider`** (a shell running `runDiagnostics`) hands the
dock a layer of its own, and the dock's build of it is its own: a service that
keeps state in its constructor is two instances if the dock and the application
each build the layer. Build the context once and give that one value
to both.

The `reading` prop carries a reading taken elsewhere, such as another process's
report, as `{ wiring, activity, hydration, portCalls, questions }`. Each field it
carries wins over the sampled one and a field it omits falls through to the
sample, so a dock can sample this process's activity and show another process's
wiring. Its `wiring` is a `WiringRead`, so it can state a failed read as well as a
report.

## What it renders

`DevtoolsDock` is a dock the host mounts explicitly; nothing in the package
runs on import or installs itself. The panels it composes (the decision log,
the inspector, the policy explorer, the role viewer, the Services, Simulator and
React panels) are what the dock draws, **not exports**: a host mounts the dock
and hands it a `source`, a `catalogue`, `diagnostics` and `gates`.

What the headless model exports is what a shell crosses: three stores, the wiring
the dock takes, and the readings of a timeline.

- **Stores.** `makeTimelineStore` and `runSource` hold the timeline;
  `makeSimulationSession` holds the simulator; `makeDiagnosticsStore` and
  `runDiagnostics` hold what the dock samples. `@qadi/devtools/react` has the
  React half of each (`useTimeline`, `useSimulationSession`, `useDiagnostics`).
- **Inspection** (`inspect`, `flattenTree`) — walking a decision's evaluation
  tree, including nodes that never resolved or were truncated; with verdict
  classification (`verdictOf`), pairing, filters and selection.
- **Simulation and what-if** (`makeSimulationSession`) — replaying a decision
  against edited inputs to see what would have changed. The session holds the
  simulator's state headlessly: its `snapshot.plan` says what a sweep will cost
  before it runs, `run("Sweep")` produces the `run.report`, a source that cannot
  be honoured is refused rather than answered from fixtures, a Live run captures
  for `Snapshot`, and a superseded run never lands. The sweep, the capture and the
  replay it is made of are package-private.
- **Wiring and hydration reports** (`wiringReport`, `portActivity`,
  `hydrationActivity`) — which ports are in use, and the counters `@qadi/react`
  writes and this package reads, covering drops, mismatches, and rechecks between
  a server render and its client. Which mounted `Can`/`Cannot` gates are asking
  what is the dock's Questions panel, fed `gates` by the host.

`environment` is a plain `string` on every record, not a closed union, because
nothing here branches on it — it is a label a reader sees, and an unfamiliar
value degrades to an unfamiliar badge rather than to a wrong reading.

See [behavior 27](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/27-devtools-timeline.md)
and [`spec/devtools-spec/`](https://github.com/leaderiop/qadi/tree/main/spec/devtools-spec)
for the full design.
