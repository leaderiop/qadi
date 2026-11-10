---
"@qadi/devtools": patch
---

**Fix:** the role viewer draws every role correctly.

- A distinct role that shares a name with another is its own row. Before, the second one was marked "already reached above".
- A deep inheritance chain renders. Before, a 20,000-deep chain threw `RangeError: Maximum call stack size exceeded`.
- A role reached by a second path, as in a diamond, is one row marked "already reached above" and linked to its first occurrence. Its subtree is drawn once, under that first occurrence. Before, the viewer drew the subtree again under every repeat, so a chain of stacked diamonds drew a number of rows exponential in its length.

The viewer now draws the role walk from `@qadi/core`'s `roleWalk` as flat, indented rows. Nothing exported changed.
