---
"@qadi/react": patch
---

A provider's subject now reaches a gate that mounts any time after the provider, including a gate under a hidden-then-shown `<Activity>`. It was dropped one macrotask after the provider rendered with no gate mounted, and the gate waited for a subject that never came back.

A hydrated decision now answers a gate that mounts late, is hidden and shown, or remounts, until this client answers for itself, and it is read only by the registry it was hydrated into. It was lost one macrotask after the registry was built, and the gate rendered pending. No public type changes.
