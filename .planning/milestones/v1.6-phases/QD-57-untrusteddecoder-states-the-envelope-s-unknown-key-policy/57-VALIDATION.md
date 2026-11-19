---
phase: "57"
slug: "untrusteddecoder-states-the-envelope-s-unknown-key-policy"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-11-18"
---

# Phase 57 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `57-RESEARCH.md` § Validation Architecture, with CONTEXT D-16..D-22.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`; tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | `vitest.config.ts` (root; projects `core`, `audit`, `react`, `devtools`); `tstyche.json`; `stryker.config.mjs` (core), `stryker.audit.mjs`, `stryker.react.mjs` (with `--mutate` for `HydrationEngine.ts`, D-22) |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/UntrustedDecode.test.ts packages/core/test/UntrustedSeams.test.ts packages/core/test/SinkCodec.test.ts < /dev/null` (repo root only) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; full several minutes |

---

## Sampling Rate

- **After every task commit:** the quick run command for the touched project, plus `node scripts/check-house-style.mjs` once the budget moves.
- **After every plan wave:** `pnpm exec vitest run --project core < /dev/null`, `--project audit`, `--project react`, `--project devtools`, then `pnpm test:tstyche`, `pnpm lint` and `pnpm circular`.
- **Before `/gsd-verify-work`:**
  1. `pnpm check:pr < /dev/null` is green.
  2. Run the three scoped Stryker runs, one at a time, never beside vitest.
  3. Run `57-mutation.mjs compare`.
- **Max feedback latency:** ~30 seconds (quick run).

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 57-01-T1 | 57-01 | 1 | WX-02, WX-06 | T-57-02 | the base is untouched; the reserved ids are free; the reservation file is unchanged | repo facts | `node -e` base facts (57-01 T1 verify 1); `bash -c` reserved ids at `phase_base` (verify 2); `pnpm -s spec:api < /dev/null` prints 935 | ✅ reads only | ✅ green |
| 57-01-T2 | 57-01 | 1 | WX-05, WX-06 | T-57-01 | the mutation base is taken on the untouched source, in the phase's first commit, alone | mutation | `node -e` base JSON over three suites (57-01 T2 verify 1); `node -e` `chore(57-01)` first and alone with the trailer (verify 2) | ✅ W0 landed | ✅ green |
| 57-02-T1 | 57-02 | 2 | KEYP-01, KEYP-03, KEYP-05 | T-57-03, T-57-04 | today's record wire and stored envelope pinned per policy; deep values answer, never throw | characterisation | `pnpm exec vitest run --project core packages/core/test/UntrustedSeams.test.ts -t '^(?!.*\((?:D-01\|D-17\|D-18\)\))' < /dev/null`; `node -e` history (57-02 T1 verify 2) | ✅ file exists | ✅ green |
| 57-02-T2 | 57-02 | 2 | KEYP-01, KEYP-03, WX-06 | T-57-03 | the D-01, D-17, D-18 rows fail on the base and are committed before any src | RED | `bash -c` vitest `-t "\((D-01\|D-17\|D-18)\)"` must fail (57-02 T2 verify 1); `node -e` RED commit order (verify 2) | ✅ file exists | ✅ green |
| 57-03-T1 | 57-03 | 3 | KEYP-04, KEYP-05 | T-57-05, T-57-06 | the audit row and archive refuse an unknown top-level key, today and after | characterisation | `pnpm exec vitest run --project audit packages/audit/test/UntrustedSeams.test.ts -t '^(?!.*\(D-20\))' < /dev/null`; `node -e` history (57-03 T1 verify 2) | ✅ file exists | ✅ green |
| 57-03-T2 | 57-03 | 3 | KEYP-04, KEYP-05 | T-57-05 | the hydration payload refuses an unknown key, today and after | characterisation | `pnpm exec vitest run --project react packages/react/test/UntrustedSeams.test.ts < /dev/null`; `node -e` history (57-03 T2 verify 2) | ✅ file exists | ✅ green |
| 57-03-T3 | 57-03 | 3 | KEYP-01, WX-06 | T-57-06 | a deep unknown key inside an audit record is ignored (D-20), RED on the base | RED | `bash -c` vitest `-t "\(D-20\)"` must fail (57-03 T3 verify 1); `node -e` RED commit order (verify 2) | ✅ file exists | ✅ green |
| 57-04-T1 | 57-04 | 4 | KEYP-02, KEYP-05, WX-06 | T-57-07 | the `ignore` projection keeps exactly the declared keys; every test call states its policy | RED by option | `pnpm exec vitest run --project core` over the four decoder test files (57-04 T1 verify 1); `bash -c` the `unknownKeys` describe's required-fail set (verify 2); `node -e` history (verify 3) | ✅ files exist | ✅ green |
| 57-04-T2 | 57-04 | 4 | KEYP-02, WX-06 | T-57-08 | an omitted or misspelt policy is a type error (D-16) | type pins, RED | `bash -c 'pnpm exec tstyche packages/core/test/UntrustedDecode.tst.ts'` must fail on the base (57-04 T2 verify 1); `node -e` history (verify 2) | ✅ file exists | ✅ green |
| 57-05-T1 | 57-05 | 5 | KEYP-01, KEYP-02, WX-04 | T-57-07, T-57-09, T-57-10, T-57-12 | tracer: an unknown record key 266 deep decodes under `ignore`; the projection runs before the guard | tracer, end to end | `pnpm exec vitest run --project core` UntrustedSeams + UntrustedDecode `-t '(record wire per policy\|^unknownKeys)'`; `pnpm exec tstyche packages/core/test/UntrustedDecode.tst.ts < /dev/null`; `node -e` source checks (57-05 T1 verify 3) | ✅ (`EnvelopeKeys.ts` created in task) | ✅ green |
| 57-05-T2 | 57-05 | 5 | KEYP-01, KEYP-02, WX-03 | T-57-11 | the moved pin, the overview rows and the website example state the policy | unit + docs gate | `pnpm exec vitest run --project core -t '^(?!.*\((?:D-17\|D-18)\))' < /dev/null`; `bash -c` `pnpm -s spec:api` prints 936 (57-05 T2 verify 2); `node -e` pins (verify 3) | ✅ files exist | ✅ green |
| 57-05-T3 | 57-05 | 5 | KEYP-04, WX-04, WX-07 | T-57-11 | audit and React seams state `refuse`; one `feat(57-05)!` commit, the first src commit | integration | `bash -c` typecheck, lint, circular, vitest audit/react/devtools (57-05 T3 verify 1); `node -e` commit shape (verify 2) | ✅ files exist | ✅ green |
| 57-06-T1 | 57-06 | 6 | KEYP-03, KEYP-05 | T-57-13, T-57-14, T-57-15 | the stored envelope is read by the decoder; refusal tags change only as D-17/D-18 state | unit | `pnpm exec vitest run --project core < /dev/null`; `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts < /dev/null`; `node -e` SinkCodec source (57-06 T1 verify 3) | ✅ files exist | ✅ green |
| 57-06-T2 | 57-06 | 6 | KEYP-03, WX-04 | T-57-15 | `UNTRUSTED_DECODE_BUDGET` and AGENTS.md section 7a move with the reader in one commit | lint gate | `bash -c` lint, typecheck, circular, spec-revise `--check`, spec gates (57-06 T2 verify 1); `node -e` budget and commit (verify 2) | ✅ files exist | ✅ green |
| 57-07-T1 | 57-07 | 7 | WX-05 | T-57-16 | after-runs on the three unedited configs, one at a time | mutation | `node -e` after and static reports exist and are fresh (57-07 T1 verify 1) | ✅ W0 landed | ✅ green |
| 57-07-T2 | 57-07 | 7 | WX-05 | T-57-16, T-57-17 | no touched file falls below its base score; no static-ignored mutant claimed | mutation | `node .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation.mjs compare …/57-mutation-static.json` prints `WX-05 holds (D-12)`; `node -e` `chore(57-07)` shape (verify 2) | ✅ (57-07 T1) | ✅ green |
| 57-08-T1 | 57-08 | 8 | KEYP-01, WX-02 | T-57-18 | ADR-QD-170 records the owner's words and the rejected alternatives | docs | `node -e` ADR content (57-08 T1 verify 1); `node scripts/spec-revise.mjs --check < /dev/null` | ✅ W0 landed | ✅ green |
| 57-08-T2 | 57-08 | 8 | KEYP-01, WX-02 | T-57-18 | ADR-QD-096 and ADR-QD-143 amended, ADR-QD-153 kept | docs | `node -e` amendments (57-08 T2 verify 1); `node -e` spec-revise and commit (verify 2) | ✅ files exist | ✅ green |
| 57-09-T1 | 57-09 | 9 | KEYP-01..05 | T-57-19 | BEH-QD-621..625 and the BEH-QD-486 carve-out | docs | `node -e` headings and text (57-09 T1 verify 1); `bash -c 'pnpm -s spec:examples && node scripts/spec-revise.mjs --check'` | ✅ files exist | ✅ green |
| 57-09-T2 | 57-09 | 9 | KEYP-01..05, WX-02 | T-57-19 | INV-QD-359, INV-QD-360, the INV-QD-305/306 carve-outs, traceability rows | docs + traceability | `node -e` invariants (57-09 T2 verify 1); `bash -c` strict traceability, only CCR-QD-448 may fail (verify 2) | ✅ files exist | ✅ green |
| 57-10-T1 | 57-10 | 10 | WX-03, WX-07 | T-57-20 | the widening and the breaking option are announced with a migration | docs gate | `node -e` changesets and upgrade guide (57-10 T1 verify 1); `pnpm -s spec:website-examples < /dev/null` | ✅ W0 landed | ✅ green |
| 57-10-T2 | 57-10 | 10 | WX-02, WX-07 | T-57-21 | CCR-QD-448 recorded; strict traceability green; no version or CHANGELOG change | traceability | `bash -c` spec-revise `--check` and `verify-traceability.sh --strict` (57-10 T2 verify 1); `node -e` commit and no-release (verify 2) | ✅ files exist | ✅ green |
| 57-11-T1 | 57-11 | 11 | WX-02, WX-04, WX-05, WX-06, KEYP-02, KEYP-03 | T-57-22, T-57-23 | the whole phase's diff and history obey scope, banned constructs, budgets, order, trailers and the reservation | phase scan | `node .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-scan.mjs`; `57-mutation.mjs compare …/57-mutation-static.json` | ✅ W0 landed | ✅ green |
| 57-11-T2 | 57-11 | 11 | WX-01, WX-07, KEYP-01..05 | T-57-24 | the full gate is green; nothing released; KEYP-01..05 complete, WX Pending | full suite + release check | `pnpm check:pr < /dev/null`; `node -e` release check (57-11 T2 verify 2) | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| KEYP-01 | a deep unknown record envelope key decodes (RED on base) | unit | `pnpm exec vitest run --project core packages/core/test/UntrustedSeams.test.ts < /dev/null` | ✅ (new rows beside `:195`) |
| KEYP-01 | the same through an audit row's and an archive entry's record (D-20) | unit | `pnpm exec vitest run --project audit packages/audit/test/UntrustedSeams.test.ts packages/audit/test/AuditEntryDifferential.test.ts < /dev/null` | ✅ (new rows; `deepExtra` half flips) |
| KEYP-02 | refuse vs ignore pair; `ignore` with `unwalked` and `prepare`; derivation over struct, `_tag` union, `decodeTo`, `Suspend`; construction throws | unit | `pnpm exec vitest run --project core packages/core/test/UntrustedDecode.test.ts < /dev/null` | ✅ (extend) |
| KEYP-02 | `unknownKeys` is the closed union and required on every decoder (D-16) | type | `pnpm test:tstyche` (`packages/core/test/UntrustedDecode.tst.ts`) | ✅ (extend) |
| KEYP-03 | stored envelope through the decoder; tags unchanged; deep `environment` is `TooDeep` (D-18); strict decoder messages (D-17, RED first) | unit | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/UntrustedSeams.test.ts < /dev/null`; `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts < /dev/null` | ✅ |
| KEYP-04 | audit row, archive, hydration answers unchanged after stating `refuse` | unit | `pnpm exec vitest run --project audit packages/audit/test/UntrustedSeams.test.ts < /dev/null`; `pnpm exec vitest run --project react packages/react/test/UntrustedSeams.test.ts < /dev/null` | ✅ (characterise on the base first) |
| KEYP-05 | the per-policy matrix in core, audit and react: shallow unknown key, deep unknown key, excess key inside the payload, non-object input | unit | as above | ✅ (extend on the base) |
| WX-02/03/07 | ADR-QD-170, BEH-QD-621..625, INV-QD-359/360, CCR-QD-448, overview rows, changesets, the 0.13 note | gate | `pnpm spec:verify:strict`; `pnpm spec:api` | ✅ |
| WX-04 / D-10 | budget and §7a agree; no `as`, `!`, `any` or `switch`; no cycle; leaf rule | gate | `node scripts/check-house-style.mjs`; `pnpm lint`; `pnpm circular` | ✅ |
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation.mjs compare <static evidence json>` | ✅ W0 landed |

---

## Wave 0 Requirements

- [x] `57-mutation.mjs` and `57-mutation-base.json` for `SinkCodec.ts`, `UntrustedDecode.ts`, `AuditEntry.ts`, `AuditArchive.ts` and `HydrationEngine.ts`. Measured on the untouched base, committed alone as the first plan commit, never re-baselined (WX-05).
- [x] The per-policy matrix in core, audit and react, written and committed on the base. It is green there except the D-01/D-20 rows, the D-18 row and the D-17 message rows, which are RED with their output recorded (KEYP-05, WX-06).
- [x] The derivation cases (struct, union by `_tag`, `decodeTo`, `Suspend`, underivable schema), built inside `it` bodies, RED by import or by option before the option exists (KEYP-02).

---

## Manual-Only Verifications

None. Every phase behaviour has an automated check.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-11-19

## Validation Audit 2026-11-19

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Evidence: `pnpm check:pr` exit 0 at 78e02170 (57-11), with no non-`.planning` change since. `57-mutation.mjs compare 57-mutation-static.json` prints `WX-05 holds (D-12)`. Re-run on 2026-11-19 by the orchestrator: core decoder files (`UntrustedSeams`, `UntrustedDecode`, `SinkCodec`, `DecodeRefusal`, `DecisionWire`) 5 files 332 tests; audit 28 files 547 tests; react 34 files 523 tests. All green.
