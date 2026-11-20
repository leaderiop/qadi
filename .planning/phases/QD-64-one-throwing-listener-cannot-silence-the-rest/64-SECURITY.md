---
phase: "64"
slug: "one-throwing-listener-cannot-silence-the-rest"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-20"
---

# Phase 64 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The phase changes one runtime function, `makeExternalStore`'s `notify` (`packages/devtools/src/model/ExternalStore.ts`), plus comment lines in the three feeds, the devtools README, one patch changeset and the spec. No network, auth, file-access or schema surface is added (the four SUMMARY threat-flag sections say None). Its threats are a listener failure being lost or starving other listeners, and records or gates that claim more than the code holds.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| store → host listener | `notify` calls every listener a host subscribed to a devtools store or feed | no data; a listener's thrown value comes back out of whatever published |
| devtools → host (thrown values) | one thrown value is rethrown as itself; several leave as one `AggregateError` with a fixed message | the host's own thrown values, by reference; no devtools data is added |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-64-01 | Repudiation | a RED case failing for another reason | medium | mitigate | `64-RED-EVIDENCE.md` records the exact failed-title sets on `phase_base` 8f3cb792: store R1–R5 failing and C1–C4 passing; feeds only TF25, F30, G48 failing, each `AssertionError: expected [] to deeply equal` | closed |
| T-64-02 | Tampering | a base mutation record from a stale or wrong report | medium | mitigate | `64-mutation-base.json` `head` = 8f3cb792…; it is committed by 2c1387a9, the first commit after `phase_base` and its only commit | closed |
| T-64-03 | Denial of service | Stryker running beside vitest or after a red test | low | mitigate | 64-01 ran Stryker in Task 1, before Task 2 added any test (2c1387a9 precedes 1bb27bd1) | closed |
| T-64-04 | Repudiation | a listener's throw swallowed | medium | mitigate | `notify` rethrows: nothing / the value itself / one `AggregateError` (ExternalStore.ts:56–58); R1 and R3 assert the throw reaches the caller, `undefined` and `null` included; variant v7 (swallow) fails six cases (`64-RED-EVIDENCE.md`) | closed |
| T-64-05 | Denial of service | one throwing listener starving the listeners after it | medium | mitigate | every listener is called inside a `try` (R1); TF25, F30 and G48 show a second listener called after a first one throws, built through `src/index.ts` | closed |
| T-64-06 | Information disclosure | the `AggregateError` message carrying data or a count | low | mitigate | `new AggregateError(thrown, "More than one of the store's listeners threw.")` is one literal with no interpolation (ExternalStore.ts:58), asserted by R2 and killed by variant v5 | closed |
| T-64-07 | Tampering | the variant matrix leaving an edited seam | medium | mitigate | the matrix commit 0cda2323 holds only `64-RED-EVIDENCE.md`; no commit after the seam commit 1d3207a4 touches `ExternalStore.ts` | closed |
| T-64-08 | Repudiation | a doc claiming more than the code holds | medium | mitigate | the three feeds changed in comment lines only (0 non-comment lines in `git diff 8f3cb792..HEAD`); review WR-01 (the resize-branch escape) was fixed in the texts in 87267447 and re-reviewed accurate; the verifier's gap (`spec/overview.md` row) was closed in 1a800ebb | closed |
| T-64-09 | Elevation of privilege | the changeset used to cut a release | medium | mitigate | one changeset added (`.changeset/devtools-every-listener-is-called.md`, patch); no `changeset version`, publish, tag or push (no tag contains 8f3cb792; `arch-wave-12` has no upstream) | closed |
| T-64-10 | Spoofing | an id outside the reservation | medium | mitigate | only ARCH-111, ADR-QD-177, CCR-QD-455, BEH-QD-656 and INV-QD-373 are used; BEH-QD-657–660 and INV-QD-374 appear only in the CCR row's Unused list; no ADR-QD-178, CCR-QD-456, BEH-QD-661 or INV-QD-375; `next-id.mjs` never run | closed |
| T-64-11 | Repudiation | a register row citing a wrong revision | medium | mitigate | `spec-revise --check`: every Revision matches its newest Change History entry; `verify-traceability --strict` PASS 21; the CCR-QD-455 row cites `spec/overview.md` Rev 1.129 and `spec/README.md` Rev 1.264 after the gap fix | closed |
| T-64-12 | Tampering | a re-baselined mutation record hiding a drop | medium | mitigate | the base record is untouched since 2c1387a9; the close compare (`64-mutation-close.json`) shows ExternalStore.ts 29/30 → 41/42 and the feeds unchanged | closed |
| T-64-13 | Elevation of privilege | a tag, version commit or publish cut from the phase | high | mitigate | no tag contains 8f3cb792; no version or release commit in `8f3cb792..HEAD` (the one subject matching "publish" is the WR-01 text fix); nothing pushed | closed |
| T-64-14 | Repudiation | requirements ticked without a green gate, or WX ticked | medium | mitigate | LSTN-01..04 ticked in 933291bd after `check:pr` exit 0; all seven WX rows Pending (phase.complete's WX ticks reverted by the orchestrator); `check:pr` re-run green on 31818311 and 1a800ebb | closed |
| T-64-15 | Information disclosure | scratch committed beside the phase's files | low | mitigate | `git status` shows no untracked file under `packages`, `scripts`, `spec` or `.changeset`; scratch stayed in `$TMPDIR/qd64` | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-64-01 | T-64-SC | No dependency is installed, upgraded or removed in this phase, so there is no supply-chain surface to audit | plan-time disposition (64-01..64-05) | 2026-11-20 |

*Accepted risks do not resurface in future audit runs.*

Not threats, recorded for the milestone audit (64-REVIEW IN-01..IN-03, Info): a second throw on the diagnostics poll's `Stopped` publish leaves the status `Live` with a dead poll; no test pins the post-throw feed states the docs describe; a capacity-only timeline `configure` whose publish throws leaves the timeline empty until `restart`, which the texts state only for a new source. The publish-between-`begin()`-and-`fork()` window is out of scope by decision and caveated in every amended text.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-20 | 16 | 16 | 0 | orchestrator, L1 grep verification (ASVS 1, register authored at plan time, auditor skipped by rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-20
