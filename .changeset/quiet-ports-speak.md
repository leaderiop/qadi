---
"@qadi/core": minor
"@qadi/testing": minor
---

An unwired port now names its own absence.

**Breaking.** `RelationshipResolverShape.check` returns `RelatedResult` instead
of `boolean`:

```ts
export type RelatedResult = "Related" | "Unrelated" | "Unknown";
```

Every resolver implementation must change, and so must any `if (yield*
RelationshipResolver.check(...))`. All packages are 0.x, so this rides a `minor`.

The reason: evaluated with nothing wired, `hasRelationship("owner")` denied with

> `subject 'u1' has no 'owner' relation to 'doc-1'`

which is a claim about the contents of a graph that had never been connected. A
boolean cannot tell the evaluator "the store says no" from "there is no store",
so an unwired resolver sent readers to audit their edges when the fix was in
their layer wiring — and the unwired state is the one every ReBAC integration
starts in. It now denies with

> `no relationship resolver is wired, so no 'owner' relation to 'doc-1' can be confirmed`

**The verdicts do not move.** Both new arms deny exactly where the boolean
denied; `RelationshipResolverNever` keeps its name and every default still fails
closed. What changes is the sentence.

A three-value union rather than `boolean | "Unknown"`, and *because* the union
breaks. The widening would have kept every implementation assignable and every
truthiness test compiling while `"Unknown"` is truthy — an unwired port silently
reading as *related*. A compile error is the right failure mode for that.

Also here: `HasAttribute` and `HasResourceAttribute` distinguish an absent
attribute from one that compared wrong — `subject attribute 'level' has no
value` rather than `did not match`. Nothing was false before; the diagnosis was
withheld, and a misconfigured `AttributeResolver` produces the absent case
exclusively.

`@qadi/testing`'s `edgeRelationshipResolver` answers `"Related"`/`"Unrelated"`,
since a fixture edge list is the store and knows.

See ADR-QD-040, BEH-QD-045, INV-QD-029.
