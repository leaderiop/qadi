## Deferred Items

- `spec/behaviors/29-devtools-simulator.md` carries BEH-QD-219, BEH-QD-220 and BEH-QD-221 twice, as two similar blocks (they differ in places) (lines 28-185 and 186-344 at 965ff14c), present before this phase. Phase 24 applied its BEH-QD-220 wording to both copies so they stay equal; removing one copy is a separate spec change.
  status: open
- `spec/traceability.md` behaviour 29's module list names `Sources` (`model/Sources.ts`), a file that does not exist; the module is `Source.ts`. Present before this phase and not touched by it.
  status: open
