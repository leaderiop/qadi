---
"@qadi/devtools": minor
---

**Breaking.** `Diagnostics` has no `questions` field. It is one reading of what the poll samples: `wiring`, `activity`, `hydration` and `portCalls`. The poll never sampled questions, so a reader of `reading.questions` on a sampled reading read `undefined`, and on `mergeReading`'s result read the list a supplied reading carried.

`DiagnosticsReading.questions` and the dock's Questions tab are unchanged: a list a reading supplies is still listed, and still wins over the dock's `questions` input. Code that read `questions` from a `Diagnostics` reads it from the `DiagnosticsReading` it supplied.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
