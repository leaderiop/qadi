# Wave 15 (v1.10): shared context for Phases 81–84

**Read first:** `.planning/phases/_SHARED-CONTEXT.md`. Its house rules, user preferences, verify-command hygiene and the
XC-05 mutation procedure all apply. **This file overrides only what it names:** the source, the base commit, the
numbering, the decisions and the per-phase evidence below.

**Source:** the 2026-11-24 architecture review,
`/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/8b5d3789-bd5e-4ce2-bf7e-0b31a0ae4995/scratchpad/architecture-review-20261124.html`
(session-scoped, outside the repo; it may be gone). One read-only explorer walked the files most often changed across
v1.7–v1.9; both live defects were reproduced by throwaway tests on `902d2128` before the milestone started (deleted
afterwards). Four researchers then wrote `.planning/research/` (STACK, FEATURES, ARCHITECTURE, PITFALLS, SUMMARY).
The milestone resolves all four candidates and the review's small finds, by a change or by a recorded decision.

**Base commit:** the head of `arch-wave-15`, off `arch-wave-14` at `902d2128` (v1.9, not merged, not released). Each
phase's base is its first commit's parent; that rule is unchanged from `_SHARED-CONTEXT.md`.

## Decisions (decided autonomously, 2026-11-24; locked)
The owner's standing instruction (2026-11-22): do not ask; take the most complete, clean solution; breaking changes are
fine with a **Breaking** changeset and an upgrade-guide entry. So nothing in this wave is asked; each grey area below is
decided at its phase's discuss step and recorded there as "decided autonomously" with the date.
- **D1 (scope):** all four review candidates become phases; the small finds fold into Phase 84 except the double
  `spread`, which belongs to Phase 81.
- **D2 (order):** 81 → 82 → 83 → 84, strictly serial. The two live defects first; 81 before 83 (both edit
  `DockModel.ts`'s `configure`); 83 before 84 (83 renames the module `useDiagnostics.ts` and `DevtoolsDock.tsx` import).
- **D3 (branch):** `arch-wave-15` off `arch-wave-14` at `902d2128`, stacked as v1.6 and v1.7 were. No merge, no push,
  no release.
- **D4 (research):** run; `.planning/research/` is this wave's research.

Grey areas for each phase's discuss step (researchers disagree or the spec is silent):
- **Phase 81:** where the shared collect-and-rethrow rule lives (export `throwCollected` vs a new package-private
  `callAll(calls, message)` that `notify`, the derived-store release and `configure` all call); `spread` made total vs
  the sightings rail as the model's fourth derived store (removes the double `spread` by construction; amends
  ADR-QD-185, BEH-QD-699, INV-QD-390); closing the diagnostics `Starting`-publish window (ADR-QD-177 d5) here vs
  recording it; reentrancy (a listener calling `configure`: read `held` at step time).
- **Phase 82:** the registry lifetime design. Research recommends recycling in place: one registry identity for the
  provider's life, `registry.reset()` (public, leaves it usable) on the deferred release instead of `dispose()`, then
  re-seeding from the latest props through a ref; hosted in a pure, injected-timer, package-private module (the
  `SweepScheduler` precedent) added to `stryker.react.mjs`. Open: re-applying hydration seeds and `initialValues` after
  a long hide (complete answer: yes), and telling a real unmount from a hide (React gives no signal; a straggling read
  after unmount recreates a node instead of throwing).
- **Phase 83:** remove `Diagnostics.questions` (Breaking devtools minor) vs keep; rename `DiagnosticsStore.ts` to
  `Diagnostics.ts` with its tests.
- **Phase 84:** `useLens(lens, questions)` subscribing once and returning both snapshots vs keeping two inputs;
  `useTimeline`'s per-render record memoised vs recorded as a rejection (ADR-QD-192 d8: fresh records by design).

## Execution order
Phases run strictly one at a time, in numeric order (81 → 84): every records plan edits the same spec registers, and
`use_worktrees` is false.

1. **81 first:** the live defect. It opens with the RED matrix (every store's listener throwing during `configure`, a
   two-throw case, the record path) and a single-spread count test.
2. **82:** the second live defect. It opens with the RED Activity test (stable provider element, a real `<Can>` below,
   parent-state toggle, a hide longer than a macrotask, an error boundary).
3. **83:** opens with a green characterisation table over the diagnostics status and reading transitions.
4. **84 last:** opens with green characterisation of the adapters it touches.

## Numbering reserved for v1.10
Next free on `911aa37f`: ADR-QD-194, CCR-QD-473, BEH-QD-741, INV-QD-407. The highest ARCH id in use is ARCH-127
(ARCH-128…131 are this wave's).

**The whole block below is reserved** in the shared reservation file
(`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`), set to CCR 476, ADR 197, BEH 760, INV 414 on 2026-11-24.
- **Never run `node scripts/next-id.mjs` while executing these phases**: every call writes a reservation.
- If a reservation goes unused, name it in the phase's CCR row ("Unused: …"). A phase that needs no new ADR (an amendment
  of an existing one suffices) leaves its ADR number unused and says so.
- Pass `--date 2026-11-24` (or the real date of the edit) to `spec-revise`.

| Phase | ARCH | ADR-QD | CCR-QD | BEH-QD | INV-QD |
|---|---|---|---|---|---|
| 81 | 128 | 194 | 473 | 741–745 | 407–408 |
| 82 | 129 | 195 | 474 | 746–750 | 409–410 |
| 83 | 130 | 196 | 475 | 751–755 | 411–412 |
| 84 | 131 | 197 | 476 | 756–760 | 413–414 |

ADR Document IDs must equal the file number (gate 10).

## Per-phase evidence

### Phase 81: The dock model applies every input whatever a listener throws (ARCH-128, devtools; live defect)
- `packages/devtools/src/model/DockModel.ts` `configure` (≈403–431): only `timelineFeed.configure` is in the `try`; the
  `finally` runs `spread` (explorer, simulation, dock), `roles.setList`, `simulation.setPorts`, `gatesFeed.configure`,
  `diagnosticsFeed.configure`, `shownReading.refresh` in a plain sequence, each of which publishes.
- **Reproduced (2026-11-24):** an explorer listener that throws leaves roles `[]`, simulation and explorer on different
  sightings, the dock on a stale row and diagnostics `Off`; an identical second `configure` does not heal it (catalogue
  compared by identity). Two throwing listeners: only the last escapes, as a plain `Error`.
- **Record path, no configure:** `spread()` runs from the dock's own timeline listener (≈349–356); an always-throwing
  explorer listener left the timeline at 2 entries, the dock at 0 rows and the simulation at 0 sightings.
- **Double spread:** capacity and catalogue in one `configure` spread twice (`catalogueOf` builds fresh sightings,
  `Catalogue.ts:155-189`), so explorer and simulation publish twice; CR22 (`ConfigureRule.test.ts:895`) and
  BEH-QD-735's counts encode that and must be restated. The second `spread` currently masks a throwing dock listener:
  removing it without making `spread` total regresses that case.
- **Diagnostics window:** a throw on the diagnostics feed's `Starting` publish leaves the poll unforked
  (ADR-QD-177 d5 left it out of scope); services and questions listeners reach it through `shownReading`.
- **The rule already exists twice:** `ExternalStore.ts` `throwCollected` (≈63), used by `notify` and the derived-store
  release; one throw rethrows itself, two or more an `AggregateError`.
- **Keep:** M55 (refused capacity throws before anything moves), M56, the step order (one join publish), the lens
  silent on configure. (`TimelineFeed`'s own `try/finally` was listed here; Phase 81's discuss step closed the
  `begin()`-to-`fork()` window at every site instead, 81-CONTEXT D-09, 2026-11-24.)
- `DockModel.ts` mutation record: 69 killed / 0 survived / 12 ignored at v1.9 close; a new `Ignored` mutant fails the
  compare, so keep new literals inside function bodies.

### Phase 82: `QadiProvider`'s registry has one owner for its lifetime (ARCH-129, react; live defect)
- `packages/react/src/QadiProvider.tsx`: registry built lazily in a ref (≈217–218); subject effect (≈257–261);
  `setTimeout(0)` dispose in an effect cleanup that also nulls the ref (≈285–299).
- **Reproduced (2026-11-24):** a stable provider element with `<Can>` below, inside an `<Activity>` its parent toggles,
  hidden past a macrotask then shown, throws `Cannot access Atom …: registry is disposed` twice (an `AggregateError`):
  from the consumer's `useAtomValue` subscription and from `QadiProvider.tsx:258`.
- **React 19.3.1 Activity (verified):** hide runs layout and passive cleanups; reveal of a stable element re-runs both
  with the last committed closure and no re-render; children's effects run before the provider's. So an effect-time or
  state-held rebuild is too late, and `useScoped` (renders nothing on the server pass) breaks SSR and the first-frame
  subject seed.
- **`AtomRegistry` (effect 4.1.2, `effect/reactivity/AtomRegistry`):** `dispose()` is terminal; `reset()` clears nodes
  and runs finalizers but leaves the registry usable; `ensureNode(atom).setInitialValue(v)` re-seeds; `disposed` is not
  on the interface. `@effect/atom-react`'s `RegistryProvider` has the same dispose-in-cleanup shape.
- **Scenario table today:** unmount disposes once after a macrotask; StrictMode keeps one registry; a short hide is
  fine; a long hide with a re-render silently builds a second registry and loses the decision cache; a subject change
  while hidden works; an `atoms` prop change keeps the registry and signals `AtomsReplaced` (must stay).
- **Tests:** P4 (`QadiProvider.sweep.test.tsx:136`) hides and shows in one tick; SUBJ1/SD3 re-render the provider or put
  the Activity below it; `edges.test.tsx:257` ("disposes its registry when unmounted") only checks the body is empty.
- `QadiProvider.tsx` is outside `stryker.react.mjs`; the lifetime rule moves into a headless module that is inside it.
- ADR-QD-148: no sweep inside the dispose-then-reread window; a hidden gate's question can be evicted and re-admitted,
  so P4's expectations do not carry to a long hide.

### Phase 83: The diagnostics feed folds its reading as a value (ARCH-130, devtools; Breaking if `questions` goes)
- `DiagnosticsStore.ts` (store with `subscribe`/`getSnapshot`/`accept`; ≈146–189, 238–260) has one caller,
  `DiagnosticsFeed`; its `subscribe` is reached only by its own test. `DiagnosticsFeed.ts` wraps it in `marking`
  (≈189–200), replaces it in `off()`, and `runDiagnostics` takes the whole store but calls only `accept` (compare
  `runSource`'s `Pick<TimelineStore, "accept">`).
- `Diagnostics.questions` is never written by the poll (`DiagnosticsStore.ts:252`); only `mergeReading` copies a
  supplied value (`:143`); the dock join reads `held.reading?.questions` (`DockModel.ts:378`). Nothing in src, docs,
  examples or READMEs reads it. `DiagnosticsStore`, `makeDiagnosticsStore` and `runDiagnostics` are unexported
  (`surface.tst.ts:240-265`); `Diagnostics` is public.
- **Keep:** the `isCurrent(token)` guard, the `sampled` flag, the `Live` mark, pins F1–F32.
- **Registers that name the module:** `spec/traceability.md:579-580`, AGENTS.md §6 (`DiagnosticsStore.tst.ts`, 3
  callable pins), `scripts/check-house-style.mjs:771`. A parameter change to `runDiagnostics` moves those three pins.

### Phase 84: `useConfigured` requires `configure`, and the small finds (ARCH-131, devtools)
- `useConfigured.ts:19-31`; identical adapters at `useDockModel.ts:22`, `useTimeline.ts:44`, `useDiagnostics.ts:19`;
  `useConfigured.test.tsx`'s double passes a function and must become an object.
- `LensSession.ts`: `move` (149–152) is exactly `ExternalStore.set`; `choose` (167–175) returns a boolean and arms before
  it publishes, so only its publish becomes `set`-like.
- `useLens.ts` takes `questions` and `instances` (`QuestionsPanel.tsx:114-118`); render-time `instances` and event-time
  `questions.getSnapshot()` can differ; `Lens.adapter.test.tsx:160` and traceability row 661 pin one subscription each.
- `DevtoolsDock.tsx` `DockFrame`: the stop-ledger ref and memoised notice are written twice (diagnostics, timeline).
- `useTimeline.ts:70`: a fresh `{ source, capacity }` per render; the feed no-ops on equal fields; `DevtoolsDock`'s
  `...inputs` and `useDiagnostics({})` build fresh records by design (ADR-QD-192 d8). The gates feed's retry on any
  `configure` (G43) depends on repeated calls, so memoise only where it cannot reach the gates.
- `src/react` is outside the devtools mutation gate (`stryker.devtools.mjs` reaches `src/model/**`).

## Cross-cutting
- Measure each touched file's mutation baseline at the phase base, and re-close after the review.
- Every phase edits the same registers, so the milestone close re-verifies 81–83 and re-runs each phase's record scripts.
- The archived v1.9 record scripts `79-pinned-check.mjs` and `80-pinned-check.mjs` hard-code
  `.planning/phases/QD-79…`/`QD-80…`, so they fail with ENOENT now that v1.9 is under `.planning/milestones/v1.9-phases/`.
  Run them from a scratch copy with the paths rewritten; do not edit the archive. Their held tests (M55/M56, G43,
  `ConfigureFirstRender`, `Lens.dock`) are what Phases 81 and 84 touch.
- Run vitest from the repo root (`pnpm vitest run --project devtools|react <file>`).
- Budgets that can move: `NOT_CALLABLE_PIN_BUDGET` (+ AGENTS.md §6 table); `MODULE_STATE_BUDGET` must not grow;
  `SWITCH_BUDGET` and `UNTRACED_BUDGET` must not move.
- No plan-local ids (`D-01`, `WR-01`) in shipped titles; no `*-NEXT` placeholders.

## Considered and dropped (do not re-propose in this wave)
- The audit package's shallow freeze and `WeakSet` brand: settled in ADR-QD-190 §7.
- `TimelineFeed.ts`'s `idleTimeline` restating the store's members: needed for the first pass; one copy remains.
- `AtomRegistry`'s `scheduleTask`/`defaultIdleTTL`: AGENTS.md §13 and ADR-QD-148.
