---
title: "@qadi/core"
description: Tokens, the policy ADT, matchers, the evaluator, and every enforcement call — the foundation the rest of Qadi is built on.
---

`@qadi/core` is Qadi itself: everything else in this documentation — `@qadi/react`,
`@qadi/http`, `@qadi/audit`, the predicate compilers — is a layer built on top
of what this package exports, and nothing in those packages re-implements
evaluation or enforcement.

Inside it:

- **Tokens** — `Permission`, `Role`, `AuthSubject`, the identity brands
  (`SubjectId`, `ResourceId`).
- **The policy ADT** — `Policy`, the schema-derived recursive union every rule
  is built from, and the matcher language (`Matcher`, `ValueRef`) that its
  leaves compare against.
- **The evaluator** — `evaluate`, which turns a `Policy` plus a subject,
  resource and action into a `Decision` carrying a full `Trace`.
- **Enforcement** — every call that acts on a decision: `decide`, `check`,
  `assert`, `enforce`, `enforceProjected`, `filter`, `guard`, and their
  streamed siblings.

This overview assumes you already know — or are about to learn — the six
fundamentals: [tokens & permissions](/docs/concepts/tokens-permissions/),
[roles](/docs/concepts/roles/), [the policy ADT](/docs/concepts/policy-adt/),
[matchers](/docs/concepts/matchers/), [evaluation](/docs/concepts/evaluation/),
and [enforcement](/docs/concepts/enforcement/). Those live in **Concepts**,
not here, because they are not specific to this package's internals — they
are the vocabulary the whole library, and this documentation, is written in.

What *is* specific to `@qadi/core`, and covered in this section:

- [Wiring Services & Resolvers](/docs/packages/core/services/) — the port
  architecture the evaluator depends on: `AttributeResolver`,
  `RelationshipResolver`, `DecisionHistory`, `EvaluationId`, `CurrentSubject`,
  and the optional `DecisionCache`/`DecisionSink`.
- [Advanced Policy Features](/docs/packages/core/advanced/) — obligations,
  rule tables, security labels, subject-set (reverse) queries, explanation,
  and the decision cache.

For the exhaustive, generated list of every export this package ships, see
[`spec/overview.md`](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#tokens)
— that document, not this page, is normative.
