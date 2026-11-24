---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/test/model/ConfigureRule.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/DockModel.listeners.test.ts
  - packages/devtools/test/model/ExternalStore.callAll.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/SimulationSession.runs.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/README.md
  - .changeset/devtools-configure-applies-every-input.md
findings:
  critical: 0
  warning: 4
  info: 3
  total: 7
  necessity: 0
status: issues_found
---

# Phase QD-81: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

The source change is sound. `callAll` is a faithful extraction of the two existing loops. It iterates the live `Set` itself, so BEH-QD-656's add and remove semantics are kept. The three try/finally publish-then-fork sites are correct, because `SupersedingRun.fork` refuses a superseded token and does not throw synchronously. `DockModel.configure` reads `held` per step, so a nested `configure` decides the end state, and every step is idempotent through its target's own guard. The rail as a derived store is subscribed to `timeline` first, so it moves before `dock.setTimeline` and before any host listener. I found no correctness defect in `src/`. I traced the re-entrancy, step-order and rail-key paths and they hold.

The findings are about what the tests prove and what the README and changeset claim:

- One test row is vacuous, and a conditional assertion can hide another.
- The README states a false uniqueness claim.
- The README documents a package-private API.
- Both documents describe the aggregate shape more simply than the code produces it.

## Warnings

### WR-01: README claims the gates cadence is the only throw that still ends something, but a listener throw on a record ends the timeline read

**File:** `packages/devtools/README.md:168-172` (also `.changeset/devtools-configure-applies-every-input.md:5`)
**Issue:** The README says "The one throw that still ends something is the gates feed's own: a questions cadence tick that throws". The timeline read ends the same way. `runSource` (`TimelineStore.ts:123-125`) calls `store.accept(record)` bare, in a `for` loop over the backlog and in `Effect.sync` for the live stream. Any host listener on `timeline`, `dock`, `explorer` or `simulation` that throws on a record makes `accept` rethrow, which fails the read fiber. `TimelineFeed` then sets `Stopped`, and the rest of the backlog is never accepted.

DL15 proves that "the dock applies every input on each record the timeline accepts" only by calling `model.timeline.accept` directly. No test drives the real source path with a throwing listener. The changeset's "on each record the timeline accepts" is therefore literally true but reads as "the record path is total". A host with one flaky explorer listener still loses the tail of its backlog and sees `Stopped`. The diagnostics poll has the same property: its own doc comment says a throw during a publish from the poll is stated as the poll's stop.
**Fix:** Reword the README sentence to name every read that ends on a listener's throw. Suggested wording: "A throw from a listener on a record or sample a read or poll publishes ends that read or poll and is stated in its status; the gates cadence tick is the same." Add one test that runs a source with a two-record backlog and a throwing explorer listener, and asserts the status is `Stopped`. That pins the actual behaviour instead of leaving it implicit.

### WR-02: DL10 (lens) is vacuous, and `throwingRow`'s conditional assertion can hide a row that never throws

**File:** `packages/devtools/test/model/DockModel.listeners.test.ts:273-278, 331-333`
**Issue:** `throwingRow` branches on `calledDuringConfigure`. If the listener was called, it asserts the throw. If not, it asserts only `isFalse(run.threw)`. `configure` never touches the lens session, so for DL10 the listener is never called. The row reduces to "an unthrowing configure applies everything" while its title says "with a throwing lens listener ... rethrows what it threw".

The branch also weakens every other row. If a regression stopped, for example, the explorer or simulation listener from being notified during `configure` in both starts, the row would take the `else` path and pass without proving anything. The header comment explains why `timeline` and `dock` run from 5 alone, but nothing asserts which rows must take the "called" path.
**Fix:** Give each row an explicit expectation instead of inferring it, for example `throwingRow(name, { starts, heardDuringConfigure: true })`. Assert `listener.called === expected` before the branch. Drop DL10, or retitle it as the explicit negative "a lens listener is not part of configure", and assert it is never called.

### WR-03: README documents the dock model's `configure`, which is package-private and not reachable from this section

**File:** `packages/devtools/README.md:176-180`
**Issue:** The "Without React: the feeds" section tells a host how to build the three feeds. It now continues "The dock model's `configure` goes further and applies every input, the timeline, the sightings rail, the roles, the simulation's ports...". `makeDockModel` is package-private (ADR-QD-099, and not exported from `src/index.ts`). The README never introduces "the dock model", "the sightings rail" or "the model's inputs". A host reader cannot call or observe it, so this is a behaviour claim about an internal. It also forces the next sentence about the rail being "derived ... not a member of the model's inputs", which means nothing to this audience. The same text is in the changeset, which is user-facing release text.
**Fix:** Keep the README to the exported feeds: the closed publish-then-fork windows and the one-`AggregateError` rule for `configure` on the timeline feed. Move the dock-model sentence to the spec or ADR-QD-194, which already carry it. In the changeset, say "the dock" and drop the rail sentence (see IN-01).

### WR-04: "one throw as itself, several as one `AggregateError` in step order" is imprecise because collection is hierarchical

**File:** `packages/devtools/README.md:178-180`, `.changeset/devtools-configure-applies-every-input.md:5`, `packages/devtools/src/model/DockModel.ts:409-430`
**Issue:** The count is of steps, and of listeners within a store. It is not of host throws. Every step is itself a `callAll` or `notify`. Two listeners that throw on the same store's publish (for example `diagnostics` and a derived store's listener on the shown-reading refresh) become one `AggregateError` with the store's message. That single value is the whole of step 7's contribution. It surfaces from `configure` as itself if nothing else threw, and as one nested element of the dock's aggregate otherwise.

A host that catches `AggregateError` and reads `.errors` to enumerate its listeners' throws gets a different shape than the docs describe. The messages also differ ("store's listeners", "timeline feed's configure", "dock's configure"). The code comment on `callAll` says nested aggregates are "never flattened", but neither README nor changeset says so for `configure`. DL12 pins only two throwers on two different stores.
**Fix:** Add one sentence: "Each step collects its own listeners' throws the same way, so a step that several listeners threw on contributes one nested `AggregateError`, never flattened." Add a DL row where two listeners on one store throw during `configure`, asserting the nested shape.

## Info

### IN-01: Changeset contradicts itself about the rail

**File:** `.changeset/devtools-configure-applies-every-input.md:5`
**Issue:** The sentence lists "the sightings rail" among the things `configure` applies. The final sentence says the rail "is a derived store and no longer a member of the dock's inputs". The rail was never an input. It was a step. The wording suggests an input was removed, which is not a public change. The patch changeset is the release note, so the confusion is user-visible.
**Fix:** Delete the last rail sentence from the changeset. The "No export changes" sentence already covers it.

### IN-02: TF37 does not pin that the source is read once, and sits out of order

**File:** `packages/devtools/test/model/TimelineFeed.test.ts:814-834`
**Issue:** The nested configure makes the inner call start a read of `b`. The outer call's second step then starts a second read of the same held source, because the thunk reads `held.source`. The result is harmless: `ingest` dedupes, so `idsOf` is `["from-b"]` either way. TF37 asserts only that, plus capacity 2 and `c.tally` equal to 0. It would pass whether `b` was read once or twice, so the redundant read is neither pinned nor excluded. The test also sits between TF35 and TF36, which makes the numbering unordered.
**Fix:** Assert `b.tally` explicitly, either `{ reads: 2 }` to document the replay or `{ reads: 1 }` if the second step is made to skip a source already read. Renumber or move the test beside TF36.

### IN-03: The README paragraph is no longer hand-wrapped

**File:** `packages/devtools/README.md:168-169`
**Issue:** "...notification), one value as itself and several as one `AggregateError`. A status that announces work (`Reading`, `Starting`) is published" runs past the ~90-column wrap the file uses, and the following lines re-wrap differently. AGENTS.md §17 sets hand-wrapping as the house style.
**Fix:** Re-wrap the paragraph to about 90 columns.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
