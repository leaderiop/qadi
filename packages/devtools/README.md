# @qadi/devtools

Devtools for [`@qadi/core`](../core): a headless decision timeline, and a React
dock that renders it.

Qadi decides authorization in whichever process holds the policy — a browser, a
server, an edge worker, or several replicas at once. `@qadi/core`'s
`DecisionSink` makes those decisions observable and `@qadi/http`'s
`/__decisions` makes them reachable. This package is what turns them into
something a person reads.

## Two entry points, and the split is the point

```ts
import { emptyTimeline, ingest, sourceFromEventSource } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
```

`@qadi/devtools` is **headless**: decoding, merging, ordering, pairing and
inspection, with no React anywhere in it. `@qadi/devtools/react` renders that
model and computes nothing. A backend aggregator can consume the first without
pulling in a UI, and `react` is an optional peer dependency for exactly that
reason.

## The model absorbs a hostile feed

Records arrive from several processes at once, and none of them promises order,
uniqueness or completeness. `EventSource` reconnects by itself and the server
sends its backlog again, so the same record can arrive twice; a merge interleaves two clocks, so
records arrive out of order; and a decision's obligation outcome is emitted
after `evaluate` returned, so the two halves of one story can arrive backwards.

`Timeline` absorbs all of it, and everything downstream may assume entries are
ordered, unique and joined.

```ts
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { makeDecisionLog } from "@qadi/core";
import { emptyTimeline, ingestAll } from "@qadi/devtools";

const program = Effect.gen(function* () {
  // One value per process: `log.layer` goes to the application as its
  // `DecisionSink`, and the log itself is a `Source` the devtools reads.
  const log = yield* makeDecisionLog({ environment: "Server", capacity: 512 });

  return yield* Effect.scoped(
    Effect.gen(function* () {
      // One read: the backlog, then the live stream — each record exactly once.
      const { backlog, live } = yield* log.read;
      return ingestAll(emptyTimeline(), [...backlog, ...(yield* Stream.runCollect(Stream.take(live, 10)))]);
    }),
  );
});
```

### Three sources

| | Answers for the past | Answers for the future |
| - | - | - |
| `sourceFromRecords` | ✅ a fixed array | — |
| a `DecisionLog` (passed as is) | ✅ its backlog | ✅ in-process |
| `sourceFromEventSource` | ✅ the server's prelude, when it sends one | ✅ across processes, over SSE |

A `Source` is one scoped `read` returning both halves together, so nothing made
between the backlog and the live stream is lost or repeated. `backlog` is
**optional rather than empty by default**, and the distinction carries meaning:
absent is "this source cannot answer for the past" (a server older than the
prelude), while an empty array is "it can, and there is nothing". A reader says
"no history available" for the first and "no decisions yet" for the second.

The environment label is stated once, where the log is made. Over SSE it
travels inside each frame, so `sourceFromEventSource` states none.

### Nothing here can take down the panel

A frame that is not JSON, a frame that does not decode, a server that goes
away — each drops one row and reports why. A devtools panel is what you are
looking at when something is already wrong, so a panel that dies on a bad frame
fails exactly when it is needed.

```ts
import { sourceFromEventSource } from "@qadi/devtools";

const source = sourceFromEventSource({
  url: "/__decisions",
  onMalformed: (frame, reason) => {
    // "not-json"            — a broken transport: a proxy truncated or injected.
    // "too-deep"            — nested past the decode bound: an older or foreign
    //                         sender, since a current one refuses to emit it.
    // "not-a-record"        — a protocol mismatch: the far side disagrees about
    //                         the wire form.
    // "unsupported-version" — a newer server: upgrade this panel.
    console.warn(reason, frame);
  },
  onDisconnect: () => console.info("reconnecting…"),
});
```

Nothing in this package decides CORS. A browser reading a separate API origin is
a deployment's call, and inventing one here would be the wrong place for it.

## Environments

`@qadi/core` never claims where it ran — it cannot know whether it is in a
browser, on a server or at an edge — so the **sink** stamps that, and so does
every source here. `environment` is a plain `string` rather than a closed union
because nothing branches on it: it is a label a reader sees, and an unfamiliar
one degrades to an unfamiliar badge rather than to a wrong answer.

## Status

All seven screens are built, and `examples/nextjs-newsroom` mounts the dock with
twelve of `DevtoolsDockProps`' thirteen optional fields wired (all but
`capacity`, which has a sensible default). See
[`spec/devtools-spec/`](../../spec/devtools-spec) for the design and
[behaviour 27](../../spec/behaviors/27-devtools-timeline.md) for the normative
rules.

> **Corrected in CCR-QD-076.** This read "Increment 3 is in progress. The model is
> built; the dock is not yet complete" for six increments after the dock was
> finished. Nothing gates a package README: `check-devtools-claims.mjs` covers
> only `spec/devtools-spec/`, and `check-api-surface.mjs` reads only
> `spec/overview.md`. Found while writing the example, which is the first thing
> that had to consume this package as a stranger would.

## License

MIT
