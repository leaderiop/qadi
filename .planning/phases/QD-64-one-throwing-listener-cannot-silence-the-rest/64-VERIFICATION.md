---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
verified: 2026-11-20T18:30:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-01-PLAN.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-01-SUMMARY.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-02-PLAN.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-02-SUMMARY.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-03-PLAN.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-03-SUMMARY.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-04-PLAN.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-04-SUMMARY.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-05-PLAN.md"
  - ".planning/phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-05-SUMMARY.md"
  - "packages/devtools/README.md"
  - "packages/devtools/src/model/DiagnosticsFeed.ts"
  - "packages/devtools/src/model/ExternalStore.ts"
  - "packages/devtools/src/model/GatesFeed.ts"
  - "packages/devtools/src/model/TimelineFeed.ts"
  - "spec/overview.md"
covered_digest: "v4:sha256:01b44128d7bd707d936e93f38559b1b69dfc112b6106080b340beaa42faf10ac"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 3/4
  gaps_closed:
    - "Every text that says a listener must not throw or is not isolated states the new contract (LSTN-03, roadmap criterion 3): spec/overview.md makeGatesFeed row"
  gaps_remaining: []
  regressions: []
---

# Phase 64: One throwing listener cannot silence the rest — Verification Report

**Phase Goal:** A devtools `ExternalStore` calls every subscribed listener even when one throws and then rethrows what was thrown, so one failing listener (the React dock's `useStoreSnapshot` included) can no longer leave the others on a stale snapshot.
**Verified:** 2026-11-20
**Status:** passed
**Re-verification:** Yes, after gap closure (commit 1a800ebb)

The behaviour goal is met in code and tests, and the one stale "must not throw" text found on the first pass (`spec/overview.md`, `makeGatesFeed` row) now states the new contract. All four criteria hold.

## Goal Achievement

### Observable Truths (roadmap success criteria)

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | Tests written on the phase base were RED: later listener still called; two throws give one `AggregateError` with both; single error rethrown as the same value incl. `undefined`; no throw unchanged; subscribe/unsubscribe during notify keep live iteration | VERIFIED | `64-RED-EVIDENCE.md` records the base run: ExternalStore 14 tests with 5 failed (R1 to R5), the three feed tests F30, G48, TF25 failed on the base, and nine seam mutants (snapshot iteration, notify before assign, truthiness decision, flatten, count in message, no early return, swallow, rethrow first) each failing exactly the cases named. The cases exist in `packages/devtools/test/model/ExternalStore.test.ts` (R1..R5 plus C1..C4: no-throw, removed-before-turn, added-during, value held before listeners) |
| 2 | `notify` calls every listener then rethrows per criterion 1; each of the three feeds is tested through the root | VERIFIED | `ExternalStore.ts` `notify` collects into `thrown`, decides on `thrown.length` (0 returns, 1 `throw thrown[0]`, otherwise `AggregateError(thrown, "More than one of the store's listeners threw.")`), iterates the live `Set`, no `instanceof`. TF25, F30, G48 build the feed via `makeTimelineFeed`/`makeDiagnosticsFeed`/`makeGatesFeed` from `../../src/index.ts`. I ran the 8 relevant files (4 model, `useStoreSnapshot`, 3 characterisation): 150 passed |
| 3 | Every text saying a listener must not throw or is not isolated states the new contract, keeping an accurate D7 caveat | VERIFIED | Amended and accurate: `TimelineFeed.ts` (both `subscribe` docs plus `configure`), `DiagnosticsFeed.ts` (poll-stop clause kept), `GatesFeed.ts` (module doc and `subscribe`), `ExternalStore.ts` contract doc, `packages/devtools/README.md`, BEH-QD-638 amended and BEH-QD-656 new, ADR-QD-173 amended, the D7 window caveat present in each. Gap closed by 1a800ebb: `spec/overview.md:915` now reads "a listener on the feed's own `subscribe` that throws stops no other: every listener is called, and then what they threw leaves whatever published, one value as itself and several as one `AggregateError` (BEH-QD-638, BEH-QD-656, ADR-QD-169, ADR-QD-177)". Repo-wide sweep (spec/, packages/, apps/website/src, README.md, AGENTS.md; change-history cells, CHANGELOGs, .planning and dist excluded) found no other text asking a store or feed listener not to throw. Surviving `must not throw` hits are unrelated contracts (`Source.ts` name reader, hydration, codecs, the dock model's own host-registry guard in BEH-QD-5xx, which itself says it MUST NOT skip another store's listeners); `@qadi/react`'s gate registry swallowing a listener's throw is an unchanged, separately documented contract (ADR-QD-177). Website `apps/website/src` has no mirror |
| 4 | Dock `*.characterisation.test.tsx` pass with an empty diff; a `@qadi/devtools` patch changeset records the change | VERIFIED | `git diff 8f3cb792 HEAD -- '*.characterisation.test.tsx'` is empty (QuestionsPanel, QuestionsPanel.feed, ServicesPanel); they pass. `.changeset/devtools-every-listener-is-called.md` is `"@qadi/devtools": patch` and no other changeset was added |

**Score:** 4/4 truths verified (0 behavior-unverified)

### Locked decisions honoured

Fixed message with no count (asserted, mutant v5). Live iteration (v1 fails it). Nested `AggregateError` kept nested with no `instanceof` branch (v4). State assigned before notify (v2). D7 window out of scope and caveated, with a narrowed resize-path caveat added in review. Reserved ids only: ADR-QD-177, CCR-QD-455, BEH-QD-656 and INV-QD-373 used; CCR row names BEH-QD-657 to 660 and INV-QD-374 Unused. ADR-QD-173 carries the "amended 2026-11-20" status and `index.yaml` has entry 177. No `Date.now`, `switch`, `as`, `!`, `any` or Stryker-disable in the diff (the only `as` grep hits are the word in comments).

### Required Artifacts

| Artifact | Status | Details |
| -------- | ------ | ------- |
| `packages/devtools/src/model/ExternalStore.ts` | VERIFIED | Substantive and wired to all 13 importers through `makeExternalStore` |
| `packages/devtools/test/model/ExternalStore.test.ts` | VERIFIED | +161 lines, 14 tests, passing |
| Feed tests TF25 / F30 / G48 and `thrownBy` helper | VERIFIED | Pass, built through `src/index.ts` |
| `spec/decisions/177-...md`, `index.yaml`, ADR-173 amendment | VERIFIED | Present and traced in `spec/traceability.md` |
| `spec/behaviors/28-devtools-screens.md` BEH-QD-656 and BEH-QD-638 amendment, `spec/invariants.md` INV-QD-373 | VERIFIED | Present and traced |
| `.changeset/devtools-every-listener-is-called.md` | VERIFIED | One patch changeset |
| `spec/overview.md` | VERIFIED | Rev 1.129; line 915 states the new contract; `spec/README.md` Rev 1.264 and the CCR-QD-455 row name it; `spec-revise --check` passes |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `ExternalStore.notify` | feeds and `useStoreSnapshot` | `makeExternalStore` used by the 13 importers; the feed tests observe the isolation through the public root | WIRED |
| BEH-QD-638 (amended) | `spec/overview.md` GatesFeed row | citation in the row (now with BEH-QD-656, ADR-QD-177) | WIRED: the row restates the new contract |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Seam, three feeds, `useStoreSnapshot`, three dock characterisation files | `pnpm exec vitest run --project devtools <8 files> < /dev/null` | 8 files, 150 tests passed | PASS |
| Gate 13 export documentation | `node scripts/check-api-surface.mjs < /dev/null` | 939 exports documented across 9 packages (re-run on 1a800ebb) | PASS |
| Spec revisions | `node scripts/spec-revise.mjs --check < /dev/null` | every Revision matches its newest Change History entry | PASS |
| Seam and gates feed regression | `pnpm exec vitest run --project devtools ExternalStore.test.ts GatesFeed.test.ts` | 2 files, 46 tests passed | PASS |
| Characterisation diff | `git diff 8f3cb792 HEAD -- '*.characterisation.test.tsx'` | empty | PASS |
| Whole-merge gate | orchestrator's `pnpm check:pr < /dev/null` on HEAD 1a800ebb | exit 0, 16 of 17 steps (mutation skipped on non-release PRs) | PASS (reported, not re-run by design) |

### Stryker (WX-05), same invocation at base and close

| File | Base | Close |
| ---- | ---- | ----- |
| `ExternalStore.ts` | 96.67 | 97.62 |
| `TimelineFeed.ts` | 100.00 | 100.00 |
| `DiagnosticsFeed.ts` | 98.63 | 98.63 |
| `GatesFeed.ts` | 100.00 | 100.00 |

No drop. The one surviving `ExternalStore.ts` mutant is in `sameElements`, which the phase did not touch and which already survived on the base.

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| LSTN-01 | SATISFIED | RED evidence on the base, cases R1..R5, C1..C4 |
| LSTN-02 | SATISFIED | `notify` rewrite, TF25/F30/G48 through the root |
| LSTN-03 | SATISFIED | the enumerated texts comply, `spec/overview.md:915` fixed in 1a800ebb, repo-wide sweep clean |
| LSTN-04 | SATISFIED | empty characterisation diff, patch changeset |
| WX-01 | EVIDENCED | orchestrator's `check:pr` exit 0 on HEAD |
| WX-02 | EVIDENCED | ADR/CCR/BEH/INV/traceability present with reserved ids; Unused ids named in the CCR row |
| WX-03 | EVIDENCED | gate 13 passes, no export added; overview row now current |
| WX-04 | EVIDENCED | diff scan clean |
| WX-05 | EVIDENCED | table above, no drop |
| WX-06 | EVIDENCED | `64-RED-EVIDENCE.md`: RED on the base for defect cases, green characterisation for preserved behaviour, nine mutants each shown failing |
| WX-07 | EVIDENCED | no D-number, plan id or phase number in the diff's source or test titles (ADR/BEH/INV ids in comments are allowed) |

WX-01 to WX-07 are Pending in REQUIREMENTS.md by project rule and are not treated as a gap. No orphaned requirement IDs: all 11 IDs in the roadmap appear in the plans.

### Anti-Patterns Found

None blocking in the phase diff. No TODO/FIXME/XXX introduced.

### Code review items (IN-01..03)

None undermines the phase goal or a success criterion. All three are precision notes on prose about the post-throw state of a feed.

- IN-01: the poll-stop sentence in `DiagnosticsFeed.ts` holds only if the `Stopped` publish does not also throw. It is a D7-adjacent edge and does not affect isolation.
- IN-02: no test pins the claimed post-throw feed states (`Reading` with nothing reading, the resize path). The claims are traced by review against the code but could rot unnoticed. This is a WARNING-level hardening suggestion, since the criteria do not require pinning D7-window states.
- IN-03: wording says "a new source" where a capacity-only `configure` also skips the refill. It is a text-precision point inside the already-caveated window.

### Human Verification Required

None.

### Gaps Summary

None. The single gap from the first verification (`spec/overview.md:915`) was closed by commit 1a800ebb, which also bumped `spec/overview.md` to Rev 1.129 and `spec/README.md` to Rev 1.264 and made the CCR-QD-455 row name the overview revision. The fix touched only those two spec files, so no source, test or characterisation file changed and nothing regressed.

---

_Verified: 2026-11-20 (re-verification)_
_Verifier: Claude (gsd-verifier)_
