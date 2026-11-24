---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
verified: 2026-11-24T19:00:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - ".changeset/devtools-lens-is-a-headless-session.md"
  - ".changeset/react-context-value-drops-instrument.md"
  - "apps/website/src/content/docs/docs/reference/upgrading.md"
  - "packages/devtools/src/model/DockModel.ts"
  - "packages/devtools/src/model/LensSession.ts"
  - "packages/devtools/src/react/DevtoolsDock.tsx"
  - "packages/devtools/src/react/Lens.ts"
  - "packages/devtools/src/react/QuestionsPanel.tsx"
  - "packages/devtools/src/react/useLens.ts"
  - "packages/devtools/test/model/ConfigureRule.test.ts"
  - "packages/devtools/test/model/DockModel.test.ts"
  - "packages/devtools/test/model/LensSession.test.ts"
  - "packages/devtools/test/react/Lens.adapter.test.tsx"
  - "packages/devtools/test/react/Lens.click.test.ts"
  - "packages/devtools/test/react/Lens.dock.characterisation.test.tsx"
  - "packages/devtools/test/react/Lens.dock.test.tsx"
  - "packages/devtools/test/react/QuestionsPanel.gates.test.tsx"
  - "packages/devtools/test/react/questionsPanelInput.ts"
  - "packages/react/src/QadiProvider.tsx"
  - "packages/react/test/GateId.remount.test.tsx"
  - "packages/react/test/InstrumentToggle.characterisation.test.tsx"
  - "packages/react/test/QadiProvider.tst.ts"
  - "spec/decisions/047-a-headless-devtools-model.md"
  - "spec/decisions/111-a-gate-writer-is-resolved-once-by-its-provider.md"
  - "spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md"
  - "spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md"
  - "spec/decisions/index.yaml"
  - "spec/devtools-spec/01-shell.md"
  - "spec/devtools-spec/02-screens.md"
  - "spec/overview.md"
covered_digest: "v4:sha256:36d083bf9f909c547712e9e132f4dbc7b2ef2606bb85a82664b2e5dea294d469"
behavior_unverified: 0
overrides_applied: 0
---

# Phase QD-80: The highlight lens is a headless session; `instrument` resolved - Verification Report

**Phase Goal:** The highlight lens's rules live in a headless `LensSession` that the dock model owns as its tenth store, so they are tested and mutation-gated without the DOM and `useLens` is only the document adapter, and the unread public `QadiContextValue.instrument` is removed or its reason to stay is recorded.
**Verified:** 2026-11-24, at HEAD `28a3426a` (commits after `2eff29ae` are `.planning` documents only).
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP success criterion) | Status | Evidence |
|---|---|---|---|
| 1 | A package-private `LensSession` in `model/` holds `highlighted`, `picking`, `picked`, with toggle, hover, choose (says whether the click is consumed), cancel and highlight (no `clear`), each rule pinned by plain calls under the mutation gate | VERIFIED | `packages/devtools/src/model/LensSession.ts` (193 lines): imports only `effect/Data`, `effect/Match` and `./ExternalStore.ts`, no `react`, no `document`/`window`. `LensSnapshot` is a tagged union `Idle {highlighted, picked}` / `Picking {highlighted}`. `LensSession` has `toggle`, `hover`, `choose: (id) => boolean`, `cancel`, `highlight` and a one-shot `takeReveal`; there is no `clear`. A command that moves nothing publishes nothing (`move` compares to the held snapshot). Not in the package barrel (not exported from `@qadi/devtools` entry points). `test/model/LensSession.test.ts` runs headless. Mutation close: `80-mutation.mjs compare` exit 0, LensSession.ts 52/52 killed (22 Ignored, all 74 killed with `ignoreStatic false`). |
| 2 | The dock model owns the session as its tenth store; BEH-QD-700, INV-QD-390, ADR-QD-185 and the store-list test move together; `DockModel.ts`'s mutation score does not fall | VERIFIED | `DockModel.ts`: `import { makeLensSession }` (:72), `readonly lens: LensSession` on `DockModel` (:224), `const lens = makeLensSession()` (:340), returned in the model (:436); `configure` (:365-408) never touches `lens`. BEH-QD-700 now lists `... services` and `lens` and says "ten of them". ADR-QD-185 status carries "amended 2026-11-24 (the lens is the tenth store ... ADR-QD-193)". `DockModel.test.ts:1816` lists `"lens"` in the store-list test. `80-mutation.mjs compare`: `DockModel.ts 69/69 -> 69/69, survived 0 -> 0, ignored 12 -> 12 (0 new)`. |
| 3 | `useLens` keeps only the document listeners and `drawLens`/`clearLens`; the click is swallowed synchronously in the capture listener; listeners are not re-added on every instance change; `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` keep passing; any behaviour change preceded by a characterisation test | VERIFIED | `react/useLens.ts` (121 lines) holds no `useState`: it reads `useStoreSnapshot(lens)`, draws via `boxesOf`/`drawLens`/`clearLens`, and the three listeners (`pointermove` forwards `lens.hover(gateIdAt(...))`; `click` registered with capture `true` calls `lens.choose(id)` and does `preventDefault`/`stopPropagation` in a `finally` when consumed, synchronously; `keydown` Escape calls `lens.cancel()`). The listener effect is keyed `[picking, lens, questions]` and reads `questions.getSnapshot().instances` at event time, so a guards change adds no listener. The unmount exit is its own effect on `[lens]` calling `lens.cancel()`. `80-characterisation-check.mjs --all-flipped`: both characterisation files hold their first commit, 5 of 5 declared flips applied; `--red-recorded`: every flip has its RED line. Vitest run from the repo root over `packages/devtools/test/{model,react}` and the react provider tests: 45 files, 578 tests, all pass. |
| 4 | Fate of `picking`/`picked` across a tab switch, and of a picked id whose guard has gone, decided against `01-shell.md:72`, BEH-QD-234 and INV-QD-107, pinned by tests, recorded in ADR-QD-193 | VERIFIED | ADR-QD-193 decision 7: "A tab switch keeps the pick and ends picking and the drawing" (the unmount cleanup is the exit; the model adds no tab rule); the pick is held by id so a gone guard has no row and marks nothing; `resolveHeld` deliberately not reused with two stated reasons (:158-160). The behaviour-change table row (:194) names `Lens.dock.characterisation.test.tsx` "a pick, then a switch to the log and back" (base) and `Lens.dock.test.tsx` (after). Both files exist and pass. `spec/devtools-spec/01-shell.md` and `02-screens.md` updated; `devtools-claims` gate green. |
| 5 | After a repo-wide search `QadiContextValue.instrument` is removed with a Breaking `@qadi/react` changeset, upgrade-guide entry, `spec/overview.md` edit and dated ADR-QD-111 amendment (or kept with a first reader) | VERIFIED | `packages/react/src/QadiProvider.tsx:51-58`: `QadiContextValue` is `atoms`, `registry`, `gates`; the memo is `useMemo(() => ({ atoms, registry, gates }), [atoms, registry, gates])`; the provider's `instrument` prop and the resolved writer are unchanged (`:193-283`). A repo-wide grep (`packages`, `examples`, `apps/website`, `spec`) finds no reader of `.instrument` on a context value. `QadiProvider.tst.ts:14` pins `keyof QadiContextValue` to `"atoms" | "registry" | "gates"` with an `.instrument` negative pin and positive twin. `.changeset/react-context-value-drops-instrument.md` is `"@qadi/react": minor`, marked **Breaking**. `apps/website/.../upgrading.md` gains "0.13: `QadiContextValue` no longer carries `instrument`" with before/after code. ADR-QD-111 status: "amended 2026-11-24 (ADR-QD-193)". `spec/overview.md` edited. |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/devtools/src/model/LensSession.ts` | headless session | VERIFIED | substantive, DOM/React-free; wired from `DockModel.ts`, consumed by `useLens.ts` and `QuestionsPanel.tsx` |
| `packages/devtools/src/model/DockModel.ts` | `lens` as tenth store, untouched by `configure` | VERIFIED | see truth 2 |
| `packages/devtools/src/react/useLens.ts` | document adapter only | VERIFIED | see truth 3 |
| `packages/devtools/src/react/QuestionsPanel.tsx` | takes `lens` prop, one subscription | VERIFIED | `lens: LensSession` prop (:70); `useLens(lens, questions, snapshot.instances)` returns the one snapshot passed down as `LensView`; rows call `lens.session.highlight`, `toggle` and `pickedOf` |
| `packages/devtools/src/react/DevtoolsDock.tsx` | passes `model.lens` | VERIFIED | `:270 lens={props.model.lens}` |
| `packages/react/src/QadiProvider.tsx` | no `instrument` on the context value | VERIFIED | see truth 5 |
| `.changeset/devtools-lens-is-a-headless-session.md` | devtools patch | VERIFIED | `@qadi/devtools: patch`, lists the seven behaviour changes |
| `.changeset/react-context-value-drops-instrument.md` | react Breaking minor | VERIFIED | `@qadi/react: minor`, Breaking |
| `spec/decisions/193-...md` | ADR-QD-193 | VERIFIED | 283 lines, reserved number only |

Exactly two changesets were added since the phase base (`git diff --name-only 55c79a96 HEAD -- .changeset`: those two files).

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `DevtoolsDock.tsx` | `DockModel.lens` | `lens={props.model.lens}` | WIRED | |
| `QuestionsPanel.tsx` | `useLens` | `useLens(lens, questions, snapshot.instances)` | WIRED | |
| `useLens` | `LensSession` | `hover`, `choose`, `cancel` in listeners, `cancel` on unmount | WIRED | |
| `DockModel.configure` | `lens` | none | VERIFIED ABSENT | the model's `configure` references `lens` nowhere |
| `QadiProvider` | context value | `{ atoms, registry, gates }` | WIRED | writer stays on `GateScopeContext` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `useLens.ts` overlay | `snapshot.highlighted` | `LensSession` store (`makeExternalStore`) driven by `hover`/`highlight`/`choose` | yes | FLOWING |
| `QuestionsPanel.tsx` pick marker | `pickedOf(lens.snapshot)` | the same snapshot | yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Lens, dock, panel and provider tests | `npx vitest run packages/devtools/test/model/LensSession.test.ts packages/devtools/test/model/DockModel packages/devtools/test/model/DockSession.test.ts packages/devtools/test/react packages/react/test/InstrumentToggle packages/react/test/QadiProvider` (repo root) | 45 files, 578 tests passed | PASS |
| Characterisation held to first commit | `node <phase>/80-characterisation-check.mjs --all-flipped` and `--red-recorded` | 4 of 4 and 1 of 1 flips applied; every flip has its RED line | PASS |
| Pinned panel/lens tests unchanged except declared edits | `node <phase>/80-pinned-check.mjs --all-applied` | 4 files hold base text, 4 of 4 declared edits applied | PASS |
| Mutation scores | `node <phase>/80-mutation.mjs compare` | DockModel 69/69 -> 69/69 (0 new Ignored); LensSession 52/52, exit 0 | PASS |
| No ids or phase wording, no forbidden forms, trailers | `80-check.mjs scan-ids`, `scan-forbidden`, `trailers`, `--self-test` | clean; 38 plan commits each with one trailer; 113 self-tests | PASS |

Not re-run by me (taken from the orchestrator's measurement at `2eff29ae`, no source change since): `pnpm check:pr` exit 0 (6550 tests, coverage 99.67/98.69/99.6/99.83, BDD 568, example 43) and `pnpm spec:package` exit 0. I re-ran these gate scripts at HEAD: `check-house-style` (604 files clean, 3 declared switches), `check-api-surface` (942 exports documented), `check-doc-examples` (119 blocks compile), `check-dod-table`, `check-devtools-claims` (8 claims registered); all exit 0.

### Probe Execution

SKIPPED: no `probe-*.sh` is declared by the phase.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| LENS-01 | `LensSession` with the five transitions, pinned headless | SATISFIED | truth 1 |
| LENS-02 | tenth store; BEH-700, INV-390, ADR-185, store-list test; mutation score not down | SATISFIED | truth 2 |
| LENS-03 | `useLens` is the adapter; capture-phase synchronous swallow; stable listeners | SATISFIED | truth 3 |
| LENS-04 | tab switch and gone-guard decided, pinned, in ADR-QD-193 | SATISFIED | truth 4 |
| LENS-05 | `instrument` removed with changeset, upgrade guide, overview, ADR-QD-111 amendment | SATISFIED | truth 5 |
| WX-01 | `pnpm check:pr` green | SATISFIED | orchestrator run, exit 0; the gate scripts above re-run green |
| WX-02 | only reserved numbers | SATISFIED | the reservation file is CCR 472, ADR 193, BEH 740, INV 406; a search of `spec` and `packages` finds no ADR-QD-194+, CCR-QD-473+, BEH-QD-741+ or INV-QD-407+; records exist for ADR-QD-193, CCR-QD-472, BEH-QD-736..740, INV-QD-405..406 (INV-QD-390 amended) |
| WX-03 | overview names added/dropped exports; gate 14 | SATISFIED | `check-api-surface` green; `spec:package` exit 0 per orchestrator (9 packages, 527 runtime exports) |
| WX-04 | no forbidden forms | SATISFIED | `80-check.mjs scan-forbidden` clean; `let armed` in `makeLensSession` is function-scoped, not module-scope; house-style gate clean |
| WX-05 | coverage held; mutation score of touched files not down | SATISFIED | coverage per orchestrator; `80-mutation.mjs compare` exit 0 |
| WX-06 | characterisation before change; every new check seen failing | SATISFIED | `--red-recorded`, `80-RED-EVIDENCE.md`, `seen-failing` self-test |
| WX-07 | no D-numbers or phase numbers in shipped text; nothing released | SATISFIED | `scan-ids` clean; only two changesets added, no `package.json` version change, no tag; version-packages PR not merged |

No orphaned requirements: REQUIREMENTS.md maps LENS-01..05 and WX-01..07 to Phase 80 and all are claimed by the plans.

### Anti-Patterns Found

None. The `scan-forbidden` and house-style gates are clean; no `TBD`/`FIXME`/`XXX` markers were introduced by the phase (scan-ids/forbidden cover added lines). The module-scope `NOTHING`/`IDLE` constants in `LensSession.ts` are immutable `const`s.

### Human Verification Required

None required for the phase goal. The behaviours are pinned by DOM tests (happy-dom) and headless tests. A manual pass in a real browser (a keyboard-initiated click while picking, pick-then-tab-round-trip scroll) would be a courtesy, not a gate; ADR-QD-193 and the review iterations already record this.

### Gaps Summary

No gaps. Each success criterion was checked against the source, not the summaries: the session has no DOM or React import; the dock model lists `lens` as its tenth store and `configure` never touches it; `useLens` holds no rule and no `useState`; `QadiContextValue` has no `instrument`; ADR-QD-193, CCR-QD-472, BEH-QD-736..740 and INV-QD-405..406 exist with reserved ids only; exactly two changesets were added; nothing was released.

---

_Verified: 2026-11-24_
_Verifier: Claude (gsd-verifier)_
