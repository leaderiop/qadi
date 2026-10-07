---
"@qadi/react": patch
---

A gate registry built by `makeGateRegistry()` now warns on an id collision in development, as an atom set's own registry does; a supplied `onIdCollision` replaces the warning and runs in production. Internally, a registry now holds its writer in a private slot of the registry object instead of a module-level side table; nothing exported changes.
