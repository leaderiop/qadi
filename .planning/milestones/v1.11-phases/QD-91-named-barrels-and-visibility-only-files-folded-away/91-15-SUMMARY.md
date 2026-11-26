---
phase: QD-91-named-barrels-and-visibility-only-files-folded-away
plan: 15
subsystem: scripts
tags: [house-style, named-barrel, self-test, agents-md, contributing, red-evidence]
requires:
  - phase: QD-91-named-barrels-and-visibility-only-files-folded-away
    provides: the core, react and audit barrels named per module (91-09), 91-check.mjs scratch/variant/rule, 91-RED-EVIDENCE.md
provides:
  - one `named-barrel` house-style rule over the five named barrels, with a list that is its own record and a per-run self-test
  - AGENTS.md sections 9 and 16 and CONTRIBUTING.md rewritten to state it
  - nine named-barrel variants and the two span couplings seen failing in 91-RED-EVIDENCE.md
affects: [91-16 (renames the live old rule name in ADR-QD-047, ADR-QD-099, spec/traceability.md and amends them), 91-17 and later (the CCR-QD-483 row must name spec/roadmap.md), 91-21 (close)]

phase_base: 69e5247d205949df7396dfacb0a29bc96a02f321
plan_head_before: 7a92c0e7eef10c1307f8b072f041e03a6fea0958
plan_head_after: 3870cf5a3eae5baaca48663612c490de31b488a0
commits: 3

actuals:
  tokens: 8100
  tasks: 2
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a rule's list of targets is checked both ways (a listed path must exist and obey it, an unlisted path must not look like one) and the rule is planted against its own targets every run"

key-files:
  created: []
  modified:
    - scripts/check-house-style.mjs
    - AGENTS.md
    - CONTRIBUTING.md
    - spec/roadmap.md
    - .planning/phases/QD-91-named-barrels-and-visibility-only-files-folded-away/91-RED-EVIDENCE.md

key-decisions:
  - "A group counts as inside the package when its specifier starts with ./ or ../, because the devtools react barrel re-exports from ../model/*; only a bare specifier is refused"
  - "An unlisted index with a relative named group is a named barrel off the list; with an export * as well it is a mixed barrel; both are refused, and a listed barrel that holds no group at all is a reason too"
  - "spec/roadmap.md is revised once (1.34 to 1.35) in its own commit, because the plan's docs commit is fixed to the evidence file alone"

requirements-completed: []

duration: 40min
completed: 2026-11-26
status: complete
---

# Phase QD-91 Plan 15: The named-barrel rule Summary

**One `named-barrel` rule in `scripts/check-house-style.mjs` now holds `packages/audit`, `core`, `devtools`, `devtools/react` and `react` roots to named, module-path-ordered, in-package groups, checks its own list in both directions, plants an `export *` into each listed barrel every run, and was seen failing on every shape it refuses.**

## Accomplishments

- Rule (`da1e5f4a`): the old two-barrel constant and its loop are replaced by `NAMED_BARRELS` (the five paths, ASCII order) and a pure `namedBarrelProblems(rel, text)`. It strips comments, then for a listed barrel returns a reason for an `export *`, for no named group at all, for a group whose specifier is not `./` or `../`, and for two groups out of case-sensitive ASCII module-path order; for any other `packages/*/src/**/index.ts(x)` it returns a reason when the index holds a relative named group (an unlisted named barrel, or a mixed one when it also holds an `export *`). A walk over the listed paths plus every such index reports each reason as `[named-barrel]`, and a listed path that does not exist as `[named-barrel]` too. The self-check applies the function to each listed barrel's text with `export * from "./X.ts";` appended and reports `[named-barrel-self-test]` when no `export *` reason comes back; it plants into a copy of the text, never the file. `barrel-order` is untouched. `node scripts/check-house-style.mjs`: `647 file(s) clean`; neither `DEVTOOLS_BARRELS` nor the old rule's name appears in `scripts/`, AGENTS.md or CONTRIBUTING.md. http and testing (pure) and promise, predicate-sql and predicate-prisma stay quiet, as RESEARCH P4 said.
- Documents (same commit): AGENTS.md section 9 names the four packages, module-path order, `named-barrel` refusing `export *` and checking its own list, the pure barrels staying pure because each of their modules is wholly public, and the three edits (a barrel line, a `spec/overview.md` row, a line in that package's `test/surface.test.ts`), keeping the scaffolding and TS2883 sentences; the "Out of the barrel" paragraph gains that a part-public module's other names are package-private by the same rule. Section 16 gains one paragraph saying `scripts/check-package-install.mjs` refuses a packed declaration naming a path outside its own package or into a `src/` tree (check 3c) and why. CONTRIBUTING.md: the "A public export" row names the three edits, a new "A change to a package root's barrel" row names `scripts/surface-diff.mjs snapshot <file>` and `compare <before> <after>`, and both "twenty-six steps" become "twenty-seven" (the seven Stryker runs in `mutation` still hold). No `*_BUDGET`, `.oxlintrc.json` or other AGENTS.md section moved; `91-check.mjs scan-forbidden` and `scan-ids` are clean.
- Roadmap (`3870cf5a`): `spec/roadmap.md` says "twenty-seven numbered steps" and names step 27 (`node scripts/surface-diff.mjs --self-test`, CCR-QD-483) among those with no row of their own; one `spec-revise` bump, 1.34 to 1.35, `spec-revise --check` clean.
- Evidence (`9015260c`): eleven blocks in `91-RED-EVIDENCE.md`, each on its own scratch clone of `da1e5f4ad7`, each exit 1 with its tag in the failing text.

### Variants (`91-RED-EVIDENCE.md`)

| Label | Edit | Failing text |
| ----- | ---- | ------------ |
| `named-barrel-star-core` | `export * from "./Policy.ts";` appended to core's barrel | `[named-barrel] \`export *\` re-widens the interface…` |
| `named-barrel-star-react` | same, `./QadiAtoms.ts`, react | same, one violation |
| `named-barrel-star-audit` | same, `./AuditArchive.ts`, audit | same, one violation |
| `named-barrel-star-devtools` | same, `./model/Diagnostics.ts`, devtools | same, one violation |
| `named-barrel-star-devtools-react` | same, `../react/DecisionLog.tsx`, devtools react | same, one violation |
| `named-barrel-order` | the first named group of core's barrel swapped with the next group of another module | `"./AttributeResolver.ts" sorts before "./AuthSubject.ts"` |
| `named-barrel-unlisted` | every `export *` line of http's barrel turned into a named group | `is a named barrel that NAMED_BARRELS does not list` |
| `named-barrel-mixed` | one named group added to testing's pure barrel | `mixes \`export *\` with a named group` |
| `named-barrel-self-test` | `namedBarrelProblems` made to ignore `export *` | `[named-barrel-self-test] a planted export * was not refused.` on audit, core, devtools (and the other listed barrels) |
| `span-untrusted-decode-after-folds` | a `JSON.parse` call planted in `PortSpanEncode.ts` | `[untrusted-decode] declares 2 untrusted-decode token(s), found 3` |
| `span-key-source-after-folds` | a second `"qadi.subject_id"` planted in `PortSpanEncode.ts` | `[span-key-source] mentions the span key \`qadi.subject_id\`` |

The span couplings after the folds, each with the command that shows it: `SPAN_KEY_SHARED` is `packages/core/src/PortSpanEncode.ts` (`/usr/bin/grep -n '^const SPAN_KEY_SHARED = ' scripts/check-house-style.mjs`, line 2501); `UNTRUSTED_DECODE_BUDGET["packages/core/src/PortSpanEncode.ts"]` is 2 (`/usr/bin/grep -n 'packages/core/src/PortSpanEncode.ts": 2' scripts/check-house-style.mjs`, line 662); AGENTS.md section 7a's row names `decodePortSpan` (`/usr/bin/grep -n 'PortSpanEncode.ts' AGENTS.md | /usr/bin/grep decodePortSpan`, line 707). The eleven scratch clones were removed by name; `gen/` and `earlier/` under the scratch root were left alone.

## Task Commits

1. Task 1: `da1e5f4a` `feat(91-15): one named-barrel rule over the five named barrels` (`scripts/check-house-style.mjs`, `AGENTS.md`, `CONTRIBUTING.md`); `91-check.mjs commit` accepts it.
2. Task 2: `9015260c` `docs(91-15): record the named-barrel rule seen failing and the span couplings` (`91-RED-EVIDENCE.md` only); `91-check.mjs commit` accepts it.
3. Off-table: `3870cf5a` `docs(91-15): count the merge gate's twenty-seven steps in the roadmap` (`spec/roadmap.md` only), the orchestrator's added scope.

## Deviations from Plan

### Plan defects

**1. The `named-barrel-unlisted` edit as written trips the mixed reason, not the unlisted one.** Before: "one `export *` line turned into an `export { … }` group" of http's barrel, which still holds thirteen other `export *` lines, so the rule (correctly) reports `mixes \`export *\` with a named group`, and the unlisted reason is never seen. After: every `export *` line of http's barrel is turned into a named group of that module, so the index is a named barrel and only the unlisted reason fires. The first block (the one-line edit) was removed from the evidence file before the second was recorded; the mixed reason is covered by `named-barrel-mixed`. The shipped barrels are untouched.

**2. The `named-barrel-order` edit as first written was not seen failing.** Swapping the first two group statements of core's barrel swapped two groups of the same module (a value group and a type group), so the specifier order did not change and the variant correctly printed `was not seen failing`. The edit now swaps the first group with the next group of a different module; nothing was recorded for the first attempt.

### Choices the plan left open (autonomous, most complete option)

**3. The roadmap bump is its own commit.** The orchestrator asked for it in "this plan's documentation commit"; that commit is fixed by `PHASE_COMMITS` to the evidence file alone, and the feat commit to its three paths, so a fourth path in either would fail `91-check.mjs commit`. The bump is a separate commit with the same trailer.

**4. No extension of `91-check.mjs` or `91-earlier-checks.mjs`.** `records --close` reads the set of revised documents from the tree against phase_base, requires each to be one minor above its base and requires the CCR-QD-483 row of `spec/README.md` to name every changed document; `spec/roadmap.md` is therefore already judged (and the row must name it, which a later plan writes). `91-earlier-checks.mjs`: `87 runs, all match their rows` after the roadmap bump. Adding the roadmap to `REQUIRED_REVISED` would only restate that.

**5. A listed barrel with no named group at all is a reason, and a listed path that does not exist is a reason** (the plan's "empty" truth), and a specifier starting `../` counts as in-package (the devtools react barrel re-exports from `../model/*`).

**Total deviations:** 2 plan defects in scratch edits, 3 open choices. **Impact:** none on the shipped tree; no check weakened.

## Known Stubs

None.

## Threat Flags

None. T-91-30 (an `export *` publishing a part-public module's internals) is mitigated: refused in each of the five barrels, an unlisted and a mixed barrel, all seen failing. T-91-31 (a rule that silently matches nothing) is mitigated: the per-run planted `export *` is seen failing with the check disabled (`named-barrel-self-test`).

## Self-Check: PASSED

- `scripts/check-house-style.mjs` declares `NAMED_BARRELS` with the five paths, holds `[named-barrel]` and `[named-barrel-self-test]`, and `/usr/bin/grep -c 'devtools-named-barrel\|DEVTOOLS_BARRELS' scripts/check-house-style.mjs` is 0; AGENTS.md section 9 names `named-barrel`, `@qadi/core`, `@qadi/react`, `@qadi/audit`, `@qadi/devtools` and `test/surface.test.ts`, section 16 names `src/` and `outside its own package`; CONTRIBUTING.md's "A public export" row names `test/surface.test.ts` and a row names `scripts/surface-diff.mjs`.
- `node scripts/check-house-style.mjs`, `node scripts/check-dod-table.mjs` (`27 step(s) match pnpm check`), `pnpm lint`, `node scripts/spec-revise.mjs --check` exit 0; `91-check.mjs` `scan-ids`, `scan-forbidden`, `trailers` (51 commits, each with the one trailer), `records` exit 0; `91-pinned-check.mjs`: `516 held, 26 declared (26 applied), 4 born, 27 earlier-held, clean`; `91-earlier-checks.mjs`: `87 runs, all match their rows`.
- Commits `da1e5f4a`, `9015260c` and `3870cf5a` are ancestors of HEAD, each with the one trailer. `91-check.mjs rule` still lists the live old rule name in ADR-QD-047, ADR-QD-099 and `spec/traceability.md:530`, which 91-16 renames with their one revision each.
