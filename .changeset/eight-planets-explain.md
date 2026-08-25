---
"@qadi/core": minor
---

Field-visibility specs may now be dot-paths, with `*`/`**` wildcards.

`FieldOptions.fields` stays `ReadonlyArray<string>` — no schema change, no
new export from `@qadi/core`'s barrel. A spec's terminal segment may now be
a literal name (unbounded, as today), `**` (unbounded, explicit), or `*`
(exactly one level: an object-valued child is present but empty, never
omitted, never shown whole):

```ts
hasPermission(readDoc, { fields: ["id", "author.name", "contact.*"] });
```

Every existing `fields: [...]` array is byte-for-byte behaviorally
identical after this change: a bare literal is containment-equivalent to
that key's own `.**`, which is the whole backward-compatibility argument
for this feature — not just a claim, but a structural property of
`compareFieldPaths`.

`intersectFields` gained a real algorithm fix alongside this: the previous
exact-string-set comparison would have silently denied a field an unbounded
ancestor spec already covered (`["address.**"]` vs. `["address.street"]`).
It now compares specs pairwise by containment, and — deliberately — treats
a `*`-bounded spec against a spec at a different depth as `Incomparable`,
dropping both sides rather than guessing: whether `*`'s capped disclosure
of a child is bigger or smaller than a deeper literal spec's own disclosure
depends on that child's actual runtime shape, not on the specs alone. See
BEH-QD-056.
