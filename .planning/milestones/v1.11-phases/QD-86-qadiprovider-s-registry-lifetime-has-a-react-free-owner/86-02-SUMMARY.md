---
phase: QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner
plan: 02
subsystem: testing
tags: [react, check-script, registry-owner, provider-forwards-only, records, red-evidence]

phase_base: 41c53c65c3ceb60f974650dd374f391c81db56e7
plan_head_before: 74b01655c9c5ec8da131d98b4f1a75e83a83e4a8
plan_head_after: b4f68d6db3d88834d789ef481c1874e554a0ff11
commits: 2

requires:
  - phase: QD-86 plan 01
    provides: the recorded phase_base, the pinned set and the characterisation the checks sit beside
  - phase: QD-85-the-dock-s-hydration-block-is-a-model-row
    provides: 85-check.mjs, the shared modes this plan ports
  - phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
    provides: effectSpans and the import reading of 82-check.mjs
provides:
  - 86-check.mjs, the one check every later plan of the phase calls (shared modes, owner-shape, provider-forwards-only, records [--close]), 262-case self-test
  - 86-RED-EVIDENCE.md `## 86-02 the check helper`, each of the ten run modes seen failing once
affects: [QD-86 plans 03 to 08]

actuals:
  tokens: 24369
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a phase check as pure judges over comment- and string-blanked text, each with a passing and a failing plant"
    - "the effect order of a component held as a text rule, because no render shows it while nothing throws"

key-files:
  created:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-check.mjs
  modified:
    - .planning/phases/QD-86-qadiprovider-s-registry-lifetime-has-a-react-free-owner/86-RED-EVIDENCE.md

key-decisions:
  - "The trailer is the exact owner line, Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>, as D-18 and the run rules say; the PATTERNS note preferring a generic regex is not taken"
  - "owner-shape reads the module scope as statements (topLevel) rather than by line, so a multi-line import or interface is one statement and anything else at module scope fails"
  - "provider-forwards-only reads each effect as its useEffect call text with the dependency list split off, so the branch ban covers the body only"

patterns-established:
  - "records expands `A to B` row ranges in a Pinned by paragraph and checks each row against the test titles of the file named before it"

requirements-completed: []

coverage:
  - id: D1
    description: "86-check.mjs with the ported shared modes and the owner-shape, provider-forwards-only and records [--close] modes, each judge exported and pure"
    requirement: WX-06
    verification:
      - kind: other
        ref: "node 86-check.mjs --self-test (262 passed) and the Task 1 verify"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of the ten run modes seen failing once and recorded"
    requirement: WX-06
    verification:
      - kind: other
        ref: "Task 2 verify: 86-RED-EVIDENCE.md `## 86-02 the check helper`, tree clean under packages, spec, scripts, stryker.react.mjs and AGENTS.md"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-11-25
status: complete
---

# Phase 86 Plan 02: The phase check helper Summary

**One committed, self-tested `86-check.mjs` states the phase's structural rules (a React-free owner, a provider that only forwards with commit first and hold last, every reserved record written) and each run mode was seen failing once.**

## Performance

- **Duration:** about 40 min
- **Tasks:** 2 (tracer, auto)
- **Files created:** 1 (and this summary); 1 appended
- **Commits:** 2

## Accomplishments

- `86-check.mjs` ports Phase 85's shared modes (`base`, `commit [--first]`, `unchanged`, `seen-failing`, `scan-ids`,
  `scan-forbidden`, `trailers [--message]`) with every `85` name, the scratch directory (`qd86`), the subject pattern
  (`^[a-z]+[(]86-[0-9]{2}[)]!?: `), the id-token list, `PHASE_BASE` (`41c53c65...`) and the exact owner trailer changed,
  and the module-scope string-literal rule moved to `packages/react/src` (the `"use client";` line exempt).
- `owner-shape` judges the module scope statement by statement (imports, types and the one `makeRegistryOwner`), the
  import allow-list, the call counts (`AtomRegistry.make(` 1, `makeRegistryLease(` 1, `registry.reset()` 1,
  `registry.set(` 2), `hold: lease.hold` / `release: lease.release` by reference, the banned tokens, the barrel, the
  provider's exports and `stryker.react.mjs`'s `mutate` list.
- `provider-forwards-only` reads the four effects in source order: commit first on `[owner, atoms, subject]`, the two
  instrumentation effects strictly between, hold and the returned release last on `[owner]`, no branch token in the first
  and last bodies, the forbidden old names, the type-only `AtomRegistry` import and the three public re-exports.
- `records [--close]` reads the `Pinned by` paragraphs of BEH-QD-747 to 750 (766 and 767 once written), expands `RL1 to
  RL10` ranges, matches quoted titles whole, and with `--close` reads every reserved record (ADR-QD-199 with its refresh
  sentence and the `Tests removed: 0.` line after the audit table, ADR-QD-195 Revision 1.4, BEH/INV headings and rows,
  the INV Source lines read from their own sections, the CCR-QD-478 row with the unused list).
- On the tree: `base`, `scan-ids`, `scan-forbidden`, `trailers` and `records` exit 0; `owner-shape` prints `RegistryOwner.ts is
  missing` and exits 1; `provider-forwards-only` (six useEffect, six useRef, the old names) and `records --close` (21
  reasons) exit 1.

## Task Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 (tracer) | `c080fb7f` | `chore(86-02): add the phase check helper` |
| 2 | `b4f68d6d` | `docs(86-02): record each check seen failing` |

## Deviations from Plan

**1. [Plan wording] Self-test plants for the module-scope literal rule were wrapped in an arrow**
- **Found during:** Task 1
- **Issue:** 85's shared "not flagged" plants (a string holding `as`, a blanked template, `"wow!"`, a `for ... in` line) sat
  at module scope of `packages/react/src/A.ts`; 85 applied the module-scope literal rule to devtools source only, and the
  plan moves it to react source, so those plants were rightly flagged as module-scope literals.
- **Fix:** each plant became `const f = () => ...` (the rule exempts an arrow body), keeping what it pins (the blanking of
  a string or a template). No judge was weakened; the "not flagged outside react source" case now uses a devtools path.
- **Commit:** `c080fb7f`

**2. [Plan wording] The `kindOf`-based module-scope split test became a `topLevel` test**
- **Found during:** Task 1
- **Issue:** 85's `kindOf` classified hydration-view statements and is not part of the 86 modes.
- **Fix:** the split test reads the first two words of each statement instead; `owner-shape` classifies statements itself.
- **Commit:** `c080fb7f`

**3. [Measured] The `records` evidence line is shortened**
- **Found during:** Task 2
- **Issue:** `RL1 to RL99` makes 96 near-identical stderr lines.
- **Fix:** the first three are kept and the rest are named by count (87 lines), under the line for the mode.
- **Commit:** `b4f68d6d`

**4. [Conflict resolved] Trailer string**
- **Found during:** Task 1
- **Issue:** 86-PATTERNS.md suggests a generic Claude regex because the session model is not Opus; CONTEXT D-18 and the run
  rules fix `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Fix:** the exact owner line, as D-18 decides; every plan commit so far carries it and `trailers` passes.

**Total deviations:** 4 (2 plan wordings, 1 measured, 1 conflict resolved by the decided option). **Impact:** none on any rule
the check states.

## Issues Encountered

None. `scan-ids` and `scan-forbidden` pass on the tree with the pre-existing unrelated edits (`README.md`,
`.planning/config.json`) present.

## Known Stubs

None.

## Threat Flags

None. T-86-04 (each judge has a failing plant and is seen failing on the real tree), T-86-05 (`provider-forwards-only`
refuses any order but commit first, instrumentation between, hold last) and T-86-06 (`trailers` accepts exactly the owner
line) are mitigated as planned.

## Next Phase Readiness

Ready for plan 03. `owner-shape` and `provider-forwards-only` fail on the base for exactly the reasons the phase removes and
should turn green when the owner and the rewired provider land; `records --close` waits for the records plan.
`packages`, `spec`, `scripts`, `stryker.react.mjs` and `AGENTS.md` are unchanged from `phase_base` apart from plan 01's
characterisation test.

## Self-Check: PASSED

- Files: `86-check.mjs`, `86-RED-EVIDENCE.md` and this summary exist.
- Commits `c080fb7f` and `b4f68d6d` are ancestors of HEAD; the Task 1 and Task 2 verify commands passed.
