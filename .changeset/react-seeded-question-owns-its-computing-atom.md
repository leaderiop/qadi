---
"@qadi/react": patch
---

A hydrated question's seed, the atom that computes its decision and the atom a guard reads now live together in one package-private module, `SeededQuestion.ts`, instead of being split across `HydrationEngine.ts` and `QadiAtoms.ts`. No export, render sequence or hydration behaviour changes.
