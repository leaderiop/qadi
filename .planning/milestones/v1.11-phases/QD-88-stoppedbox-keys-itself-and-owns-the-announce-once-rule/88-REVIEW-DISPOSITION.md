---
phase: 88
review: 88-REVIEW.md
findings:
  - id: WR-01
    severity: warning
    disposition: fixed
    title: "BEH-QD-779 and ADR-QD-201 decision 3 required the box to receive the hook's memoised value, but every caller spreads it"
  - id: WR-02
    severity: warning
    disposition: fixed
    title: "recordStop's doc said no render follows a repeat record, against ADR-QD-201's measured cost"
  - id: IN-01
    severity: info
    disposition: fixed
    title: "The layout effect returned record's result"
  - id: IN-02
    severity: info
    disposition: fixed
    title: "ADR-QD-197 decision 4's amendment affirmed a sentence the move made stale"
  - id: IN-03
    severity: info
    disposition: fixed
    title: "The ledger docs said distinct stops; the ledger counts changes and holds only the last stop"
  - id: IN-04
    severity: info
    disposition: fixed
    title: "Only the box and the hook import it, stated without its src qualifier"
  - id: IN-05
    severity: info
    disposition: fixed
    title: "The ADR-QD-201 audit said every other row is untouched, but shared fixtures changed meaning"
  - id: IN-06
    severity: info
    disposition: fixed
    title: "The edited files drifted from house formatting"
  - id: SEC-OBS-1
    severity: info
    disposition: fixed
    title: "ledger-module never checked the StopLedger fields the T-88-08 plan text claims it refuses"
  - id: SEC-OBS-2..6
    severity: info
    disposition: accepted
    title: "Security observations 2-6: informational, no change needed"
open: 0
---

# Phase 88 — Review disposition

Findings from `88-REVIEW.md`, plus the observations in `88-SECURITY.md`. All decided autonomously 2026-11-26.

| Finding | Severity | Disposition | Source |
|---------|----------|-------------|--------|
| WR-01 | warning | fixed | `a6c4e082`: BEH-QD-779 (retitled "…and the box receives the hook's announced handle by identity", every link to its anchor moved), BEH-QD-776's prose and ADR-QD-201 decision 3 state the hand-off the code makes: the notice's props object is built fresh each render and nothing keys on it; what holds across renders is the `announced` handle, its `record` and its ledger. Fixed in the spec, not the callers: `DevtoolsDock.tsx` is held unchanged by this phase and the behaviour is correct. |
| WR-02 | warning | fixed | `dfcd36c8` (`StopLedger.ts` `recordStop` doc), `4148848e` (ADR-QD-201 decision 5): a repeat record still calls the holder once, because `useReducer` has no eager bail-out; nothing renders below it. |
| IN-01 | info | fixed | `617a5b26`: block body `() => { announced.record(status); }`; the quoted code in ADR-QD-201 decision 4 and INV-QD-422 follows. |
| IN-02 | info | fixed | `130de0da`: the amendment states that `StopLedger<S>` and `noStops` moved to `model/StopLedger.ts`, that `AnnouncedStops<S>` sits beside `StopNoticeProps<S>`, and what of decision 4 still stands. |
| IN-03 | info | fixed | `d276d397`: the ledger counts how many times the shown stop changed (A, B, A → 3) and holds only the last stop. |
| IN-04 | info | fixed | `5577a068`: "in `packages/devtools/src` only the box and the hook import it"; tests import it too. |
| IN-05 | info | fixed | `fd36cf72`: the audit names the three shared fixtures and the rows that read them; rows rewritten, none removed, `Tests removed: 0.` holds. TN14 retitled inside its declared region; pinned and earlier checks pass. |
| IN-06 | info | fixed | `0769da68`: the lines the phase added are hand-wrapped; "AGENTS.md §9/§13" throughout. Long copy strings older than the phase were left as they are (re-wrapping them adds lines `scan-ids` refuses). |
| SEC-OBS-1 | info | fixed | `b965d953`: `ledger-module` reads the `StopLedger` members and refuses any but `stop`/`count`, a missing one, a duplicate, an `extends` clause or a widened alias; 17 self-test cases (302 pass); seen failing on a scratch extra field, recorded in `88-RED-EVIDENCE.md`. |
| SEC-OBS-2..6 | info | accepted | 2: the ledger holds the stop by reference, compared with `===` only, reaches no sink. 3: the React stop path is held by the 13 recorded variants, not Stryker (D-07). 4: the first commit holds the base record and its scorer together, both under `.planning/`. 5 and 6: working-tree and HEAD notes, no phase change. |

Spec edits in the fix round were made in place within this phase's unreleased revisions (CCR-QD-480), not as further `spec-revise.mjs` bumps: `88-check.mjs records --close` requires each revised document exactly one revision above phase_base and ADR-QD-201 at 1.0. `spec-revise.mjs --check` (inside `spec:verify`) passes.

Mutation re-closed after the `StopLedger.ts` doc edits: 12 killed, 0 survived, 4 static examined, 100% (`7da034b9`, `075be549`); `compare` green.

`pnpm check:pr` exited 0 after the fixes (17 of 18 steps; mutation skipped by definition), on head `b965d953`.
