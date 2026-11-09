---
"@qadi/devtools": patch
---

The dock keeps the policy explorer's chosen policy, a pasted or simplified draft, the Tree/JSON view and an unloaded paste when you switch tabs and come back, and the role viewer keeps its role. What the explorer shows moved into a model the dock owns; no exported name changed.

Three explorer defects are fixed with it: loading a paste now ends a preview of the previous policy, so `apply` applies the tree on screen; a paste's refusal is cleared once its text or the shown policy changes; and an unloaded paste survives switching to the tree and back.
