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

What each exports is what a shell crosses, not everything the modules declare.
The root has the three feeds a shell builds in a scope (`makeTimelineFeed`,
`makeDiagnosticsFeed`, `makeGatesFeed`), the simulation session
(`makeSimulationSession`), the wiring the dock takes, the timeline readings
(`verdictOf`, `pairedEntries`, `inspect`, `applyFilters`, `selectionOf`) and the types
those name. The React entry has `DevtoolsDock` and the hooks over the feeds
(`useTimeline`, `useSimulationSession`, `useDiagnostics`). The feeds' engines, the
dock's panels and a screen's mechanics are package-private.

`useDiagnostics` returns `{ status, reading }` from the same feed the dock runs. The
dock's Services and React screens state when sampling is starting or has stopped, and
offer a restart.

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

```typescript
import { describeDecodeRefusal } from "@qadi/core";
import { sourceFromEventSource } from "@qadi/devtools";

export const source = sourceFromEventSource({
  url: "/__decisions",
  // `refusal` is @qadi/core's `DecodeRefusal`, as decoded; match its `_tag`.
  onMalformed: (frame, refusal) => {
    // NotJson            — a broken transport: a proxy truncated or injected.
    // TooDeep            — nested past the decode bound: an older or foreign
    //                      sender, since a current one refuses to emit it.
    // Malformed          — a wire disagreement: the far side disagrees about
    //                      the wire form, including a bare record from a server
    //                      older than 0.10.
    // UnsupportedVersion — a newer server, or a sender with no version:
    //                      upgrade this panel.
    // Inconsistent       — a record that contradicts itself: its decision is
    //                      not its own trace's, or its ids are not its
    //                      record's. Not skew: a hand-built record or tampering.
    console.warn(describeDecodeRefusal(refusal), frame);
  },
  onDisconnect: () => console.info("reconnecting…"),
});
```

Nothing in this package decides CORS. A browser reading a separate API origin is
a deployment's call, and inventing one here would be the wrong place for it.

## Keeping the Services and React panels current

The wiring report, port activity, hydration counts and port calls are pulled, so
something has to read them again. Hand the dock what you already own and it does
the sampling:

```ts
import { DevtoolsDock } from "@qadi/devtools/react";

// <DevtoolsDock diagnostics={{ layer: appLayer, collector }} questions={atoms.asked} />
```

The layer is built once while the dock is mounted and released when it
unmounts, a reading keeps its identity while it is unchanged, and a layer that
fails to build is stated on the Services panel rather than leaving it blank.
The questions are the dock's own prop, beside `gates`, read on the same cadence:
one that throws is stated in the React panel while the sampling carries on.
Hold the fields at module scope: the run restarts when one of them changes
identity. A shell without React builds the feed the dock runs, and the feed states
a stop, as the next section shows.

Under a `QadiProvider`, `@qadi/react` hands you all of that in one call:
`<DevtoolsDock {...useDevtoolsFeed({ collector })} />` supplies `gates` (the
registry the dock subscribes to), `questions`, `onInvalidate` and a `diagnostics`
whose layer is the provider's own build, so the dock reads the cache your decisions filled and nothing needs hoisting.

**Without a provider, the dock's build of your layer is its own build.** A
service that keeps state in its constructor, such as `decisionCacheLayer`'s
cache, is two instances if the dock and your application each build the layer,
and the dock reports its own. Build the context once and give
that one value to both (the shared-context rule is in BEH-QD-323). The
`reading` prop carries a reading taken elsewhere (another process's report, a
fixture) as `{ wiring, activity, hydration, portCalls, questions }`: each field it
carries wins over the sampled one, and a field it omits falls through to the
sample. Its `wiring` is a `WiringRead`, so it can state a failed read as well as
a report.

## Without React: the feeds

A shell of your own builds the three feeds in a scope. Closing the scope ends every
read, and a read that stops is stated in its feed's status instead of leaving a dead
fiber. A `subscribe` listener is yours, and one that throws does not stop the others:
every listener is called, and then what they threw is rethrown out of whatever
published (`configure`, `restart`, a read or tick, or the host registry's own
notification), one value as itself and several as one `AggregateError`. The rest of
that call does not run, so a throw can still leave a feed's status wrong with nothing
running: the gates feed's questions cadence ends, a diagnostics feed stays `Starting`
with no new poll, and a timeline restarted from `Stopped` says `Reading` with nothing
reading. The store a host holds as `timeline` is the feed's one store for its whole
life, and a capacity other than the one it holds is that store's `resize`, so a
subscription on it survives a capacity change. A `configure` with a new `capacity` publishes the emptied timeline and then
starts the read that refills it, from the same `source` or a new one, so a throw on
that publish is rethrown once the read has started and stops no read, unless the
timeline was `Stopped` and a status listener throws on the `Reading` that read
publishes: that throw escapes instead, replaces the timeline listener's, and no read
is started.

```typescript
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import { makeDecisionLog } from "@qadi/core";
import {
  makeDiagnosticsFeed,
  makeGatesFeed,
  makeTimelineFeed,
  type AskedQuestionLike,
  type DiagnosticsStatus,
  type GateRegistryLike,
  type TimelineStatus,
} from "@qadi/devtools";

// A stop is a state of the feed, not a silent dead fiber: say it.
const timelineLine: (status: TimelineStatus) => string = Match.type<TimelineStatus>().pipe(
  Match.tagsExhaustive({
    Reading: () => "timeline: reading",
    Stopped: ({ reason }) => `timeline: stopped (${reason})`,
  }),
);

const diagnosticsLine: (status: DiagnosticsStatus) => string = Match.type<DiagnosticsStatus>().pipe(
  Match.tagsExhaustive({
    Off: () => "diagnostics: off",
    Starting: () => "diagnostics: starting",
    Live: () => "diagnostics: live",
    Stopped: ({ reason, sampled }) =>
      `diagnostics: stopped${sampled ? "" : " before its first sample"} (${reason})`,
  }),
);

export interface HostInputs {
  readonly gates?: GateRegistryLike | undefined;
  readonly questions?: (() => ReadonlyArray<AskedQuestionLike>) | undefined;
}

/** Builds the three feeds in the caller's scope; closing it ends every read. */
export const watch = Effect.fn("example.watch")(function* (report: (line: string) => void, host: HostInputs) {
  const log = yield* makeDecisionLog({ environment: "Server", capacity: 512 });
  const timeline = yield* makeTimelineFeed({ source: log });
  const diagnostics = yield* makeDiagnosticsFeed({ intervalMillis: 1_000 });
  const gates = yield* makeGatesFeed(host);

  // A feed can already be Live or Stopped when its build returns, so say where it is once, then every change.
  const follow = (subscribe: (listener: () => void) => () => void, line: () => string) => {
    report(line());
    subscribe(() => report(line()));
  };
  follow(timeline.timeline.subscribe, () => `${timeline.timeline.getSnapshot().entries.length} entries`);
  follow(timeline.status.subscribe, () => timelineLine(timeline.status.getSnapshot()));
  follow(diagnostics.subscribe, () => diagnosticsLine(diagnostics.getSnapshot().status));
  follow(gates.subscribe, () => {
    const { registry, asked } = gates.getSnapshot();
    return `gates: ${registry._tag}, questions: ${asked._tag}`;
  });

  return { log, timeline, diagnostics, gates };
});

/** Runs until interrupted; interrupting it closes the scope, which is never reported as a stop. */
export const run = (report: (line: string) => void, host: HostInputs = {}) =>
  Effect.scoped(Effect.andThen(watch(report, host), Effect.never));
```

Read `getSnapshot()` once after subscribing, as `follow` does: a feed can already
be `Live` or `Stopped` when its build returns, and a subscription hears only what
changes after it.

`log.layer` is the application's sink, the `DecisionSink` for the code that
evaluates. `timeline.status.restart()` and `diagnostics.restart()` restart a stopped
feed. `configure` replaces the whole input set: `TimelineFeed.configure` reads an
omitted input as `undefined`, and `diagnostics.configure(undefined)` ends the poll
and resets it to `Off`. An omitted `capacity` is `DEFAULT_TIMELINE_CAPACITY`, one bound
with it, so moving between them keeps the timeline and reads nothing again. A
capacity the timeline refuses throws before anything moves, in the feed's
`configure` and in the dock's: the inputs, the timeline and the read are as they
were, and the dock applies a capacity whole or not at all. A shell lays a reading of its own over the feed's with
`mergeReading`, the dock's `reading` rule.

A stop's or a failed read's `reason` (`Stopped`, `WiringRead.Failed`,
`RegistryRead.Failed`, `AskedRead.Failed`) is a `Cause.pretty` trace, with stack
frames and checkout paths, for a developer in the host's own process. It must not
cross a trust boundary: a shell that forwards a feed's readings to a remote viewer
sends the tag, not the reason.

## Environments

`@qadi/core` never claims where it ran — it cannot know whether it is in a
browser, on a server or at an edge — so the **sink** stamps that, and so does
every source here. `environment` is a plain `string` rather than a closed union
because nothing branches on it: it is a label a reader sees, and an unfamiliar
one degrades to an unfamiliar badge rather than to a wrong answer.

## Status

All seven screens are built, and `examples/nextjs-newsroom` mounts the dock with
the props a host supplies wired, and `diagnostics` doing the sampling (the
snapshot props are deliberately left unpassed). See
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
