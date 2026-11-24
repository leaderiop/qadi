---
phase: QD-79-feeds-and-the-dock-model-take-inputs-only-through-configure
plan: 08
subsystem: devtools-feeds
tags: [configure, same-fields, normaliser, gates-feed, timeline-feed, type-pins, devtools]
requires: ["79-07"]
provides:
  - the timeline feed's configure decides once, on sameFields(held, wanted)
  - completeGatesInputs and the gates feed's configure over a complete record, with the failed-watch retry as its one stated exception
  - G44's last stanza and case 13 of the Questions characterisation state the rule
  - ConfigureInputs.tst.ts, the golden Required records of the three feeds and their normalisers' compile force
affects: [79-09, 79-12, 79-16]
key-files:
  created:
    - packages/devtools/test/model/ConfigureInputs.tst.ts
  modified:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/model/GatesFeed.ts
    - packages/devtools/test/model/GatesFeed.test.ts
    - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
key-decisions:
  - "The gates feed returns before any read when no input moved and no watch failed; a failed watch is retried by any configure (a one-line comment says so), so G43 passes unedited"
  - "Case 13's golden is case 12's string unchanged: the measured markup after the rule equals it"
  - "ConfigureInputs.tst.ts holds one test per input type, each with its golden, its normaliser pin, a refused record and its accepted twin, so each type's compile force fails exactly its own title"
requirements-completed: []
metrics:
  duration: 40min
  completed: 2026-11-24
status: complete
commits: 5
plan_head_before: c80bbac9
plan_head_after: 9539e806703764722b4f0714429a8cfa8dc5a86b
actuals:
  tokens: 6500
  tasks: 3
  commits: 5
coverage:
  - deliverable: "timeline refactor: configure's one decision is sameFields(held, wanted); the guard replaced by false fails CR1, CR2, CR18, TF2, TF33 (and CR11/CR12/CR16/CR17 stayed as before); pinned and characterisation checks pass"
    verification:
      - kind: command
        ref: "devtools project 1857 tests, failing only CR11, CR12, CR16, CR17 after the refactor; 79-pinned-check.mjs and 79-characterisation-check.mjs pass"
        status: pass
    human_judgment: false
  - deliverable: "completeGatesInputs and the rule with its stated exception; G44's new stanza and case 13's new golden shown failing before the source changed; G43 unedited"
    verification:
      - kind: command
        ref: "the Task 1 verify of 79-08-PLAN.md (exit 0); devtools project 1857 tests, no failing test"
        status: pass
    human_judgment: false
  - deliverable: "ConfigureInputs.tst.ts pins the three Required records and normaliser return types; compile force shown once per type (T1 to T3); house-style reads 3 switches, 76 type-test files"
    verification:
      - kind: command
        ref: "the Task 2 verify of 79-08-PLAN.md (exit 0)"
        status: pass
    human_judgment: false
---

# Phase QD-79 Plan 08: The rule in the gates feed and the input records pinned by type

**The gates feed holds one complete input record and reads host code only when an input moved or its watch failed, the timeline feed's rule is its one decision, and each feed's input record is pinned by a golden type that a new field fails.**

## Accomplishments

- Commit 799bae41 (orchestrator-decided, see Deviations): `TimelineFeed.configure` is the `sameFields` guard, then `try { timeline.resize(wanted.capacity); } finally { readSource(wanted.source); }`. The `resized` flag, the second comparison and `before` are gone.
- Commit e0ee46c8: `completeGatesInputs(inputs): Required<GatesFeedInputs>`; the feed holds `held`; `configure` is closed check, normalise, `if (sameFields(held, wanted) && watchFailure === undefined) return`, then the old body over `wanted`. G44's last stanza now asserts the registry stays `Failed` after a same-input configure and reads again after one that moves `intervalMillis`; case 13 is retitled and its golden is case 12's.
- Commit c82d960b: `ConfigureInputs.tst.ts`, three tests (timeline, diagnostics, gates), no callable or constructable pin.
- Whole devtools project after the gates rule: 1857 tests, none failing. CR11 and CR12 turned green with it, and CR16 and CR17 passed as well, since the dock's `configure` reaches the feeds' own no-op. 79-09 still owns the dock's own normaliser and its type pins.
- `pnpm typecheck`, `pnpm test:tstyche` (76 files), `oxlint packages/devtools`, house-style (3 switches, 76 type-test files) pass; the pinned and characterisation checks pass.

Red evidence (`79-RED-EVIDENCE.md`): section `79-08 the timeline feed rule is its one decision` (R1), `79-08 the gates rule and the input pins` (G44 and case 13 red before the rule), and T1 to T3 for the compile force per type.

## Deviations from Plan

### Orchestrator-decided

**1. [Orchestrator decision] The timeline feed's `configure` refactor, carried out before the plan's tasks**
- **Why:** the `sameFields(held, wanted)` guard was redundant beside the second comparison, so two places decided whether an input moved, and the guard's `false` mutant was equivalent (79-07 found CR1 to CR5 passed with it).
- **Change:** past the guard the body is `timeline.resize(...)` with `readSource(...)` in its `finally`; behaviour is unchanged because a moved capacity always resized and so re-read, and a moved source re-reads.
- **Evidence:** with the guard replaced by `false`, CR1, CR2, CR11, CR12, CR16, CR17, CR18, TF2, TF30 and TF33 fail (the extra read is counted). Recorded as R1.
- **Commit:** 799bae41

### Auto-fixed Issues

**2. [Rule 3 - Blocking] Two verify one-liners failed on their own text, not on the code**
- **Task 1 verify:** its raw-inputs scan matched the new normaliser's own `inputs.gates` reads. The scan now skips the normaliser's field lines. Commit 9539e806.
- **Task 2 verify:** the plan expects TS2741 for each normaliser, but the timeline's normaliser returns an intersection, so a field added to its input type is reported as TS2322 there (TS2741 for the other two). The evidence regex accepts either. Commit bea44fcc.
- Both are `docs(79-08): fix verify quoting`, changing PLAN text only.

No other deviation.

## Decisions Made (autonomous)

- One tstyche test per input type, with its negative and twin inside it, over separate refusal tests, so a failing compile force names one title per type.
- Left `DiagnosticsOptions` where it is (`DiagnosticsStore.ts`) and pinned it from there.

## Risks for 79-16 (mutation close)

- `GatesFeed.ts`: the `watchFailure === undefined` half of the early return is covered by G43; the `sameFields` half by CR11 and CR12. Not measured here.
- `TimelineFeed.ts`: the guard's mutant now fails CR1 and others, so the equivalent-mutant risk 79-07 named is closed.

## Known Stubs

None.

## Threat Flags

None. T-79-13 is mitigated by the rule, with CR11, CR12 and G44's new stanza pinning it; T-79-14 is accepted as planned.

## Self-Check: PASSED

- `ConfigureInputs.tst.ts` exists; `completeGatesInputs` is declared in `GatesFeed.ts`.
- Commits 799bae41, e0ee46c8, bea44fcc, c82d960b and 9539e806 are ancestors of HEAD, each with the one trailer.
