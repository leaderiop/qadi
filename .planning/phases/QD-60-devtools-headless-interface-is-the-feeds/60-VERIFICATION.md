---
phase: QD-60-devtools-headless-interface-is-the-feeds
verified: 2026-11-19T17:00:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .changeset/devtools-headless-interface-is-the-feeds.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-01-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-01-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-02-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-02-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-03-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-03-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-04-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-04-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-05-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-05-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-06-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-06-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-07-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-07-SUMMARY.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-08-PLAN.md
  - .planning/phases/QD-60-devtools-headless-interface-is-the-feeds/60-08-SUMMARY.md
  - packages/devtools/README.md
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/DiagnosticsStore.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/react/index.ts
  - packages/devtools/test/surface.test.ts
  - packages/devtools/test/surface.tst.ts
  - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
covered_digest: "v4:sha256:760c25b51bc4bd825a5943682d69a8f76f5f759b5c4eeb1506dd9688ed229f63"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 60: Devtools' headless interface is the feeds Verification Report

**Phase Goal:** A headless devtools consumer gets the timeline and diagnostics feeds (and the gate feed, if the user chooses) from the package root, instead of pairing, forking, superseding and watching `makeTimelineStore`/`runSource` and `makeDiagnosticsStore`/`runDiagnostics` itself.
**Verified:** 2026-11-19
**Status:** passed
**Re-verification:** No, initial verification. Verified against the CURRENT tree (HEAD `465c806b`), after the three review rounds, not the plan summaries' snapshot.

## Goal Achievement

### Observable Truths

| # | Truth (roadmap SC) | Status | Evidence |
|---|---|---|---|
| 1 | SC1: the owner decides before planning; the decision is recorded | VERIFIED | `60-CONTEXT.md` records D-01 (pursue), D-02 (all three feeds public) and D-03 (one option shape) as "Owner choices (2026-11-19, the HDLS-01 checkpoint)"; D-12 is the second owner choice. ADR-QD-173 (Accepted, Rev 1.0) records the decision. The "No" branch was correctly not taken, so source changed. |
| 2 | SC2: the three feeds are exported from the root; the four runner names are retired from the barrel | VERIFIED | `packages/devtools/src/index.ts` exports `makeTimelineFeed` (+ `TimelineStatus`, types `TimelineFeed`, `TimelineFeedInputs`, `TimelineStatusReadout`), `makeDiagnosticsFeed` (+ `DiagnosticsStatus`, types), `makeGatesFeed` (+ `AskedRead`, `RegistryRead`, types). `/usr/bin/grep` of `index.ts` and `react/index.ts` for `makeTimelineStore\|runSource\|makeDiagnosticsStore\|runDiagnostics\|DiagnosticsDockOptions\|noDiagnostics` finds nothing. It stays a named barrel (no `export *`). `surface.test.ts` pins the exact key set (`deepStrictEqual(Object.keys(Root).sort(), ROOT_VALUES)`); `surface.tst.ts:236-248` pins each retired name with `@ts-expect-error`. Only `TimelineStore` (type) is kept, because `TimelineFeed.timeline` names it (D-04). |
| 3 | SC3: one option shape, and the README's headless example uses the feeds with stop detection | VERIFIED | Exactly one declaration, `export interface DiagnosticsOptions` in `DiagnosticsStore.ts:201`, non-generic, `{ layer?, collector?, intervalMillis? }`. Repo-wide search of `packages`, `spec`, `apps`, `examples` source for `DiagnosticsDockOptions` finds only retired-name pins (`surface.tst.ts`), ADR/BEH/change-history prose and older changesets/ADRs that are history. `react/index.ts:21` re-exports the same `DiagnosticsOptions` from the store (a tstyche test asserts React's is the root's). README "Without React: the feeds" builds `makeTimelineFeed`, `makeDiagnosticsFeed`, `makeGatesFeed` in a scope and matches `TimelineStatus` and `DiagnosticsStatus` with `Match.tagsExhaustive` including `Stopped`, then subscribes after reading `getSnapshot()` once. The false "same loop without React" claim is gone (grep: no hit). The fence is `typescript`; `check-doc-examples.mjs` reports 117 blocks compile. |
| 4 | SC4: tests, records and the Breaking note | VERIFIED | See rows below. |

SC4 broken out:

| Element | Status | Evidence |
|---|---|---|
| Feed tests import from the public entry | VERIFIED | `TimelineFeed.test.ts`, `DiagnosticsFeed.test.ts` and `GatesFeed.test.ts` build `makeTimelineFeed` / `makeDiagnosticsFeed` / `makeGatesFeed`, the statuses and option types from `../../src/index.ts`. They still import non-public sentinels and doubles from `model/` (`idleTimeline`, `idleDiagnostics`, `isUnsampled`, `diagnosticsOff`, `noDiagnostics`, `PortCalls` types), which are intentionally package-private; the feed under test is reached through the root. `Source.test.ts` and `useStoreSnapshot.test.tsx` still test the package-private engine directly, as D-04 keeps those modules. |
| `surface.test.ts` and `surface.tst.ts` updated | VERIFIED | Both changed since the base (13 and 11 lines in `surface.test.ts`). Both run green (below). |
| `spec/overview.md` passes gate 13 | VERIFIED | `node scripts/check-api-surface.mjs` prints `api-surface: 939 export(s) documented across 9 package(s)`. |
| ADR-QD-047 amendment 1.6 amended | VERIFIED | `047-*.md` Change History has 1.19 "the headless interface is the feeds (ARCH-107, ADR-QD-173, CCR-QD-451)", and an amendment blockquote (line ~515-521) states the root now exports the three feeds and no longer the four runners; it narrows rather than rewrites 1.6. |
| ADR-QD-099 entry list amended | VERIFIED | `099-*.md` Change History 1.2, and a paragraph (lines 90-97) says the named barrel lists the three feeds; the "Entry points" table and `exports` map are unchanged. |
| Breaking in the changeset | VERIFIED | `.changeset/devtools-headless-interface-is-the-feeds.md`: `"@qadi/devtools": minor`, body starts `**Breaking.**` and names every retired export. |
| Breaking in `upgrading.md` | VERIFIED | `apps/website/src/content/docs/docs/reference/upgrading.md:1021` "0.13: the feeds are devtools' headless interface", with Before (`ts` fence) and After (`typescript` fence, compiled). `check-website-doc-examples.mjs`: 70 blocks compile. |

**Score:** 4/4 truths verified (0 behavior-unverified).

### D-12, the frozen characterisation file

`git diff 35a48554 HEAD -- packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx` is `2 insertions(+), 2 deletions(-)`: line 26 (import `DiagnosticsDockOptions` -> `DiagnosticsOptions`) and line 66 (`const live: DiagnosticsOptions = {}`). No assertion or golden moved. VERIFIED.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `packages/devtools/src/index.ts` | named barrel carrying the three feeds | VERIFIED | Substantive and wired (consumed by the feed tests, the packed consumer and the README). |
| `packages/devtools/src/model/DiagnosticsStore.ts` | the one `DiagnosticsOptions` | VERIFIED | Non-generic; `runDiagnostics` stays package-private. |
| `packages/devtools/src/react/index.ts` | re-exports `DiagnosticsOptions`, not the dock name | VERIFIED | Line 21. |
| `packages/devtools/README.md` | feeds example with stop states | VERIFIED | Lines 160-255. |
| `spec/decisions/173-*.md` | ADR, Accepted | VERIFIED | Present, amends 047, 099, 169. |
| `.changeset/devtools-headless-interface-is-the-feeds.md` | Breaking minor changeset | VERIFIED | Present, the only changeset added since the base. |
| Records ARCH-107, CCR-QD-451, BEH-QD-636..640, INV-QD-365..366 | present in spec | VERIFIED | Each id is found in 3 to 11 spec files, including `traceability.md`, `behaviors/28-devtools-screens.md`, `README.md`. |
| `scripts/check-package-install.mjs` consumer | builds one `makeTimelineFeed` | VERIFIED | Lines 425, 507, 513: imports `makeTimelineFeed` from the packed root and asserts `fed.status` is `Reading` (D-18). Not re-run (packs and installs); recorded in 60-04/60-08 and `check:pr` passed. |

### Key Link Verification

| From | To | Via | Status |
|---|---|---|---|
| root barrel | `model/TimelineFeed.ts`, `DiagnosticsFeed.ts`, `GatesFeed.ts` | named `export { make…Feed }` plus handle types | WIRED |
| `@qadi/devtools/react` | the same `DiagnosticsOptions` | re-export from `DiagnosticsStore.ts` | WIRED |
| README example | root | `import … from "@qadi/devtools"`, compiled by gate `check-doc-examples.mjs` | WIRED |
| Newsroom example (`Counters.tsx`) | `DiagnosticsOptions` | no `DiagnosticsDockOptions` left in `examples/**/src`; the only hits for the retired runner names are `.next` build output | WIRED |

### Data-Flow Trace (Level 4)

Not applicable: the phase changes an export surface and an option type, not a rendered value. The feeds' own data flow is covered by their suites.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Devtools suite | `pnpm exec vitest run --project devtools < /dev/null` | 70 files, 1647 tests passed | PASS |
| Type pins | `pnpm exec tstyche packages/devtools/test/surface.tst.ts packages/devtools/test/model/DiagnosticsStore.tst.ts` | 2 files, 16 tests, 27 assertions passed | PASS |
| Gate 13 | `node scripts/check-api-surface.mjs` | 939 exports documented | PASS |
| House style | `node scripts/check-house-style.mjs` | 560 files clean, 3 declared switches | PASS |
| Doc examples | `node scripts/check-doc-examples.mjs` | 117 blocks compile | PASS |
| Website doc examples | `node scripts/check-website-doc-examples.mjs` | 70 blocks compile | PASS |
| DoD table | `node scripts/check-dod-table.mjs` | 25 steps match `pnpm check`, 150 references resolve | PASS |
| Devtools claims | `node scripts/check-devtools-claims.mjs` | 8 claims registered | PASS |
| Phase scan | `node 60-scan.mjs` | `phase scan clean` | PASS |
| Mutation compare (D-10) | `node 60-mutation.mjs compare 60-mutation-static.json` | per-file detected counts do not fall (`DiagnosticsStore.ts` 57 -> 57, `DockModel.ts` 114 -> 114, `GatesFeed.ts` 118 -> 118, `TimelineFeed.ts` 47 -> 49, `DiagnosticsFeed.ts` no new survivor); the new static-ignored mutants are Killed in the static file; ends `WX-05 holds (D-10)` | PASS |

Stryker, the bench and `check:pr` were not run, per instruction. `check:pr` is reported green on HEAD (16 of 16).

### Probe Execution

SKIPPED: the phase declares no `probe-*.sh` scripts.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|---|---|---|---|
| HDLS-01 | Owner checkpoint before planning | SATISFIED | SC1; CONTEXT D-01..D-03, ADR-QD-173 |
| HDLS-02 | Feeds exported from the root; the four runner names retired | SATISFIED | SC2 |
| HDLS-03 | One option shape; README headless example uses the feeds | SATISFIED | SC3 |
| HDLS-04 | Feed tests through the public entry; surface tests, gate 13, ADR-047/099 amended; Breaking in changeset and `upgrading.md` | SATISFIED | SC4 |

`REQUIREMENTS.md` marks all four `[x]` and Complete. WX-01..07 are milestone-wide and out of scope by design. No orphaned requirements.

### No release (check 8)

`git status --short` shows only `M .planning/config.json` as a tracked change (not phase source) plus untracked planning files. Since the base `35a48554`, `.changeset` gained exactly one file (the Breaking changeset); `git diff --stat` over every `package.json` and `CHANGELOG.md` is empty; no release or version commit in `35a48554..HEAD`; no tag points at HEAD. Nothing is versioned, tagged or pushed from this verification. VERIFIED.

### Anti-Patterns Found

None. The phase scan reports clean (no unreferenced TBD/FIXME/XXX).

### Human Verification Required

None.

### Findings that are not gaps (informational)

1. **Throwing `subscribe` listener is not isolated** (security audit UF-2; review WR-02/WR-03). `ExternalStore.notify` is shared with the React dock, and the dock's behaviour is out of scope (CONTEXT). The docs (README and BEH-QD-638) now state the rule "a listener must not throw" and each consequence. Recorded as an owner follow-up in `60-REVIEW-DISPOSITION.md`. Not a must-have of any success criterion.
2. **`packages/core/test/DecisionLog.tst.ts:30`** may carry a pin shape that cannot fail. Outside this phase; deferred in the disposition.
3. Review ran to `--auto`'s cap of three iterations with no critical or warning finding open at the end.
4. The feed tests keep a few package-private imports for sentinels and doubles. This matches D-04 and D-05 (the feed is built through the public entry); it is not an SC4 miss.

### Gaps Summary

None. The owner's decision is recorded; the root exports the three feeds and none of the four runners; one non-generic `DiagnosticsOptions` exists on both entries; the README example uses the feeds with stop states and compiles; surface, gate 13, ADR amendments, the Breaking changeset and the 0.13 upgrade note are all present; the characterisation file moved by exactly two lines; mutation holds (WX-05); the phase scan is clean; nothing was released.

---

_Verified: 2026-11-19_
_Verifier: Claude (gsd-verifier)_
