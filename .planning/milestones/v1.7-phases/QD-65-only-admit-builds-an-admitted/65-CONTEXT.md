# Phase 65: Only `admit` builds an `Admitted` - Context

**Gathered:** 2026-11-20
**Status:** Ready for planning

<domain>
## Phase Boundary

`packages/core/src/Admission.ts`'s `Admitted` has a public constructor, and `admit` builds it with
`SUPPLIED[rowSource](question)` beside a matcher context that reads `question.resource` a second time; the two agree only
because tests (E1–E5, `LeafMatrix.test.ts`) say so. After this phase:
- `Admitted` can be built only by `admit` (a private constructor **and** a private instance member, because a private
  constructor alone still lets a same-shape object literal type-check as `Admitted`);
- the `"asked"` row's supplied flags are derived from the matcher context `admit` builds, so the resource is read once
  and the flag and the context agree by construction. The `"row"` row stays a constant `resource: true`.

ARCH-112, audit items 59a and 59b. Package: `@qadi/core`, package-private (ADR-QD-099), **no changeset**. Records:
- ADR-QD-172 amended (its statement that the "asked" flags are pinned by tests becomes false);
- ADR-QD-178 named Unused in the CCR row;
- CCR-QD-456;
- BEH-QD-661–665 and INV-QD-375–376 as needed, unused ids named Unused in the CCR row;
- traceability.

Requirements: ADMT-01..04, plus the cross-cutting WX-01..07.

</domain>

<decisions>
## Implementation Decisions

### Construction lock (ADMT-01, ADMT-02)
- **Brand form:** a `declare private readonly` brand member if it compiles under this tsconfig (no runtime slot on the
  admission path); otherwise a TypeScript `private readonly` field set in the constructor. The planner probes which
  works and records the probe. Not an ES `#brand` field.
- **Constructor:** private. `admit` becomes `Admitted`'s static method, naming `Admitted` and never `this`, and the
  module exports `export const admit = Admitted.admit`. Research probed this: no TS2883, the generic is kept, and the
  `Walk.ts:878` (`admit(question, "asked")`) and `Predicate.ts:664` (`admit(question, "row")`) call sites stay
  unchanged. The `ADMISSION_ALLOWED` count stays at 1.
- **Pins (ADMT-01):** two refusals, each RED on the phase base, each with a positive control on `admit`:
  1. `new Admitted(…)` outside the class;
  2. an object literal of `Admitted`'s shape not assignable to `Admitted`.

  Each refusal is a `@ts-expect-error` **plus** a tstyche `toRaiseError(<code>)` naming the reason: 2673 for the
  private constructor, and for the literal the code probed at plan time against the real compiler (`tsgo` 7.0.2's
  wording is unverified, so the code, not a message, is the check). `@ts-expect-error` alone is reason-blind (the
  phase 62 lesson). Never `not.toBeConstructableWith`.
- **Where:** in the existing `packages/core/test/WalkEnvironment.tst.ts`, which already pins `Admitted`'s shape. The
  `keyof Admitted` pin there stays green **unedited** (private members are excluded from `keyof`), and the plan
  asserts that.
- Any grep or gate about construction is scoped to `packages/core/src/Admission.ts`:
  `packages/audit/src/CircuitBreaker.ts` has an unrelated `new Admitted(...)`.

### Deriving the "asked" flags (ADMT-03)
- **Shape:** `admit` builds the matcher context once, and the `SUPPLIED` table's functions take that `MatcherContext`:
  - `asked`: `resource: context.resource !== undefined`, `action: context.action !== undefined`;
  - `row`: `resource: true`, `action` from the context.

  The table keeps its `{ readonly [Source in RowSource]: … }` shape checked against `SuppliedBy`, so a new row source
  still fails to compile, and a `"row"` row that stops supplying the resource still fails to compile.
- **RED on the phase base:** a value test cannot be red, because behaviour already agrees. The RED case is a
  `Question` whose `resource` is a getter returning a value on one read and `undefined` on the next (written without
  `as`):
  - today the flag and the matcher context disagree (two reads);
  - after the change they agree (one read).
- **E1–E5 and `LeafMatrix.test.ts` pass unedited.**
- **The INV** states that the flags are derived from the context `admit` builds, so the resource is read once. It
  does **not** claim a compile-time guarantee, because `SuppliedBy.asked` has `boolean` fields. ADR-QD-172's
  "pinned by the tests, not the type" sentence (and `SUPPLIED`'s doc comment) are amended to the new truth.

### Gates and records (ADMT-04, WX)
- **Mutation:** Stryker base on `Admission.ts`, `Walk.ts` and `Predicate.ts` before any edit, the same invocation at
  close; no touched file's score may drop. Mind `ignoreStatic` (phase 57 pitfall).
- **Benchmark (ADMT-04):** Phase 59's harness (`ab.sh`, hard-wired to `Evaluate.bench.ts`, correct here) and bands,
  3 + 3 interleaved, the committed source against the phase base, `uptime` recorded. No workload slower beyond its
  band. Any executable edit after the bench invalidates it: the committed source is benched, and a revert is a patch.
- **ADR:** amend ADR-QD-172 only (`spec-revise --date 2026-11-20`, an "amended 2026-11-20" status note, and the
  `index.yaml` entry). ADR-QD-178 is named Unused in CCR-QD-456: the private constructor implements 172's existing
  "only `admit` builds one", so there is no new decision.
- **No changeset:** `Admission.ts` is package-private and no public behaviour changes.
- **Reserved ids only.** Never run `scripts/next-id.mjs`. Always pass `--date 2026-11-20` to `spec-revise.mjs`.

### Claude's Discretion
- Which BEH/INV ids are used and their exact wording, within the reserved ranges.
- The exact TypeScript error code for the object-literal refusal (probed at plan time).
- Test titles and ids for the RED getter case.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/src/Admission.ts` (117 lines): `RowSource`, `SuppliedBy`, the `SUPPLIED` table (~line 59), the
  `Admitted` class (~line 81, public constructor with six readonly parameters), and `admit` (~line 97).
- `packages/core/test/WalkEnvironment.tst.ts`: tstyche pins on `Admitted` (`keyof Admitted`, row vs asked `supplied`
  types, a negative callable pin on `admit` with its twin).
- `packages/core/test/Admission.test.ts`: depth cases and E1–E5; `LeafMatrix.test.ts`.

### Established Patterns
- `NOT_CALLABLE_PIN_BUDGET` counts negative `toBeCallableWith`/`toBeConstructableWith` pins per type-test file and
  requires a positive twin; a `@ts-expect-error` or `toRaiseError` is not one of those, but check that adding pins to
  `WalkEnvironment.tst.ts` leaves its budget row (2) correct.
- `ADMISSION_ALLOWED` in `scripts/check-house-style.mjs` (~line 592) allows `admit` calls only in `Admission.ts` (1) and
  `Walk.ts` (1); it must stay consistent.
- Phase 62/63/64 house rules: RED first on the phase base; scratch outside the repo or in gitignored `.scratch/`;
  executors never tick WX-*; `check:pr` runs alone.

### Integration Points
- `Walk.ts:878` `admit(question, "asked")` and `Predicate.ts:664` `admit(question, "row")`: unchanged.
- `toPredicate` builds its question with `resource: undefined` on purpose, which is why the `"row"` row cannot derive.

</code_context>

<specifics>
## Specific Ideas

- The construction pins must each be seen failing for the reason they name: a positive control on `admit` beside each,
  and the error code checked.
- The RED getter case is the evidence for 59a; the INV says plainly that the compiler does not guard the flags.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
