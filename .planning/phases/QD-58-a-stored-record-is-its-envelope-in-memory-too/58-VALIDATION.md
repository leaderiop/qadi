---
phase: "58"
slug: "a-stored-record-is-its-envelope-in-memory-too"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| 58-01-T1 | 58-01 | 1 | WX-02, WX-03, WX-06 | T-58-02 | the ten reserved ids are free; base facts and `spec:api` 936 recorded against `phase_base` | gate | 58-01 Task 1's node base-facts check | ✅ (inline) | ✅ green |
| 58-01-T2 | 58-01 | 1 | WX-05 | T-58-01 | the base is written once, never re-recorded | harness | three scoped Stryker runs, each then `node <D>58-mutation.mjs base core\|devtools\|http`; 58-01 Task 2's two node checks | ✅ (created in phase) (`58-mutation.mjs` written here) | ✅ green |
| 58-02-T1 | 58-02 | 2 | STOR-02, STOR-03, WX-06 | T-58-03 | stored bytes pinned from hand-written fixtures (G1-G9), log and order rows (L1-L5, O1-O4) | unit | `pnpm exec vitest run --project core packages/core/test/StoredEnvelope.test.ts < /dev/null` | ✅ (created in phase) | ✅ green |
| 58-02-T2 | 58-02 | 2 | STOR-01, WX-06 | T-58-04 | N1-N4 and the type pins RED by assertion only | unit + tstyche | `pnpm exec tstyche packages/core/test/StoredEnvelope.tst.ts`; the RED-by-assertion vitest run | ✅ (created in phase) (new files) | ✅ green |
| 58-03-T1 | 58-03 | 3 | STOR-03, WX-06 | T-58-06 | `NaN` last and stable arrival across merge and timeline; D-13's orphan rows | unit | `pnpm exec vitest run --project devtools packages/devtools/test/model/StoredOrder.test.ts < /dev/null` | ✅ (created in phase) | ✅ green |
| 58-03-T2 | 58-03 | 3 | STOR-02, STOR-03 | T-58-05 | the http encoders' bytes pinned (W1, W2) | unit | `pnpm exec vitest run --project http packages/http/test/StoredEnvelopeWire.test.ts < /dev/null` | ✅ (created in phase) | ✅ green |
| 58-04-T1 | 58-04 | 4 | STOR-01, STOR-02, STOR-03 | T-58-07, T-58-08, T-58-09, T-58-10 | the producer's label kept; bytes and Phase 57 refusals unchanged; a getter never read | tracer (unit + tstyche + build) | core `StoredEnvelope.test.ts` and `UntrustedSeams.test.ts`; devtools `StoredOrder.test.ts`; http `StoredEnvelopeWire.test.ts`; `pnpm exec tstyche packages/core/test/StoredEnvelope.tst.ts`; `pnpm exec tsc -b tsconfig.build.json` | ✅ after 58-02/58-03 | ✅ green |
| 58-04-T2 | 58-04 | 4 | STOR-01, STOR-03, WX-06 | T-58-09 | C4 deleted with D-12 as its reason; the law grid on records under both orders | unit + tstyche | `pnpm exec vitest run --project core < /dev/null`; `pnpm exec tstyche packages/core/test` | ✅ existing | ✅ green |
| 58-04-T3 | 58-04 | 4 | WX-01, WX-03, WX-04, WX-06 | T-58-11 | no alias of a deleted name anywhere; one atomic Breaking commit | gate | `pnpm -s typecheck`; six vitest projects; `pnpm -s test:tstyche`; `pnpm -s test:bdd`; `pnpm -s lint`; `pnpm -s spec:api` (933); `pnpm -s spec:package`; the feat-commit node check | ✅ existing | ✅ green |
| 58-05-T1 | 58-05 | 5 | STOR-02 | — | `Source.ts` and `AuditArchive.ts` change comments only | gate | 58-05 Task 1's comment-only node check; `pnpm -s lint` | ✅ existing | ✅ green |
| 58-05-T2 | 58-05 | 5 | WX-05 | T-58-13 | the base, the script and every Stryker config untouched; evidence kept outside the repository | harness | three scoped Stryker runs, each then `node <D>58-mutation.mjs after core\|devtools\|http` | ✅ (58-01's script) | ✅ green |
| 58-05-T3 | 58-05 | 5 | WX-05 | T-58-12 | static credit only from an `ignoreStatic: false` run | harness | `node <D>58-mutation.mjs compare [<D>58-mutation-static.json]` | ✅ (58-01's script) | ✅ green |
| 58-06-T1 | 58-06 | 6 | STOR-04, WX-02 | T-58-14 | D-12's defect path and the `ingest` caller stated; the mutation table equals the JSONs | doc gate | 58-06 Task 1's node ADR check; `node scripts/spec-revise.mjs --check` | ❌ (ADR new) | ✅ green |
| 58-06-T2 | 58-06 | 6 | STOR-04, WX-02 | T-58-14 | amended ADR bodies kept as history | doc gate | 58-06 Task 2's node amendment check; `node scripts/spec-revise.mjs --check` | ✅ existing | ✅ green |
| 58-07-T1 | 58-07 | 7 | STOR-01, STOR-02, STOR-03 | T-58-15 | INV-QD-361, INV-QD-362; INV-QD-039 amended with its old order recorded | doc gate | 58-07 Task 1's node invariant check | ✅ existing | ✅ green |
| 58-07-T2 | 58-07 | 7 | STOR-01, STOR-02, STOR-03, WX-02 | T-58-15 | every changed REQUIREMENT quoted in an amended note | doc gate | 58-07 Task 2's node behaviour check; `node scripts/spec-revise.mjs --check`; `pnpm -s spec:examples` | ✅ existing | ✅ green |
| 58-07-T3 | 58-07 | 7 | WX-02 | T-58-15 | every new anchor resolves | doc gate | 58-07 Task 3's node anchor check; `bash spec/scripts/verify-traceability.sh --strict` (only CCR-QD-449 pending) | ✅ existing | ✅ green |
| 58-08-T1 | 58-08 | 8 | STOR-04, WX-07 | T-58-16, T-58-17 | each changeset bumps only its package at minor; the upgrade fence compiles | doc gate | 58-08 Task 1's node changeset check; `pnpm -s spec:website-examples` | ❌ (changesets new) | ✅ green |
| 58-08-T2 | 58-08 | 8 | WX-02, WX-03, WX-07 | T-58-16 | nothing versioned; strict traceability fully green | gate | 58-08 Task 2's node CCR check; `bash spec/scripts/verify-traceability.sh --strict`; `pnpm -s spec:api` (933) | ✅ existing | ✅ green |
| 58-09-T1 | 58-09 | 9 | STOR-01, STOR-02, STOR-03, STOR-04, WX-02, WX-04, WX-05, WX-06 | T-58-18 | the scan is the plan's block plus one orchestrator-authorised layout-free `has` comparison (58-09 SUMMARY); it reports `phase scan clean` | harness | `node <D>58-scan.mjs`; `node <D>58-mutation.mjs compare [<D>58-mutation-static.json]` | ✅ (created in phase) (`58-scan.mjs` written here) | ✅ green |
| 58-09-T2 | 58-09 | 9 | WX-01, WX-07, STOR-01, STOR-02, STOR-03, STOR-04 | T-58-19 | nothing released, tagged, pushed or versioned | gate | `pnpm check:pr < /dev/null`; 58-09 Task 2's node release check | ✅ existing | ✅ green |

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

- [x] `58-mutation.mjs` and `58-mutation-base.json`, recording killed-mutant ids as well as scores (D-16). They are committed alone as the first plan commit and never re-baselined (WX-05).
- [x] Shape-neutral characterisation rows, written and green on the base:
  - goldens and the fixed point;
  - log stamping;
  - order through three readers.
- [x] RED rows for the new shape: `stored.record` identity, `instanceof DecisionRecord`, and the tstyche narrowing. They are committed failing before the core commit.

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
