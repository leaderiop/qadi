# Phase 2: One port read - Context

**Gathered:** 2026-11-08
**Status:** Ready for planning
**Ticket:** ARCH-47 · reserved ADR-QD-109 · reserved CCR-QD-386

<domain>
## Phase Boundary

Each port's question→span-attributes and answer→span-attributes projection is stated once, on
the port description's span attributes (`PortSpanAttributes`). Every port read, whether local
(`PortAccess.ts` `resolveAttribute`, `askActedAny`, `askActedForResource`, `askRelationship`,
`askCustom`, `askSignature`) or served (`servedBody`/`servePortRead`), runs through one
internal read body. That body does span annotation, metric counting, defect catching and
answer annotation. `PortWire` deals only with JSON.
</domain>

<decisions>
## Implementation Decisions

### Where the projection lives
- **D-01:** Add `question(args)` (the question's span attributes) beside the existing
  `disclose(answer)` on `PortSpanAttributes` (PortSpan.ts). Remove `spanQuestion` and
  `spanAnswer` from the `wire` block of all five port modules: AttributeResolver.ts (~:131),
  DecisionHistory.ts (~:136), RelationshipResolver.ts (~:182), CustomPredicate.ts (~:163) and
  SignatureHistory.ts (~:148), plus their type in PortWire.ts.
- **D-02:** This does NOT contradict ADR-QD-107. ADR-107 rejected using span structs *as the
  wire*. This change moves the projection off the wire and onto the span attributes. Cite that
  explicitly in ADR-QD-109.
- **D-03:** The local reads currently pass extra context (`interpreter`, `scope`, `meaning`,
  `signerRole`, `resourceId`) that the served projection lacks. The single projection must
  take everything both sides need, so local and served spans are identical for the same
  question. The served signature span must gain `meaning`/`signerRole`, and its answer span
  must gain `matched`/`onFile`, or the local one must drop them. Choose by what the
  `qadi.*` span attribute docs in `spec/behaviors/30-*.md` (BEH-QD-227..229, ADR-QD-051)
  promise, and record the choice.

### One read body
- **D-04:** Add one internal generic read, e.g. `readPort(description, interpreter, args, extra?)`,
  in PortAccess.ts. It performs `annotateQuestion` → count (`countFor`/`portCallsTotal`) →
  invoke the description's accessor → `catchPortDefect(c => d.defect(args, c))` →
  `annotateAnswer`. `servePortRead` uses it too.
- **D-05:** The `ask*` functions keep only what is really theirs: argument shaping, the
  `requireResourceId` check with its "annotate before validating" order, the depth clamp, and
  the signature match.
- **D-06:** AGENTS.md §5: every read listed there (`readAttribute`/`resolveAttribute`,
  `askActedAny`, `askActedForResource`, `askRelationship`, `askCustom`, `askSignature`) stays
  `Effect.fn(name)`, traced, with an unchanged span name. The generic body must not be
  `Effect.fnUntraced` (UNTRACED_BUDGET is fixed at 3). If it is itself an `Effect.fn`, it must
  not add a second nested span per read. Prefer a plain function returning an Effect that is
  called inside the named `Effect.fn`.
- **D-07:** Do not change the order "annotate the question, then validate" (ADR-QD-077 /
  ARCH-21). A test must pin that a missing resource id still yields a span carrying the question.

### Tests
- **D-08:** Turn `PortAccess.test.ts` into a per-port table, alongside the existing
  `PortServe.test.ts` loop. The new assertion is: for each port, the local read and the served
  read of the same question produce equal span attributes, using `CollectingTracer` from
  `@qadi/testing` or core's twin. Use `scriptedPort` for broken ports (PORT_DOUBLE_BUDGET).

### Records
- **D-09:** Write ADR-QD-109 ("A port's span is projected once, and every read is one body"),
  amending ADR-QD-077, 094 and 107. Also add CCR-QD-386, the `spec/README.md` line, behaviour
  doc 30 rows, an invariant, traceability rows, and `.changeset/one-port-read.md`. A removed
  `wire.spanQuestion`/`spanAnswer` is breaking only if it is exported publicly. Check
  `spec/overview.md`.

### Claude's Discretion
- Naming of the generic read and of the new `PortSpanAttributes` member.
</decisions>

<specifics>
## Specific Ideas

- The divergence was verified on 2026-11-08: SignatureHistory.ts:148-153 `spanQuestion` returns `{subjectId, scope, resourceId}` and `spanAnswer: () => ({})`, while PortAccess.ts:436-443 annotates `{subjectId, meaning, scope, interpreter, signerRole, resourceId}`.
- In 4 of the 5 ports, `spanAnswer` is just `(a) => xSpan.disclose(a)`.
</specifics>

<canonical_refs>
## Canonical References

- `AGENTS.md` §3 (port descriptions), §5 (traced reads, UNTRACED_BUDGET), §6 (PORT_DOUBLE_BUDGET)
- `spec/decisions/037-*` — why the Port* leaf files are split (do not merge them)
- `spec/decisions/051-*` — spans are product observability
- `spec/decisions/077-both-interpreters-read-ports-through-one-module.md`
- `spec/decisions/094-a-port-is-described-once.md`
- `spec/decisions/107-a-port-is-answered-remotely-through-its-description.md`
- `spec/behaviors/30-*.md` — what the ports were asked (span attributes)
- `packages/core/src/PortAccess.ts`, `PortSpan.ts`, `PortWire.ts`, `PortDescription.ts`, `PortRemote.ts`
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `servedBody` / `servePortRead` (PortAccess.ts:461-504): already generic over descriptions.
- `annotateQuestion`, `annotateAnswer`, `catchPortDefect`, `countFor`.

### Established Patterns
- ARCH-21 (CCR-QD-198): "a port describes its span attributes too", the precedent for putting span facts on the description.

### Integration Points
- `Walk.ts` and `Predicate.ts` (`toPredicate`) both call the `ask*` reads (ADR-077), and their tests must stay green.
</code_context>

<deferred>
## Deferred Ideas

- Serving facets and allowlists → Phase 8.
- Moving the refusal vocabulary off SinkWire → Phase 9.
</deferred>

---

*Phase: 02-one-port-read*
*Context gathered: 2026-11-08*
