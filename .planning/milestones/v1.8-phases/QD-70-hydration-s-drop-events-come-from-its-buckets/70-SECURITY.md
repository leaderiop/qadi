---
phase: "70"
slug: "hydration-s-drop-events-come-from-its-buckets"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-22"
---

# Phase 70 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes how `@qadi/react`'s hydration engine reports what it drops. Each entry drop is collected in a reason-keyed record (`HydrationBuckets.ts`: `DropBuckets`, `entryBuckets`, `dehydrationBuckets`), and the `EntriesDropped` and `LeftOut` events are derived from that record by `dropEvents`, so a reason cannot gain a bucket without its event. A whole-payload refusal is mapped from its producer through `PAYLOAD_PRODUCERS` and its inverse `PAYLOAD_REASONS`, which replaces a hand-written `Match`. Events, their order and their counts are unchanged; a 32-row characterisation written against the engine before the refactor pins that. No network, auth, file, dependency or public-export surface changes: the new module and the new engine exports stay package-private, and `check-api-surface` still reads 941 exports. The threats are a drop reason counted under no event, a foreign or refused entry encoded or seeded, a refusal mapped to the wrong reason, records that claim more than ran, and the release path.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| server page → browser `hydrate` | the dehydrated payload a server embedded in the page | untrusted JSON: a payload of any shape, version or subject, entries of any depth |
| host decisions → `dehydrate` | the decisions a host hands over to embed for one subject | entries that may belong to another subject or carry a policy that does not encode |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-70-01 | Tampering | mutation base measured off `phase_base` | medium | mitigate | `70-mutation-base.json` react group `head` = 3630e298; written by 0545ca41, the first commit after the base and the only commit touching it; `70-mutation.mjs` refuses a dirty tree (self-test 24 passed) | closed |
| T-70-02 | Repudiation | characterisation pinning expectation, not base behaviour | medium | mitigate | b6434572 changes only `HydrationDropEvents.test.ts`, run on the untouched engine (32/32); later review edits only retitled, rewrapped and added rows, no expected value changed | closed |
| T-70-03 | Tampering | throwaway drop reason or probe committed to source | high | mitigate | `packages/core` has no diff since the base; only the 3 intended react sources and 4 react tests changed; no probe file or Stryker config left | closed |
| T-70-04 | Repudiation | evidence not matching what ran | medium | mitigate | `70-RED-EVIDENCE.md` agrees with every experiment's recorded status and log (base and after-change, each restore 0) | closed |
| T-70-05 | Denial of service | a drop reason counted under no event (INV-QD-045) | high | mitigate | `HydrationBuckets.ts` `DropBuckets` mapped type (missing key TS2741), total constructors, `dropEvents` visits every key; `HydrationEngine.ts` emits drop events only through `dropEvents`; pinned by `HydrationBuckets.tst.ts` (11 pins), `HydrationBuckets.test.ts`, `HydrationDropEvents.test.ts` | closed |
| T-70-06 | Information disclosure | foreign subject's entry encoded or misreported | high | mitigate | `planDehydration`'s single loop checks the subject and `continue`s before `dehydrateEntry`; rows "an entry both foreign and unencodable is ForeignSubject only" and the order row green | closed |
| T-70-07 | Tampering | refused hydrate entry seeded anyway | high | mitigate | each refusal `continue`s before the one `seedFor` site; `runHydrate` asserts seeded delta, initial-values length and lookup calls equal `row.seeded` | closed |
| T-70-08 | Tampering | decoder refusal mapped to wrong whole-payload reason | medium | mitigate | `PAYLOAD_PRODUCERS` `satisfies` the reason-keyed record; `ReasonRaisedBy` is `never` for a doubled or unnamed producer; `PAYLOAD_REASONS` typed by it; conformance test drives one refusal per row; type pins cover doubled and unnamed | closed |
| T-70-09 | Spoofing | payload for another or no subject seeded instead of refused | high | mitigate | subject checks precede the entry loop; only the reason literal changed, to `PAYLOAD_REASONS.SubjectCheck` (typed `"PayloadSubjectMismatch"`); rows green | closed |
| T-70-10 | Tampering | throwaway row committed after the after-change experiment | high | mitigate | as T-70-03; every after-change experiment ends with a restore (status 0) | closed |
| T-70-11 | Repudiation | ADR falsely claims the file-sharing reason is gone | medium | mitigate | ADR-QD-183 decision 6 names ARCH-118's edit to `HydrationEngine.ts`; 70-05-SUMMARY corrects CONTEXT's D-02 wording | closed |
| T-70-12 | Tampering | register cites CCR-QD-462 before its row, or reserved id misused | low | mitigate | first citation e5f3ba4c carries the README row with ADR-183; reservation file hash unchanged; strict traceability 21/21, `spec-revise --check` passes | closed |
| T-70-13 | Repudiation | invariant naming an enforcement that does not exist | medium | mitigate | all 25 quoted test titles in INV-QD-385/386 Enforcement resolve in the named files | closed |
| T-70-14 | Tampering | link to a new anchor that resolves nowhere | low | mitigate | 27 links to the 7 new anchors (INV-QD-385, 386, BEH-QD-686..690), 0 unresolved | closed |
| T-70-15 | Tampering | mutation drop hidden by EXAMINED or base edit | medium | mitigate | base json touched once (0545ca41); `EXAMINED` admitted only after a by-hand run killed every admitted mutant (161 Killed, 6 RuntimeError at load); close re-recorded at 39d5a9de after code review: engine 126/126, buckets 14/14, `compare` exit 0, 0 new Ignored | closed |
| T-70-16 | Repudiation | DRPE complete before the merge gate ran on the final commit, or a WX row marked complete | medium | mitigate | `check:pr` 0 on b3903857 before DRPE-01..05 were marked; after code review `check:pr` 0 again on 984fb6ed (17/18, mutation skipped by design), no code change since; WX-01..07 still Pending | closed |
| T-70-SC | Tampering | dependency installs (every plan) | low | accept | see AR-70-01 | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-70-01 | T-70-SC | No package is installed, added or upgraded; `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` and every package manifest are unchanged since `phase_base` | plan-time disposition (70-01..70-07) | 2026-11-22 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit:
- **By-hand EXAMINED run predates the review fixes:** it was made on the engine at bbabff96. Every later change to `HydrationEngine.ts` is comments, wrapping, exported type aliases and one parameter rename; none of the nine examined literals changed, and the re-recorded close holds the same 42 Ignored mutants.
- **Non-durable evidence:** the experiment logs and the `check:pr` logs live in the session scratchpad; the durable record is `70-RED-EVIDENCE.md`, `70-mutation-close.json` and the passing tests.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-22 | 17 | 17 | 0 | gsd-security-auditor at 96388d30 (ASVS 1, block on high, register authored at plan time; independent mutation self-test and compare, strict traceability, spec-revise, house-style, api-surface, anchor and enforcement-title resolution) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-22
