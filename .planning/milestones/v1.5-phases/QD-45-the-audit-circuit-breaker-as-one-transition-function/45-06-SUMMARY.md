---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 06
subsystem: spec
tags: [adr, changeset, upgrade-guide, breaking, audit]
status: complete
plan_head_before: f4028cb6a84e4842b1c58114254fc1a8ad08f467
plan_head_after: 3c7ee6ce06d22c9dca1f67ae74a9a0146335c206
commits: 2

requires:
  - phase: QD-45 plan 05
    provides: the layer's typed error and the refusal pins the docs describe
provides:
  - "ADR-QD-158 recorded, registered in index.yaml and traced; ADR-QD-126 amended (Rev 1.1)"
  - "CCR-QD-436 row started in spec/README.md (completed in 45-07)"
  - "one @qadi/audit minor changeset marked Breaking, and the 0.13 upgrade entry with a compiled After fence"
  - "packages/audit/README.md and capabilities.md state the new layer type and the construction refusal"
affects: [45-07, 45-08]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "ADR format of ADR-QD-157; changeset and upgrade entry written in the same terms"

key-files:
  created:
    - spec/decisions/158-the-breakers-rules-are-one-transition-function.md
    - .changeset/audit-options-refused-when-built.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/126-an-audit-store-call-has-a-deadline.md
    - spec/traceability.md
    - spec/README.md
    - apps/website/src/content/docs/docs/reference/upgrading.md
    - packages/audit/README.md
    - apps/website/src/content/docs/docs/packages/audit/capabilities.md

key-decisions:
  - "A refused option is a typed error here and a defect in BEH-QD-166: those options are deployment configuration, a cache capacity is a constant in code"
  - "Duration.infinity stays accepted for storeCallTimeout (D-06a); only zero, negative, NaN, -Infinity and malformed values are refused"

requirements-completed: [WX-02, WX-07]

duration: 25min
completed: 2026-11-15
---

# Phase 45 Plan 06: Decision and break records Summary

ADR-QD-158 and its registry and traceability rows, the ADR-QD-126 amendment, the started CCR-QD-436 row, a Breaking `@qadi/audit` minor changeset and the 0.13 upgrade entry, in the same terms.

## Tasks

| Task | Commit | What |
|------|--------|------|
| 1 | `bb3b5f98` | ADR-QD-158 (Rev 1.0), `index.yaml`, ADR-QD-126 amendment (Rev 1.0 to 1.1, Status names it), traceability ADR rows (Rev 1.187), CCR-QD-436 row (README Rev 1.189) |
| 2 | `3c7ee6ce` | `.changeset/audit-options-refused-when-built.md`, the last `upgrading.md` section, README and `capabilities.md` |

The ADR quotes 45-01's RED evidence (`Tests  21 failed | 5 passed`, `built a breaker that reads Closed then Closed after 10 consecutive failures`) as recorded in 45-01-SUMMARY.

## Verification

- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`; `spec-revise --check`: every Revision matches its newest Change History entry.
- Task 1's structural check (ADR title and sections, index entry, amendment after Related, Rev 1.1, Status, traceability rows, README row): no findings.
- `pnpm typecheck` exit 0; `spec:website-examples`: `63 block(s) compile`; `spec:examples`: `114 block(s) compile`.
- Task 2's structural check (changeset front matter and wording, heading once and last after the `visibleFields` entry, fences, link, no `never` layer type in `capabilities.md`, no CHANGELOG.md, package.json or ADR-QD-056 change since `phase_base`): no findings. `git diff --name-status phase_base HEAD -- .changeset` is exactly `A .changeset/audit-options-refused-when-built.md`.

## Deviations from Plan

None. The plan executed as written.

Left for 45-07 (by plan): `spec/behaviors/33-audit-pipeline.md:35` still states the `never` layer type; the CCR-QD-436 row's file list and Used/Unused sentence are completed there.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: spec/decisions/158-the-breakers-rules-are-one-transition-function.md, .changeset/audit-options-refused-when-built.md
- FOUND commits: bb3b5f98, 3c7ee6ce
