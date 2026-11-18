---
phase: "54"
slug: "leafneeds-turns-every-leaf-s-answer-into-a-verdict"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-18"
---

# Phase 54 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Port answer → verdict | A port's answer (acted, relationship, custom, signature) or a subject/request read becomes allow/deny through one `LEAF_VERDICTS` row | Authorization verdicts; an `Unknown` answer must never read as held |
| `toPredicate` ↔ `evaluate` | The compiled row filter must never admit what the walk denies (INV-QD-018, INV-QD-353) | Authorization verdicts |
| Package barrel | `LeafNeeds.ts` stays package-private | Public API surface (935 exports, unchanged) |
| Phase evidence → gate | The mutation comparer decides WX-05 from committed JSONs | Mutation scores |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-54-01 | Repudiation | mutation base measured on a wrong tree | medium | mitigate | `chore(54-01)` (77d723ca) is the phase's first plan commit, parent `phase_base` afdd8d9c, holding only the script and base JSON | CLOSED |
| T-54-02 | Tampering | D-10 rule widened at the close | medium | mitigate | `LN`, `MOVED`, `KILLED` unchanged; the one script change (0c917fdf) adds a static credit granted only when every ignored mutant is Killed in the committed evidence `54-mutation-static.json`; without it `compare` exits 1. See Accepted Risks | CLOSED |
| T-54-03 | Repudiation | reserved id already used at base | low | mitigate | 54-01 checked all ten free at `phase_base`; `spec:verify:strict` 21/21 | CLOSED |
| T-54-04 | Elevation of Privilege | characterisation importing the moving modules | high | mitigate | `LeafVerdict.test.ts` imports only barrel modules and `./helpers.ts` (54-02 verify) | CLOSED |
| T-54-05 | Repudiation | deny reason drifting during the move | medium | mitigate | every reason asserted as a full literal in `LeafVerdict.test.ts`, green unedited after 54-03/54-04 | CLOSED |
| T-54-06 | Elevation of Privilege | acted `Unknown` mapped to `Held` | high | mitigate | `ActedOutcome` keeps `Unknown` distinct (LeafNeeds.ts:291, 317-321); unit test pins Unknown under both polarities | CLOSED |
| T-54-07 | Elevation of Privilege | future leaf tag with no row failing open | high | mitigate | `LeafVerdicts` mapped over `LeafTag` (LeafNeeds.ts:373) with `satisfies LeafVerdicts` (:399); tstyche pins | CLOSED |
| T-54-08 | Elevation of Privilege | `AskActed` folding True where walk denies | high | mitigate | both interpreters call the same row via `isHeld` (Walk 9, Predicate 5 call sites); INV-QD-018 agreement green unedited | CLOSED |
| T-54-09 | Information Disclosure | record reaching the public barrel | low | mitigate | `index.ts` names none of `LeafNeeds`/`LEAF_VERDICTS`/`isHeld`; `spec:api` 935 exports | CLOSED |
| T-54-10 | Elevation of Privilege | relationship Unknown / custom false / signature none-matching read as held | high | mitigate | `isHeld` true for `Held` only; 54-02 cells pin each; rows unit-tested | CLOSED |
| T-54-11 | Repudiation | deny sentence changed moving into a table | medium | mitigate | sentences byte-identical, asserted by `LeafVerdict.test.ts` | CLOSED |
| T-54-12 | Elevation of Privilege | walk/translator diverging on subject/request leaves | high | mitigate | same rows through `isHeld` in both; LeafNeeds/LeafMatrix/Predicate suites green unedited | CLOSED |
| T-54-13 | Repudiation | fallen score accepted by re-baselining or widening the comparer | medium | mitigate | base JSON unchanged since 77d723ca; `stryker.config.mjs` unchanged; comparer widening is evidence-gated (see T-54-02, Accepted Risks) | CLOSED |
| T-54-14 | Tampering | score inflated by timeouts under contention | low | mitigate | runs serialized; 0 timeouts in after-run; evidence run had no contention | CLOSED |
| T-54-15 | Repudiation | ADR mutation numbers not matching measurement | low | mitigate | ADR-QD-167 `## Mutation` recomputed from the committed JSONs (54-06 verify) | CLOSED |
| T-54-16 | Tampering | budget or AGENTS.md table edited | medium | mitigate | no diff in `scripts/` or AGENTS.md since `phase_base`; `pnpm lint` green with 3 declared switches | CLOSED |
| T-54-17 | Repudiation | record under an unreserved id / mismatched anchor | low | mitigate | `spec:verify:strict` PASS 21; CCR-QD-445 lists ids used, "Unused: none" | CLOSED |
| T-54-18 | Repudiation | Breaking change shipped as patch | low | mitigate | no public change (`spec:api` 935, decisions and sentences pinned); changeset patch, 0 Breaking | CLOSED |
| T-54-19 | Tampering | push, tag, version or publish | high | mitigate | no remote branch contains HEAD; no tag contains a phase commit; 54-08 release check passed | CLOSED |
| T-54-20 | Tampering | forbidden construct / out-of-scope file slipping past | medium | mitigate | 54-08 phase scan clean; added src lines carry no `as`/`any`/new `switch`/`fnUntraced` | CLOSED |
| T-54-21 | Elevation of Privilege | characterisation weakened after the fact | high | mitigate | no diff to Evaluate/Predicate/LeafMatrix tests since base; no deleted line in LeafVerdict/LeafNeeds tests (54-08 scan) | CLOSED |
| T-54-SC | Tampering | npm/pip/cargo installs | high | mitigate | no manifest, lockfile or workspace change since `phase_base` | CLOSED |

---

## Accepted Risks Log

| Risk | Rationale | Owner / Review |
|------|-----------|----------------|
| D-10 comparer credits static-ignored mutants (0c917fdf) | `LeafNeeds.ts` gained 26 detected mutants vs 28 that left `Walk.ts`; the gap is Stryker's `ignoreStatic` reclassifying mutants in module-scope tables. An evidence-only run (`ignoreStatic: false`, same mutate list, config untouched) killed all 72 after-run ignored mutants (23/23, 22/22, 27/27). The credit is granted only when that evidence matches every ignored mutant. Recorded in 54-05-SUMMARY, ADR-QD-167 and CCR-QD-445 | Orchestrator-authorised; accepted by the project owner 2026-11-18 (54-UAT.md) |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-18 | 22 | 22 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-18
