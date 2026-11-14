---
phase: "41"
slug: "one-guarded-value-to-text-function"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-14"
---

# Phase 41 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| a caller's value → text for a reader | policy literals and witnesses are caller-supplied values of any shape (bigint, cycle, throwing `toJSON` or getter) | the value, turned into a label or explanation |
| a label → the screen and logs | `explain`, remedy labels and search text are shown in panels | fixed words or JSON text, never an error message |
| the library → its consumers | new `@qadi/core` export `valueText` | the public API surface |
| phase ↔ its judging files | baselines, pins, gate scripts decide whether the phase passes | integrity of the verdict |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-41-01 | Repudiation | `41-mutation-base.json` | medium | mitigate | first plan commit, alone (`0236fb6b`), parent `phase_base` `4035fcdd`; two runs one at a time (41-01) | closed |
| T-41-02 | Repudiation | ADR-QD-154 | low | mitigate | `docs(41-01)` `7c4b6901` is the second commit and precedes every `packages/*` commit (41-01 order check, 41-06 check 3) | closed |
| T-41-03 | Tampering | RED evidence | medium | mitigate | every case run without `.fails` on the base fails in the stated frame for the stated reason (41-02 SUMMARY: BigInt/circular TypeErrors, sentinels) | closed |
| T-41-04 | Tampering | characterisation | medium | mitigate | 41-02 adds lines only; 41-04 changes exactly the stated `toJSON`-gives-nothing line in each file | closed |
| T-41-05 | Denial of service | `valueText` | medium | mitigate | the one `JSON.stringify` inside a bare `try`/`catch` returning `undefined` (`packages/core/src/ValueText.ts:11-19`); 22 rule rows incl. throwing `toJSON`/getter; Stryker 2/2 killed | closed |
| T-41-06 | Information disclosure | `valueText`'s catch | low | mitigate | `catch {` binds no error, holds no statement; no log call in `ValueText.ts`, `Explanation.ts`, `Remedies.ts`, `Filters.ts` (grep) | closed |
| T-41-07 | Repudiation | public export unnamed | low | mitigate | `spec/overview.md` row in the same commit `192b70c1`; `pnpm spec:api` green (926 exports) | closed |
| T-41-08 | Denial of service | `explain`, `remedyEdits`, `SimulationSession.commit()` | medium | mitigate | `literalText` (`Explanation.ts`) and `render` (`Remedies.ts`) read through `valueText`; both RED files pass with only `.fails` removed (41-04) | closed |
| T-41-09 | Information disclosure | labels for a value with no JSON form | low | mitigate | fixed words `a value with no JSON form` (`NO_JSON_FORM` constants); bigint shown as digits and `n` only; sentinel cases assert no message reaches a label | closed |
| T-41-10 | Tampering | RED/characterisation edited to pass | medium | mitigate | 41-04 RED-flip shape check: each RED file equals its `test(41-02)` text with only `.fails(` removed | closed |
| T-41-11 | Repudiation | CCR-QD-432 | low | mitigate | row lists every changed file, each spec document at its revision, used and unused reserved ids (41-05 Task 2 check) | closed |
| T-41-12 | Tampering | BEH-QD-141 / BEH-QD-223 weakened | medium | mitigate | both byte-identical to the phase base (41-05 Task 1 check) | closed |
| T-41-13 | Tampering | gates, config, lockfile | high | mitigate | no change under `scripts/`, `AGENTS.md`, Stryker/vitest/lint configs, any `package.json` or lockfile since `4035fcdd` (`git diff --stat` empty); `pnpm check:pr` green (41-06) | closed |
| T-41-14 | Repudiation | mutation evidence | high | mitigate | base JSON in one commit; after-run with the same invocations, one at a time; no score fell, ValueText.ts at 1 (41-06) | closed |
| T-41-15 | Elevation of privilege | a release from this branch | high | mitigate | no tag contains `4035fcdd`; no version commit; two changesets added, none consumed (41-06 Task 3) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

None.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-14 | 15 | 15 | 0 | secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-14
