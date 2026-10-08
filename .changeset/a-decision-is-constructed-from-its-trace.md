---
"@qadi/core": minor
"@qadi/react": minor
"@qadi/devtools": minor
---

**Breaking.** A `Decision` is constructed from its trace, and a record or seed whose copies disagree is refused (ARCH-32, ADR-QD-106). `Allow` and `Deny` stored the verdict, `visibleFields`, `obligations` and `reason` beside the trace that already held them, and nothing compared the two: a version-2 record whose `Allow` said `allowed: false` in its trace, or whose fields or duties differed from the trace root's, decoded and re-encoded unchanged, and a `Disclosed` hydration seed had the same gap.

`@qadi/core`: `new Allow({ ...stamp, trace })` and `new Deny({ ...stamp, trace })` take a stamp (`evaluationId`, `subjectId`, `durationMillis`) and a trace of their verdict (`AllowingTrace`, `DenyingTrace`) and derive `visibleFields`, `obligations` and `reason` from it; passing one of those, or a trace not known to allow or deny, no longer compiles. New `makeDecision(stamp, trace)`, `DecisionStamp`, `isAllowingTrace`, `isDenyingTrace`, and `decisionDisagreement(claim, trace)` with `DecisionClaim` and the closed `DecisionDisagreement`. `decodeDecision` returns `Result<Decision, DecisionDisagreement>`. `decodeSinkRecord` refuses a decision that contradicts its own trace, or whose `evaluationId`, `subjectId` or policy tag contradict its record, as the new `DecodeRefusal.Inconsistent { disagreement }`, so an exhaustive match over `DecodeRefusal` needs an `Inconsistent` arm. The wire bytes do not change; a record written by `evaluate` is unaffected.

`@qadi/react`: a `Disclosed` hydration seed that disagrees with its own trace is dropped as `MalformedEntry`.

`@qadi/devtools`: `MalformedReason` gains `"inconsistent"`, so an exhaustive consumer needs a new arm.
