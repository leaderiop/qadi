# Architecture Patterns: v1.11 Arch Wave 16 (Phases 85-91, ARCH-132..138)

**Domain:** internal architecture-deepening wave of an existing Effect v4 monorepo (Qadi)
**Researched:** 2026-11-25 (base `main` at `ac7578f3`, branch `arch-wave-16`)
**Overall confidence:** HIGH for integration points, file lists, ADR quotes and the cycle analysis (read from source; madge graph run read-only). MEDIUM for the exact shape of Phase 87 and Phase 90 (several valid shapes, one recommended, flagged below).

Method note. Every ADR sentence quoted below was read from `spec/decisions/*.md` in this checkout. Cycle verdicts come from `pnpm exec madge --json --extensions ts,tsx packages/<pkg>/src` (the same invocation as `pnpm circular`, which is clean today: "No circular dependency found", 245 files). Each proposed fold was simulated by merging the two nodes in that graph and re-running a cycle search. Nothing in the repo was edited; the scratch graphs are in the session scratchpad.

---

## 0. Cross-cutting results (read these first)

### 0.1 Three findings that change what a phase may promise

| # | Finding | Phase | Consequence |
|---|---------|-------|-------------|
| F1 | `Hydration.ts` (react) **cannot** fold into `HydrationEngine.ts`. `QadiAtoms.ts` imports `HydrationEngine.ts`, and `Hydration.ts` is the one file that imports `QadiAtoms` (for `hydrateDecisions(atoms: QadiAtoms, ...)`). Merged, `HydrationEngine.ts > QadiAtoms.ts > HydrationEngine.ts` is a cycle (madge counts type-only edges, ADR-QD-037). `Hydration.ts` **is** an ADR-QD-037 cycle-breaker. | 91 | Either keep `Hydration.ts` and record why, or make `hydrateDecisions` take a structural parameter declared in `HydrationEngine.ts` (see 91.4). Recommended: structural parameter, because it makes the fold real instead of recorded. The phase text already says "folds only where the madge graph proves no cycle returns", so this is the rule working, not a deviation. |
| F2 | `PortName` cannot be derived **from the registry** and stay a leaf. `PortName -> Ports.ts` closes `Admission > LeafNeeds > DecisionHistory > PortDerivation > PortDefault > PortName > Ports > AttributeResolver > PortDerivation`. `PortMetrics` needs the names at module load (`preregisteredWords`). | 90 | `PortName.ts` stays the one leaf. It shrinks to one hand-written name list; the type is derived from it, and everything else per-port (span, serving declaration, fixture data) moves onto the description. "PortName derived" means "derived from the one list, not from a second table". |
| F3 | `String(exit.cause)` at `SimulationSession.ts:418` does **not throw** (probed: `String(Cause.die(hostileValue))` returns `Cause([Die([toString threw])])`; `Cause.pretty` is the one that throws). ADR-QD-182 decision 11 explicitly leaves `String(cause)` alone at three core sites. The divergence is **text**, not totality: `Cause([Die(Error: boom)])` versus `causeMessage`'s pretty trace. | 87 | The opening RED test must assert text equality with `causeMessage(cause)` (and the hostile-value placeholder), not "does not throw". Do not describe it as a defect in the ADR; describe it as the one devtools site decision 10 did not list. |

### 0.2 Fold and cycle verdicts (madge graph simulation)

| Proposed fold | Verdict | Evidence |
|---------------|---------|----------|
| `PortSpanDecode.ts` into `PortSpanEncode.ts` | **acyclic** | `PortSpanDecode -> PortSpan, PortSpanEncode`; only `index.ts` imports Decode; Encode never imports Decode. |
| `PortSpanDecode.ts` into `PortSpan.ts` | **CYCLE** | `PortSpan > PortSpanEncode > PortSpan` (confirms the review's caveat). |
| `PortInterpreter.ts` into `PortSpan.ts` | **acyclic** | `PortInterpreter` has no imports; importers are `PortSpan` and `PortSpanEncode`; Encode already imports PortSpan. |
| `PortInterpreter.ts` into `PortSpanEncode.ts` | **CYCLE** | `PortSpan.ts` must import the type from Encode while Encode imports PortSpan. |
| `GateRegistry.ts` into `GateWriter.ts` (react) | **acyclic** | `GateWriter.ts` imports nothing in-package; `GateRegistry` adds `DeveloperSignals.ts`, which does not import `GateWriter`. |
| `SequenceIntegrity.ts` into `ArchiveFacts.ts` (audit) | **acyclic** | `SequenceIntegrity` imports only `ArchiveFacts`; it is imported only by `index.ts`. |
| `Hydration.ts` into `HydrationEngine.ts` (react) | **CYCLE** | See F1. |
| `PortName.ts` into `PortDescription.ts` | **CYCLE** | `PortDefault > PortDescription > PortDefault`. |
| `PortName.ts` importing `Ports.ts` (derive from registry) | **CYCLE** | See F2. |
| `PortAccess.ts` importing `LeafNeeds.ts` (Phase 90 routing) | **acyclic** | `LeafNeeds` reaches 46 modules, none of them `PortAccess` or `Ports`; `LeafNeeds` is imported by `Admission`, `Predicate`, `Walk`. |

### 0.3 File-overlap matrix (src files edited per phase; T = test/spec/script surface)

| File / surface | 85 | 86 | 87 | 88 | 89 | 90 | 91 |
|----------------|----|----|----|----|----|----|----|
| `devtools/src/react/DevtoolsDock.tsx` (DockFrame 110-115, Screen 258) | **edit** | | | **edit** | | | |
| `devtools/src/model/DockModel.ts` | **edit** | | | | | | |
| `devtools/src/model/DiagnosticsFeed.ts` | read (`isUnsampled`) | | **edit** | | | | |
| `devtools/src/model/TimelineFeed.ts`, `GatesFeed.ts`, `SimulationSession.ts`, `ExternalStore.ts` | | | **edit** | | | | |
| `devtools/src/react/QuestionsPanel.tsx`, `useStoreSnapshot.ts` | **edit** | | | | | | |
| `devtools/src/react/StoppedBox.tsx`, `TimelineNotice.tsx`, `DiagnosticsNotice.tsx`, `useStopNotice.ts` | | | | **edit** | | | |
| `react/src/QadiProvider.tsx` | | **edit** | | | | | **edit** (import lines only) |
| `react/src/RegistryLease.ts` | | internal seam (unchanged file) | | | | | |
| `stryker.react.mjs` | | **edit** (add owner) | | | | | |
| `audit/src/ArchiveFacts.ts` | | | | | **edit** | | **edit** (absorbs `SequenceIntegrity.ts`) |
| `audit/src/AuditArchive.ts`, `Retention.ts`, `CodecMade.ts` | | | | | **edit** | | |
| `core/src/PortName.ts`, `Ports.ts`, `PortServing.ts`, `PortMetrics.ts`, `PortDescription.ts`, `PortDerivation.ts`, `PortAccess.ts`, `LeafNeeds.ts`, five port modules | | | | | | **edit** | barrel names these |
| `core/src/PortSpan.ts`, `PortSpanEncode.ts`, `PortSpanDecode.ts`, `PortInterpreter.ts` | | | | | | not touched | **edit** (folds) |
| `*/src/index.ts` (core, react, audit) | | | | | | | **edit** |
| `scripts/check-house-style.mjs`, `AGENTS.md` §9, `spec/overview.md` | | | | | | rows only | **edit** |
| `spec/behaviors/28-devtools-screens.md` | BEH-700 + new | | new | new | | | |
| `devtools/test/model/DockModel.test.ts` (store list), `ConfigureRule.test.ts` (sweep of all stores) | **edit** | | | | | | |
| `devtools/test/helpers.ts`, `builtFeeds.ts` | | | **edit** | **edit** | | | |

### 0.4 Order verdict: 85 -> 91 is right; keep it strictly serial

- **91 must be last and must follow 89 and 90.** It names every export of every module in the three barrels, so it must see the final export set of `PortName.ts`/`Ports.ts`/`PortServing.ts` (Phase 90 moves `PortServing` and `PortFixtureData` to derived types) and the final `ArchiveFacts.ts` (Phase 89 splits it before 91 absorbs `SequenceIntegrity.ts`). It also edits the import lines of `QadiProvider.tsx` after Phase 86 has rewritten that file's body.
- **85 before 88.** Both edit `DevtoolsDock.tsx` lines 110-115. Phase 85 rewrites line 112 (status-only read) and 258 (hydration prop leaves); Phase 88 then rewrites the two `useStopNotice` calls on 113 and 115 and the `StopNoticeProps` shape. The reverse order forces 85 to rebase over a changed ledger type.
- **87 before 88.** The notices import `TimelineStatus` and `DiagnosticsStatus` from the feeds. 87 keeps both unions as they are (recommended), so 88 has no dependency on 87's shape, but 87 touching the feed files first keeps a single reviewer context for "what a stop is".
- **86 is independent** of 85/87/88 (different package) and of 89/90. Its only forward constraint is 91. Its position at 86 is by review rank, not dependency. Do not move it after 91: 91 edits `QadiProvider.tsx` imports.
- **89 is independent** of everything but 91.
- **No overlap forces a different order.** The only same-file overlaps are 85/88 (`DevtoolsDock.tsx`), 89/91 (`ArchiveFacts.ts`), 86/91 (`QadiProvider.tsx`), 90/91 (names). Each already has the earlier phase first.

### 0.5 Id allocation (reserved; do not run `next-id.mjs`)

| Phase | ADR | CCR | BEH | INV |
|-------|-----|-----|-----|-----|
| 85 | ADR-QD-198 | CCR-QD-477 | BEH-QD-761..765 | INV-QD-415, 416 |
| 86 | ADR-QD-199 | CCR-QD-478 | BEH-QD-766..770 | INV-QD-417, 418 |
| 87 | ADR-QD-200 | CCR-QD-479 | BEH-QD-771..775 | INV-QD-419, 420 |
| 88 | ADR-QD-201 | CCR-QD-480 | BEH-QD-776..780 | INV-QD-421, 422 |
| 89 | ADR-QD-202 | CCR-QD-481 | BEH-QD-781..785 | INV-QD-423, 424 |
| 90 | ADR-QD-203 | CCR-QD-482 | BEH-QD-786..790 | INV-QD-425, 426 |
| 91 | ADR-QD-204 | CCR-QD-483 | BEH-QD-791..795 | INV-QD-427, 428 |

Existing ADRs that take a **dated amendment note** (never a rewrite; AGENTS.md section 15 keeps history): 85 -> ADR-QD-185, 168; 86 -> ADR-QD-195, 148 (one line: the lease still never touches the sweep); 87 -> ADR-QD-150, 182, 192, 194; 88 -> ADR-QD-197; 89 -> ADR-QD-190; 90 -> ADR-QD-094, 114 (not in the milestone list; see 90.5), 134, 163; 91 -> ADR-QD-037, 047, 099, plus AGENTS.md section 9.

---

## Phase 85: The dock's hydration block is a model row (devtools; ARCH-132)

### Constraining ADRs (quoted)

- **ADR-QD-168** (a port card is a model row). Decision 7: "`DockModel.services` is the dock model's ninth store (D-03 as amended). It holds the `ServicesView` and is recomputed only when the wiring read, the activity, the call log or the unsampled flag changes identity, the way `questions` is." Decision 8: "The panel renders the store and computes nothing ... The fixed prose stays in the view because it is text and not a rule ... Every word and `data-testid` is byte-identical to the base (D-09)." Decision 1: `portCards` is "one pure function in `PortCards.ts`, package-private (ADR-QD-099)". Decision 2: `Withheld` "(no layer handed and no sample yet, which the panel renders as nothing ...)". Its 2026-11-22 note: "`services` is a derived store, and the count is BEH-QD-700's, listed once."
- **ADR-QD-185** (computed stores are derived stores). Decision 11: "**The model, not a panel `useMemo`, is where a computed view lives** ... A computed store belongs to the model and is built as a derived store." Decision 10: "**The store count is stated once, in BEH-QD-700**, as the list of `DockModel` members that have `subscribe` and `getSnapshot`. A test of a built model lists the members that have both and fails when one is added or removed." Decision 9 fixes build order: shown reading, then `questions`, then `services`. Its CCR-QD-473 note already records the precedent for growing the count: "the sightings rail is the fourth derived store ... It is internal."
- **BEH-QD-700**: "The dock model's stores MUST be exactly the members of `DockModel` that have `subscribe` and `getSnapshot`: `timeline`, `dock`, `explorer`, `roles`, `simulation`, `diagnostics`, `timelineStatus`, `questions`, `services` and `lens`; `sightings` is a thunk and not a store." It says "ten of them, in no particular order" and is "kept equal by review, not by a gate".

### Answer to "fifth derived store vs riding the questions store"

**Build a fifth derived store, `hydration`.** It is the eleventh member listed by BEH-QD-700, and the fifth `makeDerivedStore` in `makeDockModel` (rail, shown reading, `questions`, `services`, `hydration`). Reasons, each checked in source:

1. **Different key, different rule.** `questions`' key is `{ feed, supplied, unsampled }` where `unsampled: supplied === undefined && isUnsampled(status)` (`DockModel.ts:386-392`). Hydration's rule is the **plain** `isUnsampled(status)` with no `supplied` qualifier (today `QuestionsPanel.tsx:112`). Riding the questions store would either import the qualifier into the hydration rule (changing behavior) or carry two `unsampled` booleans in one key.
2. **Recompute coupling.** Adding the hydration field to `JoinKey` makes `joinQuestions` (an O(guards x questions) join) recompute whenever a metric count moves. `useLens` subscribes to the questions store (ADR-QD-197 decision 3), so a count change would also re-notify the lens adapter.
3. **Precedent and the stated rule.** ADR-QD-185 decision 11 and ADR-QD-168 both say a computed view is its own model store; the Services tab is the same shape. The "count stated once" rule exists precisely so a new store costs one sentence (BEH-QD-700), not five.
4. **The cost is small and already paid for.** `ConfigureRule.test.ts` sweeps "all ten stores" and `DockModel.test.ts` holds a store-list test; both are the intended tripwires and are edited, not redesigned.

**Rejected: a sixth store for the diagnostics status** to stop `DockFrame` re-rendering (see data flow). A selector in the one hook is enough and has precedent (`usePaused`).

### Integration points

- Parent: `shownReading` (the merged `{status, reading}` store, `DockModel.ts:368-375`). Key: `{ hydration: reading.hydration, unsampled }`, compared by identity per field by `sameFields` (ADR-QD-185 decision 2). Compute: the new pure view function. Build position: after `services` (ADR-QD-185 decision 9 lists the order; add one name).
- Consumer: `QuestionsPanel` gets `hydration: ReadableStore<HydrationView>` beside `questions`/`lens`, reads it with `useStoreSnapshot`, and maps tags to JSX through a hoisted `Match.type<HydrationView>()` (ADR-QD-168 decision 8's shape).
- `DevtoolsDock.tsx`: `Screen` stops taking `shown` (line 229) and stops passing `props.shown.hydration` (line 258). `DockFrame` stops destructuring `reading: shown` (line 112).
- The "unsampled rule decided once": `isUnsampled` is already one function (`DiagnosticsFeed.ts:87`). The defect is three **call sites** with a fourth coming. Decide once by one module-scope key reader in `DockModel.ts`, `shownInput(shown) => { reading, unsampled }`, used by `services` and `hydration`; `questions` keeps its `supplied`-qualified variant but calls the same `isUnsampled`. `QuestionsPanel.tsx:29` stops importing `isUnsampled`. That leaves exactly one place that spells "no sample taken yet means withhold".

### New vs modified

| Kind | Module | Notes |
|------|--------|-------|
| **New** | `packages/devtools/src/model/HydrationView.ts` | Pure, package-private (ADR-QD-099). `HydrationView = Data.TaggedEnum<{ Pending: {}; Unwired: {}; Counts: {...} }>` and `hydrationView(input: { hydration: HydrationActivity \| undefined; unsampled: boolean }): HydrationView`. Beside `PortCards.ts`; inside the `src/model/**` mutation glob. |
| **New** | `packages/devtools/test/model/HydrationView.test.ts` (+ `.tst.ts` for the closed union) | The table test that replaces 20 test-id assertions across 5 React test files (review). Order of arms: `hydration === undefined` -> `unsampled ? Pending : Unwired`, else `Counts`. |
| Modified | `model/DockModel.ts` | New store; `DockModel.hydration: ReadableStore<HydrationView>`; header comment "four derived stores" -> five; shared key reader. |
| Modified | `react/QuestionsPanel.tsx` | `Hydration` and `Counts` components become tag renderers. Deletes `unaccountedEntries` import, `raised` filter, rate sentence, scope sentence. |
| Modified | `react/DevtoolsDock.tsx`, `react/useStoreSnapshot.ts` | Status-only read in `DockFrame` (below). |
| Unchanged | `model/Hydration.ts` | Stays the passive reader; `hasHydrated`, `hydrationActivity`, `unaccountedEntries` remain root exports (`src/index.ts:53`). `unaccountedEntries` is now called by the view. |
| Spec | BEH-QD-700 (list + "eleven"), ADR-QD-185 and ADR-QD-168 dated notes, new ADR-QD-198, BEH-QD-761..765, INV-QD-415/416 | Keep the "Noted 2026-11-22" ordinal-history style: older counts stay as written. |

`Counts` carries words, not numbers to be formatted by the panel: the four counts, `rate: string | undefined` ("N of M re-checked question(s) disagreed with the server." only when `rechecked > 0`), `drops: DropsView` (`None { watched: number }` | `Raised { rows }` with reason, count, meaning), and `scope: string` (the "Process-wide totals, not this page's." sentence with the `unaccountedEntries` branch). The panel's fixed JSX prose (the `Unwired` sentence containing `<code>` elements, `NO_COUNTS_YET`) stays in the panel, as ADR-QD-168 decision 8 allows for text that is not a rule. Every `data-testid` and word stays byte-identical; write the characterisation on the base first, as ADR-QD-168 decision 9 did.

### Data flow change

```
before: shownReading --(whole snapshot)--> DockFrame --shown.hydration--> Screen --> QuestionsPanel (isUnsampled x3, rate/drops/scope text in JSX)
after : shownReading --key{hydration, unsampled}--> hydration store --> QuestionsPanel (renders a tag)
        shownReading.status ----------------------> DockFrame (notice only)
```

`DockFrame` today calls `useStoreSnapshot(model.diagnostics)` and re-renders on every reading change to forward one field. After the move the frame needs only `status`. **Recommended:** give `useStoreSnapshot` an optional selector (`useStoreSnapshot(store, select)`) and read `statusOf` at module scope; React compares `Object.is` on the selected value, and `Live`'s identity is kept across unchanged samples (`DiagnosticsFeed.ts:192-195`), so a count change no longer re-renders the frame. Precedent: `usePaused` reads a derived boolean through the same hook. **Rejected:** a status-only derived store (a sixth store and another BEH-QD-700 edit to solve a React concern).

### Risks / flags

- ADR-QD-168's own text warns the model's store notifies twice `Off -> Live` (Starting is published between); the same holds for `hydration`. BEH should state the rule as identity of the key fields, as BEH-QD-615 does, not as a transition promise.
- Hydration counts are process-wide and read passively (the registry key note in `Hydration.ts`); the key field is the `HydrationActivity` object whose identity `foldReading`'s `keep` already preserves. Verify with a test that an unchanged sample publishes nothing from the new store (the M54-style pin).

---

## Phase 86: One React-free owner for the provider registry's lifetime (react; ARCH-133)

### Constraining ADRs (quoted)

- **ADR-QD-195** decision 1: "**One registry per provider, built in render, kept for the provider's life.** It is built lazily in a ref exactly as before, with the subject and `initialValues` as its `initialValues`, so a server render and the first client render have the subject with no pending frame. The ref is never cleared and nothing builds a second registry ... The registry is never disposed: `dispose()` is terminal."
- Decision 2: "`RegistryLease.ts` decides when the registry is recycled, and only that. `makeRegistryLease(recycle, defer)` is package-private, out of the barrel, imports neither React nor the provider ... Its state is a closed union of three, `Unheld`, `Held` and `Releasing` ... A release from `Held` defers one recycle by one macrotask (`setTimeout(..., 0)`, injectable); a hold during `Releasing` cancels it ... `cancel` is the only cancellation: there is no second guard inside the deferred run."
- Decision 3: "The provider only holds and releases. One effect, declared last, calls `lease.hold()` in its setup and returns `() => lease.release()`." Decision 4: "The recycle is `registry.reset()`, then the latest committed subject written back ... from a ref the provider writes in an effect on `[atoms, subject]` ... The subject is written in a `finally`." Decision 5: "Neither `initialValues` nor a hydration seed is written back." Decision 6: "The lease never touches the sweep ... never reads the registry's disposed state." Decision 7: "The lease's matchers are built once per lease, not at module scope ... The lease is in `stryker.react.mjs`'s `mutate` list."
- The alternatives ADR-QD-195 rejected (rebuild in an effect or hold in state; the `useScoped` shape; a registry proxy; dispose only on true unmount; never release; `dispose()` for `reset()`; re-apply seeds; write the subject in render; a second guard in the deferred run) all remain rejected. The review is right that **none of them was "an owner module"**.
- **ADR-QD-148** (atom set owns its sweep): "**The provider forks nothing.** `QadiProvider` owns a registry and nothing else; it takes no sweep interval." Its 2026-11-25 amendment: "`reset()` starts no pressure episode of its own and forks nothing."
- **ADR-QD-080**: the writer is resolved once by the provider (`gateWriterFor`); that memo is **not** registry lifetime and stays in the component.

### Decision: `RegistryLease` is an internal seam, not absorbed

Keep `RegistryLease.ts` unchanged and have the new owner **compose** it. Reasons:

1. Decision 2 and decision 7 make the lease a pure state machine over an injected `recycle` and `defer`, mutation-measured on its own (`stryker.react.mjs` lists it; `RegistryLease.test.ts` kills every mutant by itself). Absorbing it merges two concerns with different test seams: *when* (three-state machine) and *what* (reset then write back).
2. The lease knows nothing about registries, subjects or seeds. Absorption would buy no locality: the bug locus ADR-QD-195 describes was the red wiring in the component, not the lease.
3. Composition gives the review's goal exactly: the owner is tested with a fake `defer`, the lease with its own table, and no render in either.

### Integration points: which refs and effects move behind the owner

`QadiProvider.tsx` today: refs `registryRef` (238), `latestRef` (269), `leaseRef` (281), `atomsIdentityRef` (259), plus `signalRef` (228) and `reportedInstrumented` (314); seven effects (260, 270, 304, 315, 326, 336 and none other, counting by line).

| Today | Moves to owner? | New home |
|-------|-----------------|----------|
| `registryRef` + `AtomRegistry.make({ initialValues: [[atoms.subject, subject], ...initialValues] })` (238-244) | **yes** | owner construction |
| `latestRef` + effect writing it (269-272) | **yes** | owner's `commit` |
| `leaseRef` + the recycle body `reset()` then `finally { registry.set(latest.atoms.subject, latest.subject) }` (281-288) | **yes** | owner composes `makeRegistryLease(recycle, defer)` |
| subject effect `if (registry.get(atoms.subject) !== subject) registry.set(...)` (304-308) | **yes** | owner's `commit` |
| `atomsIdentityRef` + `AtomsReplaced` effect (259-263) | **yes (detection)**; reporting stays in the component | owner's `commit` returns whether the atom set changed identity since the previous commit; the component reports through `signalRef`. The owner holds `latest.atoms`, so a second ref for the same datum is deleted. |
| `signalRef`, `report`, `reportedInstrumented`, the two instrumentation effects (315-330) | no | developer-signal concerns, not registry lifetime |
| `writer` memo, `value`/`gateScope` memos, context providers | no | ADR-QD-080 / context identity |
| last effect `lease.hold()` / `lease.release()` (336-339) | **forwarded** | `owner.hold`, `owner.release` |

Result: the component keeps **one lifetime ref** (the owner) plus the signal refs, and four effects: commit (atoms replaced + latest + subject, one effect on `[owner, atoms, subject]`), the two instrumentation signals, and hold/release **last**. ADR-QD-195 decision 3's ordering invariant (the hold is the provider's last passive effect, so on a reveal it runs after every consumer subscribed and after the subject effect) is preserved by effect declaration order, and the owner makes the order testable as "`commit` before `hold`".

### New vs modified

| Kind | Module | Notes |
|------|--------|-------|
| **New** | `packages/react/src/ProviderRegistry.ts` | `makeProviderRegistry({ atoms, subject, initialValues, defer? }): ProviderRegistry` with `{ registry, commit(atoms, subject): boolean, hold(), release() }`. Imports neither React nor `QadiProvider`. Package-private, out of the barrel (ADR-QD-099). Name is a suggestion; keep the `Provider*` prefix so it sorts with its one caller. |
| **New** | `packages/react/test/ProviderRegistry.test.ts` | Fake `defer` and a real `AtomRegistry`: construction seeds subject then `initialValues`; recycle resets, writes the **latest committed** subject in a `finally` (RL7), does not re-apply `initialValues`; `commit` is idempotent; `hold` after `release` within the deferral cancels. Pins LT16-LT18 headlessly. |
| Modified | `react/src/QadiProvider.tsx` | As in the table. File header comment ("The registry's lifetime is decided in `RegistryLease.ts`, once") is updated to name the owner. |
| Modified | `stryker.react.mjs` | Add `packages/react/src/ProviderRegistry.ts` to `mutate` and to the covering-tests comment. |
| Unchanged | `react/src/RegistryLease.ts`, `RegistryLease.test.ts` | Internal seam. |
| Reduced | `QadiProvider.lifetime.test.tsx`, `.subject.test.tsx`, `.seed.test.tsx`, `.sweep.test.tsx` | Keep the StrictMode and `<Activity>` smoke cases (the order React runs effects in is evidence only a render can give); move pure lifetime assertions to the owner test. Add before deleting (XC-05: never lower a touched file's Stryker score). |

### Data flow change

None observable. Before: render builds registry in the component; four refs and three effects cooperate. After: render calls `makeProviderRegistry` once (lazy ref), the commit effect forwards `(atoms, subject)`, the last effect forwards hold/release; the owner's lease defers `recycle` through the injected `defer`.

### Risks / flags

- **Keep the commit effect before the hold effect** and keep it keyed so a StrictMode double effect and an Activity reveal re-run it (ADR-QD-195's observed order is the evidence). A characterisation of the observed `ORDER` lines (mount, long hide, reveal) should be re-taken after the move; the existing LT tests already do this.
- `AtomsReplaced` must keep firing exactly once on a changed atom set and never on the reveal's re-run (`LT8`).
- ADR-QD-195 decision 2's sentence "imports neither React nor the provider" extends to the owner; say so in the amendment.

---

## Phase 87: One "scoped run that states its stop" above `SupersedingRun` (devtools; ARCH-134)

### Constraining ADRs (quoted)

- **ADR-QD-150** decision 2: "The interface is two steps. `begin()` supersedes the current run and returns a token; the store then publishes whatever it shows while a run starts; `fork(token, effect, hooks?)` runs the effect only while the token is still current and says whether it did ... **A one-call `run(effect)` was rejected because each store publishes between the bump and the fork, and that gap is where the first defect lives.**" Its alternatives: "**A one-call `run(effect)`.** Rejected (point 2). It cannot let a store publish between the bump and the fork, which is where each store's `Starting`, `Reading` or `Running` is written." Decision 6: "`ForkHooks.onFailure(cause)` is called only for the current run's failure that is not interrupt-only ... The session passes none: its `land` keeps mapping every non-success exit of a current run to `Broke`, a self-interrupt included, because an interruption must never read as `Stopped` (INV-QD-313)." Decision 10: "A `begin` is paired with a `fork` or a `stop` ... the session's 'Running is announced, the old run keeps going until the fork' window depends on it."
- **ADR-QD-182** decision 10: "The devtools timeline feed, diagnostics feed, diagnostics wiring read and policy explorer render a run's cause with `causeMessage`, and the gates feed does too." Decision 11: "The `String(cause)` calls on an Effect `Cause` (`DecisionSinkForwarding.ts`, `EncodeRefusalReport.ts`, `SinkReport.ts`) were checked and are left alone: Effect already guards that string form." The session's `Broke` message is in neither list.
- **ADR-QD-192** decision 2: "`sameFields` ... every feed applies it to its inputs; the dock applies it through its feeds ... `sameFieldsOrAbsent(a, b)` ... for an input that may be absent." Decision 5: "The gates feed's retry of a failed watch is the rule's one stated exception ... `GatesFeed`'s `configure` returns early on `sameFields(held, wanted) && watchFailure === undefined`."
- **ADR-QD-194** decision 5: "The window between a status and its fork is closed: the work a status announces starts whatever a listener throws on it, and the throw is rethrown after it started. At the three publish-then-fork sites ... the two calls are `try { publish } finally { fork }`, not `callAll`." The module below becomes the only site that writes that sentence as code.
- **ADR-QD-197** (the status unions the notices read) is a Phase 88 constraint; 87 keeps `TimelineStatus` and `DiagnosticsStatus` unchanged so 88 inherits them.

### Does a publish callback answer ADR-QD-150 point 2? Yes, and it should be recorded as applying 150, not reopening it

Point 2 rejects a one-call `run(effect)` on one ground: the store cannot publish between the bump and the fork. A launch that takes `publish` as a **callback** and calls it between `begin` and `fork` keeps that gap, and moves ownership of its order into the module. The two-step `SupersedingRun` interface is not touched (it stays "underneath", exactly as the review draws it), decision 10's pairing becomes internal to the module, and decision 4's finalizer order is untouched. So 150 stands and is **applied**; a new ADR-QD-200 must say so in its first paragraph (the review's own warning) and add one amendment note to ADR-QD-150's Consequences pointing at it. It also takes over ADR-QD-194 decision 5's "three sites" (now one).

### Recommended shape

New package-private module (name suggestion `StatedRun.ts`, `makeStatedRun`), unnamed `Effect.fn(function* ...)` returning `Effect<..., never, Scope.Scope>`, as `makeSupersedingRun` is (no child span on a store build; ADR-QD-150 decision 1). It builds `makeSupersedingRun` itself. Surface:

- `admit(raw, extra?) => { wanted, before } | undefined`: the **configure prologue** written once: closed guard, one normaliser (`complete`), per-field gate (`sameFields`, or `sameFieldsOrAbsent` for diagnostics' absent options), commit to `held`. `extra` is the one stated exception hook GatesFeed needs (retry of a failed watch), which keeps ADR-QD-192 decision 5 true without a sentinel.
- `held()`, `closed()`.
- `start()` / `restart()`: build a `Launch` from the held inputs through a factory given at construction, then `begin -> try { launch.publish?.() } finally { fork(token, launch.engine(live), { onFailure: cause => launch.stopped?.(causeMessage(cause)) }) }`. `restart` is closed-guarded and does nothing when the factory answers `undefined` (diagnostics off). A factory answer of `undefined` on `start` is `stop()`, which is what `cadence()` and `off()` do today.
- `Live` handed to the engine: `isCurrent()` and `guard(write)`. `guard` is the token-guarded sink both feeds write by hand (`TimelineFeed.ts:175-180`, `DiagnosticsFeed.ts:186-199`): the write runs only while this run is current.
- `Readout<S>` type and `idleReadout(snapshot)`: the shared `{ subscribe, getSnapshot, restart }` with the ADR-QD-194 rethrow documentation written once (replaces the two near-identical doc blocks at `TimelineFeed.ts:62-73` and `DiagnosticsFeed.ts:97-111`, and the `idle()` helper vs `idleTimelineStatus` duplication). Place it in `ExternalStore.ts` beside `ReadableStore`.

### What each consumer supplies (and honestly what each cannot give up)

| Consumer | Supplies | Stays in the consumer | Notes |
|----------|----------|-----------------------|-------|
| `TimelineFeed` | `complete: completeTimelineInputs`, engine `runSource(marking, source ?? NO_SOURCE)` with `marking.accept = live.guard(timeline.accept)`, `publish: () => status.set(READING)`, `stopped: m => status.set(Stopped({ reason: m }))` | the `resize` step before the read (`callAll([resize, start])`, ADR-QD-194 decision 4), the timeline store | `restart` with a bare feed currently forks the empty source; keep it (characterise) rather than "nothing held". |
| `DiagnosticsFeed` | `complete`, engine `runDiagnostics(sink, next)` with the guarded `accept`, `publish: () => show(Starting, reading)`, `stopped: m => show(Stopped({ reason: m, sampled }), reading)` | `Off`, the `sampled` flag, `show`'s dedupe, `view` store | `Off` is `start()` with an `undefined` factory answer, then the reset. `sampled` is read by the stopped callback at stop time, so the closure stays correct. |
| `GatesFeed` | **the prologue only** through `admit(next, { retry: watchFailure !== undefined })`, and `start()` for the cadence (publish and stopped omitted) | watch/release, `readRegistry`, `readAsked`, `publish`, keys | The review's "GatesFeed shares the prologue" is exactly this. It has no stopped state. |
| `SimulationSession` | `publish: commit`, `engine: live => land(live, ...)` through the same publish-then-fork; and `Broke.message = causeMessage(exit.cause)` | all of its state machine: draft, choice, `Refused` path, `stale`, and **`land`'s own exit mapping** | **Do not overclaim.** The review says the session "supplies only its engine and states". It cannot adopt `onFailure`: ADR-QD-150 decision 6 keeps mapping every non-success exit of a current run to `Broke`, a self-interrupt included (INV-QD-313), whereas `onFailure` skips interrupt-only causes. If it did, a self-interrupted run would stay `Running` forever. So the session shares publish-then-fork and the message rule, and has no held-inputs gate (its commands are many) and no `restart`. |

### Opens with a RED test (per the phase text)

`SimulationSession.characterisation`-style test: a run whose program dies with `new Error("boom")` yields `Broke.message === causeMessage(Cause.die(new Error("boom")))` (pretty trace). RED on base: it is `Cause([Die(Error: boom)])`. Second row: a hostile value (a `toString` that throws) reads as ADR-QD-182's placeholder `a value that could not be described`, RED on base for the same reason (see F3: text, not a throw). Place it beside `SimulationSession.runs.test.ts`.

### New vs modified

| Kind | Module |
|------|--------|
| **New** | `devtools/src/model/StatedRun.ts` (package-private, in the `src/model/**` mutation glob), `test/model/StatedRun.test.ts` (ordering property once: publish before fork, a publish that throws still forks and is rethrown, a publish that restarts leaves the newest live, failure states the stop with `causeMessage`, interrupt states nothing, closed guard, restart-after-close does nothing, gate on equal fields) |
| Modified | `TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts`, `SimulationSession.ts`, `ExternalStore.ts` (`Readout`, `idleReadout`), `test/builtFeeds.ts` (if the constructors' signatures are touched; they should not be) |
| Unchanged | `SupersedingRun.ts` and its test (the interface under it), `useConfigured.ts`, the feeds' public exports |
| Spec | new ADR-QD-200; dated notes on ADR-QD-150, 182 (the session's `Broke` is now under decision 10), 192, 194; BEH-QD-771..775; INV-QD-419/420 |

### Data flow change

Per feed, `configure -> admit -> (steps) -> start` and `restart -> start`; `start` is `begin -> publish -> fork`. The `causeMessage` import leaves the two feeds (the module applies it once). `String(exit.cause)` leaves `SimulationSession`.

### Risks / flags

- **Reentrancy.** ADR-QD-150 decisions 7-9 (re-check the token before forking; held fork when a start is in progress; synchronous prefix) must still hold with `publish` inside the module. The six existing RED cases (TF21-23, F28, F29, SR5) must stay green unchanged; run them first on the new module.
- **Mutation.** The module's matchers (if any `Match`) follow ADR-QD-195 decision 7's per-instance lesson (module-scope arms are unjudged by `ignoreStatic`); keep arms inside the constructor.
- **House-style.** Unnamed `Effect.fn` (as `makeSupersedingRun`) is not in `UNTRACED_BUDGET`; do not use `Effect.fnUntraced`. No `switch` (SWITCH_BUDGET is exact).
- Whether `restart` on a bare timeline feed stays an empty read or becomes a no-op is an observable-looking detail; characterise before choosing (recommendation: keep behavior).

---

## Phase 88: `StoppedBox` keys itself and owns the announce-once ledger (devtools react; ARCH-135)

### Constraining ADR (quoted)

**ADR-QD-197** decision 4: "**One hook holds a stop ledger, and one props type states a notice's props.** `useStopNotice<S>(status, onRestart): StopNoticeProps<S>` in `useStopNotice.ts` holds its own `useRef<StopLedger<S>>(noStops)` and returns a `useMemo` of `{ status, onRestart, announced }` keyed on `[status, onRestart]`. `DockFrame` calls it once per feed, so each feed has its own ledger, owned by the frame so it outlives every screen ... `StopNoticeProps<S>` is declared once in `StoppedBox.tsx` beside `StopLedger<S>`." Alternatives it rejected: "One ref holding both ledgers" (couples two stop histories), "A memo keyed on `status` alone" (a rebuilt model's `restart` would be lost). AGENTS.md section 13: the ledger "records only which stop was announced, never what the status says".

### Integration points

Today both notices compute the key in render from the ref: `TimelineNotice.tsx:33` and `DiagnosticsNotice.tsx:85` call `stoppedKey(announced.current, status)` and pass it as the `key` prop of `StoppedBox`; `StoppedBox` separately reads the same ref in a `useState` initializer (`alert`) and writes it in a layout effect. One concept (which stop is this, and has it been announced) is written in three places.

### Recommended shape

- A React `key` cannot be set from inside the component it keys, so split `StoppedBox.tsx` into the exported **`StoppedBox`** (outer: computes `stoppedKey` and renders the keyed inner section) and a module-private inner component holding today's body. Callers stop passing `key`, stop importing `stoppedKey`, and stop reading `announced.current`. The one render-time read of the ledger lives in one place, with the comment that explains why (the key must differ for a second stop so the alert is fixed at mount).
- Make the ledger **opaque**: `StopNoticeProps.announced` stops being a `RefObject<StopLedger<S>>` that a caller could read. It becomes a small closure object created by `useStopNotice` (`keyOf(status)`, `announced(status)`, `record(status)`), so no caller or test can reach `.current`. `noStops` and `stoppedKey` become module-private.
- `useStopNotice` keeps its role (hold the ledger per feed in `DockFrame`) because the ledger must outlive every screen; the box owns its **rules** (key, alert decision, write), the hook owns **where it is held**. Do not fold the hook into `StoppedBox.tsx` (the `react/use*.ts` convention and the "a hook and not a plain helper" reason in ADR-QD-197 still stand).

### New vs modified

| Kind | Module |
|------|--------|
| **New** | none (an inner component inside `StoppedBox.tsx`) |
| Modified | `react/StoppedBox.tsx`, `TimelineNotice.tsx`, `DiagnosticsNotice.tsx`, `useStopNotice.ts`, `test/helpers.ts` (it builds notice props; ADR-QD-197 says it "keeps its names"), the StoppedBox/notice tests |
| Spec | new ADR-QD-201 amending ADR-QD-197 decision 4 (dated note), BEH-QD-776..780, INV-QD-421/422 |

### Data flow change

`DockFrame -> useStopNotice (ledger per feed) -> notice -> StoppedBox(status, announced)`; the key and the alert decision are computed inside `StoppedBox` from the same ledger. Observable behavior (one alert per distinct stop; a tab switch remounts without re-announcing; two feeds independent) is unchanged and is pinned by the existing notice tests, which keep passing as the characterisation.

### Risks / flags

- This is the review's "speculative" item; its own caveat applies: ADR-QD-197 "just consolidated this area". It is cheap once 85 has already edited `DevtoolsDock.tsx`; do not widen it.
- Reading a ref during render is the thing being centralised, not removed. If the owner wants it removed entirely, the alternative (an identity-to-ordinal `WeakMap` per ledger) changes what "announced" means for a stop whose box never mounted, so it is **not** recommended here.

---

## Phase 89: One admission step for a host's audit batch (audit; ARCH-136)

### Constraining ADR (quoted)

**ADR-QD-190** shares the row refusals through `RowsRefusalCases` ("`ArchiveInputRefusal` and `RetentionInputRefusal` each add the members of their own inputs to these, so a row is refused in one place and by one reading of 'a row the codec made'", `CodecMade.ts`) and rejected restating them with a mapping. Decision 4: "`planRetention` still refuses a non-finite `now` and a NaN or negative `maxAgeMs`. `RetentionInputInvalid` is unchanged"; "`verifySequenceIntegrity` and `archiveAuditTrail` fail `SequenceIntegrityError` for the sequence alone". ADR-QD-110 (via `ArchiveFacts.ts`): "The span keeps the name it had before the facts were gathered here, so a trace shows the same span under `archiveAuditTrail` and under the public check", and the test `AuditArchive.test.ts:60` pins "a span named qadi.audit.verifySequenceIntegrity" for `verifySequenceIntegrity`.

### Today (verified)

| Entry point | Check order | Where |
|-------------|-------------|-------|
| `archiveAuditTrail` | `now` -> `keyMaterial` -> rows -> sequence | `AuditArchive.ts:184-193`, then `verifiedArchiveFacts` |
| `planRetention` | `now` -> `maxAgeMs` -> rows | `Retention.ts:101-114` |
| `planPurge` | `planRetention`'s order, then archive membership | `Retention.ts:165-` (no admission of its own; `VerifiedArchive` is nominal) |
| `verifiedArchiveFacts` / `verifySequenceIntegrity` | rows -> sequence | `ArchiveFacts.ts:176-` |

`NowNotFinite` is declared in two refusal types (`ArchiveFacts.ts:141`, `Retention.ts:51`). The shared step is therefore the ordered triple **now, the entry point's own terms, rows**; `planPurge` inherits it through `planRetention` and needs no code of its own (say so; the review lists it only as a consumer).

### Recommended shape

- **New** package-private `packages/audit/src/HostBatch.ts` (out of the barrel; the audit mutation config mutates all of `packages/audit/src/**`, so no config edit): `BatchRefusalCases = RowsRefusalCases & { NowNotFinite: { value: unknown } }` (stated once; `RowsRefusalCases` stays in `CodecMade.ts` as ADR-QD-190 requires, not restated), and `admitBatch({ now?, terms?, rows })` returning `Result<Admitted<T>, ...>` with the order fixed in one body. `terms` is a thunk returning the entry point's own check **and its snapshot** (key material is read once and the snapshot is what is written, `AuditArchive.ts:178-181`; `maxAgeMs` is just checked).
- The public refusals keep their exact shapes: `ArchiveInputRefusal = TaggedEnum<BatchRefusalCases & { KeyMaterialNotAList; KeyMaterialItemRefused }>`, `RetentionInputRefusal = TaggedEnum<BatchRefusalCases & { MaxAgeInvalid }>`. Same members, same tags, so **not Breaking** (confirm with the existing `.tst.ts` pins: `AuditRefusal.tst.ts`, `Retention.tst.ts`).
- **Admitted rows are a type, not a duty.** `admitBatch` returns the rows branded as admitted (the idiom is core's `Admitted` and `AuditEntry`'s nominal field, ADR-QD-190 decision 1). `archiveFacts` and the sequence step take the admitted type, so "facts without admission" no longer compiles, which also removes the double check (`archiveAuditTrail` today runs `rowsRefusal` once inside `verifiedArchiveFacts` only; with `admitBatch` it would run twice if left unstructured).
- **Span.** Keep one span named `qadi.audit.verifySequenceIntegrity` for the sequence step, taking admitted rows; `archiveAuditTrail` calls it as a child (unchanged trace), and the public `verifySequenceIntegrity` admits rows first and then runs it. The one observable trace change is that a **refused** public verify call no longer opens that span (admission precedes it). That is a change to record in the ADR and pin with a test; if the owner wants the span to cover admission, wrap admission inside the named function and accept a harmless second `rowsRefusal` in the archive path (equivalent-mutant risk, ADR-QD-195 decision 7's lesson). Recommended: admission before the span.

### New vs modified

| Kind | Module |
|------|--------|
| **New** | `audit/src/HostBatch.ts`, `audit/test/HostBatch.test.ts` (the check-order table once: for each combination of bad `now`/terms/rows, which refusal wins, per entry point), `HostBatch.tst.ts` if the admitted brand is added |
| Modified | `ArchiveFacts.ts` (drops its `NowNotFinite` member, `verifiedArchiveFacts` takes admitted rows), `AuditArchive.ts` (calls `admitBatch`; `snapshotKeyMaterial` becomes the `terms` thunk), `Retention.ts` (calls `admitBatch`), `CodecMade.ts` (doc only, if the cases type moves) |
| Reduced | `test/ForeignRows.test.ts` (468 lines): the per-entry-point order tests collapse to `HostBatch.test.ts`; each entry point keeps one "wires it" case |
| Spec | `spec/behaviors/33-audit-pipeline.md` (BEH at 733, 1215-1229, 1279 restated), new ADR-QD-202 (dated note on ADR-QD-190), BEH-QD-781..785, INV-QD-423/424 |

### Data flow

`host batch -> admitBatch (now, terms, rows) -> admitted rows + terms snapshot -> pure facts / age rule -> archive | plan`. No wire format, no `UNTRUSTED_DECODE_BUDGET` token added (no `decode*`, `JSON.parse`, `onExcessProperty`).

### Risks / flags

- The review rates this "speculative"; the real gain is the type-level "no facts without admission" plus one `NowNotFinite`. Do not let the phase grow a general validation framework.
- `archiveFacts` is documented as `Pure` and tested in `ArchiveFacts.test.ts`; keep a pure unbranded core for the property tests if the brand complicates them.

---

## Phase 90: Remaining per-port facts onto the description (core; ARCH-137)

### Constraining ADRs (quoted)

- **ADR-QD-094**: "**Each port module declares one description beside its service. Every wrapper, the named fail-closed default, the scriptable doubles, the five-port environment type and the environment builders are derived from the descriptions.**" D-10-k: "span names | In the description (`span: PortSpanName`); `PortAccess.ts` and devtools' collector read them there". D-10-b: "the closed registry in `Ports.ts`". A new port "is a description, a `PortName` member and its registry lines; the compiler asks for the rest" (AGENTS.md section 3).
- **ADR-QD-133**: "**A derived port states no key and no defect.** A package-private builder, `makePortDescription` in `PortDerivation.ts`, takes a description minus `wire`, `key` and `defect`" (the builder gains the new facts; the derivation of key and defect from the wire question is untouched).
- **ADR-QD-134**: `readScoped` is "generic over a closed, written-out `ScopedPort = "DecisionHistory" | "RelationshipResolver" | "SignatureHistory"`", and owns "the one missing-id test in the module".
- **ADR-QD-160**: the port's default is "a mark its service carries ... it holds the `PortName` the default belongs to" (keeps working: `PortDefault.ts -> PortName.ts` stays a leaf edge).
- **ADR-QD-163 D-06**: "**`readScoped` stays the one resource-id enforcement point** (D-06). The table says which leaves ask about one resource; it does not enforce it. `readScoped` records the question on the port's own span first and then fails with `MissingResourceId` built through `errorOf` ... A test ties each row's `resourceId` to what `readScoped` does." Phase 90 amends the second sentence.
- **ADR-QD-037** (cycles are gated): `PortName.ts`'s own header states it is "A leaf: no imports, no metric. `PortMetrics.ts` imports the name type from here, never the reverse, so a metric's registry key (ADR-QD-052) cannot move with a port's identity." F2 is that sentence, proven.
- **ADR-QD-114** (not in the phase's list, but constraining): "**`PortServing` stays the hand-written public declaration**, moved to `PortServing.ts` (a leaf that imports only `Policy` and `PortName`, as types) so that a description can be typed by it without the import cycle `PortRemote.ts` closed." Phase 90's "serving shape onto the description" reverses this; it needs a dated note, see 90.5.

### The seven per-port tables today (verified in source)

| # | Table | Where | Keyed by | After |
|---|-------|-------|----------|-------|
| 1 | `PortSpans` (name -> span literal) | `PortName.ts` | name | **deleted**; the description's `span` literal is the one statement. `PortSpanName` is derived from the registry (`PortTypes[PortName]["span"]`). |
| 2 | `PortName` union | `PortName.ts` (`keyof PortSpans`) | | `PortName.ts` keeps **one** `PORT_NAMES` tuple; `PortName = (typeof PORT_NAMES)[number]` |
| 3 | `PORT_NAMES_BY_NAME` (`Record<PortName, true>`) | `PortMetrics.ts` | name | **deleted**; `preregisteredWords` reads `PORT_NAMES` from the leaf (order preserved: AttributeResolver, DecisionHistory, RelationshipResolver, CustomPredicate, SignatureHistory, so registry keys do not move, ADR-QD-052) |
| 4 | `PortTypes` + `PORTS` | `Ports.ts` | name | stay (they are the registry; AGENTS.md says a new port is "its registry lines") |
| 5 | `PortFixtureData` + `PORT_FIXTURES` | `Ports.ts` | name | the description gains a `fixture` facet `{ layer: (data: Data) => Layer<Self> }`; `PortFixtureData[K]` derives from it; `PORT_FIXTURES` and the inline `CustomPredicate` builder in `Ports.ts` move onto the descriptions |
| 6 | `PortServing` interface (the host's declaration, per-name slot types) | `PortServing.ts` | name | `PortServingFacet` gains the declaration type; `PortServing` becomes a mapped type over the registry (public name unchanged). **Reverses ADR-QD-114's "stays hand-written".** |
| 7 | `ScopedPort` union + `completeRequest` | `PortAccess.ts:222-247` | name | `ScopedPort` becomes `keyof typeof completeRequest` (one list); routing reads `LEAF_NEEDS` |

### The `readScoped` / `LEAF_NEEDS.resourceId` change

`LEAF_NEEDS.resourceId` is `"Never" | "Always" | "ByScope"` per leaf and is "read only by a test" (`LeafNeeds.test.ts:133`). Today `askActed`, `askRelationship` and `askSignature` each re-decide the route by hand (`isResourceScoped(leaf) ? readScoped : readPort`, `PortAccess.ts` ~397 and ~496). Recommended: one `readLeaf(d, interpreter, leaf, request)` in `PortAccess.ts` that reads `LEAF_NEEDS[leaf._tag].resourceId` (`Always` -> `readScoped`; `ByScope` -> `isResourceScoped(leaf) ? readScoped : readPort`; `Never` -> `readPort`). `readScoped` still records the question on the port's own span first and fails `MissingResourceId` through `errorOf`, so BEH-QD-227/445 (a missing id leaves the port's span and nothing else) are untouched. `PortAccess.ts -> LeafNeeds.ts` is acyclic (0.2). The test that "ties each row's `resourceId` to what `readScoped` does" becomes a true equivalence test of the route, not a tying test (the review's "removes the tying test"). ADR-QD-163 D-06 gets the dated note: the table now **routes**; `readScoped` remains the one place the id check and its error are made (the `ScopedLeaf.ts` header's reason for `requireResourceId` living outside `LeafNeeds.ts` still holds: port modules import `ScopedLeaf`, and `LeafNeeds` imports port modules).

### New vs modified

| Kind | Module |
|------|--------|
| **New** | none required. (`HostBatch`-style helper files are not needed; the facts live on the descriptions.) |
| Modified | `core/src/PortName.ts` (one list; leaf kept), `PortDescription.ts` (generics: the span becomes a literal parameter; the fixture and serving declaration types are added, defaulted like `Span`/`Asks`), `PortDerivation.ts` (`makePortDescription` accepts the new facets), the five port modules (`AttributeResolver.ts`, `RelationshipResolver.ts`, `DecisionHistory.ts`, `CustomPredicate.ts`, `SignatureHistory.ts`: each states its `fixture` and its serving declaration type), `Ports.ts` (drops tables 5; `DescriptionOf`/`SpanOf` re-spelled), `PortServing.ts` (facet generic over the declaration; `PortServing` derived), `PortMetrics.ts`, `PortAccess.ts`, `LeafNeeds.ts` (doc only), `PortRemote.ts` (`servingFor` reads the derived `PortServing`), `PortDoubles.ts` if it names the tables |
| Downstream, mechanical | devtools `SimulationFields.ts` / `SimulationSource.ts` (read `PortFixtureData`), `@qadi/testing`'s `PortSetup` (assignable to `PortFixtures` as it stands) |
| Tests | `Ports.test.ts` (metric description pins: do not touch the description strings), `PortServing.tst.ts` (the shape pin: "unchanged, pinned by `PortServing.tst.ts`" per ADR-QD-114; **it must still pass unedited**, which is the proof the derived type equals the hand-written one), `PortConformance.test.ts`, `LeafNeeds.test.ts`, a new compile-error pin for a port missing a facet |
| Spec | new ADR-QD-203; dated notes on ADR-QD-094 (D-10-k), 114, 134, 163 (D-06); `spec/overview.md` rows for any moved type; BEH-QD-786..790; INV-QD-425/426 |

### Data flow change

Compile-time only, plus one runtime route: a leaf read goes `evaluateNode -> askX -> readLeaf -> LEAF_NEEDS lookup -> readScoped | readPort`. One extra object-property read per port read on the evaluation path.

### Risks / flags (the highest-risk phase)

1. **Hot path.** ADR-QD-163 gated its table with `bench/ab.sh` (median of per-run minima, band `max(10%, base spread)`). `readLeaf` adds a lookup on every port read; run the same gate (`packages/core/bench/Evaluate.bench.ts`, 35 workloads).
2. **Generic arity.** `PortDescription` already has nine type parameters; the span literal, the serving declaration and the fixture data type add three more. Options: add them defaulted (consistent with `Span`/`Asks`), or drop the explicit `PortDescription<...>` annotation on the five constants and let the literal type flow (`satisfies`), which shrinks `DescriptionOf`. Decide in plan; both keep tables out of `Ports.ts`.
3. **Loss of one compile check.** Today `PortSpanOf<N>` stops `attributeResolverPort` claiming `"qadi.acted"`. With the table gone nothing cross-checks the literal; the registry-derived `PortSpanName` stays closed. If the owner wants the old guarantee, add a type-level pairwise-distinct check on `PortTypes`' spans in `Ports.ts` (cheap, no cycle).
4. **ADR-QD-114 reversal** must be an explicit dated note, not silent; the `PortServing.tst.ts` shape pin is the guard.
5. **ADR-QD-163 D-06 was a deliberate "table that describes and doesn't enforce"**; the review itself says "Low gain, since the compiler already catches every gap". The recommendation above does it because the owner asked for the most complete design, but the benefit is small and the plan should say what is **not** deleted (`ScopedPort`'s `completeRequest` stays: the relationship port needs it).

---

## Phase 91: Named barrels for core, react and audit; fold visibility-only files (ARCH-138)

### Constraining ADRs and rules (quoted)

- **AGENTS.md section 9**: "`export * from "./File.ts"`, alphabetical. A package whose interface is narrower than its modules names its exports per module (`export { ... } from`, `export type { ... } from`), grouped by module path; `@qadi/devtools` is the one today (ARCH-40, ADR-QD-047), and the `devtools-named-barrel` house-style rule refuses an `export *` in its two barrels." And: "**Out of the barrel means not importable** (ADR-QD-099). A package's `exports` map is a closed list."
- **ADR-QD-099**, amendment 2026-10-08 (CCR-QD-321): "A package whose interface is *narrower than its modules* (a module part-public, part-private) names its exports per module instead ... The list is then the interface, in one reviewable file, and a module's other names are package-private by the same rule as an unbarreled module. `@qadi/devtools` is the one today ... Gate 13 (`scripts/check-api-surface.mjs`) reads the form, wrapped over several lines as well as on one, and the house-style rule `devtools-named-barrel` forbids `export *` in those two barrels and keeps their groups in module-path order." Phase 91 **generalises an existing, already-accepted mechanism**; it adds no entry point and no "Entry points" row.
- **ADR-QD-037**: gate 5 is `madge --circular --extensions ts,tsx packages/*/src`, run in `pnpm check`; "madge counts a type-only edge" (cited from `SignatureLedger.ts`, `SinkWire.ts`, `QadiProvider.tsx`). Many other files are cycle-breakers by the same ADR (`SinkWire.ts`, `JsonRefusal.ts`, `SinkRecordFields.ts`, `MissingQadiProviderError.ts`, ...); **only the four named in the phase are in scope**.
- **ADR-QD-047** amendment (CCR-QD-321): the devtools barrel's list "is the interface"; adding a name is "a line here, a row in `spec/overview.md` and a line in `test/surface.test.ts`".

### 91.1 The mechanical part

`scripts/check-house-style.mjs` already has: `barrel-order` (pure `export *` barrels, alphabetical), and `DEVTOOLS_BARRELS` + `STAR_EXPORT` + `NAMED_EXPORT` (`devtools-named-barrel`: no `export *`, groups in module-path order). Phase 91 changes `DEVTOOLS_BARRELS` into a list of all named barrels (the two devtools ones plus `packages/core/src/index.ts`, `packages/react/src/index.ts`, `packages/audit/src/index.ts`) and renames the rule; `barrel-order` then skips them automatically (it only checks pure barrels). Gate 13 already reads the named form. Sizes (declaration lines in the barreled modules, approximate): core ~570, react ~50, audit ~77. **Core's list is large**; a mechanical generator over the current export set (checked against `spec/overview.md`'s 942 documented exports) is safer than hand-typing, and `check-api-surface` is the only verification that matters because a dropped name fails as `[missing]` and an extra one as `STALE`.

Decide in plan whether to add a `test/surface.test.ts` for each of the three packages (devtools has one: `test/surface.test.ts` + `surface.tst.ts`). Recommended: yes for core and audit (cheap), because a named list has no other reader than gate 13 and `tsc`.

### 91.2 The folds, one by one

| Fold | Verdict | Files edited | Notes |
|------|---------|--------------|-------|
| `PortSpanDecode.ts` -> `PortSpanEncode.ts` | **do** (acyclic) | `PortSpanEncode.ts` gains `decodePortSpan`; delete `PortSpanDecode.ts`; core barrel names `decodePortSpan` from the Encode module | Encode has 13 importers (`AttributeResolver`, `CustomPredicate`, `DecisionHistory`, `EvaluationSpan`, `GuardHealthCheck`, `Lifecycle`, `PortAccess`, `PortDerivation`, `Predicate`, `RelationshipResolver`, `SignatureHistory`, `SubjectSet`, previously `PortSpanDecode`); they load a few more lines, no new edge. |
| `PortInterpreter.ts` -> `PortSpan.ts` | **do, into `PortSpan.ts`, not into `PortSpanEncode.ts`** | `PortSpan.ts` gains `portInterpreter`/`PortInterpreter`; Encode re-points its import | The Encode target is a cycle (0.2). `PortInterpreter.ts` is "Package-private: the type is public through `PortSpan.ts`, the schema is not", so after the fold the barrel names only the type from `PortSpan.ts`. |
| `PortSpanDecode.ts` -> `PortSpan.ts` | **no** (cycle) | | The review's caveat, confirmed. |
| `GateRegistry.ts` -> `GateWriter.ts` (react) | **do** (acyclic) | `GateWriter.ts` gains `makeGateRegistry`, `GateRegistryOptions` and the `DeveloperSignals` import; the barrel names `makeGateRegistry`, `GateRegistryOptions`, `GateInstance`, `GateKind`, `GateRegistry`, `GateRenderState`; `DevtoolsFeed.ts`, `QadiAtoms.ts`, `QadiProvider.tsx`, `hooks.ts` re-point type imports | `GateWriter.ts` is currently a zero-import leaf; after the fold it imports `DeveloperSignals.ts` only. ADR-QD-080's "side table keyed on the registry object (`GateWriter.ts`, out of the barrel)" holds: `gateWriterFor` and `buildGateRegistry` stay package-private by simply not being named. |
| `SequenceIntegrity.ts` -> `ArchiveFacts.ts` (audit) | **do** (acyclic) | delete `SequenceIntegrity.ts`; the barrel names `SequenceIntegrityError`, `verifySequenceIntegrity` from `ArchiveFacts.ts` | Its long disclaimer comment (not-tamper-evidence; cited by the README, `spec/urs.md`, `spec/models/17-purpose.md`, ADR-QD-009) must move with it, and those four citations re-point (gate: `check-doc-examples`/claims scripts do not read it, but the citations would silently dangle). Must come **after** Phase 89 rewrites `ArchiveFacts.ts`. |
| `Hydration.ts` -> `HydrationEngine.ts` (react) | **blocked as written (F1)** | | Three ways out, in order of preference. (a) **Structural parameter**: declare `interface HydratesDecisions { readonly hydrate: (...) => InitialValues }` in `HydrationEngine.ts`, type `hydrateDecisions`' first parameter by it (`QadiAtoms` is assignable), delete the `QadiAtoms` import; then the fold is acyclic and `dehydrateDecisions`/`hydrateDecisions` live beside the engine. Public declaration text changes from `atoms: QadiAtoms` to the interface; that is an api-surface and `.d.ts` change (TS2883 care) and needs a changeset line, though no call site breaks. (b) Fold only `dehydrateDecisions` (it needs no `QadiAtoms`) and leave a one-function `Hydration.ts`: not recommended, a file whose only reason is one wrapper fails the deletion test. (c) Keep `Hydration.ts` and record it as a cycle-breaker in ADR-QD-204. Recommend (a); fall back to (c) if the owner will not widen the parameter type. |

Each fold must be gated by a **pre-fold simulation** (the plan's first task for the phase): re-run `madge --json` and the merge-and-search check used here, so "proves no cycle returns" is a recorded fact (and `pnpm circular` is the final proof). Do not fold any other ADR-QD-037 cycle-breaker.

### 91.3 Integration with other gates

- Gate 13 (`check-api-surface.mjs`): unchanged logic; the overview rows must still cover all 942 exports (a fold that moves a name between modules changes nothing there).
- Gate 14 (`check-package-install.mjs`): the packed `.d.ts` must still name everything; `Re-export internal types explicitly where .d.ts emission needs to name them (TS2883)` is the AGENTS.md section 9 rule that the named barrel makes more important, not less.
- Mutation lists: `stryker.react.mjs` names files explicitly; Phase 86's `ProviderRegistry.ts` and `RegistryLease.ts` are unaffected by the folds (`GateWriter.ts`, `GateRegistry.ts`, `Hydration*.ts` are not in the list). `stryker.audit.mjs` globs all of `src`, so deleting `SequenceIntegrity.ts` needs no edit.
- AGENTS.md section 9 text: amend "alphabetical `export *`" to "named per module, in module-path order, for core, react, audit and devtools; a pure `export *` barrel remains only where every module is wholly public", and keep "Shared scaffolding stays out of the barrel".

### 91.4 New vs modified

| Kind | Module |
|------|--------|
| **New** | optional `core/test/surface.test.ts`, `audit/test/surface.test.ts` |
| Modified | `core/src/index.ts`, `react/src/index.ts`, `audit/src/index.ts` (rewritten), `PortSpan.ts`, `PortSpanEncode.ts`, `GateWriter.ts`, `ArchiveFacts.ts`, and (if 91.2 option (a)) `HydrationEngine.ts`; importers of the deleted files (`QadiProvider.tsx`, `QadiAtoms.ts`, `DevtoolsFeed.ts`, `hooks.ts`, `useGate.ts`, `AuditArchive.ts`, the port modules, `EvaluationSpan.ts`, `PortAccess.ts`, ...) |
| **Deleted** | `PortSpanDecode.ts`, `PortInterpreter.ts`, `GateRegistry.ts`, `SequenceIntegrity.ts`, and `Hydration.ts` under option (a) (five files; the review said "~6") |
| Modified (rules) | `scripts/check-house-style.mjs` (rename and widen `devtools-named-barrel`), `AGENTS.md` section 9, `CONTRIBUTING.md` if it indexes section 9, `spec/overview.md` only if a public type's home module is described there |
| Spec | new ADR-QD-204; dated notes on ADR-QD-037 (which edges are still cycle-breakers), 047, 099 (the amendment gains the three packages); BEH-QD-791..795; INV-QD-427/428 |

### 91.5 Risks / flags

- It is "a house-rule decision only the owner can make" (review). It was chosen on 2026-11-25 (PROJECT.md). The named list is now the *only* statement of "public", so it must be generated and then checked by gate 13, not hand-maintained.
- A named barrel makes every previously barreled module part-public by default; no module becomes less private. Verify no module's non-listed exports were accidentally relied on by a sibling package (they could not be: a sibling imports `@qadi/core` root, and the root exports only what `export *` exposed; the generator must reproduce that set exactly).
- Biggest single diff of the wave; keep it behavior-free and last so every earlier phase lands on the file layout it was reviewed against (the milestone's own stated reason).

---

## Patterns to Follow (reused across the wave)

### Pattern 1: Pure view next to a derived store (85; ADR-QD-168/185)
**What:** a pure `fooView(input)` returning a closed `Data.TaggedEnum` whose members carry the words; a `makeDerivedStore` with a typed key; the panel maps tags with a hoisted `Match.type<View>().pipe(Match.tagsExhaustive(...))`.
**When:** any dock screen whose state or text is decided in JSX today.

### Pattern 2: Owner module with an injected clock/defer (86, 87)
**What:** a React-free constructor taking its side effects (`defer`, the run) as parameters, so a test drives it with a fake and renders nothing. `makeRegistryLease(recycle, defer)` is the model; `makeProviderRegistry` and `makeStatedRun` follow it. Per-instance matchers (ADR-QD-195 decision 7).

### Pattern 3: Admission as a type (89)
**What:** a nominal brand only the admitting function can mint (`AuditEntry` in ADR-QD-190, core's `Admitted`), so a downstream function cannot be called without the check.

### Pattern 4: Fact on the description, table derived (90; ADR-QD-094)
**What:** state a per-port fact once in the description and derive the registry-keyed type by `infer` from `PortTypes[K]` (as `SpanOf`, `AskedOf`, `ErrorOf` already do), never a second `Record<PortName, ...>`.

## Anti-Patterns to Avoid

### One-call `run(effect)` with no publish seam
**Why bad:** ADR-QD-150 point 2: "that gap is where the first defect lives." **Instead:** publish through a callback the module calls between `begin` and `fork`.

### Folding a cycle-breaker because it looks pass-through
**Why bad:** `Hydration.ts` looks like two one-line wrappers and is the only importer of `QadiAtoms` on the engine side. **Instead:** simulate the fold on the madge graph first (0.2).

### Deriving a leaf from the thing that imports it
**Why bad:** F2. **Instead:** keep the one list in the leaf and derive everything else from the description.

### Inventing a status-only store for a React re-render
**Why bad:** a sixth derived store and a BEH-QD-700 edit to fix a hook concern. **Instead:** a selector in `useStoreSnapshot` (precedent `usePaused`).

## Scalability / Gate Considerations

| Concern | After this wave |
|---------|-----------------|
| Store count | `DockModel` has eleven stores and five derived stores; BEH-QD-700 is the one place that says so |
| Port family | a sixth port edits the name list, one description (span, fixture, serving declaration included) and one registry line; the compiler names the rest |
| Barrels | three more packages list their interface in one reviewable file; gate 13 is the checker |
| Budgets | none of `UNTRACED`, `SWITCH`, `ANY`, `SCHEMA_ERROR`, `HAS_CUSTOM`, `PORT_DOUBLE`, `MODULE_STATE`, `UNTRUSTED_DECODE`, `NOT_CALLABLE_PIN` should move; the only house-style script edit is the barrel rule (91). Any new `.tst.ts` negative pin in 87/89/90 is a counted row in `NOT_CALLABLE_PIN_BUDGET` and AGENTS.md section 6's table; prefer `@ts-expect-error` beside an accepted twin, as ADR-QD-197 did. |
| Mutation | new files in `devtools/src/model/**` and `audit/src/**` are in the globs; `stryker.react.mjs` needs `ProviderRegistry.ts` (86). Re-measure each touched file after the review iterations, as the last two milestones did. |

## Sources

- `.planning/PROJECT.md` (v1.11 section), `AGENTS.md`, `.planning/phases/_SHARED-CONTEXT.md`, `spec/decisions/` ADR-QD-037, 047, 080, 094, 099, 110, 114, 133, 134, 148, 150, 160, 163, 168, 182, 185, 190, 192, 194, 195, 197 (read in full where quoted), `spec/behaviors/28-devtools-screens.md` BEH-QD-700.
- Source read: `packages/devtools/src/model/{DockModel,DiagnosticsFeed,TimelineFeed,GatesFeed,SupersedingRun,SimulationSession,Hydration}.ts`, `react/{QuestionsPanel,DevtoolsDock,StoppedBox,TimelineNotice,DiagnosticsNotice,useStopNotice,useStoreSnapshot}.tsx`; `packages/react/src/{QadiProvider.tsx,RegistryLease.ts,Hydration.ts,GateRegistry.ts,GateWriter.ts,HydrationEngine.ts,index.ts}`; `packages/audit/src/{ArchiveFacts,AuditArchive,Retention,CodecMade,SequenceIntegrity,index}.ts`; `packages/core/src/{PortName,Ports,PortServing,PortMetrics,PortDescription,PortSpanDecode,PortInterpreter,PortAccess,LeafNeeds,ScopedLeaf,AttributeResolver,index}.ts`; `scripts/check-house-style.mjs` (barrel rules), `stryker.react.mjs`, `stryker.audit.mjs`.
- Tools: `pnpm exec madge --circular --extensions ts,tsx packages/*/src` (clean); `madge --json` per package plus a node merge-and-cycle simulation; a node probe of `String(Cause.die(...))` versus `Cause.pretty` (effect 4.1.2).
