---
"@qadi/core": minor
---

**A decision sink that fails is reported once.** Whatever a sink's `record` does that loses the record is contained, as before, and is now logged once at `Warn`: `qadi: a decision sink failed; the record was not delivered`, annotated `qadi.sink`, `qadi.record_tag`, `evaluationId` and `qadi.cause`. That covers a defect, a throw (including one before `record` returns an effect, which used to end `evaluate`), a self-interruption, and a failure leaked through a type escape. The decision is unchanged, and the line carries nothing about the subject, resource, policy or action.

`DecisionSinkShape` gains an optional `name`, reported in `qadi.sink` (`unnamed` without one). `decisionSinkForwarding`, `decisionSinkAll`, the decision log's sink and the simulation shadow name themselves. `decisionSinkAll`'s member line, "a fanned-out decision sink failed unexpectedly", gains `qadi.sink`, `qadi.record_tag` and `evaluationId`, and a member that throws before returning an effect no longer stops the members after it. A throwing `onFailure` on a send failure is now reported by the emitter's line, naming `decisionSinkForwarding`, instead of "a decision record could not be forwarded", and a `send` that throws before returning an effect now reaches `onFailure`.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
