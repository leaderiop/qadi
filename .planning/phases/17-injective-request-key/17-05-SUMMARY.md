---
phase: 17-injective-request-key
plan: 05
subsystem: devtools
tags: [replay, capture, fail-closed, d-04, mutation]

phase_base: 1a14899
d04_outcome_implemented: A

requires: ["17-01", "17-04"]
provides:
  - "`replayLayer` answers every request the capture never saw with the port's own typed error, on all five ports; `UNSEEN_REQUEST_IS_AN_OUTAGE` is gone and `unseenReply(port): PortReply<never>`"
  - "Capture.test.ts describe \"a replay miss follows one policy per port (ARCH-65, D-04)\": a `MISSES` table typed over `PortName`, one row per port, a miss under the leaf and under `not(leaf)` (10 tests)"
affects: [17-06]

actuals:
  tasks: 2
  commits: 3

key-files:
  modified:
    - packages/devtools/src/model/Capture.ts
    - packages/devtools/test/model/Capture.test.ts
    - packages/devtools/test/model/SimulationSource.test.ts

key-decisions:
  - "Applied 17-01 T1 (D-04) from `_DECISIONS.md`: \"Every port's unseen replay request is an outage (fail closed); `PortDescription.key` returns `Result<string, KeyRefusal>` (Breaking) — confirmed\" (`d04_outcome: A`)."
  - "Under A no port answers `none` on a miss, so the per-port table's rows carry the expected error tag only, not an `outage | none` field: a `none` arm would be a branch no row takes."

requirements-completed: [KEY-04]  # REQUIREMENTS.md is ticked on the phase's last plan (17-06)

completed: 2026-11-10
status: complete
---

# 17-05: a replay request the capture never saw is an outage on every port

Outcome implemented: **A** (`d04_outcome: A`, 17-01-SUMMARY.md).

## Task 1: RED (`a16d1a6`)

New describe "a replay miss follows one policy per port (ARCH-65, D-04)" in `Capture.test.ts`. `MISSES:
{ readonly [K in PortName]: { leaf: Policy; error: string } }`, so a sixth port is a compile error until it
has a row. The tests are generated over `forEveryPort((d) => d.port)`. Each row runs the leaf and `not(leaf)`
against `snapshot(emptyAnswers)` and asserts `Failed`, the port's error tag and a "not captured" reason
(`reason` for `CustomPredicateError`, `cause` for the others). No port error is built by hand
(PORT_DOUBLE_BUDGET unchanged).

On the 17-04 tree: 15 failed. These were the 8 rows of the four changing ports and the 7 rewritten tests below.
SignatureHistory's 2 rows passed. Every failure was `Decided` (`Deny`, or an allow under `not(leaf)`) where
`Failed` was expected.

## Task 2: Capture.ts (`f3962b0`)

- Deleted `UNSEEN_REQUEST_IS_AN_OUTAGE`. `unseenReply(port): PortReply<never>` always returns
  `PortReply.fail("the capture holds no answer for this <Port> request (not captured)")`.
- Rewrote the docs on `unseenReply` and `replayLayer`. They now say: a miss is an outage on every port, because
  `none` denies the leaf and so grants `not(leaf)` (INV-QD-007, ADR-QD-129). A port added to the registry fails
  closed with no edit. The old paragraph saying the other four ports' misses were "safe only for an un-negated
  leaf" is gone.
- `replayLayer`'s body is unchanged (`replyOf(…) ?? unseenReply(d.port)` now types as `PortReply<A>`).

## Every test whose expectation changed

| Test (new name) | File | Old | New | Why |
|---|---|---|---|---|
| a capture for one resource does not answer another | Capture.test.ts | replay `Deny` (= live) | replay `Failed` | doc-2 is a question the capture never saw. Name kept: still true. |
| a what-if that changed the subject's roles is an outage, not the captured answer | Capture.test.ts | replay `Deny` | `Failed` | dropped roles change the CustomPredicate key, so it is a miss |
| an unseen attribute is an outage, as an unwired port is not | Capture.test.ts | `Deny` | `AttributeResolveError` | miss on AttributeResolver |
| an unseen relationship is an outage, not Unknown | Capture.test.ts | `Deny` | `RelationshipResolveError` | miss on RelationshipResolver |
| an unseen history query is an outage in both directions, not Unknown | Capture.test.ts | `Deny` + "no history is available", both directions | `DecisionHistoryUnavailable` + "not captured", both directions | miss on DecisionHistory |
| an unseen custom predicate is an outage, not false | Capture.test.ts | `Deny` | `CustomPredicateError` | miss on CustomPredicate |
| another port's unseen request is an outage too, never its own default | Capture.test.ts | 4× `Deny` | 4× `Failed` | the WR-04 exception is now the rule |
| a Snapshot source answers from its capture, not from the fixtures: an empty one is an outage | SimulationSource.test.ts | `Deny` | `AttributeResolveError` | empty capture, so a miss. Found by the full devtools run in Task 2. |

The 17-04 hand-off counted six tests. The real number on this tree is eight: seven in `Capture.test.ts`,
including "a capture for one resource does not answer another", and one in `SimulationSource.test.ts`. No
other devtools test failed. `WhatIf`, `Simulation`, `Source`, `PortCalls` and `react/WhatIfTable` stayed green.

## BDD and devtools surface

- No `.feature` or step definition replays a snapshot (`snapshot(`/`replayLayer`/`capturing(`/`emptyAnswers`
  appear only in devtools src/tests). `pnpm test:bdd` 567/567.
- The UI text "A port left empty answers the way an unwired one does" (`Simulator.tsx`, fixtures card) is about
  the **fixture** source, not a snapshot, so it is unchanged. `SimulationSource.ts`/`SimulationSession.ts`
  carry no claim about a snapshot miss.

## Mutation (XC-05)

Scoped run `stryker run stryker.devtools.mjs --mutate packages/devtools/src/model/Capture.ts` on the
committed tree: **1.0000 (51/51)** against the base `17-mutation-base.json` 1.0. No other src file was touched.

## Deviations

1. [Rule 1, scope] Two tests outside the six named by the hand-off pinned a miss answer. These were
   `Capture.test.ts` "a capture for one resource does not answer another" and `SimulationSource.test.ts`'s
   empty-snapshot test. Both were changed for the same reason and are listed above. The first was in the RED
   commit. The second showed up in Task 2's full-suite run, as the plan's action requires.
2. The per-port table has no `"none"` expectation (see key-decisions).

## Gate results

- Task 1 verify (`! … -t "D-04"`): red as required (8 failing rows).
- `pnpm vitest run --project devtools`: 41 files, 1128 tests, green.
- `pnpm typecheck` green. `pnpm lint` exit 0 (pre-existing warnings only).
- Task 2's `UNSEEN_REQUEST_IS_AN_OUTAGE` count check: 0, passes under A.
- `check-house-style.mjs` clean, `check-dod-table.mjs` clean, `pnpm test:bdd` 567/567.
- Not run: `check:pr` (17-06's).

## Deferred to 17-06

- **Spec text:** INV-QD-043 and `spec/behaviors/29-devtools-simulator.md` (and any `06-services.md` /
  `spec/invariants.md` text describing the replay) must say a request the capture never saw fails with the
  port's own typed error on every port, under a leaf and `not(leaf)`, and never answers `none`. Replace the
  "answers as an unwired port does" / "SignatureHistory is the exception" wording. Add the BEH rows for the
  per-port table (reserved BEH-QD-409..418) and traceability.
- **Changeset (`@qadi/devtools`):** a Snapshot replay of an unseen request now fails with the port's typed
  error on AttributeResolver, RelationshipResolver, DecisionHistory and CustomPredicate. It used to deny
  (`undefined` / `Unknown` / `false`), which `not(...)` turned into an allow. Judge Breaking against the 0.11.0
  tag.
- **CCR-QD-407:** record this behaviour change with the key change.
- **ADR-QD-129:** D-04 = A, quoting `_DECISIONS.md`. `Capture.ts` already cites ADR-QD-129.

## Commits

- `a16d1a6` test(17-05): a replay miss on AttributeResolver, RelationshipResolver, DecisionHistory and CustomPredicate must fail closed, red
- `f3962b0` fix(17-05): a replay request the capture never saw is an outage on every port
- `docs(17-05): complete plan`
