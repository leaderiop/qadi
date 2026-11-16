---
phase: "48"
slug: "audit-reports-core-s-refusal-and-derives-lost"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-16"
---

# Phase 48: Security

> The per-phase security contract: threat register, accepted risks, and audit trail. The register is the union of the `<threat_model>` blocks in 48-01..48-08-PLAN.md, written when the plans were authored. It was verified at ASVS L1 against `git diff c9fde4ba..HEAD` by grep-level checks, run by the orchestrator. Every Threat Flags section in the SUMMARYs reads "None".

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| A host's `onRefused` hook ← `@qadi/audit` | A host receives the refusal of a record the audit trail could not encode | core's `SinkRecordNotEncodable`: `recordTag`, `evaluationId` and `refusal` only (INV-QD-104) |
| `@qadi/audit` → the host's log and metrics | Warnings, the lost counter and span attributes report entries that were not written | Fixed messages, three annotations on the refusal line, closed metric labels |
| `onOutcome` ← the sink | A host observes each write's outcome | `AuditWriteOutcome` with an unwritten staging carrying only `_tag` (never `commit`) |
| Phase evidence → the close | Editing a baseline, gate or config would let the change judge itself | Mutation scores, RED pins, characterisation rows, scripts, configs, barrels |
| Branch → registry | Changesets and versions could publish | Package versions (nothing consumed) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-48-01 | Repudiation | `48-mutation-base.json` | medium | mitigate | Measured on the untouched tree and committed alone as the first plan commit (`d1428895`, parent `c9fde4ba`) | closed |
| T-48-02 | Tampering | The ADR check | medium | mitigate | 48-01-SUMMARY `## ADR check` quotes ADR-QD-054 and ADR-QD-056 verbatim with `Forbids:`/`Does not forbid:` and a `Verdict:` | closed |
| T-48-03 | Repudiation | Reserved ids | low | mitigate | Checked free at `phase_base` whole-id; the CCR-QD-439 row reads `Unused: none` | closed |
| T-48-04 | Tampering | `AuditWriteOutput.test.ts` expectations | high | mitigate | Literal expectations, no import of the projection; committed before any src change and unedited since (`git diff 24c61b2c` empty) | closed |
| T-48-05 | Repudiation | The `Written.CommitFailed` cause | medium | mitigate | The cause row asserts the error; the base survivor `AuditWriteReport.ts:240:43` is killed, and the after score is 1 (78/78) | closed |
| T-48-06 | Information disclosure | Refusal line annotations | medium | mitigate | The Refused row pins exactly `qadi.refusal`, `qadi.path`, `evaluationId` (`AuditWriteOutput.test.ts:72`) | closed |
| T-48-07 | Information disclosure | The refusal sentence routed into a log line | high | mitigate | Core's only change is a doc comment in `JsonRefusal.ts` (no non-comment line changed); the annotation row passes unedited | closed |
| T-48-08 | Tampering | The hook payload's runtime shape | medium | mitigate | `AuditRefusal.tst.ts` (4 pins, RED on base, green after); the changeset is **Breaking** with the migration | closed |
| T-48-09 | Repudiation | A refused record dropped silently | high | mitigate | The Refused rows (with and without a hook) pass unedited after both src commits | closed |
| T-48-10 | Spoofing | An alias of the deleted class | medium | mitigate | `git grep AuditEntryNotEncodable` finds nothing under `packages/*/src` or `packages/*/test`; gate 13 green (928 exports) | closed |
| T-48-11 | Repudiation | A lost entry not counted or warned | high | mitigate | Characterisation and agreement tables unedited and green; `UnwrittenRow.test.ts` covers the row's readers | closed |
| T-48-12 | Tampering | A fourth staging variant mapped in one reader only | medium | mitigate | `unwrittenRow` is a hoisted exhaustive match; `UnwrittenRow.tst.ts` pins that a fourth tag is refused | closed |
| T-48-13 | Information disclosure | The row module leaking into the public API | low | mitigate | `UnwrittenRow` is absent from `packages/audit/src/index.ts`; `pnpm spec:api` green | closed |
| T-48-14 | Elevation of privilege | `commit` leaking into `onOutcome`'s staging | medium | mitigate | `StageResult` is a closed `Data.TaggedEnum` where only `Staged` carries `commit`; `unwrittenOf` builds a fresh `UnwrittenStaging[self._tag]()`; the rows pin `stagingKeys` `["_tag"]` | closed |
| T-48-15 | Repudiation | A later variant matched in one branch only | medium | mitigate | `writtenStaging`, `evaluationIdOf` and `outcomePath` use `Match.tagsExhaustive`/`Match.exhaustive` (`AuditDecisionSinkLive.ts:129`, `AuditWriteReport.ts:92-260`); no `_tag ===` remains | closed |
| T-48-16 | Denial of service | A commit failure escaping and failing the decision | high | mitigate | The `Staged` arm keeps `Effect.catchCause` → `CommitFailed({ cause })` (`AuditDecisionSinkLive.ts:135`); `AuditSinkDeadline.test.ts` passes unedited | closed |
| T-48-17 | Repudiation | The break released unrecorded | high | mitigate | `.changeset/audit-refusal-is-cores.md` starts `**Breaking.**`; the 0.13 upgrade entry's After fence compiles (`pnpm spec:website-examples`, 66 blocks) | closed |
| T-48-18 | Information disclosure | The upgrade fence teaching hosts to log record content | medium | mitigate | The After fence reads only `e.evaluationId` and `describeEncodeRefusal(e.refusal)` | closed |
| T-48-19 | Tampering | ADR-QD-056 / ADR-QD-095 rewritten | medium | mitigate | 48-06's diff check: no removed line other than Revision and Change History rows | closed |
| T-48-20 | Tampering | Spec listings drifting from the code | medium | mitigate | 48-07's check: no fenced block names the deleted class or `reason`; `pnpm spec:examples` compiles 116 blocks | closed |
| T-48-21 | Repudiation | An unreserved id, a placeholder or a dead link | low | mitigate | 29 links resolve to heading slugs; `pnpm lint` (`[no-numbering-placeholder]`) green; 48-08 diffs ids against the reserved set | closed |
| T-48-22 | Tampering | The mutation evidence | high | mitigate | The base's exact invocation; `48-mutation-after.json` committed alone (`f03a3037`); every file at 1, none fell | closed |
| T-48-23 | Tampering | A judging file edited | high | mitigate | `git diff c9fde4ba..HEAD` touches no script, `AGENTS.md`, Stryker or vitest config, oxlint config, barrel or `packages/testing` | closed |
| T-48-24 | Repudiation | A metric re-declared or a lost entry uncounted | high | mitigate | No added or removed `Metric.counter/frequency/histogram` line since the base; `check:pr` green with the unedited tables | closed |
| T-48-25 | Repudiation | A release, push or consumed changeset | high | mitigate | No tag contains the base; the branch is on no remote; no CHANGELOG changed; the new changeset is present and unconsumed | closed |
| T-48-SC | Tampering | npm/pip/cargo installs | high | mitigate | No `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `c9fde4ba` | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low. Only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| — | — | No risk accepted in this phase | — | — |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-16 | 26 | 26 | 0 | orchestrator (secure-phase, ASVS L1 short-circuit: register authored at plan time, threats_open 0) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-16

## Security Audit 2026-11-16

| Metric | Count |
|---|---|
| Threats found | 26 |
| Closed | 26 |
| Open | 0 |
