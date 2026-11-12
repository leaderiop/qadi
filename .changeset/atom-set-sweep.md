---
"@qadi/react": minor
---

**Breaking.** `QadiProvider`'s `sweepIntervalMillis` prop is removed. The atom set now sweeps its own question book back to `maxTrackedQuestions` one macrotask after the book goes over it, so the provider forks no sweep and has nothing to time. Delete the prop.

**Breaking.** `QadiAtoms.sweepEvictions` is removed. The atom set enforces its own bound wherever it runs: with no provider, on a bare `AtomRegistry`, or under several providers sharing it, with one sweep per atom set. A hand-written `QadiAtoms` double drops the member, and a non-React host that ran it on a timer deletes the timer.

`maxTrackedQuestions` now holds without a provider and after the provider unmounts.
