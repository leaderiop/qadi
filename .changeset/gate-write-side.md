---
"@qadi/react": patch
---

Internal: the gate writer's write side no longer shares a file with its hooks (ARCH-76). `GateWriter.ts` is a React-free leaf holding the writer types, the private slot and a plain `reconcile` function; the gate hooks and their scope context moved to `useGate.ts`, and the test-only `useGateRegistration` was removed. Nothing a consumer imports, renders or observes changed.
