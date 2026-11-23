# Phase 75 evidence: the evaluate span family

This file records what the contract of the evaluate family's spans did on the code before any source change. It names
the commit it ran on and the command, so a later reader can run it again. `phase_base` is c054c2b12fc46fa53fa78e0efa9ff98fd9d60314.

## The contract on the base

Base sha: `c054c2b12fc46fa53fa78e0efa9ff98fd9d60314` (no `packages/core/src` file differs from it).
Contract commit: `ecb0256f` (`packages/core/test/EvaluationSpan.contract.test.ts`, the only file of that commit).

Command, from the repository root, run three times one after the other:

```
pnpm exec vitest run --project core packages/core/test/EvaluationSpan.contract.test.ts --reporter=json --outputFile=<report>
```

| Run | Result |
| --- | ------ |
| 1 | 15 passed, 18 failed |
| 2 | 15 passed, 18 failed |
| 3 | 15 passed, 18 failed |

The 15 kept rows (K1 to K15) passed in each run, and the 18 changed rows (C1 to C18) failed in each run, each for the
reason its expected value states: the base writes `qadi.decision` where the contract names `qadi.outcome`, leaves the
question off a failed `qadi.evaluate` span and off every `qadi.toPredicate` failure, writes no subject or policy tag
on the probe span, and writes no action on the batch spans.

The 18 changed rows, each with the first line of its `failureMessages[0]` in run 1:

| Row | Title | First failure line |
| --- | ----- | ------------------ |
| C1 | an allow carries exactly its question and outcome Allow | `expected { 'qadi.decision': 'Allow', …(3) } to deeply equal { 'qadi.subject_id': 'u1', …(3) }` |
| C2 | a denial carries exactly its question and outcome Deny | `expected { 'qadi.decision': 'Deny', …(3) } to deeply equal { 'qadi.subject_id': 'u2', …(3) }` |
| C3 | a failed evaluation carries exactly its question, outcome Failed and error tag | `expected { 'qadi.outcome': 'Failed', …(1) } to deeply equal { 'qadi.subject_id': 'u3', …(4) }` |
| C4 | a failed evaluation with an action carries exactly its question and error tag | `expected { 'qadi.outcome': 'Failed', …(1) } to deeply equal { 'qadi.subject_id': 'u3', …(5) }` |
| C5 | an allow with an action carries exactly its question and outcome | `expected { 'qadi.decision': 'Allow', …(4) } to deeply equal { 'qadi.subject_id': 'u1', …(4) }` |
| C6 | an allow owing obligations carries exactly its question, outcome and ids | `expected { 'qadi.decision': 'Allow', …(4) } to deeply equal { 'qadi.subject_id': 'u4', …(4) }` |
| C7 | a cache hit carries exactly its question and outcome | `expected { 'qadi.decision': 'Allow', …(3) } to deeply equal { 'qadi.subject_id': 'u1', …(3) }` |
| C8 | a translation with an action carries exactly its question and predicate tag | `expected { 'qadi.subject_id': 'u9', …(2) } to deeply equal { 'qadi.subject_id': 'u9', …(3) }` |
| C9 | a policy too deep to translate carries exactly its question and PolicyTooDeep | `expected {} to deeply equal { 'qadi.subject_id': 'u9', …(2) }` |
| C10 | a fields restriction carries exactly its question and PolicyNotTranslatable | `expected {} to deeply equal { 'qadi.subject_id': 'u9', …(2) }` |
| C11 | an untranslatable node carries exactly its question and PolicyNotTranslatable | `expected {} to deeply equal { 'qadi.subject_id': 'u9', …(2) }` |
| C12 | a port failure in translation carries exactly its question and error tag | `expected {} to deeply equal { 'qadi.subject_id': 'u9', …(2) }` |
| C13 | a healthy probe carries exactly its question and qadi.healthy true | `expected { 'qadi.healthy': true } to deeply equal { 'qadi.subject_id': 'u5', …(2) }` |
| C14 | an unhealthy probe carries exactly its question, healthy false and error tag | `expected { 'qadi.healthy': false, …(1) } to deeply equal { 'qadi.subject_id': 'u5', …(3) }` |
| C15 | a probe with an action carries exactly its question and qadi.healthy | `expected { 'qadi.healthy': true } to deeply equal { 'qadi.subject_id': 'u5', …(3) }` |
| C16 | a batch with an action carries exactly its count, policy tag and action | `expected { 'qadi.subject_count': 2, …(1) } to deeply equal { 'qadi.subject_count': 2, …(2) }` |
| C17 | a streamed batch with an action carries exactly its policy tag and action | `expected { 'qadi.policy_tag': 'HasPermission' } to deeply equal { …(2) }` |
| C18 | each qadi.evaluate span in a batch carries exactly its question and outcome | `expected [ …(2) ] to deeply equal [ …(2) ]` |

### The regression

Row C3 is the regression: a failed `qadi.evaluate` span carries no `qadi.subject_id` and no `qadi.evaluation_id`, so a
trace cannot say which question failed. The report holds, for `a failed evaluation carries exactly its question, outcome
Failed and error tag`:

```
AssertionError: expected { 'qadi.outcome': 'Failed', …(1) } to deeply equal { 'qadi.subject_id': 'u3', …(4) }
```

The expected record is the whole record the contract names, and the received record is the two keys the base wrote:

```
expected: {
  'qadi.subject_id': 'u3',
  'qadi.evaluation_id': 'eval-1',
  'qadi.policy_tag': 'HasAttribute',
  'qadi.outcome': 'Failed',
  'qadi.error_tag': 'AttributeResolveError'
}
received: {
  'qadi.outcome': 'Failed',
  'qadi.error_tag': 'AttributeResolveError'
}
```

The received record has neither `qadi.subject_id` nor `qadi.evaluation_id`.

## Holding the contract

The contract file is never edited after its commit. Its changed rows turn green in the plans that change the source,
with no row touched, and its kept rows stay green throughout.

## Each evaluate span rule gutted once

Plan 75-03 on `81410a1d`. Each gut is an edit to `packages/core/src/Lifecycle.ts` on the working tree, the contract run
alone, and `git checkout -- packages/core/src/Lifecycle.ts` afterwards; neither gut is in any commit. Besides the rows
named below, rows C8 to C17 fail in both runs, as they do on `81410a1d` itself (the translation, probe and batch writers
change in later plans).

### question-after-lookup

The edit: the statement that annotates `evaluateSpan.question` moves from right after the evaluation id to just after the
lookup, so it runs on the success path only.

The command:

```
pnpm exec vitest run --project core packages/core/test/EvaluationSpan.contract.test.ts --reporter=json --outputFile=<S>/gut-question-after-lookup.json < /dev/null
```

The evaluate rows that fail, and no others:

- `a failed evaluation carries exactly its question, outcome Failed and error tag` (C3)
- `a failed evaluation with an action carries exactly its question and error tag` (C4)

First failure lines:

```
a failed evaluation carries exactly its question, outcome Failed and error tag
AssertionError: expected { 'qadi.outcome': 'Failed', …(1) } to deeply equal { 'qadi.subject_id': 'u3', …(4) }
a failed evaluation with an action carries exactly its question and error tag
AssertionError: expected { 'qadi.outcome': 'Failed', …(1) } to deeply equal { 'qadi.subject_id': 'u3', …(5) }
```

The allow, denial and cache rows pass: with the question written after the lookup a decided span still carries it, and
only a span that fails before the lookup returns loses it. That is the rule the gut pins.

### decision-key

The edit: `yield* Effect.annotateCurrentSpan({ "qadi.decision": decision._tag });` added right after the success answer,
so a decided span carries the old key beside the new one.

The command:

```
pnpm exec vitest run --project core packages/core/test/EvaluationSpan.contract.test.ts --reporter=json --outputFile=<S>/gut-decision-key.json < /dev/null
```

The evaluate rows that fail, and no others:

- `an allow carries exactly its question and outcome Allow` (C1)
- `a denial carries exactly its question and outcome Deny` (C2)
- `an allow with an action carries exactly its question and outcome` (C5)
- `an allow owing obligations carries exactly its question, outcome and ids` (C6)
- `a cache hit carries exactly its question and outcome` (C7)
- `each qadi.evaluate span in a batch carries exactly its question and outcome` (C18)

First failure lines:

```
an allow carries exactly its question and outcome Allow
AssertionError: expected { 'qadi.subject_id': 'u1', …(4) } to deeply equal { 'qadi.subject_id': 'u1', …(3) }
a denial carries exactly its question and outcome Deny
AssertionError: expected { 'qadi.subject_id': 'u2', …(4) } to deeply equal { 'qadi.subject_id': 'u2', …(3) }
an allow with an action carries exactly its question and outcome
AssertionError: expected { 'qadi.subject_id': 'u1', …(5) } to deeply equal { 'qadi.subject_id': 'u1', …(4) }
an allow owing obligations carries exactly its question, outcome and ids
AssertionError: expected { 'qadi.subject_id': 'u4', …(5) } to deeply equal { 'qadi.subject_id': 'u4', …(4) }
a cache hit carries exactly its question and outcome
AssertionError: expected { 'qadi.subject_id': 'u1', …(4) } to deeply equal { 'qadi.subject_id': 'u1', …(3) }
each qadi.evaluate span in a batch carries exactly its question and outcome
AssertionError: expected [ …(2) ] to deeply equal [ …(2) ]
```

Each received record holds one key more than the contract's, the old one.

## Each translation and probe rule and the outcome tie gutted once

Each gut edited one source file on the working tree, ran its check, and was reverted with `git checkout -- <file>`;
none was committed. They ran on `683ee88a` (`packages/core/test/EvaluationSpan.test.ts` and `EvaluationSpan.tst.ts` are
its two files). The contract runs used:

```
pnpm exec vitest run --project core packages/core/test/EvaluationSpan.contract.test.ts --reporter=json --outputFile=<S>/gut-<name>.json < /dev/null
```

### translation-failure

Edit: removed the `Effect.tapError` pipeable (and its comment) from the end of `toPredicate` in
`packages/core/src/Predicate.ts`, so a failure no longer annotates `qadi.error_tag`.

Command: the contract run above, `<S>/gut-translation-failure.json`. Exactly four rows failed and the other 29 passed:

- `a policy too deep to translate carries exactly its question and PolicyTooDeep` (C9)
- `a fields restriction carries exactly its question and PolicyNotTranslatable` (C10)
- `an untranslatable node carries exactly its question and PolicyNotTranslatable` (C11)
- `a port failure in translation carries exactly its question and error tag` (C12)

First failure line of each:

```
AssertionError: expected { 'qadi.subject_id': 'u9', …(1) } to deeply equal { 'qadi.subject_id': 'u9', …(2) }
```

### probe-question

Edit: removed the `yield* annotateSpan(guardHealthCheckSpan.question, …)` statement from `createGuardHealthCheck` in
`packages/core/src/GuardHealthCheck.ts`, so the probe span carries no question.

Command: the contract run above, `<S>/gut-probe-question.json`. Exactly three rows failed and the other 30 passed:

- `a healthy probe carries exactly its question and qadi.healthy true` (C13)
- `an unhealthy probe carries exactly its question, healthy false and error tag` (C14)
- `a probe with an action carries exactly its question and qadi.healthy` (C15)

First failure lines:

```
a healthy probe carries exactly its question and qadi.healthy true
AssertionError: expected { 'qadi.healthy': true } to deeply equal { 'qadi.subject_id': 'u5', …(2) }
an unhealthy probe carries exactly its question, healthy false and error tag
AssertionError: expected { 'qadi.healthy': false, …(1) } to deeply equal { 'qadi.subject_id': 'u5', …(3) }
a probe with an action carries exactly its question and qadi.healthy
AssertionError: expected { 'qadi.healthy': true } to deeply equal { 'qadi.subject_id': 'u5', …(3) }
```

### tie-extra

Edit: added `"Abstain"` to the `outcomes` list in `packages/core/src/EvaluationSpan.ts`, a fourth outcome literal that
`Decision["_tag"] | "Failed"` does not hold.

Commands: `pnpm typecheck < /dev/null > <S>/gut-tie-extra.typecheck.log 2>&1` exited non-zero (2), and
`pnpm test:tstyche < /dev/null > <S>/gut-tie-extra.tstyche.log 2>&1` exited non-zero (1).

```
packages/core/src/EvaluationSpan.ts(75,3): error TS2322: Type '"Abstain"' is not assignable to type 'SpanOutcome'.
```

```
Error: Type 'NonNullable<"Deny" | "Allow" | "Failed" | "Abstain" | undefined>' is not the same as type '"Deny" | "Allow" | "Failed"'.
  at ./packages/core/test/EvaluationSpan.tst.ts:28:54 ❭ the outcome is a decision tag or Failed
```

### tie-missing

Edit: removed `"Deny"` from the `outcomes` list in `packages/core/src/EvaluationSpan.ts`, so a decision the evaluator
can reach is no longer an outcome.

Commands: `pnpm typecheck < /dev/null > <S>/gut-tie-missing.typecheck.log 2>&1` exited non-zero (2), and
`pnpm test:tstyche < /dev/null > <S>/gut-tie-missing.tstyche.log 2>&1` exited non-zero (1).

```
packages/core/src/Lifecycle.ts(159,5): error TS2322: Type '"Allow" | "Deny"' is not assignable to type '"Allow" | "Failed" | undefined'.
```

```
Error: Type 'NonNullable<"Allow" | "Failed" | undefined>' is not the same as type '"Deny" | "Allow" | "Failed"'.
  at ./packages/core/test/EvaluationSpan.tst.ts:28:54 ❭ the outcome is a decision tag or Failed
```

## Each span-key check planted once

Each plant was applied to the working tree, `node scripts/check-house-style.mjs < /dev/null` was run with its output and exit status saved to `<S>/plant-<id>.log` and `<S>/plant-<id>.status`, and the file was restored with `git checkout -- <file>`; the tree under `packages`, `features`, `AGENTS.md` and `scripts` was empty between plants and no plant was committed. Each of M1 to M14 printed exactly one violation, the one named.

| Plant | File | Edit | Exit status | Rule line printed |
| ----- | ---- | ---- | ----------- | ----------------- |
| M1 | `packages/core/test/SubjectSet.test.ts` | append a const holding the double-quoted key qadi.outcome | 1 | `packages/core/test/SubjectSet.test.ts  [span-key-literal] 1 quoted span key literal(s) outside a test title.` |
| M2 | `packages/core/test/GuardHealthCheck.test.ts` | append a const holding the single-quoted key qadi.policy_tag | 1 | `packages/core/test/GuardHealthCheck.test.ts  [span-key-literal] 1 quoted span key literal(s) outside a test title.` |
| M3 | `packages/core/bench/Evaluate.bench.ts` | append a const holding the key qadi.error_tag in backticks | 1 | `packages/core/bench/Evaluate.bench.ts  [span-key-literal] 1 quoted span key literal(s) outside a test title.` |
| M4 | `packages/core/test/Evaluate.test.ts` | append a const holding the double-quoted key qadi.subject_id (13, budget 12) | 1 | `packages/core/test/Evaluate.test.ts  [span-key-literal] declares 12 quoted span key literal(s), found 13.` |
| M5 | `packages/core/test/PortAccess.test.ts` | rename the first qadi.subject_id key literal to qadi.subject (2, budget 3) | 1 | `packages/core/test/PortAccess.test.ts  [span-key-literal] declares 3 quoted span key literal(s), found 2.` |
| M6 | `packages/core/src/Lifecycle.ts` | append a const holding the double-quoted key qadi.outcome | 1 | `packages/core/src/Lifecycle.ts:213  [span-key-source] mentions the span key qadi.outcome; read it through EvaluationSpan.ts (ADR-QD-188).` |
| M7 | `packages/core/src/GuardHealthCheck.ts` | append a comment line that mentions qadi.healthy | 1 | `packages/core/src/GuardHealthCheck.ts:126  [span-key-source] mentions the span key qadi.healthy; read it through EvaluationSpan.ts (ADR-QD-188).` |
| M8 | `features/step-definitions/AccessThenSteps.ts` | append a const holding the double-quoted key qadi.action | 1 | `features/step-definitions/AccessThenSteps.ts:17  [span-key-source] mentions the span key qadi.action; read it through EvaluationSpan.ts (ADR-QD-188).` |
| M9 | `packages/react/src/QadiProvider.tsx` | append a const holding the double-quoted key qadi.reason | 1 | `packages/react/src/QadiProvider.tsx:323  [span-key-source] mentions the span key qadi.reason; read it through EvaluationSpan.ts (ADR-QD-188).` |
| M10 | `packages/core/src/EvaluationSpan.ts` | append a const holding the double-quoted key qadi.outcome (spelled twice) | 1 | `packages/core/src/EvaluationSpan.ts:101,218  [span-key-source] qadi.outcome is spelled more than once; a key is spelled once and every field reads it.` |
| M11 | `packages/core/src/EvaluationSpan.ts` | replace every qadi. prefix in quotes with qadx. (an emptied key set) | 1 | `packages/core/src/EvaluationSpan.ts  [span-key-source] the key set holds 1 key(s), fewer than SPAN_KEY_MIN (11); the declaration moved or was emptied, so no key is checked.` |
| M12 | `packages/core/src/EvaluationSpan.ts` | append a const holding the double-quoted shared key qadi.subject_id | 1 | `packages/core/src/EvaluationSpan.ts:218  [span-key-source] spells the shared key qadi.subject_id; read it from sharedQuestionKeys in packages/core/src/PortSpanEncode.ts.` |
| M13 | `AGENTS.md` | change the Evaluate.test.ts row count from 12 to 11 | 1 | `AGENTS.md  [span-key-literal-table] section 6 lists packages/core/test/Evaluate.test.ts (11), which SPAN_KEY_LITERAL_BUDGET does not match.` |
| M14 | `AGENTS.md` | delete the PortSpan.test.ts row | 1 | `AGENTS.md  [span-key-literal-table] packages/core/test/PortSpan.test.ts is in SPAN_KEY_LITERAL_BUDGET with no row in section 6's table.` |
| N1 | `packages/core/test/SubjectSet.test.ts` | append an empty describe block whose title is the key qadi.outcome | 0 | clean |
| N2 | `packages/core/test/SubjectSet.test.ts` | append a comment line holding the double-quoted key qadi.outcome | 0 | clean |
| N3 | `packages/core/test/SubjectSet.test.ts` | append a const holding the double-quoted port key qadi.attribute | 0 | clean |
| N4 | `packages/core/test/SubjectSet.test.ts` | append a const holding the double-quoted span name qadi.evaluate | 0 | clean |
| N5 | `packages/core/test/SubjectSet.test.ts` | append a const holding the double-quoted longer name qadi.actions | 0 | clean |

Every plant failed with its rule or passed as stated.

## Static mutants run by hand

`EvaluationSpan.ts` is module-scope declarations, so under `ignoreStatic: true` its close holds 0 valid mutants and 35
Ignored (static) ones (the Stryker score line reads `NaN`: nothing to score). `Predicate.ts` gained one static arrow in
this phase, the `tapError` callback of `toPredicate`'s span (line 698), which its base did not hold, so `compare` refused
it as `has a new Ignored mutant: ArrowFunction -> () => undefined` until it was run by hand. Both files were run in one
by-hand run, with `ignoreStatic: false`, by the group's own configuration spread, on the close head:

```
pnpm exec stryker run <S>/stryker.examined.mjs --mutate packages/core/src/EvaluationSpan.ts,packages/core/src/Predicate.ts < /dev/null
```

where `<S>/stryker.examined.mjs` is `import base from "<repo>/stryker.config.mjs"; export default { ...base, ignoreStatic:
false, jsonReporter: { fileName: "<S>/examined/mutation.json" }, htmlReporter: { fileName: "<S>/examined/index.html" } };`.
The run exited 0 with a final score of 100.00.

| File | Mutants | Killed | RuntimeError | Survived | NoCoverage | Timeout |
| ---- | ------- | ------ | ------------ | -------- | ---------- | ------- |
| `EvaluationSpan.ts` | 35 | 33 | 2 | 0 | 0 | 0 |
| `Predicate.ts` | 304 (282 valid and 22 Ignored) | 304 | 0 | 0 | 0 | 0 |

Counts by kind, which is what `EXAMINED` admits: `EvaluationSpan.ts` `ArrowFunction () => undefined` 2, `ObjectLiteral
{}` 21, `StringLiteral ""` 12; `Predicate.ts` `ArrowFunction () => undefined` 1 (its other 21 Ignored mutants are the
base's, line-shifted, and the scorer admits them by kind against the base).

Two of the 35 are not `Killed` but `RuntimeError`, and that is a finding and not a pass: line 48 (`declareSpan`'s arrow
replaced by `() => undefined`) and line 55 (`askedFields` replaced by `{}`) make the module throw `Cannot read properties
of undefined (reading 'name')` while it is imported, so Stryker reports `An error occurred outside of a test run` and
every test file that reached the module (44 are listed, `EvaluationSpan.contract.test.ts` and `EvaluationSpan.test.ts` among
them) fails to load. Stryker does not call a mutant that no test can even start under `Killed`, and does not score it.
It is detected by every test in the suite, which is the property `Killed` is meant to carry, so both are admitted by
`EXAMINED`; the plan's check that an admitted kind holds no status but `Killed` is run with that one reading, recorded as
a verification-only deviation in `75-07-SUMMARY.md`. No other status appears: 0 Survived, 0 NoCoverage, 0 Timeout.
Every row below is an Ignored mutant of the close record, joined to its by-hand status on line, column, mutator and
replacement.

### EvaluationSpan.ts

| Line | Column | Mutator | Replacement | Status by hand |
| ---- | ------ | ------- | ----------- | -------------- |
| 48 | 21 | ArrowFunction | `() => undefined` | RuntimeError |
| 55 | 21 | ObjectLiteral | `{}` | RuntimeError |
| 69 | 22 | ObjectLiteral | `{}` | Killed |
| 89 | 41 | ObjectLiteral | `{}` | Killed |
| 90 | 9 | StringLiteral | `""` | Killed |
| 92 | 5 | ObjectLiteral | `{}` | Killed |
| 93 | 5 | ObjectLiteral | `{}` | Killed |
| 93 | 35 | StringLiteral | `""` | Killed |
| 96 | 5 | ObjectLiteral | `{}` | Killed |
| 101 | 5 | ObjectLiteral | `{}` | Killed |
| 101 | 16 | StringLiteral | `""` | Killed |
| 101 | 60 | StringLiteral | `""` | Killed |
| 118 | 44 | ObjectLiteral | `{}` | Killed |
| 119 | 9 | StringLiteral | `""` | Killed |
| 122 | 5 | ObjectLiteral | `{}` | Killed |
| 123 | 5 | ObjectLiteral | `{}` | Killed |
| 123 | 21 | StringLiteral | `""` | Killed |
| 135 | 49 | ObjectLiteral | `{}` | Killed |
| 136 | 9 | StringLiteral | `""` | Killed |
| 139 | 5 | ObjectLiteral | `{}` | Killed |
| 140 | 5 | ObjectLiteral | `{}` | Killed |
| 140 | 16 | StringLiteral | `""` | Killed |
| 157 | 47 | ObjectLiteral | `{}` | Killed |
| 158 | 9 | StringLiteral | `""` | Killed |
| 160 | 5 | ObjectLiteral | `{}` | Killed |
| 165 | 5 | ObjectLiteral | `{}` | Killed |
| 166 | 21 | StringLiteral | `""` | Killed |
| 181 | 53 | ObjectLiteral | `{}` | Killed |
| 182 | 9 | StringLiteral | `""` | Killed |
| 184 | 5 | ObjectLiteral | `{}` | Killed |
| 185 | 5 | ObjectLiteral | `{}` | Killed |
| 197 | 3 | ObjectLiteral | `{}` | Killed |
| 202 | 3 | ObjectLiteral | `{}` | Killed |
| 205 | 13 | StringLiteral | `""` | Killed |
| 214 | 29 | ArrowFunction | `() => undefined` | Killed |

### Predicate.ts

| Line | Column | Mutator | Replacement | Status by hand |
| ---- | ------ | ------- | ----------- | -------------- |
| 82 | 25 | ObjectLiteral | `{}` | Killed |
| 82 | 33 | StringLiteral | `""` | Killed |
| 83 | 26 | ObjectLiteral | `{}` | Killed |
| 83 | 34 | StringLiteral | `""` | Killed |
| 85 | 18 | ArrowFunction | `() => undefined` | Killed |
| 163 | 24 | ObjectLiteral | `{}` | Killed |
| 164 | 11 | ArrowFunction | `() => undefined` | Killed |
| 165 | 12 | ArrowFunction | `() => undefined` | Killed |
| 166 | 14 | ArrowFunction | `() => undefined` | Killed |
| 167 | 15 | ArrowFunction | `() => undefined` | Killed |
| 168 | 10 | ArrowFunction | `() => undefined` | Killed |
| 169 | 9 | ArrowFunction | `() => undefined` | Killed |
| 170 | 13 | ArrowFunction | `() => undefined` | Killed |
| 174 | 34 | ArrowFunction | `() => undefined` | Killed |
| 203 | 24 | ArrowFunction | `() => undefined` | Killed |
| 220 | 21 | ArrowFunction | `() => undefined` | Killed |
| 268 | 16 | ArrowFunction | `() => undefined` | Killed |
| 282 | 25 | ArrowFunction | `() => undefined` | Killed |
| 338 | 17 | ArrowFunction | `() => undefined` | Killed |
| 340 | 17 | ArrowFunction | `() => undefined` | Killed |
| 576 | 13 | ArrowFunction | `() => undefined` | Killed |
| 698 | 19 | ArrowFunction | `() => undefined` | Killed |
