# Phase 61: two settled items, confirmed (recorded 2026-11-21 by Phase 68, HYGN-05)

Two items the v1.6 audit raised against this phase need no source edit. Each is confirmed below against the tree Phase 68
started from (`3d66becb9034fb16ffd97ccd5966b92d972e3b8e`), by a command anyone can re-run. This file adds a record to this archive and rewrites none
of its other files.

## 1. The `DecisionLog` `ingest` doc already names the uncontained defect path

`packages/core/src/DecisionLog.ts`'s doc on `ingest` states that a defect on that path is not contained, and why: a
record the log's own `layer` receives comes through the sink emitter, which contains and reports a defect once, and a
record handed to `ingest` comes from the host's receive handler, with no emitter in front of it (ADR-QD-171).

Evidence: `git show 3d66becb9034fb16ffd97ccd5966b92d972e3b8e:packages/core/src/DecisionLog.ts | grep -A3 "A defect on this path is not contained here"`
and `grep -A3 "A defect on this path is not contained here" packages/core/src/DecisionLog.ts` print the same four
lines. Phase 68 edits two other places in the file: the sentence before that paragraph, which said the records would be
"stamped" with a label and now says an envelope carries it, and the hand-wrap of the `LogEntry` literal in `append`;
`68-compare.mjs` reports the file `same`, comments and line breaks aside.

## 2. `Simulator.test.tsx`'s Phase 61 diff is comments only

Commit `d0ca3df6` ("fix(61): the metric doc and the Simulator test talk about the walk") changes
`packages/devtools/test/react/Simulator.test.tsx` in two comment lines and nothing else, and the metric's description
string in `packages/core/src/EvaluationMetrics.ts`, its registry key (ADR-QD-123), is unchanged.

Evidence: `git show --format= d0ca3df6 -- packages/devtools/test/react/Simulator.test.tsx | grep -E "^[-+][^-+]"`
prints four lines, two removed and two added, each a doc-comment line (` * ` after the sign), and
`git show --format= d0ca3df6 -- packages/core/src/EvaluationMetrics.ts | grep -E "^[-+][^-+]"` prints three lines, each a
doc-comment line too, so no string, test or statement changed.
