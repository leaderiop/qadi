---
phase: QD-68-hygiene-and-recorded-close-outs
plan: 10
subsystem: normative spec (decisions, behaviours, invariants, traceability)
status: complete
tags: [hygn-03, hygn-04, hygn-07, wx-02, wx-03, oi-09, oi-10, spec]

requires:
  - phase: QD-68-hygiene-and-recorded-close-outs
    provides: 68-05's last commit f297fc10 (68-BENCH.md verdict pass); the capacity-change code of 68-04 and the gate-14 probe of 68-08
provides:
  - "ADR-QD-177 decision 5 and a 2026-11-21 amendment say a capacity change's publish stops no read, with the one residue (a status listener that throws on the Reading a Stopped feed publishes replaces the timeline listener's throw, and no read is started); BEH-QD-656 says the same and that the diagnostics poll's Stopped is held"
  - "ADR-QD-172's amendment, BEH-QD-661, BEH-QD-662, INV-QD-375 and INV-QD-376 say admit reads each field of the question once"
  - "ADR-QD-173's amendment keeps the port cards package-private and points a headless consumer at the diagnostics feed's reading (HYGN-04)"
  - "ADR-QD-174 re-wrapped to its width, the BEH-QD-641 link whole on its line (HYGN-03)"
  - "ADR-QD-033's amendment states what gate 14 now reads"
affects: [68-11, 68-15]

actuals:
  tokens: 62000
  tasks: 2
  commits: 1
plan_head_before: f297fc1016090a8b3f12c46aba4e4af73a754400
plan_head_after: 5b603fea5d948f04c55b2eacabc53df193d7e878
commits: 1

tech-stack:
  added: []
  patterns:
    - "spec text edited from one checked edit list (33 exact-once replacements, SHA-256 on the list and on each result), then bumped only through spec-revise"

key-files:
  created: []
  modified:
    - spec/decisions/033-the-packed-artifact-is-the-product.md
    - spec/decisions/172-admission-produces-the-one-walk-environment.md
    - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
    - spec/decisions/174-a-decision-cache-is-asked-the-question.md
    - spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md
    - spec/decisions/index.yaml
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/05-evaluator.md
    - spec/invariants.md
    - spec/traceability.md

key-decisions:
  - "ADR-QD-033 is amended though 68-CONTEXT lists only 172, 173, 174 and 177: gate 14 is the decision it records and 68-08 changed what that gate reads (flagged assumption)"
  - "HYGN-04 resolves by amendment, not by an export: the port cards stay package-private (A2), gate 13 stays at 939 exports and no packages/*/src/index.ts differs from the phase base"

requirements-completed: [HYGN-03, HYGN-04, HYGN-07, WX-02, WX-03]
completed: 2026-11-21
---

# Phase 68 Plan 10: the amended decisions, behaviours and invariants Summary

Every spec text the phase's fixes falsified now says what the code and gates hold: a capacity change's publish stops no read (residue stated beside the rethrow), `admit` reads each field of the question once, the port cards stay package-private, and ADR-QD-174 fits its width.

## Commit

- `5b603fea` `docs(68-10): the amended decisions, behaviours and invariants say what the code holds` (the ten spec files, one commit)

## What changed

- **OI-09 (ADR-QD-177, BEH-QD-656).** Decision 5 no longer says a capacity change leaves before `begin()`. It says `configure` publishes the emptied timeline and then starts the read that refills it, so a throw on that publish is rethrown once the read has started, unless the timeline was `Stopped` and a status listener throws on the `Reading` that read publishes: that throw replaces the timeline listener's and no read is started. The amendment names TF26 to TF29, F31 and F32. BEH-QD-656 adds the same, and that the diagnostics poll's `Stopped` is held; its pin line reads TF25 to TF29 and F30 to F32. `index.yaml`'s ADR-QD-177 status names the amendment. The TimelineFeed and DiagnosticsFeed rows of `traceability.md` name TF26 to TF29 and F31, F32.
- **OI-10 (admit reads once).** ADR-QD-172's amendment, the `Admission.test.ts` E11 to E13 pins, BEH-QD-661 and BEH-QD-662's MUST (`admit` MUST read each field of the question once), INV-QD-375 and INV-QD-376, and their traceability rows say each field is read once and the policy an `Admitted` carries is the one the depth gate judged. The old sentence that depth is judged on a separate read is replaced.
- **HYGN-04 (D3, ADR-QD-173).** The amendment says `portCards`, its view types and `isUnsampled` stay package-private in `PortCards.ts`, and a headless consumer reads `DiagnosticsSnapshot.reading` (`wiring`, `activity`, `portCalls`). No export is added or removed.
- **HYGN-03 (D9, ADR-QD-174).** Three over-wide lines re-wrapped (189, 168 and 129 columns at the base; none over 119 outside the control block now), and the BEH-QD-641 link is whole on its line, split around its text.
- **ADR-QD-033.** Its amendment states what gate 14 reads: the consumer's run, the refused property carrying its own directive, a timeout on every child, the stop at `Stopped`, and the installed TypeScript named when the parser fails to load.
- **Traceability.** Rows for ADR-QD-033, 172, 173, 177, INV-QD-375, the Admission, ExternalStore, DiagnosticsFeed, TimelineFeed and UntrustedSeams tests.

## Versions (nine `spec-revise` bumps, each `--date 2026-11-21`, citing ARCH-115 and CCR-QD-459)

033 1.2 to 1.3; 172 1.3 to 1.4; 173 1.1 to 1.2; 174 1.2 to 1.3; 177 1.0 to 1.1; 28-devtools-screens 1.37 to 1.38; 05-evaluator 1.20 to 1.21; invariants 1.167 to 1.168; traceability 1.234 to 1.235. No Revision row or Change History cell was edited by hand; no ADR, BEH or INV id was added.

## Verification

- Task 1's `<verify>` passed on the edited tree (the three planned SHA-256, the 177 amendment heading, `spec-revise --check`); Task 2's `<verify>` passed on HEAD after the commit (the seven planned SHA-256, the 3-to-0 over-width count, the whole link line, the one-commit, exactly-ten-files and trailer checks, nothing uncommitted under `spec` or `packages`).
- `spec-revise --check`: every Revision matches its newest Change History entry.
- `check-api-surface.mjs`: `api-surface: 939 export(s) documented across 9 package(s)`; `git diff --quiet f297fc10..HEAD`-style check against phase_base on `packages/*/src/index.ts` holds.
- `check-devtools-claims.mjs`: 8 claims across 6 files. `pnpm spec:examples`: 117 blocks compile.
- verify-traceability `--strict` (`$TMPDIR/qd68/vt-10.txt`): `PASS: 20   FAIL: 1   SKIP: 0`; the one FAIL is the CCR register coverage naming ` 137 459], expected`, which 68-11 resolves.
- No file under `packages/` or `spec/devtools-spec/` changed; `.planning/config.json`, `.agents/`, `.codex/` and the `*.iter*.md` files were not staged.

## Deviations from Plan

None - plan executed exactly as written.

## Flagged assumptions

- **A1 (ADR-QD-174 width).** The width bound is 119 columns outside the Document Control block, as the plan states; the BEH-QD-641 link is split around its text, never inside it.
- **A2 (ADR-QD-173, HYGN-04).** The decision is to keep the port cards package-private rather than export them; the amendment says so and no barrel changes.
- **ADR-QD-033 amendment.** Not in 68-CONTEXT's listed set (172, 173, 174, 177); amended because 68-08 changed what gate 14 reads.

## Known Stubs

None.

## Threat Flags

None. T-68-25 to T-68-27 mitigated as planned: texts match the code TF26 to TF29, F31 and F32 pin, gate 13 stays at 939, and only `spec-revise` wrote revision headers.

## Self-Check: PASSED

- All ten spec files and this SUMMARY exist; commit `5b603fea` is an ancestor of HEAD and is the only commit since `f297fc10`.
