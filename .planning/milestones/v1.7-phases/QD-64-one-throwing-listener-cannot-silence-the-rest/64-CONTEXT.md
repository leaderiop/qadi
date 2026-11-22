# Phase 64: One throwing listener cannot silence the rest - Context

**Gathered:** 2026-11-20
**Status:** Ready for planning

<domain>
## Phase Boundary

`makeExternalStore`'s `notify` (`packages/devtools/src/model/ExternalStore.ts`) is
`for (const listener of listeners) listener();`, so the first listener that throws stops the loop and every later one keeps
a stale snapshot. That includes the React dock's `useStoreSnapshot`. After this phase:
- every listener is called;
- then the thrown values are rethrown: one as-is, several as one `AggregateError`.

Every text that says "a listener must not throw: it is not isolated" states the new contract instead.

ARCH-111. Package: `@qadi/devtools` (a **patch** changeset). Records:
- ADR-QD-177
- CCR-QD-455
- BEH-QD-656–660, in the BEH-QD-636 area of `spec/behaviors/28-devtools-screens.md`
- INV-QD-373–374
- traceability

Requirements: LSTN-01..04, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE12-CONTEXT.md`)
- **D1:** a throwing `subscribe` listener no longer stops the others. Every listener is called. One error is rethrown as-is
  after the loop, and several are rethrown as one `AggregateError`. Nothing is swallowed.
- **D7:** the publish-between-`begin()`-and-`fork()` window (`TimelineFeed.ts` ~131–141, the audit's "try/finally around
  the publish") is **out of scope**. The CCR row says so, and the README keeps a narrowed, accurate caveat.

### The seam (`ExternalStore.ts` `notify`)
- **Collect, then decide by length.**
  - Thrown values go into an array, and the decision is made by `errors.length`, never by "first error truthy", so
    `throw undefined` and `throw null` work.
  - 0 errors: return as today.
  - 1 error: rethrow the same value (reference-equal).
  - 2 or more: throw one `AggregateError(errors, <fixed message>)`.
- **The `AggregateError` message is a fixed constant with no count** (owner, 2026-11-20). `errors` already carries every
  value. The literal is asserted, because `ExternalStore.ts` is in the devtools mutation set (break 80). The planner picks
  the exact wording, one plain sentence naming the store's listeners.
- **Live iteration stays.** The loop iterates the live `Set` as today, not a `[...listeners]` snapshot. Pin both cases:
  - a listener removed before its turn is not called;
  - a listener added during notify is called in the same pass.
- **A nested `AggregateError` is kept nested, never flattened** (owner, 2026-11-20).
  - An `AggregateError` a listener throws is one thrown value: rethrown as-is when alone, or placed as one element of the
    outer `errors`.
  - `TimelineFeed` nests stores (an inner store's listener publishes to an outer store), so this shape can occur.
  - A test pins it. There is no `instanceof` branch in the seam.
- **State is assigned before notify, as today.** `set`'s identity check and `publish`'s always-notify are unchanged.

### Tests (LSTN-01, LSTN-02)
- **RED first, on the phase base**, in `packages/devtools/test/model/ExternalStore.test.ts` (the file already exists). The
  cases:
  - a later listener runs after an earlier throw;
  - two throws give one `AggregateError` carrying both, in call order, with the asserted message;
  - a single thrown value is rethrown reference-equal, `undefined` included;
  - with no throw, nothing changes;
  - subscribe and unsubscribe during notify keep live-iteration semantics;
  - the nested `AggregateError` shape.
- **Through the root.** Each of the three feeds (timeline, diagnostics, gates) is tested through `@qadi/devtools`'
  public root: a throwing listener on the feed no longer silences a second listener on the same feed.
- **The dock characterisation tests are the React evidence.** `*.characterisation.test.tsx` pass with an empty
  `git diff`. React's behaviour on a thrown snapshot is not otherwise asserted.

### Texts (LSTN-03)
- Amend every "must not throw / not isolated" text to the new contract:
  - the `subscribe` docs in `TimelineFeed.ts` (lines ~57 and ~66);
  - `DiagnosticsFeed.ts` (~97), keeping its poll-stop clause;
  - `GatesFeed.ts` (~77, plus the module doc);
  - `packages/devtools/README.md` (~164);
  - the BEH text in `spec/behaviors/28-devtools-screens.md`.
- Each amended text keeps an accurate caveat for the D7 window.
- Re-grep the website's devtools page before editing, because research disagrees on whether it mirrors the README. Never
  touch `apps/website/dist/`.
- `Source.ts:242` ("it must not throw itself", about a name reader, INV-QD-104) is a different contract. Leave it.

### Records (WX)
- **ADR-QD-177 is written** (owner, 2026-11-20). It records D1 and D7's scope line, and amends ADR-QD-173's listener
  wording. ADR-QD-173 gets an "amended 2026-11-20" status note and a `spec-revise --date 2026-11-20` bump, and
  `spec/decisions/index.yaml` gains the 177 entry.
- **CCR-QD-455 and the other ids:**
  - CCR-QD-455 states that the D7 window is out of scope.
  - BEH-QD-656–660 and INV-QD-373–374 are used as needed. Any reserved id left unused is named Unused in the CCR row.
- **One `@qadi/devtools` patch changeset.** No other package changes.
- **Reserved ids only.** Never run `scripts/next-id.mjs`. Always pass `--date 2026-11-20` to `spec-revise.mjs`.

### Claude's Discretion
- The exact `AggregateError` message wording.
- How each feed's root-level test builds its throwing listener.
- Whether the nested-aggregate pin lives in `ExternalStore.test.ts` or in a `TimelineFeed` test.

</decisions>

<code_context>
## Existing Code Insights

### The seam
- `packages/devtools/src/model/ExternalStore.ts`:
  - `makeExternalStore<A>(initial)` returns `{ subscribe, getSnapshot, set, publish }`.
  - `notify` is the three-line loop.
  - It is internal scaffolding, kept out of the barrel (AGENTS.md §9).

### The 13 importers (all in `packages/devtools/src`)
`TimelineFeed`, `GatesFeed`, `DiagnosticsFeed`, `DiagnosticsStore`, `DockModel`, `DockSession`, `SimulationSession`,
`ExplorerSession`, `HeldChoice`, `TimelineStore`, `react/ServicesPanel`, `react/QuestionsPanel`, `react/useStoreSnapshot`.

`TimelineFeed.ts` builds `view` and `status` stores and subscribes `push` to an inner store (~112–163). This is where a
nested notify, and so a nested `AggregateError`, can occur.

### Tests
- `packages/devtools/test/model/ExternalStore.test.ts` already exists. The new cases go there.
- `packages/devtools/test/react/useStoreSnapshot.test.tsx` and the dock `*.characterisation.test.tsx` are the React-side
  evidence.

### Established patterns
- Phase 62/63 house rules apply:
  - prove each new check can fail with RED on the phase base;
  - scratch lives outside the repo or in gitignored `.scratch/`, and is never committed;
  - executors never tick WX-* requirements.
- ADR-QD-173 ("the devtools headless interface is its feeds") is the ADR whose listener wording ADR-QD-177 amends.

</code_context>

<specifics>
## Specific Ideas

- A test that asserts the message from a second throw might now see an `AggregateError`. Research found none, but grep
  for one before the seam changes.
- The `AggregateError` message literal and the 0/1/2 length boundaries each need an assert that kills its mutant.

</specifics>

<deferred>
## Deferred Ideas

- The publish-between-`begin()`-and-`fork()` window (D7). It is named out of scope in CCR-QD-455 and caveated in the
  texts.

</deferred>
