# Phase 36: Carried spec debt and stale records - Context

**Gathered:** 2026-11-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Clear the v1.2 spec debt and the stale records now that phases 30–35 have made their own corrections, and close every item those phases carried here. Requirements: DEBT-01..05 and WX-01..07. Records: CCR-QD-427; BEH-QD-516..520 and INV-QD-317..318 (reserved, Unused unless a fixed finding needs one); ADR-QD-149 only if a fix turns out to be a design decision (D-12); changesets for each package whose shipped code changes.

Phase base: `d31a25ee8207d4775d07253ea4e987cbe8daf0cc` (the Phase 35 transition commit). Every item is re-verified at this base before it is touched.

</domain>

<decisions>
## Implementation Decisions

The user's standing direction: "the most clean solution, the most complete, not the simplest. We don't care about complexity." The user chose each grey area below on 2026-11-12.

### Scope (DEBT-01..05 plus the carried items)
- **D-01 The roadmap list is in scope in full:**
  - BEH-QD-219..221 printed twice in `spec/behaviors/29-devtools-simulator.md` (DEBT-01);
  - `spec/traceability.md` behaviour 29 naming `model/Sources.ts` instead of `model/Source.ts` (DEBT-02);
  - the stale "replay fail-open undecided" line wherever it is still live (DEBT-03);
  - every open v1.2 info finding in `.planning/phases/_WAVE8-CONTEXT.md` § Phase 36 (DEBT-04): 24 IN-01, 24 IN-03, 25 IN-01, 25 IN-02, 26 IN-02, 26 IN-03, 27 IN-01, 27 IN-02, 28 IN-01..IN-06, 29 IN-01..IN-03 (24 IN-02 is history and exempt, AGENTS.md §15);
  - the stale citations `packages/http/test/v4-http-smoke.test.ts:106` (`registerApi`) and the `stryker.http.mjs` comment placing code in `PermissionRegistry.ts` (DEBT-05).
- **D-02 The user chose to take every item carried from phases 30–35 as well.** Each is re-verified at the phase base first:
  1. **TimelineFeed: an untokened accept** (Phase 34 review IN-01). A late `accept` from a replaced timeline read can still write. The fix uses a per-start token, the pattern `DiagnosticsFeed.ts` already uses.
  2. **TimelineFeed: silent fiber death** (Phase 34 review IN-05). A defect in the timeline read ends the fiber with nothing observable. It must surface the way `DiagnosticsFeed`'s `Stopped` does, or by a stated, tested rule.
  3. **The react `subject` atom is not keepAlive** (Phase 35 spike, "Pre-existing finding carried to Phase 36"). A gate under a hidden-then-shown `<Activity>`, with the provider outside the Activity, stays `Initial`. This is a real defect: RED test first, then the fix.
  4. **Phase 34 polish** (34-VERIFICATION.md "Human Verification Outcome"): the screen root's thin default focus ring, and the restart button's contrast, which has not been measured. Measure both against WCAG 2.2 AA (focus appearance; 4.5:1 text, 3:1 non-text), then fix whatever falls short with the devtools' existing tokens.
  5. **Stale wording:**
     - `packages/core/test/DecisionCache.test.ts:864` still says "generation" (Phase 31 removed the counter);
     - ADR-QD-081's `Evaluate.ts` paragraph (Phase 32, named in CCR-QD-423) needs an amendment line, not a rewrite;
     - `packages/core/src/DecisionSink.ts:15` and any other src comment still naming `Evaluate.ts` for code that moved to `Walk.ts`/`PortAccess.ts`;
     - the `packages/react/src/useScoped.ts:45` eslint-disable is justified in place, or removed if the rule no longer needs it.
- **D-03 Each item is resolved one of two ways:**
  - **still true at the base:** fix it;
  - **already resolved by phases 30–35** (e.g. 26 IN-01 by Phase 34; 26 IN-02, 26 IN-03 and 29 IN-01, re-checked after Phases 34 and 30): record it as resolved, citing the commit or file and line that shows it.

  A ledger in the phase directory lists every item with its base-state evidence and its disposition. The verifier reads that ledger.

### 28 IN-06 (DEBT-05)
- **D-04 Narrow and test.** Re-verify the finding at the phase base. Then add a test for its remaining gap: an identity-changing rerender under `<StrictMode>` (the gate's policy or resource identity changes across a StrictMode double render, and the registry and atom set stay consistent). If the test fails, the gap is a defect and is fixed test-first. Phase 35's P3 StrictMode pin is prior art, not closure.

### The BEH-QD-219..221 reconstruction (DEBT-01)
- **D-05 Reconstruct by hand, review it as a diff, and do not pause.** The executor rebuilds one BEH-QD-219..221 block from both copies:
  - copy 1's current fail-closed requirement text (ADR-QD-129, BEH-QD-411);
  - copy 2's intact tail prose;
  - the change-history fragment spliced into the body, moved back to the header;
  - the stale fail-open copy, deleted.

  The SUMMARY records, span by span, what was kept from each copy and what was dropped, and why. The code review and the verifier check that record against `git show d31a25ee:spec/behaviors/29-devtools-simulator.md`. `node scripts/spec-revise.mjs --check` must be clean.

### Records and numbers (WX-02)
- **D-06 CCR-QD-427 is the phase's one change row.** It lists every fixed and every resolved item, the BEH/INV numbers used, and the line `Used: …. Unused: …` naming the reserved numbers left over.
- **D-07 Behaviour changes use the reserved numbers.** The defect fixes (D-02 items 1–3, and D-04 if it finds a defect) take numbers from BEH-QD-516..520 and INV-QD-317..318 when they state a new requirement or invariant, and restate an existing requirement in place when that is the cleaner record.
- **D-12 The user allows a new ADR if a fix turns out to be a design decision.** It may only be ADR-QD-149, after confirming that number is free on disk and in the shared reservation file (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`, whose ADR high-water is 148). The orchestrator reserves it by hand before the plan that writes it runs. `node scripts/next-id.mjs` is never run. An existing ADR is amended with an `> **Amended:**` line or a dated amendment section, never rewritten. If no ADR is written, CCR-QD-427 says "ADR: none".
- **D-08 Every date is 2026-11-12,** set through `scripts/spec-revise.mjs … --date 2026-11-12`. CHANGELOG files are history and are never edited. Change-history rows and quoted history are never rewritten (AGENTS.md §15). A live statement is corrected; a history row that quotes the old statement stays.

### Code changes (WX-04..07)
- **D-09 Characterisation and regression first** (WX-06):
  - each defect gets a RED test on the phase base, committed before its fix;
  - each preserved behaviour that a code change touches gets a green pin first;
  - 24 IN-01 (a recorder built and dropped per commit while Live is chosen) and 24 IN-03 (`Ready` spelled twice) are fixed as tested code changes, per DEBT-04.
- **D-10 Mutation** (WX-05): a `36-mutation-base.json` over every src file the phase will touch is committed alone as the first plan commit, using each package's own `stryker.<pkg>.mjs`. The after-run must leave no touched file below its base. Survivors are named.
- **D-11 Changesets:**
  - every package whose shipped code changes gets a patch changeset (`@qadi/devtools` for the TimelineFeed, 24 IN-01, 24 IN-03 and the polish; `@qadi/react` for the subject atom; others as found);
  - a public break, if any, is recorded as **Breaking** in the changeset and in `upgrading.md`;
  - nothing is released or published.

### Claude's Discretion
- Plan count and wave split, within this fixed order: mutation baseline first, then the ledger and RED/characterisation tests, then the fixes, then the spec and record edits, then the closing gate.
- Whether the timeline feed's "observable death" reuses `DiagnosticsStatus`'s shape or a smaller, closed status of its own. The cleaner, more consistent option wins.
- How the focus ring and contrast are measured (computed-style probe in a browser test, or Playwright against `examples/nextjs-newsroom`).

</decisions>

<canonical_refs>
## Canonical References

- `.planning/phases/_WAVE8-CONTEXT.md` § Phase 36 — the item list
- `.planning/milestones/v1.2-MILESTONE-AUDIT.md` — the v1.2 info findings' original text
- `.planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-REVIEW.md`, `34-REVIEW-FIX.md`, `34-VERIFICATION.md` — TimelineFeed IN-01/IN-05, the polish items
- `.planning/phases/35-the-atom-set-owns-its-eviction-sweep/35-SPIKE.md` § "Pre-existing finding carried to Phase 36" — the subject atom
- `spec/behaviors/29-devtools-simulator.md`, `spec/traceability.md`, `spec/README.md` (CCR register), `spec/decisions/081-*.md`, `spec/decisions/index.yaml`
- `packages/devtools/src/model/TimelineFeed.ts`, `packages/devtools/src/model/DiagnosticsFeed.ts` (the token and `Stopped` pattern)
- `packages/react/src/QadiAtoms.ts` (the `subject` atom), `packages/react/test/QadiProvider.sweep.test.tsx` (the Activity harness)
- `packages/http/test/v4-http-smoke.test.ts`, `stryker.http.mjs`
- AGENTS.md §11, §15; `scripts/spec-revise.mjs`

</canonical_refs>

<deferred>
## Deferred Ideas

None. The user chose to close every carried item in this phase.

</deferred>
