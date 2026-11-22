# Phase 68: Hygiene and recorded close-outs - Context

**Gathered:** 2026-11-21
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase does three things:
- It closes the v1.6 audit's remaining wording and record items (HYGN-01..05, as the roadmap states them).
- It sweeps the milestone's stale verification (HYGN-06).
- **By the owner's decision of 2026-11-21, it absorbs every item still open from this milestone's phases 62–67.** These are listed with evidence in `68-OPEN-ITEMS.md` (OI-01..OI-29) and tracked as the new requirement **HYGN-07**.

The roadmap scoped this phase as having "no behaviour change, no changeset". The owner's decision widens that:
- **OI-09** changes shipped `@qadi/devtools` behaviour and gets a `@qadi/devtools` **patch changeset**.
- **OI-10** changes `@qadi/core`'s package-private `Admission.ts` on the evaluator's hot path, so it is bench-gated. It is package-private, so it gets no changeset.

Nothing is released, versioned, published, tagged or pushed.

Records:
- ARCH-115.
- ADR-QD-173 amended (D3).
- ADR-QD-174 re-wrapped (D9).
- ADR-QD-177 and ADR-QD-172 amended where OI-09 and OI-10 change what they decided.
- ADR-QD-181, named Unused unless a decision needs it.
- CCR-QD-459, which records the absorbed items, the unused ids and the two no-op confirmations.
- BEH-QD-676–680 and INV-QD-381–382 as needed.
- Traceability.

**Reserved ids only.** If the work needs more ids than these, the planner stops and flags it. It never runs `scripts/next-id.mjs`.

Requirements: HYGN-01..07, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### Scope (owner, 2026-11-21: "absorb everything open")
- **Every OI in `68-OPEN-ITEMS.md` is fixed, or else recorded with evidence.** Where the inventory recommends "leave" or "record only", that is the planner's input, not the decision.
  - The planner fixes the item when a fix exists that holds the house rules and its evidence bar.
  - Only an item that cannot be fixed is recorded, with the reason. Examples: OI-26 (trailers in published history), OI-27 (WX ticks, which belong to the milestone audit), OI-28 (accepted limits).
- **OI-14 (the redundant `oneSided` assertion) is reopened.** Delete `sides`, `oneSided` and their comment. `capped` already proves both sides. This is the one edit inside the race test, and every per-run assertion stays.
- **Records of completed phases stay records.** Do not rewrite another phase's PLAN, SUMMARY, VERIFICATION or archived run outputs.
  - Fix a completed phase's committed *script* (OI-22 `pin-codes.mjs`, OI-23 `66-mutation.mjs`, OI-25 `67-mutation.mjs`) only if its committed records still pass under the fixed script. Show that by re-running its `compare` or `--self-test`. Otherwise record it.
- **OI-24 (three harness copies, fixed arm order): fix forward.**
  - One shared, parameterised A/B harness becomes committed repo tooling. The planner chooses where (for example `scripts/bench/`). It alternates the arm order per round, and its analyzer self-test proves the gate.
  - The phase copies stay as the records of the runs they made.
  - The OI-10 bench uses the new harness.
  - If it lives under `scripts/`, the DoD table and `pnpm check` are unaffected, unless the planner wires it in; then it must follow AGENTS.md §15.

### Order
1. **OI-18 first.** `scripts/spec-revise.mjs` drops its first positional argument unless `--date` is given, and this phase's records run it.
2. Then **fresh per-file mutation bases on the post-67 tree**, before any source edit, for every source file the phase edits:
   - `SinkCodec.ts` and `DecisionLog.ts` (HYGN-01);
   - `TimelineFeed.ts` and `DiagnosticsFeed.ts` (OI-02, OI-03, OI-09);
   - `UntrustedDecode.ts` (OI-04);
   - `Admission.ts` (OI-10);
   - any other source file the plans touch.
3. Then **RED first** for every behaviour change.
4. Then the code changes, the bench, the wording and the tooling.
5. Then the records.
6. **The verification sweep (HYGN-06) runs last**, because this phase edits gate scripts Phase 62's verification cites.

### OI-09: the timeline resize path (`@qadi/devtools`, patch changeset)
- **RED first.** OI-11's tests, on the unchanged tree:
  - a throwing listener on the resize publish, which today skips `readSource`;
  - the post-throw states the docs describe.
- **The fix.** In the resized branch, call `readSource` before `push()`, or `try`/rethrow around `push()`; choose the one whose tests and mutation hold.
- **Texts.** Rewrite every text that described the escape, not just caveat it:
  - ADR-QD-177 (amend decision 5);
  - BEH-QD-656 (`spec/behaviors/28-devtools-screens.md`);
  - `packages/devtools/README.md`;
  - the `TimelineFeed.ts` docs;
  - the CCR-QD-455 row's wording, through a new CCR-QD-459 statement, never by rewriting history.

  OI-03's text fix is subsumed.
- **Characterisation tests.** The dock's `*.characterisation.test.tsx` files keep an empty diff and pass (LSTN-04).

### OI-10: `admit` reads each question field once (`@qadi/core`, bench-gated)
- **The change.** Read `policy`, `maxDepth` and `subject` into locals once at the top of `admit`. RED first: a getter-counting test extending Phase 65's E7–E10 shape, with added lines only.
- **Bench.**
  - Use the new shared harness, the committed source against the phase base, over Phase 65's workloads (`65-BENCH.md`, 35 workloads).
  - Run 3 + 3 interleaved under the owner's quiet-host rule (2026-11-21): before the run, load ≤ the CPU count and no process > 100%. If the host is busy, halt and hand back to the orchestrator.
  - The gate, fixed before the run: no workload more than **5%** slower, and a geomean of deltas no worse than **+2%** (median of per-run minima).
  - One run of record, with no re-run. A failed gate stops the phase with the evidence committed.
- **Texts.** INV-QD-375/376, ADR-QD-172's amendment, BEH-QD-661/662 and the `Admission.ts` doc comments move to "each field is read once".
- **Ordering.** The bench of record is the last executable change to `packages/*/src`. Every source edit, comment-only ones included, lands before it, or else is proven token-identical afterwards.

### Tooling items (OI-15..OI-25)
- Every gate-script change (`run-tstyche.mjs`, `check-house-style.mjs`, `lib/type-tests.mjs`, `spec-revise.mjs`, `check-package-install.mjs`) is shown failing on a planted defect, and passing on the real tree, before it is relied on.
- No budget count moves unless the item requires it. Any that does moves together with its AGENTS.md table.
- OI-20 (`typescript/unstable/*` under a `^7.0.0` range): fix it so that a range bump cannot silently break the guard, or record why it cannot be fixed.
- `check:pr` runs once at the close, alone.

### Roadmap items (HYGN-01..06), as the roadmap states them
- **D3.** Port cards stay package-private. The ADR-QD-173 amendment names the diagnostics feed as the headless read. No export is added: `pnpm spec:api` stays at 939, unless OI items add one, and none should.
- **D8.** `StoredEnvelope.test.ts`'s ids and header, and `Source.test.ts`'s "stamp". Read each in context. `26-decision-stream.md:406` and `SinkCodec.test.ts:2233` keep their wording.
- **D9.** ADR-QD-174 lines 73, 75 and 94 are re-wrapped in one bump. Its line-13 table row stays.
- **"Titles and comments only" is proven by compiler comparison:** `ts.transpileModule` with `removeComments: true`, title strings masked, the same test counts. OI-01, OI-08 and the other wording items use the same proof.
- **The two no-op confirmations** go in a new file in the Phase 61 archive directory.

### Verification sweep (owner, 2026-11-21: 62 plus a staleness check of 63–67)
- **Phase 62** is re-verified fully, after this phase's gate-script edits.
- **Phases 63–67.** Mechanically list every file their VERIFICATION.md cites that a later commit, this phase's included, has changed. Re-verify only the phases that are stale, and record the check for the rest.

### Claude's Discretion
- How the 29 items group into plans.
- The shared harness's location and interface.
- Test ids and titles, and the BEH/INV ids within the reserved ranges.

</decisions>

<code_context>
## Existing Code Insights
- `68-OPEN-ITEMS.md`: every item's file:line, evidence, smallest fix and risk notes.
- Phase 65's bench and mutation tooling (`65-BENCH.md`, `bench/`, `65-mutation.mjs`, `pin-codes.mjs`).
- Phase 67's scorer (`67-mutation.mjs`), which has the line-mapping and multiplicity fixes and a dirty-tree refusal.
- Phase 64's `64-mutation-*.json`, for TimelineFeed and DiagnosticsFeed.

### Established Patterns
- RED first on the phase base. Scratch lives outside the repo.
- Executors never tick WX-*. Only the phase's last plan ticks HYGN-01..07.
- `check:pr` runs once, alone. Stryker never runs beside vitest. The bench never runs beside anything, and only on a quiet host.
- Git pathspecs need `:(glob)packages/*/src/**`.
- The shell is zsh: run multi-argument commands under `bash -c`.
- Every `spec-revise` call passes `--date 2026-11-21`.
- **The Phase 65 lesson.** A later fix re-aligns the CCR row's cited revisions.
- **Phase 66's verify slips.** Run every verify on the commit shape it checks. This covers C-sort order and diff-line regexes.
- `.log` is gitignored.

</code_context>

<deferred>
## Deferred Ideas
- None. The owner asked for everything open to be absorbed. Only what cannot be changed (published history) is recorded.
</deferred>
