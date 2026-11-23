---
"@qadi/react": patch
---

A supplied reporter that throws a value whose `message` or `toString` cannot be read no longer escapes its containment, and the developer signal names it as `a value that could not be described`; an `Error` whose `message` is not a string is named by its own string form, so no error is named twice; an ordinary error reads as before, `TypeError: host boom`.
