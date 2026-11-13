---
"@qadi/core": patch
---

`EvaluateOptions` is now declared beside `QuestionOptions` (in `Question.ts`), and `EvaluationServices` and `StandingEvaluationServices` in their own type-only module. Their names and shapes are unchanged and all three are still exported from `@qadi/core`, so no code needs to change.
