---
phase: "09"
slug: "sink-record-projection"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-09"
---

# Phase 09 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| evaluation to the decision sink | An obligation record leaves the process through `DecisionSink`; an emit must never change enforcement (INV-QD-035) | question identity keys, decision outcome |
| port wire to a remote asker | Encode refusals say where a value could not be encoded, never what it was (INV-QD-104) | wire paths, refusal kinds |
| `@qadi/core`'s root to package consumers | Every moved name must stay exported from the root | public exports |
| spec to code | ADR, behaviour and invariant are normative (AGENTS.md §11) | normative documents |
| repository to package consumers | The changeset describes the change's scope | release notes |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-09-01 | Repudiation | `obligationRecord` replacing `discharge`'s inline record | medium | mitigate | Pin `00eb826` landed before the move `aed62ca` and passes unmodified after it (`DecisionSink.test.ts`) | closed |
| T-09-02 | Information disclosure | the obligation row's identity keys | medium | mitigate | `SinkEmit.ts` `obligationRecord` reads `resourceIdOf(question.resource)` only; unit table `e71f756` asserts no `resource`/field key | closed |
| T-09-03 | Elevation of privilege | the obligation gate's emit sites | high | mitigate | `Qadi.ts` diff touches only the import and the record construction; `sinkEmitter` untouched; "the obligation emit cannot change enforcement either" (`DecisionSink.test.ts:879`) and "one emitter guards every emit site" (`:914`) pass | closed |
| T-09-04 | Information disclosure | `encodeRefusalAnnotations` and `no-refusal-annotation-outside-core` | medium | mitigate | `check-house-style.mjs` diff moves the `EXEMPTIONS` key `SinkWire.ts` → `JsonRefusal.ts` and nothing else; house-style gate clean (408 files) | closed |
| T-09-05 | Repudiation | `describeEncodeRefusal`'s sentences | medium | mitigate | `EncodeRefusalReport.test.ts` diff is import lines only | closed |
| T-09-06 | Tampering | the port wire's and the record codec's refusals | medium | mitigate | `JsonHazard.ts` and `PortWireEncode.ts` diffs are import lines and doc comments only; full suite (3994 tests) green | closed |
| T-09-07 | Denial of service | a public name dropping off `@qadi/core`'s root | medium | mitigate | `index.ts:24` `export * from "./JsonRefusal.ts"`; `pnpm spec:api` green (863 exports); `spec:package` green in 09-04's run | closed |
| T-09-08 | Repudiation | ADR-QD-116, the amendments and the CCR row | medium | mitigate | `pnpm spec:verify:strict` and `spec-revise.mjs --check` green on HEAD | closed |
| T-09-09 | Repudiation | the "no contract changed" claim | low | mitigate | CCR-QD-393 row in `spec/README.md` cites pin `00eb826` | closed |
| T-09-10 | Repudiation | `.changeset/sink-record-projection.md` scope | low | mitigate | Gate 13 (`spec:api`) and gate 14 (`spec:package`) green | closed |
| T-09-11 | Repudiation | the overview drifting from where the vocabulary lives | low | mitigate | `spec/overview.md` Rev 1.77 names both leaves; gate 13 green | closed |
| T-09-12 | Elevation of privilege | a fail-closed regression slipping past per-plan checks | high | mitigate | No package, lockfile, vitest config, `.oxlintrc.json`, budget or threshold changed (`git diff --stat 37fc452..HEAD` empty for those paths); suite, BDD and coverage green; full `pnpm check` dispatched in CI (run 42674934850) | closed |
| T-09-SC | Tampering | npm/pip/cargo installs | high | accept | No package installed in any plan (no `package.json`/`pnpm-lock.yaml` diff) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-09-01 | T-09-SC | No dependency was installed or changed in this phase; there is no supply-chain surface to mitigate | plan-time register (all four plans) | 2026-11-09 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-09 | 13 | 13 | 0 | gsd-secure-phase (orchestrator, L1 grep-depth) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-09
