---
phase: "08"
slug: "port-serving-from-registry"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-09"
---

# Phase 08 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| automation to human decision | A human, not an unattended run, amends an accepted ADR (08-01 checkpoint) | decision outcome (`d01_*`) |
| plan 08-01 to the branch plans | Later plans act on the recorded outcome | `d01_outcome` key |
| test/simulation config to the evaluation environment | Fixture data and override layers decide what every port answers | fixture answers, override layers |
| generic per-port builder to each slot | A slot must provide its own port's service | port service layers |
| remote asker to `answerRemotely` | A client-chosen attribute, relation, event or predicate name is admitted or refused by the host's declaration | untrusted names from the wire, attribute values |
| host configuration to the server | `servingFor(policies)` decides which names a server will answer | serving declaration |
| spec to code | ADR, behaviour and invariant are normative (AGENTS.md §11) | normative documents |
| human decision to the permanent record | The maintainer's reason must reach the ADR intact | `d01_reason`, `d01_date` |
| repository to package consumers | The changeset and upgrading page describe what breaks | release notes |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-08-01 | Elevation of privilege | 08-01 checkpoint auto-resolved by an unattended run | high | mitigate | `08-01-PLAN.md:75` `gate="blocking-human"`, no `auto_select`; `.planning/config.json` `auto_advance: false` | closed |
| T-08-02 | Tampering | `d01_outcome` diverging from the human's reply | medium | mitigate | `08-01-SUMMARY.md` `d01_outcome: approved`; cross-recorded in CCR-QD-392 (`spec/traceability.md`) | closed |
| T-08-03 | Repudiation | reusing a reserved number another phase used | medium | mitigate | Step 1 grep of `spec/`, `packages/`, `.changeset/`; ADR-QD-114 file `114-a-port-states-what-it-serves.md` unique | closed |
| T-08-04 | Elevation of privilege | `fixturePortsLayer` with empty/partial setup | high | mitigate | Every slot ends at `NONE[d.port]` (INV-QD-007); Test C in `packages/core/test/Ports.test.ts`; "defaults fail closed" unchanged (08-02-SUMMARY) | closed |
| T-08-05 | Tampering | `tabulatePorts`' wider implementation signature | medium | mitigate | `packages/core/src/Ports.ts:175-179` overloads; body is five `f(PORTS.X)` rows; both result types pinned in `Ports.tst.ts`; round trip in `PortsLayer.test.ts` | closed |
| T-08-06 | Tampering | precedence when a port has both answers and a layer | low | mitigate | "a layer wins" pinned by Test B; `TestLayerOptions.tst.ts` forbids both | closed |
| T-08-07 | Elevation of privilege | required port's derived admission | high | mitigate | `admitted` typed by `PortServing` slot (`AttributeResolver.ts:152`, `RelationshipResolver.ts:205`, `CustomPredicate.ts:181`); empty list refuses `constructor`/`__proto__` (`PortRemote.test.ts`); WR-01 fix `6ac8416` refuses a required port whose list is missing or not a list | closed |
| T-08-08 | Information disclosure | signature port served without opt-in | high | mitigate | Opt-in facet `declare([])` is `{}`; "serves the signature port only when a policy asks it" test untouched (08-03-SUMMARY) | closed |
| T-08-09 | Tampering | leaf mapped to the wrong port or unmapped | medium | mitigate | Test D pins each of six port-reading tags to exactly one port; generated-policy property passes; unmapped leaf fails closed (NotServed) | closed |
| T-08-10 | Denial of service | start-up fold (every node × five facets) | low | accept | Runs once per policy set at start-up, never per request | closed |
| T-08-11 | Repudiation | ADR-QD-114 misstating what was approved/built | medium | mitigate | Date/reason from 08-01 `d01_*` keys, names from 08-03-SUMMARY, re-read from disk (08-04-SUMMARY) | closed |
| T-08-12 | Repudiation | spec revision drift | low | mitigate | All revisions via `spec-revise.mjs`; `spec-revise --check` + `spec:verify:strict` pass (CI run 42662291585) | closed |
| T-08-13 | Repudiation | rejection note paraphrasing the reason | medium | mitigate | Reason/date quoted verbatim from `d01_reason`/`d01_date` (outcome was `approved`, so no rejection note was written) | closed |
| T-08-14 | Repudiation | changeset misstating what breaks | medium | mitigate | Facts checked against 0.10.0 changelog and post-0.11.0 pending changesets (08-06-SUMMARY); `spec:publish` passes | closed |
| T-08-15 | Repudiation | records citing names the tree lacks | medium | mitigate | `pnpm spec:api` (gate 13) + `spec:verify:strict` pass in CI run 42662291585 | closed |
| T-08-16 | Elevation of privilege | fail-closed regression slipping past per-plan checks | high | mitigate | Every `check:pr` step passes on `c807b64` (08-UAT.md test 1); no gate script or threshold changed | closed |
| T-08-SC | Tampering | npm/pip/cargo installs | high | accept | No package installed in any 08 plan | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-10 | Start-up-only cost (five object lookups per policy node), never on the request path | plan 08-03 threat model | 2026-11-09 |
| AR-08-02 | T-08-SC | No dependency installed by any phase 08 plan | plans 08-01..08-06 threat models | 2026-11-09 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-09 | 17 | 17 | 0 | agent (secure-phase, ASVS L1 grep-depth; short-circuit: plan-time register, 0 open) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-09
