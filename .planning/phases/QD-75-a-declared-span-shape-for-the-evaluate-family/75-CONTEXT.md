# Phase 75: A declared span shape for the evaluate family - Context

**Gathered:** 2026-11-23
**Status:** Ready for planning

<domain>
## Phase Boundary

`@qadi/core` writes five spans around a question besides the port spans. Each one spells its `qadi.*` keys by hand,
and the root one changes its shape depending on how the evaluation ended. Port spans already avoid this: each declares
a question struct and an answer struct (`PortSpan.ts:13-16`), built with `spanStruct` (`PortSpanEncode.ts:40-62`) and
written through `encodeSpan` (`:71-82`). `PortAccess.ts` annotates the question before the call
(`annotateQuestion` `:93-96`, called first in `readPort` `:205`), so a failed port span still says what it was asked
(BEH-QD-227, ADR-QD-051, ADR-QD-109). Line numbers are from HEAD (`a9196d5d`):

- **`qadi.evaluate`** (`Lifecycle.ts:64`, `decideQuestion`):
  - the evaluation id is known at `:73-74`, before the lookup (`:120-124`);
  - **on failure** the `tapError` annotates only `"qadi.outcome": "Failed"` and `"qadi.error_tag"` (`:126-137`);
  - **on success** one annotation (`:147-161`) writes `"qadi.decision"` (Allow/Deny), `"qadi.subject_id"`,
    `"qadi.evaluation_id"`, `"qadi.policy_tag"`, `"qadi.action"` (only when supplied, by a conditional spread
    `:155`) and `"qadi.obligations"` (only on an Allow that owes some, `:158-160`);
  - so the question keys never reach a failed span, and the outcome is under two keys (`qadi.decision` on Allow
    and Deny, `qadi.outcome` on Failed). A tracer filtering on evaluation id or on outcome misses part of the
    evaluations;
  - **the Deny reason event** is a debug log, `Effect.logDebug("qadi: policy denied")` with hand-typed
    `annotateLogs` keys `"qadi.policy_tag"`, `"qadi.subject_id"`, `"qadi.reason"` (`:166-175`). Effect 4.1.2's
    default loggers include `tracerLogger` (`node_modules/effect/src/internal/effect.ts:6602`), which turns a log
    into an event on the current span with its annotations as attributes (`:6979-6997`). So when Debug is enabled
    these three keys reach the `qadi.evaluate` span as event attributes.
- **`qadi.toPredicate`** (`Predicate.ts:653`): it annotates `"qadi.subject_id"`, `"qadi.policy_tag"` and
  `"qadi.predicate_tag"` only after a translation succeeds (`:681-685`). Every failure path (the admission refusal
  `:664-665`, the field refusal `:666-671`, the compile refusal `:675-678` and a port failure in `run` `:679`)
  leaves the span with no attribute at all. This is the same defect.
- **`qadi.decideSubjects`** (`SubjectSet.ts:169`): it annotates `"qadi.subject_count"` and `"qadi.policy_tag"` first
  (`:174-177`), so its question is already there before the work. **`qadi.decideSubjectsStream`** passes
  `{ "qadi.policy_tag": … }` as `Stream.withSpan` attributes (`:258-260`). **`qadi.decideSubject`** (`:120`) writes
  no key.
- **`qadi.guardHealthCheck`** (`GuardHealthCheck.ts:94`): it writes `"qadi.healthy"` and, when unhealthy,
  `"qadi.error_tag"` after the walk (`:103-107`). It carries **no question**, so it does not say which subject or
  policy was probed.
- **One key, two spellings already:** `qadi.subject_id` is also the port spans' shared question key, spelled once in
  `sharedQuestionKeys` (`PortSpanEncode.ts:133-136`). The evaluate family spells it three more times (`Lifecycle.ts`
  ×2, `Predicate.ts` ×1).
- **The sink record made this fix for the same fact:** `subjectId` is a top-level field "so a consumer reads one field
  regardless of outcome" (`SinkRecordFields.ts:67-78`).
- **Tests that pin these keys as hand-typed strings** (`git grep -c` at HEAD, evaluate-family keys only):
  - `Evaluate.test.ts`: 21 family literals out of the file's 114 `"qadi.*"` strings:
    - the observability block (`:2439-2612`);
    - the failed shape, pinned exactly (`:2509-2515`);
    - the denial log (`:3419-3423`).
    The other 93 are span names (`"qadi.evaluate"` ×10, the port and composite span names) and port-span keys,
    including 12 port-span `"qadi.subject_id"` at `:2844-3213`.
  - `Predicate.test.ts:1931-1936` (3);
  - `SubjectSet.test.ts:560-570` (4);
  - `GuardHealthCheck.test.ts:165-167` (2).
- **Readers:** nothing outside `packages/core/test` reads any of these keys. `devtools`, `http`, `react`, `apps`,
  `examples` and the website have none. `features/features/port-calls/port-calls.steps.test.ts:392` checks only that a
  host saw a span *named* `qadi.evaluate`. `packages/devtools/test/model/Source.test.ts:555,580` checks
  `"qadi.reason"`, but that is devtools' own refusal-log key and not the evaluate family's.
- **No behaviour doc states these spans.** `spec/` names the evaluate span's keys nowhere. BEH-QD-317 has one sentence
  on the probe's span (`spec/behaviors/05-evaluator.md:302-304`), ADR-QD-100 repeats it (`:47-48`), and BEH-QD-267
  names `qadi.toPredicate` only as the port spans' parent (`30-port-calls.md:182-185`).

**This phase delivers:**
- ADR-QD-188 records the checkpoint (D-01, D-02) before any source change.
- One package-private declaration module, `EvaluationSpan.ts`, beside `PortSpan.ts`. Each family span is declared
  whole there: its name, a question struct and an answer struct, all built with `spanStruct`. The denial log event's
  struct is declared there too.
- `Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts` and `GuardHealthCheck.ts` write span keys only through it, with
  `encodeSpan`. Every span of the family annotates its question before the work that can fail, and `qadi.evaluate`'s
  outcome is under one key, `qadi.outcome`, on Allow, Deny and Failed.
- Tests read keys from the declaration. One tracer-facing contract file keeps the literal keys, and a house-style rule
  with an exact per-file budget refuses a family key typed by hand anywhere else.
- The records: a behaviour doc section, two invariants, traceability, a `@qadi/core` changeset and an upgrade-guide
  note, all describing the change tracers will see.

**Out of scope:**
- Port spans and their descriptions (`PortSpan.ts`, `PortAccess.ts`, the five port modules). Their keys, order and
  tests are unchanged, apart from importing nothing new.
- Span names: every name stays as it is (ADR-QD-051).
- Metrics: `EvaluationMetrics.ts`, its ids and series are unchanged.
- The sink record, the decision record and `DecisionLog`.
- The public surface: `check-api-surface` stays at 941 (`node scripts/check-api-surface.mjs`, run at HEAD).

</domain>

<decisions>
## Implementation Decisions

### Binding milestone decisions (from `_WAVE13-CONTEXT.md`)
- **D1 (scope):** all eight review candidates become phases.
- **D2 (branch):** `arch-wave-13`, with no merge and no release.
- **Order:** strictly serial.
- **Reserved numbers only:** ARCH-122, ADR-QD-188, CCR-QD-467, BEH-QD-711..715, INV-QD-395..396. All are free on
  HEAD (`git grep`, outside `.planning/`).
- **Never run `node scripts/next-id.mjs`.**

### The checkpoint (ESPN-01), decided autonomously by the orchestrator (2026-11-23)
- **D-01: The outcome is under one key, `qadi.outcome`, on every path of `qadi.evaluate`.**
  - Its closed value set is `"Allow" | "Deny" | "Failed"`: the decision tags plus `Failed`.
  - `qadi.decision` is removed.
  - Why:
    - `outcome` is the name the decision record already uses for the same fact (`DecisionRecord.ts:71`,
      `SinkRecordFields.ts:49-53`);
    - a failure is not a decision, so `qadi.decision: "Failed"` would say something false.
- **D-02: The old key does not stay for a release, so there is no dual-write.**
  - Why:
    - breaking changes are allowed, because nothing is in production and nothing in this repo reads these spans
      (verified above);
    - writing both keys would be a second statement of one fact, which is the defect this phase removes.
  - The changeset and the upgrade guide say plainly what a tracer query must change.
- ADR-QD-188 records D-01 and D-02 as its first decisions, in a commit before any `packages/*/src` change.

### The declaration (ESPN-03), decided autonomously (2026-11-23)
- **D-03: `packages/core/src/EvaluationSpan.ts`, package-private, beside `PortSpan.ts`.**
  - **What a span declaration holds.** One value per family span, `{ name, question, answer }`:
    - `name` is typed `SpanKey` (`qadi.${string}`, `PortSpan.ts:50`);
    - `question` and `answer` are `SpanStruct`s built with `spanStruct`.
    This is a family span's equivalent of a port description's `span` plus `attributes` (ADR-QD-094, ADR-QD-109).
  - **The values:** `evaluateSpan`, `toPredicateSpan`, `decideSubjectsSpan`, `decideSubjectsStreamSpan`,
    `guardHealthCheckSpan`, and the event struct `denialEvent`. Exact names are Claude's discretion.
  - **Each key literal is spelled exactly once in the module.** Fields that several spans share (subject, policy tag,
    action, error tag) are declared once as field and key objects, then spread into the structs. This is the pattern
    `sharedQuestionFields`/`sharedQuestionKeys` set (`PortSpanEncode.ts:127-136`).
  - **`qadi.subject_id` is not spelled here.** The module reuses `sharedQuestionFields.subjectId` and
    `sharedQuestionKeys.subjectId`, so `"qadi.subject_id"` has one spelling in `src`, and a tracer filtering on it
    finds the port spans and the evaluate family under one key.
  - **Package-private,** like `PortSpanEncode.ts`:
    - no package outside core writes or reads these keys (verified above);
    - ADR-QD-099 keeps a module out of the barrel unless another package needs it;
    - so `spec/overview.md` and gate 13 (`check-api-surface.mjs`) do not move.
  - Rejected:
    - **putting the structs in `PortSpan.ts`.** It holds the public types a port description names, and its
      vocabulary is the port's;
    - **one struct for the whole family.** A struct says which keys a span may carry, and one shared struct would let
      `qadi.guardHealthCheck` carry `qadi.evaluation_id`;
    - **exporting the module.** It has no consumer outside core.
- **D-04: Field schemas, all `SpanValue` leaves declared with `Schema.optionalKey`.**
  - **INV-QD-044's type floor** (`PortSpan.ts:41-47`) holds for every field.
  - **`outcome`:** `Schema.Literals(["Allow", "Deny", "Failed"])`, written out as the full closed union (owner
    preference: a closed union over widening). A compile-time tie makes it equal to `Decision["_tag"] | "Failed"`, so
    a third decision tag fails to compile here.
  - **`policyTag`:** `Schema.Literals(POLICY_TAGS)` (`Policy.ts:555`), derived and not restated.
  - **`errorTag`:** `Schema.String`. It spans `EvaluationError` and `toPredicate`'s refusals, and no single tag list
    covers both.
  - **The rest:**
    - `evaluationId`, `action`, `obligations` and `reason` are `Schema.String`;
    - `subjectCount` is `Schema.Number`;
    - `healthy` is `Schema.Boolean`;
    - `predicateTag` is `Schema.String`, unless the planner derives a closed list from `Predicate`'s tags with a
      compile-time tie (Claude's discretion).
- **D-05: What each span asks and answers.** Every span whose call takes `EvaluateOptions.action` carries
  `qadi.action` when one is supplied:

  | Span | Question (annotated before the work) | Answer (annotated after) |
  | ---- | ------------------------------------ | ------------------------ |
  | `qadi.evaluate` | `subject_id`, `evaluation_id`, `policy_tag`, `action`? | `outcome`; `error_tag` on Failed; `obligations` on an Allow that owes some |
  | `qadi.toPredicate` | `subject_id`, `policy_tag`, `action`? | `predicate_tag` on success; `error_tag` on failure |
  | `qadi.guardHealthCheck` | `subject_id`, `policy_tag`, `action`? | `healthy`; `error_tag` when unhealthy |
  | `qadi.decideSubjects` | `subject_count`, `policy_tag`, `action`? | none |
  | `qadi.decideSubjectsStream` | `policy_tag`, `action`? | none |
  | denial event (log on `qadi.evaluate`) | `policy_tag`, `subject_id` | `reason` |

  - **New keys a tracer will see,** all listed in the changeset:
    - question keys on a failed `qadi.evaluate`;
    - question and `error_tag` on a failed `qadi.toPredicate`;
    - `qadi.action` on a translation, a probe and a batch when one was supplied;
    - `subject_id` and `policy_tag` on every probe.
  - **Why the probe and the batch gain keys:** "a span says what was asked" (ADR-QD-051) is one rule for the family.
    A probe that fails without naming what it probed is the same defect as a failed evaluation.
  - **`qadi.decideSubject` stays keyless:** its child `qadi.evaluate` carries the question.
  - **The resource stays off every family span.** A resource is arbitrary data (INV-QD-044), and putting a resource
    id on the root span would be a new disclosure decision, not part of this fix. See Deferred.
- **D-06: The question is annotated before the work that can fail, on every path.**
  - **`decideQuestion`:** right after the evaluation id is settled (`Lifecycle.ts:74`) and before the lookup. The
    existing `tapError` annotates the answer `{ outcome: "Failed", errorTag }`, and the success path annotates
    `{ outcome, obligations }`.
  - **`toPredicate`:** right after `questionOf` (`Predicate.ts:660`), before admission. The failure answer
    `{ errorTag }` is annotated by an `Effect.tapError` inside the span, so it covers every early `return yield*
    Effect.fail` and a port failure. One way to do that is an `Effect.fn` pipeable: Effect 4.1.2 applies pipeables
    inside the span (`internal/effect.ts:1388-1404`). The exact form is Claude's discretion.
  - **`createGuardHealthCheck`:** before the walk.
  - **`decideSubjects`:** already first, now through the struct.
  - **`decideSubjectsStream`:** `Stream.withSpan` attributes built with `encodeSpan`.
  - **Writers:** all of them call `Effect.annotateCurrentSpan(encodeSpan(struct, value))` (or a one-line local
    helper), as `PortAccess.ts` does. `encodeSpan` drops `undefined`, so the conditional spreads at `Lifecycle.ts:155`
    and `:158-160` go.
- **D-07: One key per fact across the family. Only `qadi.evaluate` carries `qadi.outcome`.**
  - `qadi.evaluate` is the only span whose answer is a decision. A translation answers with a predicate and a probe
    with a health reading (a probe never fails), so `qadi.outcome` there would mean something else, or would be
    written on one path only.
  - The facts the spans do share use one key each, declared once:
    - who asked: `qadi.subject_id`;
    - which policy: `qadi.policy_tag`;
    - which action: `qadi.action`;
    - which error ended it: `qadi.error_tag`, now one shared answer field used by three spans.
  - `qadi.predicate_tag` and `qadi.healthy` stay their spans' own answers.
  - A tracer tells a failed span from a finished one by `qadi.error_tag`, and by the span's own status, which
    `Effect.fn` sets.
- **D-08: Obligations, action and the denial event.**
  - **`qadi.obligations`** stays in `qadi.evaluate`'s answer: the comma-joined ids, only on an Allow that owes some.
  - **`qadi.action`** is a question field, so it is now there before the lookup.
  - **The denial event:**
    - it keeps its message and its three keys;
    - its annotations are `encodeSpan(denialEvent, …)`;
    - it stays a debug log, so `qadi.reason` is not copied onto the span's attributes. A reason sentence on every
      Deny span would be a new disclosure and a new cost, and the debug event already carries it where an operator
      turns it on.
- **D-09: Span names come from the declaration.**
  - **Writers:** `Effect.fn(evaluateSpan.name)` and the same for the other four, as the port reads do with
    `Effect.fn(<port>.span)`.
  - **Tests:** the ones this phase rewrites find spans by the declared name.
  - **Unchanged:**
    - the names themselves;
    - name literals in other tests (`Handover.test.ts`, `features/…/port-calls.steps.test.ts:392` and others).
    The new rule counts keys, not names, because `"qadi.attribute"` is both a span name and a port key. See
    Deferred.
- **D-10: `decideQuestion` stays exported.**
  - The planning note's premise is wrong: `decideQuestion` is not "used only in Lifecycle.ts".
    `packages/core/test/Lifecycle.tst.ts:17,26-35` imports it and pins its options parameter as exactly
    `Omit<EvaluateOptions, keyof QuestionOptions>` (ADR-QD-105, CCR-QD-423, `spec/traceability.md:647`). Removing the
    export would delete that pin.
  - The module is already out of the barrel, so the export is package-private.
  - Only its doc comment changes (`Lifecycle.ts:53-63`), to say the span is declared in `EvaluationSpan.ts` and that
    its question is annotated before the lookup.

### Enforcement (ESPN-04), decided autonomously (2026-11-23)
- **D-11: A house-style rule, not a convention: `[span-key-literal]` with `SPAN_KEY_LITERAL_BUDGET`, and
  `[span-key-source]`.** Both run inside `scripts/check-house-style.mjs` (`pnpm lint`), like ADR-QD-123's three
  metric rules, so there is no new gate number and no DoD table change.
  - **The key set is read from the declaration, not restated in the script.** It is every `"qadi.<snake_case>"`
    literal in `EvaluationSpan.ts`, plus the value of `sharedQuestionKeys.subjectId` in `PortSpanEncode.ts`.
  - **`[span-key-source]`:**
    - the key set read is non-empty and has a pinned minimum size, so an extraction that finds nothing fails;
    - each literal appears exactly once in `EvaluationSpan.ts`;
    - in `packages/*/src` and `features/step-definitions`, a family key literal appears only in `EvaluationSpan.ts`
      and in `PortSpanEncode.ts` (for `qadi.subject_id`).
  - **`[span-key-literal]`,** test scope (`packages/*/test`, `packages/*/bench`, the set `METRIC_ID_LITERAL_BUDGET`
    walks):
    - **What it counts:** the exact quoted literals (`"…"`, `'…'`, `` `…` ``) of family keys per file. Comment lines
      are blanked, and `describe`/`it`/`test` titles are excluded, so a title that mentions a key in its prose does
      not count;
    - **The budget:** an exact count per file, checked in both directions;
    - **Rows expected at close, each with its reason:**
      - the contract file (D-12), the tracer-facing golden;
      - the port-span goldens that pin the shared `qadi.subject_id`: `Evaluate.test.ts` (12, `:2844-3213`),
        `PortAccess.test.ts` (3), `PortServe.test.ts` (5), `PortSpan.test.ts` (9), `Predicate.test.ts` (3,
        `:1671,1714,1732`), `packages/devtools/test/model/PortCalls.test.ts` (1);
      - `packages/testing/test/CollectingTracer.test.ts` (2), where the key is an arbitrary attribute in a tracer
        test;
      - `packages/devtools/test/model/Source.test.ts` (2), which pins devtools' own `qadi.reason` log key.
    - The planner re-counts every row at the phase base with the rule's own regex before writing the budget.
  - **AGENTS.md** gains a §6 paragraph and table, "a span key is declared once, and read through its declaration",
    following the shape of `METRIC_ID_LITERAL_BUDGET`. The script's header list gains the new budget. The budget and
    the table change together (WX-04).
  - **Each check is seen failing once:**
    - a hand-typed family key added to a test;
    - one added to `Lifecycle.ts`;
    - a key spelled twice in the declaration;
    - an emptied key set.
  - Rejected:
    - **a blanket "no `"qadi.*"` literal" rule.** `packages/*/src` holds about 70 distinct `qadi.*` literals that are
      span names and log keys of other modules (devtools, audit, http);
    - **a key list inside the script.** It would be a second statement of the keys;
    - **converting the port-span goldens now.** That is a rule about port keys. See Deferred.

### Tests (ESPN-02, ESPN-04, WX-06), decided autonomously (2026-11-23)
- **D-12: The contract is written first, on the phase base, before any source change:
  `packages/core/test/EvaluationSpan.contract.test.ts`.**
  - It uses literal keys, because the declaration does not exist on the base and these keys are the external
    contract. Its inputs, titles and expected values are fixed for the rest of the phase.
  - **The "kept" section,** green on the base three runs out of three. On every path, every key the base writes
    other than `qadi.decision` keeps its value, and the outcome's value is unchanged under whichever key carries it.
    The paths:
    - evaluate: Allow, Deny, Failed, with an action, without one, with obligations, owing nothing, a cache hit
      (`decisionCacheLayer`), and inside `decideSubjects`;
    - `toPredicate` success;
    - probe healthy and unhealthy;
    - `decideSubjects` and the stream;
    - the denial event's annotations (through `collectingLogger` with `MinimumLogLevel` Debug).
  - **The "changed" section,** RED on the base and GREEN at close. Each row pins the exact attribute map:
    - a failed `qadi.evaluate` carries `qadi.subject_id`, `qadi.evaluation_id`, `qadi.policy_tag` (and
      `qadi.action` when supplied) beside `qadi.outcome: "Failed"` and `qadi.error_tag`. This is the ESPN-02
      regression;
    - Allow and Deny carry `qadi.outcome` and no `qadi.decision`;
    - a failed `qadi.toPredicate` carries its question and `qadi.error_tag`, on each failure kind (too deep, fields,
      untranslatable, port failure);
    - the probe carries its question;
    - `qadi.action` appears on a translation, a probe and a batch when one was supplied.
  - `75-RED-EVIDENCE.md` records every RED row's failure output on the base.
- **D-13: Every other test reads keys through the declaration.**
  - **Files:** the `Evaluate.test.ts` observability block and denial-log test (its 21 family literals),
    `Predicate.test.ts:1923-1937`, `SubjectSet.test.ts:553-616` and `GuardHealthCheck.test.ts:160-172`.
  - **The form:**
    - an exact expectation is built with `encodeSpan(struct, value)`, so map equality still pins no extra keys;
    - a single value is read with `decodeSpan`, or with `struct.keys.<field>`.
  - **New tests:**
    - `EvaluationSpan.test.ts` states the declaration's own rules with no hand-typed key: each span's question and
      answer keys are disjoint, the shared fields are the same objects across spans, and `encodeSpan` drops an absent
      action and obligations;
    - `EvaluationSpan.tst.ts` pins the outcome union and its tie to `Decision["_tag"]`, and that a non-`SpanValue`
      field does not compile (by `@ts-expect-error` on a held value, or as a counted negative pin with a positive
      twin under `NOT_CALLABLE_PIN_BUDGET`, AGENTS.md §6 table edited together).
- **D-14: Each guarantee is seen failing once.**
  - **What to gut:**
    - move `decideQuestion`'s question annotation after the lookup;
    - write `qadi.decision` back;
    - drop `toPredicate`'s `tapError`;
    - drop the probe's question;
    - break the outcome tie;
    - each D-11 check.
  - Revert each gut with `git checkout`, and record each in the RED evidence.

### Mutation, measurement and records (ESPN-05, WX-02, WX-05), decided autonomously (2026-11-23)
- **D-15: Mutation base at the phase base, before any source edit.**
  - **Scorer.** `75-mutation.mjs` copies `74-mutation.mjs`'s discipline:
    - base and close records, a clean tree, one head per record;
    - `record close <group> --restart`, and a base is never restarted;
    - the removed-mutant rule;
    - an `EXAMINED` table admitted only after a by-hand `ignoreStatic: false` kill;
    - `--self-test`.
  - **Groups,** through `stryker.config.mjs`:
    - `core` = `Lifecycle.ts`, `Predicate.ts`, `SubjectSet.ts`, `GuardHealthCheck.ts`;
    - `span` = `EvaluationSpan.ts`, close-only, because it has no base: every mutant must be killed or examined, and
      the self-test pins that;
    - `PortSpanEncode.ts` joins `core` only if a plan changes its code. A doc-comment edit does not count.
  - A drop is closed with a test, never re-baselined.
- **D-16: The cost is measured, not assumed.**
  - Every evaluation now makes two annotations instead of one (question, then answer).
  - Run `pnpm bench` on `packages/core/bench/Evaluate.bench.ts` (`one node`, `resolver miss — one port call`, one
    composite workload) at the base and at close, interleaved the way CCR-QD-189 did. Record the figures and their
    spread in ADR-QD-188.
  - There is no gate. ADR-QD-034's habit is that a performance claim carries a figure.
- **D-17: Records.**
  - **ADR-QD-188,** "The evaluate family's spans are declared once, and a failed span says what was asked":
    - records D-01..D-11 with the rejected options above;
    - extends ADR-QD-051 (its rule "the question before the call, the answer after" now covers the family) and
      ADR-QD-109 (the question/answer struct pattern, applied outside the port registry);
    - states what the compiler enforces (`SpanValue` fields, the outcome union and its tie, the `qadi.` key namespace)
      and what only the rule and the tests enforce (write order, one spelling, tests reading through the
      declaration).
  - **Dated amendments, never a rewrite of history:**
    - ADR-QD-051 and ADR-QD-109 each gain an amendment and a Change History row pointing at ADR-QD-188;
    - BEH-QD-317's span sentence (`05-evaluator.md:302-304`) gains a dated note: the probe's span now also carries
      its question (BEH-QD-714);
    - ADR-QD-100:47-48 is history and is left as written;
    - INV-QD-044 gains a dated note that its type floor covers the family's structs.
  - **BEH-QD-711..715** go in `spec/behaviors/30-port-calls.md`, in a new section after BEH-QD-227, because that doc
    is where qadi's spans are described (BEH-QD-227's listing, BEH-QD-267's `qadi.toPredicate`). Its intro line
    widens from the port calls to "and the spans around a question". Each requirement carries a ` ```ts ` listing
    like BEH-QD-227's:
    - 711: `qadi.evaluate` carries its question on every path, annotated before the lookup;
    - 712: its outcome is `qadi.outcome` ∈ {Allow, Deny, Failed}, with `qadi.error_tag` only on Failed,
      `qadi.obligations` only on an Allow that owes some, and no `qadi.decision`;
    - 713: `qadi.toPredicate` carries its question before translation and its answer after (`predicate_tag` or
      `error_tag`);
    - 714: the probe and the subject-set spans carry their questions (`action` when supplied), and the probe answers
      `healthy` and `error_tag`;
    - 715: every key of the family is declared once (`EvaluationSpan.ts`, with `qadi.subject_id` shared with the port
      spans) and written only through it, the denial event included, and a hand-typed key is refused by
      `[span-key-literal]`/`[span-key-source]`.
  - **INV-QD-395:** a span of the evaluate family carries its question on every path that reaches its work: the
    question is annotated before anything that can fail, so a failed span says what was asked.
  - **INV-QD-396:** one fact has one key across the family. Every key is stated once, every field is a `SpanValue`,
    the four writers write keys only through the declaration, and `qadi.evaluate`'s outcome is under `qadi.outcome`
    on every path.
  - **Traceability, the CCR row and the changeset:**
    - `spec/traceability.md` gets rows for the five BEHs, the two INVs, ADR-QD-188 and each new test file;
    - CCR-QD-467 cites every revision and lists every changed file outside `.planning/`. All reserved ids are
      expected to be used; it names any that are not;
    - `.changeset/core-evaluate-span-declared.md`, `"@qadi/core": minor` (a pre-1.0 breaking change is a minor
      here, as in `core-decision-cache-asked-the-question.md`). It opens with **Breaking** and gives:
      - the rename `qadi.decision` → `qadi.outcome`;
      - the question keys now on a failed span;
      - the new keys on translation, probe and batch spans;
      - that nothing is dual-written, so a tracer query on `qadi.decision` must move to `qadi.outcome`.
    - `apps/website/src/content/docs/docs/reference/upgrading.md` gains a "0.13:" section with the same content,
      as the decision-cache change did (`:1065`).
  - **AGENTS.md §6** changes (D-11). `PortSpanEncode.ts`'s header, which says its machinery serves port spans
    (`:1-27`), gains a sentence that the evaluate family builds with it too.
  - Spec registers are revised only through `node scripts/spec-revise.mjs <doc> "<what>" --date 2026-11-23`.

### Claude's Discretion
- **Exact names:**
  - the span values;
  - the shared field and key objects;
  - whether a small `annotate(struct, value)` helper is worth a line, and where it lives (a helper with one consumer
    lives in that consumer).
- **How `toPredicate` catches its failure:** an `Effect.fn` pipeable or a wrapping `Effect.tapError`, provided every
  failure path is covered and a contract row proves it.
- **`predicateTag`:** a closed derived literal (with a compile-time tie), or `Schema.String`.
- **Contract file layout:** its helper layout and row order.
- **Plan split.** Suggested, strictly serial, one test runner at a time:
  1. ADR-QD-188 and its index row (the checkpoint record), then base facts;
  2. the contract file (kept rows green, changed rows RED), the RED evidence and the mutation base, all on the phase
     base;
  3. `EvaluationSpan.ts` with its `.test.ts` and `.tst.ts`;
  4. the four writers on it, with the contract going green;
  5. tests read through the declaration, and the house-style rule and AGENTS.md §6 with their guts;
  6. measurement, records, changeset, upgrade note and close.
- **Constraints:**
  - no `as` (beyond `as const`), `!`, `any`, `switch` or `Record<string, unknown>` added;
  - `Match` for tag dispatch;
  - `Effect.fn` stays traced (no `Effect.fnUntraced`, `UNTRACED_BUDGET` untouched);
  - ~90-column hand wrapping;
  - doc comments lead with a one-line summary and claim only what the compiler, the rule or a test enforces;
  - no phase numbers, plan ids, requirement ids or D-numbers in source, tests, titles or spec.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wave and phase scope
- `.planning/ROADMAP.md` — "### Phase 75:" (goal, checkpoint, success criteria, planning notes).
- `.planning/REQUIREMENTS.md` — ESPN-01..05, WX-01..07.
- `.planning/phases/_WAVE13-CONTEXT.md` — Phase 75 evidence, the reserved ids, execution order.
- `.planning/phases/_SHARED-CONTEXT.md` — house rules, verify-command hygiene (zsh: `bash -c`, `/usr/bin/grep`), the
  XC-05 mutation procedure.
- `.planning/phases/QD-74-the-simulation-session-s-policy-choice-split-from-its-runs/74-mutation.mjs` — the scorer
  to copy.

### House rules
- `AGENTS.md` §5 (`Effect.fn`, `UNTRACED_BUDGET`), §6 (budgets; `METRIC_ID_LITERAL_BUDGET` and
  `NOT_CALLABLE_PIN_BUDGET` are the models), §7a (`PortSpanEncode.ts`'s budgeted decode tokens), §9 (barrels,
  ADR-QD-099), §11 (spec is normative), §15 (gates).
- `scripts/check-house-style.mjs:2195-2410` — the ADR-QD-123 metric rules, the shape the new rule copies;
  `:1098-1124` — the src and test file sets.

### Decisions
- `spec/decisions/051-a-span-says-what-was-asked.md` — the question before the call and the answer after; the
  amendments of CCR-QD-153, -177, -198 and -382.
- `spec/decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md` — the question/answer structs,
  `pose`/`disclose`, one read body.
- `spec/decisions/094-*.md` (a port is described once; span names read from the description), `123-*.md` (a metric
  is declared once: the literal-budget precedent), `099-*.md` (closed entry points), `100-*.md` (the probe walks and
  its span), `105-*.md` (`decideQuestion`/`ask`), `135-*.md` (sink record fields stated once: the same fix for the
  record), `034-*.md` (a measured claim).

### Spec registers
- `spec/behaviors/30-port-calls.md` — BEH-QD-227 (the model listing), BEH-QD-267; the new BEH-QD-711..715 go here.
- `spec/behaviors/05-evaluator.md:278-304` — BEH-QD-317 (the probe's span sentence).
- `spec/invariants.md` — INV-QD-044 (`:1869`), INV-QD-102 (`:3223`), INV-QD-244 (`:3539`).
- `spec/traceability.md` — `:72` (the 30-port-calls row), `:225`, `:303`, `:338`, `:418-419`, `:647`.
- `spec/README.md` — Document history and the CCR table.
- `.changeset/core-decision-cache-asked-the-question.md` — the minor-and-Breaking changeset shape.
- `apps/website/src/content/docs/docs/reference/upgrading.md` — the "0.13:" sections (`:618-1065`).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`PortSpanEncode.ts`:**
  - `spanStruct` (`:40-62`), whose key map must name every field and keys must be `qadi.`-namespaced;
  - `encodeSpan` (`:71-82`), a table walk that drops `undefined`;
  - `decodeSpan` (`:121-124`), lenient per field;
  - `sharedQuestionFields`/`sharedQuestionKeys` (`:127-136`).
- **`PortSpan.ts`:** `SpanValue` (`:32`), `SpanFields` (`:41-47`), `SpanKey` (`:50`), `SpanType` (`:56-59`),
  `SpanStruct` (`:69-73`).
- **`Policy.ts:555`:** `POLICY_TAGS` (already used for `denialsByPolicyTagTotal`, `EvaluationMetrics.ts:106`).
- **Test helpers:** `packages/core/test/helpers.ts`'s `collectingTracer` (`:93`) and `collectingLogger` (`:137`),
  `testLayer`, `subjectWith`, and `scriptedPort(…, () => PortReply.fail("down"))` for a failing port (AGENTS.md §6
  `PORT_DOUBLE_BUDGET`: never a hand-built failing layer).

### Established Patterns
- **Port reads (`PortAccess.ts`):** a plain annotate helper that opens no span (`:82-111`); question first, then the
  work, then the answer inside the same mapping (`readPort` `:198-215`).
- **The `Effect.fn` name:** it can be a declared value, `Effect.fn(attributeResolverPort.span)` (`PortAccess.ts:326`).
- **Literal budgets:** an exact count per file, both directions, with comment lines blanked and test titles excluded
  (`METRIC_ID_LITERAL`, `check-house-style.mjs:2250-2251`).
- **Phase discipline (Phases 69–74):** characterisation and regression first, RED evidence in `NN-RED-EVIDENCE.md`,
  mutation base and close.

### Integration Points
- **The flow:**
  - `evaluate` → `ask` → `decideQuestion` (`Lifecycle.ts:198-205`);
  - `decideSubject` → `evaluate`, so every subject-set element emits its own `qadi.evaluate`;
  - `toPredicate` and `createGuardHealthCheck` call `questionOf` and `walk`/`run` directly.
- **Tests:**
  - `Evaluate.test.ts:2439-2612` and `:3404-3438`;
  - `Predicate.test.ts:1923-1937`;
  - `SubjectSet.test.ts:553-616`;
  - `GuardHealthCheck.test.ts:160-172`;
  - `Lifecycle.tst.ts` (unchanged);
  - `DecisionCache` and `Handover` tests that find `qadi.evaluate` by name (unchanged).
- **Spec:** `30-port-calls.md`, `05-evaluator.md`, ADR-QD-051/109, `invariants.md`, `traceability.md`, `README.md`,
  `decisions/index.yaml`; AGENTS.md §6; the changeset; the upgrade guide.

</code_context>

<specifics>
## Specific Ideas
- **The ESPN-02 regression is the first RED row:** a store outage (`scriptedPort(attributeResolverPort, () =>
  PortReply.fail("down"))`) under `evaluationIdSequential`. It asserts the failed span's map is exactly
  `{ subject_id, evaluation_id: "eval-1", policy_tag, outcome: "Failed", error_tag: "AttributeResolveError" }`.
- **Count what the gate counts with the gate's own regex,** at the base and at close. A hand count of "114" mixed
  span names and port keys with family keys (only 21 are family keys).
- **Watch the cache-hit row.** A hit must leave the same question and answer keys as a miss. INV-QD-025 says a hit
  differs only in speed.

</specifics>

<deferred>
## Deferred Ideas
- **A rule that port-span keys in tests are read through each port's description** (`attributes.question.keys`). It
  would retire the port-golden rows in `SPAN_KEY_LITERAL_BUDGET`, but it is a rule about port spans, outside ESPN.
- **A span-name literal rule** (tests finding spans by a declared name). Names and port keys collide
  (`"qadi.attribute"`), so it needs its own design.
- **`qadi.resource_id` on the root span.** That would be a new disclosure decision, not this fix.

</deferred>
