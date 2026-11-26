---
phase: "QD-85"
slug: "the-dock-s-hydration-block-is-a-model-row"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_total: 22
threats_open: 0
asvs_level: 1
block_on: high
created: "2026-11-25"
---

# Phase QD-85 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Hydration reading → dock model → panel | A foreign drop reason crosses from the host's hydration counts into the rendered block | Counts, drop reasons (untrusted strings) |
| Poll status → dock frame | The frame subscribes to the poll; a snapshot that is fresh each read would loop `useSyncExternalStore` | Status objects |
| Listener throw → `configure` | A throwing hydration listener must not stop later inputs from being applied | Errors, aggregate order |
| Working tree → mutation and pinned records; check scripts → every later verify | Records stand for the source they were measured on; checks must be able to fail | Scores, head commits, test text |
| Branch → release machinery | Nothing in the phase may version, tag, push or publish | package.json, CHANGELOG, tags, remotes |

---

## Threat Register

Built from the `<threat_model>` blocks of `85-01-PLAN.md` … `85-11-PLAN.md` (authored at plan time). T-85-SC repeats in every plan; it is listed once.

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-85-01 | Tampering | `QuestionsPanel.tsx` drop row | medium | mitigate | H9 pins a reason holding `<b>stray</b>` rendered as escaped text, so a later change that renders it as markup fails the cell | closed |
| T-85-02 | Repudiation | `85-mutation-base.json` | low | mitigate | the record names its head and invocation, is refused on a dirty tree or a foreign report, and is committed alone first | closed |
| T-85-SC | Tampering | npm/pip/cargo installs | high | accept | no package is installed or added in this plan (RESEARCH Package Legitimacy Audit: none) | closed |
| T-85-03 | Tampering | `85-check.mjs` judges | medium | mitigate | each judge has a failing plant in the self-test and is seen failing on the real tree, so a judge that passes vacuously is caught | closed |
| T-85-04 | Repudiation | commit trailers | low | mitigate | `trailers` accepts exactly the one owner line on every plan commit | closed |
| T-85-05 | Tampering | `.planning/milestones/` archives | medium | mitigate | the earlier checks run from `<S>` copies and the verify fails if anything under `.planning/milestones/` changed | closed |
| T-85-06 | Repudiation | `85-earlier-checks.mjs` ledger | low | mitigate | ledger rows are copied from the measured base facts; a changed row fails rather than being widened | closed |
| T-85-07 | Information disclosure | `hydrationView` | low | mitigate | the view carries only the counts, reasons and meanings the block shows today; V4 and V12 pin that rows pass through unchanged and nothing is added | closed |
| T-85-08 | Tampering | foreign drop reason | low | accept | the view holds the reason as a string; escaping is the renderer's (React text), pinned by cell H9 | closed |
| T-85-09 | Denial of service | `configure` with a throwing hydration listener | medium | mitigate | the store is notified inside step 7's existing `callAll`, so every input is still applied and the throw rethrown (ADR-QD-194); DL21 pins it | closed |
| T-85-10 | Tampering | store key | low | mitigate | the key reads `reading.hydration` by reference, never a copy, so a fresh object cannot force a recompute; `three-predicates` refuses a spread | closed |
| T-85-11 | Repudiation | `configure`'s aggregate | low | mitigate | DL22 pins that each throw is reported, in build order, inside the seventh step's aggregate | closed |
| T-85-12 | Tampering | drop row rendering | medium | mitigate | every string is a React text child, never HTML; the panel test `renders each drop's reason as text` and cell H9 pin a reason holding markup rendered escaped | closed |
| T-85-13 | Information disclosure | hydration block | low | mitigate | the panel renders only the view's fields, which carry only what the block showed on the base; the held characterisations pin every byte | closed |
| T-85-14 | Denial of service | `useDiagnosticsStatus` | medium | mitigate | `getSnapshot` returns the stored status object, never a fresh one, so `useSyncExternalStore` cannot loop; R1 and R2 run the hook against a live poll | closed |
| T-85-15 | Repudiation | the stop notice | low | mitigate | the frame still hands the status to `useStopNotice`; `DockFrame.stops.characterisation.test.tsx` stays green unedited | closed |
| T-85-16 | Repudiation | the record set | low | mitigate | every id is reserved, traced (strict traceability) and named in the CCR row with its document's Rev; `records --close` refuses a missing one | closed |
| T-85-17 | Tampering | spec headers | low | mitigate | headers move only through `spec-revise`, whose `--check` is part of the gate | closed |
| T-85-18 | Repudiation | `85-mutation-close.json` | low | mitigate | both groups on one head, the base's invocations, refused on a dirty tree or a foreign report, compared by line through `git diff -U0` | closed |
| T-85-19 | Elevation of privilege | release machinery | medium | mitigate | no `changeset version`, push, tag or release; the verify fails if any `package.json` moved since `phase_base` | closed |
| T-85-20 | Elevation of privilege | release machinery | high | mitigate | Task 2's verify fails on a tag after `phase_base`, a changed CHANGELOG or version, a consumed changeset or a remote branch holding a phase commit | closed |
| T-85-21 | Repudiation | phase commits | low | mitigate | `85-check.mjs trailers` judges every commit since `phase_base`, the last one included | closed |

*Status: open · closed · open — below high threshold (non-blocking)*

Evidence (checked 2026-11-25 on `53848d85`): H9 pins `<b>stray</b>` rendered escaped and no `dangerouslySetInnerHTML` exists under `packages/devtools/src` (T-85-01, T-85-08, T-85-12); V4/V12 (T-85-07); DL21 and DL22 (T-85-09, T-85-11); `three-predicates` (T-85-10); `useDiagnosticsStatus`'s `getSnapshot` returns the stored `status`, run live by R1/R2 (T-85-14); `DockFrame.stops.characterisation.test.tsx` is byte-equal to `phase_base` (T-85-15); `records --close` and strict traceability 21/0 (T-85-16, T-85-17); `85-mutation.mjs compare` (T-85-02, T-85-18); no `package.json`, CHANGELOG or lockfile change, no tag or remote branch holds `phase_base` (T-85-19, T-85-20, T-85-SC); `trailers` over 33 plan commits (T-85-04, T-85-21); the check self-tests and seen-failing runs in `85-RED-EVIDENCE.md` (T-85-03); `.planning/milestones/` unchanged since `phase_base` and the earlier checks run from scratch copies (T-85-05, T-85-06).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-85-01 | T-85-SC | No package was installed or added; `spec:package` installs only the packed workspace tarballs into a sandbox | plan-time register (autonomous run) | 2026-11-25 |
| AR-85-02 | T-85-08 | The view holds a foreign reason as a plain string; escaping is React's text rendering, pinned by H9 | plan-time register (autonomous run) | 2026-11-25 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-11-25 | 22 | 22 | 0 | orchestrator, ASVS L1 grep-depth (autonomous run) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-11-25
