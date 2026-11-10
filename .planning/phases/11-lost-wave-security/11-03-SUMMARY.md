---
phase: 11-lost-wave-security
plan: 03
subsystem: audit
tags: [security, signatures, ledger, keyed-store, test-first, lost-wave-port]

requires: ["11-01"]
provides:
  - "`SignatureLedgerShape` is a keyed store: `append(key, entry)` / `entriesAt(key)` over an opaque `SignatureLedgerKey` (SEC-02)"
  - "The exact-pair read rule lives once, in `signatureHistoryFromLedger`; a foreign or forged row fails the read as `SignatureHistoryUnavailable` (cause `SignatureLedgerReadError`)"
  - "`ledgerKeyOf` = `JSON.stringify([1, subjectId, resourceId ?? null])`, golden bytes pinned"
  - "`signatureHistoryFromSignatures` groups by the requirement-free projection of `signatureHistoryPort.key`"
affects: [11-05, 11-06, 11-07]

actuals:
  tokens: 60000
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns: ["opaque branded store key minted by one function; the reader re-derives each row's key"]

key-files:
  created:
    - packages/audit/test/SignatureLedger.tst.ts
    - .planning/phases/11-lost-wave-security/11-03-SUMMARY.md
  modified:
    - packages/audit/src/SignatureLedger.ts
    - packages/audit/src/SignatureLedgerTest.ts
    - packages/audit/src/SignatureCapturePort.ts
    - packages/core/src/SignatureHistory.ts
    - packages/audit/test/SignatureLedger.test.ts
    - packages/core/test/SignatureHistory.test.ts
    - packages/core/test/FieldPath.test.ts

key-decisions:
  - "D-52-b (B), taken per D-02: a ledger-owned, versioned key (`[1, subject, resource|null]`), golden bytes plus a law test"
  - "D-52-c (A), taken per D-02: a foreign or forged row fails the read"
  - "D-52-h (A), taken per D-02: the ledger is only in the pending changeset, so 11-07 amends it in place (no Breaking entry)"
  - "No `checkpoint:decision` in this plan; `_DECISIONS.md` has no row for 11-03"
  - "Moved premise (two-way, not a checkpoint per D-02): main's `signatureHistoryPort.key` also keys `meaning`/`signerRole` (INV-QD-043), so the fixture and the law test use its requirement-free projection"

patterns-established: []

requirements-completed: []

coverage:
  - id: D1
    description: "Foreign row and forged row each fail the read; hasSignature scope 'Any' does not allow"
    requirement: SEC-02
    verification:
      - kind: test
        ref: "SignatureLedger.test.ts, 'derives the read rule and refuses foreign rows' (5 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Differential ledger vs fixture, requirement-carrying queries read the same pair, key law, golden bytes"
    requirement: SEC-02
    verification:
      - kind: test
        ref: "SignatureLedger.test.ts 'properties' (4 tests); SignatureHistory.test.ts (2 pins)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Shape and key pinned at the type level"
    requirement: SEC-02
    verification:
      - kind: test
        ref: "SignatureLedger.tst.ts (5 type tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Coverage and touched files' mutation scores held"
    requirement: XC-05
    verification:
      - kind: command
        ref: "pnpm coverage; stryker audit + core with the plan's compare one-liner"
        status: pass
    human_judgment: false
---

# Phase 11 Plan 03: The signature ledger is a keyed store — Summary

An adapter no longer implements the read rule. It stores entries under an opaque key and returns exactly what was stored
under that key. `signatureHistoryFromLedger` computes the key from the query, checks every returned row, and fails
closed if a row came from another key or was signed by someone else. Ported from lost commit `8900b7e`, minus the
conformance suite (11-05) and the spec (11-06).

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (RED) | `4aa4cfb` | test(11-03): pin the keyed ledger's read rule, key law and shape (RED) |
| 2 | `bb9a689` | feat(11-03): make the signature ledger a keyed store; derive the exact-pair read once |
| 3 | `cf98517` | test(11-03): hold SignatureLedger.ts at 100% mutation: a forged row names its own cause |
| 3 | `f34b418` | test(11-03): assert shapeOf directly so the core mutation gate holds |

## XC-06 evidence: RED on the post-11-01 tree (`b74e072`)

- `SignatureLedger.test.ts`: 15 of 24 tests failed, all for the missing keyed store (`ledgerKeyOf is not a function`,
  `history.signaturesFor is not a function`, `instanceof … undefined` for `SignatureLedgerReadError`). The refusal tests
  from 11-01 still passed.
- `SignatureLedger.tst.ts`: failed (the exports do not exist).
- **Foreign-row Allow, observed:** a probe (scratch test, not committed) on the old pass-through gave
  `signatureHistoryFromLedger` a ledger whose `signaturesFor` answered the `doc-1` row for every query.
  `decide(hasSignature("approved", { scope: "Any" }), { resource: { id: "doc-2" } })` returned **`Allow`**. The same
  adapter now fails the read with `SignatureHistoryUnavailable`.
- Core `SignatureHistory.test.ts`: the two new cases (colliding-looking pairs; a query with `meaning` + `signerRole`
  reads the pair's rows) **passed on the old tree**. They pin behaviour main already had, as the plan expected.

## The moved premise

On `main`, `signatureHistoryPort.key` keys `[subjectId, resourceId ?? null, meaning ?? null, signerRole ?? null]`
(INV-QD-043). The lost commit grouped the fixture by the full port key. Doing that on `main` would split a pair by
requirement and hide rows. Handled in three places:
- `signatureHistoryFromSignatures` groups and looks up by `signatureHistoryPort.key([{ subjectId, resourceId }])`, so
  requirement fields are always absent from the key. It builds the branded ids with `makeSubjectId`/`makeResourceId`
  (no `as`).
- `ledgerKeyOf` reads only `subjectId`/`resourceId`, so a `SignatureQuery` with requirements maps to the same key.
- Tests: the differential property checks every query with and without a requirement on both paths. The key law
  compares against the requirement-free projection. A unit test checks a query with `meaning` + `signerRole` on both
  the ledger and the core fixture.

## New exports (for 11-06's overview rows and 11-07's changeset amendment)

`@qadi/audit` (through `export *` of `SignatureLedger.ts`): `SignatureLedgerKey` (type), `LedgerPair` (type),
`ledgerKeyOf`, `SignatureLedgerReadError` (`Data.TaggedError`, fields `key`, `cause`; SCHEMA_ERROR_BUDGET unchanged).
Shape change: `SignatureLedgerShape.signaturesFor` is removed, `append` takes `(key, entry)`, and `entriesAt(key)` is new.
`SignatureLedger.append(entry)` (the static) keys the entry itself. `SignatureLedgerTest` keeps its signature.
`pnpm spec:api` (gate 13) stays red for these exports until 11-06 adds them (by design, not run here).

No ADR id is cited in code. The lost `ADR-QD-110` references were removed; 11-06 writes ADR-QD-117.

## Baselines → now

| Count | Before | After |
|-------|--------|-------|
| `signaturesFor` in `packages/audit/src/SignatureLedger.ts` | 3 | 1 (the `SignatureHistory` layer's member) |
| `ledgerKeyOf` in `packages/audit/src` | 0 | 10 (Ledger 8, CapturePort 2) |
| `resourceId ?? null` in core `SignatureHistory.ts` | 3 | 1 (the port key) |

## Gate results

- Task 1 verify: pass (tst exists, golden bytes present, audit ledger suite red, core suite green).
- Task 2 verify: audit SignatureLedger/SignatureLoop/SignatureCapturePort 47/47, core SignatureHistory 11/11, tstyche
  5/5, all three counts met, `pnpm typecheck` 0, `pnpm lint` 0 (house-style clean, budgets unchanged), `pnpm test:bdd` 561/561.
- Task 3 verify: `pnpm coverage` exit 0 (4081 tests, at final HEAD); audit Stryker + compare OK; core Stryker (full) +
  compare OK.
- Full audit project 322/322 at final HEAD.

## Mutation scores (phase base → after)

| File | Base | After |
|------|------|-------|
| `packages/audit/src/SignatureLedger.ts` | 100% | 100% (26/26; was 95.65% before `cf98517`) |
| `packages/audit/src/SignatureLedgerTest.ts` | 100% | 100% (13/13) |
| `packages/audit/src/SignatureCapturePort.ts` | 88.0% | 91.43% (same three survivors as after 11-01) |
| `packages/core/src/SignatureHistory.ts` | 82.72% | 84.52% |
| `packages/core/src/FieldPath.ts` (untouched) | 91.79% | 93.85% (see deviation 2) |

## Deviations from Plan

1. **[Rule 1 - Bug] Wrong refusal message for a forged row.** The ported code gave one cause ("stored under another
   key") for both refusals, so a forged row was misdescribed, and the string's mutant survived (95.65%). Each refusal now
   names its own cause, both pinned (`cf98517`).
2. **[Rule 3 - Blocking] The core compare failed on a file this plan does not touch.** `FieldPath.ts` scored 178/195
   against a 179/195 base. A scoped run at `b74e072` (before this plan, in a throwaway worktree, `--inPlace`) also gave
   178/195, so 11-01/11-02 or a base-run timeout caused it, not this plan. I did not weaken the gate. I added three
   direct `shapeOf` assertions that kill five real survivors (183/195), then reran the full core Stryker run (`f34b418`).
3. Tests added beyond the lost commit: `entries()` append order across keys (kills the multimap's log mutants), "one
   foreign row among matching ones", the decision's `Allow` on a matching row, the requirement-carrying query, the
   query/entry key law, and the requirement axis in the differential.
4. Doc comments drop the lost `ADR-QD-110` and the `checkSignatureLedger` mention (11-05 adds it).

## Threat Flags

None new. T-11-08 (foreign row) and T-11-09 (forged signer) are mitigated in `signatureHistoryFromLedger` and pinned. T-11-10
(requirement-keyed grouping) is mitigated by the requirement-free projection and pinned. T-11-11 (collisions) is pinned by the
golden bytes, the colliding-pair test and the key law.

## Notes for next plans

- 11-05: the conformance suite targets `entriesAt(key)`; `SignatureLedgerReadError` and `ledgerKeyOf` are in place.
  Module doc in `SignatureLedger.ts` could name `checkSignatureLedger` once it exists.
- 11-06: spec text that still describes a ledger's `signaturesFor` (BEH-QD-256/326, ADR-QD-105) needs the keyed
  shape; overview rows for the four new exports (gate 13).
- 11-07: amend `.changeset/signature-capture-keyed-by-question.md` for the shape change (D-52-h); `FieldPath.test.ts`
  gained tests only (no changeset needed).
- `reports/mutation/mutation.json` and `reports/mutation-audit/mutation.json` hold full runs at `f34b418`.
