---
phase: "59"
slug: "admission-produces-the-one-walk-environment"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-19"
---

# Phase 59 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Caller's question → walk environment | What the request supplied decides whether a resource-reading leaf fails closed (`MissingResource`) or reads a value | `resource`, `action`, the supplied flags |
| `Walk.ts` (package-private) → public surface | An export added for a type test must not become importable API | `evaluateNode` |
| Benchmark harness → source tree | `ab.sh` applies and reverses a patch to `packages/core/src` around each run | Source files |
| Phase evidence → gate | The D-15 comparer and the bench analysis decide WX-05 and WENV-01/04 from committed files | Mutation scores, bench minima |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-59-01 | Tampering | the gate of record standing for a source other than `phase_base` | medium | mitigate | 59-01: the source diff from gate head `e9b98bb8` to `phase_base` `83cbd5c5` is empty and the prototype hash matches. Re-analysing copies of `gate` and `gate-r2` reproduces both `analysis.tsv` byte for byte (re-run by the orchestrator at validation) | CLOSED |
| T-59-02 | Repudiation | the reserved numbers | low | mitigate | 59-01 found all ten ids free at `phase_base`, and `next-id.mjs` was never run. The CCR-QD-450 row reads `Ids used: … Unused: none.` The phase scan is clean | CLOSED |
| T-59-SC | Tampering | npm/pip/cargo installs | high | mitigate | 0 changes to any `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` since `phase_base` | CLOSED |
| T-59-03 | Tampering | `59-mutation-base.json` and `59-mutation.mjs` re-baselined or widened | medium | mitigate | One commit, `3a7613a4` (`chore(59-02)`), touches either file, and the script's SHA-256 is pinned. 0 changes to `stryker*.mjs` since `phase_base` | CLOSED |
| T-59-04 | Repudiation | static credit claimed for an ignored mutant | low | mitigate | `compare 59-mutation-static.json` credits only mutants the `ignoreStatic: false` run Killed. It prints `WX-05 holds (D-15)` (re-run by the orchestrator) | CLOSED |
| T-59-05 | Tampering | the RED rows passing on the base, or failing by `TypeError` | medium | mitigate | 59-03: E1..E6 failed by `AssertionError` and the 7 base rows passed. The file is pinned by hash (`cd06315a`) | CLOSED |
| T-59-06 | Tampering | the type pins failing for another reason | medium | mitigate | 59-03: tstyche failed only with TS2459 (the missing export). It now passes 3/3 with 11 assertions (re-run by the orchestrator) | CLOSED |
| T-59-07 | Tampering | characterisation files edited to absorb a behaviour change | high | mitigate | 0 changes since `phase_base` to `LeafMatrix`, `Predicate`, `RolesAndDepth` or `DecisionCache` tests. The scan's frozen list is clean, and all four pass unedited | CLOSED |
| T-59-08 | Elevation of Privilege | an absent resource reported as supplied | high | mitigate | One table decides it: `RESOURCE_SUPPLIED.asked: (question) => question.resource !== undefined` (`Admission.ts:49`). E2 and E4 pin `resource: false`, and `LeafMatrix.test.ts` runs every leaf with no resource through both interpreters | CLOSED |
| T-59-09 | Denial of Service | the environment built per node, or before the cache lookup | medium | mitigate | `admit(question, "asked")` runs once inside `walk`'s `Effect.suspend` (`Walk.ts:878`), and the environment is passed by reference. `DecisionCache.test.ts`'s cache-hit test passes unedited, and 59-05's after-bench passes | CLOSED |
| T-59-10 | Information Disclosure | `export const evaluateNode` reachable by consumers | low | mitigate | `Walk.ts` is not in `packages/core/src/index.ts`, and the `exports` map has no `./*` wildcard (ADR-QD-099). Gate 13 stays at 933 exports | CLOSED |
| T-59-11 | Tampering | `ab.sh` leaving src at the base | high | mitigate | `bench/after/done.txt` reads `src restored to HEAD`, and `git status --short packages` is empty | CLOSED |
| T-59-12 | Repudiation | a failed after-run replaced by a re-run | medium | mitigate | Exactly one commit (`0691385c`) touches `bench/after/analysis.tsv`. Its last line, `# gate: pass`, reproduces from the JSONs | CLOSED |
| T-59-13 | Tampering | the evidence config or report committed, or the gate config edited | medium | mitigate | 0 `stryker*.mjs` changes and 0 `reports/` or evidence files added since `phase_base`. The evidence config stayed in the scratchpad | CLOSED |
| T-59-14 | Tampering | a gap test closing a survivor by editing a characterisation file or src | medium | mitigate | `c518b5b8` (`test(59-06)`) adds only `packages/core/test/WalkDepthGuard.test.ts`, and the frozen files are unchanged | CLOSED |
| T-59-15 | Repudiation | ADR-QD-172's tables differing from the runs | medium | mitigate | 59-07's verify matched all 70 workload rows byte for byte and recomputed the mutation rows from the JSONs | CLOSED |
| T-59-16 | Repudiation | amended ADRs rewritten instead of superseded | low | mitigate | 59-07's verify found no removed body line. `spec-revise --check` passes (re-run by the orchestrator) | CLOSED |
| T-59-17 | Repudiation | the supplied rule stated without its empty and adjacency edges | medium | mitigate | 59-08's verify required BEH-QD-632's "MUST NOT be reported as supplied", BEH-QD-633's "whether or not", and INV-QD-364's `MissingResource` implication | CLOSED |
| T-59-18 | Tampering | a new id with no traceability row, or a dangling anchor | low | mitigate | Strict traceability: PASS 21, FAIL 0 (59-09, and again in 59-10's `check:pr`) | CLOSED |
| T-59-19 | Tampering | a changeset, a version or a CHANGELOG change | high | mitigate | 0 changes since `phase_base` to `.changeset/`, manifests, CHANGELOGs, `spec/overview.md` or barrels | CLOSED |
| T-59-20 | Repudiation | the CCR row omitting an id or misstating a revision | low | mitigate | 59-09's verify required the exact `Ids used … Unused: none.` sentence and each document's current revision | CLOSED |
| T-59-21 | Repudiation | WENV marked before the gate, or WX marked | medium | mitigate | 59-10 marked WENV-01..04 only after the scan, the compare and `check:pr` exit 0. 7 WX rows read Pending and 0 are checked | CLOSED |
| T-59-22 | Elevation of Privilege | a release, tag, push or version bump | high | mitigate | No remote branch contains HEAD, no tag contains `phase_base`, and 0 version, changelog or changeset changes. `pnpm changeset version` was never run | CLOSED |

---

## Accepted Risks Log

None.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-19 | 23 | 23 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-19
