---
"@qadi/devtools": minor
---

**Breaking.** `DevtoolsDock`'s `wiring`, `activity`, `portCalls`, `questions` and `hydration` props are one `reading` prop of a new `DiagnosticsReading`, merged over what `diagnostics` samples by a new `mergeReading`, field by field: a field the reading carries wins, one it omits falls through to the sample. Its `wiring` is a `WiringRead` (not a bare `WiringReport`), so a reading from another process can state a failed read. Migrate `wiring={report}` to `reading={{ wiring: WiringRead.Read({ report }) }}` and the others to the same-named field of `reading`. `hydrationMismatches` is removed from `DevtoolsDock` and from `QuestionsPanel` (with the panel's legacy mismatch branch): pass `hydration`, or let `diagnostics` sample it, and read `hydration.mismatched`. No alias is kept. `DevtoolsDock` goes from fourteen props to nine (ARCH-44, reverses the layout half of ARCH-24's D-24-c, BEH-QD-323).
