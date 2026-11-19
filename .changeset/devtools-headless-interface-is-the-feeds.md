---
"@qadi/devtools": minor
---

**Breaking.** The root's headless interface is the three feeds, `makeTimelineFeed`, `makeDiagnosticsFeed` and `makeGatesFeed`, each built in a scope. `makeTimelineStore`, `runSource`, `makeDiagnosticsStore`, `runDiagnostics`, `noDiagnostics` and the `DiagnosticsStore` type are no longer importable. `DiagnosticsDockOptions` is `DiagnosticsOptions` on both entries, it is not generic, and it takes `intervalMillis` where it took a `schedule`. A hand-fed timeline is `makeTimelineFeed()` and its `accept`. A stop's `reason` is a `Cause.pretty` trace and must not cross a trust boundary.

A shell without React now gets the stop detection the runners lacked: each feed states when it has stopped, with a restart, and the dock reads the same feeds.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
