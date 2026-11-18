---
phase: "57"
slug: "untrusteddecoder-states-the-envelope-s-unknown-key-policy"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| (filled by the planner from the plans' `<verify>` blocks) | | | | | | | | | ⬜ pending |

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
| WX-05 | mutation not lower | harness | `node .planning/phases/QD-57-untrusteddecoder-states-the-envelope-s-unknown-key-policy/57-mutation.mjs compare <static evidence json>` | ❌ W0 |

---

## Wave 0 Requirements

- [ ] `57-mutation.mjs` and `57-mutation-base.json` for `SinkCodec.ts`, `UntrustedDecode.ts`, `AuditEntry.ts`, `AuditArchive.ts` and `HydrationEngine.ts`. Measured on the untouched base, committed alone as the first plan commit, never re-baselined (WX-05).
- [ ] The per-policy matrix in core, audit and react, written and committed on the base. It is green there except the D-01/D-20 rows, the D-18 row and the D-17 message rows, which are RED with their output recorded (KEYP-05, WX-06).
- [ ] The derivation cases (struct, union by `_tag`, `decodeTo`, `Suspend`, underivable schema), built inside `it` bodies, RED by import or by option before the option exists (KEYP-02).

---

## Manual-Only Verifications

None. Every phase behaviour has an automated check.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
