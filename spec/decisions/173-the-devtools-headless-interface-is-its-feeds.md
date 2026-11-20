# ADR-QD-173 — The devtools headless interface is its feeds

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-173                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-19                                     |
> | Status         | Accepted — amends ADR-QD-047, ADR-QD-099, ADR-QD-169; applies ADR-QD-137; amended 2026-11-20 (ADR-QD-177: every listener is called) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-20): amendment — every listener is called (ARCH-111, ADR-QD-177, CCR-QD-455)<br>1.0 (2026-11-19): Initial release (ARCH-107, CCR-QD-451) |

---

## Context

`@qadi/devtools`' root exported two raw pairs: `makeTimelineStore` with `runSource`, and `makeDiagnosticsStore` with
`runDiagnostics`. A headless shell had to build the store, fork the runner, supersede it on a change and watch it for a stop
itself. The modules that already do exactly that, `model/TimelineFeed.ts`, `model/DiagnosticsFeed.ts` and
`model/GatesFeed.ts`, were package-private, because ADR-QD-047's amendment 1.6 (2026-10-08) fixed the root's list before the
feeds existed (amendments 1.13 and 1.15, 2026-11-12, and ADR-QD-169's decision 1 then called them package-private).

That left three faults:

- **A false claim.** The README said `runDiagnostics` and `makeDiagnosticsStore` were "the same loop without React". They
  lacked the stop detection whose absence was the defect amendment 1.13 fixed, so a headless poll that died stayed `Live`
  forever, and the React dock said so while the root's runner could not.
- **Two ways to read one poll, one of them unwatched.** The dock read the diagnostics through a scoped feed with a closed
  status. A shell reading them through the root's runner read them with none.
- **Two option shapes and a translator for one poll.** `DiagnosticsOptions<ROut, E>` (`layer`, `collector`, `schedule`) was
  the engine's; `DiagnosticsDockOptions` (`layer: Layer<never, unknown>`, `collector`, `intervalMillis`) was the feed's;
  `runOptions` turned the second into the first.

## The checkpoint

The owner decided (HDLS-01, 2026-11-19) to **pursue** the change, with **all three feeds public** and **one option shape**
(D-01, D-02, D-03). There is no rejection record.

## Decision

1. **The three feeds are the root's headless interface (D-02).** `makeTimelineFeed`, `makeDiagnosticsFeed` and
   `makeGatesFeed` are exported from `@qadi/devtools`, with the tagged enums and the handle and input types a caller names:
   `TimelineStatusReadout`, `DiagnosticsStatus`, `DiagnosticsSnapshot`, `DiagnosticsReadout`, `RegistryRead`, `AskedRead`,
   `GatesSnapshot` and the rest. Each is built in the caller's scope, so closing the scope ends the read (applies
   [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md)). The dock model builds the same three, so a
   headless shell reaches everything the dock shows.
2. **The runners leave the root (D-04).** `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`,
   `noDiagnostics` and the `DiagnosticsStore` type are not exported from either entry. Their modules stay, package-private, as
   the feeds' engines. A type the feeds' handles still name stays exported (`TimelineFeed.timeline` is a `TimelineStore`).
3. **One option shape, `DiagnosticsOptions` (D-03, D-15).** It is `{ layer?: Layer<never, unknown>; collector?;
   intervalMillis? }`, declared once beside the engine that reads it in `DiagnosticsStore.ts`, so no feed to store import
   cycle forms. The feed, `useDiagnostics`, the dock's `diagnostics` prop and the model input take it unchanged, and
   `runOptions` is deleted. `schedule` goes, because the feed restarts its poll when the interval changes and that needs a
   value it can compare. `DiagnosticsDockOptions` and the generic `DiagnosticsOptions<ROut, E>` are gone. `@qadi/devtools/react`
   re-exports the new name.
4. **The input type names stay (D-14).** `TimelineFeedInputs` and `GatesFeedInputs` keep their names beside
   `DiagnosticsOptions`.
5. **The idle placeholders stay private.** `idleTimeline` and the like exist so the React shell can render before a feed is
   built; a headless shell builds the feed in its scope and has no pass-before-build.
6. **No entry point is added.** The feeds go in the existing root `.`; the `exports` map and the overview's "Entry points"
   table are unchanged, and the only non-root entry is still `@qadi/devtools/react` ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)).
7. **A stop's `reason` must not cross a trust boundary (D-17).** The public `Stopped.reason` and `Failed.reason` are a
   `Cause.pretty` trace: it names source frames and layer internals. A shell that forwards it to a browser, a log sink another
   tenant reads or a client response is disclosing them; the README and BEH-QD-637 say so.
8. **D-16: the feed's equivalent survivor guard is removed.** `if (before !== undefined) off();` in `configure(undefined)`
   was an equivalent mutant's host: its mutation survived because test F26 already pins the behaviour the guard protects
   (`configure(undefined)` on an off feed changes and notifies nothing). It was measured against the base before it was
   removed, and the file's mutation score rose.

## Alternatives considered

- **Keep the pairs beside the feeds.** Two ways to read one poll, one of them unwatched, and the README's claim stays
  false or the pair grows a stop detector of its own and becomes the feed.
- **Export only the timeline and diagnostics feeds.** The gates feed is how the questions panel's input is read; leaving it
  out means a headless shell can show everything but the questions. D-02 rejected it.
- **Keep `schedule`.** The feed compares the option to decide whether to restart; a `Schedule` has no equality.
- **Rename the input types** (`TimelineFeedInputs`, `GatesFeedInputs`). A rename with no reader to benefit (D-14).
- **Alias `DiagnosticsDockOptions` to `DiagnosticsOptions`.** A deprecated alias is the compatibility this project does not
  keep in a 0.x minor, and it leaves two names for one shape.

## Consequences

- **Breaking** for `@qadi/devtools` (0.x minor, one changeset). The six retired names stop being importable;
  `DiagnosticsDockOptions` is `DiagnosticsOptions` on both entries; `DiagnosticsOptions` takes `intervalMillis` for `schedule`
  and is not generic. Each is a compile error, not a silent change. `@qadi/react` changes nothing.
- The README's headless section builds the feeds and handles every status with `Match.tagsExhaustive`.
- Gate 13 (`check-api-surface.mjs`) fails until `spec/overview.md` names every added export and drops every removed one.
- Gate 14 (`check-package-install.mjs`) builds a `makeTimelineFeed` from the packed root and asserts its `Reading` status,
  compiled with `skipLibCheck: false`, so the shipped feed declarations are type-checked (D-09, D-18).
- The mutation floor held: `DiagnosticsFeed.ts` rose from 0.9540 to 0.9863, with D-16's removed guard and `runOptions`'
  spreads gone, and the other four model files stayed at 1 (D-10; the static-ignored mutants are Killed in an
  `ignoreStatic: false` run, ADR-QD-167 Rev 1.1).
- D-12's exception: `QuestionsPanel.feed.characterisation.test.tsx` took a type-name edit of exactly lines 26 and 66
  (`DiagnosticsDockOptions` to `DiagnosticsOptions`), its goldens and assertions unchanged, by owner decision.
- ADR-QD-047's amendment 1.6 and its 1.13 and 1.15 "package-private" feeds, ADR-QD-099's named list and ADR-QD-169's
  decision 1 are each amended in a dated paragraph; none is rewritten.

## Amendment (2026-11-20, ADR-QD-177, CCR-QD-455): every listener is called

This decision named no rule for a listener on a feed's `subscribe`. The rule lived in BEH-QD-638 and the feeds' docs,
which asked a host's listener never to throw. [ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md)
replaces it: every listener is called, and what they threw is rethrown out of whatever published, one value as itself
and several as one `AggregateError`
([BEH-QD-656](../behaviors/28-devtools-screens.md#beh-qd-656-a-throwing-listener-does-not-silence-the-others)). The
feeds, their names and their types are unchanged.

## Related

[ADR-QD-047](./047-a-headless-devtools-model.md), [ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md),
[ADR-QD-169](./169-the-questions-panels-two-host-inputs-are-one-feed.md), BEH-QD-636..640, INV-QD-365, INV-QD-366,
[ADR-QD-177](./177-one-throwing-listener-cannot-silence-the-rest.md), BEH-QD-656, INV-QD-373.
