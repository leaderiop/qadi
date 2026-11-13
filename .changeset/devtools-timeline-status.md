---
"@qadi/devtools": minor
---

**Breaking.** `Baseline`'s `Checked` arm now carries `reading` (`BaselineReading`), decided when the baseline is checked, so code that builds a `Baseline` by hand must add it. The simulation snapshot reads the sentence from `baseline.reading`.

The timeline states a dying read. `TimelineStatus` is `Reading` or `Stopped { reason }`, exported from `@qadi/devtools/react`, and `useTimeline()` returns `status` and a `restart` that reads the same source again from the start. A read that has been replaced no longer writes late entries into the new one.

The dock shows a stopped timeline above the log, inspector, policies and simulator screens, with a Restart timeline button, so a screen that reads the timeline no longer looks merely empty.

The dock's focus targets draw their own focus ring, and the Restart buttons read the body colour inside an amber border. `runSource` accepts any value with an `accept` method, not only a whole timeline store.
