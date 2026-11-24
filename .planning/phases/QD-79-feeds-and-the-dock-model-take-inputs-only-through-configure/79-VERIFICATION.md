---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
verified: 2026-11-24T19:15:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".changeset/devtools-feeds-take-inputs-through-configure.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-01-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-01-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-02-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-02-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-03-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-03-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-04-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-04-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-05-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-05-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-06-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-06-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-07-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-07-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-08-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-08-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-09-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-09-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-10-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-10-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-11-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-11-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-12-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-12-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-13-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-13-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-14-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-14-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-15-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-15-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-16-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-16-SUMMARY.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-17-PLAN.md"
  - ".planning/phases/QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure/79-17-SUMMARY.md"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/ExternalStore.ts"
  - "packages/devtools/src/model/GatesFeed.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/useConfigured.ts"
  - "packages/devtools/src/react/useDiagnostics.ts"
  - "packages/devtools/src/react/useDockModel.ts"
  - "packages/devtools/src/react/useScoped.ts"
  - "packages/devtools/src/react/useTimeline.ts"
  - "packages/devtools/test/model/ConfigureInputs.tst.ts"
  - "packages/devtools/test/model/ConfigureRule.test.ts"
  - "packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx"
  - "packages/devtools/test/react/useConfigured.test.tsx"
  - "packages/devtools/test/surface.tst.ts"
  - "scripts/check-package-install.mjs"
  - "spec/decisions/192-feeds-and-the-dock-model-take-inputs-only-through-configure.md"
covered_digest: "v4:sha256:b5475e132cbb986996fdc29538888df723805e3978bc34acf4c1424a849cabad"
behavior_unverified: 0
overrides_applied: 0
---

# Phase QD-79: Feeds and the dock model take inputs only through `configure` - Verification Report

**Phase Goal:** Every feed and the dock model are built with no inputs and take them only through `configure`, so one per-field identity rule decides whether an input moved, one package-private hook does "scope, then configure", and the dock's input type is stated once.
**Verified:** 2026-11-24, at HEAD. `git diff --stat 92cfd986 HEAD -- packages scripts spec apps .changeset` is empty, so the tree the re-close run and the review iteration 3 saw is the tree verified here.
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP success criterion) | Status | Evidence |
|---|-----------------------------------|--------|----------|
| 1 | SC1 / CONF-01: a first-render characterisation (diagnostics, gates, the Questions join), plain and under StrictMode, written on the base, green there, green after | VERIFIED | `79-characterisation-check.mjs`: "ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)", exit 0, so the file is unchanged since the commit made on the base. It is in the devtools run (all 80 files green). `79-RED-EVIDENCE.md` records edit F1 (build bare, configure one effect later) failing C1 to C6 (C2 is the StrictMode case), so the check can fail. |
| 2 | SC2 / CONF-02: the four constructors take no input and `configure` is the only way in; the first `configure` produces what `init` produced | VERIFIED | `makeTimelineFeed` (`TimelineFeed.ts:161`), `makeDiagnosticsFeed` (`DiagnosticsFeed.ts:163`), `makeGatesFeed` (`GatesFeed.ts:151`) and `makeDockModel` (`DockModel.ts:317`) are each `Effect.fn(...)(function* (): ...)` with no parameter. `surface.tst.ts` pins `Parameters<typeof makeX>` as `[]` for the three feeds; gate 14's packed consumer declares `TimelineFeedIsBare` and its two siblings as `[Parameters<...>] extends [[]]` and assigns `true` (`scripts/check-package-install.mjs`). A repo-wide grep for `make(TimelineFeed\|GatesFeed\|DiagnosticsFeed\|DockModel)(<non-empty>` finds one hit, the upgrade guide's "before" `ts` fence (uncompiled by design, `upgrading.md:1307-1308`). `makeSimulationSession` keeps its argument because it has no `configure` (changeset bullet 8; ROADMAP "if it has the same shape"). The equivalence cells of the old constructor path were retired in 79-12 and `ConfigureRule.test.ts` (948 lines) pins configure-after-bare. |
| 3 | SC3 / CONF-03: one per-field rule decides whether an input moved; omitted equals `undefined`; diagnostics on/off stays distinct; G43 is a stated exception; a type pin that can fail forces a new field to be compared | VERIFIED | The rule is `sameFields` (`ExternalStore.ts:138`) and `sameFieldsOrAbsent` (`:154`, absent equals only absent), exported from the file, not the barrel. Used at `TimelineFeed.ts:200`, `DiagnosticsFeed.ts:217` (`sameFieldsOrAbsent`, so `{}` and `undefined` differ), `GatesFeed.ts:284`, and by `makeDerivedStore` (`ExternalStore.ts:197`). Each feed normalises through one function whose declared return type is `Required<...>` (`completeTimelineInputs`, `completeDiagnosticsOptions`, `completeGatesInputs`, `completeDockInputs` at `DockModel.ts:177`), so omitted and `undefined` become one present field. G43 is the stated exception: `GatesFeed.ts:283-284` ("A failed watch is retried by any configure: the rule's one stated exception", `&& watchFailure === undefined`), and `DockRegistryReads.test.tsx` pins the retry per re-render. `ConfigureInputs.tst.ts` writes every input type's full shape, the normalisers' return types and four `@ts-expect-error` negatives; it passes under both tstyche passes (`run-tstyche`: 76 files, 414 passed, 1 skipped, 0 failed). The dock has no comparison of its own beside `wanted.catalogue !== before.catalogue` (`DockModel.ts` configure): it dispatches `feedInputsOf(wanted)` to the feeds, each of which applies the rule (ADR-QD-192 decision 2, rev 1.2). |
| 4 | SC4 / CONF-04: one package-private hook does "build in a scope, then configure with the latest inputs", used by `useDockModel`, `useTimeline`, `useDiagnostics`; a hidden `Activity` or StrictMode rebuild configures with current inputs, pinned by a test | VERIFIED | `react/useConfigured.ts` configures inside the scoped build (`useScoped(() => Effect.tap(make(), built => Effect.sync(() => configure(built, inputs))))`) and again in a layout effect on `[value, inputs]`. Callers: `useDockModel.ts` (`useConfigured(makeDockModel, configureDock, inputs)`), `useTimeline.ts` (`useConfigured(makeTimelineFeed, ...)`), `useDiagnostics.ts` (`useConfigured(makeDiagnosticsFeed, ...)`). It is not in the barrel (`react/index.ts` exports only `DevtoolsDockProps` of the dock's types). `useScoped.ts:29-32` closes the scope and rethrows if the build throws (T-79-04 / T-79-18 in `79-SECURITY.md`, `threats_open: 0`). `useConfigured.test.tsx` (151 lines) pins stale-input, StrictMode and `Activity` cases and is green; RED evidence is in `79-RED-EVIDENCE.md`. `useSimulationSession` is unchanged: the session has no `configure`, so the hook does not fit it, which the criterion allows ("where it fits"). |
| 5 | SC5 / CONF-05, CONF-06: `UseDockModelInput` is gone; `DevtoolsDockProps` is `DockModelInputs` plus host props; inputs mapped onto the feeds in one place; gate 14, `surface.tst.ts`, README, website, spec and ADR fences on the new signatures; ADR-QD-192; Breaking changeset; upgrade-guide entry | VERIFIED | `UseDockModelInput`: zero hits across `packages`, `apps`, `scripts`, `spec`. `DevtoolsDock.tsx:76`: `export interface DevtoolsDockProps extends DockModelInputs { unknownParents; onInvalidate }`, and `surface.tst.ts` pins its ten keys and that each accepts `undefined`. `feedInputsOf` (`DockModel.ts:205`) is the one mapping, called once at `configure` (`:403`); the diagnostics interval crosses to the gates there and nowhere else. Gate 14 consumer (`check-package-install.mjs`) builds feeds bare, configures, and compiles a `DevtoolsDockProps` literal naming all ten props (compiled only by `pnpm spec:package`, not run here; see "Not checked"). README (`packages/devtools/README.md`), website page (`devtools.md`) and `spec/behaviors/28-devtools-screens.md` use the new calls; `check-doc-examples.mjs` compiles 119 blocks and `check-website-doc-examples.mjs` 75. Changeset `.changeset/devtools-feeds-take-inputs-through-configure.md` is `"@qadi/devtools": minor` and opens "**Breaking.**". Upgrade-guide entry `upgrading.md:1281` ("0.13: the feeds and the dock model take their inputs only through configure") with a before `ts` fence and an after compiled `typescript` fence. ADR-QD-192 (`spec/decisions/192-...md`, rev 1.4, "Accepted — amends ADR-QD-137, ADR-QD-173 and ADR-QD-185"); each of 137, 173 and 185 carries the amendment in its Status line and change history, and `index.yaml` lines 428, 544, 572 and 597 agree. |

**Score:** 5/5 truths verified, 0 behavior-unverified. Every state-transition and cleanup truth (no half-applied inputs, scope closed on a throwing first `configure`, retry of a failed watch, no restart when nothing moved) has a passing behavioural test in `ConfigureRule.test.ts`, `useConfigured.test.tsx`, `DockRegistryReads.test.tsx` or `GatesFeed.test.ts`, and `79-pinned-check.mjs` confirms 15 of them hold their assertions.

### Commands Run

| Command | Result |
|---------|--------|
| `pnpm exec vitest run --project devtools` | 80 files, 1869 tests passed, exit 0 |
| `pnpm typecheck` | exit 0 |
| `node scripts/check-house-style.mjs` | "596 file(s) clean (3 declared switch(es), 76 type-test file(s))", exit 0 |
| `node scripts/check-api-surface.mjs` | "942 export(s) documented across 9 package(s)", exit 0 |
| `bash spec/scripts/verify-traceability.sh --strict` | PASS 21, FAIL 0, SKIP 0 |
| `node 79-mutation.mjs compare` | exit 0: all five files 0 survived, 0 no-coverage, "0 new" Ignored; `ExternalStore.ts` improved 77/78 to 88/88 survived 1 to 0; "every score that fell lost only killed mutants" |
| `node 79-pinned-check.mjs` | "15 tests hold their assertions", exit 0 |
| `node 79-characterisation-check.mjs` | holds its first commit (cf3186d9), exit 0 |
| `node scripts/run-tstyche.mjs` (extra) | both passes green: 76 files, 414 passed, 1 skipped, 897 assertions |
| `check-doc-examples.mjs`, `check-website-doc-examples.mjs` (extra) | 119 and 75 blocks compile |

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `react/useConfigured.ts` | VERIFIED | Substantive, wired by three hooks, package-private |
| `model/ExternalStore.ts` `sameFields`, `sameFieldsOrAbsent` | VERIFIED | Exported, used by three feeds and `makeDerivedStore` |
| `model/DockModel.ts` `completeDockInputs`, `feedInputsOf`, `configure` | VERIFIED | One normaliser, one mapping, one dispatch order |
| `react/DevtoolsDock.tsx` `DevtoolsDockProps extends DockModelInputs` | VERIFIED | Passes the rest props straight to `useDockModel(inputs)` |
| `test/model/ConfigureInputs.tst.ts`, `test/surface.tst.ts` | VERIFIED | Type pins with failing negatives, green in both tstyche passes |
| `79-mutation-base.json`, `79-mutation-close.json`, `79-RED-EVIDENCE.md` | VERIFIED | Present; compare exits 0 |
| ADR-QD-192, BEH-QD-731 to 735, INV-QD-403 and 404, CCR-QD-471, changeset, upgrade entry | VERIFIED | All present and traced (strict traceability passes) |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `useDockModel` / `useTimeline` / `useDiagnostics` | `useConfigured` | direct call | WIRED |
| `useConfigured` | `useScoped` | build + configure inside the scoped effect | WIRED |
| `DevtoolsDock` | `useDockModel` | `...inputs` rest of the props | WIRED |
| `DockModel.configure` | the three feeds | `feedInputsOf(wanted)` once | WIRED |
| feeds | `sameFields` / `sameFieldsOrAbsent` | import from `ExternalStore.ts` | WIRED |

### Data-Flow Trace (Level 4)

The inputs flow from the host's props through `useDockModel` to `DockModel.configure` and on to each feed's `configure`, which read the host's source, registry and thunk (not literals). The first-render characterisation and `DockRegistryReads.test.tsx` observe the real values arriving and the real read counts. Status: FLOWING.

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| CONF-01 | SATISFIED | Truth 1 |
| CONF-02 | SATISFIED | Truth 2 |
| CONF-03 | SATISFIED | Truth 3 |
| CONF-04 | SATISFIED | Truth 4 |
| CONF-05 | SATISFIED | Truth 5 (`UseDockModelInput` gone, `feedInputsOf`) |
| CONF-06 | SATISFIED | Truth 5 (gate 14, `surface.tst.ts`, README, website, spec fences, ADR, changeset, upgrade guide) |
| WX-01 | SATISFIED | `pnpm check:pr` green on 92cfd986 per the re-close run; `packages/ scripts/ spec/ apps/ .changeset/` byte-unchanged since (empty diff). Not re-run here. |
| WX-02 | SATISFIED | ADR-QD-192, CCR-QD-471, BEH-QD-731 to 735, INV-QD-403 and 404 use the reserved numbers; strict traceability passes; no `next-id.mjs` run by the verifier |
| WX-03 | SATISFIED | `check-api-surface.mjs` passes; gate 14's consumer probes the three `make*Feed` signatures |
| WX-04 | SATISFIED | Added-lines scan of `git diff 910cb783 HEAD -- packages/*/src scripts` for `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, module-scope `let`, `Record<string, unknown>`, `Stryker disable`, `console`, `process.env`, `Date.now`: only comment text and two `import` lines matched, none a construct. The same scan over `packages/*/test` finds no `Stryker disable` or `Record<string, unknown>`. House-style gate clean with the switch count still 3. |
| WX-05 | SATISFIED | `79-mutation.mjs compare` exit 0; no new open or Ignored mutant; no score fell except by removed killed mutants; vitest coverage config unchanged and the suite passes |
| WX-06 | SATISFIED | Characterisation file green on the base (`79-characterisation-check.mjs`); `79-RED-EVIDENCE.md` shows each new check failing once; `79-pinned-check.mjs` passes |
| WX-07 | SATISFIED (spot-checked) | House-style `[no-numbering-placeholder]` passes; nothing released, published or merged by the phase (no tags or version bumps in the diff) |

No orphaned requirements: REQUIREMENTS.md maps CONF-01..06 to Phase 79 and every one is claimed.

### Anti-Patterns Found

None blocking. Review iteration 3 (`79-REVIEW.iter3.md`) is clean, and `79-SECURITY.md` records 0 open threats. The two upgrade-guide hits for the old constructor call are the deliberate uncompiled "before" fence.

### Deferred Items

None.

### Human Verification Required

None to block. One recorded, deferred manual item, not a gap: the React 19.2.4 peer-floor `Activity` check (ADR-QD-192 risk). The `Activity` behaviour is pinned by `useConfigured.test.tsx` only on the React version the repo installs.

### Not Checked

- Stryker was not re-run; `79-mutation.mjs compare` reads the committed `79-mutation-close.json` (green on the final packages tree, 92cfd986).
- `pnpm check:pr` and `pnpm spec:package` (gate 14's packed consumer, a template string only that command compiles) were not run, as instructed. The consumer's text was read, and `packages/` and `scripts/` are unchanged since the run that was green.
- React 19.2.4 peer-floor `Activity` behaviour (deferred manual item above).
- Real-browser rendering: none changes (UI hint: no), and the characterisation test pins identical render sequences.

### Gaps Summary

No gaps. Every roadmap success criterion and every CONF and WX requirement is backed by code read at HEAD and by commands re-run in this verification.

---

_Verified: 2026-11-24_
_Verifier: Claude (gsd-verifier)_

---

## Re-verification at the v1.9 close (2026-11-24)

**Staleness:** `verification.status` read `stale` at `069e202b`: three covered files changed after the report's tree (`92cfd986`), all through Phase 80 (the lens as a headless session, ADR-QD-193).

| Covered file | Changed since `92cfd986` by | What changed |
| ------------ | --------------------------- | ------------ |
| `packages/devtools/src/model/DockModel.ts` | Phase 80 | `import { makeLensSession }` (`:72`), `readonly lens: LensSession` on `DockModel` (`:224`), `const lens = makeLensSession()` (`:340`), `lens` in the returned record (`:436`): 8 added lines, none inside `configure` |
| `packages/devtools/src/react/DevtoolsDock.tsx` | Phase 80 | `lens={props.model.lens}` passed to `QuestionsPanel` (`:270`): 1 added line |
| `packages/devtools/test/model/ConfigureRule.test.ts` | Phase 80 | the nine-store fixtures become ten: `lens` is added to `storesOf`, `storeNames`, `snapshotsOf`, `heardOnEach` and `silent` (`:594`, `:607`, `:622`, `:644`, `:656`, `:670`), and CR22's title and two expectations gain `lens: 0` (`:895`, `:912`, `:930`) |

`git diff 92cfd986 HEAD` over the other sixteen covered files (the three feeds, `ExternalStore.ts`, `useConfigured.ts`, `useDockModel.ts`, `useTimeline.ts`, `useDiagnostics.ts`, `useScoped.ts`, the changeset, ADR-QD-192, `surface.tst.ts`, `ConfigureInputs.tst.ts`, `useConfigured.test.tsx`, the characterisation file, `check-package-install.mjs`) is empty. The verifier was told Phase 80's change is legitimate; the diff was read to confirm it, not assumed.

### Truths against the tree at `069e202b`

| # | Truth | Holds now? | Current evidence |
|---|-------|-----------|------------------|
| 1 | SC1 / CONF-01: first-render characterisation, plain and StrictMode, written on the base | Holds, unchanged | `79-characterisation-check.mjs`: "ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)", exit 0. The file is byte-identical to the report's tree and green in the devtools run. `DevtoolsDock.tsx`'s one added prop reaches `QuestionsPanel`, which the characterisation renders with no `lens` change to what it pins. |
| 2 | SC2 / CONF-02: the four constructors take no input; `configure` is the only way in | Holds; line numbers moved | `makeTimelineFeed` `TimelineFeed.ts:161`, `makeDiagnosticsFeed` `DiagnosticsFeed.ts:163`, `makeGatesFeed` `GatesFeed.ts:151` (unchanged); `makeDockModel` now `DockModel.ts:323` (was `:317`), still `function* (): Effect.fn.Return<DockModel, never, ...>` with no parameter. `makeLensSession()` (`:340`) is called with no argument too, so the tenth store adds no constructor input. `surface.tst.ts:307-309` pins `Parameters<typeof makeX>` as `[]` for the three feeds; a repo-wide grep for `make(TimelineFeed\|GatesFeed\|DiagnosticsFeed\|DockModel)(<non-empty>` over `packages/devtools/src`, `spec`, `scripts`, package READMEs and `apps/website/src` finds only the upgrade guide's uncompiled "before" fence (`upgrading.md:1307-1308`). |
| 3 | SC3 / CONF-03: one per-field rule (`sameFields`, `sameFieldsOrAbsent`), omitted equals `undefined`, diagnostics on/off distinct, G43 stated exception, a type pin that can fail | Holds, unchanged | `ExternalStore.ts:138` (`sameFields`) and `:154` (`sameFieldsOrAbsent`), used at `TimelineFeed.ts:200`, `DiagnosticsFeed.ts:217`, `GatesFeed.ts:284` (`&& watchFailure === undefined`, the G43 exception) and `ExternalStore.ts:197`. Normalisers: `completeTimelineInputs` `TimelineFeed.ts:109`, `completeDiagnosticsOptions` `DiagnosticsFeed.ts:148`, `completeGatesInputs` `GatesFeed.ts:88`, `completeDockInputs` `DockModel.ts:178` (was `:177`). The dock still compares nothing of its own beyond `wanted.catalogue !== before.catalogue` (`DockModel.ts:416`); the feeds apply the rule to what `feedInputsOf(wanted)` hands them. `run-tstyche`: 77 files, 415 passed, 2 skipped, 0 failed (Phase 80 added a file; the report's 76 and 414 were the tree before it). |
| 4 | SC4 / CONF-04: one package-private `useConfigured`, used by `useDockModel`, `useTimeline`, `useDiagnostics`; hidden `Activity` or StrictMode rebuild configures with current inputs | Holds, unchanged | `useConfigured.ts:19` (build and configure inside the scoped effect, then `useLayoutEffect` at `:27`); callers `useDockModel.ts:30`, `useTimeline.ts:71`, `useDiagnostics.ts:44`. None of the five hook files or `useConfigured.test.tsx` changed. `useConfigured.test.tsx` green. |
| 5 | SC5 / CONF-05, CONF-06: `UseDockModelInput` gone, `DevtoolsDockProps` is `DockModelInputs` plus host props, one mapping, gate 14, README, website, spec, ADR, changeset, upgrade guide | Holds; line numbers moved | `UseDockModelInput`: zero hits across `packages`, `scripts`, `spec` (and `apps` source; only built `dist` html mentions the feed call). `DevtoolsDock.tsx:76` `DevtoolsDockProps extends DockModelInputs { unknownParents; onInvalidate }`, spread to `useDockModel(inputs)` at `:97`. `feedInputsOf` `DockModel.ts:206` (was `:205`), called once at `configure` `:410` (was `:403`). ADR-QD-192, the changeset, the upgrade entry and `check-package-install.mjs` are unchanged. `spec/decisions/` and `spec/behaviors/28-devtools-screens.md` changed through Phase 80's own ADR and rows; ADR-QD-192 itself did not. |

### The four invariants asked about

| Invariant | Holds? | Evidence now |
|-----------|--------|--------------|
| No feed or model takes a constructor parameter | Holds | Row 2. The lens session added in Phase 80 is built bare (`DockModel.ts:340`). |
| `configure` is the only input path and leaves the lens alone | Holds | `configure` (`DockModel.ts:403-432`) names `timelineFeed`, `roles`/`spread`, `simulation.setPorts`, `gatesFeed`, `diagnosticsFeed` and `shownReading` and never `lens`. `ConfigureRule.test.ts` now counts the lens as a tenth store in `silent` (`:670`, `lens: 0`) and applies it to every no-change case (`:739`, `:766`, `:787`, `:807`) and to CR22's bare-dock count (`:912`, `:930`): a configure that touched it would fail those. The test file is 14 lines changed, all additive and for `lens`; no existing expectation moved. |
| The dock has no comparison or guard of its own | Holds | One comparison in `configure`, `wanted.catalogue !== before.catalogue` (`:416`); `DevtoolsDock.tsx` imports and uses no guard or `@qadi/react` hook (grep for `guard` and `@qadi/react` in it: no hit). |
| `useConfigured` and the first-render characterisation | Hold | Rows 1 and 4. |

### Spot-checks re-run

Run on the tree at `069e202b`, from the repo root, one command at a time, stdin closed. No Stryker, no `record`, no `pnpm check:pr`.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| The tests that hold the truths | `pnpm exec vitest run --project devtools packages/devtools/test/model/{ConfigureRule,DockModel,GatesFeed}.test.ts packages/devtools/test/react/{useConfigured,ConfigureFirstRender.characterisation,DockRegistryReads}.test.tsx` | 6 files, 141 tests passed | PASS |
| The whole devtools project | `pnpm exec vitest run --project devtools` | 85 files, 1906 tests passed (the report's 80 and 1869, plus Phase 80's) | PASS |
| First-render characterisation holds its first commit | `node .planning/phases/QD-79-.../79-characterisation-check.mjs` | "holds its first commit (cf3186d9)", exit 0 | PASS |
| Pinned tests hold their assertions | `node .../79-pinned-check.mjs` | "15 tests hold their assertions", exit 0 | PASS |
| The mutation script's own self-test | `node .../79-mutation.mjs --self-test` | "32 passed", exit 0 | PASS |
| Type pins in both tstyche passes | `node scripts/run-tstyche.mjs` | 77 files, 415 passed, 2 skipped, 0 failed | PASS |
| House style | `node scripts/check-house-style.mjs` | `604 file(s) clean (3 declared switch(es), 77 type-test file(s))` | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | exit 0, `942 export(s) documented across 9 package(s)` (the same 942 the report recorded) | PASS |

Not re-run: `79-mutation.mjs compare` against a fresh Stryker run (Stryker is not run here; the committed `79-mutation-close.json` is for `92cfd986`, and Phase 80 has its own mutation record), `pnpm check:pr` and `pnpm spec:package` (gate 14's packed consumer). `check-package-install.mjs` and every file it reads for the three feed signatures are unchanged since the run that was green.

### Evidence that moved

Only line numbers, in `DockModel.ts`, because Phase 80 inserted lines above them: `makeDockModel` `:317` to `:323`, `completeDockInputs` `:177` to `:178`, `feedInputsOf` `:205` to `:206`, its call in `configure` `:403` to `:410`. No truth's claim changed. Counts moved with Phase 80: devtools run 80 files and 1869 tests to 85 and 1906, tstyche 76 files and 414 tests to 77 and 415, house style 596 files and 76 type-test files to 604 and 77.

**Digest:** `covered_digest` is refreshed by `gsd-tools query verification.fingerprint` over the same implementation files; the frontmatter's `covered_files` is that command's output verbatim.

**Verdict:** passed. All five truths still hold; no gap.
