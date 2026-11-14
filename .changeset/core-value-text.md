---
"@qadi/core": minor
---

`@qadi/core` exports `valueText`, the JSON text of a value or `undefined` when it has none, and `valueLabel`, a value as a label (a bigint as its digits and `n`, otherwise its JSON text, and where there is none the words `a value with no JSON form` for an object or `undefined` for anything else). Neither throws. `explain` no longer throws on a bigint or a circular literal: it writes a bigint as its digits and `n` (`10n`), a list with no JSON text element by element, and any other value with no JSON form as `a value with no JSON form`. An object whose `toJSON` gives nothing, written `undefined` before, now takes those words. Every other explanation is unchanged.
