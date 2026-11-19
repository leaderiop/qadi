---
phase: "58"
slug: "a-stored-record-is-its-envelope-in-memory-too"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 58 — Validation Strategy

> This is the per-phase validation contract for feedback sampling during execution. It draws on `58-RESEARCH.md` § Validation Architecture and on CONTEXT D-01..D-16.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest`; tstyche (`*.tst.ts`); Stryker for mutation |
| **Config file** | root `vitest.config.ts` (projects `packages/*`); `features/vitest.config.ts`; `tstyche.json`; `stryker.config.mjs` (core), `stryker.devtools.mjs`, `stryker.http.mjs` (with `--mutate`; never edited) |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/DecisionLog.test.ts packages/core/test/DecisionRecord.test.ts packages/core/test/DecisionStream.test.ts packages/core/test/ShippedSinkReports.test.ts < /dev/null` (repo root) |
| **Full suite command** | `pnpm check:pr < /dev/null` (repo root, stdin closed) |
| **Estimated runtime** | quick ~5 s; whole devtools project ~6 s; full suite several minutes |

---

## Sampling Rate

- **After every task commit:** run the quick run for the touched project. Also run `node scripts/check-house-style.mjs` whenever a budget could move (none is expected to).
- **After every plan wave:**
  1. `pnpm exec tsc -b tsconfig.json && pnpm exec tsc -p tsconfig.test.json`. This catches the full blast radius.
  2. `pnpm exec vitest run --project core|devtools|http|react|testing|audit < /dev/null`
  3. `pnpm test:tstyche`
  4. `pnpm lint`
  5. `pnpm circular`
  6. `pnpm test:bdd`, only after the `tsc -b`, because `features/` reads `lib/`.
- **Before `/gsd-verify-work`:**
  1. `pnpm check:pr < /dev/null` is green.
  2. The scoped Stryker runs pass, run one at a time and never beside vitest.
  3. `58-mutation.mjs compare` passes.
- **Max feedback latency:** ~30 seconds for the quick run.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| (filled by the planner from the plans' `<verify>` blocks) | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STOR-02 | stored bytes identical: `V2_*` × {`Server`, `édge ✓`, `a"b`} plus the existing Obligations row | unit golden, written on base | `pnpm exec vitest run --project core packages/core/test/SinkCodec.test.ts < /dev/null` | extend the stored-envelope describe |
| STOR-02 | byte fixed point: `text -> decode -> encode === text` | unit | same | new row |
| STOR-03 | log backlog stamping read through the wire: environment per `ingest`, own label default, records survive, `.pipe`/`Equal` work | unit | `… packages/core/test/DecisionLog.test.ts` | add wire-neutral rows |
| STOR-03 | order (INV-QD-039): `NaN` last, two unknowns equal, stable arrival; checked through the log snapshot, `mergeSources` and the `decodeDecisionStream` backlog | unit | core `DecisionLog`/`DecisionStream`; `pnpm exec vitest run --project devtools packages/devtools/test/model/Source.test.ts < /dev/null` | new rows |
| STOR-01 | `StoredRecord` narrows on `.record._tag`; `["record"]` is `SinkRecord` (RED on base) | tstyche | `pnpm test:tstyche` | rewrite `DecisionSink.tst.ts:70-76` |
| STOR-01 | `stored.record` identity and `instanceof DecisionRecord` (RED on base) | unit | core quick run | new rows |
| STOR-03 | devtools timeline ingests an envelope; entry key unchanged; an orphan beside decisions orders by `at` (D-13) | unit | `pnpm exec vitest run --project devtools < /dev/null` | via `helpers.ts` builders |
| STOR-03 | D-12: `isolate` and C4 gone; a sink defect is still contained and reported once by the emitter | unit | core `ShippedSinkReports.test.ts` | rewrite |
| WX-05 | mutation not lower (D-16) | harness | `node <phase dir>/58-mutation.mjs compare <static evidence json>` | ❌ W0 |
| WX-03 | gate 13 | gate | `pnpm -s spec:api` prints 933 | — |
| STOR-04, WX-02, WX-07 | records, changesets, upgrading | gate | `node scripts/spec-revise.mjs --check`; `pnpm spec:verify:strict`; `pnpm -s spec:website-examples` | — |

---

## Wave 0 Requirements

- [ ] `58-mutation.mjs` and `58-mutation-base.json`, recording killed-mutant ids as well as scores (D-16). They are committed alone as the first plan commit and never re-baselined (WX-05).
- [ ] Shape-neutral characterisation rows, written and green on the base:
  - goldens and the fixed point;
  - log stamping;
  - order through three readers.
- [ ] RED rows for the new shape: `stored.record` identity, `instanceof DecisionRecord`, and the tstyche narrowing. They are committed failing before the core commit.

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
