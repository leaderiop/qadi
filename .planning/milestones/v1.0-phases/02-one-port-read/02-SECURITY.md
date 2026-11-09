---
phase: "02"
slug: "one-port-read"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-08"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| port adapter to evaluator | A store's answer and its failures (throws and defects included) cross into the authorization path | Arbitrary store data (attribute values are sensitive) |
| evaluator to tracer backend | Span attributes leave the process to the host's tracer | Projected span fields only (`pose`/`disclose`), never resolved values (INV-QD-044) |
| remote asker to served read | `answerRemotely`/`servePortRead` read a store for another process | Untrusted JSON question, including client-chosen `meaning`/`signerRole` strings |
| client version to server version | A new client's question may reach an old, strict server | Wire question with optional extra keys |
| spec to code | `spec/` is normative (AGENTS.md §11) | Decision, behaviour and invariant records |
| repository to package consumers | Changesets and the upgrading page describe what changes | Release notes |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Information disclosure | `readPort` answer annotation | high | mitigate | The answer reaches a span only through `d.attributes.disclose(answer, args)` (`PortAccess.ts:198`, the single `annotateAnswer` call site). SECRET sentinels in `PortServe.test.ts` and `PortAccess.test.ts` pass | closed |
| T-02-02 | Denial of service | `servePortRead` with a throwing store | medium | mitigate | The invocation runs inside `Effect.flatMap(d.service, …)` under `catchPortDefect` (`PortAccess.ts:192-199`). After WR-01 (7cbd7c8), `disclose` also runs under it, and three `[null]`-store tests in `PortRemote.test.ts` prove a typed error / `Unavailable` and no defect | closed |
| T-02-03 | Elevation of privilege | `ask*` refactor (verdict inputs, `MissingResourceId`, counting) | high | mitigate | `Walk.ts` and `Predicate.ts` are unchanged since `9b5b880`. The full suite passes: 3895 tests, coverage 99.06% statements, BDD green. The D-07 rows pin "annotate, then validate" and "no call counted" | closed |
| T-02-04 | Repudiation | local vs served span divergence | medium | mitigate | One projection (`pose`/`disclose` on each description) and one body (`readPort`). The per-port table "a read is one body, locally and served (ARCH-47)" in `PortAccess.test.ts:224` asserts equality for every registry row | closed |
| T-02-05 | Tampering | client-chosen `meaning`/`signerRole` annotated on the server's span | low | accept | See the Accepted Risks Log | closed |
| T-02-06 | Information disclosure | served signature span's `qadi.matched` | low | accept | See the Accepted Risks Log | closed |
| T-02-07 | Denial of service | version skew, a new client against an old server | low | accept | See the Accepted Risks Log | closed |
| T-02-08 | Tampering | removing the wire's span members | medium | mitigate | The `PortWire.ts` encode/decode functions are unchanged by the diff. Per-port wire laws (`PortConformance.test.ts`), `PortWire.test.ts` and http's `PortRoutes.test.ts` pass | closed |
| T-02-09 | Repudiation | ADR-QD-109, BEH-QD-227/332, INV-QD-244, traceability | medium | mitigate | `spec-revise --check`, `spec:verify:strict` (21/0), `spec:examples` and `spec:api` pass on HEAD | closed |
| T-02-10 | Repudiation | INV id collision with a parallel phase | low | mitigate | `next-id INV` was re-run at execution and gave 244 (243 is phase 01's). Recorded in 02-03-SUMMARY | closed |
| T-02-11 | Repudiation | `.changeset/one-port-read.md` misstating what breaks | medium | mitigate | The changeset states the 0.11.0 published-version fact and the skew behaviour. `PortWireSpan` appears only as "removed, never published". The ARCH-31 note is corrected | closed |
| T-02-12 | Repudiation | `spec/overview.md` drift from the exports | medium | mitigate | `pnpm spec:api` (gate 13) passes on HEAD | closed |
| T-02-13 | Elevation of privilege | a fail-closed regression slipping past per-plan checks | high | mitigate | Every `check:pr` step passes on HEAD (UAT test 1 passed). No budget, threshold or gate script was edited | closed |
| T-02-SC | Tampering | npm/pip/cargo installs | high | accept | No `package.json`, `pnpm-lock.yaml` or `pnpm-workspace.yaml` change since `9b5b880`, so there is nothing to vet | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-02-01 | T-02-05 | The strings are `SpanValue`s, never resolved values (INV-QD-044). Decode is strict and depth-bounded (`UNTRUSTED_DECODE_OPTIONS` / `WIRE_MAX_DEPTH`). Questions concern only the session's own subject (BEH-QD-330), and the signature port is served only on the explicit `own-records` opt-in. Same exposure as an open relation or event name today (BEH-QD-331). Code review IN-05 notes there is no length bound or allowlist on these strings; this is left as an info-level follow-up | Planned (02-02 threat model) | 2026-11-08 |
| AR-02-02 | T-02-06 | The span stays server-side in the host's tracer and records only whether the session subject's own records match. The reply to the client is unchanged | Planned (02-02 threat model) | 2026-11-08 |
| AR-02-03 | T-02-07 | An old server refuses the extra keys as `Malformed`, and the asker turns that into the port's own typed error, so evaluation fails closed (INV-QD-241). Stated in the changeset | Planned (02-02 threat model) | 2026-11-08 |
| AR-02-04 | T-02-SC | No package was installed in this phase | Planned (all plans) | 2026-11-08 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-08 | 14 | 14 | 0 | Claude (/gsd-secure-phase 02, ASVS L1, grep-depth short-circuit; register authored at plan time) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-08
