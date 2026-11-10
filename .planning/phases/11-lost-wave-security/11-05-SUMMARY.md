---
phase: 11-lost-wave-security
plan: 05
subsystem: audit
tags: [security, signatures, ledger, conformance, bdd, docs, lost-wave-port]

requires: ["11-03"]
provides:
  - "`checkSignatureLedger(ledger, options?)` and `checkSignatureHistoryScoping(seed, options?)` in `@qadi/audit`, returning `LedgerConformanceViolation`s (`Foreign` | `Missing`) as data, independent of any test framework (SEC-03)"
  - "The capture-persists store in `SignatureLoop.test.ts` passes `checkSignatureHistoryScoping`"
  - "BDD: a signature cannot be captured for a document with no string id, and is then not on file subject-wide (`@REQ-QD-034`)"
  - "The audit README and the website signatures page say what a ledger adapter implements, how to check it, and what a signature's `scope: \"Any\"` reads (SEC-04, docs half)"
affects: [11-06, 11-07]

actuals:
  tokens: 15000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns: ["a shipped conformance check returns violations as data; adapter authors run it in their own suite"]

key-files:
  created:
    - packages/audit/src/SignatureLedgerConformance.ts
    - packages/audit/test/SignatureLedgerConformance.test.ts
    - .planning/phases/11-lost-wave-security/11-05-SUMMARY.md
  modified:
    - packages/audit/src/index.ts
    - packages/audit/src/SignatureLedger.ts
    - packages/audit/test/SignatureLoop.test.ts
    - features/features/signatures/signatures.feature
    - features/step-definitions/SharedWorld.ts
    - features/step-definitions/SignatureLoopSteps.ts
    - packages/audit/README.md
    - apps/website/src/content/docs/docs/packages/audit/signatures.md

key-decisions:
  - "No `checkpoint:decision` in this plan; `_DECISIONS.md` has no row for 11-05"
  - "Lost ids rewritten (D-06): the module cites ADR-QD-117 (lost ADR-QD-110); no BEH/ARCH id is cited in code. ADR-QD-117 itself is written by 11-06"
  - "Website fence: ported the lost map-ledger fence (shows the adapter shape and the check) rather than the plan's preferred `checkSignatureLedger(SignatureLedgerTest().ledger)` one-liner; it compiles under `pnpm spec:website-examples`"
  - "`stryker.audit.mjs` unchanged: its `packages/audit/src/**/*.ts` glob already mutates the new module"

patterns-established: []

requirements-completed: [SEC-03, SEC-04, XC-04, XC-05]

coverage:
  - id: D1
    description: "Conformance suite: [] for the double and a faithful map; Foreign for case-folding, trimming, NFC, optional-filter and null-wildcard; Missing for last-entry-per-key; store failure is an error; namespaces isolate; a shared table's foreign row is ignored"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "packages/audit/test/SignatureLedgerConformance.test.ts (13 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Capture-persists store passes checkSignatureHistoryScoping"
    requirement: SEC-03
    verification:
      - kind: unit
        ref: "packages/audit/test/SignatureLoop.test.ts 'the store passes checkSignatureHistoryScoping…'"
        status: pass
    human_judgment: false
  - id: D3
    description: "BDD scenario: no string id → discharge refused, not on file subject-wide"
    requirement: SEC-03
    verification:
      - kind: integration
        ref: "pnpm test:bdd (562/562)"
        status: pass
    human_judgment: false
  - id: D4
    description: "README + website page: keyed adapter, checkSignatureLedger, scope Any"
    requirement: SEC-04
    verification:
      - kind: other
        ref: "Task 3 greps + pnpm spec:website-examples (41 blocks compile)"
        status: pass
    human_judgment: false
  - id: D5
    description: "No touched file's audit mutation score fell; new module 100%"
    requirement: XC-05
    verification:
      - kind: other
        ref: "pnpm exec stryker run stryker.audit.mjs + compare one-liner vs 11-mutation-base-audit.json"
        status: pass
    human_judgment: false

completed: 2026-11-10
status: complete
---

# Phase 11 Plan 05: Ledger conformance suite — Summary

**`@qadi/audit` now ships `checkSignatureLedger` and `checkSignatureHistoryScoping`. They write a fixed table of
adversarial pairs to a real store, read each pair back, and report any store that merges two distinct keys
(`Foreign`) or drops an entry (`Missing`).**

Ported from lost commit `8900b7e`.

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (RED) | `bdfefcf` | test(11-05): pin the ledger conformance suite against the double, a faithful map and six wrong adapters (RED) |
| 1 | `799964f` | feat(11-05): ship checkSignatureLedger and checkSignatureHistoryScoping for ledger adapters |
| 2 | `b0d235a` | test(11-05): a signature cannot be captured for a document with no string id (BDD) |
| 3 | `214329b` | docs(11-05): tell ledger adapter authors what to implement, how to check it, and what scope Any reads |
| 3 | `a21cb8a` | test(11-05): a row in a shared table the fixture did not write is not a violation |

RED: the test failed with `Cannot find module '../src/SignatureLedgerConformance.ts'`. The BDD scenario passed as soon
as its steps existed, because 11-01 already refuses the discharge. It pins that refusal; it does not reproduce a defect.

## New exports (for 11-06's overview rows, gate 13)

`@qadi/audit`, via `export * from "./SignatureLedgerConformance.ts"`, placed alphabetically between `SignatureLedger.ts` and
`SignatureLedgerTest.ts`:
- `checkSignatureLedger`
- `checkSignatureHistoryScoping`
- `LedgerConformanceViolation`, which is both a type and a `Data.taggedEnum` value
- `LedgerConformanceOptions` (type)

## BDD

The new scenario is in `features/features/signatures/signatures.feature`, under the feature-level tags `@signatures @REQ-QD-034`. The file has no
scenario-level tags. The new step reads the outcome with `Result.isFailure`. It reuses the existing "not on file for the subject at large" step.

## Docs

- README: there is a new "Implementing a ledger" subsection, plus a paragraph on how a resource with no string id is refused and what `scope: "Any"` reads.
- Website `packages/audit/signatures.md`: the same prose, plus a compiled fence. The fence implements a map ledger and runs
  `checkSignatureLedger` on it.
- Neither page mentions `signaturesFor` (it was already gone before this plan).

## Mutation (audit, full run at `a21cb8a`)

| File | Base | After |
|------|------|-------|
| `SignatureLedgerConformance.ts` | none | 100% (84/84) |
| `SignatureLedger.ts` | 100% | 100% |
| `SignatureLedgerTest.ts` | 100% | 100% |
| `SignatureCapturePort.ts` | 88.0% | 91.43% |
| All files | n/a | 93.22% (break 80) |

The compare one-liner against `11-mutation-base-audit.json` reports OK.

## Gate results

- Task 1 verify: the greps pass. Conformance and loop tests: 21/21, then 22/22 after `a21cb8a`. `pnpm typecheck` 0, `pnpm lint` 0 (house-style clean, budgets unchanged), `pnpm circular` reports no cycles.
- Task 2 verify: the greps pass, `pnpm test:bdd` 562/562, `pnpm lint` 0, `pnpm typecheck` 0.
- Task 3 verify: the greps pass, `pnpm spec:website-examples` compiles 41 blocks, Stryker for audit exits 0, the compare reports OK.
- Full audit vitest project: 336/336.
- Gate 13 (`pnpm spec:api`) was not run. It stays red for the four new exports until 11-06 adds their rows, which is expected.

## Deviations from Plan

1. **[Rule 2 — missing test] A surviving mutant in the ported module.** The `origin === undefined` guard tells a
   row the fixture did not write (in a shared table) apart from a violation, and no test covered it. The first
   Stryker run scored the module 98.81% (83/84), the same as the lost run. I added a test that seeds a shared table under a fixture key.
   I confirmed by hand that it kills the mutant, and the module is now 100%.
2. Test adaptations from the lost file: the test dispatches on the violation tag with `Match.tagsExhaustive` instead of a `_tag` ternary (XC-04). It
   reads the store failure with `Result.isFailure` and also checks that the error is the store's own `SignatureLedgerReadError`.
3. The e-acute fixture pairs are written as `é` and `é` escapes, so the two forms cannot be merged by an editor.
4. The module doc in `SignatureLedger.ts` now names `checkSignatureLedger`, as 11-03's notes suggested.

## Threat Flags

None new. T-11-14 (collation over-grant) is mitigated: the case-folding, trimming and NFC tests each pin a `Foreign`
result. T-11-15 (lossy store) is mitigated by the keep-last test, which pins `Missing`. T-11-16 (writing to a shared table) is mitigated by the
`namespace` option, the namespace test and the shared-table test. The docs call both checks test aids that nothing runs automatically.

## Notes for next plans

- 11-06: add overview rows for the four exports above, and write ADR-QD-117 (the module already cites it). BEH-QD-339 can name
  the conformance checks.
- 11-07: the pending audit changeset should mention the conformance checks.
