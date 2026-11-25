---
"@qadi/devtools": minor
---

**Breaking.** The feeds and the dock model take their inputs only through `configure`, and `configure` changes nothing when no input moved. Eight changes:

- `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed` take no argument. A host that passed inputs builds the feed bare and calls `configure` with them; a bare feed is the feed built with `{}` (for the diagnostics feed, `undefined`, which is off), and `configure(inputs)` after it reaches what building with `inputs` reached.
- A `configure` in which no input moved changes nothing: it publishes nothing, restarts nothing and reads no host code, so a registry's `instances()`, a questions thunk and a source are each read only when their input moved. The dock is configured on every host commit and so reads nothing a host did not move.
- An omitted input and one holding `undefined` are one input, and a capacity is compared by the bound it means, so an omitted capacity and `DEFAULT_TIMELINE_CAPACITY` are equal.
- A failed gate-registry watch is retried by any `configure`. A registry that mends without announcing stays `Failed` until it announces, until a tick whose questions changed joins it, or until a `configure` moves an input; a `configure` that moves nothing does not read it, where any `configure` read it before.
- A reader subscribed to a feed or to the dock before its first `configure` hears that `configure`'s publishes, where a feed built with its inputs published nothing to anyone. A headless host configures a feed before it subscribes; `useTimeline`, `useDiagnostics` and `DevtoolsDock` configure before they publish, so a component sees none of them.
- `DiagnosticsOptions` accepts `undefined` for each of `layer`, `collector` and `intervalMillis`, so a host that forwards an optional value needs no conditional spread.
- `DevtoolsDockProps` is the dock model's eight inputs plus its two host props, `unknownParents` and `onInvalidate`, each accepting `undefined`; the dock's inputs are declared once and the hook's separate, package-private input type is deleted.
- `makeSimulationSession` and `useSimulationSession` are unchanged: the session has no `configure`, and its input is read once when it is built.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
