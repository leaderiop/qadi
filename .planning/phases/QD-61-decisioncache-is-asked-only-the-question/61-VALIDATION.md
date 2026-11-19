---
phase: "61"
slug: "decisioncache-is-asked-only-the-question"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-19"
---

# Phase 61 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `61-RESEARCH.md` § Validation Architecture and CONTEXT D-01..D-15.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest + `@effect/vitest` (project `core`); tstyche; Stryker via `stryker.config.mjs` (with `--mutate`, never edited) |
| **Config file** | `packages/core/vitest.config.ts`; root `vitest.config.ts`; `tstyche.json`; `stryker.config.mjs` |
| **Quick run command** | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/Lifecycle.test.ts packages/core/test/SharedComputation.test.ts < /dev/null` |
| **Type tests** | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts < /dev/null` |
| **Full suite command** | `pnpm check:pr < /dev/null` |
| **Estimated runtime** | quick < 1 s; core project ~10 s |

---

## Sampling Rate

- **After every task commit:** the quick run, tstyche on the new file, and `node scripts/check-house-style.mjs`.
- **After every plan wave:**
  1. `pnpm exec vitest run --project core < /dev/null`
  2. `pnpm typecheck`
  3. `pnpm test:tstyche`
  4. `pnpm lint`
  5. `pnpm circular`
- **Before `/gsd-verify-work`:**
  1. `pnpm check:pr < /dev/null`
  2. the scoped Stryker run, alone, never beside vitest or check:pr
  3. the mutation compare
- **Max feedback latency:** ~30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 61-01-T1 | 61-01 | 1 | WX-02, WX-03, WX-06 | T-61-02 | the base facts hold at `phase_base`; the nine reserved ids and ARCH-108 are unused there; gate 13 counts 939 | script | 61-01 Task 1 verifies (`git show` base facts; `git grep` ids; `pnpm -s spec:api`) | ✅ | ⬜ pending |
| 61-01-T2 | 61-01 | 1 | WX-05 | T-61-01 | `61-mutation.mjs` is the verbatim block (SHA-256 `bd83a56e…322f`) | script | `shasum -a 256` + `node --check` on `61-mutation.mjs` | ❌ extracted here | ⬜ pending |
| 61-01-T3 | 61-01 | 1 | WX-05, WX-06 | T-61-01 | the base is measured before any change; `chore(61-01)` is the first plan commit and holds the baseline alone | mutation | the scoped Stryker run, then `node 61-mutation.mjs base`; the `chore(61-01)` commit check | ❌ written here | ⬜ pending |
| 61-02-T1 | 61-02 | 2 | CASK-03, WX-06 | — | one entry for two concurrencies, `concurrency` reaching the walk, the claimant governing a joined walk: green on the base | unit | quick run, `Tests 62 passed (62)`; the first `test(61-02)` commit check | ✅ | ⬜ pending |
| 61-02-T2 | 61-02 | 2 | CASK-04, WX-06 | T-61-04 | the I5 race asks each question alone and lands on both sides of the owner's completion at every budget | unit | quick run; a deliberate `gap <= 12` break shows `oneSided` failing, then restored | ✅ | ⬜ pending |
| 61-02-T3 | 61-02 | 2 | CASK-02, WX-04, WX-06 | T-61-03 | `getOrCompute` refusing an `Effect`, a thunk and a third argument is RED on the base; `walk` is not exported | type | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts` (RED: 3 failed, 1 passed; `Suppressed: 1 matched`) | ❌ Wave 0 (new) | ⬜ pending |
| 61-03-T1 | 61-03 | 3 | CASK-02, CASK-03 | T-61-03, T-61-06 | the tracer: `decideQuestion` hands over the question and its own options; the layer walks `walk(key, options?.concurrency)` | type + unit | tstyche green (`Suppressed: 1 matched, 1 total`); core project; the source regex checks | ✅ | ⬜ pending |
| 61-03-T2 | 61-03 | 3 | CASK-02, CASK-03, CASK-04, WX-04 | T-61-05, T-61-06 | source docs say what the cache owns; core, tstyche, lint, typecheck and circular green; one `feat(61-03)!` commit | unit + type | `pnpm exec vitest run --project core`, `pnpm test:tstyche`, `pnpm -s lint`, `pnpm typecheck`, `pnpm circular`; the commit check | ✅ | ⬜ pending |
| 61-03-T3 | 61-03 | 3 | CASK-02 | T-61-03 | each negative pin fails when its refusal is loosened (positive control through `Params<F>`) | type | the loose and exported break copies, each seen to fail, then removed | ✅ | ⬜ pending |
| 61-04-T1 | 61-04 | 4 | WX-05 | T-61-07 | the after run is measured on the GREEN tree, alone | mutation | the scoped Stryker run, `node 61-mutation.mjs after`, `node 61-mutation.mjs compare` | ✅ | ⬜ pending |
| 61-04-T2 | 61-04 | 4 | WX-05 | T-61-07 | no touched file's score falls; static credit only per ADR-QD-167 Rev 1.1 | mutation | `node 61-mutation.mjs compare [61-mutation-static.json]` ends `WX-05 holds (D-06)` | ✅ | ⬜ pending |
| 61-04-T3 | 61-04 | 4 | WX-05 | T-61-07 | the evidence is committed after the last code change | script | the `chore(61-04)` commit check | ✅ | ⬜ pending |
| 61-05-T1 | 61-05 | 5 | WX-07 | T-61-08 | one Breaking `@qadi/core` minor changeset, verbatim | script | the changeset verbatim and `.changeset` status checks | ❌ new | ⬜ pending |
| 61-05-T2 | 61-05 | 5 | WX-07 | T-61-08 | the 0.13 section's After fence compiles; nothing versioned or tagged | doc-compile | `node scripts/check-website-doc-examples.mjs` (71 blocks); the `docs(61-05)` commit check | ✅ | ⬜ pending |
| 61-06-T1 | 61-06 | 6 | CASK-01, WX-02 | T-61-09, T-61-10 | ADR-QD-174 and the amendments of ADR-QD-031 (1.3) and ADR-QD-132 (1.2) are in, verbatim | script | the decision-edit check, `node scripts/spec-revise.mjs --check`; the commit check | ❌ new ADR | ⬜ pending |
| 61-06-T2 | 61-06 | 6 | CASK-01, WX-02 | T-61-09 | BEH-QD-641..645 and INV-QD-367..368 are one heading each; BEH-QD-166 and 190 name the walk | script | the behaviour-edit check, `spec-revise --check`, `node scripts/check-doc-examples.mjs`; the commit check | ✅ | ⬜ pending |
| 61-06-T3 | 61-06 | 6 | WX-02, WX-03 | T-61-10 | every new id traced; CCR-QD-452 recorded; gate 13 counts 939 | script | `spec-revise --check`, `bash spec/scripts/verify-traceability.sh --strict`, gate 11 (`check-dod-table.mjs`), gate 13 (`check-api-surface.mjs`), `check-doc-examples.mjs`; the commit check | ✅ | ⬜ pending |
| 61-07-T1 | 61-07 | 7 | CASK-01..04, WX-02..WX-07 | T-61-11 | the whole range keeps every promise; the compare still holds | script | `node 61-scan.mjs` prints `phase scan clean` (SHA-256 `594baf91…eec9`); `node 61-mutation.mjs compare` | ❌ extracted here | ⬜ pending |
| 61-07-T2 | 61-07 | 7 | WX-01, WX-07 | T-61-12 | the merge gate is green at the close; nothing released | full suite | `pnpm check:pr < /dev/null`, alone; the release check | ✅ | ⬜ pending |
| 61-07-T3 | 61-07 | 7 | CASK-01..04 | — | CASK-01..04 complete; every WX row stays Pending | script | the REQUIREMENTS.md check | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement → test map (from research):
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CASK-02 | `getOrCompute` refuses a computation; positive controls | type | `pnpm exec tstyche packages/core/test/DecisionCache.tst.ts` | ❌ Wave 0 (new) |
| CASK-02 | The layer walks the question it is given; Lifecycle hands over only the question | unit | quick run (`Lifecycle.test.ts` wrapper) | ✅ (edit) |
| CASK-03 | One entry for two concurrencies; concurrency reaches the walk | unit | quick run (`DecisionCache.test.ts`) | ✅ (add 1–2 tests) |
| CASK-04 | Coalescing and interruption through a question alone | unit | quick run | ✅ (only `:1113` rewritten) |
| WX-05 | Scores do not fall | mutation | Q7 command + `61-mutation.mjs compare` | ❌ Wave 0 (harness copy) |


---

## Wave 0 Requirements

- [ ] `packages/core/test/DecisionCache.tst.ts` (CASK-02, RED on the base)
- [ ] `61-mutation.mjs` + `61-mutation-base.json`, measured on the untouched tree (D-05 step 1)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| None | — | — | — |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
