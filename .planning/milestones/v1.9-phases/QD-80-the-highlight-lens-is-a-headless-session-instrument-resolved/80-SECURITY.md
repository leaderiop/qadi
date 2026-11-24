---
phase: "QD-80"
slug: "the-highlight-lens-is-a-headless-session-instrument-resolved"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 29
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-24"
---

# Phase QD-80 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| The host page's clicks → the dock's capture `click` listener | While the reader is picking, a document-capture listener decides whether a click is consumed (`preventDefault` and `stopPropagation`) before the page's own handlers see it | A click event; the guard id found for it |
| The dock → the host document | The dock adds three document listeners while picking and draws overlays over the page; unmount, `Escape`, a pick and a highlight all end the mode | `pointermove`, `click` (capture) and `keydown` listeners; `data-qadi-lens` overlay elements |
| `@qadi/react`'s public types → a consumer's code | `QadiContextValue` loses `instrument`; a consumer that read it fails to compile | The context value's keys |
| The provider → guard registration | Whether a guard registers is decided by a writer resolved once from the `instrument` prop and kept off the public context | The writer; the gate registry's list of what a user may do |
| Held tests and checks → the change | The characterisation files, the four pinned files, the mutation base and the check scripts are what a reviewer trusts that the change preserved behaviour | Test text; mutation scores |
| Spec records → readers and gates | ADR-QD-193, CCR-QD-472, BEH-QD-736 to 740, INV-QD-405 and 406 and the amendments state what the code does | Spec text and reserved numbers |
| The published packages → consumers | A Breaking change to `@qadi/react` must be released as one, with an upgrade path | Changesets; the upgrade guide |
| The phase's commits and working tree → the branch and the release | What is committed, under whose attribution, and what is released or pushed | Commits, trailers, manifests, local configuration |

---

## Threat Register

Disposition counts: 28 mitigate, 1 accept (T-80-24). `T-80-SC` is the one row each of the 13 plans carries; it is counted once.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-80-SC | Tampering | dependency installs | high | mitigate | `git diff --name-only 55c79a96 HEAD` lists no `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or `.npmrc`. `git diff --stat` over every `package.json` (root, `packages/*`, `apps/*`, `examples/*`) is empty, and the lockfile blob is `6b2f25b9` at the base and in the working tree. `fast-check`, which the property test imports (`LensSession.test.ts:12`), was already a devtools dev dependency at the base (`packages/devtools/package.json:65`). No stryker, vitest, tsconfig, `scripts/`, `.oxlintrc.json`, `.github/` or `AGENTS.md` path changed. The only untracked `package.json` is `.codex/hooks/package.json`, local tooling outside the phase | closed |
| T-80-01 | Tampering | `80-mutation-base.json`, base facts | medium | mitigate | `phase_base` is `55c79a96`, which equals `54a8b9cb` on every path outside `.planning/` (empty `git diff --stat`). The record's `dock` group `head` is `55c79a96` (`80-mutation-base.json`), `a4d5d860` is the only commit since the base to touch it and holds exactly the record and `80-mutation.mjs`, and `80-mutation.mjs --self-test` prints 28 passed | closed |
| T-80-02 | Repudiation | base facts, the `instrument` search | low | mitigate | `80-01-SUMMARY.md:72-73` records `house-style: 596 file(s)` and `api-surface: 942`. At HEAD `check-api-surface.mjs` prints 942 and `check-house-style.mjs` prints 604 files clean, the 8 more being the phase's own `LensSession.ts` and seven new test files. A `git grep` over tracked code finds no reader of `QadiContextValue.instrument` (the one D-22 precondition). The scratch `base-facts.txt` and `d22-search.txt` are not retained, so that part rests on the summary plus this re-run | closed |
| T-80-03 | Tampering | `80-check.mjs` | medium | mitigate | `80-check.mjs --self-test` prints 113 passed. `80-RED-EVIDENCE.md:11-16` records each run mode failing once on a planted input (commit, unchanged, seen-failing, scan-ids, scan-forbidden, branch). The scan modes run clean at HEAD (`scan-forbidden`, `scan-ids`, `trailers`: 38 plan commits, each with one Claude trailer) | closed |
| T-80-04 | Tampering | `Lens.dock.characterisation.test.tsx` | medium | mitigate | `80-characterisation-check.mjs --all-flipped` at HEAD: "holds its first commit (7546f54e), 4 of 4 flips applied"; `--red-recorded` exits 0 (every flip has its `red on the base` line, `80-RED-EVIDENCE.md:25-28`); `--self-test` 24 passed | closed |
| T-80-05 | Denial of service | the capture `click` listener | medium | mitigate | The swallowed-click and passed-click cells are preserved, not flipped: `Lens.dock.characterisation.test.tsx:184` ("a pick on a guard swallows its click and ends picking") and `:202` ("a click over no guard goes through and picking stays on"), `:277` (a switch to the log while picking leaves no listener), and the held `QuestionsPanel.gates.test.tsx:338`, `:363`, `:399`. All pass at HEAD (devtools 9 files, 170 tests) and the check holds the files | closed |
| T-80-06 | Spoofing | a held pick and a remounted guard | medium | mitigate | `GateId.remount.test.tsx` ("a guard unmounted and mounted again in the same position registers under a new id") decided the branch as `new`, so the pick is held by id and no `retain(ids)` was needed (`80-03-SUMMARY.md:20, 83-84`). The held cell `Lens.dock.characterisation.test.tsx:256` ("a pick whose guard unmounted marks no row, and the guard mounted in its place is not marked") pins the outcome. Both pass at HEAD | closed |
| T-80-07 | Tampering | `InstrumentToggle.characterisation.test.tsx` | low | mitigate | Held to its first commit (2cca1f46) with one declared multi-line flip, "1 of 1 flips applied" (`80-characterisation-check.mjs --all-flipped`). The registration cell (`:40`, "a Can registers when instrument is turned on and unregisters when it is turned off") is outside the flip and passes, so removing the field cannot silently stop guards registering. Red on the base: `80-RED-EVIDENCE.md:39` | closed |
| T-80-08 | Denial of service | document listeners while picking | medium | mitigate | `Lens.dock.test.tsx:119` ("entering picking adds three document listeners, and a change in the listed guards while picking adds none") asserts exactly `["click", "keydown", "pointermove"]` added and none removed, before and after a guard registers while picking; it failed on the base (`80-RED-EVIDENCE.md:45-49`). The effect is keyed `[picking, lens, questions]` and reads the guard list at event time (`useLens.ts:64-111`); `:197` pins that a late guard is found. The leave-while-picking cell is `Lens.dock.characterisation.test.tsx:277`. All pass | closed |
| T-80-09 | Tampering | the four pinned test files | medium | mitigate | `80-pinned-check.mjs --all-applied`: "4 files hold their base text, 4 of 4 declared edits applied"; `--self-test` 10 passed. The one in-region edit (the Escape assertion) states its `inRegion` reason | closed |
| T-80-10 | Denial of service | `choose` | medium | mitigate | `LensSession.ts:105-114` (`chosen`) returns the same snapshot for `Idle` and for `Picking` over `undefined`, and `:167-175` answers `false` for `next === current`, so only a move out of picking over a guard returns true. `LensSession.test.ts:107` pins idle false, over-nothing false, over-guard true, and a second choose false; the property at `:378` pins `answer === changed` for every `choose`. `80-mutation.mjs compare` exit 0: `LensSession.ts` 52/52, 0 Survived, 0 NoCoverage. The 22 Ignored mutants are module-scope static tables (`ignoreStatic: true`, `stryker.devtools.mjs:45`), and a by-hand run with `ignoreStatic: false` killed 74/74 (`80-12-SUMMARY.md:63-76`) | closed |
| T-80-11 | Tampering | the snapshot union | low | mitigate | `LensSession.ts:32-38`: `Idle` carries `picked`, `Picking` carries at most `readonly [] \| readonly [string]` and no `picked`. The FastCheck property `LensSession.test.ts:361` ("every sequence of commands keeps picking free of a pick and draws at most one guard while picking") passes; INV-QD-405 states it | closed |
| T-80-12 | Tampering | `DockModel.configure` and the lens | low | mitigate | `DockModel.ts:340` builds the session and `:436` returns it; no `configure` path writes it. `ConfigureRule.test.ts:660-670` (`silent`, `lens: 0`) is compared at `:739, :766, :787, :807`, and CR22 (`:895`) subscribes to every store including `lens`. `DockModel.ts` mutation 69/69 against base 69/69, ignored 12 against 12 (0 new) | closed |
| T-80-13 | Repudiation | the store count | low | mitigate | `DockModel.test.ts:1795-1818` lists the ten members including `lens` and fails at nine or eleven; `:1821` pins the bare model idle. BEH-QD-700 (`28-devtools-screens.md:1100, 1122`), INV-QD-390 (`invariants.md:4515-4517`) and ADR-QD-185 (`:177-178`) say ten, and a grep finds no remaining "nine of them" in those three | closed |
| T-80-14 | Denial of service | the capture `click` listener | high | mitigate | The listener exists only while picking: `useLens.ts:65` (`if (!picking) return;`), added at `:102-104`. The click is consumed only when `lens.choose(id)` answers true (`useLens.ts:83-91`): `id` is `undefined` unless `gateIdOfClick` found a guard (`Lens.ts:207-219`, `:80`), and `choose` is false for `Idle` and for `Picking` over `undefined` (`LensSession.ts:105-114, :170`), so the dock's own controls and any unguarded control keep their clicks. The `try/finally` leaves `consumed = true` only when `choose` throws, and `choose` throws only from a subscriber, after the pick has been held (`ExternalStore.ts` `notify`: `current = next` first; `LensSession.ts:172-173`); `gateIdOfClick` runs outside the `try`, so a failure there passes the click through. Pinned by `LensSession.test.ts:107`, the held cells `QuestionsPanel.gates.test.tsx:338, :363`, `Lens.dock.characterisation.test.tsx:184, :202`, `Lens.dock.test.tsx:169` (default action cancelled on a guard, kept elsewhere) and `Lens.adapter.test.tsx:73` (a throwing subscriber), each red before its fix (`80-RED-EVIDENCE.md:134-151, 209-215`) | closed |
| T-80-15 | Denial of service | listeners and overlays after unmount | medium | mitigate | `useLens.ts:106-110` removes all three listeners with the flags they were added with (`click` with `true`, `:103` and `:108`); the exit effect `:113-118` calls `lens.cancel()` on unmount, keyed on the session alone; the draw effect cleanup `:57-59` and the empty branch `:50-52` call `clearLens`. Pinned by `QuestionsPanel.gates.test.tsx:399` ("stops listening when the panel unmounts"), `:257` ("removes its overlays when the panel unmounts"), both held unedited, and `Lens.dock.characterisation.test.tsx:277`. `Lens.adapter.test.tsx:138, :160` pin one subscription to each store while mounted and none after | closed |
| T-80-16 | Tampering | the held panel and lens tests | medium | mitigate | `80-pinned-check.mjs --all-applied` and `80-characterisation-check.mjs --all-flipped` both exit 0 at HEAD, and the `QuestionsPanel.gates.test.tsx` and `Lens.test.ts` cells named above pass | closed |
| T-80-17 | Elevation of privilege | `QadiContextValue` | medium | mitigate | `QadiProvider.tsx:51-59` declares `atoms`, `registry` and `gates` only, and `:304-307` builds exactly those. The writer is on the package-private `GateScopeContext` (`:310, :313`; `useGate.ts` and `GateWriter.ts` are not in `packages/react/src/index.ts`). `QadiProvider.tst.ts:17` pins `keyof QadiContextValue` as `"atoms" \| "registry" \| "gates"` and `:23` a `@ts-expect-error` on `instrument`; `pnpm test:tstyche` passes (77 files, 415 passed, 2 skipped). A tracked-code search finds no reader of the removed field | closed |
| T-80-18 | Information disclosure | `instrument` registration | low | mitigate | The prop is unchanged (`QadiProvider.tsx:193`, `instrument = false`) and the writer is resolved once, `undefined` when off (`:203-206`), so off still means absent; the production signal (`:267-277`) and the unwritable-registry signal (`:279-283`) are unchanged. `InstrumentToggle.characterisation.test.tsx:40` is held and passes. `git diff` over `packages/react/src` touches `QadiProvider.tsx` only, with the field, its comment and the memo as the changed lines | closed |
| T-80-19 | Repudiation | ADR-QD-193 and the amended ADRs | low | mitigate | The ADR-QD-047, 111 and 185 diffs remove only their header rows (`Revision`, `Status`, `Change History`) and add dated amendments below; `spec-revise.mjs --check` exits 0 and `pnpm spec:verify:strict` prints PASS 21, FAIL 0, SKIP 0 | closed |
| T-80-20 | Tampering | reserved numbers | low | mitigate | The highest ids in the phase's added lines are ADR-QD-193, CCR-QD-472, BEH-QD-740 and INV-QD-406; the base maxima were 192, 471, 735 and 404. No `-NEXT`, `T-80-`, `D-80-` or `QD-80` token is in an added line of `packages`, `spec`, `apps` or `.changeset`, and `80-check.mjs scan-ids` is clean | closed |
| T-80-21 | Repudiation | BEH-QD-700, BEH-QD-735, INV-QD-390 | low | mitigate | The ten counts are restated beside the store-list test and CR22 that pin them (`28-devtools-screens.md:1100, 1122, 3237`; `invariants.md:4517`; ADR-QD-193 `:223`) and `pnpm spec:verify:strict` passes | closed |
| T-80-22 | Tampering | the devtools-spec drafts | low | mitigate | `01-shell.md` and `02-screens.md` change 12/2 and 7/4 lines; the removed lines are the header rows and one reflowed "built behind `instrument`" sentence, and the dated notes are appended. `pnpm spec:claims` prints `devtools-claims: 8 claim(s) registered across 6 file(s)` | closed |
| T-80-23 | Repudiation | `@qadi/react`'s release | medium | mitigate | `.changeset/react-context-value-drops-instrument.md` is `"@qadi/react": minor` and opens `**Breaking.**`; the upgrade section `## 0.13` is in `upgrading.md`; `check-website-doc-examples.mjs` prints 76 blocks compile (75 at Phase 79's close, so base + 1) and `check-doc-examples.mjs` 119. Exactly two changesets are added (`A` for both, no `D`), none consumed | closed |
| T-80-24 | Information disclosure | the upgrade fence | low | accept | Accepted (AR-80-01). The After fence shows the host's own flag and `gates.instances()`, the public read side of `GateRegistry`; it names no package-private module and no writer | closed |
| T-80-25 | Tampering | `80-mutation-close.json` | medium | mitigate | Both groups (`dock`, `lens`) are recorded on one head, `71b7b983`, and `git diff --stat 71b7b983 HEAD -- packages spec scripts apps .changeset` is empty. `80-mutation.mjs compare` exits 0 at HEAD: `DockModel.ts` 69/69 to 69/69 (cross-multiplied, `80-mutation.mjs:147`), `LensSession.ts` 52/52, "no file has an open or Ignored mutant its base did not have". The base record was touched once (`a4d5d860`). A survivor met in the first close was closed by a source change and a from-scratch re-close, not a re-baseline (`80-12-SUMMARY.md:77-82`). Stryker was not re-run by this audit | closed |
| T-80-26 | Tampering | the close scans | medium | mitigate | `80-check.mjs scan-forbidden` and `scan-ids` read the diff from `phase_base` and are clean. `git diff --stat 55c79a96 HEAD` over `AGENTS.md`, `scripts/`, `.oxlintrc.json`, `stryker*.mjs`, `vitest.config.ts`, `tsconfig*.json` and `.github/` is empty, so no rule was narrowed. `check-house-style.mjs`: 604 files clean | closed |
| T-80-27 | Repudiation | plan commits | low | mitigate | 67 commits since the base. All 34 that touch a path outside `.planning/` carry exactly one Claude trailer: 16 match `(80-NN)` and 18 are review-fix commits with scope `(80)`. 17 of the 18 are named by hash in an `80-REVIEW-FIX` report; `e31a9820` (the devtools changeset names the two review behaviour changes) is the follow-up the iteration 1 report's "For the orchestrator" note asked for and has its trailer. The 11 `.planning/`-only commits without a trailer are review and validation records that touch nothing shipped. `80-check.mjs trailers`: 38 plan commits, each with one trailer | closed |
| T-80-28 | Information disclosure | local configuration files | medium | mitigate | `git log --name-only 55c79a96..HEAD` lists no `.agents/`, `.codex/`, `.planning/config.json`, `.planning/state.json` or `*REVIEW*.iter*.md` path, `git ls-files .agents .codex` is empty, nothing is staged, and `.planning/config.json` is modified but unstaged | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Release/publish:** the two changesets `.changeset/devtools-lens-is-a-headless-session.md` (`@qadi/devtools`: patch) and `.changeset/react-context-value-drops-instrument.md` (`@qadi/react`: minor, Breaking) are the only ones added, none deleted, and both are unconsumed. No tag contains `55c79a96` or points at HEAD, no `CHANGELOG` or `package.json` changed, and the branch `arch-wave-14` has no upstream and no `refs/remotes/origin/arch-wave-14`. Nothing is released, tagged or pushed.

**Section 13 (`@qadi/react` calls no DOM API):** a search of `packages/react/src` for `document`, `window`, `globalThis`, `querySelector`, `addEventListener` and `scrollIntoView` outside comments finds nothing. In `@qadi/devtools`, `LensSession.ts` and `DockModel.ts` have no DOM reference; every `document` reference in `useLens.ts` is inside an effect body, a handler or a cleanup (`:51, :55, :58, :72, :80, :102-109`), `Lens.ts` takes a `Document` argument and reads no global, and the one `scrollIntoView` (`QuestionsPanel.tsx:279`) is a ref call inside `useEffect`.

**Evidence run at HEAD c9701c29** (a `.planning/` only commit over `2eff29ae`; `packages`, `spec`, `scripts`, `apps` and `.changeset` are identical to `71b7b983`): `pnpm exec vitest run --project devtools` on the nine lens and model test files, 170 tests passed; `--project react` on `InstrumentToggle.characterisation` and `GateId.remount`, 3 passed; `pnpm test:tstyche` 77 files, 415 passed, 2 skipped; `80-characterisation-check.mjs --all-flipped` (4 of 4 and 1 of 1), `--red-recorded` and `--self-test` (24); `80-pinned-check.mjs --all-applied` (4 of 4) and `--self-test` (10); `80-mutation.mjs compare` exit 0 and `--self-test` 28; `80-check.mjs --self-test` 113, `scan-forbidden`, `scan-ids` and `trailers` clean; `pnpm spec:verify:strict` 21 pass, 0 fail; `spec-revise.mjs --check` exit 0; `pnpm spec:claims` 8 claims; `check-house-style.mjs` 604 files clean; `check-api-surface.mjs` 942; `check-doc-examples.mjs` 119; `check-website-doc-examples.mjs` 76. Not re-run by this audit: Stryker (the close record is taken as measured on `71b7b983`), `pnpm check:pr`, `pnpm spec:package` (gate 14), and the React 19.2.4 peer-floor matrix, which the validation record lists as manual-only and ADR-QD-193 records as a risk.

**Unregistered flags:** none. The `## Threat Flags` sections that exist (80-01 to 80-05, 80-09, 80-12) read None; 80-06, 80-07, 80-08, 80-10, 80-11 and 80-13 carry no such section. Three review fixes landed after the threat model and touch its boundaries, and each maps to a registered threat rather than opening a new one: the `try/finally` in the click handler (WR-03) and `gateIdOfClick` placing a click with no pointer by its element (IN-03, `Lens.ts:207-219`) sit under T-80-14 and T-80-10, because a click is still consumed only for a found guard while picking; the reveal drop in `cancel` and `highlight` (IN-05) and the single store subscriptions (IN-06) sit under T-80-15. One consequence is worth the reader's attention and is not a gap: a click with `detail` 0 that a page script dispatches on a guarded element while picking is now placed by that element and consumed, where it was placed by the page's corner. It stays inside T-80-14's rule.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-80-01 | T-80-24 | The 0.13 upgrade section's After fence shows a host passing its own flag to `QadiProvider` and to a component, and a component reading `gates.instances()` from `useQadiContext`. It names no package-private module and no internal writer, only exports `@qadi/react` already documents | Plan 80-11 threat register (accept) | 2026-11-24 |

The one accepted risk is low severity and below the `high` block threshold.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-24 | 29 | 29 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-24
