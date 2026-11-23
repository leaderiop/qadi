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
