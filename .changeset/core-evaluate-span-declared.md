---
"@qadi/core": minor
---

**Breaking.** The outcome of the `qadi.evaluate` span is now the key `qadi.outcome`, with the values `Allow`, `Deny` and `Failed` on every path that ends in a decision or a typed failure; `qadi.decision` is removed. An interrupted or defected evaluation carries its question and no outcome, and the span's status says why. Nothing is written under both keys, so a tracer query on `qadi.decision` moves to `qadi.outcome`.

A failed `qadi.evaluate` span now carries its question, `qadi.subject_id`, `qadi.evaluation_id`, `qadi.policy_tag` and `qadi.action` when supplied, beside `qadi.outcome` and `qadi.error_tag`, where it used to carry only those two, so a query by subject or by evaluation id sees failed evaluations too. The other spans of the family carry their questions as well: `qadi.toPredicate` the subject, the policy tag and the action when supplied, and `qadi.error_tag` when the translation fails; `qadi.guardHealthCheck` the subject, the policy tag and the action when supplied; `qadi.decideSubjects` and `qadi.decideSubjectsStream` the policy tag and `qadi.action` when supplied.

Each evaluation annotates its span twice, the question and then the answer, and the benchmark records the cost.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
