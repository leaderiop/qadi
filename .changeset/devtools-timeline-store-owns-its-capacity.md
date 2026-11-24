---
"@qadi/devtools": minor
---

**Breaking.** A timeline store owns its capacity, so the store a host holds is the one the read feeds, and a refused capacity changes nothing. Eight changes:

- `TimelineStore` gains the required `resize(capacity): boolean`, so an object a host writes as a `TimelineStore`, a test double or a wrapper, needs one. It answers `false` and changes nothing for the capacity the store already holds, throws before anything moves for a capacity the timeline refuses, and for any other capacity empties the timeline at the new bound, releases a pause, publishes once and answers `true`.
- `feed.timeline` is the feed's one store for the feed's life, and a capacity change is that store's `resize`. A subscription on `feed.timeline` survives a capacity change and hears the emptied timeline, where the feed handed out a forwarder over a store it replaced.
- An omitted capacity and `DEFAULT_TIMELINE_CAPACITY` are one bound, so moving between them keeps the timeline and reads nothing again.
- A capacity the timeline refuses (a negative number, a fraction, `NaN`, an infinity, a string or a bigint) throws from `configure` before the inputs, the timeline or the read move, so a later `configure` compares with the inputs the feed held and a `restart` reads the source the feed held.
- The dock applies a `capacity` whole or not at all. A refused one throws before any other input moves, and what a timeline listener throws on a capacity change is rethrown once the catalogue, roles, ports, gates, diagnostics and shown reading are applied.
- A zero-capacity timeline returns the identical timeline for a record it cannot keep, so its store notifies no subscriber and the feed tells its timeline listeners nothing for it.
- `useTimelineStore` follows a changed `capacity`: it empties the same store at the new bound, releases a pause and keeps the store, and a re-render with the same capacity keeps its entries.
- `clear` empties the store at the capacity it holds, which is the one it was last resized to.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
