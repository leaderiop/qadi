---
"@qadi/core": minor
"@qadi/devtools": minor
---

`renderTrace` and `diffTraces` no longer overflow the stack on a trace evaluated under a large `maxDepth`: a decision that evaluated fine used to turn into a raw `RangeError` when its trace was rendered or diffed (about 1,483 and 2,186 levels). `renderTrace` caps indentation at the new `RenderTraceOptions.indentLimit` (default 64, the default `maxDepth`): a line deeper than that keeps 64 levels of indent and is prefixed `(depth N) `, so rendering changes only for a trace deeper than 64 levels, and `indentLimit: Infinity` restores the old format. `@qadi/core` adds `foldTrace` and `TraceCases` (the stack-safe, case-wise walk for a caller-held trace), `foldAligned` and `AlignedNode` (an explanation folded with the trace of one evaluation, once per position, so a subtree shared by identity keeps its own trace and key) and `tracePathKey` (a `TracePath`'s `"$.0.2"` address). `@qadi/devtools` adds `describeTracePath`; `inspect` is now an adapter over `foldAligned`, its output is unchanged, and the package no longer carries a copy of the fold loop (ADR-QD-101).
