---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
verified: 2026-11-18T15:30:00Z
status: human_needed
score: 4/4 roadmap success criteria verified (code, tests, gates); 1 flagged prohibition awaiting human review
covered_files:
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-01-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-01-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-02-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-02-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-03-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-03-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-04-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-04-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-05-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-05-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-06-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-06-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-07-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-07-SUMMARY.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-08-PLAN.md"
  - ".planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-08-SUMMARY.md"
  - "packages/core/src/LeafNeeds.ts"
  - "packages/core/src/Predicate.ts"
  - "packages/core/src/Walk.ts"
  - "packages/core/test/LeafNeeds.test.ts"
  - "packages/core/test/LeafNeeds.tst.ts"
  - "packages/core/test/LeafVerdict.test.ts"
covered_digest: "v4:sha256:7565efde29107aa48e3263334cbd43de51e5a3e3b117c61aceec3f790aaaa936"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Review the orchestrator's D-10 refinement (commit 0c917fdf): 54-mutation.mjs `compare` now credits static-ignored mutants proven Killed by the committed 54-mutation-static.json"
    expected: "User accepts the refinement as meeting WX-05/D-10 (or asks for a different closure, e.g. a test that kills the two-mutant shortfall under the original rule)"
    why_human: "The script was edited after the base commit although 54-05's own prohibition says MUST NOT edit 54-mutation.mjs. The edit was authorised by the orchestrator, not by the user. The result is substantively sound (see Mutation section) but the rule change is a judgement call that belongs to the user."
---

# Phase QD-54: LeafNeeds turns every leaf's answer into a verdict - Verification Report

**Phase Goal:** Every leaf's answer-to-verdict step lives in `LeafNeeds.ts` (or a sibling), finishing ADR-QD-163, so `Walk` keeps only its reason sentence and `toPredicate` keeps only constant folding.
**Verified:** 2026-11-18
**Status:** human_needed (all goal truths verified in the code; one orchestrator-authorised rule change needs a user decision)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | The acted polarity map and verdict rule are each written once, in `LeafNeeds.ts`, and both `Walk` and `toPredicate` read them; the second copy is gone (scoped grep) | VERIFIED | `LeafNeeds.ts` `actedRow(wanted, opposite)` holds `answer === wanted ? "Held" : answer === "Unknown" ? "Unknown" : opposite`, instantiated as `HasActed: actedRow("Acted","NotPerformed")` and `HasNotActed: actedRow("NotActed","Performed")`. `Walk.ts` `evaluateActed` reads `LEAF_VERDICTS[policy._tag](answer)`; `Predicate.ts` `AskActed` plan now carries only the leaf (`wanted` removed) and `run` folds `isHeld(LEAF_VERDICTS[p.leaf._tag](answer))`. Scoped grep for `"Acted"`, `"NotActed"`, `answer ===`, `_tag === "HasActed"`, `wanted` over code lines of Walk.ts, Predicate.ts and PortAccess.ts: no matches. The plan's VERD-01 check exits 0 when re-run. |
| 2 | Every leaf's answer-to-verdict step lives in that one place; the walk keeps only its reason sentence, the translator only constant folding | VERIFIED | `LEAF_VERDICTS` is `satisfies LeafVerdicts`, mapped over all ten `LeafTag`s (missing row is a compile error, `LeafNeeds.tst.ts` pins it). Walk's role/permission/action/attribute/resource-attribute/relationship/custom/signature/acted arms each call their row once and choose only a sentence (`ACTED_DENIAL`, `RELATIONSHIP_DENIAL`, `SIGNATURE_DENIAL`, `attributeReason`). Predicate's role/permission/action/attribute folds go through `isHeld(LEAF_VERDICTS...)`. The plan's VERD-02 check exits 0 when re-run (no `holds*(`, `judgeMatcher`, `evaluateMatcher`, `.roles.has(`, `"Related"`, `onFile`, `matched` in either file's code). |
| 3 | A per-leaf verdict table test covers every leaf tag, written on the phase base and green before and after; the `scope: "Any"` acted agreement stays green | VERIFIED | `packages/core/test/LeafVerdict.test.ts` (500 lines) covers all ten tags through `evaluate` and every folding leaf through `toPredicate`. Order checked from git: `d3dc00ba`/`688f3a42` (test, 54-02) precede the first `packages/*/src` commit `734c4c18`; the file has no commit after 54-02. `Evaluate.test.ts`, `Predicate.test.ts`, `LeafMatrix.test.ts`, `LeafFixtures.ts` have no diff since phase base; `LeafNeeds.test.ts` is 114 insertions, 0 deletions. Vitest `--project core` on the five files: 5 files, 367 tests, all pass. |
| 4 | ADR-QD-167 extends ADR-QD-163; `SWITCH_BUDGET` and `UNTRACED_BUDGET` unchanged | VERIFIED | `spec/decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md` present, status "Accepted — extends ADR-QD-163; keeps ADR-QD-020, ADR-QD-024", indexed. `git diff` since base shows no change to `scripts/`, `AGENTS.md`, `stryker.config.mjs`, `Matcher.ts`, `Compare.ts`, `PortAccess.ts`, `index.ts`, `pnpm-lock.yaml`. `switch (policy._tag)` still once in `Walk.ts` code (`evaluateNode`, line 331), `Matcher.ts` 2, `Effect.fnUntraced(` 3 in `Walk.ts`; `pnpm lint` (inside check:pr) green. |

**Score:** 4/4 truths verified in code. No truth is behavior-dependent-without-test: the acted-`Unknown`-denies-both-polarities invariant and every deny sentence are pinned by passing tests (LeafVerdict.test.ts, LeafNeeds.test.ts).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/LeafNeeds.ts` | `LEAF_VERDICTS`, `isHeld`, outcome types, `actedRow` | VERIFIED | Substantive (rows delegate `HasAttribute`/`HasResourceAttribute` to `judgeMatcher`); imported and used by Walk.ts (9 call sites) and Predicate.ts (5); not in `index.ts`. |
| `packages/core/src/Walk.ts` | reads rows, owns sentences only | VERIFIED | Diff reviewed line by line; reason strings moved verbatim into denial tables; `Match` import dropped; no new switch or `fnUntraced`. |
| `packages/core/src/Predicate.ts` | folds `isHeld` of rows only | VERIFIED | `ActedResult`, `evaluateMatcher`, `holds*` imports gone. |
| `packages/core/test/LeafVerdict.test.ts` | characterisation of every leaf | VERIFIED | Present, green, committed on base before src change. |
| `packages/core/test/LeafNeeds.test.ts` / `.tst.ts` | record unit test (RED by import), type pins | VERIFIED | Additions only (114 / 33 lines). |
| ADR-QD-167, BEH-QD-606..610, INV-QD-353..354, CCR-QD-445 | records | VERIFIED | Each BEH/INV id is a heading exactly once; CCR-QD-445 row present (README line 382); `spec:verify:strict` PASS 21 FAIL 0; `spec-revise --check` passes. |
| `.changeset/leaf-verdict-stated-once.md` | `@qadi/core` patch only | VERIFIED | Only changeset added since base; no Breaking entry. |
| `54-mutation-base.json`, `-after.json`, `-static.json`, `54-bench-*.json` | evidence | VERIFIED (static one flagged, see below) | Base JSON added once in `77d723ca`, never edited after. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `Walk.ts` `evaluateActed` / each leaf arm | `LEAF_VERDICTS` | direct call then `isHeld` | WIRED |
| `Predicate.ts` `run` `AskActed` / role / permission / action / attribute | `LEAF_VERDICTS`, `isHeld` | direct call | WIRED |
| `LEAF_VERDICTS.HasAttribute` / `HasResourceAttribute` | `Matcher.ts` `judgeMatcher` | delegation (D-04, no second copy) | WIRED |

### Data-Flow Trace (Level 4)

Port answers (`askActed`, `askRelationship`, `askCustom`, `askSignature`, `readAttribute`) flow into the rows and from there into allow/deny; verified by LeafVerdict.test.ts driving scripted ports. No static or hollow data path found.

### Behavioral Spot-Checks and Gates (run by this verifier)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Five characterisation and unit suites | `pnpm exec vitest run --project core <5 files> < /dev/null` | 367/367 pass | PASS |
| VERD-01 check (54-01 plan, line 186) | `node -e ...` | exit 0 | PASS |
| VERD-02 check (54-01 plan, line 192) | `node -e ...` | exit 0 | PASS |
| WX-01: full gate | `pnpm check:pr < /dev/null` (alone, nothing concurrent) | exit 0, 16 of 17 steps (mutation skipped by design); coverage All files 99.59/98.33/99.51/99.82, `core/src` 99.49/97.99/99.61/99.89; spec:verify:strict 21/21; spec:api 935 exports (unchanged); website, examples, spec:publish green | PASS |
| `spec:api` export count unchanged | `pnpm spec:api` | 935 exports across 9 packages | PASS |

### Probe Execution

No probe-based verification declared. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| VERD-01 | 54-03, 54-08 | acted polarity + verdict rule written once | SATISFIED | Truth 1; REQUIREMENTS.md `[x]` and table row "Complete" |
| VERD-02 | 54-03, 54-04, 54-08 | every leaf's step in one place | SATISFIED | Truth 2; "Complete" |
| VERD-03 | 54-02, 54-03, 54-04, 54-08 | per-leaf verdict table test | SATISFIED | Truth 3; "Complete" |
| VERD-04 | 54-06, 54-08 | ADR-QD-167 extends ADR-163, budgets unchanged | SATISFIED | Truth 4; "Complete" |
| WX-01 | 54-08 | `check:pr` green | CONTRIBUTED, phase part met | check:pr exit 0 (above). Row stays Pending by project rule. |
| WX-02 | 54-01, 54-06, 54-07, 54-08 | records use reserved numbers only | CONTRIBUTED, phase part met | All reserved ids used once, spec gates green, no `NEXT` placeholder found, `next-id` not evidenced as run. Stays Pending. |
| WX-03 | 54-03, 54-07 | overview names every export | CONTRIBUTED, phase part met | No export added; `spec:api` 935 unchanged; `index.ts` untouched. Stays Pending. |
| WX-04 | 54-08 | no forbidden construct, budgets unchanged | CONTRIBUTED, phase part met | Added-lines scan over `packages/*/src` and `packages/*/test` found no `as`/`any`/`!`/`switch`/`fnUntraced`/async/console/env/clock hit; scripts and AGENTS.md no diff; lint green. Stays Pending. |
| WX-05 | 54-01, 54-05 | coverage holds; Stryker score of touched files does not fall | CONTRIBUTED; coverage half met, mutation half PASSES ONLY UNDER THE REFINED RULE | Coverage thresholds hold (core 99.49 vs 95). Mutation: see below and Human Verification. Stays Pending. |
| WX-06 | 54-01, 54-02, 54-08 | characterisation precedes behaviour change | CONTRIBUTED, phase part met | Git order: chore(54-01) < test(54-02) x2 < test(54-03) RED < refactor(54-03) < refactor(54-04) x2. Stays Pending. |
| WX-07 | 54-07, 54-08 | Breaking recorded; nothing released | CONTRIBUTED, phase part met | One patch changeset, no Breaking, no upgrading.md edit, branch `arch-wave-11`, only `.planning/config.json` modified (pre-existing, unstaged). Stays Pending. |

Orphaned requirements: none. All 11 ids in the roadmap's Phase 54 line appear in plan frontmatter.

### D-10 / WX-05 mutation assessment (honest reading)

`node .planning/phases/QD-54-.../54-mutation.mjs compare .planning/phases/QD-54-.../54-mutation-static.json` run from the repo root: exit 0, prints `WX-05 holds (D-10)`.

| File | Base | After | Survivors |
|------|------|-------|-----------|
| LeafNeeds.ts | 0.98113 (52/53) | 0.98734 (78/79) | same one |
| Predicate.ts | 1 (293/293) | 1 (284/284) | none |
| Walk.ts | 0.94805 (292/308) | 0.94624 (264/279) | one fewer (the targeted `HasCustom` allow-tag survivor) |

- Under the rule as first committed, it fails: `LeafNeeds.ts` gained 26 detected mutants against 28 that left `Walk.ts`. Walk.ts's score fell (0.0018) even though its survivor set only shrank.
- The shortfall is not weak tests. Stryker's `ignoreStatic` classifies mutants in module-scope tables as Ignored, and the move created many (LeafNeeds.ts ignored 7 to 23, Walk.ts 16 to 27, Predicate.ts 22 to 22). The evidence file `54-mutation-static.json` (an `ignoreStatic:false` run) shows every one of the 72 after-run ignored mutants Killed, matched on mutator, line, column and replacement.
- Independent check this verifier made: the credit the script applies is 27 (all three files' ignored delta), and 11 of those sit in Walk.ts's new denial tables, not in LeafNeeds.ts. Counting only the 16 in LeafNeeds.ts, `26 + 16 = 42 >= 28` still holds, so the pass does not depend on the broader credit.
- Why a human should still look: `54-mutation.mjs` was edited (0c917fdf) after the base commit although 54-05's own prohibition says MUST NOT edit it, and the edit relaxes the pass condition after a failure was seen. It is gated (no credit without the committed evidence and a full match; base JSON, `KILLED` and `stryker.config.mjs` untouched, verified) and is disclosed in 54-05-SUMMARY, ADR-QD-167, CCR-QD-445 and 54-SECURITY.md Accepted Risks as "open to user review". The mutation evidence is also less independently re-checkable than a pure test-kill, because the evidence JSON is a point-in-time `ignoreStatic:false` run that this verifier did not (and was told not to) re-run. The static evidence JSON was committed before the after-run commit; the line/column match with zero unmatched shows the trees agree.
- My judgement: the substance (every touched mutant is killed, no survivor gained) holds. Whether to accept a post-hoc comparator change as satisfying WX-05 is the user's decision.

### Anti-Patterns Found

None in the phase's added lines (checked `TBD/FIXME/XXX/TODO` debt markers via the added-lines scan, no `as`, `!`, `any`, `switch`, `fnUntraced`, async, ambient console/env/clock). Code review (54-REVIEW.md): 0 critical, 0 warning, 1 info (IN-01, line width, skipped; AGENTS.md section 17 keeps formatting out of the gate), disposition `open: 0`.

### Bench (informational, gates nothing)

p50 after/base ratios 1.02x to 1.09x on the five `Evaluate.bench.ts` workloads, as recorded in ADR-QD-167 `## Bench`. Not re-measured here.

### Prohibitions

Judgement/test-tier checks run: no commit to `scripts/`, `AGENTS.md`, budgets, `stryker.config.mjs` (clean); no existing test edited (clean); no export added (clean); no `NEXT` placeholder ids (clean); nothing pushed or released from this verifier's view (branch `arch-wave-11`, nothing staged). Flagged: 54-05's "MUST NOT edit 54-mutation.mjs" was breached by the orchestrator-authorised 0c917fdf. Not silently absorbed, routed to Human Verification.

### Human Verification Required

1. **Accept or reject the D-10 refinement**
   **Test:** Read commit 0c917fdf's change to `54-mutation.mjs` `compare` (static-credit block) and the recorded ruling in 54-05-SUMMARY.md, ADR-QD-167 `## Mutation`, CCR-QD-445 and 54-SECURITY.md Accepted Risks.
   **Expected:** You accept that crediting ignored static mutants proven Killed by `54-mutation-static.json` meets WX-05/D-10, or ask for a different closure.
   **Why human:** It changed the comparator after seeing the shortfall, against the plan's own prohibition, on the orchestrator's authority alone.

### Gaps Summary

No gaps. All four roadmap success criteria, all VERD requirements and this phase's contribution to WX-01..07 are verified against the code and by a clean `pnpm check:pr`. The only open item is the user's review of the D-10 comparator refinement.

---

_Verified: 2026-11-18_
_Verifier: Claude (gsd-verifier)_
