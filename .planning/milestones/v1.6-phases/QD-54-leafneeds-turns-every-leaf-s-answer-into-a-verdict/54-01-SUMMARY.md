---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 01
subsystem: evidence
tags: [mutation-baseline, bench-base, reserved-ids, verdict-step-checks]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_after: 77d723caf0f3907261d702aec2eafd9586d1ff87
requires: []
provides:
  - "54-mutation.mjs (base, after, compare; LN, FILES, MOVED, KILLED) and 54-mutation-base.json"
  - "54-bench-base.json (informational, D-08)"
  - "phase_base and the base facts every later verify reads"
affects: [54-02, 54-03, 54-04, 54-05, 54-06, 54-07, 54-08]
tech-stack:
  added: []
  patterns: ["evidence committed alone before any test or source change"]
key-files:
  created:
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation.mjs
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation-base.json
    - .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-bench-base.json
  modified: []
key-decisions:
  - "phase_base is afdd8d9c (the parent of chore(54-01)); every later verify reads it from this front matter"
requirements-completed: [WX-02, WX-05, WX-06]
duration: 6 min
completed: 2026-11-18
status: complete
commits: 1
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
---

# Phase 54 Plan 01: Base evidence for the leaf-verdict step Summary

Evidence-only plan: the base facts, the two verdict-step baselines, the informational bench, the reserved-id check and the Stryker baseline of LeafNeeds.ts, Predicate.ts and Walk.ts were recorded on the untouched tree and the baseline committed alone as `chore(54-01)` (77d723ca).

## Base facts

Re-verified at `phase_base` (`afdd8d9c`; source identical to `09f16437`). The first Task-1 verify recounts each of these.

- `Walk.ts:182` `evaluateActed`'s polarity ternary (`const wanted: ActedResult = policy._tag === "HasActed" ? "Acted" : "NotActed"`); `:187` the comparison `answer === wanted`; `:193` the reason text.
- `Walk.ts:210-212` `evaluateHasRelationship`'s `Match.value(related)` with the `Related`/`Unrelated` arms; `:248` the custom arm's allow line `? allow("HasCustom", policy.fields)`; `:267-272` the signature arm's `matched`/`onFile === 0` tests.
- `Walk.ts:314` the one budgeted `switch (policy._tag)`; arms: permission `:317` (`holdsPermission(subject, policy)`), role `:324` (`holdsRole(subject, policy)`), attribute `:334` and resource attribute `:347` (`judgeMatcher(policy.matcher, value, matcherContext)` then `holds`), action `:365` (`holdsAction(policy, action)`).
- `Walk.ts` three budgeted `Effect.fnUntraced` at `:531` `evaluateAllOf`, `:668` `evaluateAnyOf`, `:726` `evaluateRules`.
- `Predicate.ts:309` `AskActed` carries `readonly wanted: ActedResult`; `:386` the `history` ternary; `:398`, `:400`, `:406` the `cases` folds (role, permission, action through `holdsRole`, `holdsPermission`, `holdsAction`); `:592` `AskAttribute` reads `evaluateMatcher`; `:596` `AskActed` compares `answer === p.wanted`.
- `LeafNeeds.ts:27` `type LeafTag = LeafPolicy["_tag"];` (unexported); `:259-271` `holdsRole`, `holdsPermission`, `holdsAction`; no `LEAF_VERDICTS`, no `isHeld`; `index.ts` does not name `LeafNeeds`.
- `Matcher.ts:662` `judgeMatcher` (its `switch` is the budgeted one of two in `Matcher.ts`).
- `scripts/check-house-style.mjs:380` `"packages/core/src/Walk.ts": 1` (SWITCH_BUDGET), `:384` `Matcher.ts` 2, `:467` `Walk.ts` 3 (UNTRACED_BUDGET).
- `packages/core/test/LeafVerdict.test.ts` does not exist.

## Verdict-step baselines

Both run at `phase_base`, code lines only (comment lines dropped).

VERD-01: exit 1, 12 lines (8 offender lines + 4 count lines):

```
Predicate.ts:27 import type { ActedResult } from "./DecisionHistory.ts";
Predicate.ts:309 readonly wanted: ActedResult;
Predicate.ts:386 wanted: leaf._tag === "HasActed" ? "Acted" : "NotActed",
Predicate.ts:596 constant(answer === p.wanted),
Walk.ts:18 import type { ActedResult } from "./DecisionHistory.ts";
Walk.ts:182 const wanted: ActedResult = policy._tag === "HasActed" ? "Acted" : "NotActed";
Walk.ts:187 answer === wanted
Walk.ts:193 : `subject '${subject.id}' ${answer === "Acted" ? "has already" : "has not"} performed '${
LeafNeeds.ts code holds "Acted" 0 times, expected 1
LeafNeeds.ts code holds "NotActed" 0 times, expected 1
Walk.ts reads LEAF_VERDICTS[policy._tag]( 0 times, expected 1
Predicate.ts reads LEAF_VERDICTS[p.leaf._tag]( 0 times, expected 1
```

VERD-02: exit 1, 34 lines (18 "decides itself" lines, 14 call-count lines, 2 import lines):

- decides itself: `Walk.ts` 27, 211, 212, 267, 268, 272, 317, 324, 334, 335, 347, 349, 365; `Predicate.ts` 33, 398, 400, 406, 592 (18 lines)
- 9 `Walk.ts calls LEAF_VERDICTS.<Leaf>( 0 times, expected 1` lines (HasPermission, HasRole, HasAttribute, HasResourceAttribute, HasRelationship, HasAction, `[policy._tag]`, HasCustom, HasSignature) and 5 for `Predicate.ts` (HasRole, HasPermission, HasAction, HasAttribute, `[p.leaf._tag]`)
- `Walk.ts does not import LEAF_VERDICTS and isHeld from ./LeafNeeds.ts` and the same for `Predicate.ts`

Counts match the planning-time measurement exactly (12 and 34).

## Bench base

Informational only (D-08); gates nothing. Run once on the untouched tree, kept as `54-bench-base.json`.

- `uptime` before: `load averages: 2.46 3.48 5.43`
- `uptime` after: `load averages: 2.18 3.27 5.25`

| Workload | min (ns) | p50 (ns) |
|---|---|---|
| one node | 5209 | 5542 |
| wide — allOf of 8 | 6958 | 7334 |
| matcher-heavy — 3 refs | 10083 | 10583 |
| leaf-heavy — allOf of 8, matchers reference action and resource | 8458 | 8958 |
| leaf-heavy — allOf of 8, matchers reference neither | 8541 | 9083 |

## Reserved ids

ARCH-101, ADR-QD-167, CCR-QD-445, BEH-QD-606..610, INV-QD-353 and INV-QD-354 are all free at `phase_base` (`git grep -lwF` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts printed nothing for each). No `spec/decisions/167-*` exists there. The reservation file reads `{"CCR":452,"ADR":174,"BEH":645,"INV":368}`, unchanged. `node scripts/next-id.mjs` was not run.

## Mutation base

Measured by `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/LeafNeeds.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts'` on the untouched green tree before any file was written (55 s, whole-run score 97.40, above the break threshold). 54-05 repeats this exact invocation. `54-mutation.mjs base` printed:

- `LeafNeeds.ts` 0.9811320754716981 (52/53), ignored 7; survivor `LeafNeeds.ts:206:64 ConditionalExpression | Survived | true | LEAF_NEEDS[leaf._tag].own === "Action"` (the one equivalent survivor in `isActionLeaf`, as in Phase 50)
- `Predicate.ts` 1 (293/293), ignored 22; no survivors
- `Walk.ts` 0.948051948051948 (292/308), ignored 16; 16 survivors:
  - NoCoverage: `:310` `{ maxDepth }`, `:420` `"the obliged policy denied"`, `:472` `"a required policy denied"`
  - `:248` StringLiteral `"" | "HasCustom"` on `? allow("HasCustom", policy.fields)` (this is `KILLED`'s one entry: yes, it is among the base survivors)
  - nine `depth - 1 | depth + 1` lines: `:393`, `:408`, `:426`, `:545`, `:565`, `:682`, `:696`, `:785`, `:810`
  - `:310` `false | depth > maxDepth`
  - `{} | { concurrency: request.concurrency }` at `:697` and `:814`

`54-mutation.mjs` is the plan's `## Mutation script` block, verbatim, with `LN` = LeafNeeds.ts, `MOVED` = Predicate.ts and Walk.ts, and `KILLED` = Walk.ts's `HasCustom` allow-tag survivor. `54-mutation-base.json` has exactly `counts`, `measured`, `survivors`, each holding exactly the three files.

## Commits

- `77d723ca` `chore(54-01): mutation baseline for LeafNeeds, Predicate and Walk` (54-mutation.mjs and 54-mutation-base.json only; parent is `phase_base`; ends with the trailer)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- 54-mutation.mjs, 54-mutation-base.json, 54-bench-base.json present on disk.
- `chore(54-01)` (77d723ca) is an ancestor of HEAD, its parent is `phase_base`, it touches exactly the two files and ends with the trailer.
- No file under packages, spec, scripts, .changeset, apps, examples, features or AGENTS.md changed.
