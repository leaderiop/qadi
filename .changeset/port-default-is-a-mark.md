---
"@qadi/core": minor
---

**A port's fail-closed default is a fact its service carries.** `isPortDefault(description, service)` is new and answers whether a service is that port's fail-closed default. `nonePort` marks the default it builds, and every derived wrapper (`…Retrying`, `…Bounded`, `…TimingOut`, `recordingPort`) and `decoratePorts` carry the mark forward. A hand-written wrapper keeps it by spreading `inner`; one that builds a fresh object does not, and reads as a real adapter. `decoratePorts` marks whatever its decorator returns for a slot that held a default, so a decorator that swaps in a real implementation still reads defaulted. The mark is a symbol-keyed property, so `Object.keys`, JSON and a structural clone are unchanged, and evaluation never reads it. The change is additive and no outcome changes.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
