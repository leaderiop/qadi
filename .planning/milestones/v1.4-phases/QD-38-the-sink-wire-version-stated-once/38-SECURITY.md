---
phase: "38"
slug: "the-sink-wire-version-stated-once"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-14"
---

# Phase 38 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| sink record wire ↔ a reader | `decodeSinkRecord` reads records from a socket, a store or a devtools page; its version check decides what it accepts | untrusted JSON; the version a record claims |
| the library → its consumers | a new export (`WIRE_VERSION`) and a narrowed type (`WIRE_VERSIONS: readonly [2]`) reach every `@qadi/core` user at the next release | the public API surface |
| phase ↔ its judging files | Baselines, budgets, gate scripts and thresholds decide whether the phase passes | integrity of the verdict |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-38-01 | Tampering | `decodeSinkRecord`'s version check, guarded only by rows that compare with the constant they would move | medium | mitigate | five written-out rows state `supported: [2]` by hand (`9284313d`, describe `the read set, written out`); green | closed |
| T-38-02 | Repudiation | a baseline taken on an edited tree, or an experiment left in the tree | medium | mitigate | `38-mutation-base.json` is the first plan commit, alone (`cf854f3a`); both retype experiments reverted with `git status --porcelain -- packages` empty (38-01, 38-02 SUMMARY) | closed |
| T-38-03 | Tampering | `isReadVersion` admitting a value outside the read set | medium | mitigate | `const isReadVersion = Schema.is(Schema.Literals(WIRE_VERSIONS))` (`SinkCodec.ts:459`), strict literal comparison; absent, 1, 3 and `"2"` refused by the rows | closed |
| T-38-04 | Tampering | the encoder writing a version its own decoder refuses, or new bytes on the wire | high | mitigate | one constant feeds both schema literals, the encoder and the read set (code-only scan: 1 hit); byte goldens and round trip green unedited; retype after the conversion moves both sides and fails the pins (38-02 SUMMARY) | closed |
| T-38-05 | Information disclosure | `UnsupportedVersion.version` echoes the sent value | low | accept | unchanged by this phase (`SinkCodec.ts:479` builds the refusal as before); see AR-38-01 | closed |
| T-38-06 | Repudiation | spec records using an unreserved id, a CCR row missing a file, or a Revision disagreeing with its history | medium | mitigate | 38-03 reserved-id check (only ARCH-85, ADR-QD-151, CCR-QD-429 added); `spec-revise --check` and `spec:verify:strict` green | closed |
| T-38-07 | Tampering | a consumer meeting an unannounced export or narrowed type | medium | mitigate | `spec/overview.md` names `WIRE_VERSION` (gate 13 green, 918 exports); `.changeset/sink-wire-version-stated-once.md` is `@qadi/core` minor and names the narrowing | closed |
| T-38-08 | Tampering | gates, config, budgets or AGENTS.md edited so the phase passes | high | mitigate | `git diff --name-only b1e8ecbf HEAD -- scripts AGENTS.md stryker*.mjs vitest.config.ts .oxlintrc.json` is empty | closed |
| T-38-09 | Repudiation | a re-baseline, a stale report or a different invocation offered as the mutation close | medium | mitigate | base JSON in exactly one commit (`cf854f3a`); after 0.9752 ≥ base 0.9634 for SinkCodec.ts, 1 = 1 for SinkWire.ts; the first-run drop closed by test `72d4a0e2`, not a re-baseline | closed |
| T-38-10 | Elevation of privilege | a version-packages commit, a tag or a consumed changeset | medium | mitigate | no release or version commit and no tag since the base; the one changeset change is an addition | closed |
| T-38-SC | Tampering | npm/pip/cargo installs | high | mitigate | no `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since the base | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-38-01 | T-38-05 | The refusal's `version` echo predates this phase and is unchanged by it; bounding its description is Phase 40's describer | plan (38-02 threat model) | 2026-11-14 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-14 | 11 | 11 | 0 | secure-phase (L1 grep-depth, register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-14
