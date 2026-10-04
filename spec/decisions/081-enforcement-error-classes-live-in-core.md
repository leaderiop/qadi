# ADR-QD-081 — Enforcement-error classes live in core; the HTTP description is one derived table

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-081                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-04                                     |
> | Status         | Accepted — amends ADR-QD-072, ADR-QD-075       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-04): Initial release (CCR-QD-155, ARCH-04) |

---

## Context

The enforcement-error taxonomy — which of denial, outage or wiring mistake each tag is, what HTTP
status that answers with, which wire schema carries it, which tags a middleware declares — was spelled
out in about sixteen places across five packages. Experiments run before this change (ARCH-04 §1) settled
three things the prose had only assumed:

- **The two HTTP routing shapes could disagree on a status, silently (E6).** Each `httpApiStatus` schema's
  status was a hand-picked `.pipe(outage)` / `.pipe(wiringMistake)`, independent of `toResponse`'s
  classification. Flipping one compiled and passed all 67 tests, because the OpenAPI test compared only the
  *set* of statuses. BEH-QD-177's title, "One status mapping, shared by both adapters", was true only because
  nobody had edited it.
- **Omission from the middleware's `error:` list was compile-forced for nine of twelve tags (E7).** The three
  hand-caught tags never reached the middleware's error channel, so dropping their schemas compiled cleanly
  and failed only at runtime.
- **`RequirePermissionLive`'s three hand-written arms were behaviorally redundant (E5).** Deleting them left
  every test green and every body byte-identical, because HttpApi's encoder already redacts by selecting
  declared fields. Their mutants had already been recorded as surviving.

The partition itself was also in the wrong package. INV-QD-006 is transport-neutral, but it lived in
`@qadi/http` as a `Match.tagsExhaustive`, so the Next.js example kept a hand list of its own that called an
unmet obligation an outage and omitted two tags, which then escaped to the caller as a rejected Promise.

## Decision

**D-04-a: the class table lives in core; status, schema and projection live in `@qadi/http`.**
`@qadi/core`'s `Errors.ts` gains `EnforcementErrorClass`, a total tag-keyed `ENFORCEMENT_ERROR_CLASSES`
beside `ERROR_CODES` (ADR-QD-008's pattern, applied a second time), `classifyEnforcementError`, and the tag
tuples `ENFORCEMENT_ERROR_TAGS` and `ENFORCEMENT_DENIAL_TAGS`. `EnforcementError` moves from `Qadi.ts` to
`Errors.ts`. `@qadi/http` gains `ENFORCEMENT_ERROR_WIRE`, keyed by the twelve tags it answers, each entry
carrying its class (read from core), its status (derived from the class, never chosen), its
`httpApiStatus`-annotated schema and a typed projection. An HTTP status stays out of core, as ADR-QD-072
requires.

**D-04-b: `StandingEvaluationServices`.** `Exclude<EvaluationServices, CurrentSubject>` is named once in
`Evaluate.ts`; `SubjectSetServices`, `QadiRuntimeServices`, `EvaluationServicesNone`, `@qadi/promise`'s
`QadiLayer`, `DecisionStreamRoute.ts` and `RequirePermissionLive` use it. `RequirePermission.ts` had argued
against a core export as "a third public export three packages would need to agree stays in sync"; that
premise was false — core already exported one, and `Exclude` itself enforces the agreement.
`GuardRoute.ts`'s own `Exclude<R | EvaluationServices, CurrentSubject>` stays: it is deliberate and pinned by
`GuardRoute.tst.ts`.

**D-04-c: one in-channel projection replaces the three hand-written arms.** `RequirePermissionLive` fails
with `projectHttpEnforcementFailure(error)` for every tag, and `HttpApiMiddleware`'s encoder builds every
response. Redaction stays explicit and type-checked: each entry's `project` is typed to return exactly its
schema's `Type`. All twelve tags are now compile-forced into `error:`, which closes E7. This **amends
ADR-QD-072**: "hand-converts these three to an empty-body response" becomes "projects all twelve in-channel to
their redacted wire type".

**D-04-d: the moved exports move without re-export shims.** `ENFORCEMENT_ERROR_TAGS`,
`EnforcementErrorClass` and `classifyEnforcementError` are no longer exported by `@qadi/http`, and
`DENIAL_STATUS` is replaced by `HTTP_STATUS_BY_CLASS`. Each name has one home. This is breaking for importers
of those names, shipped as a `minor` changeset marked breaking (every package is 0.x and in one `fixed` group).

**D-04-e: `SubjectExtractionFailed` is a row in the wire table.** Its class (`outage`) is declared in a local
extension of core's table, its 502 is derived, and `SubjectExtractionRefused` is a view onto its entry.

## Alternatives considered

- **Everything in `@qadi/http`.** The least churn, but the class stays unreachable to core's other adapters and
  the Next.js example has already drifted for lack of it.
- **Everything in core, including status and schema.** Wrong, not merely expensive: it contradicts ADR-QD-072's
  "an HTTP status code is a transport concern, and `@qadi/core` has no dependency on `effect/http-api`".
- **Keep the three hand-caught arms**, reading their status and schema from the table. Leaves two
  response-building paths and keeps E7's non-forced omission.
- **Delete the arms and let the encoder redact by field selection.** Byte-identical today, but then the only
  thing keeping `trace` out is the schema's declared fields; ADR-QD-072's negative consequences explicitly keep
  an explicit step as the mitigation.
- **Re-export the moved names from `@qadi/http`.** Non-breaking, but two import paths for one concept and a
  gate-13 row per re-export. A pure addition if ever wanted.
- **Reuse `SubjectSetServices` everywhere** instead of a new alias. The name is wrong outside subject sets.

## Consequences

**Positive**:

- Adding an enforcement error is one entry in each of two tables, and every omission is a compile error: in
  `@qadi/http` exactly one site, the `satisfies` on `ENFORCEMENT_ERROR_WIRE`.
- The two routing shapes cannot disagree on a status; both read `HTTP_STATUS_BY_CLASS`. INV-QD-060 states it
  and a differential test enforces it.
- Core consumers (the examples, future adapters) get the classification for free, and the Next.js example no
  longer misclassifies `UndischargedObligation` or lets two tags escape.

**Negative** (named honestly):

- **Static mutants.** ADR-QD-076's `ignoreStatic` skips module-scope mutants. Moving logic from `Match`
  closures (runtime, mutated) into module-scope tables (static, now skipped) removes that mutation coverage. It
  is replaced by hand-written expectations for every entry (`Errors.test.ts`, `QadiHttpError.test.ts`) and by
  tstyche completeness tests in both directions (`Errors.tst.ts`, `QadiHttpError.tst.ts`).
- A breaking change for `@qadi/http` importers of the three moved names and of `DENIAL_STATUS`.
- `Record.values` order now defines the OpenAPI declaration order; the table keeps the order of the hand list it
  replaces.

**Implemented**: `packages/core/src/Errors.ts`, `packages/core/src/Qadi.ts`, `packages/core/src/Evaluate.ts`,
`packages/core/src/SubjectSet.ts`, `packages/core/src/EvaluationServicesNone.ts`,
`packages/http/src/QadiHttpError.ts`, `packages/http/src/RequirePermission.ts`,
`packages/http/src/DecisionStreamRoute.ts`, `packages/react/src/QadiAtoms.ts`, `packages/promise/src/index.ts`,
`spec/behaviors/07-enforcement.md` (BEH-QD-270), `spec/behaviors/23-http.md` (BEH-QD-177, BEH-QD-260),
`spec/invariants.md` (INV-QD-060).
