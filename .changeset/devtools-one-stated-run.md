---
"@qadi/devtools": patch
---

The Simulator's broken-run message is the text the timeline and diagnostics feeds give for a stop (the first line of a defect is the error itself, a value that cannot be described reads as `a value that could not be described`), shown as a scrolling preformatted block like the stopped box's reason, where it was a `Cause(...)` wrapper in a plain line. A timeline read, a live stream or a diagnostics collector whose own work interrupts itself reads stopped, where it showed reading, starting or live with nothing running; an interruption from outside (a newer start, a stop, the scope closing) still never stops a feed. A simulation run that fails outside its own result read, and used to stay running with nothing running, reads broken. No export changes.
