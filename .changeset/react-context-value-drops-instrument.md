---
"@qadi/react": minor
---

**Breaking.** `QadiContextValue` no longer carries `instrument`. It is `atoms`, `registry` and `gates`. Nothing in `@qadi/react` read the field: whether a guard registers is decided by the writer the provider resolves once from its `instrument` prop, and that writer stays off the context. What breaks is code that reads `useQadiContext(...).instrument`, and code that builds a `QadiContextValue` by hand with an `instrument` key.

A component that wants to know whether its tree is instrumented reads the value its host passed to `QadiProvider`'s `instrument` prop, which is unchanged: pass the host's own flag to the component that needs it.

Toggling `instrument` no longer gives `useQadiContext` consumers a new context value, so a consumer that read only `atoms`, `registry` or `gates` does not render again when the flag flips. Guards still register and unregister as it toggles.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
