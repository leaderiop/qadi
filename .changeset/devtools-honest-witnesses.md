---
"@qadi/devtools": patch
---

Never offer a remedy whose value the matcher rejects.

`satisfyingValue` read each matcher backwards to a witness, and some of those witnesses did not satisfy the matcher they came from: `gte(Infinity)`, `gte(-Infinity)` and `gte(NaN)` offered the bound itself, `eq(literal(NaN))` offered `NaN`, and `eq(literal(undefined))` offered `undefined`. The remedies panel then showed rows that would not have helped. Every leaf witness is now checked with `@qadi/core`'s `judgeMatcher` before it is offered, and declined with the reason "the synthesised value does not satisfy the matcher" when it does not hold.
