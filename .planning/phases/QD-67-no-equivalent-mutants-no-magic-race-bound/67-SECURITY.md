---
phase: "67"
slug: "no-equivalent-mutants-no-magic-race-bound"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-21"
---

# Phase 67 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes two package-private `@qadi/core` modules and one comment:
- `DecisionCache.ts` evicts with `Chunk.splitAt` + `HashMap.removeMany` instead of a guarded loop.
- `SharedComputation.ts` dispatches the claim result through a closed arm table indexed by the tag its own claim step wrote, with the owner arm extracted to `answerOwned`. The claim step's `Effect.sync` block is byte-identical to the base.
- `TraceDiff.ts` gets a comment-only edit.

It also rewrites the I5 race test, adds one bench workload, and adds spec records and an AGENTS.md §5a paragraph. It adds no export (939 before and after), no network, auth, file or schema surface, and no changeset.

Its threats are:
- a single-flight regression that re-opens ARCH-45 I5 (a joiner recomputing a key);
- an eviction that keeps or removes the wrong entries;
- mutation, bench or record evidence that is not what it claims.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| concurrent fibers → `SharedComputation.run` | several fibers ask the same key; one claims, the rest join or hit | the key, the in-flight claim, the cached answer |
| `DecisionCache` → its own `entries`/`insertionOrder` | eviction keeps the two in step | completed decisions (authorization traces) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Evidence | Status |
|-----------|----------|-----------|----------|-------------|----------|--------|
| T-67-01 | Repudiation | a base record taken after a test or source changed | medium | mitigate | `67-mutation-base.json` `head` = eacf89b4 (phase_base), committed in 24f31ef9, the phase's first commit | closed |
| T-67-02 | Repudiation | a scorer passing a duplicated mutant or exempting a survivor by text | medium | mitigate | `67-mutation.mjs` maps lines through `git diff -U0` and counts multiplicity; self-test 11 passed; both planted weaknesses exit 1 | closed |
| T-67-03 | Tampering | a race test passing whether or not the claim step is one synchronous step | high | mitigate | 67-RED-EVIDENCE.md: with the hit check split, the test fails naming `"kWalks":2` (budgets 3, 4, 6); the verifier reproduced it on the shipped source (kWalks 2 at budget 3 gap 40) and restored it byte-identical; the forced cap fails through the cap in 17.85 s, not the 30 s timeout | closed |
| T-67-04 | Tampering | the RED patch or forced cap committed by accident | medium | mitigate | `git diff eacf89b4..HEAD -- packages/core/src/SharedComputation.ts` holds only the dispatch commit e195dd19; the claim step equals the base | closed |
| T-67-05 | Denial of service | Stryker beside vitest, or a cap failure cut short by the timeout | low | mitigate | each Stryker run followed a `pgrep` check; the cap path finished at 17.85 s | closed |
| T-67-06 | Repudiation | a gate, workload set or rule chosen after a candidate run | medium | mitigate | `analyze.mjs` (5% band, geomean ≤ +2%, five named workloads) committed in 14cdd768 and the capacity-bound row in 070ffb6b, both before the candidate runs in 11a16923; the rule is in 67-CONTEXT (2026-11-20) | closed |
| T-67-07 | Tampering | src left patched by a candidate run | medium | mitigate | candidates came from scratch patches; `packages/core/src` equalled phase_base after 67-02 | closed |
| T-67-08 | Repudiation | an `analysis.tsv` not what the committed runs give | low | mitigate | 67-02's verify re-ran the analyzer on the committed runs | closed |
| T-67-09 | Denial of service | host load skewing a candidate arm | medium | mitigate | the owner's quiet-host rule (2026-11-21) passed before both runs; load rose 10.22→16.09 during the table run, which is stated beside the verdict (`house-rules-evidence.md` §2, CCR-QD-458, review IN-04) | closed |
| T-67-10 | Denial of service | an eviction keeping more than `capacity` entries, or none | medium | mitigate | `splitAt(size - capacity)` clamps the count (verifier: −3, NaN, 0, 0.9, 1.5, Infinity); FIFO and `capacity: 0` tests green unedited; the `-`→`+` mutant fails two tests | closed |
| T-67-11 | Tampering | eviction removing a key still in flight | medium | mitigate | eviction reads only completed `entries`; reviewer confirmed `insertionOrder` and `entries` cannot disagree; the race test asserts one walk of `K` and exact FIFO on every run | closed |
| T-67-12 | Repudiation | a comment still describing the loop | low | mitigate | no old-loop claim in `packages/core/src`; the deferred test comments are review IN-01 (audit list) | closed |
| T-67-13 | Tampering | the claim step split or reordered while the dispatch moved, re-opening ARCH-45 I5 | high | mitigate | 67-04's verify compared the claim step's 17 lines with the base byte for byte; reviewer and verifier confirmed one `Effect.sync` joined to the arm by `Effect.flatMap` inside the same `uninterruptibleMask`; the race test is green and RED-capable | closed |
| T-67-14 | Elevation of privilege | an interrupt between the claim and its arm leaving a claim nobody completes | medium | mitigate | the arm runs in the same `uninterruptibleMask` as the claim; `answerOwned` keeps the base's `onExit`/`forkDetach`/`entry.fiber`/`restore` sequence (review) ; `SharedComputation.test.ts` green | closed |
| T-67-15 | Repudiation | a dispatch whose tag mutant survives, claimed closed | medium | mitigate | Stryker close: `SharedComputation.ts` 71/71, tag literals Killed; `tag-mutants.sh` killed all ten; removing an arm is TS2741 | closed |
| T-67-16 | Tampering | the candidate the rule did not take committed | low | mitigate | `67-DISPATCH.md` `choice: table`; the committed source is the table candidate (SHA-256 `0af92391…`); no `Match.value` in `SharedComputation.ts` | closed |
| T-67-17 | Repudiation | a run of record repeated until it passes | medium | mitigate | one run (0e3f9cbd), `# gate: pass`, all run files committed | closed |
| T-67-18 | Tampering | a source change after the measurement | medium | mitigate | `git diff 0e3f9cbd..HEAD -- packages scripts package.json` empty (fixer, re-reviewer, verifier) | closed |
| T-67-19 | Repudiation | an `analysis.tsv` or `to-base.patch` not what the run measured | low | mitigate | analyzer reproduces `analysis.tsv` byte for byte; `to-base.patch` equals the measured-head-to-base diff over three files | closed |
| T-67-20 | Denial of service | host load skewing the run of record | medium | mitigate | quiet-host check passed (load 9.43); 1-minute load fell to 6.32 during the run; twelve load files committed | closed |
| T-67-21 | Repudiation | a spec text still describing the loop or the two-check dispatch | medium | mitigate | BEH-QD-166 and INV-QD-379 checked against the code by reviewer and verifier; `spec/overview.md` has no such row | closed |
| T-67-22 | Repudiation | a CCR row citing a stale revision, or a choice the rule did not take | medium | mitigate | CCR-QD-458 cites 21-decision-cache 1.12, invariants 1.166, traceability 1.233, README 1.272, house-rules-evidence 1.3, each equal to its line 8 (`ccr-row.mjs` 5/5, verifier); the row states `table` | closed |
| T-67-23 | Tampering | a minted or reused id | low | mitigate | reserved ids only; ADR-QD-180, BEH-QD-671–675 and INV-QD-380 appear only in the CCR row; `next-id.mjs` never run; traceability strict 21/0 | closed |
| T-67-24 | Elevation of privilege | an export added by new local types, or a release | low | mitigate | api-surface 939 unchanged; no changeset, version, publish or tag commit in `eacf89b4..HEAD`; nothing pushed | closed |
| T-67-25 | Repudiation | a mutation drop hidden as Ignored, or a survivor matched away by text | medium | mitigate | Ignored counts unchanged (2→2, 2→2, 8→8); static run's nine survivors sit on pre-existing lines by diff mapping | closed |
| T-67-26 | Repudiation | a `check:pr` result not of the final tree | medium | mitigate | `check:pr` exit 0 on dfeffed6 (67-07) and again on 76332d92 after every fix; later commits touch `.planning/` only | closed |
| T-67-27 | Tampering | a late fix leaving the CCR row stale, or an executable edit after the bench | medium | mitigate | the iteration-2 fix (82f87b4f) re-aligned the row; no executable path changed after 0e3f9cbd | closed |
| T-67-28 | Denial of service | Stryker or `check:pr` beside another heavy process | low | mitigate | each ran alone after a `pgrep` check | closed |
| T-67-29 | Repudiation | an equivalent survivor silenced by a suppression comment | medium | mitigate | no `Stryker disable` in the diff (close scan); no open mutant at the close | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-67-01 | T-67-SC | No dependency is installed, upgraded or removed in this phase | plan-time disposition (67-01..67-07) | 2026-11-21 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **Review IN-01:** the negative, NaN and fractional capacity tests' comments still name the removed loop. They were left unedited because the phase keeps every test outside the race test unedited (WX-06).
- **Review IN-02:** the `oneSided` assertion is redundant with `capped`. It is kept by the owner's decision.
- **Re-review IN-03:** the scorer's self-test covers `dirtyReasons`, not its `refuseDirty` call sites.
- **The dispatch choice rests on one run per candidate**, with base spreads (6–15%) above the band. The rule was fixed beforehand and followed, and the noise is stated in `house-rules-evidence.md` §2.
- **Static survivors on pre-existing lines** (`SharedComputation.ts:89-99`, `DecisionCache.ts:141`).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-21 | 30 | 30 | 0 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-21
