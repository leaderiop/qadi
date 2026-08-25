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
import { emptyTimeline, ingest, sourceFromFeed } from "@qadi/devtools";
import { DevtoolsDock } from "@qadi/devtools/react";
```

`@qadi/devtools` is **headless**: decoding, merging, ordering, pairing and
inspection, with no React anywhere in it. `@qadi/devtools/react` renders that
model and computes nothing. A backend aggregator can consume the first without
pulling in a UI, and `react` is an optional peer dependency for exactly that
reason.

## The model absorbs a hostile feed

Records arrive from several processes at once, and none of them promises order,
uniqueness or completeness. `EventSource` reconnects by itself and a feed may be
replaying, so the same record arrives twice; a merge interleaves two clocks, so
records arrive out of order; and a decision's obligation outcome is emitted
after `evaluate` returned, so the two halves of one story can arrive backwards.

`Timeline` absorbs all of it, and everything downstream may assume entries are
ordered, unique and joined.

```ts
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { decisionSinkFeed } from "@qadi/core";
import { emptyTimeline, ingest, sourceFromFeed } from "@qadi/devtools";

const program = Effect.gen(function* () {
  const feed = yield* decisionSinkFeed({ capacity: 512, replay: 64 });
  const source = sourceFromFeed({ stream: feed.stream, environment: "Server" });

  // `feed.layer` goes to the application; the source is what the devtools reads.
  return yield* Stream.runFold(source.live, emptyTimeline(), ingest);
});
```

### Three sources

| | Answers for the past | Answers for the future |
| - | - | - |
| `sourceFromRecords` | ✅ a fixed array | — |
| `sourceFromFeed` | only if given a ring's `snapshot` | ✅ in-process |
| `sourceFromEventSource` | — | ✅ across processes, over SSE |

`backlog` is **optional rather than empty by default**, and the distinction
carries meaning: absent is "this sink cannot answer for the past", while an
empty array is "it can, and there is nothing". A reader says "no history
available" for the first and "no decisions yet" for the second.

### Nothing here can take down the panel

A frame that is not JSON, a frame that does not decode, a server that goes
away — each drops one row and reports why. A devtools panel is what you are
looking at when something is already wrong, so a panel that dies on a bad frame
fails exactly when it is needed.

```ts
import { sourceFromEventSource } from "@qadi/devtools";

const source = sourceFromEventSource({
  url: "/__decisions",
  environment: "Server",
  onMalformed: (frame, reason) => {
    // "not-json"      — a broken transport: a proxy truncated or injected.
    // "not-a-record"  — a protocol mismatch: the far side disagrees about the
    //                   wire form.
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
every one of `DevtoolsDockProps`' twelve fields wired. See
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
