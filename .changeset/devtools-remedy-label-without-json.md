---
"@qadi/devtools": patch
---

The simulator's remedy table and its session commands (`choosePolicy`, `edit`), the policy rail and the inspector no longer throw when a policy compares an attribute with a bigint or a circular value. Such a remedy is still offered, labelled with the bigint's digits and `n` (`10n`) or, for a value with no JSON form, with the words `a value with no JSON form`, which carry none of the value. An object whose `toJSON` gives nothing, labelled `undefined` before, now takes those words. The remedy label reads through `@qadi/core`'s `valueLabel`, and the search text and the simulator form through its `valueText`.
