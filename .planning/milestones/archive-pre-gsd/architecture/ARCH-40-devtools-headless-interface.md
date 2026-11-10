---
id: ARCH-40
title: "@qadi/devtools exports its stores, its host wiring and ADR-QD-047's timeline readings; simulation mechanics and the screens become package-private behind named barrels"
strength: Worth exploring   # from the 2026-10-07 architecture review (wave 4, card #11, id="c11")
status: done
evidence_verified_at: e635e68
depends_on: []              # soft order: after ARCH-33 (see §4)
blocks: []
adrs_touched:
  - ADR-QD-047 (amend: names what "the headless model" exports, and that a screen's mechanics are not part of it)
  - ADR-QD-099 (amend, one paragraph: a barrel may name its exports when a package's interface is narrower than its modules; out of the barrel = not importable, already its rule)
  - ADR-QD-049 (read: the second shell is a CLI over the merged timeline, not yet built and not yet placed in a package)
  - ADR-QD-053 (read: the overview's "Entry points" reason row for `@qadi/devtools/react` says "`DevtoolsDock` and its panels"; edited)
  - ADR-QD-037 (constraint: madge; narrowing a barrel adds no edge)
  - ADR-QD-033 (constraint: the packed artifact is the product; gate 14 check 3b already refuses undeclared modules)
  - ADR-QD-038 (constraint: one changeset, fixed group, minor, marked breaking)
packages: ["@qadi/devtools", "features (BDD)", "spec", "apps/website (docs)", "scripts (house style)", "AGENTS.md §9 (sign-off)"]
estimate: L   # ≈ 3–4 days on the recommended path, half of it the acceptance-suite rewrite (T4, T5). The zero-break path (D-40-a = C) is S.
---

# ARCH-40 — A narrow headless interface for `@qadi/devtools`

## 1. Verified evidence (at `e635e68`)

Checked on `main` at `e635e68`. Scripts live in
`$P = /private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/6e509c74-8358-487c-bc46-add5ad5874ab/scratchpad/wave4/ARCH-40/`
and read the repo by path:

- `node $P/count-exports.mjs <repo>`: counts each entry point's names per declaring module, using **gate 13's own
  regexes** (`DECLARATION`, `BARREL`, `REEXPORT_FROM` from `scripts/check-api-surface.mjs:63-84`). Output is in `$P/exports.txt`.
  TypeScript is `7.0.2` (native) here, with no JS compiler API, so the gate's regex approach is the one available.
- The same script over `git archive d0884e6 packages/devtools/src` (the `0.11.0` release commit) → `$P/exports-0.11.0.txt`.
- `node $P/host-imports.mjs <repo>`: every name imported from `@qadi/devtools(/react)` outside `packages/devtools`.
  Output is in `$P/host-imports.txt`.
- `python3 $P/after.py $P`: applies §5's recommended membership and prints the exact after-lists and which removals were
  released. Output is in `$P/after.txt`.
- `cd packages/devtools && python3 $P/closure.py $P lib`: lists the types each public module's emitted `.d.ts` imports
  that the recommended list makes private (the type-closure check, D-40-b). It ran on `lib/` built at 18:26 on the
  same day as `e635e68`, so T0 rebuilds and re-runs it.

| # | Claim (review card c11) | Verdict | At `e635e68` |
| - | ----------------------- | ------- | ------------ |
| C1 | `devtools/src/index.ts` re-exports all of `model/` | **CONFIRMED** | 26 `export * from "./model/…"` lines. Of the 27 files in `model/`, only `ExternalStore.ts` is left out (internal per ADR-QD-047's 2026-10-07 amendment). |
| C2 | "~200 names: SimulationForm 21, SimulationSession 15, WhatIf 14" | **CONFIRMED (exact)** | Root: **201 declarations, 200 distinct names** (`WiringRead` is both a type and a value), 108 value and 93 type-only. `SimulationForm.ts` 21, `SimulationSession.ts` 15, `WhatIf.ts` 14, `PortCalls.ts` 13. The rest are 3–9 each. React entry: **44** names from 17 modules (27 value, 17 type). Both entry points: **245**. |
| C3 | "host uses ~9" | **CHANGED: 11, and the acceptance suite uses 49** | `examples/nextjs-newsroom` imports **11** distinct names (8 root: `EvaluationPortsLayer`, `PortCallLog`, `collectPortCalls`, `hydrationActivity`, `mergeSources`, `sourceFromEventSource`, `unaccountedEntries`, `wiringReport`; 3 React: `DevtoolsDock`, `DiagnosticsDockOptions`, `useDiagnostics`). The BDD suite (`features/`, 8 step files) imports **49**. Compiled docs: website `devtools.md` 7, `spec/behaviors` 28/29 fences 5, `scripts/check-package-install.mjs` 4 (`emptyTimeline`, `ingest`, `verdictOf`, `DevtoolsDock`). **56 distinct names in total** are used outside the package. `features/` resolves `@qadi/devtools` to `packages/devtools/src/index.ts` (`tsconfig.base.json:52`) and never reaches past the root, so whatever the barrel stops exporting, the suite stops compiling. |
| C4 | Every internal refactor is a public API change and needs a gate-13 row | **CONFIRMED** | `spec/overview.md:742-845` has **90** devtools rows (71 root, 19 React). Of the ten overview revisions in the wave-3 PR (1.47–1.56), **five** changed devtools' surface: 1.47 `describeTracePath`, 1.50 `DecisionEventName` removed, 1.53 `PortCallOf`/`WiredServiceName`/`PortReport`, 1.54 the session and 21 `SimulationForm` codecs, 1.55 the diagnostics store. 1.54 alone added 36 names, almost all of them a screen's mechanics. |
| C5 | Target: "the barrel exports only sources, the timeline, collectors, diagnostics and the dock" (~15) | **REFUTED as stated** | Three facts make ~15 unreachable without breaking something the repository relies on. (a) `DevtoolsDockProps` (`DevtoolsDock.tsx:74-161`) names `Source`, `Catalogue`, `DiagnosticsDockOptions`, `WiringReport`, `PortActivity`, `PortCallLog`, `AskedQuestionLike`, `GateInstanceLike`, `HydrationActivity` and `EvaluationPortsLayer`. A public dock makes all of them public, and through them `PortCall`'s five variants, `PortReport`, `CacheReport`, `WiredServiceName` and `HydrationDrops`. (b) ADR-QD-047's own **Decision** lists the model as "source adapters, the timeline fold, verdict classification, pairing, the policy/trace zip, filters and selection". Dropping verdict/pairing/inspect/filters/selection contradicts the ADR the card says this fits. (c) Gate 14 imports `verdictOf`. With the dock, its prop types and ADR-047's readings kept, the recommended interface is **120 root names (46 values)** and **13 React names (7 values)**. That cuts **62 of 108 values** and 31 of 44 React names. The card's "Before: shallow / After: deep" stands; its number does not. |
| C6 | Fits ADR-QD-099 | **CONFIRMED** | ADR-QD-099: "Out of the barrel therefore means **not importable**." `@qadi/devtools`' `exports` has `.` and `./react` only (`package.json:20-33`). Gate 14 check 3b refuses every other packed module. Nothing needs a new entry point, so **no second entry point and no new "Entry points" row**. The existing `./react` row's reason ("`DevtoolsDock` and its panels", `overview.md:871`) is edited, because the panels stop being exported. |
| C7 | "Needs a ruling on what ADR-QD-047's 'headless model for non-React shells' actually requires" | **SETTLED here (D-40-a)** | ADR-QD-047 names two non-React consumers: "a server-side aggregator consumes the model without a UI", and "a served dev UI or a CLI is a second shell over the same model". ADR-QD-049 then chose **a CLI that renders the merged timeline** to a terminal. It is not built, and **no ADR says which package it ships in** (`049-…md:59`: "the repository's first `bin` entry", with no package named; UNVERIFIED, nothing to verify against). So a non-React shell needs (1) sources and their merge, (2) the timeline fold and its store, and (3) the timeline **readings** ADR-047 lists. It does not need a screen's mechanics (form codecs, sweep planners, remedy synthesis, capture decorators, role-tree walks, gate grouping, lens geometry). Those exist to produce what one React screen draws. |
| C8 | ADR-QD-053 | **READ** | ADR-QD-053 puts the gate registry in `@qadi/react` and feeds devtools `gates` "as a plain prop", so `GateInstanceLike`/`AskedQuestionLike` (structural `…Like` types, AGENTS.md §8) must stay public. `gateGroups`/`isLocatable` are readings of that prop that only `QuestionsPanel` uses. The non-React shell cannot obtain gates at all, because they come from a React registry. |
| C9 | *(found)* **54 of the 245 names are unreleased** | **FACT** | `npm view @qadi/devtools version` → `0.11.0` (tag `@qadi/devtools@0.11.0` at `d0884e6`). Diffing `exports-0.11.0.txt` (190 names) against HEAD: wave 3 **added 54** (the 21 codecs, the session's 15, `describeTracePath`, the diagnostics store's 9, `PortCallOf`, `WiredServiceName`, the three session hooks, `useDiagnostics`, `DiagnosticsDockOptions`) and removed `DecisionEventName`. The wave-3 changesets sit untracked in `.planning/architecture/changesets-wave3/` (`git ls-files .changeset` → only `explain-out-of-union.md`), so **wave 3 has not been released**. Making a name private before the next release costs nothing for the 24 unreleased root names this plan removes. The other 56 root and 31 React removals are released, so they break. |
| C10 | *(found)* Five devtools tests import the barrel, not their module | **FACT** | `test/model/{Edits,WhatIf,Remedies,Replay,PortCalls}.test.ts` import from `../../src/index.ts`. They stop compiling once their names are private (T2). Every other devtools test imports its module directly. |
| C11 | *(found)* The type closure of the recommended list is clean | **CONFIRMED, with one accepted exception** | `closure.py`: no public module's `.d.ts` imports a type the list makes private, except `SimulationSession.ts` → `SimulationSource`, through `export type SourceChoice = SimulationSource["_tag"]`. That resolves to the literal union `"Fixtures" \| "Snapshot" \| "Live"`, so a consumer never names `SimulationSource` (D-40-b). The `Simulation.ts → SimulationSource` and `WhatIf.ts → SimulationOptions` hits come from private functions declared in the same file, not from a public signature. |
| C12 | Barrel mechanics | **FACT** | Gate 13 already parses named re-exports (`REEXPORT_FROM`, `check-api-surface.mjs:66-84`), and the repository already uses them: `predicate-sql`/`predicate-prisma` `src/index.ts:33-35` re-export from core. `check-house-style.mjs:1393-1421`'s `barrel-order` rule checks only *pure* `export *` barrels and skips others. AGENTS.md §9 states the barrel shape as `export * from "./File.ts"`, alphabetical. |

**The recommended after-lists** (`$P/after.txt`; ★ marks a name added since `0.11.0`, so removing it breaks no published consumer).

Root `@qadi/devtools` stays **public** (120 names; ᵗ = type-only):

| Module | Public names |
| ------ | ------------ |
| `Source.ts` (all 7) | `Source`ᵗ, `SourceRead`ᵗ, `DecisionEventSource`ᵗ, `MalformedReason`ᵗ, `sourceFromRecords`, `sourceFromEventSource`, `mergeSources` |
| `Timeline.ts` (all 9) | `Timeline`ᵗ, `TimelineEntry`ᵗ, `TimelineDecision`, `TimelineOrphan`, `emptyTimeline`, `ingest`, `ingestAll`, `entryKey`, `DEFAULT_TIMELINE_CAPACITY` |
| `TimelineStore.ts` (all 3) | `TimelineStore`ᵗ, `makeTimelineStore`, `runSource` |
| `Verdict.ts` (all 5) | `Verdict`ᵗ, `Counts`ᵗ, `verdictOf`, `verdictOfOutcome`, `countsOf` |
| `Pairing.ts` (all 4) | `PairRole`ᵗ, `PairedEntry`ᵗ, `pairedEntries`, `pairsOf` |
| `Inspect.ts` (all 9) | `NodeStatus`ᵗ, `InspectKind`ᵗ, `InspectNode`ᵗ, `inspect`, `inspectEntry`, `isNeverResolved`, `isTruncated`, `flattenTree`, `describeTracePath`★ |
| `Filters.ts` (all 6) | `Filters`ᵗ, `noFilters`, `isUnfiltered`, `applyFilters`, `environmentsOf`, `searchTextOf` |
| `Selection.ts` (all 5) | `Selection`ᵗ, `NoSelection`, `Selected`, `Evicted`, `selectionOf` |
| `PortCalls.ts` (all 13) | `PortCall`ᵗ, `PortCallOf`ᵗ★, `PortCallPort`ᵗ, `PortCallInterpreter`ᵗ, `AttributeCall`ᵗ, `ActedCall`ᵗ, `RelationshipCall`ᵗ, `CustomPredicateCall`ᵗ, `SignatureHistoryCall`ᵗ, `PortCallLog`ᵗ, `PortCallCollector`ᵗ, `collectPortCalls`, `DEFAULT_PORT_CALL_CAPACITY` |
| `Hydration.ts` (all 5) | `HydrationActivity`ᵗ, `HydrationDrops`ᵗ, `hydrationActivity`, `unaccountedEntries`, `hasHydrated` |
| `Wiring.ts` (all 7) | `WiringReport`ᵗ, `PortReport`ᵗ, `CacheReport`ᵗ, `PortActivity`ᵗ, `WiredServiceName`ᵗ★, `wiringReport`, `portActivity` |
| `DiagnosticsStore.ts` (all 9) | `Diagnostics`ᵗ★, `DiagnosticsOptions`ᵗ★, `DiagnosticsStore`ᵗ★, `WiringRead`★ (type + value), `makeDiagnosticsStore`★, `runDiagnostics`★, `noDiagnostics`★, `DEFAULT_DIAGNOSTICS_INTERVAL_MILLIS`★ |
| `Gates.ts` (2 of 9) | `AskedQuestionLike`ᵗ, `GateInstanceLike`ᵗ |
| `Catalogue.ts` (3 of 5) | `Catalogue`ᵗ, `PolicySighting`ᵗ, `catalogueOf` |
| `SimulationSession.ts` (12 of 15) | `makeSimulationSession`★, `SimulationSession`ᵗ★, `SimulationSnapshot`ᵗ★, `SimulationSessionInit`ᵗ★, `RunState`ᵗ★, `RunKind`ᵗ★, `SimulationQuestion`ᵗ★, `PolicyChoice`ᵗ★, `ResourceText`ᵗ★, `SourceChoice`ᵗ★, `SourceOption`ᵗ★, `SourceRefusal`ᵗ★ |
| Session type closure | `SimulationInput.ts`: `SimulationInput`ᵗ, `SimulatedSubject`ᵗ, `EvaluationPorts`ᵗ, `EvaluationPortsLayer`ᵗ. `Simulation.ts`: `SimulationClock`ᵗ. `Capture.ts`: `CapturedAnswers`ᵗ, `Answer`ᵗ. `WhatIf.ts`: `SweepPlan`ᵗ, `WhatIfReport`ᵗ, `WhatIfRow`ᵗ, `Comparison`ᵗ, `Compared`ᵗ, `BecameError`ᵗ, `Recovered`ᵗ, `StillFailed`ᵗ. `SimulationEdit.ts`: `SimulationEdit`ᵗ, `EditKind`ᵗ, `EditDirection`ᵗ. `Remedies.ts`: `SkippedRemedy`ᵗ. `Replay.ts`: `Baseline`ᵗ, `BaselineCaveat`ᵗ, `UnseededField`ᵗ |

Root becomes **package-private** (80 names: 24★ unreleased, 56 released):

| Module | Private names |
| ------ | ------------- |
| `SimulationForm.ts` (all 21★) | `Decoded`, `ChipCodec`, `AttributePair`, `attributeLabel`, `attributeCodec`, `edgeCodec`, `eventCodec`, `signatureCodec`, `roleCodec`, `permissionCodec`, `withPair`, `withoutPair`, `sameSignature`, `encodeResource`, `decodeResource`, `actionOf`, `withAction`, `withResource`, `addChip`, `removeAt`, `renameSubject` |
| `SimulationSession.ts` (3★) | `ResolvedSource`, `resolveSource`, `sourceOptions` |
| `SimulationSource.ts` (all 9) | `SimulationSource`, `FixtureSource`, `SnapshotSource`, `LiveSource`, `fixtures`, `snapshot`, `live`, `causesIO`, `portsOf` |
| `Simulation.ts` (3) | `SimulationOptions`, `simulate`, `simulationLayer` |
| `SimulationInput.ts` (2) | `subjectOf`, `evaluationOptionsOf` |
| `Capture.ts` (4) | `emptyAnswers`, `answerCount`, `capturing`, `replayLayer` |
| `WhatIf.ts` (6) | `WhatIfOptions`, `compareOutcomes`, `isChanged`, `sweepPlan`, `whatIf`, `changedRows` |
| `SimulationEdit.ts` (3) | `composeEdits`, `applyEdits`, `editParts` |
| `Edits.ts` (all 6) | `PairSweep`, `DEFAULT_MAX_PAIRS`, `singleEdits`, `pairEdits`, `sameEdge`, `sameEvent` |
| `Remedies.ts` (4) | `Synthesised`, `RemedySweep`, `remedyEdits`, `satisfyingValue` |
| `Replay.ts` (5) | `Replay`, `unseededByReplay`, `replayInput`, `baselineDiff`, `matchesBaseline` |
| `RoleTree.ts` (all 5) | `RoleNode`, `RoleSummary`, `roleSummary`, `grantPath`, `decidingSet` |
| `Gates.ts` (7) | `GateGroup`, `GateStateCount`, `GATE_STATES`, `gateGroups`, `isLocatable`, `locatableIds`, `instancesAsking` |
| `Catalogue.ts` (2) | `policyLabel`, `policiesSeen` |

React `@qadi/devtools/react` stays **public** (13): `DevtoolsDock`, `DevtoolsDockProps`ᵗ, `useDiagnostics`★,
`DiagnosticsDockOptions`ᵗ★, `useTimeline`, `useTimelineStore`, `UseTimeline`ᵗ, `useSimulationSession`★,
`useOwnedSimulationSession`★, `useSimulationSnapshot`★, `UseSimulationSessionInput`ᵗ★, `SimulationSessionView`ᵗ★, and
`AskedQuestionLike`ᵗ (a named re-export from `model/Gates.ts`, as today via `QuestionsPanel.tsx`).
It becomes **private** (31, all released): `DecisionLog`(+`Props`), `Inspector`(+`Props`), `FieldsPanel`,
`ObligationList`, `PolicyExplorer`(+`Props`), `PolicyTree`(+`Props`), `QuestionsPanel`(+`Props`), `RoleViewer`(+`Props`),
`ServicesPanel`(+`Props`), `Simulator`(+`Props`), `WhatIfTable`(+`Props`), `VerdictTag`, `EnvironmentTag`, `GateBox`,
`isMeasurable`, `boxOf`, `boxesOf`, `drawLens`, `clearLens`, `gateIdAt`, `useLens`, `Lens`.

**Outside users of names that become private** (all must move, T4–T6). In `features/`:
`devtools-simulator.steps.test.ts` uses `baselineDiff`, `capturing`, `live`, `matchesBaseline`, `replayInput`,
`replayLayer`, `simulate`, `snapshot`, `sweepPlan`, `whatIf` and `Replay`. `gate-instances.steps.test.ts` uses
`gateGroups` and `isLocatable`. `devtools-screens.steps.test.ts` uses `roleSummary`. The spec fence in
`29-devtools-simulator.md` (BEH-QD-322) uses `edgeCodec`. **The newsroom, the website fences, the package README and
gate 14 use only names that stay.**

## 2. Goal and success criteria

**Goal.** `@qadi/devtools` is two modules in the codebase-design sense: a **headless model** and a **React dock**.
Today each has an interface as wide as its implementation (245 names), so every screen refactor is a public API
change with a gate-13 row and a changeset line (C4). This plan makes the interface the **seam a host actually
crosses**:

- the three **stores** a shell runs: `TimelineStore`/`runSource`, `SimulationSession` and `DiagnosticsStore`/`runDiagnostics`;
- the **host wiring** the dock takes: sources, collectors, hydration, the wiring report, ports and catalogue types;
- ADR-QD-047's **timeline readings**, the vocabulary any non-React shell needs to make sense of a timeline;
- the **types** those signatures name.

Everything a single screen uses to compute what it draws becomes package-private: form codecs, sweep planning, remedy
synthesis, capture decorators, replay reconstruction, role-tree walks, gate grouping and lens geometry. **Depth** goes
up because the same behaviour sits behind 59 values instead of 135 (46 root plus 13 React names, which includes the
React types). **Locality:** a screen's mechanics change without touching `spec/overview.md`, a changeset or a host.
**Leverage:** the acceptance suite is pushed onto the same interface a host uses, so it tests what is shipped.

**Success criteria.**

1. `Object.keys(await import("…/src/index.ts")).sort()` equals the 46-value list in §1, and the React entry equals its 7
   values. This is pinned by `packages/devtools/test/surface.test.ts` (T1, red first).
2. `packages/devtools/test/surface.tst.ts`: every public type in §1 is importable from the root, and `// @ts-expect-error`
   imports of a representative private name from each private module (`whatIf`, `edgeCodec`, `capturing`, `roleSummary`,
   `gateGroups`, `simulate`, `fixtures`, `remedyEdits`, `singleEdits`, `replayInput`, `policyLabel`, `resolveSource`;
   React: `Simulator`, `PolicyTree`, `drawLens`) hold. Checked with `pnpm test:tstyche` (T1).
3. `node scripts/check-api-surface.mjs` (gate 13) passes with the devtools tables listing exactly the public names
   (about 50 rows instead of 90) (T9).
4. `pnpm spec:package` (gate 14) passes. Check 3b refuses every non-entry module as before, and the sandbox consumer still
   imports `emptyTimeline`, `ingest`, `verdictOf` and `DevtoolsDock` (T11).
5. `pnpm test:bdd` passes with no step file importing a private name. The 17 simulator scenarios drive
   `makeSimulationSession`. The gate and role scenarios assert through the public dock or public types (T4, T5).
6. `grep -n "^export \*" packages/devtools/src/index.ts packages/devtools/src/react/index.ts` → nothing, enforced by a
   house-style rule (T8).
7. The newsroom builds and its tests pass unchanged (`pnpm --filter @qadi/example-nextjs test`, or the example's own
   script; confirm in T0), because it imports only names that stay.
8. `pnpm check` is green (T12).

## 3. Non-goals

- **A second entry point** (e.g. `@qadi/devtools/simulation`). ADR-QD-099 requires a reason row, and C7 found no
  consumer that needs the mechanics. D-40-a's option C is the "keep them reachable" alternative.
- **Building ADR-QD-049's CLI**, or deciding its package. If it ships inside `@qadi/devtools`, it reads private modules
  freely. If it ships elsewhere, the readings it needs are already public (C7).
- **Reshaping `DevtoolsDockProps`.** ARCH-34 (one dock feed) and ARCH-44 (one `diagnostics` prop) own that. This plan
  keeps whatever the props name public (D-40-b's closure rule), so those plans shrink the closure later at no extra cost.
- **Narrowing `@qadi/core` or any other package.** The same argument may apply there, but it is out of scope. §9
  records it as a follow-up.
- **Changing behaviour.** No model or React behaviour changes. Only reachability does.

## 4. Constraints

- **AGENTS.md §9.** Today: "`export * from "./File.ts"`, alphabetical". This plan's barrels are **named re-exports** per
  module (`export { … } from "./model/X.ts"` plus `export type { … } from "./model/X.ts"`). That is the form §9 already allows
  "where `.d.ts` emission needs to name them", and the form `predicate-sql`/`predicate-prisma` use. Making it the rule
  for a package whose interface is narrower than its modules is an **AGENTS.md edit and needs user sign-off** (D-40-d).
- **§1.** Hosts and the BDD suite import from the package root, never a subpath or a relative `src` path. The rewrite (T4,
  T5) must not reach into `packages/devtools/src`.
- **ADR-QD-099.** No new entry point. The `./react` row's reason text changes (C6).
- **Gate 13** (`node scripts/check-api-surface.mjs`). STALE fails a table row naming a removed export, so T9 deletes 40-odd
  rows in the same change as T6/T7. MISSING is unaffected (fewer exports).
- **Gate 14** (`node scripts/check-package-install.mjs`). Check 3b already refuses undeclared modules. Its sandbox imports
  only names that stay.
- **`check-doc-examples.mjs` / `check-website-doc-examples.mjs`.** The BEH-QD-322 fence must stop importing `edgeCodec`
  (T6). The website fences use only public names (C3).
- **House style.** `barrel-order` (`check-house-style.mjs:1393-1421`) skips non-pure barrels. T8 adds a devtools-barrel
  rule (D-40-g) and keeps the named groups alphabetical by module path.
- **Madge (ADR-QD-037).** Barrels gain no edges. Changing the five tests' imports from the barrel to modules removes edges.
- **Coverage / Stryker.** Unchanged. A private module is still covered by its own test file and still mutated under
  `model/**`.
- **ADR-QD-038.** One changeset, `@qadi/devtools: minor`, **marked Breaking**, with a migration table (§8). It must ship
  in the same release as wave 3's breaking changes, so the 24★ names never publish (D-40-h). **Never plan a release.**
- **Overlaps (wave 4).**
  - **ARCH-33** changes `PolicyChoice`/`choosePolicy`, which are in this plan's public closure. **Ordering: ARCH-33 first**,
    so the interface frozen here is the keyed one. If this lands first, ARCH-33's changeset marks `choosePolicy` breaking.
  - **ARCH-34** (one dock feed from `@qadi/react`, `DiagnosticsStore`, `DevtoolsDock`) and **ARCH-44** (one `diagnostics` prop)
    reshape the dock's props and may remove `wiring`/`activity`/`portCalls`/`hydration`/`questions`. Under D-40-b, any type
    those props stop naming leaves the closure, and its removal is then a small private-ization in that plan. **Either
    order works.** T0 of whichever lands second re-runs `after.py`/`closure.py`.
  - **ARCH-37** moves `model/Hydration.ts`' drop-reason meanings to core. `Hydration.ts` stays public here, and the
    meanings are not exported today, so there is no conflict.
  - **ARCH-43** (delete the `QadiProvider.gates` override) is `@qadi/react` only. `GateInstanceLike` stays public here.
  - **File overlap:** all of the above touch `spec/overview.md`'s devtools section. Whoever lands second rebases its
    rows onto the narrowed table.

## 5. Decisions needed before work starts

### D-40-a — What the interface is
- **(A) Stores + host wiring + ADR-047's timeline readings + their type closure.** Root 120 names (46 values) and React 13
  (§1 tables). It keeps everything ADR-047's Decision calls the model, everything `DevtoolsDockProps` names, and the
  session as the headless simulator. It removes 62 root values and 31 React names, 87 of them released (**breaking**).
- **(B) The card's "sources, timeline, collectors, diagnostics, dock".** About 25 values and a ~35-type closure. It also
  drops verdict/pairing/inspect/filters/selection and the session. This contradicts ADR-047's Decision text, breaks gate
  14's sandbox (`verdictOf`), and moves six more feature files. It is the narrowest, but it is wrong for the ADR it claims to fit (C5).
- **(C) Unreleased-only trim.** Privatize only the 24★ root names (the 21 codecs, `resolveSource`, `sourceOptions`,
  `ResolvedSource`) and add D-40-g's rule. **Zero published break**, root 176. It leaves the released mechanics (`whatIf`,
  `simulate`, panels, lens) public, so their churn keeps costing gate-13 rows. This is the "defect-free minimal path".
- **(D) Status quo.**
- **Recommendation: A.** It is the complete option, it is consistent with ADR-047's own definition, and its only cost
  beyond C is the released-name break, which D-40-h times to coincide with wave 3's already-breaking minor. Offer C if
  the user declines a break.
- **status: decided (2026-10-08, recommended default)**

### D-40-b — The type-closure rule
- **(A) A type named by a public value's or public type's signature is public**, whether or not anything constructs it.
  The one accepted exception is `SimulationSource`, reached only through `SourceChoice = SimulationSource["_tag"]`, which
  resolves to literals (C11). Checked once by `closure.py` (T0, T12), not by a gate.
- **(B) Values only.** Leave every type public. It is simpler and keeps all 93 types (types churn too: 1.53/1.54/1.55 added types).
- **(C) Types reachable only structurally stay private** (consumers use `Extract<…>`/indexed access). It is the
  narrowest, but it is hostile to anyone writing a function over a snapshot field.
- **Recommendation: A.**
- **status: decided (2026-10-08, recommended default)**

### D-40-c — What the React entry exports
- **(A) The dock plus the three stores' React adapters** (13 names, §1). A React host can build its own simulator or
  timeline view on the public stores. Panels and the lens are private.
- **(B) The dock only** (`DevtoolsDock`, `DevtoolsDockProps`, `useDiagnostics`, `DiagnosticsDockOptions`, `AskedQuestionLike`).
  The hooks go private, and a custom React shell must write its own `useSyncExternalStore` over the public stores.
- **(C) Keep the panels public** (composable dock). No host composes panels (C3), and their props drag 10 more types into the closure.
- **Recommendation: A.** The hooks are thin, and they are the React half of the store interface.
- **status: decided (2026-10-08, recommended default)**

### D-40-d — How a barrel expresses a narrow interface
- **(A) Named re-exports in both barrels,** grouped per module and alphabetical by module path. The list *is* the
  interface, in one reviewable file. Gate 13 already parses it (C12). It needs one sentence in AGENTS.md §9 ("A package
  whose interface is narrower than its modules names its exports per module; `@qadi/devtools` is the one today") and a
  one-paragraph ADR-QD-099 amendment.
- **(B) Keep `export *` and split each partly public module** into a public file and a private file (`SimulationSession.ts`
  → plus `SessionSources.ts`; `Gates.ts` → `GateTypes.ts` + `Gates.ts`; `WhatIf.ts` → `WhatIfTypes.ts` + …; about nine splits).
  It is §9-compliant as written, but it separates each type from the functions that produce it (worse locality), and the
  "interface" is then spread over nine file boundaries.
- **Recommendation: A.**
- **status: decided (2026-10-08, recommended default)**

### D-40-e — The acceptance suite and spec fences that use private names
- **(A) Rewrite through the public interface.** The simulator steps drive `makeSimulationSession` (every scenario's
  observable is in the snapshot: `run`, `plan`, `run.report.rows`, `baseline`, `policy.unseeded`, `capture`, `refusal`,
  `options`). The gate steps assert on `GateInstanceLike`'s public fields directly: "one question" is the count of distinct
  `(policy, resource)` pairs by `Equal.equals` (what `gateGroups` groups by, `Gates.ts:108-109`), and "locatable" is
  `g.element !== undefined && g.element !== null` (`isLocatable`'s whole body, `Gates.ts:105-106`). Alternatively they
  assert through the dock's DOM, which the file already renders under happy-dom. The role steps assert through `DevtoolsDock` with
  `catalogue.roles` (`qadi-role-counts`/`qadi-role-chip`) under happy-dom. The BEH-QD-322 fence drops `edgeCodec`.
- **(B) Keep the three readings public** (`roleSummary`, `RoleSummary`, `RoleNode`, `gateGroups`, `GateGroup`,
  `GateStateCount`, `isLocatable`; +7) and rewrite only the simulator steps.
- **(C) Let `features/` import private modules by relative path.** This breaks AGENTS.md §1 and makes acceptance tests
  test something no consumer can reach.
- **Recommendation: A.** If the role and gate rewrites prove brittle in T5, B is the fallback, recorded in §10.
- **status: decided (2026-10-08, recommended default)**

### D-40-f — Spec shape
- **(A) Amend ADR-QD-047** (dated block: "the model's interface is its stores, the host wiring and the timeline readings;
  a screen's mechanics are package-private") and **ADR-QD-099** (one paragraph on named barrels). No new ADR. Mark the
  behaviour docs that specify now-private functions (BEH-QD-219–226 in `29`, BEH-QD-211–218 in `28`): "package-private
  since CCR-QD-NEXT; specified because the screens rely on it."
- **(B) A new ADR-QD-NEXT,** "The devtools interface is its stores".
- **Recommendation: A.** It refines what ADR-047 already decided.
- **status: decided (2026-10-08, recommended default)**

### D-40-g — Keeping it narrow
- **(A) A house-style rule `devtools-named-barrel`:** no `export *` in `packages/devtools/src/index.ts` or
  `src/react/index.ts`, and named groups sorted by module path. Zero exceptions. Every new public name is then an explicit
  barrel line **and** a gate-13 row, two deliberate edits.
- **(B) An exact `DEVTOOLS_SURFACE_BUDGET` count** (both directions, like `UNTRACED_BUDGET`). This duplicates gate 13's
  per-name check with a number.
- **(C) No gate.**
- **Recommendation: A** (AGENTS.md §15: gated, not remembered).
- **status: decided (2026-10-08, recommended default)**

### D-40-h — When it lands
- **(A) Before the next release,** in the same release as wave 3's breaking minor. The 24★ names then never publish, and the
  87 released removals ride a release that is already breaking.
- **(B) Any time.**
- **Recommendation: A.** This is a sequencing note for the orchestrator. **No release step is planned here.**
- **status: decided (2026-10-08, recommended default)**

## 6. Tasks

There is no defect in scope, so there is no defect-first task. T1 pins the target surface red-first, and T2–T6 move every
consumer of a private name **before** T7/T8 narrow the barrels, so each commit compiles.

### T0 — Re-baseline
- **Status:** [x] done (2026-10-08). After ARCH-33/34/44 landed: root 122 names (47 values: +`DiagnosticsReading`, `mergeReading`), React 13 (7 values); closure unchanged
- **Depends on:** —
- **Files:** none (read-only).
- **Steps:**
  1. `git switch -c arch/40-devtools-interface main`. Record `git rev-parse --short HEAD`.
  2. `pnpm -w run build` (fresh `lib/`), then re-run §1's scripts:
     `node $P/count-exports.mjs .`, `node $P/host-imports.mjs .`, `python3 $P/after.py $P`,
     `cd packages/devtools && python3 $P/closure.py $P lib`. If ARCH-33/34/44 landed, the lists change. Update §1's
     tables and the T1 expected lists from `after.txt`. If the scratchpad is gone, rebuild the scripts from §1's
     description: each is under 60 lines and reads only the repo.
  3. `npm view @qadi/devtools version` and `git ls-files .changeset`. If a release happened since `e635e68`, recompute
     the ★ set against that tag (C9) and update the changeset wording.
  4. Find the newsroom's test command (`cat examples/nextjs-newsroom/package.json`) and record it for criterion 7.
- **Verify:** the commands above.
- **Done when:** §1 is re-confirmed or corrected in §10.

### T1 — Pin the target surface (red first)
- **Status:** [x] done (2026-10-08). Red: `surface.test.ts` saw 109 keys against 47 (React entry likewise); `surface.tst.ts` 18 suppressed errors unmatched
- **Depends on:** T0, D-40-a, D-40-b, D-40-c
- **Files:** `packages/devtools/test/surface.test.ts` (*new*), `packages/devtools/test/surface.tst.ts` (*new*).
- **Steps:**
  1. `surface.test.ts`: `import * as Root from "../src/index.ts"` and `import * as ReactEntry from "../src/react/index.ts"`.
     Assert `Object.keys(Root).sort()` deep-equals the 46 values of §1's public table, and `ReactEntry` the 7 React values.
     The doc comment says the list is the interface (ADR-QD-047 amendment) and that changing it is a gate-13 row too.
  2. `surface.tst.ts` (tstyche, picked up by `pnpm test:tstyche`): `import type { … } from "../src/index.ts"` for every
     public type in §1 (and React types), with an `expect<…>().type.toBe…` no-op per group so the file is not empty of
     assertions. Add `// @ts-expect-error` named imports of the representative private names (criterion 2), one per private module.
  3. Run both. **Red:** `surface.test.ts` sees 108 keys, and every `@ts-expect-error` is unused (TS2578).
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/surface.test.ts`; `pnpm test:tstyche`.
- **Done when:** both fail exactly as described. They go green at T7.

### T2 — Devtools' own tests import their modules, not the barrel
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `packages/devtools/test/model/{Edits,WhatIf,Remedies,Replay,PortCalls}.test.ts` (C10).
- **Steps:** replace each `from "../../src/index.ts"` with the declaring module (`../../src/model/WhatIf.ts`, …). Split
  value and type imports per AGENTS.md §1. No assertion changes.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run test/model`; `pnpm circular`.
- **Done when:** `grep -rn 'src/index.ts\|src/react/index.ts' packages/devtools/test` → only `surface.*`.

### T3 — The website, README and newsroom need nothing (verify)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** none, unless T0 finds a new import.
- **Steps:** re-check `host-imports.txt`'s `examples:`/`apps:`/`scripts/` rows against the public list.
  Expect no change (C3).
- **Verify:** `node $P/host-imports.mjs . | grep -E "examples:|apps:|scripts/"` names only public names.
- **Done when:** confirmed, or the extra users are added to T4/T5's scope.

### T4 — The simulator acceptance steps drive the session (D-40-e)
- **Status:** [x] done (2026-10-08). 13 of the 17 scenarios needed rewriting (4 already drove the session)
- **Depends on:** T0, D-40-e (= A)
- **Files:** `features/features/devtools-simulator/devtools-simulator.steps.test.ts`. The `.feature` file is
  **unchanged**: the Gherkin text is the requirement, and only how it is driven changes.
- **Steps:** for each of the 17 scenarios (`devtools-simulator.feature:13-116`), rewrite the When/Then steps over
  `makeSimulationSession({ sightings, seed?, ports? })`. Fork `session.run(kind)` with `Effect.runFork` or `yield*` it
  inside the step's Effect, and read `session.getSnapshot()`:
  - "writes nothing / reaches no port / subject is the panel's / broken port is an error" → `chooseSource("Live")` with
    the scenario's port layer, `run("Run")`, and read `run.outcome`. A broken port is `Ran` with a failed outcome, never a deny.
  - "Dropping the grant… / Neither grant… / answered with what would fix it" → `setPairs(…)`, `run("Sweep")`, `run.report.rows`.
  - "says what it will cost" → `snapshot.plan.evaluations`/`causesIO` before running.
  - "replayed row seeds… / reconstruction that reproduces / does not / orphan" → `session.seed(entry)`, `policy._tag`,
    `policy.unseeded`, `baseline` after `run("Run")`.
  - "snapshot answers what the live layer answered / captured outage" → Live run, then `chooseSource("Snapshot")`, `run`.
  - "clock" → `setClock`. "source the host did not supply is refused" → `run._tag === "Refused"`. "sweep runs what it said"
    → `plan.evaluations` vs `run.report.rows.length + 1`.
  Remove the imports of the 11 private names. Keep `@REQ-QD-026` tags.
- **Verify:** `pnpm test:bdd` (or `cd features && ./node_modules/.bin/vitest run features/devtools-simulator`).
- **Done when:** all 17 scenarios pass and `grep -nE "\b(simulate|whatIf|sweepPlan|capturing|replayLayer|live|snapshot|baselineDiff|matchesBaseline|replayInput|Replay)\b" features/features/devtools-simulator/*.ts | grep import` → nothing.

### T5 — The gate and role acceptance steps use public names (D-40-e)
- **Status:** [x] done (2026-10-08). Roles via the dock under happy-dom (no D-40-e fallback needed); gates over `GateInstanceLike`
- **Depends on:** T0, D-40-e
- **Files:** `features/features/gate-instances/gate-instances.steps.test.ts` (`:34`, `:256-269`),
  `features/features/devtools-screens/devtools-screens.steps.test.ts` (`:35`, `:271-293`).
- **Steps:**
  1. Gates: replace `(xs).filter(isLocatable)` with `xs.filter((g) => g.element !== undefined && g.element !== null)`
     (`isLocatable`'s body, `Gates.ts:105-106`). Replace `gateGroups(xs).length` with the number of distinct
     `(policy, resource)` pairs by `Equal.equals` (`sameQuestion`, `Gates.ts:108-109`), using a two-line
     `xs.filter((g, i) => xs.findIndex((h) => Equal.equals(h.policy, g.policy) && Equal.equals(h.resource, g.resource)) === i).length`.
     Add a comment naming the private reading each line mirrors. Do not render the dock for this: the scenarios are
     about the registry's contents, not the panel.
  2. Roles: render `<DevtoolsDock catalogue={{ roles }} />` under a `GlobalRegistrator` scoped to the scenario (copy
     `gate-instances`' `AfterAllScenarios` unregister), open the Roles tab, and assert the grant provenance through the
     role panel's test ids. If that is not observable in the DOM, take D-40-e's fallback B for `roleSummary` and record it in §10.
- **Verify:** `pnpm test:bdd`.
- **Done when:** both files import no private name.

### T6 — Spec fences
- **Status:** [x] done (2026-10-08)
- **Depends on:** T0
- **Files:** `spec/behaviors/29-devtools-simulator.md` (BEH-QD-322's `typescript` fence, `:435-448`).
- **Steps:** rewrite the fence to show the session's interface without `edgeCodec`. For example, make a session,
  `edit` a draft, and read `snapshot.policy._tag`/`snapshot.run._tag`.
- **Verify:** `node scripts/check-doc-examples.mjs`.
- **Done when:** it compiles and imports only public names.

### T7 — Narrow both barrels
- **Status:** [x] done (2026-10-08)
- **Depends on:** T1–T6, D-40-a, D-40-c, D-40-d (= A)
- **Files:** `packages/devtools/src/index.ts`, `packages/devtools/src/react/index.ts`.
- **Steps:**
  1. Replace the 26 `export *` lines with one `export { … } from "./model/X.ts"` and/or `export type { … } from "./model/X.ts"`
     pair per module that has public names, in module-path order, listing exactly §1's root public table. Keep the
     header comment and add one paragraph: the list is the interface. A screen's mechanics are reachable inside the
     package only (ADR-QD-099), and adding a name is a barrel line plus a gate-13 row.
  2. The React barrel: `export { DevtoolsDock } from "./DevtoolsDock.tsx"; export type { DevtoolsDockProps } from …`,
     `useDiagnostics`/`DiagnosticsDockOptions`, the session hooks, `useTimeline`/`useTimelineStore`/`UseTimeline`, and
     `export type { AskedQuestionLike } from "../model/Gates.ts"`. Rewrite its header comment, which today lists the
     grouping files.
  3. `pnpm typecheck` builds `lib/`. Then re-run `closure.py` over the new `lib/` and expect only C11's accepted exception.
- **Verify:** `cd packages/devtools && ./node_modules/.bin/vitest run`; `pnpm test:tstyche`; `pnpm typecheck`; `pnpm circular`.
- **Done when:** T1's two tests are green and every devtools test passes unchanged.

### T8 — Gate the named barrels (D-40-g)
- **Status:** [x] done (2026-10-08). Probed: an appended `export *` and an out-of-order group each fail gate 4
- **Depends on:** T7, D-40-g (= A)
- **Files:** `scripts/check-house-style.mjs`.
- **Steps:**
  1. Add `{ id: "devtools-named-barrel", … }` beside `barrel-order` (`:1393`). It fails on any `export *` in the two devtools
     barrels and on named groups out of module-path order. The message names ARCH-40/ADR-QD-047.
  2. Prove it: on a scratch copy, re-add one `export * from "./model/Edits.ts"` and confirm gate 4 fails. Revert.
- **Verify:** `node scripts/check-house-style.mjs`.
- **Done when:** it passes on the branch and failed on the probe.

### T9 — `spec/overview.md` (gate 13)
- **Status:** [x] done (2026-10-08)
- **Depends on:** T7
- **Files:** `spec/overview.md`.
- **Steps:**
  1. In `### @qadi/devtools` (`:742-845`), delete the rows whose names became private. Trim mixed rows (`Gates.ts`,
     `Catalogue.ts`, `SimulationSession.ts`, `SimulationInput.ts`, `Simulation.ts`, `Capture.ts`, `WhatIf.ts`,
     `SimulationEdit.ts`, `Remedies.ts`, `Replay.ts`) to their public names. Delete the 13 React panel/lens rows.
  2. Rewrite the section's lead: two entry points, and what each is (the stores, host wiring and timeline readings; the
     dock and the stores' hooks). The screens' mechanics are package-private (ADR-QD-047 amendment, ADR-QD-099).
  3. Change the "Entry points" `@qadi/devtools/react` reason to "The React dock (`DevtoolsDock`) and the stores' React adapters …".
  4. Add a revision row (1.NEXT) listing the removed names by module, marked **breaking**, CCR-QD-NEXT.
- **Verify:** `node scripts/check-api-surface.mjs`.
- **Done when:** it passes (no STALE, no MISSING).

### T10 — ADRs, AGENTS.md, behaviour notes, docs, changeset
- **Status:** [x] done (2026-10-08) (CCR-QD-321; AGENTS.md section 9 edited per D-40-d)
- **Depends on:** T7–T9, D-40-d, D-40-f
- **Files:** `spec/decisions/047-a-headless-devtools-model.md`, `spec/decisions/099-entry-points-are-a-closed-list.md`,
  `AGENTS.md` (§9, one sentence, **only with the user's explicit approval**), `spec/behaviors/27-devtools-timeline.md`,
  `28-devtools-screens.md`, `29-devtools-simulator.md`, `30-port-calls.md` (a one-line "package-private" note where a
  behaviour's signature listing names a now-private function), `spec/traceability.md` (the `surface.test.ts`/`.tst.ts`
  rows → ADR-QD-047, ADR-QD-099), `spec/README.md` (CCR register), `apps/website/src/content/docs/docs/packages/devtools.md`,
  `apps/website/src/content/docs/docs/reference/upgrading.md`, `packages/devtools/README.md`,
  `.changeset/devtools-headless-interface.md` (*new*).
- **Steps:** §8 gives every edit. Then run the four spec gates.
- **Verify:** `pnpm spec:api && pnpm spec:examples && pnpm spec:website-examples && pnpm spec:verify:strict && pnpm spec:gates && pnpm spec:claims`.
- **Done when:** all pass.

### T11 — The packed artifact
- **Status:** [x] done (2026-10-08)
- **Depends on:** T7
- **Files:** none (or `scripts/check-package-install.mjs` only if its sandbox imports a name that went private; per C3 it does not).
- **Steps:** run gate 14 and confirm that check 3b still refuses `lib/model/WhatIf.js` (and every other non-entry
  module), and that the sandbox consumer compiles.
- **Verify:** `pnpm spec:package`.
- **Done when:** it passes.

### T12 — Full gate
- **Status:** [x] done — full `pnpm check` EXIT=0 on wave4/security-patches 2026-10-08 (mutation: core 94.43, devtools 98.65, sql 95.59, prisma 91.67, audit 91.75, http 94.70, react 95.00)
- **Depends on:** T1–T11
- **Files:** none.
- **Steps:** `pnpm check`. Mutation scores should not move, because the private modules keep their tests. A drop
  means a test was importing through the barrel and was lost in T2. Find it and restore it.
- **Verify:** `pnpm check`.
- **Done when:** green.

### T13 — Update the tracker
- **Status:** [x] done (2026-10-08)
- **Depends on:** T12
- **Files:** this plan (frontmatter `status`, boxes, §10). The orchestrator owns the README row.
- **Steps:** set `status: done`, tick the tasks, and record the SHAs, CCR/ADR revision numbers and D-40-e's fallback, if taken.
- **Verify:** `grep -hE '^status:|Status:\*\* \[' .planning/architecture/ARCH-40-*.md | sort | uniq -c`.
- **Done when:** the plan reflects what landed.

## 7. Test strategy

- **New:** `surface.test.ts` (runtime value list) and `surface.tst.ts` (type list plus refused private imports). They are the
  interface's own test. The list exists in exactly two places, the barrel and these tests, and gate 13 checks the overview
  against the barrel.
- **Unchanged:** every devtools unit test (T2 changes only import paths) and every DOM test (they import components by
  module path already).
- **Moved:** the 17 simulator scenarios now test the session, the interface a host uses, instead of `whatIf`/`simulate`
  directly. The mechanics stay covered by their unit tests (`WhatIf.test.ts`, `Simulation.test.ts`, `Capture.test.ts`,
  `Replay.test.ts`), which this plan does not touch. That is replace, not layer: acceptance at the seam, mechanics at
  the unit.
- **Mutation:** `stryker.devtools.mjs` still mutates `model/**`. Barrels are static (`ignoreStatic`). No change is expected.
- **Property:** none new. The session's existing properties (ARCH-20) cover what the acceptance suite now drives.

## 8. Spec and documentation updates

- **ADR-QD-047**: a dated amendment (CCR-QD-NEXT), "The model's interface". The root exports the three stores
  (`TimelineStore`, `SimulationSession`, `DiagnosticsStore`) with their runners, the host wiring the dock takes, and the
  timeline readings this ADR's Decision lists (verdict, pairing, the policy/trace zip, filters, selection), plus every type
  those name. A screen's mechanics (form codecs, sweep planning, remedies, capture, replay, role trees, gate grouping,
  lens geometry) are package-private. The React entry exports the dock and the stores' hooks. A second shell built inside
  the package (ADR-QD-049) may read private modules. One built outside it uses the readings. Add a revision row.
- **ADR-QD-099**: one paragraph. A barrel may **name** its exports when a package's interface is narrower than its
  modules. Out of the barrel still means not importable. Add a revision row.
- **AGENTS.md §9** (sign-off): "A package whose interface is narrower than its modules names its exports per module
  (`export { … } from`), grouped by module path. `@qadi/devtools` is the one today (ARCH-40, ADR-QD-047)."
- **Behaviour docs 27–30**: where a `ts` signature listing names a now-private function, add one line: "Package-private
  since CCR-QD-NEXT. Specified because the screens rely on it." Normative status is unchanged.
- **`spec/overview.md`**: T9.
- **`spec/traceability.md`**: rows for `surface.test.ts` and `surface.tst.ts`. The BDD rows are unchanged (same REQ tags).
- **Website `devtools.md`** (`:124-140`): "What it renders" lists `simulate`, `whatIf`, `sweepPlan`, `gateGroups` as model
  features. Reword to the session (`makeSimulationSession`, `snapshot.plan`, `run.report`) and the dock's Questions
  panel. Say the panels are what the dock composes, not exports.
- **Website `upgrading.md`**: a "0.12 — `@qadi/devtools`' interface" section with a migration table: `whatIf`/`sweepPlan`/
  `simulate` → `makeSimulationSession(...)` with `run("Sweep")`/`snapshot.plan`/`run("Run")`; `fixtures`/`snapshot`/`live`/
  `capturing`/`replayLayer` → `session.chooseSource`; `replayInput`/`baselineDiff` → `session.seed(entry)`/`snapshot.baseline`;
  panels (`Simulator`, `PolicyExplorer`, …) → `DevtoolsDock`; `roleSummary`/`gateGroups`/lens → no replacement (screen
  internals). This is also the changeset's body.
- **`packages/devtools/README.md`**: the "two entry points" paragraph says what each exports. Its examples use public names only (C3).
- **CCR register**: CCR-QD-NEXT listing every file above.
- **Changeset** `devtools-headless-interface.md`: `"@qadi/devtools": minor`, **Breaking**, the removed names grouped by
  module, the migration table, and a note that 24 of them were never released.

## 9. Risks and rollback

- **An external consumer of a released mechanic** (`whatIf`, `simulate`, a panel). None is known (C3: the repository's
  hosts use none). The migration table names a replacement for each, except the screen internals, which have none
  by design. 0.x minor with a changeset (ADR-QD-038).
- **The acceptance rewrite weakens a scenario.** Mitigation: the Gherkin text is unchanged and the unit tests of the
  mechanics are untouched. Review each rewritten step against its scenario's Then line, and record D-40-e's fallback if
  taken.
- **Closure drift.** A later plan adds a field of a private type to a public snapshot, and the type becomes unnameable
  (it compiles, it is just awkward). Mitigation: re-run `closure.py` in that plan's T0. Promoting it to a gate is a
  follow-up (it needs emitted `.d.ts`, and gate 13 deliberately has no compiler dependency).
- **Overlap churn** with ARCH-33/34/44 on the overview's devtools section and on `DevtoolsDockProps`'s closure (§4).
  Whoever lands second recomputes with `after.py`.
- **Follow-up, out of scope:** the same "interface as wide as implementation" question for `@qadi/core` (its overview
  section is the largest). Recorded here, not planned.
- **Rollback.** Revert T7 (the barrels) and T9 (the overview rows) together. Everything else (test import paths, the
  acceptance rewrite, the fence) is valid against either barrel and can stay.

## 10. Progress log

| Date | Task | Change | By |
| ---- | ---- | ------ | -- |
| 2026-10-07 | — | plan written; surface counted with gate 13's regexes (`$P/count-exports.mjs`), outside users listed (`$P/host-imports.mjs`), the recommended after-lists and the type closure computed (`$P/after.py`, `$P/closure.py`); release state checked with `npm view` | planner |
| 2026-10-08 | T0 | re-baselined at `2d3dac6` (ARCH-33/34/44 in): root 203 declarations (+`DiagnosticsReading`, `mergeReading` since the plan), 122 public names (47 values), React 13 (7 values); `closure.py` shows only C11's accepted exception; `npm view` still 0.11.0 so the 24 unreleased are unchanged; newsroom test command is `pnpm --filter @qadi/example-nextjs test` | implementer |
| 2026-10-08 | T1 | `surface.test.ts` (47 root and 7 React values) and `surface.tst.ts` (76 root types, 6 React types by re-export, 18 refused private names). Red: values `expected [109] to deeply equal [47]`; types `Suppressed: 18 failed` | implementer |
| 2026-10-08 | T2-T6 | five tests import their modules; simulator steps drive `makeSimulationSession` (18 scenarios pass); gate steps count distinct `(policy, resource)` and test `element != null` over `GateInstanceLike`; role steps read the dock's Roles tab (happy-dom, `GlobalRegistrator` unregistered in `AfterAllScenarios`); BEH-QD-322 fence round-trips the resource text. Full BDD run 34 files / 559 tests green | implementer |
| 2026-10-08 | T7 | both barrels are named per-module re-exports; `vitest` devtools 933 pass; `closure.py` unchanged | implementer |
| 2026-10-08 | T8 | `devtools-named-barrel` in `check-house-style.mjs`. **Plan claim C12 was wrong in one respect:** gate 13 reads a named re-export only when it is on one line, so a wrapped list was `[unsupported]`. Taught `check-api-surface.mjs` (`logicalLines`, `REEXPORT_OPEN`) to join a wrapped list; an unclosed list still reaches `UNSUPPORTED` | implementer |
| 2026-10-08 | T9-T11 | overview 1.66 (rows removed, lead and entry-point reason rewritten, revision row), ADR-QD-047 Rev 1.6, ADR-QD-099 Rev 1.1, behaviors 28 Rev 1.10 and 29 Rev 1.7, traceability 1.117, README register CCR-QD-321, AGENTS.md section 9, website devtools and upgrading pages, package README, `.changeset/devtools-headless-interface.md`. Gates green: typecheck, lint, house-style, circular, tstyche (30 files), `spec:examples`, `spec:website-examples`, `spec:api`, `spec:verify:strict`, `spec:gates`, `spec:claims`, `spec:package`, newsroom typecheck and tests | implementer |
| 2026-10-08 | T12 | NOT run: `pnpm check` (coverage, mutation, `pnpm example` build and e2e, `pnpm website`, `spec:publish`) per the wave-4 brief | implementer |
| 2026-10-08 | T13 | plan updated; commits `643af54` (T2-T6), `e79f543` (T1, T7-T9), `40f7723` (T10) on `worktree-agent-a8527dd52d219b90e` | implementer |
