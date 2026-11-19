---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 07
subsystem: spec
tags: [inv-qd-353, inv-qd-354, ccr-qd-445, changeset, spec-revise]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: b8551203900d075626e5dba041a6e64b7cbc1bcb
plan_head_after: c4a238f41f39ec20a66a51319efbd0bb713f6b29
requires: ["54-06"]
provides:
  - "INV-QD-353 and INV-QD-354 with their traceability rows"
  - "the CCR-QD-445 register row"
  - ".changeset/leaf-verdict-stated-once.md (@qadi/core patch)"
affects: [54-08]
key-files:
  created:
    - .changeset/leaf-verdict-stated-once.md
  modified:
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "The changeset is a patch with no Breaking entry: no export changed (935 across 9) and every decision, sentence and fold is pinned unchanged"
requirements-completed: [WX-02, WX-03, WX-07]
duration: 10 min
completed: 2026-11-18
status: complete
commits: 2
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 54 Plan 07: INV-QD-353, INV-QD-354, CCR-QD-445 and the changeset Summary

The two invariants, their traceability and the CCR-QD-445 register row are written under the reserved numbers, with one `@qadi/core` patch changeset, and `spec:verify:strict` is green.

## Records written

| Document | Revision | Change |
|---|---|---|
| `spec/invariants.md` | 1.151 -> 1.152 | INV-QD-353 and INV-QD-354 (headings exactly as 54-06 linked them; 354 relates INV-QD-014) |
| `spec/traceability.md` | 1.214 -> 1.215 | §1 rows 04, 05, 06, 12, 16; §2 rows for both invariants; §3 ADR-QD-167 row naming BEH-QD-606..610; §4 `LeafVerdict.test.ts` row and the extended `LeafNeeds.test.ts` row |
| `spec/README.md` | 1.247 -> 1.248 | CCR-QD-445 row directly after CCR-QD-444 |
| `.changeset/leaf-verdict-stated-once.md` | new | `"@qadi/core": patch` alone, no Breaking entry |

Ids used: ARCH-101, ADR-QD-167, CCR-QD-445, BEH-QD-606..610, INV-QD-353..354. Unused: none. `next-id` was never run.

## Verification

- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0 (the CCR register coverage row failed after Task 1, as planned, and passes with the row).
- `node scripts/spec-revise.mjs --check`: OK. `pnpm spec:api`: 935 exports across 9 packages; `spec/overview.md` and `upgrading.md` unchanged since `phase_base`.
- Changesets since `phase_base`: only `leaf-verdict-stated-once.md` added, none deleted or modified.
- `54-mutation.mjs compare 54-mutation-static.json`: `WX-05 holds (D-10)`.

## Commits

- `7834ffd3` `docs(54-07): INV-QD-353, INV-QD-354 and their traceability`
- `c4a238f4` `docs(54-07): CCR-QD-445 and the @qadi/core patch changeset`

## Deviations from Plan

**1. [Orchestrator ruling] `compare` takes the static evidence path.** Run as `compare .../54-mutation-static.json`; the CCR-QD-445 row mentions the static-ignored credit ruling in one clause. The unchanged-script check was not run (superseded by the ruling).

**2. [Scope] WX-02/03/07 not marked Complete in REQUIREMENTS.md.** Per the orchestrator, requirements are marked by 54-08; `requirements.mark-complete` was not run, though the plan frontmatter lists them.

**Total deviations:** 2, both procedural. **Impact:** none on the records.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `.changeset/leaf-verdict-stated-once.md` present; `7834ffd3` and `c4a238f4` are ancestors of HEAD, each ending with the trailer.
- No source, test, script, overview or upgrading change in this plan; `.planning/config.json` left unstaged.
