---
"@qadi/core": minor
---

Two lossy projections stopped standing in for the things they projected.

**A rendered explanation now denotes exactly one policy.** `renderExplanation`
joined a composite's children with `" and "` / `" or "` and never
parenthesised, so these two rendered identically:

```ts
anyOf([admin, allOf([editor, onCall])])   // a lone admin IS allowed
allOf([anyOf([admin, editor]), onCall])   // a lone admin is NOT allowed
```

They are not the same policy. Since this rendering is the only thing an
administrative screen shows, a reviewer had no way to tell which one they were
reading. Composite children are parenthesised now; the top level is not, so a
single requirement or a flat conjunction of them reads exactly as before.

The same flattening made an obligation ambiguous — `allOf([x, obliged(o, y)])`
read as though the whole policy owed `o`, when only the second branch does.

**The decision cache cannot collide.** `keyOf` was `JSON.stringify` over the
question, and its doc comment defended that as the option with "no chance of
colliding". It had that backwards:

| Two different questions | One key, because `stringify` |
| --- | --- |
| `{d: new Date(0)}` / `{d: "1970-01-01T00:00:00.000Z"}` | maps a `Date` to its ISO string |
| `{a: 1, b: undefined}` / `{a: 1}` | drops `undefined`-valued properties |
| `{n: NaN}` / `{n: null}` | renders `NaN` as `null` |

A collision served one question's cached decision as another's answer, verdict
included — so INV-QD-025 ("a hit differs from a miss only in speed and
identity") was false.

The fix is a **deletion**: `keyOf` is gone and `DecisionCacheKey` is the
`HashMap` key itself. Effect's `Equal`/`Hash` compare plain objects
structurally, which is what `Atom.family` already relied on.

One behaviour change worth knowing: two structurally equal resources whose
properties were written in a different order now **hit**. That was previously
documented as a deliberate miss, and it is safe to drop because the comparison
is real structural equality rather than a serialization that happens to agree.

See ADR-QD-042, INV-QD-030, INV-QD-031, BEH-QD-137, BEH-QD-167.
