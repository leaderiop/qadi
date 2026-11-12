---
"@qadi/devtools": minor
---

**Breaking.** `useTimeline` reads its source in a scope it holds, as the dock does, so it follows its component's lifetime. A StrictMode remount, or a hidden-then-shown `<Activity>`, builds a fresh timeline: `paused` returns to `false` and the source is read again (a backlog refills; a live-only stream starts empty). A capacity change keeps the returned `store` and empties and re-reads it, where it used to return a new store. The signature is unchanged.
