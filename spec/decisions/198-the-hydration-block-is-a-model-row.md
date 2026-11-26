# ADR-QD-198 — The hydration block is a model row

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-198                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-25                                     |
> | Status         | Accepted — extends ADR-QD-168, amends ADR-QD-185 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-25): Initial (ARCH-132, CCR-QD-477) |

---

## Context

The hydration block of the dock's Questions tab was the one view of the dock whose state was decided inside React. The other
views are model rows the panel only renders: the questions join ([ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md)),
the port cards ([ADR-QD-168](./168-a-port-card-is-a-model-row.md)) and the gates, each a pure function of the model's inputs
served as a store. [ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md) decision 11 says where a computed
view lives: in the model, and not in a panel's `useMemo`.

Three things were written in the panel's render functions and nowhere else.

- **Which of three states the block is in.** `Hydration` chose between waiting for a first sample (no counts and a poll that has
  not sampled), asking the host to wire the counts (no counts after a sample) and showing counts (whatever the status), from the
  counts and from `isUnsampled(status)` read in the panel.
- **Every sentence that depends on a count.** `Counts` worked out the rate (shown only when something was re-checked, with
  `question` singular at one), the drops that were raised (a count above zero), the all-clear with the number of reasons
  watched, and the scope note with its plural (`entry` at one, `entries` otherwise, so zero reads `0 dehydrated entries`, which is
  correct English) and its second branch for a client that seeded more than it built. None of those sat under the mutation glob
  (`packages/devtools/src/model/**/*.ts`), so none was measured: a flipped comparison or a dropped plural was reachable only by
  mounting the dock.
- **A subscription to a whole reading to pass one field.** `DockFrame` read the diagnostics store's snapshot, `{ status, reading }`,
  to give `status` to the stop notice and to pass `reading.hydration` down through `Screen` to the panel. React compares a store's
  snapshot by identity, and every poll that moved any count produced a new reading, so the frame re-rendered for a field it never
  used.

None is a defect in what the block shows. Each is a decision made where the mutation gate cannot see it, and the last one costs a
render per poll. The words and the test ids the block renders are pinned byte for byte by a characterisation of the panel that
was written before any source moved, so this decision changes where the rules live and nothing a host reads.

## Decision

1. **`hydrationView` is one pure function in `HydrationView.ts`**, package-private and in neither barrel
   ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)), the counterpart of `portCards` for the hydration block. It takes a
   `HydrationInput`, `{ hydration: HydrationActivity | undefined; unsampled: boolean }`, with both fields required and neither
   optional, and returns a `HydrationView`, a closed `Data.TaggedEnum` of `Pending`, `Unwired` and `Counts`. `Counts` carries the
   four counts as numbers for the four count cells, the rate as `string | undefined`, the drops as a second closed union,
   `HydrationDropsView` (`None { text }` or `Raised { rows }`), and the scope note as one `string`. Every sentence that depends on
   a count is composed there: the rate and its absence at zero re-checks, the singular at one, the all-clear with the number of
   reasons watched, the raised rows exactly as given (a reason the closed set does not know keeps its reason and its meaning), and
   the scope note in both of its branches with its plural rule. The view calls `unaccountedEntries`, and `hasHydrated`,
   `hydrationActivity`, `unaccountedEntries`, `HydrationActivity` and `HydrationDrops` stay public and unchanged. The module
   imports `effect/Data` and `Hydration.ts` and nothing from React, and its sentences are built inside function bodies, so none
   runs once at import and the mutation run has no mutant to ignore. The fixed advice of the unwired state (a sentence with three
   `<code>` spans, which is markup) and the pending phrase `no counts read yet.` are not rules, and stay beside the markup in the
   panel, selected by tag, as the port cards' fixed labels did.

2. **The view is the dock model's own store, `model.hydration`**: its eleventh store and its fifth derived store, built with
   `makeDerivedStore` directly after `services` and before any host listener, with the shown reading as its parent. It follows the
   shown reading through `parents`, as `services` does, so it adds no step to `configure`: a step would change the
   `AggregateError.errors` order [BEH-QD-742](../behaviors/28-devtools-screens.md#beh-qd-742-what-the-steps-of-a-configure-threw-surfaces-once-after-the-last-step)
   pins, and a hydration listener's throw lands in the seventh step's slot, after a services listener's and in the same nested
   aggregate. The store list stays in the one place that states it, [BEH-QD-700](../behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once).

3. **The key is `{ hydration, unsampled }`, each field compared by identity** (`sameFields`, ADR-QD-185 decision 2), with
   `hydration: undefined` stated explicitly because a key type refuses an optional field. One module-scope reader of the shown
   snapshot, `shownInputOf`, returns `{ reading, unsampled: isUnsampled(status) }` and is read by both the `services` key and the
   `hydration` key. The `questions` key keeps its own guard, `supplied === undefined && isUnsampled(status)`, around the same
   predicate. The three predicates stay distinct and are not folded into one flag: questions are guarded by whether the host
   supplied them, services are unguarded, and hydration is decided by activity precedence inside the view, which takes counts
   whenever they exist, then `Pending` when the poll has not sampled, else `Unwired`. The key reads `reading.hydration` by
   reference and copies nothing, so the reference the diagnostics fold keeps for an equal field
   ([INV-QD-411](../invariants.md#inv-qd-411-the-diagnostics-reading-changes-identity-only-when-a-field-moved-and-an-equal-field-keeps-its-reference))
   is the identity the store compares, and a poll that read the same counts publishes nothing.

4. **The wording is unchanged.** `0 dehydrated entries` is correct English and stays; no fourth state for "nothing hydrated yet"
   is added, because it would change the DOM a host can read. Every sentence and every `data-testid` of the block, for every
   status and reading, is byte for byte what the panel produced before.

5. **The panel reads the store itself.** `QuestionsPanel` takes `hydration`, a `ReadableStore<HydrationView>`, beside `questions`
   and `lens`, reads it with `useStoreSnapshot` and maps the tag to markup through a hoisted `Match.type<HydrationView>()` with
   `Match.tagsExhaustive`. The prop is optional and a panel rendered outside the dock, with no store, shows the unwired advice, as
   it did with no counts. The panel imports neither `isUnsampled` nor `unaccountedEntries` and decides nothing.

6. **`DockFrame` reads the poll's status alone.** `useDiagnosticsStatus` in `useStoreSnapshot.ts` reads the diagnostics store
   through a derived `getSnapshot`, `store.getSnapshot().status`, the shape `usePaused` has, and the frame gives that status to the
   stop notice. React compares the selected status with `Object.is`, and the feed keeps `Live`'s identity across samples that
   changed no status, so a poll that moves only a count does not re-render the frame. `Screen` loses its reading prop. The hook is
   package-private.

7. **The frame's saving is proved by a commit count with a control, and "publishes once" by the model's own pins.** A render count
   under a `React.Profiler` shows that polls moving only the reading commit nothing under the dock, and a poll that stops the feed
   commits, so the zero is not a blind count. The store's own rule, that an equal reading publishes nothing and a different one
   publishes once, is pinned in `DockModel.test.ts`.

8. **The view has its own mutation bar.** `HydrationView.ts` is under the devtools mutation run's `src/model/**` glob and has no
   earlier score, so it is held to none Survived, none NoCoverage and none Ignored. `DockModel.ts` is measured before and after
   with the same invocation and does not fall; a drop is answered with a test and never with a new baseline. `QuestionsPanel.tsx`,
   `DevtoolsDock.tsx` and `useStoreSnapshot.ts` are in `src/react`, outside every Stryker configuration, so they are held by the
   characterisation, the render tests and the type pins.

## Alternatives considered

- **Keep the block in the panel and only move the plurals.** Rejected: the state choice and the rate, drops and scope sentences
  are the rules, and a panel that keeps any of them is a panel that decides.
- **Ride the questions store.** Rejected: its key carries a different `unsampled` flag (guarded by whether the host supplied
  questions), so one key would hold two booleans of different meaning, `joinQuestions` would recompute on every count that moved,
  and the lens, which reads the questions store, would be told of a change it does not depend on. ADR-QD-185 decision 11 and
  ADR-QD-168 both make a computed view its own store.
- **An internal store the model does not expose.** Rejected: the panel must read it, and a value the panel reads is a member of the
  model.
- **Put the status itself in the key.** Rejected: the store would recompute on a status move the view ignores, `Off` to `Live` for
  one, when the decision reads only whether the poll has not sampled.
- **A public `unsampled` on `DiagnosticsSnapshot`.** Rejected: it is a change to a public type for a value the model can derive.
- **One shared flag for the three predicates.** Rejected: they differ on purpose, and a flag that fits two of them is wrong for
  the third (the questions guard would stop applying when the host supplied questions, or the hydration block would stop showing
  counts the host handed to a poll that has not sampled).
- **The view returning JSX or a `ReactNode`.** Rejected: `src/model` imports no React, and the mutation gate measures `src/model`.
- **Compose the sentences in the panel and compute only the state in the model.** Rejected: nothing would move under mutation, which
  is the reason for the move.
- **A fourth state for counts that are all zero.** Rejected: it would change pinned DOM, and a wording change is a separate
  decision.
- **A `configure` step for the new store.** Rejected: it would change the order of the aggregate a throwing `configure` reports and
  buy nothing, since the shown reading's refresh already moves the store through `parents`.
- **A sixth store carrying the status only.** Rejected: it is another edit to BEH-QD-700 to answer a React concern, when
  `usePaused` already shows a store read through a derived `getSnapshot`.
- **A selector argument for `useStoreSnapshot`.** Rejected: the derived-`getSnapshot` shape already exists and needs no change to
  the hook's signature.
- **The frame reading the view and handing the snapshot down.** Rejected: the frame would subscribe to a block that is not its own,
  and two subscriptions would re-render for one block.
- **Supersede ADR-QD-185 or ADR-QD-168.** Rejected: the rule each states holds, and one more store and one more row of the same
  kind are an amendment. A dated note on each says so, and the older counts stay as written.

## Consequences

- No export is added or removed, so `scripts/check-api-surface.mjs` (gate 13) is unmoved: `hydrationView`, `HydrationView`,
  `HydrationDropsView`, `HydrationInput` and `useDiagnosticsStatus` are package-private, and the helpers the view calls keep their
  place in the root barrel.
- A host sees no change. The block renders the same words under the same test ids for every status and reading, and the changeset
  says so.
- **The dock model has eleven stores and five derived stores.** [BEH-QD-700](../behaviors/28-devtools-screens.md#beh-qd-700-the-dock-models-stores-are-listed-once)
  lists them, [BEH-QD-699](../behaviors/28-devtools-screens.md#beh-qd-699-the-dock-models-five-computed-stores-are-derived-stores)
  names the five derived ones in build order, and the sweeps that name the stores moved with them.
- **An equal reading publishes nothing, and one flip of the unsampled flag publishes a view equal to the one before.** The rule is
  the identity of the key's two fields and not a promise about any status transition, as for the services store: a feed switched on
  passes through `Starting`, which has not sampled, so the store notifies twice and ends on a new, structurally equal view when the
  counts were handed to the dock. That is a re-render and not a change the block shows.
- **A panel rendered with no store is a held case.** The prop is optional so that the panel's existing tests, which render it alone,
  keep rendering the unwired advice.
- **The panel's own hydration tests changed.** The cases that duplicated the view's text rules moved to the view's table, and the
  panel keeps one render test per tag, with every test id kept.
- **The mutation record.** A run over `HydrationView.ts` alone found 41 mutants and killed all of them; the view's literals,
  comparisons and constructor calls sit inside function declarations, so none is a once-at-import site that the run ignores and no
  note of an Ignored mutant is owed.

## What enforces it

- Decision 1: `packages/devtools/test/model/HydrationView.test.ts` (V1 to V17, a table with the exact string of every arm and
  boundary: precedence, each plural, the rate at zero, the filter at zero and at one, the unaccounted branch, a foreign reason, and
  that the input is left alone), `packages/devtools/test/model/HydrationView.tst.ts` (both unions closed, the counts arm's field
  types, neither input field optional, and no counted negative pin) and the devtools mutation run over `src/model`
  (`stryker.devtools.mjs`).
- Decision 2: `packages/devtools/test/model/DockModel.test.ts` (M57 and the member list), `packages/devtools/test/model/ConfigureRule.test.ts`
  (CR22) and `packages/devtools/test/model/DockModel.listeners.test.ts` (DL21 and DL22).
- Decision 3: `packages/devtools/test/model/DockModel.test.ts` (M58 to M60: an identical poll publishes nothing, a changed count
  publishes once, the `Starting` to `Live` flip republishes an equal view, a stop after a sample publishes nothing).
- Decision 4: `packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx` (H1 to H13), written before the
  panel changed and passing both before and after, over the held `QuestionsPanel.characterisation.test.tsx` and
  `QuestionsPanel.feed.characterisation.test.tsx`.
- Decision 5: `packages/devtools/test/react/QuestionsPanel.test.tsx` (one render test per tag, and the reason rendered as text).
- Decisions 6 and 7: `packages/devtools/test/react/DockFrame.renders.test.tsx` (R1 to R3) and
  `packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx`, held.
- Decision 8: the mutation run of `stryker.devtools.mjs`, the held tests and `pnpm test:coverage`, which holds `src/model` at 95%.
- The merge gate by command (`pnpm check`), never by number.

## Related

- [ADR-QD-047](./047-a-headless-devtools-model.md) — the panel renders the model and computes nothing; the hydration block is the last view that did
- [ADR-QD-099](./099-entry-points-are-a-closed-list.md) — the view, its store type and the hook stay out of both barrels
- [ADR-QD-162](./162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md) — the questions store and the characterisation-first precedent
- [ADR-QD-168](./168-a-port-card-is-a-model-row.md) — the first model row of this kind; the hydration block is the second
- [ADR-QD-185](./185-the-dock-models-computed-stores-are-derived-stores.md) — derived stores, `sameFields`, and the count; amended by this decision
- [ADR-QD-194](./194-a-run-of-calls-applies-every-call-whatever-one-throws.md) — the order of the steps of a `configure` and of what they threw, which the store does not change
- [BEH-QD-761](../behaviors/28-devtools-screens.md#beh-qd-761-the-hydration-block-is-one-of-three-states-counts-win-over-the-polls-status-and-zero-is-never-shown-for-no-reporter) — the block's three states and their precedence
- [BEH-QD-762](../behaviors/28-devtools-screens.md#beh-qd-762-the-hydration-blocks-rate-drops-and-scope-sentences-are-composed-in-the-model-each-with-its-plural-rule) — the rate, drops and scope sentences
- [BEH-QD-763](../behaviors/28-devtools-screens.md#beh-qd-763-the-hydration-store-is-one-moment-keyed-on-the-counts-and-the-unsampled-flag-by-identity) — the hydration store is one moment keyed per field
- [BEH-QD-764](../behaviors/28-devtools-screens.md#beh-qd-764-the-questions-panel-renders-the-hydration-views-tag-and-decides-nothing-and-every-test-id-is-kept) — the panel renders the tag and decides nothing
- [BEH-QD-765](../behaviors/28-devtools-screens.md#beh-qd-765-the-dock-frame-follows-the-polls-status-alone) — the frame follows the poll's status alone
- [INV-QD-415](../invariants.md#inv-qd-415-the-hydration-view-is-pure-and-total-over-its-two-input-fields-and-its-two-unions-are-closed) — the view is pure and total, and its unions are closed
- [INV-QD-416](../invariants.md#inv-qd-416-the-hydration-stores-key-compares-its-two-fields-by-identity-and-the-readings-counts-are-read-and-never-copied) — the key compares two fields by identity
- ARCH-132, CCR-QD-477
