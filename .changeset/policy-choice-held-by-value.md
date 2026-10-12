---
"@qadi/devtools": patch
---

The simulator and the policy explorer keep the policy you chose when new decisions reorder the rail, and the role viewer keeps its role when a host rebuilds the list. A policy that leaves the rail stays chosen and is marked "no longer in the log" instead of being swapped for a neighbour, and the first policy shown is held so the default does not follow the newest decision either. `SimulationSession.choosePolicy` takes the policy instead of an index and `PolicyChoice` gains an `Evicted` member; both were added after the last release, so no released API changes. `catalogueOf` lists structurally equal declared policies once, under the first declared name, as BEH-QD-211 already required.
