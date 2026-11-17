---
phase: "50"
slug: "what-a-leaf-needs-from-the-request-stated-once"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 50 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Request → leaf judgement | `Walk` and `toPredicate` read `LeafNeeds.ts`'s table to decide whether a leaf can be judged against the request it was given (INV-QD-011) | Whether an action, a resource or a resource id was supplied; an absence fails closed as `MissingAction`/`MissingResource`/`MissingResourceId` |
| Evidence → decision | The bench gate and the mutation comparison decide whether the phase may change `src` | Committed `bench/gate/`, `bench/after/`, `50-mutation-base.json`, `50-mutation-after.json` |
| Branch → release | Nothing in this phase versions, tags, pushes or publishes | One `@qadi/core` patch changeset only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-50-01 | Repudiation | `50-mutation-base.json` | medium | mitigate | Measured on the untouched base and committed alone as `75580ec0`, parent `phase_base` `5ab8d0c0` (50-01) | closed |
| T-50-02 | Tampering | Survivor comparison | medium | mitigate | Sorted survivor identities stored; 50-06's comparer found `Walk.ts`'s 16 survivors identical (D-13) | closed |
| T-50-03 | Repudiation | Reserved ids | low | mitigate | Whole-id check at `phase_base` (50-01); CCR-QD-441 lists Used/Unused; 50-08 id scan clean | closed |
| T-50-04 | Tampering | `bench/ab.sh` leaving the prototype applied | high | mitigate | `git apply --check`, EXIT/INT/TERM trap, dirty-tree refusal (`bench/ab.sh`); src clean after both runs (50-03, 50-06) | closed |
| T-50-05 | Repudiation | Bench statistic | medium | mitigate | `bench/analyze.mjs` decides on the median of per-run minima (D-03a); `--self-test` 4 passed | closed |
| T-50-06 | Tampering | Characterisation oracle | medium | mitigate | `LeafFixtures.ts` hand-written from D-05, names no `LeafNeeds`/`leafTags`; green on the base before any src edit (`f6322ff9`) | closed |
| T-50-07 | Tampering | Gate run on a dirty tree | high | mitigate | Precondition + `done.txt` + clean `packages/core/src` after the gate (50-03) | closed |
| T-50-08 | Repudiation | Verdict | medium | mitigate | `50-BENCH.md` `verdict: pursue` follows `bench/gate/analysis.tsv` (`# gate: pass`, `# slower: 0`) | closed |
| T-50-09 | Elevation of Privilege | Change after a rejection | high | mitigate | Verdict guard as the first step of 50-04..50-08; each printed `bench verdict: pursue` | closed |
| T-50-10 | Elevation of Privilege | A leaf judged without its input | high | mitigate | 126 evaluate cells (`LeafMatrix.test.ts`) unchanged and green; `LEAF_NEEDS` is `as const satisfies` over every leaf tag (TS2741 proof, 50-04) | closed |
| T-50-11 | Tampering | Check-order drift | medium | mitigate | Swapped-order negative control failed 5 tests (50-04 SUMMARY), not committed | closed |
| T-50-12 | Information Disclosure | Package-private module on the barrel | low | mitigate | `packages/core/src/index.ts` unchanged since `phase_base`; `LeafNeeds.test.ts` asserts no barrel export | closed |
| T-50-13 | Elevation of Privilege | `toPredicate` row filter without its input | high | mitigate | `absenceOf(p, supplied)` before planning (`Predicate.ts`); 42 toPredicate cells and the agreement property green | closed |
| T-50-14 | Information Disclosure | Port span missing on a resource-id absence | medium | mitigate | `readScoped`: `annotateQuestion` (`PortAccess.ts:243`) before `errorOf({ _tag: "ResourceId", relation })` (`:248`); PortSpan tests green | closed |
| T-50-15 | Tampering | `MissingAction.expected` key change | low | accept | `expected` is `Schema.optional` (`Errors.ts:78`), wire-identical; see Accepted Risks | closed |
| T-50-16 | Tampering | After-run leaving `to-base.patch` applied | high | mitigate | Same trap and `done.txt`; src clean after 50-06's run | closed |
| T-50-17 | Repudiation | Mutation comparer | medium | mitigate | Base JSON and Stryker config unchanged since `75580ec0`; comparer printed `WX-05 holds (D-13 for Walk.ts)` | closed |
| T-50-18 | Repudiation | New-file survivor | low | mitigate | The one `LeafNeeds.ts` survivor (`isActionLeaf`, equivalent) argued in 50-06 SUMMARY | closed |
| T-50-19 | Repudiation | ADR numbers | medium | mitigate | ADR-QD-163 tables generated from both committed `analysis.tsv` files; worst rows (+8.7%, +9.3%) present | closed |
| T-50-20 | Tampering | Id reuse | low | mitigate | CCR-QD-441 row "Unused: none."; 50-08 scan clean | closed |
| T-50-21 | Information Disclosure | Changeset misdescribing the wire | low | mitigate | `.changeset/leaf-needs-stated-once.md`: `@qadi/core` patch naming the `expected` key, wire-invisible | closed |
| T-50-22 | Tampering | Out-of-scope edits | medium | mitigate | 50-08 allow-list scan over `git diff --name-only phase_base HEAD`: clean | closed |
| T-50-23 | Elevation of Privilege | Accidental release | high | mitigate | 50-08 release check: no tag contains `phase_base`, no CHANGELOG/package.json change, HEAD on no remote branch | closed |
| T-50-24 | Repudiation | Test-first order | low | mitigate | 50-08 commit-order scan: characterisation, table test and D-08a test precede the source they guard | closed |
| T-50-SC | Tampering | Supply chain | high | mitigate | No install task; no `package.json`, `packages/*/package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `phase_base` | closed |

*Status: open · closed*
*Severity: low · medium · high*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Threat ID | Risk | Rationale | Accepted |
|-----------|------|-----------|----------|
| T-50-15 | `toPredicate`'s `MissingAction` no longer carries an own `expected: undefined` key (D-08a) | `expected` is `Schema.optional`: an own `undefined` and an absent key encode identically, so no codec consumer sees it; recorded in the patch changeset and ADR-QD-163 | plan-time (50-05), 2026-11-16 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 25 | 25 | 0 | orchestrator (ASVS L1, register authored at plan time; grep-level evidence) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16
