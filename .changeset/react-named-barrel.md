---
"@qadi/react": patch
---

The barrel names its exports per module. `hydrateDecisions` takes any value with a `hydrate` method of the same signature (`QadiAtoms` still satisfies it, and `QadiAtoms` states that method through it); no call site changes. No export is added or removed.
