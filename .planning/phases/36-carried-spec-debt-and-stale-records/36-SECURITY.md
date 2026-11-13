---
phase: "36"
slug: "carried-spec-debt-and-stale-records"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-11-13"
---

# Phase 36 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Server render → client registry (the hydration seed) | A seed answers a gate until this client's own answer; it must reach only the registry it was given to and never outlive a lost subject | Seeded decisions, the subject |
| A timeline source → the dock | A source that dies must read as stopped, never as live, and its defect text must render as text | Timeline entries, the stop reason |
| `@qadi/devtools` public surface → consumers | `Baseline.Checked` gained `reading` and `baselineReading` is gone; a consumer must be told | Public types |
| Phase changes → the evidence that judges them | Baseline, pins, scripts, configs, stryker configs | Build integrity |
| `spec/` and the change records | Amendments beside history, never rewritten; enforcement cited must exist | Specification integrity |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-36-01 | Tampering | `36-mutation-base.json` stale or misclassified | medium | mitigate | the baseline is in exactly one commit (`60c01361`, one file); 36-14's comparison checked it | closed |
| T-36-02 | Repudiation | `36-LEDGER.md` row closed while still true | medium | mitigate | all 37 Closed by cells filled (`6382e8c1`); 29 fixed rows name a commit of their own plan, 8 resolved/refuted/exempt with evidence; ledger check exit 0 | closed |
| T-36-03 | Repudiation | a RED failing on a typo, not the defect | medium | mitigate | the TimelineStatus shape commit (`fbc775a9`) precedes TF10..; RED sets read from vitest JSON (36-02-SUMMARY) | closed |
| T-36-04 | Tampering | a superseded read's late accept writes into the timeline | medium | mitigate | TF9 RED in `3b5a9c60`, fixed by the generation token (`TimelineFeed.ts:122-150`, 36-06); order check exit 0 | closed |
| T-36-05 | Elevation of privilege | a stale allow from a lost subject | high | mitigate | `subject` is `Atom.keepAlive` (`QadiAtoms.ts:251-254`, `94f35dce`) before the seed fix (`ce4dadbb`); SUBJ1..3 and SD5 pin it | closed |
| T-36-06 | Repudiation | a vacuous characterisation for 28 IN-06 | medium | mitigate | GR-S1, GR-S2, GW-S1 run instrumented under StrictMode with an identity change and compare the non-strict count (36-03-SUMMARY) | closed |
| T-36-07 | Elevation of privilege | a cross-request seed leak via a shared book entry | high | mitigate | HL3 and HL7 green; the seed is keyed by a `SeedGrant` held only by the hydrated registry (`HydrationEngine.ts:627-709`); INV-QD-318 states it | closed |
| T-36-08 | Repudiation | the SeedSlot shape commit changes behaviour | medium | mitigate | every base assertion line kept, RED set exact, untouched files unchanged (36-04-SUMMARY) | closed |
| T-36-09 | Tampering | the `describeSource` shape commit changes a Live capture | medium | mitigate | `describeSource` calls neither `capturing` nor `prepareSource` (0 hits in its body); prepare cases and SR1 green | closed |
| T-36-10 | Repudiation | a token-only contrast pin | low | mitigate | N14/N15 read the rendered style; CT pins tokens from `theme.ts` | closed |
| T-36-11 | Repudiation | interruption or a replaced read shown as Stopped | medium | mitigate | `mine === generation && … && !Cause.hasInterruptsOnly(exit.cause)` (`TimelineFeed.ts:150`); TF9, TF12, TF13, TF17 | closed |
| T-36-12 | Information disclosure | the stop reason (`Cause.pretty`) shown in the dock | low | accept | see Accepted Risks | closed |
| T-36-13 | Repudiation | the stop shown on some timeline screens only | medium | mitigate | `readsTimeline: Record<TabId, boolean>` (`DevtoolsDock.tsx:64`); TN2 pins all seven tabs | closed |
| T-36-14 | Tampering | the stop reason rendered as markup | low | mitigate | rendered as a text child of `<pre>` (`StoppedBox.tsx:124`); no `dangerouslySetInnerHTML` in `packages/devtools/src` or `packages/react/src`; TN3 | closed |
| T-36-15 | Repudiation | a public type change with no Breaking note | medium | mitigate | `.changeset/devtools-timeline-status.md:5` leads with `**Breaking.**`; the upgrade section landed in `dc7a9cf1`; `Replay.tst.ts` pins the shape | closed |
| T-36-16 | Tampering | a description builds a recorder or a run reuses a preparation | medium | mitigate | `describeSource` builds none; D1 identity pin and the one-recorder-per-run case green | closed |
| T-36-17 | Elevation of privilege | a seeded allow outlives a lost subject | high | mitigate | as T-36-05; SD5 fails under the seed fix alone; subject commit first (order check exit 0) | closed |
| T-36-18 | Elevation of privilege | the cross-request seed leak (candidate A) | high | mitigate | as T-36-07; the grant is one registry's initial value; engine grant cases, HL3, HL7 | closed |
| T-36-19 | Denial of service | a keepAlive grant node per question grows without bound | medium | mitigate | the grant atom lives on the book handle and is forgotten at eviction (HL6); an unhydrated question makes no node (HL5); `getNodes().get` creates none | closed |
| T-36-20 | Tampering | a comment-only edit reaching code | medium | mitigate | comment-stripped compile compared to HEAD per file (36-10-SUMMARY) | closed |
| T-36-21 | Tampering | `stryker.http.mjs` loosened under a comment fix | high | mitigate | diff since base is +1/-1 in the leading comment; 36-14 integrity check permits only that | closed |
| T-36-22 | Repudiation | history rewritten instead of amended | medium | mitigate | old paragraphs kept beside dated amendments; `spec-revise --check` green | closed |
| T-36-23 | Tampering | DEBT-01 deletion drops a live requirement | medium | mitigate | the file equals base lines 1-174 + 346-1056; the dropped requirements are those 1.11 records as replaced by BEH-QD-411 | closed |
| T-36-24 | Information disclosure | the spec not stating a seed reaches only its registry | high | mitigate | BEH-QD-518 and INV-QD-318 name the cross-request case and cite HL3, HL5, HL7 (green) | closed |
| T-36-25 | Repudiation | cited enforcement that does not exist | medium | mitigate | every cited test file run; `spec:verify:strict` PASS 21 FAIL 0 | closed |
| T-36-26 | Repudiation | the overview misdocuments the removed field or `TimelineStatus` | medium | mitigate | `pnpm spec:api` (gate 13) green, 917 exports documented | closed |
| T-36-27 | Tampering | `Used:` names an id defined zero or two times | low | mitigate | each Used BEH/INV heading counted once; ADR-QD-149 file exists (36-13-SUMMARY) | closed |
| T-36-28 | Tampering | a judging file loosened to pass a gate | high | mitigate | among scripts, manifests, lockfile, changeset config, AGENTS.md, CHANGELOGs and stryker configs only `stryker.http.mjs` changed (comment only); `pnpm-lock.yaml` and every `package.json` unchanged | closed |
| T-36-29 | Repudiation | a surviving mutant hidden | high | mitigate | after-run in `9e90f110` (alone); no measured file below base; one named survivor (`TimelineNotice.tsx:40:20`, null vs undefined render identically) | closed |
| T-36-30 | Repudiation | a RED written after its fix | high | mitigate | 36-14 order check exit 0 (each RED commit before its fix); shape check exit 1 only on the planned negative pin `Replay.tst.ts:17` (36-14-SUMMARY) | closed |
| T-36-SC | Tampering | npm/pip/cargo installs | high | accept | see Accepted Risks | closed |

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-36-01 | T-36-12 | The dock is a development tool rendered in the host's own page; the stop reason is shown as text in a `<pre>`, as the Diagnostics notice already shows its reason | plan-time threat model (36-06) | 2026-11-12 |
| AR-36-02 | T-36-SC | No package was installed in any plan (`pnpm-lock.yaml` and every `package.json` unchanged since the phase base); the e2e used the Chromium already in the Playwright cache | plan-time threat model (all plans) | 2026-11-13 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-13 | 31 | 31 | 0 | secure-phase orchestrator (L1 grep, short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-13
