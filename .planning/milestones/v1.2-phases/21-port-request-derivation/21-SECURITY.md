---
phase: "21"
slug: "port-request-derivation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-12"
---

# Phase 21 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Written retroactively on 2026-11-12, at the milestone's re-verification of Phase 21 (HEAD d37a4355); the phase closed on 2026-11-11 without this record.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| capture/replay and test doubles → request key | a key that drops a field hands one question's answer to another in a devtools replay or a `replyTable` | port request keys |
| wire question → remote host | `encodeQuestion`'s bytes cross a process; D-01 must not change them | encoded port questions |
| served question → host decode | the strict decode must keep refusing excess and malformed members; no `undefined` member may reach `toJson` | decoded port questions |
| description → every key consumer | replay, `replyTable` and the signature fixture match requests by `d.key` | derived keys |
| port span → host tracer | a span is product observability (ADR-QD-051) and must not carry a value (INV-QD-044) | span attributes |
| repository → package consumers; spec → code | the changeset states the key-text change; traceability and overview are checked by gates 10 and 13 | changeset, spec records |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-21-01 | Tampering | a wrong replay or double answer from a dropped key field | medium | mitigate | The ARCH-69 property law (closed table over the four derived ports plus per-port oracles) pins each key to `canonicalKey` of the wire question and is green at HEAD; a dropped question member is a compile error (`PortRequest.tst.ts`; falsified at HEAD: dropping `signerRole` from `SignatureHistory`'s `toQuestion` gives TS2741) | closed |
| T-21-02 | Tampering | wire bytes changed by D-01's strip | medium | mitigate | `PortWire.test.ts` exact JSON goldens, added in 464544e3 before any src change, have a zero-line diff since and pass at HEAD | closed |
| T-21-03 | Repudiation | a red test that fails for the wrong reason | low | mitigate | RED reproduced on the base by the re-verifier in a worktree at 464544e3: `PortRequest.tst.ts` 3 failed / 2 passed on assignability assertions; the key law's RED (4 failed) is recorded in 21-01-SUMMARY | closed |
| T-21-04 | Tampering | encode now takes `unknown` (`encodeUnknownResult`) | medium | mitigate | `PortWireEncode.ts` validates what it encodes with the same schema (`QuestionOf<Q>`, `encodeUnknownResult`); PortConformance's wire rows and the goldens run unchanged and green | closed |
| T-21-05 | Information disclosure | CustomPredicate's question gains a member | low | mitigate | The goldens pin `{subjectId, name}` plus `resource`/`params` only; CustomPredicate keeps its documented own `key`/`defect` (`CustomPredicate.ts:238-250`) | closed |
| T-21-06 | Tampering | a derived key covering fewer fields than the hand key it replaced | medium | mitigate | The unchanged reach rows assert every field still changes the key; the law ties the key to the wire question; WR-01 (f0977945) restated the law as "same wire question, absent equals undefined" | closed |
| T-21-07 | Tampering | the signature fixture splitting or merging pairs | medium | mitigate | `SignatureHistory.test.ts` and audit `SignatureLedger.test.ts` (24) run unchanged and green; devtools `Capture.test.ts` (52) green | closed |
| T-21-08 | Repudiation | deleting pins before the replacing law is green | low | mitigate | 21-03 Task 1 turned the law green (7ca86f83) before Task 2 deleted the replaced pins (67b2c6ad); the `request keys` pin count is 1 at HEAD | closed |
| T-21-09 | Information disclosure | a typed pose admitting a non-`SpanValue` member | medium | mitigate | `PoseOf` (`PortSpanEncode.ts:95`) reads member types from the span struct's `SpanFields`, which are `SpanValue` leaves by type (INV-QD-044 unchanged) | closed |
| T-21-10 | Repudiation | a span saying less than was asked | low | mitigate | Omitting a pose member is a compile error (falsified at HEAD: dropping `meaning` gives TS2322); `PortSpan.test.ts` pins the encoded attributes | closed |
| T-21-11 | Repudiation | an unrecorded key-text change | low | mitigate | `.changeset/port-keys-cover-the-request.md` (ARCH-69) and CCR-QD-411 in `spec/README.md` | closed |
| T-21-12 | Tampering | ADR-QD-133 overstating the harm as a production grant | low | mitigate | ADR-QD-133 states the `_WAVE7-CONTEXT.md` correction in its Context (c44efe7f); `pnpm spec:verify:strict` 21 PASS / 0 FAIL at HEAD | closed |
| T-21-13 | Elevation of privilege | a regression slipping past per-plan checks | high | mitigate | `pnpm check:pr` exit 0 at the end of Phase 21 and again at the end of Phase 29 (HEAD tree); since ba38f367 no threshold, `.oxlintrc.json`, Stryker or vitest config changed — the only `scripts/` edit is a later phase's `UNTRACED_BUDGET` comment rewording (c76c3595), and the AGENTS.md §3 edit was 21-05's planned record; per-file mutation re-measured at HEAD after the review fixes (see Audit Trail) | closed |
| T-21-SC | Tampering | npm/pip/cargo installs | high | accept | No `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` or package manifest changed in the phase (ba38f367..7f64db9a); fast-check and tstyche were existing devDependencies | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-21-01 | T-21-SC | No dependency is added or upgraded by this phase; no manifest, lockfile or workspace file changed in it | plan-time threat model (21-01..21-05), confirmed by audit | 2026-11-12 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-12 | 14 | 14 | 0 | autonomous orchestrator (secure-phase, ASVS L1 short-circuit; retroactive, at the milestone re-verification) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-12
