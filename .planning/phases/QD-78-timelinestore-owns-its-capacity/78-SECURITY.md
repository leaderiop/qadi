---
phase: "78"
slug: "timelinestore-owns-its-capacity"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-24"
---

# Phase 78 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Host input → `TimelineStore.resize` / `TimelineFeed.configure` / `DockModel.configure` | A host (or a JavaScript caller outside the type) hands the capacity | Capacity: any value at run time |
| Timeline listeners → store, feed and dock | A subscriber's callback may throw while the store publishes | Thrown errors |
| React props → `useTimelineStore` | A host's `capacity` option reaches the hand-fed store through a layout effect | Capacity |
| Phase records → reviewers | The mutation base and close, the RED evidence, the gate logs and the ADR/CCR rows are the evidence a reviewer trusts | Measurements and decisions |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-78-SC | Tampering | dependency installs | high | mitigate | No `package.json`, lockfile, `pnpm-workspace.yaml` or `.npmrc` changed since `phase_base` de13eb7f | closed |
| T-78-01 | Tampering | `78-mutation-base.json`, base facts | medium | mitigate | All 4 group heads equal de13eb7f. Committed alone first (34c0e60d). The scorer refuses a dirty tree, and `--self-test` reports 31 passed. The base facts were re-run on an extract | closed |
| T-78-02 | Repudiation | `78-RED-EVIDENCE.md` | medium | mitigate | The 8 RED titles fail with source equal to base (78a06321) and pass at HEAD | closed |
| T-78-03 | Tampering | feed `configure` | medium | mitigate | TF30 and TF31: a refused capacity leaves the snapshot, the listeners, the source tally and `restart` as they were | closed |
| T-78-04 | Denial of service | zero-capacity timeline | low | mitigate | The 3 zero-capacity RED tests fail at base and pass at HEAD | closed |
| T-78-05 | Tampering | dock `configure` | medium | mitigate | M55 and M56 fail at base and pass at HEAD | closed |
| T-78-06 | Repudiation | characterisations | low | mitigate | 5 characterisations green on the base, each shown failing once, with the edit restored | closed |
| T-78-07 | Tampering | feed half-applied inputs | medium | mitigate | `TimelineFeed.ts:178` checks `effectiveCapacity` before `inputs = next` at :180 | closed |
| T-78-08 | Spoofing | a store handed to the host | medium | mitigate | One store (`TimelineFeed.ts:144-145`, returned at :172). No `inner`, mirror, `push` or forwarder remains. TF34 passes | closed |
| T-78-09 | Information disclosure | a frozen view after resize | low | mitigate | `resize` releases the pause and publishes (`TimelineStore.ts:88`). TF35 passes | closed |
| T-78-10 | Tampering | dock half-applied inputs | medium | mitigate | `DockModel.ts:300` checks before `inputs = next` at :304. M55 passes and was shown failing with the check removed | closed |
| T-78-11 | Denial of service | a listener's throw stopping the dock | medium | mitigate | `DockModel.ts:307-309`: the feed is configured in `try`, and the rest is applied in `finally`. M56 passes | closed |
| T-78-12 | Tampering | capacity outside the type | low | mitigate | `emptyTimeline` refuses anything that is not a non-negative integer (`Timeline.ts:84-86`). The `Reflect.apply` test passes | closed |
| T-78-13 | Denial of service | re-entrant listener | low | mitigate | State is set before `publish`, and `ExternalStore` assigns before it notifies | closed |
| T-78-14 | Denial of service | render storm at capacity 0 | low | mitigate | `bound` returns `self` when nothing changed. `set`'s identity check (`ExternalStore.ts:94`) | closed |
| T-78-15 | Tampering | hand-fed hook stale capacity | low | mitigate | `useTimeline.ts:99-100` resizes from a layout effect. UT4 and UT5 pass | closed |
| T-78-16 | Repudiation | ADR-QD-191, CCR-QD-470 | low | mitigate | Strict traceability PASS 21/0. The CCR row names each document at its HEAD revision, with the CONF-05 line | closed |
| T-78-17 | Tampering | ADR-QD-137 amendment | low | mitigate | Rev 1.3 → 1.4 through `spec-revise`. `--check` exits 0 | closed |
| T-78-18 | Tampering | BEH/INV records | low | mitigate | BEH-QD-726..730 and INV-QD-401/402 each name their pinning tests | closed |
| T-78-19 | Repudiation | spec revisions | low | mitigate | 17 spec edits, each with a one-step Revision move | closed |
| T-78-20 | Repudiation | changeset, upgrade guide | medium | mitigate | Breaking changeset with 8 changes. The 0.13 After fence compiles (74 blocks). api-surface 942 | closed |
| T-78-21 | Tampering | mutation floor | medium | mitigate | `compare` exits 0, with 0 Survived and 0 NoCoverage in all 4 files. Dock 70/70 → 72/72. `EXAMINED = {}` | closed |
| T-78-22 | Tampering | pinned tests | medium | mitigate | TF4/14/26/27/29 are identical to base, and M55/M56 to 78a06321. Every added title appears in RED-EVIDENCE | closed |
| T-78-23 | Repudiation | merge gate | medium | mitigate | `pnpm check:pr` exit 0 at 4cfb925b (6458/568/43 tests, 17 of 18 steps), before the TRSZ commit | closed |
| T-78-24 | Tampering | close head vs gate head | medium | mitigate | `packages/` is identical at 4d013fbf (close), 4cfb925b (gate) and HEAD | closed |
| T-78-25 | Repudiation | commit trailers | low | mitigate | 34 plan commits, each with exactly 1 Claude trailer. The plan pattern was widened to `refactor` for the orchestrator-decided 78-10 refactor (4d013fbf). It is recorded in 78-11-SUMMARY, and no plan commit is missed | closed |
| T-78-26 | Information disclosure | private/unstaged files | low | mitigate | No `.planning/config.json`, `state.json`, `.agents/`, `.codex/` or `*.iter*.md` in any commit since base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Release/publish:** the changeset is new and unconsumed. No tag contains de13eb7f, no CHANGELOG changed, and no `package.json` version changed. The branch is `arch-wave-14` and nothing has been pushed.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

None. Every threat is mitigated.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-24 | 27 | 27 | 0 | gsd-security-auditor (ASVS L1, block_on high) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-24
