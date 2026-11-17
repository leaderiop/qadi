---
"@qadi/core": minor
---

**Breaking.** `LoadedEnforceOptions` is renamed `HandoverOptions`, with no alias. It is the options type of every entry point that hands over a value.

**Breaking.** `guard`, `filter`, `filterStream`, `filterProjected` and `filterStreamProjected` take `HandoverOptions` and refuse `options.resource`, which they silently dropped. An untyped caller's resource is ignored at runtime, and `enforceProjected` now decides with no resource even when one is passed at runtime.

`enforce` and `assert` keep `options.resource`: they hand over no value, so there is no second resource to disagree with.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
