---
"@qadi/devtools": patch
---

A capture keeps a broken port's own text, the cause it reported or, for a custom predicate, its reason, so a failing custom predicate is captured and replayed with its reason where it carried the predicate's name; a failure with no text of its own is captured with an empty message, not its error's tag; a cause that cannot be described is captured with `a value that could not be described` (it was captured as nothing, or as the old angle-bracketed words). The timeline and diagnostics feeds, the diagnostics wiring read and the policy explorer render a run's cause with `causeMessage`, so a run that dies with a value that cannot be rendered is stated as stopped or failed with those words instead of leaving the panel on its last reading, and the explorer shows those words instead of throwing; a throw the gates feed cannot render reads as those words, not a sentence of its own.
