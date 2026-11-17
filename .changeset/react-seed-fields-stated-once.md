---
"@qadi/react": minor
---

**Breaking.** `SeededAllow`'s `visibleFields` is now an optional key, as it is on the decision's wire form. A seed rebuilt from a payload that sent no `visibleFields` has no `visibleFields` key, where it held `visibleFields: undefined`. Reading `seed.visibleFields` is unchanged (`undefined` still means every field), and building a `SeededAllow` with or without the key compiles. What breaks is assigning a `SeededAllow` to a type that requires `visibleFields`, and code that checks for the key: `"visibleFields" in seed`, `Object.keys`, or `Equal.equals` against a seed built with an explicit `undefined`.

A seed's fields are now stated once, from `@qadi/core`'s decision wire form, so a field the wire gains reaches the seed with no edit in `@qadi/react`. The payload's version and bytes are unchanged.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
