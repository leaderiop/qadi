---
"@qadi/react": patch
---

A reporter passed to `makeGateRegistry` as `onIdCollision` that throws is now announced under `onIdCollision`; it was announced as `onGateIdCollision`, the atom set's own option. Every developer signal's reporter is now resolved through one table that states where its default speaks, how often and the option each entry point reports it under, and nothing else a consumer sees changes.
