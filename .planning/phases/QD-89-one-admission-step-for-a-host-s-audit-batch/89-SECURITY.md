---
phase: "QD-89"
slug: "one-admission-step-for-a-host-s-audit-batch"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 32
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-26"
---

# Phase QD-89 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| host → `@qadi/audit` batch | a store client or a JavaScript caller hands `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge` a `now`, a rows list, key material and a policy the types do not bind; the admission step (`admitBatch` / `admitRows`) is where they are checked and read once |
| `planPurge` → the archive | the archive is asked only about rows the step admitted |
| writer → reader (INV-QD-399) | every bundle `archiveAuditTrail` returns must be read back by `readAuditArchive` |
| `@qadi/audit` → a tracer | the spans a deployment reads (`qadi.audit.archiveAuditTrail`, `qadi.audit.verifySequenceIntegrity`) |
| `@qadi/audit` → its consumers | the changeset is what a host reads |
| executor → the audit tests | a held test rewritten with the change, or a removed order row, would hide a lost property |
| phase scripts → the commit history and the tree | the scorer, its base record, the checks and the judges are trusted by every later compare; none may write or commit |
| earlier phase scripts → this phase's tree | Phase 85 to 88 checks run from scratch copies; their directories and `.planning/milestones` are read-only |
| spec → readers and later phases | a record that drifts from the code is believed |
| the branch → the remote and the registry | nothing crosses: no push, tag, publish or version |

---

## Threat Register

Built from the `<threat_model>` blocks of `89-01-PLAN.md` … `89-11-PLAN.md` (authored at plan time). T-89-SC repeats in every plan; it is listed once. No SUMMARY carries a threat flag (all eleven say "None").

| Threat ID | Category | Severity | Disposition | Evidence | Status |
|-----------|----------|----------|-------------|----------|--------|
| T-89-01 | Repudiation (mutation base, red evidence) | low | mitigate | `89-mutation-base.json` names `phase_base` 8ee14f6f, the group's invocation and its five files; dirty-tree refusal `89-mutation.mjs:103`, `:579-586`; first commit since phase_base is `5efd5449`, holding only the base record and its scorer under `.planning/` (see Observation 6); every evidence line names its edit or run (`89-RED-EVIDENCE.md:3`) | CLOSED |
| T-89-02 | Tampering (a list answering differently on a second read: writer, verify, both plans) | high | mitigate | B6 to B13 (`BatchReadOnce.test.ts:143-201`) red on the base (`89-RED-EVIDENCE.md:310-325`), all pass at HEAD (audit project 724 rows, 0 failed; `suite --green` exit 0) | CLOSED |
| T-89-03 | Denial of service (`null`/`undefined` policy `TypeError`) | medium | mitigate | B4 (`BatchReadOnce.test.ts:125-131`) red on the base with `TypeError: Cannot read properties of null` (`89-RED-EVIDENCE.md:308-309`), passes at HEAD; B5 (`:133-139`) green; scratch probe at HEAD: `null` and `undefined` policies answer `RetentionInputInvalid { MaxAgeInvalid }` | CLOSED |
| T-89-04 | Spoofing (`commit` mode) | medium | mitigate | `judgeCommit` (`89-check.mjs:135-150`) needs one commit with the exact subject and paths and the one trailer, refuses `NEVER_STAGED` (`:57-68`, `:141`); self-test 377 passed, its commit cases at `:1201-1210`, `:1270`; seen failing (`89-RED-EVIDENCE.md:332`) | CLOSED |
| T-89-05 | Tampering (`scan-forbidden` guards) | high | mitigate | `GUARDED` (`89-check.mjs:52`) judged by `judgeGuards` (`:362`); `scan-forbidden` exit 0 at HEAD; `git diff 8ee14f6f..HEAD -- AGENTS.md scripts/check-house-style.mjs .oxlintrc.json` empty | CLOSED |
| T-89-06 | Information disclosure (step reached from the barrel or `exports`) | medium | mitigate | `judgeAdmissionStep` barrel and `exports` clauses (`89-check.mjs:640-651`), self-tested (`:1342-1343`); `admission-step` exit 0; `step-in-barrel` variant caught (`89-RED-EVIDENCE.md:491-492`); `packages/audit/src/index.ts` and the `exports` map (`package.json:21-28`, root `.` only) name no `HostBatch` | CLOSED |
| T-89-07 | Repudiation (seen-failing evidence) | low | mitigate | every mode's failure line from a real run (`89-RED-EVIDENCE.md:329-342`); `89-RED-EVIDENCE.md` committed (12 commits) and clean in the tree | CLOSED |
| T-89-08 | Tampering (held audit tests and the step's neighbours) | high | mitigate | `HELD_EXTRA` holds `CodecMade.ts`, `SequenceIntegrity.ts`, `index.ts`, `package.json`, `stryker.audit.mjs` (`89-pinned-check.mjs:40-44`); held set from `git ls-tree` at phase_base (`:140`, `:485`); `--all-applied` exit 0: 47 held, 5 of 5 born, 3 of 3 declared edits; self-test 54; no diff to `CodecMade.ts`, `index.ts`, `package.json` since phase_base | CLOSED |
| T-89-09 | Tampering (declared regions) | medium | mitigate | region and between-text judges seen failing (`89-RED-EVIDENCE.md:349-351`); `--all-applied` 3 of 3 declared edits applied | CLOSED |
| T-89-10 | Repudiation (born files) | low | mitigate | born files held against their adding commit (`89-pinned-check.mjs:49`, `:523`), seen failing (`89-RED-EVIDENCE.md:348`); 5 of 5 born held at HEAD | CLOSED |
| T-89-11 | Tampering (earlier phase directories) | medium | mitigate | copies to `$TMPDIR/qd89` (`89-earlier-checks.mjs:46`); re-run exit 0, 59 rows matched; porcelain status of `.planning/milestones` and QD-85..88 identical before and after; no diff to them since phase_base; self-test 47 | CLOSED |
| T-89-12 | Repudiation (the ledger) | medium | mitigate | `89-earlier-checks.mjs` exit 0; the one computed row (`88-check.mjs records --close` exit 1, `spec/README.md is at Revision 1.415, not 1.414`) matches its explaining commit; ledger judges seen failing (`89-RED-EVIDENCE.md:355-357`) | CLOSED |
| T-89-13 | Tampering (`admitRows` over a list that answers differently) | high | mitigate | `takeRows` reads `length` once and each index once into a fresh array (`HostBatch.ts:69-70`); `rowsRefusal(taken)` and `new AdmittedRows(taken…)` ask the copy (`:81-86`); H19, H20, H22 (`HostBatch.test.ts:219`, `:226`, `:236`) pass; `no-snapshot` variant caught by all three (`89-RED-EVIDENCE.md:380-383`) | CLOSED |
| T-89-14 | Denial of service (a `now` or list that is not a number or not a list) | medium | mitigate | `Number.isFinite(batch.now)` (`HostBatch.ts:98`); `Array.isArray` guard passes a non-list to `rowsRefusal` unread (`:81`); H15, H17 pass; `isfinite` and `no-list-guard` variants caught (`89-RED-EVIDENCE.md:376-386`); probe: a string `now` is `NowNotFinite`, a `null` list `EntriesNotAList` (see Observation 1 for an exotic list) | CLOSED |
| T-89-15 | Elevation of privilege (minting admitted rows outside the step) | medium | mitigate | `class AdmittedRows` unexported (`HostBatch.ts:39-45`), exported as a type only (`:47`); the only `new AdmittedRows` in `packages` is `HostBatch.ts:86`; nominal pins `HostBatch.tst.ts:81-88` pass under both tstyche configs (see Observation 4) | CLOSED |
| T-89-16 | Tampering (policy getter answering differently) | high | mitigate | `maxAgeOf` reads `policy?.maxAgeMs` once (`Retention.ts:93-100`); `ageRule` compares with the admitted number `batch.terms` (`:111`); B1, B2, B3 red on the base (`89-RED-EVIDENCE.md:302-307`), pass at HEAD; `age-rereads-policy` variant caught (`:475-477`) | CLOSED |
| T-89-17 | Denial of service (`null`/`undefined` policy) | medium | mitigate | `policy?.maxAgeMs` (`Retention.ts:96`) refused as `MaxAgeInvalid({ value })` (`:99`); B4 passes | CLOSED |
| T-89-18 | Tampering (purge pass over the list given) | high | mitigate | `planPurge` admits first (`Retention.ts:187`) and iterates `admitted.success.rows.entries` (`:196`); does not call `planRetention` (`entry-points-first` exit 0); B9, B13 pass; `purge-maps-retention` variant caught (`89-RED-EVIDENCE.md:470-473`) | CLOSED |
| T-89-19 | Tampering (writer archiving a row other than the one checked) | high | mitigate | `archiveAuditTrail` admits first (`AuditArchive.ts:186`), builds facts from `rows` and `createdAt` from the admitted batch (`:190-196`); B6 and B10 pass (B6 also reads the bundle back) | CLOSED |
| T-89-20 | Elevation of privilege (sequence facts over unadmitted rows) | high | mitigate | `verifiedArchiveFacts(rows: AdmittedRows)` (`ArchiveFacts.ts:182-185`); `verifySequenceIntegrity` admits first (`:209-214`); `HostBatch.tst.ts:90-92` pins the parameter; V4, V6 seen failing (`89-RED-EVIDENCE.md:445-448`); `facts-take-list` judge variant caught (`:501`) | CLOSED |
| T-89-21 | Repudiation (a trace that changes silently) | low | mitigate | SF1 to SF4 (`AdmissionOrder.characterisation.test.ts:457-472`) committed red before the change (`89-RED-EVIDENCE.md:423-432`), pass at HEAD; `AuditArchive.test.ts` has no diff since phase_base and is held by the pinned check; `verify-span-first` variant caught (`:463-468`); the changeset states the span change | CLOSED |
| T-89-22 | Information disclosure (step reached from the package entry) | medium | mitigate | `admission-step` exit 0; no `export … from "./HostBatch.ts"` anywhere in `packages/audit/src`; `pnpm spec:api` exit 0, 942 exports across 9 packages (see Observation 3) | CLOSED |
| T-89-23 | Repudiation (the six removed rows) | medium | mitigate | exactly six `it(` titles removed (five from `ForeignRows.test.ts`, one from `Retention.test.ts`), each a row of ADR-QD-202's audit table naming its holders (`spec/decisions/202-…md:146-153`), `Tests removed: 6.` (`:155`); the four comparison rows (`ForeignRows.test.ts:393`, `:407`, `:419`, `:428`) pass; pinned check admits only the declared removals | CLOSED |
| T-89-24 | Tampering (an entry point that reorders its checks) | high | mitigate | each of the four reordering scratch edits failed its comparison row (`89-RED-EVIDENCE.md:450-459`); `entry-points-first` exit 0; `first-not-step` and `purge-calls-retention` judge variants caught (`:483-502`) | CLOSED |
| T-89-25 | Tampering (a weakened test suite) | high | mitigate | `89-mutation.mjs compare` exit 0 (AuditArchive 78/78, ArchiveFacts 54/54, Retention 56/56, CodecMade 18/18, HostBatch 21/22: one `EQUIVALENT` survivor with its reason `89-mutation.mjs:71-79`, one `EXAMINED` static mutant `:85-90` after a hand run seen Killed, `89-RED-EVIDENCE.md:504-511`); self-test 92 | CLOSED |
| T-89-26 | Repudiation (the trace change) | low | mitigate | `.changeset/audit-batch-admitted-once.md`: `"@qadi/audit": patch`, names the span change, the read-once fix and INV-QD-399, "No export changes"; unconsumed in `.changeset/` | CLOSED |
| T-89-27 | Elevation of privilege (accidental release) | high | mitigate | no `package.json`, `CHANGELOG`, lockfile, workspace or changeset-config change since phase_base; the changeset is a file only and unconsumed; no remote branch contains HEAD | CLOSED |
| T-89-28 | Repudiation (a record drifting from the code) | medium | mitigate | `records --close` exit 0; `records` exit 0; `pnpm spec:verify:strict` PASS 21 FAIL 0 | CLOSED |
| T-89-29 | Tampering (record number outside the reservation) | low | mitigate | BEH-QD-786, INV-QD-425, ADR-QD-203, CCR-QD-482, ARCH-137 appear in no added line outside `.planning/` since phase_base (they appear only in `.planning/ROADMAP.md`, as Phase 90's own reservation, and in `89-10-SUMMARY.md`, stating the rule) | CLOSED |
| T-89-30 | Elevation of privilege (push, tag, publish) | high | mitigate | `git branch -r --contains` HEAD and the first phase commit `5efd5449`: empty; `git tag --contains 8ee14f6f`: empty; no `package.json` or changelog moved; changeset unconsumed | CLOSED |
| T-89-31 | Tampering (a gate weakened to pass) | medium | mitigate | gate head `5b734b65` recorded with `gate_exit: 0` (`89-11-SUMMARY.md:36-37`), an ancestor of HEAD; `git diff --quiet 5b734b65 HEAD -- . ':!.planning'` exit 0; every phase check re-run by this audit (audit trail) | CLOSED |
| T-89-SC | Tampering (package installs) | high | accept | no package installed or added; no manifest, lockfile or workspace change since phase_base | ACCEPTED |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-89-01 | T-89-SC | No package was installed or added in any plan of this phase (RESEARCH Package Legitimacy Audit: none); no `package.json`, lockfile or workspace change since phase_base | plan-time register (autonomous run) | 2026-11-26 |

---

## Observations

Informational, not counted in `threats_open`.

1. **An exotic list can still be a defect, against INV-QD-424's "no input is a defect, whatever the value given" (low, outside the register).** `takeRows` (`HostBatch.ts:69-70`) copies all of `length` before `rowsRefusal` looks at any index. The base's `rowsRefusal` used `findIndex` and stopped at the first refused index. A scratch probe at HEAD shows two cases. A `Proxy` over an array that answers `length` 2^32 makes `Array.from` throw `RangeError: Invalid array length` from `admitRows` and `planRetention`. The base answered that list with `EntryNotMadeByCodec { index: 0 }`. A real sparse array with `length` 5,000,000 is copied in full before the refusal at index 0, which took about 390 ms. A `length` near 2^32−1 would exhaust memory. Only an in-process JavaScript caller can reach either case: a store client's JSON result is never sparse and never a Proxy. INV-QD-424 carves out a throwing accessor but not these. A follow-up could refuse a `length` that is not an array length, or check each index while copying, or narrow the invariant's wording.
2. A throwing accessor (the list's `length` or an index, `maxAgeMs`, `keyMaterial`) still throws. The probe shows the host's own `Error` coming out of `planRetention`. INV-QD-424 states this carve-out on purpose: it is "the host's own throw, which is not a value the check reads".
3. The `admission-step` barrel clause (`89-check.mjs:640-642`) only matches `HostBatch` written in `index.ts` itself. It would miss a re-export passed through a sibling the barrel already exports. That gap is covered by `pnpm spec:api`: the count is still 942, and gate 13 fails on any export missing from `spec/overview.md`. A grep also finds no re-export of `HostBatch.ts` in `src`. `lib/HostBatch.js` ships under `files`, but the `exports` map has only `.`, so a consumer cannot import it (ADR-QD-099).
4. `AdmittedRows`' nominal brand exists only in the types: `declare private` emits nothing at runtime. A JavaScript caller cannot reach `verifiedArchiveFacts`, because the package exports nothing from `ArchiveFacts.ts` except `SequenceIntegrityError` and `verifySequenceIntegrity` (`SequenceIntegrity.ts:26`), and `ArchiveInputInvalid` and `ArchiveInputRefusal` (`AuditArchive.ts:49`). `verifySequenceIntegrity` admits its rows first.
5. `HostBatch.ts:86` filters `undefined` out of the rows after `rowsRefusal` has already refused every hole, so the filter only narrows the type. Its mutant is the one recorded `EQUIVALENT` survivor, and the reason is stated. Keep the line in this order: the `filter-first` variant (`89-RED-EVIDENCE.md:387-388`) shows that filtering before the check would admit a list with holes.
6. The first phase commit, `5efd5449`, holds the base record together with its scorer `89-mutation.mjs`, both under `.planning/`. "Committed alone first" is read as: the first commit, with nothing outside `.planning/` and no test or source file in it. This is the same reading as Phase 88's Observation 4. The auditor did not re-run the `commit` mode, because the harness's permission classifier refused that invocation. Its judge is covered by the self-test, and the commit's shape was checked directly with `git log`.
7. The working tree has uncommitted edits to `README.md` and `.planning/config.json`. They were there before the audit started, both are on the `NEVER_STAGED` list, and no phase commit touches them. Keep them out of the commit that adds this file.
8. A commit landed during the audit: `364697a3`, which changes only `89-VALIDATION.md`. `trailers` was re-run after it and counted 34 commits, each with the one trailer. Nothing outside `.planning/` changed after the gate head. The remote check reads only the locally fetched `origin/*` refs; nothing was fetched over the network.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-26 | 32 | 32 (31 mitigated, 1 accepted) | 0 | gsd-security-auditor, ASVS L1 grep-depth on HEAD 1ad87644 (364697a3 landed during the audit, `.planning/` only), with these re-runs: `89-check.mjs` base, scan-ids, scan-forbidden, trailers (33, then 34), admission-step, entry-points-first, records, records --close, --self-test (377); `89-pinned-check.mjs --all-applied` and --self-test (54); `89-earlier-checks.mjs` (59 rows matched) and --self-test (47); `89-mutation.mjs compare` and --self-test (92); `89-check.mjs vitest` (`pnpm exec vitest run --project audit`, 724 rows in 34 files, 0 failed) and `suite --green` (31 base and 3 born test files); tstyche on `HostBatch.tst.ts` under `tsconfig.tstyche.json` and `tsconfig.test.json` (13 of 13 assertions each); `pnpm spec:api` (942); `pnpm spec:verify:strict` (21 PASS); no-release and scope checks with git; a scratch probe of `admitRows`/`planRetention` edge inputs (autonomous run) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-26
