---
"@qadi/audit": minor
---

The audit pipeline's correctness guarantees are now formally specified
rather than implied, and held by tests that are themselves checked for
whether they'd notice a break.

**Five properties are named, not just intended.** INV-QD-051 through
INV-QD-055 and BEH-QD-249 through BEH-QD-257 state what `@qadi/audit`
promises: staging presence or absence never changes the committed audit
entries (staging non-observability); once a circuit breaker trips,
concurrent `record()` calls cannot race it into attempting a write before
reset (circuit-breaker atomicity under concurrency); `enforceRetention` and
`getPurgeableEntries` partition every entry set exactly, with no row
double-counted or dropped (retention's partition property);
`verifyChainIntegrity` detects every gap and every duplicate sequence
number (chain-integrity gap detection); and `signatureObligationHandler`
calls `capture` exactly once per discharge, with the recorded
`ObligationRecord` outcome matching whether that call succeeded (the
signature obligation handler's call-once / outcome-match guarantee). A
consumer relying on this package for an audit trail cares which of these
are guaranteed and which were previously only intended.

**A mutation-testing gate now runs as part of `pnpm check`.** `stryker.audit.mjs`
mutates `packages/audit/src/**/*.ts` and breaks the build below 80%. The
first run scored 81.46% and revealed real gaps in what the existing tests
would notice; the suite was hardened to 92.03%, clearing the 90% high
threshold. Reporting only the final number would hide what the gate found;
reporting only the first would understate what closed the gap.

Nothing here changes `@qadi/audit`'s public API — this is worth a release
note anyway, because what changed for a consumer is the strength of the
guarantee behind an interface that looks identical: the promise was always
made, and now it's checked.

See INV-QD-051–055, BEH-QD-249–257.
