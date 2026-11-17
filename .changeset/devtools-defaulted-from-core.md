---
"@qadi/devtools": patch
---

The wiring report and the services panel read whether a port is defaulted from `@qadi/core`'s `isPortDefault`, not from the port's name. A wrapper that spreads a default now reads defaulted whatever it is called, and one that builds a fresh object reads as a real adapter even when its name starts with a default's. The panel's wording is unchanged.
