---
phase: "QD-86"
slug: "qadiprovider-s-registry-lifetime-has-a-react-free-owner"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 24
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-86 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| phase scripts → the commit history | the scorer, its record and the pinned check are trusted by every later compare |
| host props → provider registry | `subject` and `initialValues` come from the host; the cells pin how they reach the registry |
| phase checks → later verifies | every later plan trusts these judges to state the rules |
| archived phase directories → this phase | read-only inputs whose scripts run from scratch copies |
| host props → owner | the subject, the atom set and `initialValues` the provider passes |
| host code → `RegistryContext` registry | a host may subscribe to, refresh or spy on the registry the owner exposes |
| host props → provider → owner | `subject`, `atoms` and `initialValues` cross into the owner on build and on every commit |
| spec → code | the spec is normative; a record that names a missing test or a deleted ref misleads every later change |
| phase records → release tooling | the changeset is read by the release workflow later; nothing is released here |
| local branch → remote and registry | nothing crosses: no push, tag or publish |

---

## Threat Register

Built from the `<threat_model>` blocks of `86-01-PLAN.md` … `86-08-PLAN.md` (authored at plan time). T-86-SC repeats in every plan; it is listed once.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-86-01 | Elevation of privilege | provider recycle (seed re-applied) | medium | mitigate | C7 pins that a long hide writes back the latest committed subject and atom set, never the first render's; the held LT9 to LT11 pin that no seed returns | closed |
| T-86-02 | Information disclosure | subject write order on an atoms swap | medium | mitigate | C4 and C8 pin that the swap is reported before the write and that a throwing reporter cannot skip the write, so the new atom set never keeps a previous subject's verdicts unannounced | closed |
| T-86-03 | Repudiation | `86-mutation-base.json`, `86-pinned-check.mjs` | low | mitigate | the record names its head and `--disableBail` invocation, is refused on a dirty tree or a foreign report and is committed alone first; the pinned check computes its held set from `phase_base` and was seen failing | closed |
| T-86-04 | Tampering | `86-check.mjs` judges | medium | mitigate | each judge has a failing plant in the self-test and is seen failing on the real tree, so a judge that passes vacuously is caught | closed |
| T-86-05 | Elevation of privilege | provider effect order (a hold before the commit) | medium | mitigate | `provider-forwards-only` refuses any order but commit first, instrumentation between, hold last, the one place that order is checked since no render shows it while nothing throws | closed |
| T-86-06 | Repudiation | commit trailers | low | mitigate | `trailers` accepts exactly the one owner line on every plan commit | closed |
| T-86-07 | Tampering | `.planning/milestones/` records | medium | mitigate | the scripts are copied to `<S>`, the archived directories are never written, and the verify fails on any modified path there | closed |
| T-86-08 | Repudiation | an earlier check that changes its answer | low | mitigate | each run is compared with a measured row; the one expected change is written before the move, and the ledger was seen failing | closed |
| T-86-09 | Elevation of privilege | owner recycle (seed or `initialValues` re-applied) | high | mitigate | the recycle writes only the latest committed subject; RO5 and RO7 pin it, with the seed-writing scratch edits seen red, and Stryker kills every recycle mutant | closed |
| T-86-10 | Information disclosure | a stale subject after a swap or a hide | medium | mitigate | `commit` records before it writes and the recycle reads the latest; RO5, RO9 and RO10 pin the order | closed |
| T-86-11 | Denial of service | a throwing `reset` or `defer` | medium | mitigate | the `finally` still writes the subject and the owner stays usable; RO6 and RO15 pin both | closed |
| T-86-12 | Denial of service | a disposed registry | medium | mitigate | the owner never disposes (`owner-shape` refuses `.dispose(`); RO14 pins one registry object throughout | closed |
| T-86-13 | Tampering | an atom-set swap that goes unreported | medium | mitigate | detection is `latest.atoms !== atoms` in the measured owner; RO8 and its three scratch edits pin it | closed |
| T-86-14 | Information disclosure | a host refresh of the subject atom | low | mitigate | the unguarded write keeps the seed across a refresh rather than clearing it; RO16 pins it and ADR-QD-199 records it | closed |
| T-86-15 | Elevation of privilege | a hold that runs before the commit on a reveal | medium | mitigate | the commit effect is first and the hold effect last; `provider-forwards-only` refuses any other order and was seen failing under the swap | closed |
| T-86-16 | Information disclosure | a previous subject served after a subject change | medium | mitigate | the commit effect runs on `[owner, atoms, subject]` and writes unconditionally; the held SUBJ and LT rows and C4, C5, C9 stay green unedited | closed |
| T-86-17 | Denial of service | a second registry or a disposed one after a hide | medium | mitigate | the owner is built once behind `??=` and never disposes; LT1 to LT18 stay green unedited and the pinned check holds them | closed |
| T-86-18 | Repudiation | the refresh difference and the zero-removal audit | low | mitigate | ADR-QD-199 states both and the CCR row repeats them; `records --close` refuses an ADR without either | closed |
| T-86-19 | Tampering | `Pinned by` citations | low | mitigate | `records` checks every cited row id and title opens a test in the named file; strict traceability checks every named file exists | closed |
| T-86-20 | Tampering | the mutation base | medium | mitigate | the base record keeps its one commit and `compare` reads it unchanged; a regression is closed with a test, never a re-baseline | closed |
| T-86-21 | Elevation of privilege | an accidental release | medium | mitigate | no `changeset version`, no version or CHANGELOG change, checked in the changeset task's verify | closed |
| T-86-22 | Elevation of privilege | an unrequested release or push | high | mitigate | the release check refuses a tag, a CHANGELOG or version change, a consumed changeset or a remote branch holding a phase commit | closed |
| T-86-23 | Repudiation | requirement status | low | mitigate | the verify refuses a ticked or non-Pending WX row; completion is left to the phase workflow | closed |
| T-86-SC | Tampering | npm/pip/cargo installs | high | accept | no package is installed or added in this plan (RESEARCH Package Legitimacy Audit: none) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

Evidence (checked 2026-11-25 on `0cc9dab0`; source and tests unchanged since the mutation-close head `07c5afb4`): the recycle is `registry.reset()` then, in `finally`, `registry.set(latest.atoms.subject, latest.subject)` (`RegistryOwner.ts`), with `seed` and `initialValues` read only at construction; RO5 and RO7 pin the latest commit and that no seed or initial value returns, seen red under seed-writing scratch edits (T-86-09, T-86-01, T-86-10); the report runs before the write and a throwing reporter is contained (`DeveloperSignals.ts` `contain`), C4, C8, RO9 (T-86-02); try/finally recycle, RO6 and RO15 (T-86-11); no `dispose` call, `owner-shape` refuses one, RO14 (T-86-12); RO8 (T-86-13); the unguarded write and its refresh difference, RO16 seen red with the guard reinstated, stated in ADR-QD-199 and CCR-QD-478 (T-86-14, T-86-18); `provider-forwards-only` passes live and was seen red under the effect swap, and no rendered test observes that order, as ADR-QD-199 records (T-86-05, T-86-15, T-86-16, T-86-17); the held test files byte-equal to `phase_base` (`86-pinned-check.mjs --all-applied`, 59 files); `86-check.mjs` self-test 262 and every mode seen failing in `86-RED-EVIDENCE.md` (T-86-04, T-86-06); the earlier checks run from scratch copies, `.planning/milestones/` unchanged, the ledger's one expected `moved` row (T-86-07, T-86-08); `86-mutation-base.json` committed once and `86-mutation.mjs compare` green, lease 28/28 → 28/28, owner 19/19 (T-86-03, T-86-20); `records --close` and `judgePinned` (T-86-19); no CHANGELOG, `package.json`, lockfile or workspace change, one unconsumed `@qadi/react` patch changeset, no tag contains `phase_base`, and no remote branch reaches a phase commit (T-86-21, T-86-22, T-86-SC); `REQUIREMENTS.md` unchanged since `phase_base` with WX-01..07 Pending (T-86-23).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-86-01 | T-86-SC | No package was installed or added; `spec:package` installs only the packed workspace tarballs into a sandbox | plan-time register (autonomous run) | 2026-11-25 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 24 | 24 | 0 | gsd-security-auditor, ASVS L1 grep-depth with the phase judges and pinned tests re-run (autonomous run) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25
