---
"@qadi/promise": minor
---

Every `@qadi/promise` call now takes an `AbortSignal` in its options (`FacadeOptions`, a new export: `EvaluateOptions` plus `signal`). The signal is forwarded to the runtime's `runPromise` and never read: aborting it interrupts the work underway, so a `filter` over a large collection stops issuing lookups, and the promise rejects with the runtime's interruption error (not `signal.reason`). A signal aborted before the call starts runs no lookup. The old claim that cancellation cannot cross the boundary was wrong.
