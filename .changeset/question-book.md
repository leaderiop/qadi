---
"@qadi/react": minor
---

**Breaking.** One question path. A question's decision atom, its `asked()` row and its hydrated seed now survive garbage collection: `Atom.family` holds its values weakly and nothing held a question's atom, so after a collection the same question got a second atom (a second evaluation and sink record), was listed twice and lost a seed written before its first read. An atom set now keeps each tracked question's handle in an internal question book (`QuestionBook.ts`), and `sweepEvictions` forgets a swept question's handle as well as its row.

- `QadiAtoms.decisionFor` is removed. Replace `atoms.decisionFor(policy, resource)` with `atoms.decision(policy, resource)`; `decision` now takes `(policy, resource?)`.
- `QadiAtoms` gains a required member, `decisions(questions)`, the grouped read `usePolicies` and `useQuestions` use. A hand-written `QadiAtoms` double must add it. The module-scope cache `usePolicies` kept is gone.
- `GateKind` gains `"usePolicies"` and `"useQuestions"`: an exhaustive `Match` over it needs two more arms. `@qadi/devtools` is unaffected.
- `usePolicies` now registers one gate instance per named policy under an `instrument`ed provider (it registered none), each `<useId>/<name>`; uninstrumented it still registers nothing.
- Adds `useQuestions(questions)`, a policy and optionally a resource per entry.
- A cold question's seed that was written and never read is forgotten with its row once more than `maxTrackedQuestions` (default 500) questions are cold.
