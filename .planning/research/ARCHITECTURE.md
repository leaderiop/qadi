# Architecture Research: v1.7 Arch Wave 12 (integration of seven tech-debt phases)

**Domain:** Effect v4 authorization library monorepo (`@qadi/*`), tech-debt milestone, no new features
**Researched:** 2026-11-20 (repo head `b91101a6`, branch `arch-wave-12`, base `8b22bd66`)
**Confidence:** HIGH for every file:line and every probe below (read in the tree or run in a throwaway file, then deleted). Items marked *unverified* were not run.

Scope: how each of Phases 62-68 plugs into code that already exists, in what order it is safe to build, and which gates and spec records it must touch. D1-D5 (`.planning/phases/_WAVE12-CONTEXT.md:16-27`) are locked and are not reopened here.

## Standard Architecture

### System Overview

```
 pnpm check (package.json:41)  =  the one definition of "done"
 ┌──────────────────────────────────────────────────────────────────────────────┐
 │ 1-2 tsc -b / tsc -p tsconfig.test.json   (also compiles *.tst.ts)             │
 │ 3-4 oxlint + scripts/check-house-style.mjs   <-- Phase 62 adds a budget       │
 │ 6   tstyche (tstyche.json -> tsconfig.test.json)  <-- Phase 62 pins          │
 │ 7   vitest --coverage     <-- Phases 64-68 RED/characterisation tests         │
 │ 10  spec/scripts/verify-traceability.sh --strict  <-- every phase's records   │
 │ 13  check-api-surface.mjs                                                     │
 │ 14  check-package-install.mjs (spec:package)       <-- Phase 63               │
 │ 16-22 stryker x7 (not in check:pr)                 <-- 64-68 mutation evidence│
 └──────────────────────────────────────────────────────────────────────────────┘
 Source touched, by phase:
   62  tests + scripts only         63  scripts only (+ AGENTS.md sentence)
   64  devtools/model/ExternalStore.ts (13 importers)
   65  core/Admission.ts  (callers Walk.ts:878, Predicate.ts:664 unchanged)
   66  core/UntrustedDecode.ts + EnvelopeKeys.ts (2 `ignore` call sites, both SinkCodec.ts)
   67  core/DecisionCache.ts:273-288, core/SharedComputation.ts:297-335, DecisionCache.test.ts:1250
   68  SinkCodec.ts:616, DecisionLog.ts, one feature step, 3 titles, 2 ADRs
```

### Component Responsibilities (the gates and registers every phase meets)

| Component | Responsibility | Where |
|---|---|---|
| House-style gate | Regex sweep with exact-count budgets, both directions | `scripts/check-house-style.mjs` |
| tstyche + tsc | Type pins; `tsconfig.test.json` includes `packages/*/test/**/*.ts`, so `*.tst.ts` is compiled by `tsc -p` AND run by tstyche | `tstyche.json:1-4`, `tsconfig.test.json` include |
| Gate 14 | Packs every public package, installs offline, compiles and runs one consumer file | `scripts/check-package-install.mjs` |
| Spec gates | Document revision header, INV/ADR/CCR cross-references, doc fences compiled | `spec/scripts/verify-traceability.sh`, `scripts/spec-revise.mjs`, `scripts/check-doc-examples.mjs` |
| Mutation harness | Per-phase `NN-mutation.mjs base / after / evidence / compare`, scores per file | `.planning/milestones/v1.6-phases/QD-61-*/61-mutation.mjs` (copy it) |
| Bench harness | `ab.sh` + `analyze.mjs`, interleaved A/B, band `max(10%, base spread)` | `.planning/milestones/v1.6-phases/QD-59-*/bench/` |

## Phase 62: Type pins that can fail (ARCH-109)

### Root cause (verified, sharper than the context file)

The vacuity is not tstyche's. The Effect language service reports a call to an `Effect`-returning function as `effect(floatingEffect)`, and tstyche reads any diagnostic on the call as "not callable". Probe output (tstyche 7.2.5, TS 6.0.3, `tsconfig.test.json`): `expect(f).type.toBeCallableWith(1)` on `(n: number) => Effect<number>` FAILS with "This Effect value is neither yielded nor used in an assignment. effect(floatingEffect)", and `not.toBeCallableWith(1)` PASSES. The plugin is configured in `tsconfig.base.json` (`"@effect/language-service"`, `diagnostics: true`). `PortAccess.tst.ts:23-29` and `DecisionCache.tst.ts:8-12,28` already say this in prose and use `Params<F>`.

Two probes I ran that the planner can use:
- A file-level `// @effect-diagnostics floatingEffect:off` on line 1 of a `.tst.ts` makes the pin honest: `not.toBeCallableWith(1)` on a valid call FAILS, `toBeCallableWith(1)` PASSES. This removes the need for `Params<F>` in that file.
- The line-level form `// @effect-diagnostics-next-line floatingEffect:off` did NOT work (tstyche reports "has no effect"). Use the file-level form or `Params<F>`, never next-line.

So there are three honest forms: `Params<F>` (exists), the file directive (new, verified), `@ts-expect-error` with message text (exists: `PolicyArity.tst.ts:7,126`, `CompilePredicate.tst.ts:6,25`, checked by both tsc and tstyche). Which one a given file gets is the planner's call; all three must be shown failing once.

### Counting facts

`grep -c` of `not.toBeCallableWith` gives 86 in 27 files; that includes 5 comment mentions (`DecisionCache.tst.ts` 1, `PortAccess.tst.ts` 2, `PortSpan.tst.ts` 1, `Qadi.tst.ts` 1). Code uses with comments stripped: **81** in the same 27 files. The gate must count code tokens, so its first budget numbers sum to 81 minus whatever the phase rewrites, not 86. Heaviest files: `core/test/UntrustedDecode.tst.ts` 9, `PortAccess.tst.ts` 6, `http/test/DevtoolsRouteAddress.tst.ts` 6, `Facade.tst.ts` 5. Files already mixing in `Params<`/`Parameters<` wrappers: `PortAccess` (13), `Qadi` (16), `Explanation` (5), `Policy` (5), `Matcher` (4), `DiagnosticsStore` (4). A pin on `expect<Params<…>>()` is honest, so it is counted but allowed.

### How an existing exact-count budget is built (the pattern to copy)

| Piece | `UNTRACED_BUDGET` | `PORT_DOUBLE_BUDGET` | `UNTRUSTED_DECODE_BUDGET` |
|---|---|---|---|
| Table of file -> exact count + reason | `check-house-style.mjs:464-468` | `:702-742` | `:635-646` |
| Rename guard (names must exist) | `:479-481`, checked `:1291-1300` | none | `:654-660`, checked `:1570-1580` |
| Token regex | `:470` `UNTRACED_CALL` | `:801` built from Errors.ts | `:663` global, counts two on one line |
| Collection | per-line loop `:1008-1173`, `strip()` `:946-962` | same loop, test-scope branch `:1149` | same loop `:1116-1123` |
| Both-direction check | `:1267-1287` (declared != found, and found-but-undeclared) | `:1690-1712` | `:1549-1568` |
| AGENTS.md tie | table at `AGENTS.md:260` (`| Location | Why untraced |`), prose `:286` | prose only, `:424` | table `:541` (`| Location | Count | Why |`), checked `:1582-1608` |

`NOT_CALLABLE_PIN_BUDGET` should copy `UNTRUSTED_DECODE_BUDGET`: a table, a names guard is unnecessary (no function to rename), an AGENTS.md table with a parse check, and both-direction counts. Integration facts that will bite:

1. **`collect()` excludes `*.tst.ts` outright** (`check-house-style.mjs:889`, comment `:871-874`), so `testSources`/`sources` (`:907-924`) never contain a `.tst.ts`. The new check needs its own walk. `METRIC_ID_LITERAL` (`:2057-2089`) and `[no-numbering-placeholder]` (`:2100-2137`, "must also see `.tst.ts` titles") are the two precedents for a block with its own walk. Copy the second walk helper.
2. Count on stripped text, not raw: use `isCommentLine` (`:1929`) plus `strip()` (`:946`), joined with `\n`, regex `/\bnot\s*\.\s*toBeCallableWith\b/g`, because `.not` and `.toBeCallableWith` can wrap onto separate lines in this hand-wrapped codebase.
3. The §7a table finder matches the first line starting `| Location | Count | Why |` (`:1585`). A second table with that header would be read by the wrong check. Give the new table a different header, for example `| Test file | Count | Why |`.
4. The header comment `check-house-style.mjs:23-44` enumerates the budgets ("The tenth, `UNTRUSTED_DECODE_BUDGET`…"); add the eleventh there. AGENTS.md §6 prose numbers its budgets ("sixth" `:424`, "seventh" `:447`); the new paragraph belongs after the tenth, and AGENTS.md §10 (`:589`, which never mentions tstyche) should get one pointer sentence.
5. The budget cannot know a subject is plain-return. It only forces each use to be listed with a reason. A cheap extra check that is mechanical: in a budgeted file, `toBeCallableWith` count (positive controls) is at least the `not.toBeCallableWith` count. Optional.
6. `[stale-exemption]` (`:2143`) is for `EXEMPTIONS` only; a budget row naming a deleted file is caught by the "declared N, found 0" branch, same as the others.

### Build order (RED/characterisation first)

1. **Characterisation file**, new, `packages/core/test/NotCallablePin.tst.ts` (name is the planner's): pins today's wrong behaviour as a passing control (`not.toBeCallableWith` valid args on an Effect subject passes), beside the honest forms (`Params<F>`, `@ts-expect-error`). It has one budget row, reason "known-wrong control". The directive form needs a second tiny file because the directive is file-wide. Commit before touching any pin.
2. **Classification record** in the phase dir (not the repo): per pin, subject return type (Effect or not) and which honest form it gets. Probe 2 in the context file (flip to positive: 81 fail) clears nothing, as it says.
3. **Rewrite pins package by package** (core 14 files, audit 3, devtools 1, http 7, promise 1, react 2). Break each rewritten pin once by hand; `npx tstyche packages/core/test/X.tst.ts < /dev/null` runs one file in about 2 s from the repo root.
4. **Gate last**: set the budget to the final counts, write the AGENTS.md table, because counts move during step 3. Adding the gate first would make every intermediate commit red.

Tests and gate only; no changeset. Records: ADR-QD-175, INV-QD-369/370, CCR-QD-453, `spec/traceability.md` rows for the new `.tst.ts`; BEH-QD-646-650 may stay unused (name them "Unused" in the CCR row). `spec/process/house-rules-evidence.md` (sections 1-6, `:20-195`) is where measured evidence for a house rule lives; add section 7 for the probes above. DoD table unchanged (`definitions-of-done.md:23-49`, step 4 already says "house rules the linter cannot express").

## Phase 63: Gate 14 probes every new public name (ARCH-110)

### Structure of `scripts/check-package-install.mjs` (646 lines)

| Lines | Content |
|---|---|
| 60-95 | imports, `SANDBOX = .package-check`, `fail()` collector, public package discovery |
| 97-134 | check 0: both tsconfig graphs reference every public package |
| 138-175 | `pnpm build`, then `pnpm pack` per package, extracted into `.package-check/node_modules` |
| 181-230 | checks 1-2: no `catalog:`/`workspace:`, exports paths exist |
| 237-268 | symlinks third-party deps from the repo `node_modules` (offline) |
| 274-305 | check 3: `probe.mjs` imports every root and counts `Object.keys` |
| 319-384 | check 3b: closed entry-point list, `probe-subpaths.mjs` |
| **396-584** | `FIXTURE`, a JS template literal holding the consumer's TypeScript |
| 586-609 | writes `consumer.ts` and its tsconfig (`nodenext`, `strict`, `skipLibCheck: false`, `types: ["react"]`) |
| 611-629 | `npx tsc -p` then `node out/consumer.js` |
| 633-646 | failure report; sandbox kept only on failure |

Today the devtools import is `FIXTURE:425` (`emptyTimeline, ingest, makeTimelineFeed, sourceFromRecords, verdictOf`) and the single feed run is `:501-514` (20 `Effect.yieldNow`, no clock, asserts `Reading` and 1 entry). Nothing in the file mentions `makeGatesFeed`, `makeDiagnosticsFeed`, `DecisionCacheShape` or `decisionCacheLayer`.

### Integration points for the three probes

- **Gates feed**: `makeGatesFeed(init?: GatesFeedInputs)` (`devtools/src/model/GatesFeed.ts:113`), all inputs optional, so `makeGatesFeed()` inside `Effect.scoped` over no registry reads `registry._tag === "Unwatched"` (`GatesFeed.ts:146`). Deterministic, no clock; the cadence only forks when a `questions` thunk is handed (`:222-226`).
- **Diagnostics feed**: `makeDiagnosticsFeed(init?: DiagnosticsOptions)` (`DiagnosticsFeed.ts:130`). There is no `schedule` option: the cadence is `intervalMillis` (`DiagnosticsStore.ts:223`), sampled by `Schedule.spaced` after one immediate read (`:251-254`). "Immediate schedule" in the context file means: pass a large `intervalMillis` so exactly one sample runs inside the fixed yield turns. Assert a status of `Live` and the reading present (status union at `DiagnosticsFeed.ts:44-…`).
- **Typed host cache**: `DecisionCacheShape` is a hand-written interface (`core/src/DecisionCache.ts:38`) with `getOrCompute` declared as a **property** (`:100`), so parameters are checked strictly and a `(question, compute) =>` implementation is a real TS error (a method declaration would be bivariant; it is not). The probe wraps `decisionCacheLayer()` (`:215`) in `Layer.effect(DecisionCache, …)` that delegates, typed `DecisionCacheShape`, and a `// @ts-expect-error` on a pre-0.13 `(question, compute)` implementation. Use `import type { DecisionCacheShape }` (`verbatimModuleSyntax: true` in the consumer tsconfig, `:600`). *Unverified*: the exact diagnostic text; add message text after `@ts-expect-error` only if the planner wants the tstyche-style double check (tsc ignores it).
- **Template-literal hazard**: `FIXTURE` is a backtick template, so any backtick or `${` in the added code must be escaped (the existing code escapes `\`Reading\`` at `:502` and `\${removed}` at `:580`).

### The derived guard

The guard must read the artifact, not the source tree. The cheapest correct place is a new probe printed from the sandbox: `node -e` with `cwd: SANDBOX` that does `Object.keys(await import("@qadi/devtools")).filter(n => /^make\w+Feed$/.test(n))`, run after `FIXTURE` is defined (after `:584`) and before `tsc` (`:611`). Fail for each name `n` where `new RegExp("\\b" + n + "\\(")` does not match the fixture text with comment lines removed (a mention in the import list alone must not count; a call must). Type-only names (`DecisionCacheShape`) have no runtime export, so the derived guard cannot cover them; their probe is the `@ts-expect-error` plus the `tsc` run, which fails the gate if the shape is missing from the shipped `.d.ts`.

There is no unit-test harness for any script in this repo (no vitest project covers `scripts/`; no `--self-test` in `scripts/`). So "a deliberately removed probe must fail" is evidence from a manual run: delete the `makeGatesFeed` call from `FIXTURE` once, run `node scripts/check-package-install.mjs`, record the failure, restore. Gate 14 runs `pnpm build` and packs nine packages (slow); budget that into the plan.

### Build order

1. **Guard first** (gate 14 goes RED against today's fixture: two `make*Feed` names unprobed). This is the RED.
2. Add the three probes, gate 14 GREEN.
3. Negative evidence run (remove one probe, see the failure, restore).
4. Records: ADR-QD-033 amendment (Rev 1.1 now, `033-…md:10-12`), ADR-QD-176 only if the planner treats the derived guard as a new decision, INV-QD-371/372, CCR-QD-454, one sentence in AGENTS.md §16 (`:788`) and in `definitions-of-done.md` step 14 paragraph (`definitions-of-done.md:160-175`). `check-dod-table.mjs` compares the table to `pnpm check`'s commands and checks "gate N" references name a command; prose edits there are safe as long as any "gate 14" mention also names `node scripts/check-package-install.mjs` (AGENTS.md `:754`, "Name the script, not just the number").

Gate 14 is step 14 in `pnpm check`'s chain and in the DoD table, and `pnpm check:fast` drops it (`scripts/run-check.mjs` `FAST_DROPS`), while `check:pr` runs it. Do not assume `check:fast` exercises Phase 63.

## Phase 64: One throwing listener cannot silence the rest (ARCH-111)

### The seam

`packages/devtools/src/model/ExternalStore.ts:30-56`: `notify` is `for (const listener of listeners) listener();` over a live `Set` (`:32,34-36`). `subscribe` adds to the Set and returns a deleting closure (`:39-44`); `set` notifies only on a new reference (`:46-50`), `publish` always (`:51-54`).

Semantics to preserve, because the Set is iterated live: a listener removed before its turn is not called; one added during notify is called in the same pass. Do not iterate a copy unless the planner decides to change that; pin whichever is chosen. The phase's "unsubscribe during notify still safe" test covers the first.

### The 13 importers (all verified by grep)

Model, call `makeExternalStore`: `TimelineFeed.ts:112,127`, `GatesFeed.ts:123`, `DiagnosticsFeed.ts:137`, `DiagnosticsStore.ts:163`, `DockModel.ts:212,240,265`, `DockSession.ts:91`, `SimulationSession.ts:433`, `ExplorerSession.ts:238`, `HeldChoice.ts:153` (also imports `sameElements`), `TimelineStore.ts:47`. Type-only: `react/ServicesPanel.tsx:21`, `react/QuestionsPanel.tsx:30`, `react/useStoreSnapshot.ts:10`. `@qadi/react` has no `ExternalStore`; its gate registry swallows listener throws itself (`devtools/test/gateRegistryDouble.ts:8-14`), so D1 touches devtools only.

### Who can now see an `AggregateError`

The throw still escapes after the loop, so the surface is the same sites as today with a different shape when two or more listeners throw:
- `GatesFeed.ts:185` `store.set` inside `publish`, reached from `onRegistry` (the host registry's notify), `tick` (`Effect.sync(tick)` at `:231`: a throw ends the cadence, the line the context says to reword), and `configure` (`:244-257`).
- `DiagnosticsFeed.ts:146,175` `view.set`, reached from the poll's `show` (a throw there is "stated as the poll's stop", `:97`).
- `TimelineFeed.ts:115` `view.publish`, called as a listener of the inner store (`:116`), so the **outer notify's error becomes a thrown value inside the inner notify**; with D1 a nested `AggregateError` can occur. Decide and pin: do not flatten. `TimelineFeed.ts:133,141` `status.set` (the second inside a fork `onFailure` callback).
- The React dock: `useStoreSnapshot` (`react/useStoreSnapshot.ts:13`) passes `store.subscribe` to `useSyncExternalStore`. React's own change handler does not throw on a snapshot error (it forces a re-render), so React is the listener D1 protects, not a thrower. *Unverified in React source*; the dock characterisation tests are the evidence.

Pitfalls for the implementation: collect thrown values in an array and decide by `length`, never by "first error is not undefined" (a listener can `throw undefined`); `noUncheckedIndexedAccess` is on; the `AggregateError` message is a string literal that Stryker will mutate, so assert it (the model is in `stryker.devtools.mjs:47`, `break: 80`); and "one error rethrown as-is" versus "`AggregateError` of one" must each have a test.

### Tests

Existing: `devtools/test/model/ExternalStore.test.ts` (5 tests, subscribe/set/publish/unsubscribe, lines 1-80), `useStoreSnapshot.test.tsx`, `TimelineStore.test.ts`, `DockSession.test.ts`, `Timeline.test.ts`, and the three characterisation files `test/react/QuestionsPanel.characterisation.test.tsx`, `QuestionsPanel.feed.characterisation.test.tsx`, `ServicesPanel.characterisation.test.tsx`, which must pass unedited. No test today pins a throwing listener on a feed (only `GatesFeed.test.ts:663`, a release that throws).

### Build order

1. RED unit tests in `ExternalStore.test.ts`: L1 throws, L2 still called; two throw gives an `AggregateError` with both in `.errors`; none throw unchanged; unsubscribe during notify; a listener throwing `undefined`; nested stores (the `TimelineFeed` chain). One RED test per feed through the public root (`makeTimelineFeed`/`makeGatesFeed`/`makeDiagnosticsFeed`) that two subscribers both see the publish when the first throws.
2. Run the three characterisation files and the whole devtools project green on the base, record.
3. Change `ExternalStore.ts:34-36`. Nothing else in `src` should change.
4. Reword the "must not throw" claims, all found by grep: `TimelineFeed.ts:57,66`, `DiagnosticsFeed.ts:97`, `GatesFeed.ts:8-10,77`, `devtools/README.md:164-168` (the whole paragraph, including the three "status wrong with nothing running" consequences, which D1 narrows but does not remove: the cadence still ends on a tick throw), `spec/behaviors/28-devtools-screens.md:2548` (BEH-QD-638) and the same sentence in BEH-QD-636/637 if present (`:2444-2556`; the `typescript` fence of the feed interfaces is compiled by gate 9, so the `subscribe` fence signature must still compile). Checked: the website devtools page (`apps/website/src/content/docs/docs/packages/devtools.md`) has no listener sentence (`:169` is about the thunk), and `spec/devtools-spec/` has none either, so gate 12's absence table is not touched.
5. Records: ADR-QD-177 (amends ADR-QD-173, which states the feed contract), BEH-QD-636/637/638 amended plus a new BEH in 656-660, INV-QD-373/374, CCR-QD-455, `spec-revise` on `28-devtools-screens.md`; `.changeset/devtools-…md` patch (the package group is `fixed`, `.changeset/config.json:5-15`).

## Phase 65: Only `admit` builds an `Admitted` (ARCH-112)

### The module (`packages/core/src/Admission.ts`, 118 lines)

`RowSource` `:43`; `SuppliedBy` `:49-52`; `SUPPLIED` table `:61-67` takes the **question** (`question.resource !== undefined` for `asked`, constant `true` for `row`); `Admitted` class `:81-90` with a public constructor taking six parameters; `admit` `:97-117` builds the matcher context inline at `:109-114` from `question.resource`. So the resource is read twice (`:64` and `:112`), which is item 59a.

### Callers (complete list, grep over `packages` and `features`)

Source: `Walk.ts:14-15` imports, `Walk.ts:878` `admit(question, "asked")`; `Predicate.ts:19-20`, `Predicate.ts:664` `admit(question, "row")`, with `compileTree(admitted: Admitted<"row">)` at `:361` and `admitted.success.matcherContext` used at `:679`. Tests: `Admission.test.ts` (E1-E6, `:70-140`), `WalkDepthGuard.test.ts:19`, `WalkEnvironment.tst.ts:8-50`. No `new Admitted` anywhere outside `Admission.ts`. `EvaluationEnvironment.test.ts`/`.tst.ts` and `LeafMatrix.test.ts` pin the leaf matrix through `evaluate`; they do not construct an `Admitted`.

The row interpreter nuance for 59a: `toPredicate` builds its question with `resource: undefined` on purpose (`Predicate.ts:659-662`), so for `"row"` the matcher context has no resource and the flag `true` cannot be derived from it. Only the `"asked"` row derives (`ctx.resource !== undefined`, `ctx.action !== undefined`); the `"row"` row stays the constant `true`, held by `SuppliedBy.row: Supplied<true>`. Keep the table shape so a new row source still fails to compile without a row (ADR-QD-172, `:55`, `:261`).

### Design facts for 59b

- A `private constructor` and a `static admit<Source extends RowSource>(question, rowSource)` on the class, then `export const admit = Admitted.admit`. The static body may call `new Admitted(...)`. It must not use `this` (the bare function loses it).
- `Admitted` is package-private (not in the barrel), so gate 13 and `spec/overview.md` are untouched and no changeset is due (ADR-QD-099).
- `keyof Admitted` is pinned at `WalkEnvironment.tst.ts:28-30`; a private constructor and a static do not change instance keys.
- `ADMISSION_ALLOWED` (`check-house-style.mjs:587-590`) counts `new PolicyTooDeep(` per file (Admission.ts 1, Walk.ts 1); moving the code into the class keeps it at 1.
- `Walk.ts:878` and `Predicate.ts:664` need no edit.

### Tests and RED

- 59b RED is a `@ts-expect-error` construction (`new Admitted(...)`) in `WalkEnvironment.tst.ts`. On the base the constructor is public, so the directive is unused and both tsc (`TS2578`) and tstyche fail. Put message text after the directive (repo convention, `PolicyArity.tst.ts:126`). Do not use `not.toBeConstructableWith`. `expect(admit).type.not.toBeCallableWith(...)` at `WalkEnvironment.tst.ts:42-43` is on a `Result`-returning subject, so it is honest and stays; Phase 62 will count it.
- 59a RED (*unverified feasibility*): a `Question` whose `resource` is an accessor that counts reads; on the base it is read twice, after derivation once. Behavioural agreement already holds (E1-E5), so a pure value test cannot be RED.

### Bench gate

Harness: `.planning/milestones/v1.6-phases/QD-59-admission-produces-the-one-walk-environment/bench/ab.sh` (patch-based, 3 + 3 interleaved, applies and reverses a patch around each run) and `analyze.mjs` (statistic: median of per-run minima, band `max(10%, base spread)`), workloads `packages/core/bench/Evaluate.bench.ts` (35). The v1.6 gate of record: slower 0 of 35, geomean -1.15%, worst +6.7% (`59-BENCH.md`). `ab.sh` refuses to start if `packages/core/src` is dirty or a `vitest bench`/Stryker run is live, and applies a patch to the committed head. For "on the committed source": commit the change, generate the revert as a patch (`git diff HEAD <base> -- packages/core/src`), and call that arm "base". Copy the scripts into the phase dir; the archive path may move. Required workloads per `analyze.mjs` are the two leaf-heavy ones (`REQUIRED`, header of `analyze.mjs`).

### Build order

1. Capture Stryker base for `Admission.ts` with a copied `NN-mutation.mjs` (`DecisionCache`'s three-file harness is the template).
2. RED type pin (and the accessor test if kept), committed failing.
3. Change `Admission.ts` only. GREEN.
4. Bench gate on the committed change. Mutation after/compare.
5. Records: ADR-QD-172 amendment (Rev 1.0 now, `:7-12`; its `:55` text says the `"asked"` flags are pinned by tests, which becomes false), INV-QD-375/376 (INV-QD-364's sibling, `invariants.md:4237`), BEH-QD-631..635 area in `behaviors/05-evaluator.md` only if a sentence changes, `traceability.md`, CCR-QD-456. No changeset.

## Phase 66: The decoder reads only what it declares (ARCH-113)

### The seam (`packages/core/src/UntrustedDecode.ts`, `EnvelopeKeys.ts`)

`project` (`UntrustedDecode.ts:166-174`): `Object.entries(input)` runs every own enumerable getter, then `keysOf(entries)` chooses the keys and `fromEntries(entries.filter(...))` keeps them. The comment at `:166` says "It reads no value", which is false for accessors. The same claim is ADR-QD-170 D-19 (`170-…md:57-60`: "a shallow own-key copy that reads no value").

`envelopeKeysOf` (`EnvelopeKeys.ts:68-81`) returns `(entries) => keys`; the only value it reads is `_tag`, via `entries.find(([key]) => key === TAG)?.[1]` (`:77`). The `PROJECTION` table (`UntrustedDecode.ts:184-187`) wires `ignore` to `project(envelopeKeysOf(ast))` and `refuse` to the identity.

Behaviour to preserve exactly (the characterisation tests at `UntrustedDecode.test.ts:312-540` cover most): own, enumerable, string keys only (what `Object.entries` returns); key order of the input; `_tag` read once and only if own and enumerable; an inherited name such as `constructor` never read; unknown or absent `_tag` takes the first member (`EnvelopeKeys.ts:78`). The lowest-risk shape is `Object.keys(input)` (names only, no values) filtered by the declared set, then read the value only for kept keys; `keysOf` gets a way to read `_tag` instead of the entries array.

### Scope facts the planner must not lose

- The `ignore` policy has exactly **two source call sites, both in `SinkCodec.ts`**: `sinkWire` `:501` (with `prepare: checkVersion`) and `storedWire` `:603` (`unwalked: ["record"]`). Every other source seam states `refuse` (`Policy.ts:962`, `PortWireEncode.ts:125,127`, `PortRemote.ts:123`, `audit/AuditArchive.ts:258`, `audit/AuditEntry.ts:117`, `react/HydrationEngine.ts:164,193,209`).
- Under `refuse` the projection is the identity, but two later reads still touch every own getter of a plain object: `walked()` (`UntrustedDecode.ts:223-226`, `Object.entries` when `unwalked` is non-empty) and `exceedsJsonDepth` (`DecodeDepthGuard.ts:28-33`, `Object.keys` then `value[key]`). D4 as locked says `project` reads only declared keys; the ADR wording must scope its claim to the projection under `ignore`, or it will repeat the same overclaim one level down. Decide in the ADR amendment; do not widen the code change without the owner.
- `exceedsJsonDepth` runs on the projected value, so after D4 an undeclared accessor is also never reached by the guard under `ignore`.

### RED and tests

RED: in `UntrustedDecode.test.ts`, an in-process object with an undeclared, enumerable, throwing accessor decoded under `unknownKeys: "ignore"` (today throws from `Object.entries`); plus one through the real seam (`decodeSinkRecord` / `decodeStoredRecord…`, in `UntrustedSeams.test.ts` or `SinkCodec.test.ts`). Do not edit `StoredEnvelope.test.ts` (pinned characterisation, `:1-14`; its N4 at `:255` is about the log, not the decoder). Build decoders inside `it` bodies so mutants are not static-ignored (`ignoreStatic: true`, `stryker.config.mjs`; Phase 57 RESEARCH pitfall 5 `57-RESEARCH.md:543`).

### Gates and budget

`UNTRUSTED_DECODE_BUDGET` (`check-house-style.mjs:635-646`): `UntrustedDecode.ts` 5 (the import `:28`, call `:230`, option `:87`, `Schema.decodeUnknownResult` `:211`, `JSON.parse` `:245`), `DecodeDepthGuard.ts` 1, `PortSpanEncode.ts` 2, `SinkCodec.ts` 1, `SimulationForm.ts` 1; AGENTS.md §7a table `:541`. D4 adds no token, so the budget and table stay unchanged. Any helper that introduces `Schema.decode*`, `JSON.parse` or `onExcessProperty` elsewhere would trip `[untrusted-decode]`.

### D2 (hydration)

No code change. `HydrationEngine.ts:193-197` already states `refuse`; the doc comment at `:150-163` can cite the ADR amendment. Resolve ADR-QD-170 D-09 (`170-…md:88-92`, "reported and not acted on") by recording the reason: a version-checked, same-build payload, strict refusal catches tampering. *Unverified*: whether a test already pins "unknown top-level key in the hydration payload is `MalformedPayload`"; if none, add a characterisation test first so the recorded decision has a pin (BEH-QD-488 area, `behaviors/19-hydration.md`).

### Build order

1. RED tests. 2. Decode micro-bench: add an `ignore` row to `packages/core/bench/UntrustedDecode.bench.ts` (105 lines; existing groups a-c); `ab.sh` is hard-wired to `Evaluate.bench.ts`, so it needs a parameterised copy or a manual interleave, record base then after. 3. Source change in the two files. 4. Stryker base/after on `UntrustedDecode.ts` and `EnvelopeKeys.ts` with the static-evidence run. 5. Records: ADR-QD-179 or amendments to ADR-QD-170 (Rev 1.0, `:3-12`; D-19 sentence, D-09), INV-QD-377/378 (INV-QD-306's family), `behaviors/08-serialization.md` BEH-QD-486 if its `ts` fence text claims the old behaviour, CCR-QD-457, `@qadi/core` patch changeset (in-process accessor no longer invoked).

## Phase 67: No equivalent mutants, no magic race bound (ARCH-114)

### Eviction (`DecisionCache.ts:264-288`)

`settle` appends to `insertionOrder` (a `Chunk`, `:249`), then `while (HashMap.size(entries) > options.capacity)` pops `Chunk.head` and guards with `Option.isSome(oldest)` (`:285-287`), a branch the loop condition makes unreachable (comment `:274-284`). A guard-free shape exists and I probed it in a throwaway file with `effect@4.1.2`: `Chunk.splitAt(chunk, n)` clamps (`n` of -2 and 0 both give `[[], all]`; 5 on a 3-chunk gives `[all, []]`) and `HashMap.removeMany(map, chunk)` removes a `Chunk` of keys. So:

```ts
const [evicted, kept] = Chunk.splitAt(insertionOrder, HashMap.size(entries) - options.capacity);
insertionOrder = kept;
entries = HashMap.removeMany(entries, evicted);
```

has no loop, no `Option`, no `>` to mutate equivalently (no `if (excess > 0)` either, since a negative count clamps to nothing). The `-`/`>`-style mutants it leaves are killable by the capacity tests. Keep the doc comment true (it justifies why eviction is not "evict one"). `Option` is imported at `:22` and used only at `:287`, so the `import * as Option` line must go in the same commit or `noUnusedLocals` fails.

### Claim dispatch (`SharedComputation.ts:297-335`)

The synchronous claim step returns a three-arm union typed inline (`:297-300`); `Claimed` is built at `:319`; the dispatch is `if (claimed._tag === "Hit")` `:322`, `if (claimed._tag === "Joined")` `:329`, then falls through to `const { entry } = claimed` `:335` and the whole owner path `:334-405`. The string `"Claimed"` is never compared, so its mutant survives. The owner arm is about 70 lines of `forkDetach`/`onExit`, so a closed dispatch needs it extracted to a local function. Choices: `Match.tagsExhaustive` per call (house-approved but `Match.value` per call is 3.5-7.7x a `switch` per dispatch, AGENTS.md `:326-328`), a module-level `Match.type` (handlers need `restore`/`key`/`hooks`, so only hoistable per `makeSharedComputation`, not per `run`), or a closed own-property table of arms like `FieldLattice.ts` (ADR-QD-092). `run` is per cached evaluation, not per policy node, so cost is small, but `packages/core/bench/DecisionCache.bench.ts` exists and a 3+3 on it is cheap insurance. `SharedComputation.ts` is not in `SWITCH_BUDGET`, and no new `switch` may be added (`check-house-style.mjs:376-385`). Do not move the hit check out of the one synchronous step (ARCH-45 I5, comment `:257-266`).

### The I5 race test (`DecisionCache.test.ts:1237-1305`)

Loop `for (const budget of [3,4,5,6])` `:1248`, inner `for (let gap = 0; gap <= 48; gap++)` `:1250`, comment `:1249` with the measured switch-over gaps 38/22/15/13. The assertions: no `raced` entries (`:1299`), and both `${budget}:coalesced` and `${budget}:hit` seen at every budget (`:1301-1304`). Replace the bound with "iterate until both orderings observed, cap 512, assert both seen" per budget. Hazard: stopping at the first `hit` stops the sweep right after the boundary, and the original sweep also exercised gaps past it. The comment at `:1232-1235` says the red window is "a few turns wide". Acceptance test for the rewrite: temporarily split the hit check from the claim in `SharedComputation.ts` (the pre-I5 shape), confirm the new loop still goes RED, restore. That is the only evidence the weaker loop still catches I5. Keep a bounded tail past the first `hit` if the probe shows the red needs it.

### Build order and evidence

1. `NN-mutation.mjs base` (copy `61-mutation.mjs`: files `DecisionCache.ts`, `SharedComputation.ts`, `Lifecycle.ts`; Phase 61 scores 0.977 / 0.986 / 1.000, none may drop). 2. Race-test rewrite (test-only, with the revert-the-fix probe). 3. Eviction restructure. 4. Claim dispatch restructure plus `DecisionCache.bench.ts` 3+3. 5. `after` and `compare`. 6. Records: CCR-QD-458 (BEH-QD-671-675 and INV-QD-379/380 probably "Unused"), ADR-QD-180 unused unless dispatch choice is recorded. No changeset (behaviour unchanged). The `compare` step in 61's harness already encodes "no new survivor, every declared deletion happened".

## Phase 68: Hygiene and recorded close-outs (ARCH-115)

Every item re-located by content on `b91101a6`:

| Item | Where it is now | Note |
|---|---|---|
| 58a over-width code | `SinkCodec.ts:616` (137 chars, the `: Result.map(decodeSinkRecord(read.success.record), … new StoredRecord(…))` line in `fromEnvelope`); `features/features/decision-log/decision-log.steps.test.ts:197` (135, `const slot = (stored: StoredRecord) => …`); `DecisionLog.ts`: five lines over 100 at `:8` (comment), `:155`, `:220` (`const entry: LogEntry = {…}`, 108), `:255`, `:262` | Context's "DecisionLog.ts:215" has moved; read `58-REVIEW.md` IN-02 for which line it meant. Many other lines in these files exceed 100 (`SinkCodec.ts` has 26), and AGENTS.md §17 allows hand-wrap drift, so limit the edit to the named lines; do not sweep. |
| 58b `Source.test.ts` title | `packages/devtools/test/model/Source.test.ts:291`, "…is Malformed, never stamped" | -> "never given a label" |
| 58b `StoredEnvelope.test.ts` | header `:1-14` ("committed RED on the base by assertion", `:12-13`); describe title `:228` ("STOR-01, RED on the base"); N1-N4 at `:229,237,249,255` | pinned characterisation file, this is its one recorded edit; reword prose only, keep every assertion |
| 58b `ingest` doc | `DecisionLog.ts:126-129` already says "A defect on this path is not contained here … (ADR-QD-171)" | confirmed present; no edit |
| 61c ADR-QD-174 line 73 | `spec/decisions/174-…md:73` (189 chars; line 13 is 315, line 75 is 168) | re-wrap and `node scripts/spec-revise.mjs spec/decisions/174-… "<what>"`; `--check` is part of `spec:verify` |
| I-b / D3 | `spec/decisions/173-…md` (Rev 1.0, `:60-79` decision list) | amendment: port cards (`PortCards.ts`) stay package-private; how a headless consumer derives the view from the timeline feed. No export, so gate 13 and `overview.md` are untouched |
| 61d | `git diff d0ca3df6~1 d0ca3df6 -- packages/devtools/test/react/Simulator.test.tsx`: 2 insertions, 2 deletions, both comment lines | verified now; it is the only commit on that file since Phase 61's base. Record the stripped-comment diff in the Phase 61 archive; do not edit `61-scan.mjs` (`:53,59`) |

Order: 61d evidence and the two spec edits are independent and free; do the source re-wraps (`SinkCodec.ts`, `DecisionLog.ts`, the feature step) then run core Stryker on `SinkCodec.ts` and `DecisionLog.ts` (their Phase 58 mutant ids are archived, so no id continuity to keep; compare scores to a base run in the shared harness). Phase 68 runs last so it re-wraps after 64-67 have shifted lines. CCR-QD-459; ADR-QD-181 likely unused (amendments suffice, as the context says). No changeset.

## Spec records every phase touches

All of these are checked by gates; none is optional.

| Record | What the gate checks | Notes |
|---|---|---|
| `spec/README.md` CCR register (row format `CCR-QD-452` at `:389`) and its own Document history | verify-traceability check 7: every CCR cited under `spec/` or `AGENTS.md` has a row | reserved CCR 453-459; an unused reserved id is named "Unused: …" in the phase's CCR row |
| `spec/invariants.md` (newest `INV-QD-368` at `:4285`) | check 2: each INV appears in `traceability.md` | reserved 369-382, two per phase |
| `spec/traceability.md` (`INV` rows `:199-200`, `ADR` rows `:367`, test-file rows `:463-464`) | check 2, 3, 6 (every cited test path exists) | add rows for each new test file |
| `spec/decisions/NNN-*.md` + `spec/decisions/index.yaml` (entry format: id, file, title, status) | check 1 (index <-> disk), check 3 (ADR in traceability), 3a (`Document ID` equals file number, e.g. `QADI-ADR-172`) | amendments edit in place and bump Revision |
| `spec/behaviors/*.md` + its `index.yaml` | check 1; `typescript` fences compiled by gate 9 | Phase 64 amends `28-devtools-screens.md` |
| `scripts/spec-revise.mjs` | `--check` is in `pnpm spec:verify`; Revision must equal the newest Change History version | one call per document per change: `node scripts/spec-revise.mjs <doc> "<what changed>"`; it bumps both places and prepends the entry |
| `spec/overview.md` | gate 13 `check-api-surface.mjs` | untouched by every phase here (no export added or removed) |
| `.changeset/*.md` | `check-publish-status.mjs` and release flow | Phase 64 `@qadi/devtools` patch, Phase 66 `@qadi/core` patch; the nine packages are in one `fixed` group (`.changeset/config.json:5-15`) |

Reference for a records plan's shape: Phase 61's plan 06 (`61-06-SUMMARY.md`, three `docs(61-06)` commits: ADR and amendments, BEH/INV, traceability and CCR) and its "every reserved id is used (`Unused: none.`)" line. All phases edit the same six registers, which is why the context file mandates strictly serial execution.

## Patterns to Follow

### Pattern 1: A count budget is a table, a token regex, two directions, and an AGENTS.md table
**What:** the `UNTRUSTED_DECODE_BUDGET` shape (`check-house-style.mjs:635-663,1549-1608`).
**When:** Phase 62's `NOT_CALLABLE_PIN_BUDGET`. The AGENTS.md table must have a header no other table-finder matches.

### Pattern 2: Characterise on the base, then change, then compare
**What:** Phase 61's `NN-mutation.mjs base/after/evidence/compare` plus `NN-scan.mjs`, and the Phase 59 bench gate. **When:** 65, 66, 67 (and 68's Stryker re-run). The base capture is the first commit of the phase, before any source change.

### Pattern 3: A negative type pin needs a positive control and a demonstrated failure
**What:** pair every `not.toBeCallableWith` with a `toBeCallableWith` on the same subject in the same form (`PortAccess.tst.ts:31-44`), and show the negative failing once. **When:** every `.tst.ts` this milestone adds, including Phase 65's `@ts-expect-error` construction.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding the gate before the pins are rewritten
**Why bad:** the budget counts move in every intermediate commit, so each is red. **Instead:** gate in the last plan of Phase 62.

### Anti-Pattern 2: Trusting `grep -c` for "86 pins"
**Why bad:** 5 of the 86 are prose in headers; the gate counts code (81). **Instead:** derive the starting budget from the same stripped scan the gate uses.

### Anti-Pattern 3: Using `not.toBeConstructableWith` or a raw negative on an Effect subject for Phase 65
**Why bad:** the second is vacuous (Phase 62); `not.toBeConstructableWith` shares the diagnostic route (*unverified* for a class constructor, but the context forbids it). **Instead:** `@ts-expect-error` with message text.

### Anti-Pattern 4: Claiming "reads no value" for a decoder path that still enumerates
**Why bad:** it is the bug Phase 66 fixes; `walked()` and `exceedsJsonDepth` read values under `refuse`. **Instead:** scope the sentence to the projection under `ignore`.

### Anti-Pattern 5: Shortening the race sweep without proving it still goes red
**Why bad:** a test that stops at the first `hit` may never straddle the narrow window. **Instead:** revert-the-fix probe, then decide the tail.

## Data Flow (what a change in each phase can break downstream)

```
62  .tst.ts pins -> tstyche + tsc (both) -> house-style budget -> AGENTS.md table
63  FIXTURE (consumer.ts) -> tsc nodenext against packed .d.ts -> node runtime -> guard reads packed root exports
64  listener throw -> ExternalStore.notify -> feed publish (GatesFeed:185, DiagnosticsFeed:146, TimelineFeed:115)
                                           -> host registry notify / Effect.sync(tick) / fiber onFailure
65  Question -> admit -> Admitted<"asked"|"row"> -> Walk.evaluateNode (needs Admitted<"asked"> only) / Predicate.compileTree (Admitted<"row">)
66  untrusted input -> project (ignore) -> walked -> exceedsJsonDepth -> prepare -> strict decode -> SinkCodec seams (2 ignore sites)
67  settle -> eviction (insertionOrder + entries) ; run -> claim step -> Hit | Joined | Claimed(owner fork)
```

## Integration Points

### Internal boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `check-house-style.mjs` <-> `AGENTS.md` | the script reads the AGENTS.md table by header regex | new table header must be unique (`:1404`, `:1585` are taken) |
| `tsconfig.test.json` <-> `*.tst.ts` <-> house-style `collect` | tsc and tstyche compile them; `collect` skips them (`:889`) | a pin gate needs its own file walk |
| gate 14 FIXTURE <-> `@qadi/devtools` root `.` | root export map only; `./react` is the other entry (`devtools/package.json` exports) | derived guard reads the packed root, not `src/index.ts` |
| `ExternalStore` <-> `useSyncExternalStore` | `subscribe`/`getSnapshot` pair, `react/useStoreSnapshot.ts:13` | no change to the pair's shape |
| `Admission.ts` <-> `Walk.ts`/`Predicate.ts` | `admit` named import; types `Admitted<…>` | alias const keeps both callers unchanged |
| `UntrustedDecode.ts` <-> `EnvelopeKeys.ts` | `keysOf` closure signature | change both files in one commit |
| `DecisionCache.ts` <-> `SharedComputation.ts` | `hooks.cached/settle/onOutcome` (`DecisionCache.ts:254-292`) | settle owns eviction; run owns claim dispatch |

### Cross-phase interactions

- 62 before 65: 65's pins use the corrected forms; `WalkEnvironment.tst.ts:42-43` is counted by 62's gate, so 65 must not add a raw `not.toBeCallableWith` on an `Effect` subject (it would break the budget).
- 64 touches no file 68 re-wraps. 66 touches no `SinkCodec.ts` line (68's `:616` is in `fromEnvelope`, after `storedWire`), so 68's re-wrap does not conflict, but 66's tests may add lines to `UntrustedDecode.test.ts` only.
- Registers (README CCR table, invariants, traceability, index.yaml, AGENTS.md) are edited by every phase: `use_worktrees` is false and phases are serial, so there are no merge conflicts, but each phase's `spec-revise` bumps change a document the next phase bumps again; do the records in the phase's last plan so a re-opened phase does not re-bump.
- A stray untracked `packages/core/test/ZzProbe1.tst.ts` appeared in `git status` during this research. It is not mine (my probes were `zzprobe*.tst.ts`, `qa-arch-probe.mjs`, all deleted); it belongs to another concurrent session. Leave it, and do not let a phase commit it.

## Sources

- `.planning/phases/_WAVE12-CONTEXT.md`, `_SHARED-CONTEXT.md`, `.planning/milestones/v1.6-MILESTONE-AUDIT.md` (debt list)
- `scripts/check-house-style.mjs`, `scripts/check-package-install.mjs`, `scripts/run-check.mjs`, `scripts/spec-revise.mjs`, `spec/scripts/verify-traceability.sh`
- `AGENTS.md` sections 4, 5, 5a, 6, 7a, 10, 16; `spec/process/definitions-of-done.md`
- Probes (tstyche 7.2.5, TS 6.0.3, effect 4.1.2), each in a temporary file, deleted afterwards: floating-effect cause and the file-level directive fix; `Chunk.splitAt` clamping and `HashMap.removeMany`.
- Phase archives: `.planning/milestones/v1.6-phases/QD-59-*/59-BENCH.md` and `bench/`, `QD-61-*/61-mutation.mjs`, `61-scan.mjs`, `61-06-SUMMARY.md`, `QD-57-*/57-RESEARCH.md` (static-mutant pitfall)

---
*Architecture research for: v1.7 Arch Wave 12*
*Researched: 2026-11-20*
