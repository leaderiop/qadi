---
"@qadi/core": minor
---

`@qadi/core` exports `valueText`, the JSON text of a value or `undefined` when it has none, which never throws. `explain` no longer throws on a bigint or a circular literal: it writes a bigint as its digits and `n` (`10n`), a list with no JSON text element by element, and any other value with no JSON form as `a value with no JSON form`. An object whose `toJSON` gives nothing, written `undefined` before, now takes those words. Every other explanation is unchanged.
