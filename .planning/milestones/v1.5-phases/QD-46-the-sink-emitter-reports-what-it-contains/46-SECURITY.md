---
phase: "46"
slug: "the-sink-emitter-reports-what-it-contains"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-15"
---

# Phase 46: Security

> The per-phase security contract: threat register, accepted risks, and audit trail. The register is the union of the `<threat_model>` blocks in 46-01..46-07-PLAN.md, authored at plan time. It was verified by `gsd-security-auditor` against `git diff 76e589e0..95551d93`.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A caller's sink → the evaluation | A sink is an observer; nothing it does may change or defect a decision (INV-QD-035) | The decision record; the sink's failure, defect, interrupt or synchronous throw |
| The emitter's report → the host's logger | The warning leaves the process through whatever logger the host installed | The sink's `name`, the record's `_tag`, the `evaluationId`, `String(cause)` |
| A fan-out member → its siblings | One member's failure must not stop delivery to the later members (an audit store) | The member's failure and `name` |
| Phase evidence → the close | A baseline, gate or config edited would let the change judge itself | Mutation scores, RED/characterisation rows, scripts and configs |
| Branch → registry | Changesets and versions could publish | Package versions (nothing consumed) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-46-01 | Repudiation | `46-mutation-base.json` | medium | mitigate | One commit (`f94a273a`), the first phase commit, parent `76e589e0`, only that file; writer refused stale or mismatched reports | closed |
| T-46-02 | Tampering | RED rows | high | mitigate | `SinkEmitReport.test.ts:83-115` asserts count, level, message, four annotations, baseline outcome; `src` equal to base at every RED commit; first src commit `2efb6f47` | closed |
| T-46-03 | Elevation of privilege | a `record` that throws before returning an effect | high | mitigate | `SinkEmit.ts:102` `Effect.suspend(() => sink.value.record(record))` inside the containment; row E5 pins it | closed |
| T-46-04 | Tampering | characterisation rows | medium | mitigate | C1-C4 assert exactly one line (`ShippedSinkReports.test.ts:47-53`), committed green and alone in `2c1a15a5` before the RED commit | closed |
| T-46-05 | Repudiation | `46-classification.md` | medium | mitigate | Every row names the rows that pin it; W7 is in its own "kept but unreachable" section | closed |
| T-46-06 | Elevation of privilege | the report itself | high | mitigate | `reportSinkFailure` under `Effect.suspend` with its own `catchCause` (`SinkEmit.ts:54-72`); guarded `sinkName` (`:43-44`); E7, E9 pass | closed |
| T-46-07 | Information disclosure | report annotations | medium | mitigate | Exactly four keys (`SinkEmit.ts:63-68`); every E/O row asserts no subject, resource, policy or action key | closed |
| T-46-08 | Spoofing | a sink's `name` in a log line | low | accept | See Accepted Risks Log | closed |
| T-46-09 | Denial of service | one line per lost record | low | accept | See Accepted Risks Log | closed |
| T-46-10 | Denial of service | `decisionSinkAll` member stopping later members | high | mitigate | Suspended member call, guarded `sinkName`, contained member report (`DecisionSinkForwarding.ts:184-195`); A3, A4, A6 assert the next member still records | closed |
| T-46-11 | Repudiation | forwarder after W4's removal | medium | mitigate | Outer catch removed; the forwarding message appears once in source (`:101`); C1 and F2 pass | closed |
| T-46-12 | Information disclosure | member report's `qadi.sink` | low | accept | See Accepted Risks Log | closed |
| T-46-13 | Repudiation | ADR, changesets, guides vs code | medium | mitigate | Message, keys and the five names match the code; the ADR's record-tag literal read `Obligation` and was corrected to `Obligations` (ADR-QD-159 Rev 1.2, found by this audit); upgrade fence compiles under `check:pr` | closed |
| T-46-14 | Tampering | reserved ids | low | mitigate | `spec:verify:strict` 21 pass; each new BEH/INV has one heading and no mention at the base | closed |
| T-46-15 | Repudiation | traceability | medium | mitigate | `spec:verify:strict` (invariants traced, §4 test files exist, CCR coverage, revisions agree); CCR-QD-437 row present | closed |
| T-46-16 | Tampering | mutation evidence | high | mitigate | Base JSON one commit; `46-mutation-after.json` alone in `61abad3f`; after ≥ base for all five files; no Stryker disable comment | closed |
| T-46-17 | Tampering | judging files | high | mitigate | Changes since `phase_base` are only `.planning/`, `.changeset/`, `spec/`, website docs and `packages/core|audit/{src,test}` | closed |
| T-46-18 | Elevation of privilege | release, tag or push | high | mitigate | No tag contains the base; no CHANGELOG change; nothing staged; only `refs/heads/arch-wave-10` contains HEAD; both changesets added, none consumed | closed |
| T-46-SC | Tampering | dependency installs | high | mitigate | No `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `76e589e0` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

---

## Accepted Risks Log

| Threat ID | Risk | Why accepted | Guard |
|-----------|------|--------------|-------|
| T-46-08 | A sink's `name` could confuse a log reader | The name is the sink author's own label in their own process, passed as an annotation value and never interpolated into the fixed message, so a structured logger encodes it (as `AttributeResolverShape.name`) | `SinkEmit.ts:62-64`; ADR-QD-159 Consequences |
| T-46-09 | A sink that fails on every record logs one line per record | One line per lost record is the requirement (EMIT-01); a counter or rate limit was declined in D-01 and deferred under ADR-QD-123 | ADR-QD-159 Consequences |
| T-46-12 | The member report's `qadi.sink` names the member | The value is the member author's own `name` or `unnamed`; no record field is added to the fan-out's annotations | `DecisionSinkForwarding.ts:189`; `assertMemberReport` refuses subject/resource/policy/action keys |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-15 | 19 | 19 | 0 | gsd-security-auditor (sonnet), ASVS L1, block on high; T-46-13 closed by the orchestrator's ADR literal fix |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
