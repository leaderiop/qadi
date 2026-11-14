---
phase: "39"
slug: "each-hydration-drop-reason-stated-once-with-its-kind"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-14"
---

# Phase 39 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| a payload's reason → the metric registry | every word written to `qadi_hydration_dropped_total` is a registry entry; the closed, preregistered set bounds the key space | drop-reason words (`string` at the frequency) |
| an untrusted payload → react's entry buckets | each refused entry is routed to a bucket by its reason | refused entries and their reasons |
| the library → its consumers | two new public types and a runtime `kind` field on `hydrationDropMeaning`'s object reach `@qadi/core` users at the next release | the public API surface |
| phase ↔ its judging files | baselines, pins, budgets, gate scripts and thresholds decide whether the phase passes | integrity of the verdict |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-39-01 | Tampering | `isHydrationDropReason` accepting an inherited name | medium | mitigate | inherited-name case (`toString`, `constructor`, `hasOwnProperty`, `__proto__`, `valueOf`) written on the base (`d84cc614`, `HydrationMetrics.test.ts:299`) and green after | closed |
| T-39-02 | Repudiation | a baseline on an edited tree, or an experiment left in the tree | medium | mitigate | `39-mutation-base.json` is the first plan commit, alone (`cd5ea7f7`); both experiments reverted with `git status --porcelain -- packages` empty (39-01, 39-03 SUMMARY) | closed |
| T-39-03 | Tampering | the guard explaining a foreign key with a meaning it does not have | medium | mitigate | `Object.hasOwn(HYDRATION_DROP_TABLE, word)` (`HydrationMetrics.ts`, D-03); inherited-name case green | closed |
| T-39-04 | Denial of service | the metric key space widened or split | medium | mitigate | table closed (`as const satisfies`), list is its keys; all five `Metric.counter/frequency` declarations identical to the base (diff empty); nine-word snapshot green | closed |
| T-39-05 | Information disclosure | a `summary`/`remedy` naming an entry's contents | low | accept | sentences moved verbatim from `MEANINGS`; see AR-39-01 | closed |
| T-39-06 | Denial of service | `bucketOf[reason].push` throwing on an entry reason with no bucket | medium | mitigate | `EntryDropReason = HydrationDropReasonOf<"entry">` (`HydrationEvent.ts:102`); a new entry row is TS2741 at `bucketOf` (39-03 experiment); `HydrationEngine.ts` unchanged since the base | closed |
| T-39-07 | Repudiation | the throwaway row or scratch test left or committed | medium | mitigate | 39-03 restored the tree and verified `packages` clean; no scratch file in any commit | closed |
| T-39-08 | Repudiation | a number outside the reservation or a changed file the CCR row omits | medium | mitigate | 39-04/39-05 id check: only ARCH-86, ADR-QD-152, CCR-QD-430, INV-QD-323 new; `spec-revise --check` and `spec:verify:strict` green | closed |
| T-39-09 | Information disclosure | the runtime `kind` on `hydrationDropMeaning`'s object unannounced | low | mitigate | `.changeset/hydration-drop-reasons-stated-once.md` states it; ADR-QD-152 Consequences too | closed |
| T-39-10 | Tampering | gates, config, budgets, AGENTS.md or oracles edited so the phase passes | high | mitigate | `git diff --name-only b3b8cdcd HEAD -- scripts AGENTS.md stryker*.mjs vitest.config.ts .oxlintrc.json tstyche.json` empty; devtools and examples unchanged; written-out lists unedited (39-05 Task 1) | closed |
| T-39-11 | Repudiation | a re-baseline, stale report or different invocation as the mutation close | medium | mitigate | base JSON in exactly one commit; after 1 = 1 for both files with the same invocations, one run at a time (39-05 Task 2) | closed |
| T-39-12 | Elevation of privilege | a version-packages commit, a tag or a consumed changeset | medium | mitigate | no tag contains the base, no version commit; the only changeset changes are two additions | closed |
| T-39-SC | Tampering | npm/pip/cargo installs | high | mitigate | no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since the base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-39-01 | T-39-05 | The summaries and remedies are moved byte for byte from the base's `MEANINGS`; none names an entry's contents (BEH-QD-230), and this phase adds no new sentence | plan (39-02 threat model) | 2026-11-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-14 | 13 | 13 | 0 | secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-14
