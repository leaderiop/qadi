---
"@qadi/devtools": minor
---

New package: `@qadi/devtools`, the surface for the decision data plane.

Two entry points. `@qadi/devtools` is the **headless model** — three source
adapters (`sourceFromRecords`, `sourceFromFeed`, `sourceFromEventSource`), the
`Timeline` fold that merges them, and a subscribable `TimelineStore` — with no
React anywhere in it. `@qadi/devtools/react` adds one `useSyncExternalStore`
hook and computes nothing, so a server-side aggregator can consume the model
without a UI and `react` is an *optional* peer dependency.

The model is what absorbs a feed that promises nothing. `EventSource` reconnects
by itself and a feed may be replaying, so a record arrives twice; a merge
interleaves two clocks, so records arrive out of order; and an obligation
outcome is emitted after `evaluate` returned, so the two halves of one story
arrive backwards. All of that is handled here and nowhere else, and everything
downstream may assume entries are ordered, unique and joined.

Three things it deliberately does **not** do: it never collapses a server
decision and its client re-check, because sharing an evaluation id is the whole
pairing story; it never lets a bad frame take down the panel, because a panel is
what you are looking at when something is already wrong; and it never decides
CORS, because a browser reading a separate API origin is a deployment's call.

`onMalformed` reports *why* a frame was dropped — `"not-json"` is a broken
transport, `"not-a-record"` is a protocol mismatch — because they have different
fixes and a reader that cannot tell them apart debugs the wrong one.

The model joins the mutation gate at core's threshold, through a second Stryker
configuration (`stryker.devtools.mjs`); it currently sits at 100% with no
survivors. Three separate rounds of it found dead code rather than weak tests: a
sequence-number tie-break that stable sorting already provided, a three-way
comparator whose `-1` and `0` were the same answer to the only question asked of
it, and two redundant guards. All four were deleted rather than pinned.
