---
title: Advanced Policy Features
description: A tour of the policy tree's long tail — obligations, rule tables, security labels, subject-set queries, explanation, and the decision cache.
---

Past the six fundamentals, `@qadi/core` carries a handful of features each
solving one recurring authorization problem. This page is a tour, not a
reference — see [`spec/overview.md`](https://github.com/leaderiop/qadi/blob/main/spec/overview.md#policy)
for the full signatures.

## Obligations

An obligation is a condition *on* a permission, not a restriction of what it
returns — "permit, provided the access is logged," or a step-up
re-authentication before a sensitive write. `obliged` attaches one to a
policy; it only ever reaches the decision when that policy allows, since a
denial permits nothing to condition. Enforcement (`enforce`, `assert`,
`enforceProjected`, `filter`) refuses to run the guarded work when an `Allow`
carries a binding obligation nobody discharged — it fails with
`UndischargedObligation` instead.

```ts
const mayPublish = obliged(obligation("audit.log"), hasRole("editor"));
```

## Rule tables

`rules` composes `Rule`s — each a condition paired with an effect,
`permitWhen` or `denyWhen` — into a policy where exactly one row decides. This
is the shape an operator ports out of a firewall or an API gateway: rows are
addable without touching the rest, and an explicit deny doesn't have to be
hoisted into a negated guard clause ahead of every permit. Three combining
algorithms decide which row wins: `FirstApplicable` (the default), and the
override algorithms `DenyOverrides`/`PermitOverrides`, which forfeit
short-circuiting in one direction to make sure nothing was missed.

```ts
const table = rules([denyWhen(hasAttribute("status", eq(literal("suspended")))),
  permitWhen(hasRole("editor"))], { combining: "DenyOverrides" });
```

## Security labels

`SecurityLabel` (`{ level, compartments }`) and `dominates` implement a
Bell–LaPadula-style lattice for mandatory access control — "no read up, no
write down" as one comparison with the operands swapped, rather than two
negations. `join`/`meet` compute the least-upper/greatest-lower bound of two
labels for a caller that needs to classify a *derived* object; neither
function is ever called by the evaluator itself, since computing a label is
not the same act as deciding an access.

```ts
const noReadUp = hasAttribute("clearance", dominates(resource("label")));
```

## Subject sets

`decideSubjects`/`filterSubjects` are the transpose of `filter`: instead of
running one policy across many resources for one subject, they run one policy
across many *subjects* for one resource — "who can see this?", the question
an access review or a leak investigation asks. Neither requires
`CurrentSubject`; each subject in the list is evaluated as itself, and results
preserve input order without deduplicating.

```ts
const whoCanRead = filterSubjects(canRead, staff, { resource: { id: "doc-1" } });
```

## Explanation

`explain` turns a `Policy` into a structured `Explanation` tree with no
subject or services involved — it describes what a rule requires of *anyone*,
which is safe to render on a screen listing policies the viewer may not
satisfy. `renderTrace` is its counterpart on the decision side: it renders
what actually happened to one subject, from the `Trace` a `Decision` carries.

```ts
const sentence = renderExplanation(explain(mayPublish));
```

## Decision cache

`decisionCacheLayer` is the optional performance layer described in
[Wiring Services & Resolvers](/docs/packages/core/services/#optional-services):
it caches the `Trace` of repeated evaluations within a scope you choose,
without ever letting a cache hit change what got decided.

```ts
const cached = evaluate(canEdit).pipe(Effect.provide(decisionCacheLayer({ capacity: 500 })));
```
