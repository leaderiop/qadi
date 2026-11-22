---
phase: "53"
slug: "one-module-owns-the-value-a-leaf-compares"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-18"
---

# Phase 53 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Decoded policy / row → interpreter | A decoded key (policy column, attribute or predicate name) is read from a record the caller supplied | Untrusted JSON keys, incl. prototype names (`constructor`, `__proto__`, `toString`, …) |
| `evaluatePredicate` ↔ `evaluate` | The reference row filter must never admit what the decision denies (INV-QD-091) | Authorization verdicts |
| Fixture builders → evaluation | `attributeResolverFromRecord` / `customPredicateFromRecord` tables answer by name | Attribute values, predicate functions |
| Repo → npm | Release pipeline | Package artifacts (nothing released this phase) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-53-01 | Repudiation | 53-mutation-base.json measured on an edited tree, from a stale report, or from a different file set | medium | mitigate | 53-01 verifies passed; base JSON committed alone (fe1d4af6) with phase_base parent | closed |
| T-53-02 | Tampering | D-14's rule widened at the close (another file allowed to fall, another rename) | medium | mitigate | MOVED/RENAMED unchanged in committed 53-mutation.mjs (no diff since fe1d4af6) | closed |
| T-53-03 | Repudiation | a reserved id already used at the base | low | mitigate | 53-01 Task 1 id check passed at phase_base; next-id never run | closed |
| T-53-SC | Tampering | npm/pip/cargo installs | high | mitigate | no package.json / pnpm-lock.yaml / pnpm-workspace.yaml diff since phase_base | closed |
| T-53-04 | Elevation of Privilege | `evaluatePredicate` used as a row filter admits a row `evaluate` denies (prototype-named column) | high | mitigate | R1/R2 RED at 837ffb6b, GREEN after 1573cdbf, unedited | closed |
| T-53-05 | Elevation of Privilege | `attributeResolverFromRecord` turns an absent name into an inherited member that allows | medium | mitigate | R3 GREEN after abf97eb6 | closed |
| T-53-06 | Denial of Service | `customPredicateFromRecord` turns a decision into a defect or a fiber crash | medium | mitigate | R4 GREEN after bfc64cec (typed CustomPredicateError, no die) | closed |
| T-53-07 | Repudiation | a RED test passing or failing for a reason other than the defect | low | mitigate | 53-02 RED checker: exactly the four fail, 120 pass | closed |
| T-53-08 | Elevation of Privilege | `Predicate.ts` `Compare`/`MemberOf` arms reading an inherited member as a column value | high | mitigate | Predicate.ts reads via ownValueLocal; no code-line Object.hasOwn | closed |
| T-53-09 | Elevation of Privilege | `attributeResolverFromRecord` answering an inherited member | medium | mitigate | AttributeResolver.ts reads via ownValue | closed |
| T-53-10 | Denial of Service | `customPredicateFromRecord` invoking an inherited member as a predicate (fiber crash) | medium | mitigate | CustomPredicate.ts reads via ownValue | closed |
| T-53-11 | Information Disclosure | Operand.ts reachable as a public entry point, widening the API | low | mitigate | index.ts does not name Operand; spec:api 935 exports unchanged | closed |
| T-53-12 | Elevation of Privilege | a refactor that drops the own-property test from FieldMatch, the walk or `readAttribute` | high | mitigate | Matcher/Walk/PortAccess read via Operand.ts; pinned tests pass | closed |
| T-53-13 | Tampering | an own subject attribute holding undefined replaced by a resolver answer | medium | mitigate | isOwnKey decides the branch; own-undefined resolver-count characterisation passes | closed |
| T-53-14 | Tampering | own `__proto__` written through an ordinary assignment during projection | high | mitigate | Object.create(null) (FieldPath.ts) and Object.defineProperty (Decision.ts) kept | closed |
| T-53-15 | Information Disclosure | projection copying an inherited member into a projected record | medium | mitigate | isOwnKey decides inclusion in FieldPath.ts and Decision.ts | closed |
| T-53-16 | Elevation of Privilege | a reader left outside Operand.ts, reintroducing a bare read | medium | mitigate | OPND-03 eight-file check passes | closed |
| T-53-17 | Repudiation | a weaker comparison, base or config at the close | medium | mitigate | no diff to script, base JSON or stryker.config.mjs since fe1d4af6 | closed |
| T-53-18 | Repudiation | an after JSON from a stale or partial report | medium | mitigate | 53-mutation-after.json committed alone (886f0dde); compare holds | closed |
| T-53-19 | Repudiation | an id minted outside ARCH-100, ADR-QD-166, CCR-QD-444, BEH-QD-601..605, INV-QD-351..352 | medium | mitigate | 53-08 phase scan clean; only reserved ids | closed |
| T-53-20 | Tampering | INV-QD-091's anchor broken by a heading edit, orphaning five links | low | mitigate | INV-QD-091 heading unchanged; spec:verify:strict 21/21 | closed |
| T-53-21 | Elevation of Privilege | an accidental release (version, tag, push, publish) | high | mitigate | no tag/remote branch contains phase commits; nothing staged; changeset version never run | closed |
| T-53-22 | Repudiation | the evidence order broken (src before RED, baseline edited, after JSON early) | medium | mitigate | 53-08 phase scan checks order, immutability, trailers | closed |
| T-53-23 | Tampering | a budget or gate quietly changed to let the phase pass | medium | mitigate | no diff in scripts/, AGENTS.md, stryker.config.mjs; lint green | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

Note (not a threat, a documented behaviour change): an `evaluatePredicate` row that is a class instance now reads prototype getters as absent. Recorded in the changeset, BEH-QD-602 and ADR-QD-166.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-18 | 24 | 24 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-18
