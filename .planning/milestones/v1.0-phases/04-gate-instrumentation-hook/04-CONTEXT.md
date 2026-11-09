# Phase 4: Gate instrumentation hook - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-49 · reserved ADR-QD-111 · reserved CCR-QD-388

<domain>
## Phase Boundary

Gate instrumentation in `@qadi/react` becomes one internal hook over a gate writer the
provider resolves once. `useGate` and `useQuestionsAs` become thin callers. `useDecisionSuspense`
stops opening the decision atom twice. The `usePolicies` per-render `questions` record is
investigated and pinned.
</domain>

<decisions>
## Implementation Decisions

- **D-01:** QadiProvider resolves `gateWriterFor(gates)` once (today it is called at
  QadiProvider.tsx:307 and :352, and again in useGate.ts and hooks.ts `useQuestionsAs`). The
  resolved writer, or `undefined` when `instrument` is false, travels to hooks through an
  internal context field or an internal `useGateWriter()` hook. It never goes through the
  public barrel (ADR-QD-099).
- **D-02:** GateWriter.ts offers one internal hook, `useGates(kind, questions)`. It takes the
  gate kind and the questions, returns results, outcomes, ids and marker refs, and owns atom
  lookup, `GateIdentity` construction (id, kind, atom, wraps, policy, resource, marker) and the
  `wraps = kind === "Can" || kind === "Cannot"` rule (today in useGate.ts).
- **D-03:** `useQuestionsAs` must reuse the atoms `atoms.decisions(questions)` already opened,
  and stop calling `atoms.decision(...)` per entry again.
- **D-04:** `useDecisionSuspense` (hooks.ts) opens `atoms.decision` once.
- **D-05:** ADR-QD-080 holds. The `gates` override and the private writer slot stay. This phase
  only stops consumers from re-resolving the writer.
- **D-06:** AGENTS.md §13 holds. There is no React state for decisions, reads go through
  `outcomeOf`, no DOM API is called, and instrumentation off means absent: no marker and no
  registration. The React suite's existing tests must pass untouched, and that is the
  acceptance check for "off means absent".
- **D-07 (investigation, test first):** Write a test that renders a `usePolicies` consumer,
  re-renders it with structurally equal policies, and counts group-atom creations and
  `GateIdentity` registrations. The atom keying rule says `QuestionBook` compares with
  `Equal.equals`, so the expectation is no re-creation. If the test shows re-creation, fix it
  (structural memo keyed by `Equal`/`Hash`) in this phase. Either way the test stays as a pin.
- **D-08:** DECISION_READ_BUDGET is unchanged. The new hook reads decisions only through
  `outcomeOf`/`DecisionOutcome`.
- **D-09:** Records: ADR-QD-111 if the writer's resolution point is a documented contract
  (ADR-080 names it), otherwise a CCR-only justification. Also add CCR-QD-388, the
  `spec/README.md` line, rows in the react behaviour doc (the guard instance registry,
  BEH-QD-233/234 area), traceability, and `.changeset/gate-hook.md` (patch for @qadi/react).

### Claude's Discretion
- Names of the internal hook and context field.
</decisions>

<specifics>
## Specific Ideas

- `useMemo(() => (instrument ? gateWriterFor(gates) : undefined), [instrument, gates])` appears word for word in useGate.ts:57-77 and hooks.ts:95-133.
- The marker `<span>` that `wraps` controls is rendered in components.tsx.
</specifics>

<canonical_refs>
## Canonical References

- `AGENTS.md` §13 (React rules, all bullets)
- `spec/decisions/053-*` (a guard may record that it exists), `080-a-gate-registry-belongs-to-its-atom-set.md`, `093-a-decision-is-read-once.md`, `103-a-question-is-opened-once.md`
- `spec/README.md` CCR-QD-250 (ARCH-43: the gates override is kept)
- `packages/react/src/useGate.ts`, `hooks.ts`, `QadiProvider.tsx`, `GateWriter.ts`, `GateRegistry.ts`, `components.tsx`, `QuestionBook.ts`, `QadiAtoms.ts`
- `packages/react/test/` (GateWriter.test.tsx, hooks.test.tsx, QadiAtoms.test.ts, v4-reactivity-smoke.test.ts)
</canonical_refs>

<code_context>
## Existing Code Insights

### Established Patterns
- Test the atom graph, not the DOM, where possible (AGENTS.md §13).
- `@effect/atom-react`'s `useAtomValue` is the glue (CCR-QD-150).

### Integration Points
- `@qadi/devtools` reads the gate registry through `subscribe`/`instances`, so it must keep working.
</code_context>

<deferred>
## Deferred Ideas

- Dehydration ownership → Phase 6.
</deferred>

---

*Phase: 04-gate-instrumentation-hook*
*Context gathered: 2026-11-08*
