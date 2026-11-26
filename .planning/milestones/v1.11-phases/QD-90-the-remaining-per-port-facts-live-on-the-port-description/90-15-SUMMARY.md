---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 15
subsystem: docs
status: complete
tags: [overview, house-rules, upgrade-guide, changeset, breaking]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: 429fb5b0c51992536d7b53cbc34071ce323cfc46
plan_head_after: ca3dbdb2678f3d8edf145ef1b70fe63fa3046956

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the landed source (plans 09-12) and the records (plan 14)
provides:
  - the overview rows for the moved port types, in place at revision 1.147
  - AGENTS.md section 3 stating a new port's facts (span, wire, serving facet, fixture)
  - the 0.13 upgrade-guide section for the description's new shape
  - the `@qadi/core` Breaking minor changeset
  - COVERAGE.md
affects: [QD-90 plan 16 (phase close)]

requirements-completed: []

actuals:
  tokens: 14000
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - .changeset/core-port-facts-on-the-description.md
    - .planning/phases/QD-90-the-remaining-per-port-facts-live-on-the-port-description/COVERAGE.md
  modified:
    - spec/overview.md
    - AGENTS.md
    - apps/website/src/content/docs/docs/reference/upgrading.md

key-decisions:
  - "The upgrade guide's hand-built description is an object literal typed `PortDescription<...>`, not a `makePortDescription` call, because `makePortDescription` is package-private (decided autonomously)."
  - "AGENTS.md cites no id beyond the existing ADR-QD-094 and ADR-QD-134 in section 3; ADR-QD-203 is not cited there (decided autonomously: the plan allowed it, the sentence the judge reads needs none)."

duration: 25min
completed: 2026-11-26
---

# Phase 90 Plan 15: The Public-Facing Records Summary

**The overview, the house rules' section 3, the 0.13 upgrade note and the `@qadi/core` Breaking minor changeset state that a port's description carries its span name and its fixture; the API coverage note is written and the records-close judge passes.**

## Commits

| Task | Commit | Subject | Paths |
| ---- | ------ | ------- | ----- |
| 1 | `c4bc48fb` | `docs(90-15): complete the overview rows` | `spec/overview.md` |
| 1 | `c03e7fe1` | `docs(90-15): state a new port's facts in the house rules` | `AGENTS.md` |
| 2 | `1149044c` | `docs(90-15): add the upgrade note` | `apps/website/src/content/docs/docs/reference/upgrading.md` |
| 2 | `4252c23e` | `chore(90-15): add the breaking minor changeset` | `.changeset/core-port-facts-on-the-description.md` |
| 3 | `ca3dbdb2` | `docs(90-15): record that no external API is touched` | `COVERAGE.md` |

## What changed

- **`spec/overview.md`** (revision 1.147, no second bump): the `PortDescription` row names the tenth (`SpanName`) and eleventh (`FixtureData`) parameters and the required `fixture`; the port-description row lists `fixture`; `PortName` has its own row (`PortName.ts`, the element type of `PORT_NAMES`); `PortSpanName` and `PortSpanOf` have their own row naming `Ports.ts` and the registry; the `PortFixtureData` and `PORT_FIXTURES` rows say they are read from the descriptions. `check-api-surface` reports 943.
- **`AGENTS.md` section 3 only**: the list of facts gains "its fixture"; the new-port sentence is "A new port is a description (span, wire, serving facet, fixture), a `PORT_NAMES` entry, its registry lines and its `PortServing` row. The compiler asks for the rest."
- **Upgrade guide**: `## 0.13: a port states its span name and its fixture` appended at the end: a before/after table, a `ts` before and after of a hand-built description, a compiled `typescript` example reading `PortSpanOf<"DecisionHistory">`, `DescriptionOf<"DecisionHistory">["span"]` and `PORT_NAMES`, the shared-span compile error, and the closing ADR-QD-203 link. `check-website-doc-examples` compiles 78 blocks.
- **Changeset**: `"@qadi/core": minor`, `**Breaking.**` and the seven sentences the records judge lists (the upgrading sentence before the last), the only changeset added since `phase_base`.
- **`COVERAGE.md`**: the one sentence the plan gives.

## Checks run

| Check | Result |
| ----- | ------ |
| `pnpm spec:verify:strict` (after the overview edit) | 21 PASS, 0 FAIL, 0 SKIP |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry |
| `node scripts/check-api-surface.mjs` / `pnpm spec:api` | 943 exports documented across 9 packages |
| `node scripts/check-house-style.mjs` | 648 files clean (3 declared switches, 81 type-test files) |
| `node scripts/check-dod-table.mjs` | 26 steps match `pnpm check`, 183 references resolve |
| `node scripts/check-website-doc-examples.mjs` | 78 blocks compile |
| `90-check.mjs commit <subject> <paths>` | pass for all five commits, each by its exact subject and the one path it holds |
| `90-check.mjs scan-ids` | `scan-ids: no id or phase wording in added lines` |
| `90-check.mjs records --close` | `records: the pinned-by lists name tests that exist, and every reserved record is written` (exit 0) |
| `90-check.mjs trailers` | `trailers: 53 commits since phase_base, each with the one trailer` |
| `90-pinned-check.mjs` (after each commit) | `pinned: 408 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied` (exit 0) |
| `90-earlier-checks.mjs` after the overview commit | exit 0 |
| `90-earlier-checks.mjs` after the AGENTS.md commit | exit 0; the five 85-89 `scan-forbidden` rows report exactly `AGENTS.md differs from phase_base: no budget moves` |
| `90-earlier-checks.mjs` after the upgrade-note commit | exit 1: the 88 and 89 `records --close` rows expect the changeset (`missing reason "2 changesets are added since phase_base, not one"` and the unexpected `3` and `2` counts); the changeset commit is the one the ledger keys them on, so this is the ledger waiting for its commit, not a defect |
| `90-earlier-checks.mjs` after the changeset commit | exit 0 (the 88 close row reads `3 changesets are added since phase_base, not one`, the 89 close row `2 ...`, as the ledger states) |
| `90-earlier-checks.mjs` after the COVERAGE.md commit | exit 0; only the three trailer counts moved by one |

`pnpm spec:package` is the phase close's (plan 16); it was not run here.

## Deviations from Plan

### Plan defects

1. **The upgrade guide's before-and-after description fragment uses an object literal.** The plan asks for a hand-built description gaining `fixture`; `makePortDescription` is package-private, so a consumer cannot call it. Both `ts` fragments type the object as `PortDescription<...>` and assign a literal.
2. **The upgrade-note commit is not green for the earlier checks on its own.** The earlier-checks ledger keys the 88 and 89 `records --close` rows on the changeset commit, which the plan orders after the upgrade-note commit. The rows turn green at `chore(90-15): add the breaking minor changeset`, as the ledger says.

### Choices the plan left open

- AGENTS.md section 3 cites no new id. The overview's `PortDescription` row states the parameters in prose, and the ADR is linked from the upgrade note.

## Known Stubs

None.

## Threat Flags

None. T-90-30 holds: the changeset begins `**Breaking.**` with its seven sentences and the upgrade section's compiled example passes the website examples gate. T-90-31 holds: AGENTS.md changed only in section 3 under one subject, and the five guard rows read as the ledger expects.

## Self-Check: PASSED

Files found: `spec/overview.md`, `AGENTS.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/core-port-facts-on-the-description.md`, `COVERAGE.md`. Commits `c4bc48fb`, `c03e7fe1`, `1149044c`, `4252c23e`, `ca3dbdb2` are ancestors of HEAD.
