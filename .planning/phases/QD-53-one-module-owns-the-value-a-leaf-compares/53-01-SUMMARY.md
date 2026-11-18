---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 01
subsystem: testing
tags: [stryker, mutation-baseline, evidence, reserved-ids]
phase_base: 03bb6545a46e508e8377360469dd1cbcea958c9a
plan_head_before: 03bb6545a46e508e8377360469dd1cbcea958c9a
plan_head_after: fe1d4af6da2981e8137dd43a3800132aea5aeee2
requires: []
provides:
  - phase_base and the verified base facts for the operand-reader consolidation
  - 53-mutation.mjs (base, after, compare) with MOVED and RENAMED declared before the change
  - 53-mutation-base.json, the Stryker baseline of the eight touched files with survivor identities
affects: [53-02, 53-06, 53-08]
actuals:
  tokens: 7000
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns: [baseline measured on the green tree before the RED tests, D-14 compare with declared rename map]
key-files:
  created:
    - .planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation.mjs
    - .planning/phases/QD-53-one-module-owns-the-value-a-leaf-compares/53-mutation-base.json
  modified: []
key-decisions:
  - "The Decision.ts survivor on `if (isFieldOf(data, field)) {` is mapped through RENAMED at the close, never re-baselined"
requirements-completed: [WX-02, WX-05, WX-06]
coverage:
  - id: D1
    description: "Review facts, engine suites and reserved ids verified at phase_base"
    requirement: WX-02
    verification:
      - kind: other
        ref: "Task 1 verifies (base-facts recount, ten whole-id git grep checks, EngineAgreement 2 files / 20 tests)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mutation baseline of the eight touched files and the D-14 comparer, committed alone as the phase's first plan commit"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node 53-mutation.mjs base; Task 2 verifies (JSON shape, MOVED/RENAMED text, commit contents and parent)"
        status: pass
    human_judgment: false
duration: 8min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 01: Evidence on the untouched base Summary

**Stryker baseline of the eight operand-reader files (96.85 overall) and the D-14 comparer with `MOVED` and `RENAMED` fixed, committed alone on the green base, after the review's facts, the engine suites and the ten reserved ids were verified at `phase_base`.**

## Performance

- **Duration:** about 8 min (2026-11-18T04:49:03Z start)
- **Tasks:** 2 (Task 1 produced no commit by design; Task 2 is `fe1d4af6`)
- **Files:** 2 created under `.planning/`; nothing under packages, spec, scripts or `.changeset`

## Base facts

Read at `phase_base` (source tree equal to `44510112`'s; planning commits after it touch `.planning/` only).

Nine reader sites (D-01, D-02):

| # | Site | File:line | Fact |
|---|------|-----------|------|
| 1 | walk, `HasResourceAttribute` arm | `Walk.ts:350` | inline `Object.hasOwn(row, policy.attribute) ? row[policy.attribute] : undefined` |
| 2 | `readAttribute` | `PortAccess.ts:348-349` | subject-first `Object.hasOwn(subject.attributes, attribute)` then bare `subject.attributes[attribute]`, else `resolveAttribute` |
| 3 | `getByPath` | `Matcher.ts:341`, `:350` | own-property walk `!isObject(current) \|\| !Object.hasOwn(current, part)`; private `isObject` above it |
| 4 | FieldMatch arm | `Matcher.ts:740` | inline `Object.hasOwn(value, self.field) ? value[self.field] : undefined` |
| 5 | `projectAt` | `FieldPath.ts:332` | own-property skip `if (!Object.hasOwn(frame.value, key)) continue;` |
| 6 | `isFieldOf` | `Decision.ts:286-289` and its one call `:356` | `field is keyof A & string => Object.hasOwn(data, field)` |
| 7 | `Predicate.ts` leaf arms | `Predicate.ts:163`, `:164` | `Compare` / `MemberOf` read the row cell bare (`row[p.column]`) |
| 8 | `Predicate.ts` import | `Predicate.ts:33` | `getByPath` imported from `./Matcher.ts` (also used at `:220`) |
| 9 | the two table builders | `AttributeResolver.ts:227`, `CustomPredicate.ts:289` | bare `table[attribute]` / `table[name]` |

`Matcher.ts` carries its two budgeted switches: `judgeMatcher` (`switch (self._tag)`, `:699`) and `resolveRef`
(`switch (ref._tag)`, `:410`, calling `getByPath` at `:412` and `:416`). `Walk.ts:313` carries `evaluateNode`'s switch.

OPND-03 baseline: six code lines across the eight files call the own-property test: `Walk.ts:350`, `PortAccess.ts:348`,
`Matcher.ts:350`, `Matcher.ts:740`, `FieldPath.ts:332`, `Decision.ts:289`. `packages/core/src/Operand.ts` does not exist
at `phase_base`.

Engine suites (D-13, run, never edited): `pnpm exec vitest run --project predicate-sql --project predicate-prisma
EngineAgreement` is green: 2 files, 20 tests passed.

## Reserved ids

`ARCH-100`, `ADR-QD-166`, `CCR-QD-444`, `BEH-QD-601`..`BEH-QD-605`, `INV-QD-351` and `INV-QD-352` are free at
`phase_base` (whole-id `git grep -lwF` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features,
apps/website/src, examples and scripts prints nothing); no `spec/decisions/166-*` exists there; the reservation file reads
`{"CCR":452,"ADR":174,"BEH":645,"INV":368}`. `node scripts/next-id.mjs` was never run.

## Mutation base

Command (53-06 repeats it with `,packages/core/src/Operand.ts` appended inside the quotes), run alone on the green tree
with no other heavy process; Stryker exit 0, overall 96.85, report written, 1 min 35 s:

```
pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/AttributeResolver.ts,packages/core/src/CustomPredicate.ts,packages/core/src/Decision.ts,packages/core/src/FieldPath.ts,packages/core/src/Matcher.ts,packages/core/src/PortAccess.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts'
```

Printed by `node 53-mutation.mjs base` (score, `(detected/scored)`, ignored):

| File | Score | Detected/scored | Ignored | Survivors |
|------|-------|-----------------|---------|-----------|
| `AttributeResolver.ts` | 1 | 22/22 | 35 | 0 |
| `CustomPredicate.ts` | 0.9459459459459459 | 35/37 | 34 | 2 |
| `Decision.ts` | 0.967741935483871 | 150/155 | 18 | 5 |
| `FieldPath.ts` | 0.9347826086956522 | 172/184 | 6 | 12 |
| `Matcher.ts` | 0.9774774774774775 | 217/222 | 93 | 5 |
| `PortAccess.ts` | 1 | 47/47 | 17 | 0 |
| `Predicate.ts` | 1 | 293/293 | 22 | 0 |
| `Walk.ts` | 0.948051948051948 | 292/308 | 16 | 16 (13 Survived, 3 NoCoverage) |

Survivors (file:line:column, mutator, status, replacement, mutated text):

- `CustomPredicate.ts`: `:294:23` StringLiteral `""` for the "no predicate is registered under this name" reason; `:287:11` StringLiteral `""` for `name: "customPredicateFromRecord"`.
- `Decision.ts`: `:356:9` ConditionalExpression `true` for `isFieldOf(data, field)` (the line this phase renames); `:361:23` BooleanLiteral `configurable: true`; `:360:19` BooleanLiteral `writable: true`; `:575:18` ArithmeticOperator `node.children.length - 1`; `:577:11` ConditionalExpression `child !== undefined`.
- `FieldPath.ts`: `:148:12` EqualityOperator `a.reach < b.reach`; `:90:3` ConditionalExpression and EqualityOperator on `shorter.length < longer.length`; `:176:9` `head === undefined`; `:243:30`, `:243:71` ConditionalExpression and `:243:83` StringLiteral on the `tails.filter` expression; `:307:10` EqualityOperator `stack.length > 0`; `:305:70` StringLiteral `""`; `:311:9` EqualityOperator `frame.cursor >= frame.keys.length`; `:309:9` `frame === undefined`; `:331:9` `key === undefined`.
- `Matcher.ts`: `:365:7` ConditionalExpression `typeof value === "string"`; `:421:5` ConditionalExpression and `:421:14` BlockStatement on the `default:` arm of `resolveRef`; `:613:39` ConditionalExpression and EqualityOperator on `depth > deepest`.
- `Walk.ts`: NoCoverage `:309:62` `{ maxDepth }`, `:424:47`, `:476:42` reason strings; Survived `:247:15` `"HasCustom"`, `:309:7` `depth > maxDepth`, `depth + 1` arithmetic at `:397`, `:412`, `:430`, `:549`, `:569`, `:686`, `:700`, `:789`, `:814`, and `{ concurrency: request.concurrency }` at `:701`, `:818`.

Decision.ts rename note: the survivor on the `isFieldOf(data, field)` line (`ConditionalExpression | Survived | true |
isFieldOf(data, field) | if (isFieldOf(data, field)) {`) IS among the base survivors, and `RENAMED` maps it to the
`isOwnKey(` call text at the close. No other survivor sits on a line this phase edits: the inline reads (`Walk.ts:350`,
`PortAccess.ts:348`, `Matcher.ts:350`, `Matcher.ts:740`, `FieldPath.ts:332`, `Predicate.ts:163-164`,
`AttributeResolver.ts:227`) carry none. Two survivors are adjacent to an edited line but sit on their own
lines: `FieldPath.ts:331` (`if (key === undefined) continue;`, one line above the `projectAt` own-property skip) and
`Decision.ts:360-361`. They are not added to `RENAMED`; 53-06 decides them if their text changes.

`53-mutation-base.json` holds exactly `counts`, `measured` and `survivors` for the eight files. The script and the JSON
are `chore(53-01)` `fe1d4af6`, whose parent is `phase_base`.

## Task Commits

1. **Task 1: preconditions, base facts, engine suites, reserved ids** - no commit by design (evidence recorded here)
2. **Task 2: mutation script and baseline** - `fe1d4af6` (chore)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No file outside `.planning/` changed; no package was installed.

## Issues Encountered

None. The initial `git status` showed pre-existing uncommitted `.planning/STATE.md` and `.planning/config.json`
changes and untracked `.agents/`, `.codex/`, `.vitest/`, `.planning/state.json` and `*.iter*.md` files; none were staged.

## Next Phase Readiness

Ready for 53-02 (characterisation and RED tests). `phase_base` and the baseline are fixed; the baseline must never be
re-measured or the script edited.

## Self-Check: PASSED

- `53-mutation.mjs`, `53-mutation-base.json` and this SUMMARY exist on disk.
- `fe1d4af6` is an ancestor of HEAD, is the first `(53-0` commit, changes exactly the two files, has `phase_base` as parent and ends with the trailer.
