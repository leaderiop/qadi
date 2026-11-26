# Stack Research: v1.11 Arch Wave 16 (Phases 85-91, ARCH-132..138)

**Domain:** internal architecture deepening of an Effect v4 authorization monorepo (devtools model/dock, `@qadi/react` provider, `@qadi/audit` admission, `@qadi/core` port descriptions, named barrels)
**Researched:** 2026-11-25
**Confidence:** HIGH. Every version was read from `node_modules` or `pnpm-workspace.yaml`. Every behavioural claim was read in installed source or reproduced with a throwaway probe under the session scratchpad (`.../scratchpad/probe`, `ts2883`, `ts2883b`, `madge-*.json`). No repo file was changed. `scripts/next-id.mjs` was not run.

**Verdict: no stack change. No new dependency, no version bump, no new config file.** All seven phases are TypeScript restructuring over APIs already installed and already used. What follows is the verified surface the planner needs, plus seven traps found while checking. The four that can silently break a phase are in **Traps that change a phase plan** below. Read those first.

## Installed versions (read, not remembered)

| Technology | Installed | Used by | Note |
|------------|-----------|---------|------|
| `effect` | 4.1.2 | all | Catalog is `latest`; `pnpm-lock.yaml` pins 4.1.2; peer range `^4.0.0` (`pnpm-workspace.yaml`). |
| `@effect/atom-react` | 4.1.2 | 86 | Glue only. Not touched by 86 (the owner is React-free). |
| `react` / `react-dom` | 19.3.1 | 86, 88 | `<Activity>` stable in this range. |
| `typescript` | 7.0.2 (native `tsc`) | 91 | Classic `ts.*` JS API is gone; the parse API is `typescript/unstable/{sync,ast}` (used by `scripts/lib/module-state-scan.mjs`). |
| `vitest` | 5.1.0 | all | Root `vitest.config.ts` has `projects: ["packages/*"]`. Run from the repo root with `--project`. |
| `@effect/vitest` | 4.1.2 | all | `it.effect`, `TestClock`. |
| `tstyche` | 7.2.5 | 91 | `tstyche.json` target `6.0.3`, compiles under `tsconfig.tstyche.json`. |
| `madge` | 8.0.0 | 91 (also 90) | `pnpm circular` = `madge --circular --extensions ts,tsx packages/*/src`. Baseline today: 245 files, no cycle. |
| `@stryker-mutator/core` / `vitest-runner` | 10.1.1 / 10.1.1 | all | `vitest-runner >= 10.1.1` is load-bearing (ADR-QD-074 amendment). |
| `oxlint` | 1.92.0 | all | `.oxlintrc.json` has no react-hooks rules. Reading a ref during render is not a lint failure. |

## Per-phase stack facts

### Phase 85: hydration as a dock-model row (devtools `src/model/`)
- Pure TS over what already exists: `makeDerivedStore` / `makeExternalStore` / `sameFields` (`packages/devtools/src/model/ExternalStore.ts`, `sameFields` at `:153`), `Match.tagsExhaustive` for the Pending / Unwired / Counts view. Nothing to install.
- Coverage: `packages/devtools/src/model/**` is held at **95%** (root `vitest.config.ts`), not 90%. A new pure view file needs its own tests at that bar.
- Mutation: covered by `stryker.devtools.mjs` (`mutate: packages/devtools/src/model/**/*.ts`). `QuestionsPanel.tsx` is `src/react/` and is not mutated.

### Phase 86: React-free registry owner (react)
`AtomRegistry` as installed (`node_modules/effect/dist/reactivity/AtomRegistry.{d.ts,js}`; import path `effect/reactivity/AtomRegistry`; every declaration is `@stability unstable`):

| API | Behaviour the owner can rely on | Source |
|-----|---------------------------------|--------|
| `make({ initialValues, scheduleTask?, timeoutResolution?, defaultIdleTTL? })` | `initialValues` is `Iterable<readonly [Atom, value, InitialValueOptions?]>`, **consumed once, in the constructor** (`RegistryImpl` constructor, `.js:212-231`). Pass an array, never a one-shot generator. No DOM needed: the default dispatcher uses `setImmediate`/microtask (`Scheduler.js:116-122`). | `.d.ts:119`, `.js:57` |
| `reset()` | Clears every timeout bucket, marks all nodes `removed`, then `runAll(nodes, destroyNode)`. **A throwing finalizer does not stop the others; the first error is rethrown after all nodes are destroyed** (`.js:190-200`, `:422-433`). The registry stays usable. | `.js:422` |
| `dispose()` | `this.disposed = true; this.reset()`. **Irreversible**: `createNode` throws `Cannot access Atom ...: registry is disposed` forever after (`.js:329-332`). This is the Wave 15 live defect. The owner must never call it on a registry it intends to recycle. | `.js:438` |
| `set` / `get` / `update` / `modify` after `reset()` | `ensureNode` builds a fresh node. `atoms.subject` is `Atom.keepAlive` (`QadiAtoms.ts:240`), so the written subject survives the macrotask removal sweep. Any non-keepAlive atom written and not read is removed one dispatcher turn later (`scheduleAtomRemoval`, `.js:340-347`). | `.js:330-356` |
| `ensureNode(atom).setInitialValue(v)` | Public on `Node`. The only in-place re-seed. ADR-QD-195 forbids re-seeding a hydration seed on recycle, so the owner must not use it for that. | `.d.ts:94-112` |
| `subscribe` / `mount` | Returned unsubscribe schedules node removal when the node `canBeRemoved` (`.js:262-278`). A `reset()` detaches host subscriptions held directly on the registry (documented in `QadiProvider.tsx` header). | `.js:262` |

Owner shape that keeps ADR-QD-195: `makeRegistryLease(recycle, defer)` already exists and is React-free (`packages/react/src/RegistryLease.ts`, `LeaseDefer = (run) => cancel`, default `setTimeout(run, 0)`). The recycle closure (`try { registry.reset() } finally { registry.set(latest.atoms.subject, latest.subject) }`, `QadiProvider.tsx:200-206`) and the `latestRef` it reads are what move into the owner. **The `finally` is load-bearing**: `reset()` can throw from a finalizer after it has already cleared the nodes, and the subject must still be written back.

- Test seam: the owner takes `defer` like the lease does, so `RegistryLease.test.ts`'s recording defer works unchanged. No `@testing-library/react`, no `happy-dom` needed for the owner's own tests.
- **Mutation (action required):** `stryker.react.mjs` lists exactly five files in `mutate` (`DecisionOutcome`, `QuestionBook`, `HydrationEvent`, `SweepScheduler`, `RegistryLease`). A new owner module is **not measured until it is added to that list**. If `RegistryLease.ts` is folded into the owner, replace its entry. Update the file's header comment, which names each file and its ADR. `QadiProvider.tsx` is not mutated and need not be.

### Phase 87: scoped run that states its stop (devtools `src/model/`)
- **`Effect.fork` does not exist in effect 4.1.2.** The v4 names are `Effect.forkChild`, `forkScoped`, `forkIn`, `forkDetach` (`Effect.d.ts:17089-17255`). The "fork" in the milestone text is `SupersedingRun.fork` (`SupersedingRun.ts:100`), a store-level method, not an Effect API. The engine does not call any `Effect.fork*`: it installs through `FiberHandle.runtime(handle)<never>()` (`FiberHandle.d.ts:671`), which interrupts the previous fiber on each install. No new Effect API is needed.
- APIs `SupersedingRun.ts` already uses, all present: `FiberHandle.make`/`runtime`, `Effect.addFinalizer`, `Effect.onExit`, `Exit.isFailure`, `Cause.hasInterruptsOnly` (`Cause.d.ts:620`).
- `causeMessage(cause)` is exported by `@qadi/core` (`packages/core/src/ThrownMessage.ts:53`): `Cause.pretty`, falling back to `thrownMessage(Cause.squash(cause))` when pretty throws. Four devtools sites already use it (`TimelineFeed.ts:186`, `DiagnosticsFeed.ts:208`, `Diagnostics.ts:263`, `GatesFeed.ts`). `SimulationSession.ts:418` is the only `String(exit.cause)` left.
- **Probe result for the RED test (reproduced on effect 4.1.2):**

  | Cause | `String(cause)` | `Cause.pretty(cause)` | `causeMessage` |
  |-------|-----------------|-----------------------|----------------|
  | `die(new Error("boom"))` | `Cause([Die(Error: boom)])` | `Error: boom` + stack | the pretty text |
  | `die(hostile)` (throwing `toString`/`message`) | `Cause([Die([toString threw])])` | **throws** | `thrownMessage` placeholder |
  | `interrupt()` | `Cause([Interrupt(undefined)])` | `InterruptError: All fibers interrupted without error {...}` | the pretty text |

  ADR-QD-182 decision 11 is correct: `String(cause)` **never throws**. The RED test therefore cannot assert a throw. It must assert the `Broke.message` **equals `causeMessage(cause)`** (or lacks the `Cause([` wrapper). The existing assertions (`SimulationSession.test.ts:1358` includes `"the layer exploded"`; `.runs.test.ts` SR1 includes `"Interrupt"`) still pass under `causeMessage`, because the pretty text of an interrupt contains `InterruptError`.
- Mutation: `stryker.devtools.mjs` covers `SupersedingRun.ts`, the three feeds, `SimulationSession.ts` and `GatesFeed.ts`. Coverage bar 95%.

### Phase 88: `StoppedBox` keys itself (devtools `src/react/`)
- `StoppedBox.tsx` (`useState(() => announced.current.stop !== status)` plus a `useLayoutEffect` ledger write) and `useStopNotice.ts` hold the logic. Both are under `src/react/`, which **no Stryker config reaches** (`stryker.devtools.mjs` is `model/**` only). The verify for 88 is tests plus the 90% coverage floor, not a mutation score. Say so in the phase's `UNMEASURED` list, as `83-mutation.mjs` does.
- React 19.3.1 facts: the box is keyed by remounting (`key={n}`); a second stop is a new mount, which is how the alert role is "fixed at mount". The ledger must outlive a screen, so it cannot move into the box's own `useState` (a screen switch unmounts it and it would re-announce). It stays a dock-owned ref (AGENTS.md section 13: it records which stop was announced, never what the reading says). StrictMode double-invokes the `useState` initializer; the existing read is pure, so that is safe. No lint rule forbids a ref read in render.
- Tests: `happy-dom` + `@testing-library/react`, as in `packages/devtools/vitest.config.ts` (environment is project-wide).

### Phase 89: one admission step for an audit batch (audit)
- Pure TS over `Data.TaggedEnum` / `Data.taggedEnum` (`Data.d.ts`), the pattern `CodecMade.ts:44-58` already uses: `RowsRefusalCases` is a type spread into two enums (`RowsRefusalCases & { NowNotFinite: ... }` in `ArchiveFacts.ts:151` and `Retention.ts:48`). `NowNotFinite` is declared twice today (`ArchiveFacts.ts:141`, `Retention.ts:51`) and checked twice (`AuditArchive.ts:184`, `Retention.ts:101`, both plain `Number.isFinite`). Add it to the shared cases the same way. No new Effect API.
- Import graph (madge, base): `CodecMade` is a leaf; `ArchiveFacts -> {AuditEntry, CodecMade}`; `AuditArchive -> {ArchiveFacts, AuditEntry}`; `Retention -> {AuditArchive, AuditEntry, CodecMade}`; `SequenceIntegrity -> ArchiveFacts`. A shared admission module placed in or beside `CodecMade.ts` that imports only `AuditEntry`/`effect` adds no cycle.
- Mutation: `stryker.audit.mjs` (`packages/audit/src/**/*.ts` minus `index.ts`). Coverage floor 90%.

### Phase 90: port facts on the description (core)
- Pure TS: mapped types over `PortTypes`, `PortSpans`, `PortName = keyof PortSpans` (`PortName.ts`), `PORTS` (`Ports.ts`), `LEAF_NEEDS` (`LeafNeeds.ts:166`). No library API involved.
- **Madge trap:** `PortName.ts` is documented as "a leaf: no imports", and `PortMetrics.ts` and every port module import the name type from it. Deriving `PortName` as `keyof typeof PORTS` inside `Ports.ts` makes the port modules and `PortName.ts`'s consumers import `Ports.ts`, which imports every port module: a cycle that madge counts even when every edge is type-only (ADR-QD-037). Derive it from a leaf both sides can import (the description types), not from the registry.
- Mutation: `stryker.config.mjs` (core, `packages/core/src/**/*.ts` minus `index.ts`). Coverage floor 95%. `readScoped`/`LEAF_NEEDS` changes touch the evaluator's hot path; `pnpm bench` is how AGENTS.md section 5a says to check it.

### Phase 91: named barrels for core, react, audit (see next section)

## Phase 91 tooling analysis

### What already works for a named barrel (no change needed)
| Tool | Finding | Evidence |
|------|---------|----------|
| `check-api-surface.mjs` (gate 13) | Already parses `export { ... } from`, `export type { ... } from`, multi-line lists (`logicalLines`), `type` modifiers and `as` renames (`REEXPORT_FROM`, `REEXPORT_OPEN`, `REEXPORT_NAME`). `surfaceOf` treats an index with **zero** `export * from` lines as the implementation and reads its named lists, which is how `@qadi/devtools` works today. It maps `name -> index file` only; no module column is checked. | `scripts/check-api-surface.mjs:62-208, 236-250`. Baseline `api-surface: 942 export(s) documented across 9 package(s)`. |
| gate 13 safety net | A name dropped from the barrel but still in `spec/overview.md` fails `[stale]`; a name added but undocumented fails `[missing]`. **The 942 count is a mechanical invariant**: run `node scripts/check-api-surface.mjs` before and after; the number must not change unless a Breaking removal is intended and recorded. | `:318-358` |
| gate 14 (`check-package-install.mjs`) | Check 3b refuses every `lib/` module not in the `exports` map regardless of barrel form. Check 3 only requires `Object.keys(import).length > 0`. Check 4 compiles a consumer against the shipped `.d.ts`. A named barrel changes none of this. | `:370-420` |
| `pnpm circular` (madge) | Counts `export { x } from` and `export type { X } from` as edges exactly as `export *`. A named barrel adds no edge to the graph (a barrel is a root, imported by no `src` module). Run `pnpm circular` after **each** fold, not at the end: it takes 2.6s. | probe: 245 files, 2.6s |
| coverage / mutation | Every `packages/*/src/index.ts` is already in the coverage `exclude` list (`vitest.config.ts`), and core and audit exclude `index.ts` from `mutate`. Named barrels stay `index.ts`, so both stay inert. | `vitest.config.ts`, `stryker.config.mjs`, `stryker.audit.mjs` |
| `verbatimModuleSyntax` | Types must be re-exported with `export type { ... }` (or an inline `type` modifier). The existing devtools barrel already groups `export { values }` then `export type { types }` per module path. | `packages/devtools/src/index.ts` |

### Traps that change a phase plan

**1. A type left out of a named barrel silently produces a non-portable shipped `.d.ts` (the real meaning of TS2883 here).** Reproduced on `tsc` 7.0.2 with two composite projects and a `paths` mapping (scratchpad `ts2883b`): a package whose barrel names `make` but not `Hidden` (the interface `make` returns) makes a *dependent* package's unannotated export emit `import("../../a/src/priv").Hidden`, a path into the other package's `src/`, with **exit code 0 and no TS2883**. Naming `Hidden` in the barrel makes it emit `import("@x/a").Hidden`. Today `export *` makes every type nameable; a named barrel removes that guarantee for every type that appears in another package's inferred declarations. Real examples in the repo: `import("@qadi/core").Trace` in `packages/audit/lib` and `packages/react/lib`. A consumer built with `skipLibCheck` then sees an unresolved import as `any`, so gate 14's check 4 may not catch it.
- **Required mitigation (add as a verify step, ideally as a gate-14 check):** after `pnpm typecheck`, no `packages/*/lib/**/*.d.ts` may contain a code specifier that escapes its package. Baseline today is clean:
  `/usr/bin/grep -rEn --include='*.d.ts' 'import\("(\.\./){2,}|from "(\.\./){2,}' packages/*/lib` returns only doc-comment lines (verified: two hits, both in comments). The planner should make this a real check in `check-package-install.mjs` (AGENTS.md section 15: gated, not remembered), not a one-off.
- AGENTS.md section 9's sentence "Re-export internal types explicitly where `.d.ts` emission needs to name them (TS2883)" becomes the barrel itself. The now-redundant `export type { ... }` lines whose only purpose was TS2883 (`Hydration.ts:36-45`, `QadiAtoms.ts`' `HydrationMismatch`, `QadiProvider.tsx:114-125`) can move into the barrel, keyed to the module that declares the name.

**2. `const X` + `type X` dual declarations must go in the value group.** The Policy/Matcher/Schema-first types are `export const ValueRef = Schema...; export type ValueRef = typeof ValueRef.Type` (AGENTS.md section 7), and `Context.Service` / `Data.TaggedClass` classes are value and type at once. `export type { ValueRef } from` exports **only the type meaning**, compiles at the barrel, and fails (or `any`s) at the consumer. gate 13 cannot tell value from type. Generate the lists mechanically instead of by hand:
- Snapshot runtime keys before and after: audit works directly (`node -e 'import("./packages/audit/src/index.ts")'` gave 41 keys). Core does not strip (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`) and react has `.tsx`, so snapshot `Object.keys(await import("<pkg>/lib/index.js"))` after `pnpm typecheck`. The before and after key sets must be identical.
- To classify each declared name as value or type use the TS 7 parse API (`typescript/unstable/sync` + `unstable/ast`, as `scripts/lib/module-state-scan.mjs` does through `scripts/lib/typescript-server-child.mjs`). The classic `ts.*` API does not exist in 7.0.2. Do not commit the generator; the barrel is the artifact.

**3. Two cycle-breakers are not foldable as listed; one is, with a type change.** From `madge --json` on the base tree:

| Planned fold | Edges (base) | Verdict |
|--------------|--------------|---------|
| react `Hydration.ts` into `HydrationEngine.ts` | `Hydration -> {DeveloperSignals, HydrationEngine, HydrationEvent, QadiAtoms (type), SeededDecision}`; **`QadiAtoms -> HydrationEngine`**; `HydrationEngine -> {DeveloperSignals, HydrationBuckets, HydrationEvent, SeededDecision, SeededQuestion}` | **Creates a cycle** `HydrationEngine -> QadiAtoms -> HydrationEngine`, because `Hydration.ts` imports the `QadiAtoms` type and madge counts type-only edges. Foldable only if the folded functions stop naming `QadiAtoms` (a structural parameter type declared in the engine), else keep the file. Needs the madge proof the milestone text asks for. |
| react `GateRegistry.ts` into `GateWriter.ts` | `GateRegistry -> {DeveloperSignals, GateWriter}`; `GateWriter -> {}` (type import from core only); `DeveloperSignals -> {SeededDecision}` | Acyclic: `GateWriter` would gain `DeveloperSignals -> SeededDecision`, neither of which reaches it. |
| audit `SequenceIntegrity.ts` into `ArchiveFacts.ts` | `SequenceIntegrity -> ArchiveFacts` only; `ArchiveFacts -> {AuditEntry, CodecMade}` | Acyclic. |
| core `PortSpanDecode.ts` / `PortSpan.ts` into `PortSpanEncode.ts` | `PortSpan -> PortInterpreter`; `PortSpanEncode -> {PortInterpreter, PortSpan}`; `PortSpanDecode -> {PortSpan, PortSpanEncode}`; `PortInterpreter -> {}` | Acyclic (a chain). `PortSpanEncode` is imported by all five port modules, `PortAccess`, `PortDerivation`, `Predicate`, `SubjectSet`, `Lifecycle`, `GuardHealthCheck`. |
| core `EvaluationSpan.ts` into the port span files | `EvaluationSpan -> {Decision, Policy, PortSpan, PortSpanEncode, Question}`; `Decision -> {..., Policy, ...}`; `Policy -> {Matcher, Obligation, Permission, PolicyArity, Signature, TreeFold, UntrustedDecode}` | **Risky.** The five port modules import `PortSpanEncode`; if `EvaluationSpan` (which imports `Decision` and `Policy`) merged into it, every port module would import `Decision`/`Policy`. Prove with `pnpm circular`; prefer keeping `EvaluationSpan` apart from the port-facing file. |

Fold one file per task and run `pnpm circular` after each (2.6s). Folding changes Stryker per-file scores and the `Document ID`-style per-file records: see section (d) below.

**4. `devtools-named-barrel` needs generalising, and `barrel-order` goes blind on the converted barrels.** `scripts/check-house-style.mjs:2171-2198` hard-codes `DEVTOOLS_BARRELS = [devtools/src/index.ts, devtools/src/react/index.ts]` and prints `[devtools-named-barrel]`. The §9 `barrel-order` rule (`:2125-2158`) only checks files that are *purely* `export * from` lines and silently `continue`s on anything else, so once core/react/audit convert, **only** the named-barrel rule orders them. Required edit:
- Rename the rule `[named-barrel]` (tag text appears in `AGENTS.md`, `spec/README.md`, `spec/traceability.md`, `spec/decisions/047-*.md`, `099-*.md`; the script is the only code).
- Make the list a table `NAMED_BARRELS` of the five files (devtools x2, core, react, audit). `http`, `testing`, `predicate-*` stay `export *` and stay under `barrel-order`; `promise`'s index is the implementation and is skipped by both.
- Keep the two checks (no `export *`, `from` specifiers sorted in case-sensitive ASCII; the comparison is strict `>`, so a value group and a type group from the same module are both fine, as devtools shows). Core's order is plain filename order, e.g. `./Decision.ts` < `./DecisionCache.ts` because `.` < `C`.
- One regex gap to close while there: `STAR_EXPORT` catches `export type *`; gate 13's `BARREL` and `UNSUPPORTED` do **not** (`export type * from` is silently invisible to gate 13). The generalised rule already refuses it in a named barrel, which is enough.
- AGENTS.md section 9 must be rewritten in the same change (it says `@qadi/devtools` is "the one today"), and `spec/overview.md`'s Document ID/Change History, the ADR-QD-047/099 amendments and a CCR row move with it (AGENTS.md section 11).

**5. `QadiProvider.tsx` currently publishes names by accident.** `export * from "./QadiProvider.tsx"` also publishes `useQadiContext`, `QadiContextValue`, `useAtomValue` and the two `export type`/`export` re-exports at `:114-125`. `spec/overview.md:569` documents `useQadiContext` as public, so a named barrel must **keep** it (or be a recorded Breaking removal). Decide each re-export in that file deliberately: after the barrel names `MissingQadiProviderError` and the signal types from their declaring modules, the pass-through lines in `QadiProvider.tsx` are dead weight.

**6. Doc, website, BDD and example fences compile against the barrels.** `pnpm spec:examples`, `pnpm spec:website-examples`, `pnpm test:bdd` and `pnpm example` import from `@qadi/core`, `@qadi/react` and `@qadi/audit`. A dropped name fails there, which is the desired net; budget the run, do not skip it.

**7. The surface test is optional for names.** `packages/devtools/test/surface.test.ts` pins `Object.keys(Root)` as a third edit beside the barrel line and the overview row. Gate 13 already catches both drift directions for names across core, react and audit. The only thing it cannot see is value-vs-type (trap 2). Recommend a runtime-keys `surface.test.ts` for the three packages only if the planner wants that pinned permanently; otherwise the before/after key snapshot above is sufficient. Not required by any gate.

## (d) Stryker coverage per touched file

| Phase | Files touched | Config | Report written to | Gap |
|-------|---------------|--------|-------------------|-----|
| 85 | `model/PortCards.ts`, new pure hydration view, `model/DockModel.ts` | `stryker.devtools.mjs` | `reports/mutation-devtools/mutation.json` | `src/react/QuestionsPanel.tsx`, `DockFrame` unmeasured |
| 86 | new owner module, `RegistryLease.ts` | `stryker.react.mjs` | `reports/mutation-react/mutation.json` | **New file must be added to `mutate`**; `QadiProvider.tsx` unmeasured |
| 87 | `model/SupersedingRun.ts`, new run module, `TimelineFeed`, `DiagnosticsFeed`, `SimulationSession`, `GatesFeed` | `stryker.devtools.mjs` | same as 85 | none |
| 88 | `react/StoppedBox.tsx`, `useStopNotice.ts`, `TimelineNotice.tsx`, `DiagnosticsNotice.tsx` | none | none | **All unmeasured**; declare in `UNMEASURED` |
| 89 | `Retention.ts`, `AuditArchive.ts`, `ArchiveFacts.ts`, `CodecMade.ts`, `SequenceIntegrity.ts` | `stryker.audit.mjs` | `reports/mutation-audit/mutation.json` | none |
| 90 | `PortDescription.ts`, `PortName.ts`, `Ports.ts`, `PortAccess.ts`, port modules, `LeafNeeds.ts`, `PortDerivation.ts` | `stryker.config.mjs` (core) | `reports/mutation/mutation.json` | none |
| 91 | all of core/audit `src` (barrel excluded), react `HydrationEngine`, `GateWriter` | `stryker.config.mjs`, `stryker.audit.mjs` | as above | react folds target files **not in** `stryker.react.mjs`; fold into a listed file only if its score must be kept |

- **The committed baseline reports are stale and must be re-taken at each phase's base commit.** `reports/mutation/mutation.json` is dated 2026-11-23 20:10, before `5784bbd6` (21:54) changed `packages/core/src`; `mutation-audit` is dated 11-24 04:18 and `mutation-react` 11-25 03:36, both before `ac7578f3` touched their sources. Use the established recipe from `.planning/milestones/v1.10-phases/QD-83-*/83-mutation.mjs`: `pnpm exec stryker run <config> --mutate <files>` from the repo root with stdin closed and nothing else running, record into `NN-mutation-base.json`, compare at close under the removed-mutant rule (a new Survived/NoCoverage/Ignored mutant never passes; a score that falls only because killed mutants were deleted does). `--mutate` on the CLI overrides the config's list, so a not-yet-listed file can be measured without editing the config first, but only the edit makes `pnpm mutation` keep measuring it.
- A fold or rename (Phase 91, and 85 / 87 if a file is renamed) needs a `RENAMED` map in the phase's mutation script, as `83-mutation.mjs` did for `DiagnosticsStore.ts -> Diagnostics.ts`; `compare` carries mutants through `git diff -M -U0`.
- `pnpm mutation` (all seven configs) runs only on release PRs and manual runs; `pnpm check:pr` skips it. Re-taking mutation scores is therefore a deliberate per-phase step, not something CI will do.
- Thresholds in every config: `high 90, low 80, break 80`, `timeoutMS 20000`, `ignoreStatic: true`, `coverageAnalysis: "perTest"`, `tsconfigFile: "tsconfig.stryker-disabled.json"` (deliberately absent file; TypeScript 7 removed `ts.parseConfigFileTextToJson`).

## What NOT to add or use

| Avoid | Why | Use instead |
|-------|-----|-------------|
| `AtomRegistry.dispose()` on a registry the owner recycles | Sets `disposed = true` permanently; every later `createNode` throws (`AtomRegistry.js:329`). | `reset()` plus re-writing the subject, as ADR-QD-195 already does. |
| `scheduleTask` / `defaultIdleTTL` on the provider's registry | Reroutes dispatch through React's scheduler and drops a required render (ADR-QD-014, AGENTS.md section 13). Unchanged by this wave. | Leave both unset; eviction stays the atom set's sweep (ADR-QD-148). |
| `Effect.fork` | Does not exist in 4.1.2. | `Effect.forkChild` / `forkScoped` / `forkIn`, or (as `SupersedingRun` does) `FiberHandle.runtime`. |
| `String(cause)` for a stop message | Never throws, but gives `Cause([Die(...)])` rather than the text a reader sees, unlike the other four devtools sites. | `causeMessage` from `@qadi/core`. |
| `onFailure` as the only failure path for `SimulationSession` | See trap A below: it skips interrupt-only causes. | Keep reading the exit for the simulation, or give the shared run an explicit interrupt policy. |
| `export type { X }` for a `const X` + `type X` pair | Drops the value silently (trap 2). | `export { X } from` in the value group. |
| Deriving `PortName` from `Ports.ts` | madge cycle through every port module (ADR-QD-037). | Derive from the description types, a leaf. |
| A new dependency (`ts-morph`, `dependency-cruiser`, `eslint-plugin-react-hooks`, `jscodeshift`) | Nothing in these phases needs one: madge, oxlint and the TS 7 parse API already installed cover them. | Existing tooling; throwaway scripts live in the scratchpad, not the repo. |

## Trap A (Phase 87): a shared run must not drop `SimulationSession`'s interrupt-as-`Broke`

`SupersedingRun.fork`'s `onFailure` is suppressed for `Cause.hasInterruptsOnly(cause)` (`SupersedingRun.ts:106-109`), correctly for a run that was superseded or whose scope closed. `SimulationSession` does not use `onFailure`: it runs `Effect.exit(program(...))` **inside** the forked effect and maps every non-success exit of a *current* run to `Broke` (`SimulationSession.ts:~392-419`), and test SR1 (`SimulationSession.runs.test.ts:55`) pins that "a resolver that interrupts itself reads Broke, not Running". The Timeline and Diagnostics feeds, by contrast, want an interrupt-only cause ignored. A unified "scoped run that states its stop" that routes the simulation through `onFailure` would leave SR1's run on `Running` forever. Either keep the exit read inside the run body for the simulation, or give the shared module an explicit policy for a self-interrupt of a still-current run. Open the phase with SR1 green and keep it green.

## Installation

```bash
# Nothing to install. No dependency, catalog or lockfile change in any phase.
# Per-phase verify (repo root; zsh aliases grep, so use /usr/bin/grep or bash -c):
pnpm typecheck                      # also emits packages/*/lib, which the .d.ts portability grep reads
pnpm circular                       # after every fold in Phase 91 (and Phase 90)
node scripts/check-api-surface.mjs  # must keep printing: 942 export(s) documented across 9 package(s)
pnpm lint                           # oxlint + scripts/check-house-style.mjs
pnpm check:pr                       # the working gate; `pnpm check` adds mutation
```

## Alternatives considered

| Recommended | Alternative | Why not |
|-------------|-------------|---------|
| Reuse `makeRegistryLease` inside the owner | A new timer abstraction | The lease already takes an injected `defer`, is React-free, has its own tests and a mutation entry. |
| `causeMessage` in `SimulationSession` | A local `Cause.pretty` try/catch | A private guard is two rules for one thing (ADR-QD-182, rejected there). |
| Generate named-barrel lists with the TS 7 `unstable` parse API in a throwaway script | Hand-write 600+ names | Value-vs-type mistakes are invisible to gate 13 (trap 2). |
| Fold only where `pnpm circular` is green | Fold all listed files | `Hydration.ts` into `HydrationEngine.ts` introduces a cycle as written (trap 3). The milestone's own rule ("fold only where the madge graph proves no cycle returns") already says so. |

## Confidence

| Claim | Level | Basis |
|-------|-------|-------|
| `AtomRegistry` semantics (reset, dispose, make, set, runAll) | HIGH | Read in `AtomRegistry.js:190-441`. |
| `Effect.fork` absent; `forkChild`/`FiberHandle.runtime` present | HIGH | `Effect.d.ts`, `FiberHandle.d.ts` grep. |
| `String(cause)` vs `Cause.pretty` vs `causeMessage` table | HIGH | Reproduced with a probe on 4.1.2. |
| Gate 13/14 handle named barrels | HIGH | Read the scripts; devtools already uses the form. |
| TS2883 non-portable path with no diagnostic | HIGH for the reproduced shape (two composite projects, `paths`, tsc 7.0.2); MEDIUM for how often the repo's real graph hits it | Scratchpad `ts2883b`; the repo's actual `tsconfig.src.json` graph was not rebuilt. |
| madge edge table | HIGH | `madge --json` on the base tree. |
| Stryker file-to-config map | HIGH | Read all configs. |
| Cycle outcome of folds not listed in the table (core span files other than the ones shown, react `QadiAtoms` types) | MEDIUM | Needs `pnpm circular` per fold. |

## Sources

- `node_modules/effect/dist/reactivity/AtomRegistry.{d.ts,js}`, `Scheduler.js`, `Effect.d.ts`, `FiberHandle.d.ts`, `Cause.d.ts`, `internal/effect.js` (installed 4.1.2): HIGH.
- `packages/react/src/{QadiProvider.tsx,RegistryLease.ts,QadiAtoms.ts,Hydration.ts,HydrationEngine.ts}`, `packages/devtools/src/model/{SupersedingRun,TimelineFeed,DiagnosticsFeed,GatesFeed,SimulationSession,ExternalStore}.ts`, `packages/devtools/src/react/{StoppedBox.tsx,useStopNotice.ts}`, `packages/audit/src/{CodecMade,ArchiveFacts,Retention,AuditArchive}.ts`, `packages/core/src/{PortName,Ports,ThrownMessage}.ts`: HIGH.
- `scripts/check-api-surface.mjs`, `scripts/check-package-install.mjs`, `scripts/check-house-style.mjs:2121-2198`, `stryker.{config,devtools,react,audit}.mjs`, `vitest.config.ts`, `package.json`, `pnpm-workspace.yaml`: HIGH.
- `spec/decisions/{037,047,099,150,182,195,197}-*.md`, `AGENTS.md` sections 5-9, 13, 15; `.planning/milestones/v1.10-phases/QD-83-*/83-mutation.mjs`: HIGH.
- Probes: scratchpad `probe/` (Cause rendering), `ts2883/` and `ts2883b/` (declaration emit), `madge-{react,audit,core}.json`: reproducible, deleted with the session.
- No external web or Context7 lookup was needed: every question was about installed code and this repo's own tooling.

---
*Stack research for: Qadi v1.11 Arch Wave 16*
*Researched: 2026-11-25*
