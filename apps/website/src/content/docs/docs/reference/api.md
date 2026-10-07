---
title: API Reference
description: A short map of @qadi/core's public API surface, mirroring the section headers of the full specification and linking out to each one.
---

This page mirrors the section headers of
[`spec/overview.md`](https://github.com/leaderiop/qadi/blob/main/spec/overview.md)'s
"Public API surface" — the normative, exhaustive listing of every export
`@qadi/core` ships. Each section below names what lives there in plain
language; it is not a full export list, on purpose, since that is exactly
what the linked section already is.

## Tokens

The vocabulary a policy is written against before any evaluation happens:
`Permission` and `PermissionKey`, `Role` and role inheritance, `AuthSubject`,
and the branded `SubjectId`/`ResourceId` identity types. Building these is
usually the first thing an application does with Qadi.

[View on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#tokens)

## Policy

The policy ADT itself and everything used to build or inspect one:
combinators (`hasPermission`, `hasRole`, `hasAttribute`, `hasRelationship`,
`hasAction`, `hasActed`, `hasCustom`, `hasSignature`, `allOf`, `anyOf`,
`not`, and the rest), matchers (`eq`, `gte`, `someMatch`, …), security
labels, obligations, the ordered rule-table constructors, the JSON codec,
and the `explain`/`renderExplanation` pair that turns a policy tree into
English.

[View on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#policy)

## Evaluation and enforcement

`evaluate` itself, the `Decision` type (`Allow`/`Deny`) and its trace, and
the family of calls built on top of it — `decide`, `check`, `assert`,
`enforce`, `enforceProjected`, `filter`, `guard`, their streamed siblings,
and subject-set evaluation (`decideSubjects`, `filterSubjects`). This is
where the "reporting versus enforcing" split lives, and where `toPredicate`
turns a policy into a row filter for query-side authorization.

[View on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#evaluation-and-enforcement)

## Services

The `Context.Service` ports evaluation depends on — `CurrentSubject`,
`AttributeResolver`, `RelationshipResolver`, `DecisionHistory`,
`SignatureHistory`, `EvaluationId`, `CustomPredicate`, and the two optional
services, `DecisionCache` and `DecisionSink`. Every default here fails
closed. This section also covers the inspection helpers built on these
services, like `policyDepth`, `permissionProvenance`, and `diffTraces`, and
the stack-safe tree folds `foldPolicy`, `foldExplanation` and `foldMatcher`
that `policyDepth`, `simplify` and `explain` are built on, with `fieldsOf`,
`matcherDepth` and the derived `POLICY_TAGS` beside them. Use those array forms
for a fold that treats children alike (a count, a maximum, an "any"); a fold that
reads a child by position uses `foldPolicyCases`, `foldMatcherCases` or
`foldExplanationCases`, whose arms receive their children in the tag's own shape
(a `Not`'s one child as a value, a `Rules` row as a `{ rule, result }`), so a
missing arm is a compile error. `leafCases` and `leafMatcherCases` build the leaf
arms from one function. `foldTrace` is the same stack-safe walk over a `Trace` you
hold (an `AccessDenied`'s, say), `foldAligned` folds an `Explanation` and one
evaluation's trace together, position by position, and `tracePathKey` turns a
`TracePath` from `diffTraces` into the `"$.0.2"` address of the node it names.

[View on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#services)

## Errors

The typed error taxonomy — `AccessDenied`, `AttributeResolveError`,
`PolicyTooDeep`, `UndischargedObligation`, `SignatureHistoryUnavailable`,
and the rest — plus the two unions, `EvaluationError` and `QadiError`, and
the stable `ERROR_CODES` mapping. A broken dependency is always an error
here, never a denial.

[View on GitHub →](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#errors)

---

Every public package's own docs page also links to its matching section of
the full reference.
