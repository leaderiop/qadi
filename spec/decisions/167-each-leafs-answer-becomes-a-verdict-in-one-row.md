# ADR-QD-167 — Each leaf's answer becomes a verdict in one row

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-167                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-18                                     |
> | Status         | Accepted — extends ADR-QD-163; keeps ADR-QD-020, ADR-QD-024 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-18): Static-ignored credit (D-10 refinement) accepted by the project owner at human verification (CCR-QD-445)<br>1.0 (2026-11-18): Initial release (ARCH-101, CCR-QD-445) |

---

## Context

[ADR-QD-163](./163-what-a-leaf-needs-from-the-request-is-stated-once.md) put what a leaf needs from the request in
`packages/core/src/LeafNeeds.ts`, and with it the port-free judgements (`holdsRole`, `holdsPermission`, `holdsAction`).
It left the next step where it was: each interpreter turned a leaf's answer into a verdict itself. The acted leaf showed
the cost. Its polarity map (`HasActed` wants `"Acted"`, `HasNotActed` wants `"NotActed"`) and its comparison (`answer ===
wanted`) were each written twice, once in `Walk.ts` and once in `Predicate.ts`. [ADR-QD-020](./020-decision-history-port.md)
rests on that comparison: `"Unknown"` is neither wanted answer, so both polarities deny under an unwired port. A rule
that load-bearing, written twice, is two places where a change can make `evaluate` deny what `toPredicate` admits, the
disagreement [INV-QD-018](../invariants.md#inv-qd-018-a-predicate-admits-exactly-the-rows-the-evaluator-allows) forbids.

## Decision

`LeafNeeds.ts` holds one closed verdict row per leaf tag, beside the judgements ADR-QD-163 placed there.

- **`LEAF_VERDICTS`** is a record keyed by every leaf tag, typed through `LeafVerdictOf`. A tag with no row, or an extra
  row, is a compile error, the same discipline `LEAF_NEEDS` has. A row takes what its verdict reads (the leaf when the
  verdict reads the leaf's fields, the port's answer when it reads only that) and returns a closed outcome.
- **The outcomes, per leaf.** `HasRole`, `HasPermission`, `HasAction` and `HasCustom` give `Held` or `NotHeld`. The two
  attribute leaves return the matcher's `Verdict` unchanged, through `judgeMatcher`; comparison meaning stays with
  [ADR-QD-091](./091-comparison-semantics-have-one-owner.md) and the operand read with
  [ADR-QD-166](./166-one-module-owns-the-value-a-leaf-compares.md). `HasRelationship` gives `Held`, `Unrelated` or
  `Unknown`. The acted leaves give `Held`, `Unknown`, `Performed` or `NotPerformed`. `HasSignature` gives `Held`,
  `NoneOnFile` or `NoneMatching`.
- **`actedRow`** builds both acted rows, so the wanted answer and the `Unknown` branch are written once:
  `HasActed: actedRow("Acted", "NotPerformed")` and `HasNotActed: actedRow("NotActed", "Performed")`. `Unknown` is
  neither wanted answer, so both polarities deny ([INV-QD-354](../invariants.md#inv-qd-354-an-acted-unknown-denies-both-polarities-stated-once)).
- **`isHeld`** is the one test of an outcome the two interpreters share: `Held`, and nothing else.
- **The walk** keeps its sentences and chooses one by the outcome's kind, from `ACTED_DENIAL`, `RELATIONSHIP_DENIAL`,
  `SIGNATURE_DENIAL` and `DENIAL_TEXT`. Every sentence is byte-identical to the base. It no longer decides held or not
  held itself.
- **`toPredicate`** keeps planning and constant folding. Its `AskActed` plan carries the leaf, not a wanted answer, and
  folds a leaf `True` exactly when `isHeld` holds for its row's outcome.
- **Rows allocate nothing.** Outcomes are string literals, so the evaluation path gains no object per leaf, and
  `actedRow` runs twice, at module load.
- **The two walks stay two** (ADR-QD-024). Both read the same row, and neither reads a port answer on its own account.
  A row is the shared fact, not a shared interpreter.

The record is the third table of its kind in this module, after `LEAF_NEEDS` and the judgements; every one is read
through [INV-QD-353](../invariants.md#inv-qd-353-each-leafs-answer-becomes-a-verdict-in-exactly-one-row-which-both-interpreters-read).

## Alternatives rejected

- **A sibling module.** ADR-QD-163 placed the leaf's judgements in `LeafNeeds.ts` and a row is the next step of the same
  judgement; a second file would split one leaf's facts across two.
- **A widened answer type, or `Record<string, unknown>` rows.** Each leaf's answer has its own type (membership, an
  `ActedResult`, a `RelatedResult`, a `Verdict`, a signature's `{ matched, onFile }`). Widening them to one row type
  would need an `as` at every row to narrow it again, and a missing case would compile. The record is typed per tag.
- **The walk keeping its own held test.** That is the duplicate this record removes; the walk would keep a comparison
  the translator also writes.
- **An `Opposite` outcome carrying the answer that came back.** It would allocate an object per acted evaluation on a
  per-leaf path. `Performed` and `NotPerformed` are two literals and say the same thing.

## Mutation

Measured with Stryker over the three files the move touched, on the phase base and on the final tree
(`node .planning/phases/QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict/54-mutation.mjs`, the committed
`54-mutation-base.json` and `54-mutation-after.json`). Scores are the unrounded stored values; "detected" is killed plus
timeout, "scored" is detected plus survived plus no-coverage.

| File | Base score (detected/scored) | After score (detected/scored) | Survivors |
| ---- | ---------------------------- | ----------------------------- | --------- |
| `packages/core/src/LeafNeeds.ts` | 0.9811320754716981 (52/53) | 0.9873417721518988 (78/79) | the same one |
| `packages/core/src/Predicate.ts` | 1 (293/293) | 1 (284/284) | none |
| `packages/core/src/Walk.ts` | 0.948051948051948 (292/308) | 0.946236559139785 (264/279) | one fewer |

`LeafNeeds.ts` gained 26 detected mutants: the verdict rows and `actedRow`, killed by `LeafVerdict.test.ts` and
`LeafNeeds.test.ts`. Its one survivor is the base's: `ConditionalExpression | Survived | true | LEAF_NEEDS[leaf._tag].own
=== "Action"` in `isActionLeaf`, equivalent because that predicate is true wherever it is evaluated (ADR-QD-163). `Walk.ts`
lost the `HasCustom` allow-tag survivor (`StringLiteral | Survived | "" | "HasCustom"`, which no longer survives) and kept
the other 15 (the `depth - 1 | depth + 1` mutants, `depth > maxDepth`, the two `concurrency` spreads and the three
uncovered literals). No file gained a survivor. The three files together detect 626 mutants after, against 637 on the
base; of the 11 net, 9 are `Predicate.ts` detections that went when the two interpreters' duplicate verdict steps became
one, which D-10 does not count because its score stayed at 1.

D-10's comparison held: `node 54-mutation.mjs compare 54-mutation-static.json` prints `WX-05 holds (D-10)`
(`gained 26 + static 27 = 53 >= left 28`). It held under the refinement the next section records, not under the rule as
first committed.

### The static-ignored credit (refinement of D-10, accepted)

This section records a ruling made during execution as an orchestrator-authorised refinement of D-10. The project owner
reviewed and accepted it on 2026-11-18 at the phase's human verification; it is not a re-baseline.

D-10 reads: a touched file whose score drops passes only when its survivor set is unchanged and the drop is exactly the
killed mutants that moved into `LeafNeeds.ts`, where they are still killed. Applied as written, the first `compare` failed:

```
LeafNeeds.ts detects 52 -> 78 (+26); detected mutants that left the fallen files: 28
LeafNeeds.ts gained 26 detected mutants, fewer than the 28 that left the fallen files
```

The shortfall was 26 against 28. No survivor was added, and `LeafNeeds.ts` had only its one equivalent survivor, so no
test could close it. The cause was classification. Stryker's `ignoreStatic` (on in `stryker.config.mjs`) ignores
mutants in sites that run once at module load, and the module-scope denial tables in `Walk.ts` and the verdict rows in
`LeafNeeds.ts` are such sites. Their mutants are neither scored nor killed. The sentences that were scored and killed
inside `Walk.ts`'s old inline ternaries became ignored mutants in the tables. The ignored counts rose: `Walk.ts` from 16
to 27 (+11), `LeafNeeds.ts` from 7 to 23 (+16), `Predicate.ts` unchanged at 22, which is 27 more in the three files
(45 to 72). That is a reclassification, not a lost detection.

The ruling was "prove, then credit":

- An evidence-only run used the repo's config with `ignoreStatic: false` and different reporters (`stryker.config.mjs`
  itself was not edited), over the identical `--mutate` list on the same tree. It killed every mutant the gate run
  marked Ignored: `LeafNeeds.ts` 23 of 23, `Predicate.ts` 22 of 22, `Walk.ts` 27 of 27, 72 in all. The same 15 `Walk.ts`
  survivors and the one `LeafNeeds.ts` survivor appear in both runs.
- `54-mutation.mjs`'s `compare` takes an optional evidence file (`54-mutation-static.json`, one entry per mutant: mutator,
  line, column, replacement, status). It credits `static`, the rise in ignored mutants across the three files, only when
  every after-run Ignored mutant is Killed in that evidence, matched by mutator, line, column and replacement. Otherwise
  it grants nothing and exits 1. The check becomes `gained + static >= left`. Run without the evidence path it fails by
  design.
- `stryker.config.mjs` and `54-mutation-base.json` were untouched, and the survivor-set check is unchanged.

The edit lifted the earlier prohibition on changing `54-mutation.mjs`, for this one change only, committed as `0c917fdf`
before the after run. The rule is narrower than a re-baseline: it admits no new survivor and counts only mutants a run
proves killed.

## Bench

Information only; it gates nothing (the roadmap gates Phase 59). One run per side of `Evaluate.bench.ts`, load similar on
both, kept as `54-bench-base.json` and `54-bench-after.json`. p50 in nanoseconds:

| Workload | p50 base | p50 after | Ratio |
| -------- | -------- | --------- | ----- |
| one node | 5542 | 5791 | 1.04x |
| wide, `allOf` of 8 | 7334 | 7666 | 1.05x |
| matcher-heavy, 3 refs | 10583 | 11542 | 1.09x |
| leaf-heavy, `allOf` of 8, matchers reference action and resource | 8958 | 9250 | 1.03x |
| leaf-heavy, `allOf` of 8, matchers reference neither | 9083 | 9291 | 1.02x |

Every ratio is 1.02x to 1.09x. One run per side shows no cause, so none is claimed.

## Consequences

- **A new leaf needs a verdict row as well as a needs row.** A leaf added to `LeafPolicy` with no row in `LEAF_VERDICTS`
  is a compile error, an extra row is one, and an outcome the walk's sentence tables do not name is one
  ([INV-QD-353](../invariants.md#inv-qd-353-each-leafs-answer-becomes-a-verdict-in-exactly-one-row-which-both-interpreters-read)).
- **The two interpreters cannot disagree about whether a leaf holds.** They read one row, and `isHeld` is the one test of
  its outcome, so an `Unknown` acted answer denies both polarities in both.
- **No behaviour moved.** Every deny reason is byte-identical, pinned by `packages/core/test/LeafVerdict.test.ts`, which
  was green on the base before the move. No export was added or removed, so `spec/overview.md` is unchanged. The changeset
  is a `@qadi/core` patch.
- **`SWITCH_BUDGET` and `UNTRACED_BUDGET` are unchanged.** The `evaluateNode` switch, `Matcher.ts`'s `judgeMatcher` and
  `resolveRef` switches, and `Walk.ts`'s three `Effect.fnUntraced` functions did not move, and AGENTS.md cites no location
  that moved. `scripts/check-house-style.mjs` and AGENTS.md have no diff since the phase base.
- **Enforcement.** [BEH-QD-606](../behaviors/05-evaluator.md), [BEH-QD-607](../behaviors/12-history.md),
  [BEH-QD-608](../behaviors/16-predicates.md), [BEH-QD-609](../behaviors/06-services.md) and
  [BEH-QD-610](../behaviors/04-matchers.md) state it; `LeafVerdict.test.ts` and `LeafNeeds.test.ts` pin it.

Reads and keeps: [ADR-QD-020](./020-decision-history-port.md), [ADR-QD-024](./024-predicate-output.md),
[ADR-QD-091](./091-comparison-semantics-have-one-owner.md), [ADR-QD-163](./163-what-a-leaf-needs-from-the-request-is-stated-once.md),
[ADR-QD-166](./166-one-module-owns-the-value-a-leaf-compares.md), ARCH-101, CCR-QD-445.
