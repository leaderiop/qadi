---
"@qadi/devtools": patch
---

The simulator session, the timeline feed and the diagnostics feed now run through one internal module, so a restart issued from inside a feed's own notification, or from a run's synchronous start, leaves the newest run live where before it could leave the feed or the session idle with a stale run behind it. A stop with no run in flight does nothing a host can see. No exported name, type or behaviour otherwise changes, so no code needs to change.
