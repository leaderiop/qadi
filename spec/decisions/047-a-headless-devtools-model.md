# ADR-QD-047 — The devtools is a headless model with a React shell over it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-047                                   |
> | Revision       | 1.13                                            |
> | Effective Date | 2026-10-07                                     |
> | Status         | Accepted; amended 2026-10-07 (sampling is the model's), 2026-10-08 (the feed, a supplied reading, the interface), 2026-11-09 (the explorer's state is model too), 2026-11-10 (the stream's prelude rules are core's), 2026-11-10 (the simulator's fields are described once), 2026-11-10 (the dock's state is model too; replay is a command), 2026-11-11 (the simulator is a view of its session; ARCH-20 D-20-b superseded by ADR-QD-137), 2026-11-11 (the dock is one model), 2026-11-12 (diagnostics are the seventh store) |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.13 (2026-11-12): amendment — diagnostics are the dock model's seventh store: one scoped feed with a closed status; the public hooks are adapters over scoped feeds; useRunningStore deleted (ARCH-82, BEH-QD-506..510, INV-QD-313..314, CCR-QD-425)<br>1.12 (2026-11-11): amendment — the dock is one model: makeDockModel owns the six stores and pushes the rail, one configure, one owned-model hook; one held-choice cell; PolicyChoice carries HeldChoice's arms (ARCH-74, BEH-QD-465, BEH-QD-466, INV-QD-296, CCR-QD-416)<br>1.11 (2026-11-11): amendment — the simulator is a view of its session (setAction, choosePolicyAt, policyMenu, cost, baselineReading and a run's reading are the session's); the run lifecycle is ADR-QD-137's, which supersedes ARCH-20 D-20-b (ARCH-73, BEH-QD-460, CCR-QD-415)<br>1.10 (2026-11-10): amendment — the dock's tab, filters, selection and replay are DockSession; replay is a SimulationSession command that always re-seeds, reversing ARCH-20 D-20-g for replay (ARCH-63, BEH-QD-389, BEH-QD-390, INV-QD-107, CCR-QD-405)<br>1.9 (2026-11-10): amendment — the simulator's input fields are described once in SimulationFields.ts, and the session's chip commands and form reading are derived from it; the chip typing buffer stays in the view (ARCH-61, lost ARCH-48, INV-QD-257, CCR-QD-400)<br>1.8 (2026-11-10): cross-reference — the stream's prelude rules are @qadi/core's decodeDecisionStream; sourceFromEventSource is the EventSource adapter over it, signature unchanged (ARCH-60, CCR-QD-397)<br>1.7 (2026-11-09): amendment — the policy explorer's state is `ExplorerSession` and the role viewer's choice a `HeldChoiceStore`, both owned by `DevtoolsDock` and package-private (ARCH-58, BEH-QD-337, INV-QD-107, CCR-QD-394)<br>1.6 (2026-10-08): amendment — the model's interface is its stores, the host wiring and the timeline readings; a screen's mechanics and the panels are package-private (ARCH-40, CCR-QD-321)<br>1.4 (2026-10-08): amendment — a supplied reading is one value, `DiagnosticsReading`, merged by `mergeReading` (ARCH-44, CCR-QD-241)<br>1.3 (2026-10-08): amendment — under a `QadiProvider`, the layer the dock builds is the provider's own, handed by `@qadi/react`'s `useDevtoolsFeed` (ARCH-34, BEH-QD-327, CCR-QD-240)<br>1.2 (2026-10-07): amendment — the simulator's state is model, held by `SimulationSession` beside `TimelineStore`; "renders that model and computes nothing" was not true of screen 5 until now (CCR-QD-199)<br>1.1 (2026-10-05): `Source` is one scoped `read`; a `DecisionLog` is a source as is; `sourceFromFeed` removed (ADR-QD-097) (CCR-QD-181)<br>1.0 (2026-08-24): Initial release (CCR-QD-067) |

---

## Context

[ADR-QD-044](./044-an-optional-decision-sink.md) made a decision observable,
[ADR-QD-045](./045-the-topology-is-a-choice-of-sink.md) made the topology a
choice of sink, and [ADR-QD-046](./046-a-decision-feed-is-sse-and-guarded.md)
put a guarded feed on the wire. All six deployments can now reach their
decisions. Nothing renders them.

Rendering is the first work in this library whose output a person looks at
rather than a gate, and the risk profile inverts accordingly. The existing gates
prove behaviour; a devtools panel's defects are mostly in the **model behind the
pixels** — merging several processes' records into one ordered timeline, pairing
a decision with an outcome emitted after `evaluate` returned, and telling a
short-circuited node from a denied one. Those are as testable as the evaluator.

Two constraints came with the ground rather than with the design. The repository
had **no frontend build tooling at all** — no bundler, no CSS pipeline, no dev
server, no example app — and three of the six deployments have no browser page
to host an overlay in.

> **Amended in CCR-QD-076.** The first constraint no longer holds:
> `examples/nextjs-newsroom` is a Next.js application in the workspace. The
> decision stands unchanged, and the example is the reason it does — a dock that
> needed a bundler could not have been mounted in one written afterwards. The
> second constraint is untouched: those three deployments still have no page, and
> ADR-QD-049's CLI is still not written.

## Decision

**One package, `@qadi/devtools`, split at the React boundary.**

`@qadi/devtools` is the model: source adapters, the timeline fold, verdict
classification, pairing, the policy/trace zip, filters and selection. It imports
no React. `@qadi/devtools/react` renders that model and computes nothing.
`react` is an **optional** peer dependency, so a server-side aggregator consumes
the model without a UI and without a warning about a peer it does not want.

Three consequences follow, and each is checked rather than remembered:

**The model is held at core's bar** — 95% coverage on all four metrics, and in
the mutation gate through a second Stryker configuration
(`stryker.devtools.mjs`). A second configuration rather than a wider glob,
because the existing run pins its test runner to `packages/core`; widening the
glob would make every core mutant's initial run execute four other packages'
suites, on the gate that already has the longest history of being the slow one
(CCR-QD-065). The React shell stays at the 90% default, on exactly the reasoning
that already excludes `@qadi/react`: mutating JSX mostly measures the renderer.

**`tsc` and nothing else.** Styles are inline objects. A stylesheet needs a CSS
pipeline; an injected `<style>` needs a side effect at module scope, and the
package declares `"sideEffects": false` — so a bundler would be entitled to drop
it and the dock would lose its styling in the production build nobody tests. The
same reasoning is why the dock does not self-mount: the host renders
`<DevtoolsDock />`.

**The dock is one surface among several.** A backend-only service, a serverless
function and a replicated server have nowhere to put an overlay. Their decisions
are reachable at `/__decisions` and the model that merges them is
framework-free, so a served dev UI or a CLI is a second shell over the same
model rather than a second implementation. Building one is not this increment.

## Alternatives considered

**A served dev UI instead of a package** — `@qadi/http` serving a self-contained
HTML page at `/__devtools`. It reaches all six deployments, which the dock does
not, and it was rejected for this increment on cost rather than merit: it needs
a bundler, an embedding step in `pnpm build`, and therefore a second build graph
beside `tsconfig.build.json`. `@qadi/promise` was missing from that file for six
commits without anyone noticing (ADR-QD-033); adding a second graph before there
is a UI to serve would be inviting the same class of drift. The split above
keeps it available later at the cost of one shell, not one rewrite.

**Both at once.** Twice the work, and it pulls the bundler decision into the
increment that can least afford it.

**Screens 3 to 6 now.** The policy explorer has no source for its left rail,
the services card cannot obtain which implementation is wired, and screen 7 needs
rescoping rather than implementing — `Atom.family` keys structurally, so ten
`<Can>` on one policy are a single atom. Log and Inspector are the two the
design marks Ready, and they carry the pairing story the rest depends on.

**A `_tag` on every model type.** Rejected where the type is not a union:
`PairedEntry` is one shape, and a tag on it is a field nothing reads. The
mutation gate found it — the tag's own literal was the only mutant in the
package no test covered.

## Consequences

- (+) The interesting properties are provable without rendering anything, which
  is the same division AGENTS.md §13 already draws for `@qadi/react`.
- (+) No new dependency reaches the repository. `@testing-library/react` and
  `happy-dom` were already devDependencies of `@qadi/react`.
- (+) A second shell — served page, CLI, exporter — is additive.
- (−) Three deployments still have no rendered surface, and the tool says so
  rather than pretending otherwise.
- (−) Two entry points mean two API surfaces to document. `check-api-surface.mjs`
  had to learn to read a package's `exports` map; before that it assumed
  `src/index.ts` was the only one, and the dock's exports would have been
  invisible to `scripts/check-api-surface.mjs`, gate 13.

## Amendment (2026-10-05, CCR-QD-181)

**`Source` is one scoped `read`.** It was `{ backlog?: Effect<…>; live: Stream<…> }`,
two fields a consumer ran one after the other — and a record made between them was
lost. It is `{ read: Effect<SourceRead, never, Scope> }` now, `SourceRead` keeping
the absent-versus-empty `backlog?` this ADR's model relies on. A `DecisionLog`
satisfies it as is, so `sourceFromFeed` is removed rather than replaced, and
`sourceFromEventSource` reads the server's prelude as its backlog and each
record's environment off the wire. The headless/React split is unchanged
([ADR-QD-097](./097-a-decision-log-is-a-sink-and-its-own-history.md)).

## Amendment (2026-10-07, CCR-QD-199)

**The simulator's state is model.** "`@qadi/devtools/react` renders that model and
computes nothing" was not true of screen 5: `Simulator.tsx` held its form, its
chosen source, its capture, its run and the supersede token in component state,
and four defects sat there where no model test and no mutation run could see
them. That state is `SimulationSession`, a store of the shape `TimelineStore`
already is (`subscribe`, `getSnapshot`, synchronous commands) with `run`, `reap`
and `dispose` as Effects the hook forks (superseded: the run lifecycle is
[ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md)'s, and `run`
is a command with no `reap` or `dispose`); the form's text is `SimulationForm`'s
codec. `useSimulationSession` is the adapter, as `useTimeline` is for the
timeline, and `DevtoolsDock` owns the session so it outlives a tab. The two
stores each kept their own small listener closure at the time; extracting the
shared one was deferred until a third store existed to extract it from, which
the amendment below did (ARCH-24).

## Amendment (2026-10-07, CCR-QD-200)

**Sampling is the model's.** "The model computes, the shell renders" was not true
of the one loop a host needs most: keeping the Services and React panels
current. Each host wrote it itself — four pull-based reads, two timers, an
`Effect.runSync` and a layer provided by hand — and the only host that did wrote
it twice and read a throwaway cache (CCR-QD-200). `runDiagnostics` is that loop,
beside `runSource` and written the same way: a named `Effect.fn`, scheduled with
`Schedule.spaced`, testable under `TestClock`, feeding a `DiagnosticsStore` the
shell reads with `useSyncExternalStore`. `useDiagnostics` is the adapter, and
`DevtoolsDock` takes a `diagnostics` prop so a host hands over what it already
owns (its layer, its collector, its question list) and knows no Effects.

Three things the model now owns. A handed layer is **built once per run** and
released on interruption; it is still its own build, so stateful services are
shared with the application by value, not by being the same layer. A snapshot
**keeps its identity** field by field while `Equal.equals` says it is
unchanged. A layer that fails to build is a stated `WiringRead.Failed`, not a
dead fiber. The explicit snapshot props stay and win field by field, because
they carry what sampling this process cannot: another process's report.

> **Amended 2026-10-08 (CCR-QD-240).** "Stateful services are shared with the
> application by value" is still the rule for a host that builds the layer
> itself, and it is the only one for a host with no `QadiProvider`. Under one it
> is no longer the host's to get right: `@qadi/react`'s `useDevtoolsFeed()` hands
> the dock a layer that is the provider's own build of the application layer, so
> there is no second build to keep consistent
> ([BEH-QD-327](../behaviors/09-react.md#beh-qd-327-a-devtools-feed-reads-the-providers-own-runtime),
> [ADR-QD-053](./053-a-gate-can-be-found.md)). Devtools' API did not change.

> **Amended 2026-10-08 (CCR-QD-241): a supplied reading is one value.** "The
> explicit snapshot props stay and win field by field" kept two things: the
> readings and the layout. The readings stay, because they carry what sampling
> this process cannot (another process's report). The layout does not: five props
> (`wiring`, `activity`, `portCalls`, `questions`, `hydration`) each restated the
> one rule, and one of them (`wiring`) was narrower than the field it overrode.
> They are `DevtoolsDock`'s single `reading?: DiagnosticsReading` beside
> `diagnostics`, merged by the model's `mergeReading` with one `??` per field.
> The same-day decision it reverses (ARCH-24's D-24-c, "keep both, with
> explicit-prop precedence per field") rejected *losing* supplied readings, not
> carrying them in one value, and its semantics are unchanged: supplied wins
> field by field, sampling and supplying stay distinct questions, and nothing
> samples unless `diagnostics` is handed. `hydrationMismatches` is removed
> outright: `hydration.mismatched` counts the same thing and needs no host.
> **Breaking** for `@qadi/devtools`, with no alias kept.

The shared mechanics of the three stores (`TimelineStore`, `SimulationSession`,
`DiagnosticsStore`) are `model/ExternalStore.ts` and `react/useRunningStore.ts`,
internal and out of both barrels. What stays in each store is its identity
policy. Sampling stays pull-based
([BEH-QD-216](../behaviors/28-devtools-screens.md), [ADR-QD-052](./052-hydration-is-counted-where-both-ends-can-see-it.md));
the headless/React split and the hydration counts are unchanged, and gates stay
a prop fed by the host's subscription ([ADR-QD-080](./080-a-gate-registry-belongs-to-its-atom-set.md)).

> **Amended 2026-10-08 (CCR-QD-321): the model's interface.** "The headless model for
> non-React shells" named what a second shell is for and not what it may import, and
> the barrel answered by exporting every name a module declared: 245 across both entry
> points, of which a host (the newsroom example) used 11. Each screen refactor was then
> a public API change with a gate-13 row, and one revision (1.54) added 36 names, almost
> all a screen's mechanics.
>
> The model's interface is now what a shell *crosses*. The root exports the three
> stores (`TimelineStore` with `runSource`, `SimulationSession`, `DiagnosticsStore` with
> `runDiagnostics`); the host wiring `DevtoolsDock` takes (sources and their merge, the
> collectors, hydration, the wiring report, ports and the catalogue); the timeline
> readings this ADR's Decision lists (verdict classification, pairing, the policy/trace
> zip, filters, selection); and every type those signatures name (a type a public
> signature names is public, whether or not anything constructs it). The React entry
> exports the dock and the React half of the three stores. A screen's mechanics (form
> codecs, sweep planning, remedy synthesis, capture decorators, replay reconstruction,
> role-tree walks, gate grouping, lens geometry) and the panels the dock composes are
> package-private: they exist to produce what one screen draws, and no non-React shell
> needs them.
>
> A second shell built inside this package (ADR-QD-049's CLI, whose package no ADR has
> named) may read private modules; one built outside it uses the readings. The simulator
> a host drives is `makeSimulationSession`, not `simulate` and `whatIf`, which the
> acceptance suite now reflects: it tests what ships. The barrels *name* their exports
> (ADR-QD-099's amendment), `test/surface.test.ts` and `surface.tst.ts` pin the list,
> and the house-style rule `devtools-named-barrel` refuses an `export *` there.
> **Breaking** for `@qadi/devtools`: 87 names released in 0.11.0 are no longer
> importable (56 from the root, 31 from `@qadi/devtools/react`), and 24 more were never
> released. The Decision's list is unchanged; only its reachability is.

> **Amended 2026-11-09 (CCR-QD-394): the explorer's state is model too.** Screen 3 held
> its chosen policy, its draft, its preview and its JSON pane in seven `useState`s across
> two views, and three of its rules were wrong where no model test and no mutation run
> could see them: a preview outlived the policy it previewed (so `apply` applied a tree
> that was never shown), a paste's refusal outlived the text it refused, and an unloaded
> edit was lost by glancing at the tree. It also lived as long as its tab, so choosing a
> policy, looking at the log and coming back showed the head again.
>
> It is `ExplorerSession` now (`model/ExplorerSession.ts`), the 1.2 amendment's argument
> one screen later: a store on `makeExternalStore` with seven synchronous commands, the
> held-choice rule through `HeldChoice.ts`, the codec round trip and the refusal
> formatter in the model, under the 95% coverage bar and the mutation gate. A preview is
> a flag and never a stored policy, so a preview of a policy other than the one shown is
> unrepresentable. The session is package-private (the 1.6 amendment's rule for a
> screen's mechanics: nothing but the dock drives it) and `DevtoolsDock` owns it, as it
> owns the simulator's. The role viewer's held choice is a `HeldChoiceStore`
> (`HeldChoice.ts`) the dock owns for the same reason. No exported name changed.

> **Cross-reference 2026-11-10 (CCR-QD-397).** The stream's prelude rules that
> `sourceFromEventSource` used to state for itself (wait for `synced`, a
> `message` before it is live, a later `synced` skipped, no prelude within
> `syncTimeout` leaves the backlog absent) are `@qadi/core`'s
> `decodeDecisionStream`, the reader half of the order
> [ADR-QD-097](./097-a-decision-log-is-a-sink-and-its-own-history.md)'s
> 2026-11-10 amendment gives one owner. The model's interface is unchanged:
> `sourceFromEventSource` keeps its signature and `SourceRead`, and is now the
> `EventSource` adapter over that decoder.

> **Amended 2026-11-10 (CCR-QD-400): the simulator's input fields are described once.**
> `SimulationInput` holds seven list-or-record fields, and six modules used to restate
> each (where it lives in the input, its codec, its equality, who an element names, what
> dropping it is called); when `signatures` gained its form field, five were told and the
> weakening sweep was not, so a `hasSignature` allow swept to a table that never asked
> *was it the signature?* The model now holds the description in `SimulationFields.ts`:
> one closed row per field, after
> [ADR-QD-094](./094-a-port-is-described-once.md)'s pattern of stating a port's facts
> once and deriving the rest. The weakenings, the remedies' grants, the subject rename,
> the replay's unseeded list, the fixture ports (keyed by core's `PortName`, so a port
> added to the registry is a compile error here) and the session's chip commands are
> derived from it, and a missing row or column is a compile error
> ([INV-QD-257](../invariants.md#inv-qd-257-each-simulation-input-field-is-described-once)).
>
> "Renders that model and computes nothing" now holds of the chip text too: the session
> gains `addChip`, `removeChip` and `snapshot.fields` (the form's reading), so the rules
> for a chip - attribution to the current subject, a structural duplicate refused, a
> record pair replaced - are tested headlessly, inside the mutation gate, and
> `Simulator.tsx` maps rows to editors. The table and its operations are
> package-private ([ADR-QD-099](./099-entry-points-are-a-closed-list.md)); the types the
> session's interface names (`SimulationField`, `FieldView`, `ChipView`, `ChipAdded`)
> are exported.
>
> Where the typing buffer lives was decided on 2026-11-10 as option A: *"Chip typing
> buffer stays in the view; `addChip(field, text): ChipAdded`"*. The uncommitted text
> is the view's only state and a refused chip's reason is the command's answer. The
> 2026-11-09 amendment moved the explorer's typed JSON text into `ExplorerSession`, so
> holding each chip buffer in the session too (a `typeChip(field, text)` command and a
> `FieldView.pending`) would be the consistent choice; it was not taken here because it
> is new design beyond the ported one, and it can be added later without breaking
> `addChip`'s shape. No new ADR: this amends the model's boundary, which this record
> owns (ARCH-61, porting lost ARCH-48 `950977f`).

> **Amended 2026-11-10 (CCR-QD-405): the dock's state is model too; replay is a command.**
> `DevtoolsDock` held the log's filters, the active tab, the selected row and the replay
> seed in four `useState`s, with the pairing, the counts and the selection as memos over
> them. Its comment called replaying "an act rather than a consequence", but the code
> made it a consequence: `replay(entry)` set a `seed` prop, `useOwnedSimulationSession`
> handed it to `session.seed` from an effect, and `seed` returns early for the entry it
> last seeded. So replaying row A, choosing another policy from the rail (or editing the
> form) and replaying A again did nothing: React skipped the identical prop, and the
> session's guard would have skipped it anyway. The simulator kept the other policy under
> a button that promised a re-seed.
>
> Two changes, the 2026-11-09 amendment's argument one screen further out:
>
> - **Replay is `SimulationSession.replay(entry)`**, a command that always re-seeds, even
>   the entry last seeded. `seed(entry)` stays the host's prop-driven path and keeps its
>   same-entry guard, because an effect re-run must not wipe a half-filled form. The two
>   are told apart by method, not by comparing identities, and both run one re-seed, so
>   a replay and a first seed cannot drift.
> - **The dock's tab, filters, selection and replay are `DockSession`**
>   (`model/DockSession.ts`), a store on `makeExternalStore` with `setTimeline`, `setTab`,
>   `setFilters`, `select` and `replay`. It owns the rules the dock used to state in
>   memos ([BEH-QD-389](../behaviors/28-devtools-screens.md#beh-qd-389-the-docks-choices-are-a-session)):
>   pair the whole timeline, then filter; count the whole timeline; `select` opens the
>   inspector; `replay` opens the simulator and commands the simulation through the
>   `{ replay }` it was built with. It imports neither React nor `SimulationSession`,
>   and is tested headlessly under the model's coverage and mutation bar.
>   `DevtoolsDock` owns it through `useOwnedDockSession` (`react/useDockSession.ts`) and
>   is a view of it. Both modules are package-private (the 1.6 amendment's rule for a
>   screen's mechanics), so no exported name changed except `SimulationSession`'s new
>   method.
>
> **This reverses ARCH-20's D-20-g for replay only.** D-20-g gave the dock the simulation
> session and let `seed` flow into it as a prop the session reads from an effect (ARCH-20's
> task T9: "the session re-seeds through its effect, once"). That stays true of a host's
> `seed` prop; it is no longer how the dock replays
> ([BEH-QD-390](../behaviors/29-devtools-simulator.md#beh-qd-390-replay-is-an-act)).
> No new ADR: ARCH-20 had none of its own, its decisions are amendments to this record,
> and this amends the same boundary (ARCH-63).

> **Amended 2026-11-11 (CCR-QD-415): the simulator is a view of its session.** The Simulator
> had two session paths (`OwnedSimulator` built its own, `SharedSimulator` took the dock's)
> and, beside them, computed in the view what the dropdown selects, a parse of the
> select's value, the action's codec, the run's reading, the cost sentence and the
> baseline summary, none of it under the model's mutation gate (ARCH-73). It now takes
> `{ session }` and nothing else, and the session owns those readings (`policyMenu`,
> `cost`, `baselineReading` and a finished run's `reading`) and the commands the view
> dispatches (`setAction`, `choosePolicyAt`). The screen renders them and computes none of
> it ([BEH-QD-460](../behaviors/29-devtools-simulator.md#beh-qd-460-the-simulator-renders-its-session-and-computes-nothing)).
>
> **The run lifecycle is not decided here.** It is
> [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md)'s, which
> **supersedes ARCH-20 D-20-b** ("`session.run` is an Effect, the hook forks"): the session
> is built in a scope, owns its runs through a `FiberHandle`, and has no `reap`, `hasRetired`
> or `dispose`. `useOwnedSimulationSession` and `useSimulationSession` therefore build the
> session in a scope a component owns and return `undefined` until it exists.

> **Amended 2026-11-11 (CCR-QD-416): the dock is one model.** `DevtoolsDock` built six
> stores in React (the timeline, the policy rail, the explorer, the role choice, the
> simulation and its own session) and joined them with six layout effects and a
> memo, so the rules between them were reachable only by rendering the whole dock. The
> dock's test was a 1,430-line file of them: "a timeline change after a replay keeps
> the replayed form" and "a new head during the visit does not change what the explorer
> shows" are model rules, not layout. The 2026-11-09 and 2026-11-10 amendments moved
> each screen's state into a session; this one moves what connects the sessions.
>
> - **`makeDockModel` owns the six stores and pushes the rail**
>   (`model/DockModel.ts`, package-private). Each shown timeline, and each catalogue,
>   computes `catalogueOf` once and reaches the explorer, the simulation and the dock
>   session synchronously, so no two screens read different timelines
>   ([BEH-QD-465](../behaviors/28-devtools-screens.md#beh-qd-465-the-dock-is-one-model),
>   [INV-QD-296](../invariants.md)). Host inputs arrive through one `configure`, which
>   dispatches only an input whose identity moved: ARCH-63's defect class (a re-render
>   wiping a half-filled form) stated once as a model rule instead of avoided once per
>   effect.
> - **It is built in a `Scope`, and reads its source in that scope.** The model builds the
>   simulation session in its scope, by [ADR-QD-137](./137-a-devtools-session-owns-its-runs-through-a-scope.md)'s
>   rule, which is cited here and not restated, and keeps a `FiberHandle` of its own for
>   the source it reads. A new source supersedes the previous read; closing the scope
>   interrupts both the read and a run in flight. There is no `dispose` and no `read`
>   command.
> - **React has one owned-model hook, and it forks nothing.** `useDockModel`
>   (`react/useDockModel.ts`, package-private) owns the one scope through `useScoped`
>   and forwards every host input through one `configure` layout effect. The owned
>   hooks (`useOwnedDockSession`, `useOwnedExplorerSession`, `useOwnedHeldChoice`,
>   `useOwnedSimulationSession`) are deleted. `useOwnedSimulationSession` was public, but
>   unreleased: no consumer holds it, so nothing is broken.
> - **A choice from a list has one shape.** The simulation session, the explorer session and
>   the role viewer's store each re-implemented "held, pinned, resolved, no longer listed"
>   and each mapped it into a local union. Both sessions now embed one held-choice cell
>   (`model/HeldChoice.ts`), and `PolicyChoice` and `ExplorerShown` carry its arms,
>   `Empty`, `Listed` and `Evicted` (`PolicyChoice` adds `Seeded`, `ExplorerShown` adds
>   `Draft`). `HeldChoice` is exported as a type
>   ([BEH-QD-466](../behaviors/28-devtools-screens.md#beh-qd-466-a-choice-from-a-list-has-one-shape)).
>   `PolicyChoice`'s arms were `None`, `Chosen`, `Evicted` and `Seeded`; the first two are
>   renamed, and the amendment is to a type released nowhere.
>
> **A hide and a show of the dock now rebuilds the model.** The timeline lives in the
> model, so a React `Activity` that hides and shows the dock returns a paused dock to live
> and reads the backlog again. A host that never wraps the dock in `Activity` never sees
> it, and keeping the timeline across a hide is a design change this record does not make.
>
> This extends the 2026-11-09 and 2026-11-10 amendments and reverses neither: the
> explorer's and the dock's state are still sessions, and replay is still a command.
> No new ADR: this amends the model's boundary, which this record owns. ADR-QD-138 was
> reserved for it and is left unused (CCR-QD-416).

> **Amended 2026-11-12 (CCR-QD-425): diagnostics are the dock model's seventh store.** The
> dock forked its diagnostics poll from a React effect through `useRunningStore`, with a
> hand-written dependency list, and merged the supplied reading in a `useMemo`. It was the
> one place the dock still broke the 2026-11-11 amendment's "one owned-model hook, and it
> forks nothing", and it had a defect the rest did not: a sample that died (a throwing
> `questions`) ended the fiber, a fiber handle drops a dead fiber without a word, and the
> Services and React panels froze on their last reading with nothing said (ARCH-82).
>
> - **One scoped feed, with a closed status.** `model/DiagnosticsFeed.ts`
>   (package-private) runs one `FiberHandle` in the owner's scope and forks it while the
>   owner is built, so `useScoped`'s synchronous build never waits on a layer. `configure`
>   restarts on `layer`, `collector`, `questions` or `intervalMillis` changing identity,
>   or on `diagnostics` going defined or `undefined`; `restart()` starts it again with the
>   options it holds. Its snapshot is `{ status, reading }`, and `status` is a
>   `Data.TaggedEnum`: `Off`, `Starting`, `Live`, `Stopped { reason, sampled }`
>   ([BEH-QD-506](../behaviors/28-devtools-screens.md#beh-qd-506-the-diagnostics-poll-is-the-dock-models-seventh-store-with-a-closed-status)).
> - **A defect stops visibly; an interruption never does.** The run's exit is observed,
>   and `Cause.hasInterruptsOnly` separates an interruption (a restart, `configure(undefined)`,
>   the scope closing) from a defect. A per-start token keeps a replaced run's late exit
>   or sample from writing over a fresh one, the last accepted reading stays, a layer that
>   fails to build stays `WiringRead.Failed` inside a feed that is `Live`, and every restart
>   passes through `Starting`
>   ([BEH-QD-507](../behaviors/28-devtools-screens.md#beh-qd-507-a-defect-stops-the-poll-visibly-and-a-restart-resumes-it),
>   [INV-QD-313](../invariants.md#inv-qd-313-a-poll-defect-is-stated-an-interruption-never-is-and-a-replaced-run-never-writes)).
> - **The merged reading is the seventh store.** `DockModel` merges the feed's reading
>   with the supplied one when the feed publishes or `reading` changes identity, never in
>   `getSnapshot`, so it keeps its identity between changes. `DevtoolsDock` renders it
>   and merges nothing
>   ([INV-QD-314](../invariants.md#inv-qd-314-the-merged-diagnostics-reading-is-the-models-computed-when-an-input-changes-and-keeps-its-identity)).
> - **Lifetime.** A hidden `Activity` rebuilds the model, so after a show the diagnostics
>   are at `Starting` with no reading, and the gap is stated rather than bridged. Holding
>   the reading above the model was rejected: it gives the dock a second owner of what the
>   model owns. `undefined` options are `Off` with `noDiagnostics`
>   ([BEH-QD-508](../behaviors/28-devtools-screens.md#beh-qd-508-the-diagnostics-and-the-timeline-live-as-long-as-their-owners-scope)).
> - **The public hooks are adapters over scoped feeds.** `useDiagnostics` returns
>   `{ status, reading }` (**Breaking** for `@qadi/devtools`), `useTimeline` reads through
>   a scoped timeline feed with its signature unchanged, and one store-snapshot hook
>   reads every store. `react/useRunningStore.ts` is deleted, so the sentence above that
>   names it among the shared mechanics is corrected by this amendment and not rewritten:
>   the shared mechanics are `model/ExternalStore.ts` and the store-snapshot hook
>   ([BEH-QD-510](../behaviors/28-devtools-screens.md#beh-qd-510-the-public-hooks-are-adapters-over-scoped-feeds-read-through-one-store-snapshot-hook)).
> - **Every screen that reads the diagnostics states the status the same way.** One shared
>   notice: `Starting` is polite, `Stopped` is announced once per stop with the reason and
>   a restart
>   ([BEH-QD-509](../behaviors/28-devtools-screens.md#beh-qd-509-every-screen-that-reads-the-diagnostics-states-its-status-the-same-way)).
> - **Three questions the research left open, answered.** (1) The timeline's placeholder
>   before its feed exists is an inert module-scope store, `idleTimeline`: a shared live
>   one could be fed by one component and read by another. (2) `useDiagnostics` before its
>   feed exists is `Off` with no options and `Starting` otherwise, never a reading that
>   looks sampled. (3) The `Stopped` reason is `Cause.pretty` kept verbatim and uncapped,
>   carried only in the model's in-memory snapshot and rendered as React text in a block
>   bounded in height, never sent to a sink record, a response, a log or a metric: this is
>   a developer tool in the host's own process, and a capped trace would hide the frame a
>   reviewer needs to find the defect.
>
> This extends the 2026-11-11 amendment and reverses nothing in it. A hide and a show of
> the dock still rebuilds the model; the diagnostics now say so. No new ADR: this amends
> the model's boundary, which this record owns. ADR-QD-147 was reserved for it and is left
> unused (CCR-QD-425).
