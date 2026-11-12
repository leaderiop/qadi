---
"@qadi/devtools": minor
---

**Breaking.** `useTimeline` reads its source in a scope it holds, as the dock does, so it follows its component's lifetime. A StrictMode remount, or a hidden-then-shown `<Activity>`, builds a fresh timeline: `paused` returns to `false` and the source is read again (a backlog refills; a live-only stream starts empty). A capacity change keeps the returned `store` and empties and re-reads it, where it used to return a new store. The signature is unchanged.

**Breaking.** `useDiagnostics` returns `{ status, reading }`, where it returned the reading itself. Read `reading.hydration` and the other fields from `reading`. `status` is `Off`, `Starting`, `Live` or `Stopped { reason, sampled }`, so a sampler that died is visible instead of a reading that stopped changing. A remount, or a hidden-then-shown `<Activity>`, starts a fresh run.

Adds `DiagnosticsStatus` and the `DiagnosticsSnapshot` type to `@qadi/devtools/react`. `DiagnosticsDockOptions` is unchanged and is now declared in the model. The dock states the sampler's status on the Services and React screens and offers a restart when it stopped.
