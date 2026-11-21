---
"@qadi/devtools": patch
---

A listener that throws on the emptied timeline a `configure` with a new `capacity` publishes no longer stops the timeline being refilled: the read starts, from the same source or a new one, and what the listener threw is rethrown once the read has started. If the timeline was `Stopped` and a status listener also throws on the `Reading` that read publishes, that throw escapes instead, replaces the timeline listener's, and no read is started.
