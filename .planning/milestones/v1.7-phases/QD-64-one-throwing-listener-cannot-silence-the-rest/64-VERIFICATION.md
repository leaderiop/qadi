---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
verified: 2026-11-20T18:30:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-01-PLAN.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-01-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-02-PLAN.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-02-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-03-PLAN.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-03-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-04-PLAN.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-04-SUMMARY.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-05-PLAN.md
  - .planning/milestones/v1.7-phases/QD-64-one-throwing-listener-cannot-silence-the-rest/64-05-SUMMARY.md
  - packages/devtools/README.md
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - spec/overview.md
covered_digest: "v4:sha256:3521faa5215241ff339a787d50f9d6185b77a80e3bf477a4c71412287a43ae3f"
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

## Re-verification (2026-11-21, Phase 68 sweep)

**Staleness:** `64: stale, verification af3ef24e, 25 cited, 11 changed since` (`68-stale.mjs`, run at `44a87d05`).

| Cited file | Changed since `af3ef24e` by |
| --- | --- |
| `AGENTS.md` | `36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457 |
| `packages/devtools/README.md` (covered) | `456be457` fix(68-04): a capacity change's publish stops no read |
| `packages/devtools/src/model/DiagnosticsFeed.ts` (covered) | `2bea33b3` docs(68-04): the diagnostics poll's stop and the ignore projection's members, as the code holds them |
| `packages/devtools/src/model/TimelineFeed.ts` (covered) | `456be457` fix(68-04): a capacity change's publish stops no read |
| `packages/devtools/test/model/ExternalStore.test.ts` | `2b79b7f5` test(68-03): pin the feeds' states after a listener throws, and a thrown value that throws when read |
| `scripts/spec-revise.mjs` | `564818c0` fix(68-01): spec-revise keeps its first argument when --date is not given |
| `spec/README.md` | `eacfeb6c` docs(68-11): CCR-QD-459, the settled items confirmed, and the devtools patch changeset<br>`82f87b4f` (before Phase 68) docs(67): the later bench run's miss deltas are not the dispatch's alone<br>`e5c18e6f` (before Phase 68) fix(67): IN-04 state the dispatch run's base spreads and host load beside the verdict<br>`36036666` (before Phase 68) fix(67): IN-03 move the dispatch measurement into the evidence document<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`b56f32c0` (before Phase 68) docs(65): CCR-QD-456 cites the revisions the review fix left<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered |
| `spec/behaviors/28-devtools-screens.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds |
| `spec/invariants.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`a23dacf1` (before Phase 68) fix(65): WR-01 narrow the read-once claim to the question's resource and action<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered |
| `spec/overview.md` (covered) | `f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457 |
| `spec/traceability.md` | `5b603fea` docs(68-10): the amended decisions, behaviours and invariants say what the code holds<br>`faec4fab` docs(68-07): the characterisation's readings, the projection's accessors, the admit pins and the supplied trace<br>`dea2afb4` (before Phase 68) docs(67-06): BEH-QD-166's reasons and INV-QD-379, traced and registered as CCR-QD-458<br>`a25de426` (before Phase 68) fix(66): WR-01, IN-01, IN-04 state the spec text exactly<br>`f62f450d` (before Phase 68) docs(66-04): ADR-QD-170 amended, BEH-QD-666 and INV-QD-377, traced and registered as CCR-QD-457<br>`a23dacf1` (before Phase 68) fix(65): WR-01 narrow the read-once claim to the question's resource and action<br>`7e2530f1` (before Phase 68) docs(65-05): BEH-QD-661 and BEH-QD-662<br>`f8f7ed70` (before Phase 68) docs(65-05): ADR-QD-172 amended; INV-QD-375 and INV-QD-376 recorded, traced and registered |

**Trailers on this phase's commits:** 21 `Claude Opus 5.5 <noreply@anthropic.com>`, 7 none, 4 `Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:01b44128d7bd707d936e93f38559b1b69dfc112b6106080b340beaa42faf10ac"` becomes `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"`, over the same 16 covered files.

### Spot-checks re-run (Phase 68 sweep)

Every row below was run on the tree at `44a87d05`, one command at a time, in the foreground, with nothing else running beside it.

| Behavior | Command run now | Result now | Status |
| -------- | --------------- | ---------- | ------ |
| Seam, three feeds, `useStoreSnapshot`, three dock characterisation files | `pnpm exec vitest run --project devtools <the same 8 files> < /dev/null` (`ExternalStore`, `TimelineFeed`, `DiagnosticsFeed` and `GatesFeed` under `test/model`, `useStoreSnapshot` and the three `*.characterisation.test.tsx` under `test/react`) | exit 0; `Test Files  8 passed (8)`, `Tests  157 passed (157)`; the report's 150 plus the seven tests Phase 68 added (one in the seam, four in the timeline feed, two in the diagnostics feed) | PASS |
| Gate 13 export documentation | `node scripts/check-api-surface.mjs < /dev/null` | exit 0; `api-surface: 939 export(s) documented across 9 package(s)`, the same count as at the verification | PASS |
| Spec revisions | `node scripts/spec-revise.mjs --check < /dev/null` | exit 0; `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Seam and gates feed regression | `pnpm exec vitest run --project devtools packages/devtools/test/model/ExternalStore.test.ts packages/devtools/test/model/GatesFeed.test.ts < /dev/null` | exit 0; `Test Files  2 passed (2)`, `Tests  47 passed (47)` (the report's 46 plus one test Phase 68 added to the seam) | PASS |
| Characterisation diff | `git diff 8f3cb792 HEAD -- '*.characterisation.test.tsx'`, after `git ls-files '*.characterisation.test.tsx'` to show the pathspec selects files | the pathspec selects the three tracked files; the diff is 0 lines and 0 files | PASS |
| Whole-merge gate | `pnpm check:pr < /dev/null` is not run here, so that the one run of the phase is the one that covers the tree its last plan leaves | Answered by the single `check:pr` run in plan 68-15, which reads the whole tree; this verdict stands only while that run is green | ANSWERED BY 68-15 |

The Stryker table above (WX-05) was not re-run here, since Stryker never runs beside another command and Phase 68's own mutation close already covers the two files it changed. That close ran at `10880abb`, and no `packages/*/src` file has changed since (`git diff --name-only 10880abb HEAD -- ':(glob)packages/**/src/**'` lists 0 files). Its recorded result for the two files, same invocation at base and close: `DiagnosticsFeed.ts` 98.63 then 100.00 (the one survivor is gone), `TimelineFeed.ts` 100.00 then 100.00. `ExternalStore.ts` and `GatesFeed.ts` did not change, so the table's two rows stand as written.

### Changed covered files read against the truths that cite them (Phase 68 sweep)

- `packages/devtools/README.md` (68-04, `456be457`): Truth 3 still holds. The report cites it among the texts that state the contract and keep an accurate window caveat; the caveat was rewritten because the code it described changed. It now says a `configure` with a new `capacity` publishes the emptied timeline and then starts the read that refills it, so a throw on that publish is rethrown once the read has started and stops no read, unless the timeline was `Stopped` and a status listener throws on the `Reading` that read publishes: that throw escapes, replaces the timeline listener's, and no read is started. The text the report read ("the previous read goes on, a new `source` in the same call is not read") no longer holds and is no longer in the file.
- `packages/devtools/src/model/TimelineFeed.ts` (68-04, `456be457`): Truths 2 and 3 still hold, and the report's "narrowed resize-path caveat added in review" is superseded. `configure` now wraps the publish: `try { push() } finally { readSource(next.source) }`, so a throw from a timeline listener on the emptied timeline's publish no longer ends the call before the read. The residue is the one the new docs state: when the feed was `Stopped`, a status listener that throws on the `Reading` the read publishes escapes from the `finally` and replaces the timeline listener's throw (pinned by TF29, which runs as part of the 8 files above). The `subscribe` docs still say every listener is called and what they threw is rethrown, and the dock characterisation files are untouched.
- `packages/devtools/src/model/DiagnosticsFeed.ts` (68-04, `2bea33b3`): Truths 2 and 3 still hold; the comment only gained the clause the code already satisfies, that the poll's `Stopped` is held even when a listener throws on that publish too. That also settles the report's review item IN-01: F32 pins it (the status ends `Stopped` with `sampled` true although the listener threw on the `Stopped` publish).
- `spec/overview.md` (66-04, `f62f450d`, before Phase 68): Truth 3 and the gap the re-verification closed still hold. The only change since the report is Rev 1.130, which edits the `UnknownKeyPolicy` and `decodeStoredRecord` rows for another decision; the `makeGatesFeed` row (line 915) still reads "a listener on the feed's own `subscribe` that throws stops no other".
- Cited, not covered, and changed since: `packages/devtools/test/model/ExternalStore.test.ts` gained 48 lines and no line was removed (the cases for a later listener still called, two throws as one `AggregateError`, a single value rethrown as itself, no throw unchanged, and a subscribe or unsubscribe during a notification are all still there and pass); the timeline and diagnostics feed tests gained lines only. BEH-QD-656 (Rev 1.38 of the devtools-screens behaviours) now also says the capacity change's publish stops no read and the poll's `Stopped` is held, and names TF25 to TF29 and F30 to F32; that matches the tests above. `scripts/spec-revise.mjs` changed in 68-01 (it now keeps its first argument when `--date` is not given), which does not affect the `--check` row, and the row passes.

### Notes on the original report's evidence

Kept whole above; recorded here, not edited.

- The characterisation-diff row's pathspec `'*.characterisation.test.tsx'` was checked for being vacuous: unlike `'packages/*/src'`, git's `*` crosses directory separators, and the pathspec selects all three tracked files, so its empty diff was not vacuous then and is not now.
- The report's wording that the characterisation files pass "with an empty diff" is a claim about Phase 64's range; the empty diff is re-measured above against the same base `8f3cb792` and still holds through Phase 68.
- The report's merge-gate row ("reported, not re-run by design") is answered above by 68-15's one run.
- The report records no validation file; none exists. Its code review items IN-02 and IN-03 are not re-judged here: IN-02, that no test pinned the post-throw feed states, is answered for the states the code now documents by TF26 to TF29 and F31 and F32, which pass.

**Verdict:** passed

## Re-verification (2026-11-21, after the code review's fixes)

**Staleness:** `64: stale, verification 1d472db7, 26 cited, 2 changed since` (`68-stale.mjs`, run at `2367f9df`).

| Cited file | Changed since `1d472db7` by |
| --- | --- |
| `spec/README.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |
| `spec/traceability.md` | `8c3375fb` fix(QD-68): WR-02 the timeout text claims only the execFileSync children |

**Trailers on this phase's commits:** 21 `Claude Opus 5.5 <noreply@anthropic.com>`, 7 none, 4 `Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"` becomes `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"`, over the same 16 covered files.

### Spot-checks re-run (Re-verification (2026-11-21, after the code review's fixes))

Every row was run on the tree at `2367f9df` (the commit `68-stale.mjs` named), one command at a time, in the foreground, with nothing else running beside it. Heavy commands were run once and their result is shared across the six phases' sections.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| Revision headers and registers | `node scripts/spec-revise.mjs --check < /dev/null` | exit 0; `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |
| What `8c3375fb` changed in the spec | `git show 8c3375fb -- spec` | `spec/README.md`: the Revision header (1.273 to 1.274), its Change History and the CCR-QD-459 row (ADR-QD-033 now cited at Rev 1.4). `spec/traceability.md`: the header (1.235 to 1.236), its Change History and the ADR-QD-033 row. `spec/decisions/033-*.md`: Revision 1.4 and the sentence on child timeouts. Every other row of both registers is unchanged | PASS |

### Truths re-checked (Re-verification (2026-11-21, after the code review's fixes))

Only `spec/README.md` and `spec/traceability.md` changed among the cited files, in the rows named in the last spot-check row. The report's cited README Revision (1.264) and rows are in Change History entries that remain; no row this phase's truths rest on was edited.

**Verdict:** passed

## Re-verification (2026-11-21, after Phase 68.1)

**Staleness:** `64: stale, verification 3b92bac7, 27 cited, 2 changed since` (`68-stale.mjs`, run at `f91b9f4b`).

| Cited file | Changed since `3b92bac7` by |
| --- | --- |
| `README.md` | `ecb4ed90` fix(68.1-02): analyze.mjs exits 1 on a failed gate, and pnpm check runs its self-test |
| `spec/README.md` | `a8b36092` docs(68.1-05): ADR-QD-033 amended and CCR-QD-460 recorded |

**Trailers on this phase's commits:** 21 `Claude Opus 5.5 <noreply@anthropic.com>`, 7 none, 4 `Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"` becomes `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"`, over the same 16 covered files.

**Staleness by `68.1-stale.mjs`:** `64: stale, verification 3b92bac7, 28 cited, 2 changed since` (run at `f91b9f4b`).

### Spot-checks re-run (Re-verification (2026-11-21, after Phase 68.1))

Every row was run on a tree whose tracked files outside the planning directory are those of `f91b9f4b`, one command at a time, in the foreground, with stdin closed and nothing else running beside it. The spec-revise and traceability results are shared with the other re-verifications of this phase and were taken once at `c3d8553a`; no tracked file outside the planning directory differs between that head and `f91b9f4b`. No source, test or characterisation file of Phase 64 changed in this phase, so the report's vitest rows were not run again.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase changed in the root readme | `git diff -U0 0e3f3438 HEAD -- README.md` | one line changed, 220: `pnpm check` is now commented `all twenty-six gates, in order` where it read twenty-five; nothing else in the file differs | PASS |
| The readme says nothing about a listener's throw | `grep -c -i 'listener' README.md`, and the same with `'must not throw'` | 0 and 0, so the report's repo-wide sweep for a text asking a listener not to throw still finds none in it | PASS |
| What the phase changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | the Revision header (1.274 to 1.275), the Change History cell (a 1.275 entry in front) and one added row, CCR-QD-460, at line 397; no row is removed or edited, so the CCR-QD-455 row (line 392) is unchanged and the 1.264 entry the report cites is still in the cell; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-21, after Phase 68.1))

- `README.md` (68.1-02, `ecb4ed90`): the report names the root readme only in the scope of Truth 3's repo-wide sweep for a text that asks a listener not to throw. The commit changes one number in a comment on the `pnpm check` line (twenty-five gates to twenty-six) and adds no word about listeners, which the row above counts as zero occurrences, so the sweep's finding for it holds and Truth 3 is unchanged.
- `spec/README.md` (68.1-05, `a8b36092`): the report cites the CCR-QD-455 row and Revision 1.264 (Truth 3's overview row). The row is unedited at line 392 and the 1.264 entry remains in the Change History cell; the commit moves the revision to 1.275 and adds the CCR-QD-460 row, which no truth of this report reads.

**Verdict:** passed

## Re-verification (2026-11-22, after the 68.1 code-review fixes)

**Staleness:** `64: stale, verification 8ba85bdc, 27 cited, 1 changed since` (`68-stale.mjs`, run at `a9c9c84c`).

| Cited file | Changed since `8ba85bdc` by |
| --- | --- |
| `spec/README.md` | `79a685b4` docs(68.1): WR-02 WR-03 scope CCR-QD-460's odd-count and hang claims to what was shown |

**Trailers on this phase's commits:** 21 `Claude Opus 5.5 <noreply@anthropic.com>`, 7 none, 4 `Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Validation record:** no VALIDATION.md.

**Digest:** `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"` becomes `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"`, over the same 16 covered files.

**Staleness by `68.1-stale.mjs`:** `64: stale, verification 8ba85bdc, 28 cited, 1 changed since` (run at `a9c9c84c`).

### Spot-checks re-run (Re-verification (2026-11-22, after the 68.1 code-review fixes))

Every row was run on the tree at `a9c9c84c`, one command at a time, in the foreground, with stdin closed. The spec-revise and traceability results are shared with the Phase 62, 63 and 65 to 68 sections of this re-verification: each was taken once at `ae42c2b2`, in a fresh set after the code-review fixes (the earlier set, taken at `c3d8553a`, is not reused because `scripts/bench/ab.sh` and `spec/` changed), and no tracked file outside the planning directory differs between that head and `a9c9c84c`. No source, test or characterisation file of Phase 64 changed, so the report's vitest rows were not run again.

| Behaviour | Command run now | Result now | Status |
| --------- | --------------- | ---------- | ------ |
| What the phase and its fixes changed in the spec register, and the revisions | `git diff -U0 0e3f3438 HEAD -- spec/README.md`, and `node scripts/spec-revise.mjs --check < /dev/null` (shared) | 3 insertions and 2 deletions: the Revision header (1.274 to 1.276), the Change History cell (the 1.276 and 1.275 entries in front) and one added row, CCR-QD-460, at line 397; no existing row is removed or edited, so the CCR-QD-455 row (line 392) is unchanged and the 1.264 entry the report cites is still in the cell; `spec-revise` exit 0, `spec-revise: every Revision matches its newest Change History entry` | PASS |
| What the code-review fixes changed since the previous section | `git diff -U0 8ba85bdc HEAD -- spec/README.md` | 3 hunks, at lines 8 (Revision 1.275 to 1.276), 13 (Change History: a 1.276 entry in front) and 397 (the CCR-QD-460 row rewritten); no other line differs | PASS |
| Traceability | `bash spec/scripts/verify-traceability.sh --strict < /dev/null` (shared) | exit 0; `PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)` | PASS |

### Changed cited files read against the truths that cite them (Re-verification (2026-11-22, after the 68.1 code-review fixes))

- `spec/README.md` (`79a685b4`): the report cites the CCR-QD-455 row and Revision 1.264 (Truth 3's overview row). The row is unedited at line 392 and the 1.264 entry remains in the Change History cell; the commit moves the revision to 1.276, adds a Change History entry and rewrites the CCR-QD-460 row to scope its odd-round-count and hang claims, none of which a truth of this report reads. Every truth holds as worded.

**Verdict:** passed

## Re-verification (2026-11-22, after the fourth review pass and the milestone archive)

**Staleness:** `64: stale, verification 74f07a36, 29 cited, 1 changed since` (`68.1-stale.mjs`, run at `b1da4dc5`).

| Cited file | Changed since `74f07a36` by |
| --- | --- |
| `spec/README.md` | `b45e798a` fix(68.1): gate 14 kills the TypeScript server a killed child started<br>`0b01b83a` docs(68.1): AR-68.1-01 re-measured and narrowed |

**Trailers on this phase's commits:** 22 `Claude Opus 5.5 <noreply@anthropic.com>`, 7 none, 4 `Claude Sonnet 5.5 <noreply@anthropic.com>`.

**Validation record:** `64-VALIDATION.md` has status `validated` and nyquist_compliant `true`.

**Digest:** `covered_digest: "v4:sha256:47f9dce0e21ab2f492a12de4095b99f3f0bf9e4a52c1f74870954cc9042d43fd"` becomes `covered_digest: "v4:sha256:3521faa5215241ff339a787d50f9d6185b77a80e3bf477a4c71412287a43ae3f"`, over the same 16 covered files, 10 of them declared at the place the milestone archive moved them to.

**Gate:** `pnpm check:pr` exited 0 at `b1da4dc5` (17 of 18 steps, mutation skipped as on every non-release PR): 242 + 34 + 7 vitest files (5985 + 568 + 43 tests), gate 14 packed and authorized 9 packages (524 runtime exports) and left no TypeScript server running. The changes since the last re-verification touch no `packages/*/src` file.
