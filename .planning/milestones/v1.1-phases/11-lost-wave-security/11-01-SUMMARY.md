---
phase: 11-lost-wave-security
plan: 01
subsystem: audit
tags: [security, signatures, explain, test-first, lost-wave-port]
phase_base: 5736c96

requires: ["10-03"]
provides:
  - "`signatureObligationHandler` refuses a discharge whose resource has no string id, before `capture` (SEC-01)"
  - "`hasSignature(…, { scope: \"Any\" })` on another resource denies after such a discharge, both wiring modes (SEC-02, live defect)"
  - "`explain()` and the concept page say a signature's \"Any\" is subject-wide (SEC-04, code half)"
  - "Phase-base mutation scores for audit and core (`11-mutation-base-audit.json`, `11-mutation-base-core.json`)"
affects: [11-03, 11-05, 11-06, 11-07]

actuals:
  tokens: 40000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .planning/phases/11-lost-wave-security/11-mutation-base-audit.json
    - .planning/phases/11-lost-wave-security/11-mutation-base-core.json
    - .planning/phases/11-lost-wave-security/11-01-SUMMARY.md
  modified:
    - packages/audit/src/SignatureCapturePort.ts
    - packages/core/src/Resource.ts
    - packages/core/src/Explanation.ts
    - packages/audit/test/SignatureCapturePort.test.ts
    - packages/audit/test/SignatureLedger.test.ts
    - packages/audit/test/SignatureLoop.test.ts
    - packages/core/test/Explanation.test.ts
    - apps/website/src/content/docs/docs/concepts/signatures.md

key-decisions:
  - "D-52-d (A), taken per D-02: refuse an unkeyable discharge before `capture` (premise unchanged on main)"
  - "D-52-e (A), taken per D-02: keep INV-QD-120's meaning of a signature's \"Any\", fix the descriptions"
  - "No `checkpoint:decision` in this plan; `_DECISIONS.md` has no row for 11-01"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "Non-string-id discharge refused, capture not called, nothing appended"
    requirement: SEC-01
    verification:
      - kind: test
        ref: "SignatureCapturePort.test.ts (3 resources), SignatureLedger.test.ts inverted test"
        status: pass
    human_judgment: false
  - id: D2
    description: "scope 'Any' on doc-99 denies after a discharge on { id: 7 }, capture-persists and ledger modes"
    requirement: SEC-02
    verification:
      - kind: test
        ref: "SignatureLoop.test.ts, two tests"
        status: pass
    human_judgment: false
  - id: D3
    description: "explain() HasSignature 'Any' wording; concept page"
    requirement: SEC-04
    verification:
      - kind: test
        ref: "Explanation.test.ts; pnpm spec:website-examples"
        status: pass
    human_judgment: false
---

# Phase 11 Plan 01: Refuse an unkeyable signature discharge — Summary

A signature discharged on a resource with a non-string or missing id is now refused before `capture` runs, so it can
no longer be stored subject-wide and over-grant `hasSignature(…, { scope: "Any" })` on every resource. Ported from lost
commit `8900b7e` (refusal and wording only; the keyed store is 11-03).

**phase_base:** `5736c96` (Phase 10's last commit; this plan's first commit is `902142b`).

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (RED) | `902142b` | test(11-01): pin the non-string-id signature discharge and the 'Any' over-grant (RED) |
| 2 | `5a9979a` | fix(11-01): refuse a signature discharge whose resource has no string id |
| 3 | `469d90b` | fix(11-01): say a signature's scope "Any" is subject-wide, not any resource |

## XC-06 evidence: RED on the phase base

All run against unmodified `src/` at `902142b` (tests only changed). Every other test in the four files passed.

| Test | Failing assertion |
|------|-------------------|
| SignatureCapturePort: "…not a string is refused before capture… (a numeric id / an object id / no id at all)" ×3 | `AssertionError: expected false to be true` (message "the handler must refuse the discharge": the handler succeeded) |
| SignatureLedger: "a resource with no string id is refused: the discharge fails and the ledger stays empty" | `AssertionError: expected 'Success' to equal 'Failure'` |
| SignatureLoop (capture persists): "a signature discharged on a non-string id does not grant scope 'Any' on another resource" | `AssertionError: expected 'Allow' to equal 'Deny'`, the live over-grant on `doc-99` |
| SignatureLoop (ledger): same title | `AssertionError: expected 'Allow' to equal 'Deny'`, the live over-grant on `doc-99` |
| Explanation: "HasSignature's detail names the signer role and says a 'Any' scope is subject-wide" | Expected `"…from a 'manager' on file subject-wide, not for a resource"`, Received `"…from a 'manager' for anything"` |

The no-resource test ("a question with no resource or action…", formerly :115) passed throughout, unchanged.

## The fix

`signatureObligationHandler` (`packages/audit/src/SignatureCapturePort.ts`), right after `captureRequestOf`:
`request.resource !== undefined && request.resourceId === undefined` → `Effect.fail(new SignatureCaptureError({ reason:
"the discharged resource has no string id, so a signature for it cannot be keyed to it" }))`. Doc comments on
`SignatureCaptureRequest.resourceId`, the handler and `resourceIdOf` (comment only, body unchanged) say so.

`Explanation.ts`: HasSignature's `"Any"` renders " on file subject-wide, not for a resource"; HasActed's phrases are
untouched (for history "Any" does mean any resource). The module doc made no same-meaning claim, so it is unchanged.
The concept page keeps the shape claim and adds that the meaning of `scope: "Any"` differs from `hasActed`'s.

**"anything" in `Explanation.ts` (`grep -c`, lines):** 5 before → 4 after (module doc :7, HasActed :378/:385, :449 comment).

## Gate results

- Task 1 verify: the grep and `!` RED gates pass on `902142b`; the no-resource test passes; both base mutation JSONs written and non-empty. Pass.
- Task 2 verify: three audit files 36/36; `has no string id` count 1; `pnpm typecheck` 0; `pnpm lint` 0 (house-style clean, budgets unchanged). Pass.
- Task 3 verify: Explanation 51/51; `subject-wide, not for a resource` count 1; "anything" count 4; concept page grep; `pnpm spec:website-examples` (40 blocks compile). Pass.
- `pnpm test:bdd`: 561/561 (no feature edited). Pass.
- XC-05 mutation (phase base vs after): `SignatureCapturePort.ts` 88.0% → 91.4%, `SignatureLedger.ts` 100% → 100%,
  `Explanation.ts` 98.67% → 98.67% (scoped `--mutate` run), `Resource.ts` 100% (comment-only change). No touched file dropped.

## Deviations from Plan

1. **[Rule 1 - Bug] The RED unit test did not typecheck.** Reading `result.failure.reason` on the union
   `SignatureCaptureError | SignatureLedgerError` is TS2339 (vitest does not typecheck, so it ran RED regardless). Fixed in
   `5a9979a` by narrowing on `_tag` before reading `reason`; the RED assertion itself was unchanged.
2. **Mutation base timing.** Both base Stryker runs were started before any test edit; core test/src edits waited
   until the core run's sandbox and initial test run were done, so the base scores are for the untouched tree.
3. **Test helpers.** `SignatureCapturePort.test.ts` has no `portReturning`/`signed`; the unit test uses an inline
   counting port, as the file's other tests do. The ledger test does use `portReturning(signed(), calls)`.
4. Planner note: the plan's `<interfaces>` cite `1721a42`; line numbers matched on `5736c96` (no source drift since).

## Threat Flags

None new. T-11-01 and T-11-02 mitigated and pinned by the tests above; T-11-03 by the Explanation test.

## Notes for next plans

- 11-03 changes `ledger.append` to take a key: the refusal sits before `capture`, so it is unaffected; keep the
  `doc-99` loop tests green.
- `reports/mutation/mutation.json` now holds only a scoped Explanation.ts run; the full core base is in
  `11-mutation-base-core.json`.
