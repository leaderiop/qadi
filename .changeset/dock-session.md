---
"@qadi/devtools": patch
---

**Fix:** replaying the same timeline row again re-seeds the simulator, even after another policy was chosen from the rail or the form was edited. Before, the second "Replay in simulator" on a row did nothing and the simulator kept the other policy. The dock's tab, log filters and selected row moved into an internal session with it; nothing changes for hosts.
