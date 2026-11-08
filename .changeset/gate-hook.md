---
"@qadi/react": patch
---

Gate instrumentation now runs through one internal hook over a gate writer the provider resolves once, instead of each guard looking the writer up itself. `useDecisionSuspense` opens its decision atom once, and `useQuestions` and `usePolicies` register through the same hook as every other guard. With `instrument` off, nothing registers and no marker renders, as before. Nothing exported changes, and `MissingQadiProviderError` is still exported from the package root.
