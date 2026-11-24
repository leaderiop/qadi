---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
verified: 2026-11-24T15:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".changeset/devtools-feeds-take-inputs-through-configure.md"
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
covered_digest: "v4:sha256:a8038197fe510b18830dc57c138fd95fda761ce55ae07afdee1f8bf101c89154"
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
