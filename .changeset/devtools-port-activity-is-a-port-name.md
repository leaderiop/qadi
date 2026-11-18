---
"@qadi/devtools": minor
---

**Breaking.** `PortActivity.port` is now `PortName`, `@qadi/core`'s union of the registry's ports, not `string`. `portActivity` reads one entry per registry port, so a word written to a port metric outside the registry is no longer reported, and a misspelt port is a compile error.

The Services panel's cards are now computed by the dock model, and every word, `data-testid` and attribute on the tab is unchanged.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
