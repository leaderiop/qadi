---
phase: "42"
slug: "a-seeded-question-builds-its-own-computing-atom"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-14"
---

# Phase 42 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| server seed → client atom | a dehydrated decision seeds a question until the client computes its own | a `SeededDecision`, held per registry, never past the client's answer |
| the library → its consumers | `@qadi/react`'s barrel; `SeededQuestion.ts` is package-private | the public API surface (unchanged, 927 exports) |
| phase ↔ its judging files | baselines, pins, gate scripts decide whether the phase passes | integrity of the verdict |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-42-01 | Repudiation | `42-mutation-base.json` | medium | mitigate | first plan commit, alone (`17500850`), parent `phase_base` `7e5dafdb`; moved survivors named from the base report | closed |
| T-42-02 | Repudiation | ADR-QD-155 | low | mitigate | `docs(42-01)` `980a94ba` is the second content commit and precedes every `packages/*` commit (42-05 check 3) | closed |
| T-42-03 | Repudiation | trap tests vacuous | medium | mitigate | under the temporary `get(grantAtom)` edit exactly the two trap cases failed on the base (42-02 SUMMARY) and four on the moved code (42-03 SUMMARY) | closed |
| T-42-04 | Tampering | trap edit left in source | medium | mitigate | verify restores in `finally`; `git diff --quiet -- packages/react/src` held; 42-02 commits touch tests only | closed |
| T-42-05 | Elevation of privilege | `SeededQuestion.ts` seed read | high | mitigate | the seed is read through `seededIn(get.registry)` (`SeededQuestion.ts:184,221,238`), never `get(grantAtom)`; the one grant-node lookup is `registry.getNodes().get(grantAtom)` (`:162`), which creates no node | closed |
| T-42-06 | Information disclosure | barrel export of the seed slot | high | mitigate | `packages/react/src/index.ts` names no `SeededQuestion` (grep 0); `pnpm spec:api` green, `spec/overview.md` unchanged | closed |
| T-42-07 | Denial of service | liveness release order | medium | mitigate | the one `Atom.readable` (`SeededQuestion.ts:201`) opens with `get.addFinalizer(live())` (`:202`) | closed |
| T-42-08 | Tampering | `DECISION_READ_BUDGET` | medium | mitigate | the script differs from the base by exactly the two key lines; AGENTS.md by one line; `check-house-style` green (42-05 check 1) | closed |
| T-42-09 | Repudiation | stale record citations | medium | mitigate | 42-04 record checks and 42-05 sweep: no live record names a moved or removed name; 26 citations resolve | closed |
| T-42-10 | Tampering | ADR-QD-149/140 rewritten | medium | mitigate | dated `## Amendment (2026-11-14, ADR-QD-155, CCR-QD-433)` sections; no body line removed or changed (42-04 Task 2) | closed |
| T-42-11 | Tampering | source changed under a docs commit | medium | mitigate | the four files' comment-free TypeScript print equals `phase_base` (42-04 Task 1, 42-05 check 7) | closed |
| T-42-12 | Tampering | judging files | high | mitigate | 42-05 check 1: no script, config, lockfile or AGENTS.md change beyond the allowed budget lines | closed |
| T-42-13 | Repudiation | phase mutation evidence | high | mitigate | same invocation as the base; `HydrationEngine.ts` 1 (183/183), `QadiAtoms.ts` 0.9 (36/40), `SeededQuestion.ts` 57/62 carrying exactly the five base survivors; no re-baseline | closed |
| T-42-14 | Repudiation | milestone claim | medium | mitigate | 15 milestone files at their latest recorded score; every touched file classified; base never taken from the run being judged | closed |
| T-42-15 | Elevation of privilege | release from this branch | high | mitigate | no tag after `637c0601` (the 0.12.0 tags sit on it), no version or CHANGELOG change, changesets unconsumed (42-05 release check) | closed |
| T-42-SC | Tampering | npm installs | high | mitigate | no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `phase_base` (`git diff --stat` empty) | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-14 | 16 | 16 | 0 | orchestrator (state B, from plan threat registers, SUMMARYs and code grep) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-14
