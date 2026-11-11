---
"@qadi/devtools": patch
---

**Internal:** the simulator's source availability (which of Fixtures, Snapshot and Live can be had, and why) and the rule that a Live run captures, which is what makes Snapshot available, now live in one function in the source module, and the simulator's session stores its result instead of working both out itself. No public name or behaviour changes.
