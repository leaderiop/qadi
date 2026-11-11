# Phase 29: Small facts restated by hand - Context

**Gathered:** 2026-11-11
**Status:** Ready for planning
**Ticket:** ARCH-77 · 2026-11-11 review footnotes
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`, then `.planning/phases/_WAVE7-CONTEXT.md` (base `965ff14c`, numbering row 29)
**Runs after:** Phases 21–28. Three of them touch these files first: Phase 21 rewrites the port descriptions (derived `key`/`defect`,
possibly a shared request struct), Phase 22 rewrites `PortAccess.ts`'s scoped reads, Phase 25 makes the Simulator session-only.
Plan 29-01 re-reads every file at its base and has a precondition on 25's SUMMARY for the devtools sentence.

<domain>
## Phase Boundary

Three locality fixes, one per package, none a defect (every restatement below is compiler-checked or test-pinned today):
1. **core:** `PortName` and `PortSpanName`, a port's identity, move out of the metrics module into a leaf with no metrics.
2. **react:** `HydrationEngine.ts` states each entry's withheld-field list once, for both the wire schema and `dehydrateDecision`.
3. **devtools:** the "This is not a denial" failure sentence is one constant read by the Inspector and the Simulator.
No behaviour, wire byte, rendered text or metric key changes.
</domain>

<evidence>
## Evidence (re-verified by reading at `965ff14c`, 2026-11-11)

### TIDY-01 (core)
- `packages/core/src/PortMetrics.ts:60-65` `PortName` (5-member union) and `:75-80` `PortSpanName` (5 span literals) sit in the
  module that declares the four port metrics (`portCallsTotal` :106, `portRetriesTotal` :125, `portTimeoutsTotal` :139,
  `servedPortCallsTotal` :155, plus `predicatePortCallsTotal` :191 over `PredicatePortName` :171). `PORT_NAMES_BY_NAME` (:82-88, a
  `Record<PortName, true>`) is the metrics' preregistered words and stays with them.
- **The review undercounted the importers.** `type { PortName }` from `./PortMetrics.ts` in src: `PortDescription.ts:32` (also
  `PortSpanName`), `PortServing.ts:25`, `Ports.ts:31`, **and** `PortDerivation.ts:33`, `PortAccess.ts:45`, `PortDoubles.ts:25`,
  `PortRemote.ts:35` (seven modules). In core tests: `PortsLayer.test.ts:32`, `PortAccess.test.ts:29`, `PortSpan.test.ts:28`,
  `PortServe.test.ts:24`, `PortConformance.test.ts:60`, `Ports.test.ts:47`, `Ports.tst.ts:18`, `PortSpan.tst.ts:10`,
  `PortRemote.test.ts:32` (nine files). Other packages import `PortName`/`PortSpanName` from `@qadi/core`'s root
  (`devtools/src/model/{Wiring,PortCalls,Capture,SimulationSource}.ts`, `http/src/{PortRouteAddress,RemotePorts}.ts`), which
  does not change.
- Each description writes its span as a literal (`AttributeResolver.ts:175`, `DecisionHistory.ts:182`,
  `RelationshipResolver.ts:231`, `CustomPredicate.ts:209`, `SignatureHistory.ts:245`), checked against
  `PortDescription.span: PortSpanName` (`PortDescription.ts:139`).
- **"Derive `PortSpanName` from the descriptions' literals" does not work as the review hoped.** Every description is declared
  with an explicit `PortDescription<…>` annotation (e.g. `AttributeResolver.ts:164-172`) and `span` is typed `PortSpanName`, so
  `typeof attributeResolverPort["span"]` is the whole union, not `"qadi.attribute"`. Deriving from descriptions would need a span
  type parameter on `PortDescription` and the literal restated in each annotation (more restatement, not less), and the derived
  type could only live in `Ports.ts` (which imports every port), so `PortDescription.ts` could no longer constrain `span` without a
  cycle. The inverse derivation works and is stronger: one five-row table in the leaf states each port's name and span together;
  `PortName` and `PortSpanName` are read from it, and `PortDescription.span` becomes `PortSpanOf<N>`, so a description can name
  only **its own** port's span (today `attributeResolverPort` could claim `"qadi.acted"` and compile). See D-02.
- Re-check after Phase 21: if its plans replaced the explicit annotations with an inferring builder, re-read whether a
  description's type now keeps its span literal; D-02 holds either way (the leaf cannot import descriptions without a cycle).

### TIDY-02 (react)
- `packages/react/src/HydrationEngine.ts:94-97` `AllowEntry = DecisionWireAllow.mapFields((fields) => ({ ...Struct.omit(fields, ["subjectId", "trace"]), disclosure: AllowDisclosure }))`;
  `:99-102` `DenyEntry` omits `["subjectId", "trace", "obligations", "reason"]`. `dehydrateDecision` (:222-235) repeats both lists
  in `Struct.omit(wire, […])` (:225, :230). Nothing checks the two copies agree except a decode of a dehydrated payload.

### TIDY-03 (devtools)
- `packages/devtools/src/react/Inspector.tsx:172-182` `FailurePanel` and `react/Simulator.tsx:498-509` `SimulatedFailure` both
  render "A lookup this evaluation depended on failed, so nothing was decided. This is not a denial." (wrapped differently in
  JSX). Tests pin the words: `test/react/Inspector.test.tsx:45` ("not a denial"), `test/react/Simulator.test.tsx:174` ("This is not
  a denial"), `test/react/DevtoolsDock.test.tsx:519`.
- Phase 25 rewrites `Simulator.tsx` (session-only; readings move into the session snapshot) and was told not to add a third copy.
  Where the Simulator's copy lives after 25 (still in `SimulatedFailure`, or in a session reading) is read at 29-01's base.
- `model/Verdict.ts` owns the rule the sentence states ("An `EvaluationError` is not a denial", header :1-16) and is under the
  devtools mutation gate (`stryker.devtools.mjs` mutates `src/model/**`); `react/DecisionPanels.tsx`'s header says the sentences
  around shared panels are "deliberately not shared", which is about duty sentences, not this one.
</evidence>

<decisions>
## Implementation Decisions

- **D-01 (no defect, no RED):** WX-06 has nothing to fix. Each item keeps its existing pins green before and after; TIDY-02 adds
  one guard test if none exists (D-04).
- **D-02 (TIDY-01):** new leaf `packages/core/src/PortName.ts`, no imports:
  ```ts
  interface PortSpans {                                  // module-private: not augmentable
    readonly AttributeResolver: "qadi.attribute";
    readonly DecisionHistory: "qadi.acted";
    readonly RelationshipResolver: "qadi.hasRelationship";
    readonly CustomPredicate: "qadi.hasCustom";
    readonly SignatureHistory: "qadi.hasSignature";
  }
  export type PortName = keyof PortSpans;
  export type PortSpanOf<N extends PortName> = PortSpans[N];
  export type PortSpanName = PortSpans[PortName];
  ```
  with the doc comments moved from `PortMetrics.ts` (the TS2741 idiom note stays with `PORT_NAMES_BY_NAME` in `PortMetrics.ts`).
  `PortDescription.span: PortSpanOf<N>`. Barrel `export * from "./PortName.ts";` after `PortMetrics.ts`. Every import of
  `PortName`/`PortSpanName` from `./PortMetrics.ts` (seven src modules, nine test files) re-points to `./PortName.ts`;
  `PortMetrics.ts` imports `type { PortName }` from it. `PredicatePortName` stays in `PortMetrics.ts` (it is a metric's domain).
  **Fallback**, recorded in the SUMMARY if taken: if `span: PortSpanOf<N>` cannot be read in the generic derivations
  (`PortDerivation.ts`, `PortDoubles.ts`, `PortAccess.ts`, devtools `PortCalls.ts`) without a cast, keep `span: PortSpanName`
  and drop the `PortSpanOf` export; the leaf table still states both unions once.
- **D-03 (TIDY-02):** two module-scope constants in `HydrationEngine.ts`, `ALLOW_WITHHELD = ["subjectId", "trace"] as const`
  and `DENY_WITHHELD = ["subjectId", "trace", "obligations", "reason"] as const`, each with a one-line doc saying what is withheld
  and where it goes instead (the subject on the envelope; the trace, and a denial's reason, in the disclosure), used by
  `AllowEntry`/`DenyEntry` and by `dehydrateDecision`. `as const` is allowed (AGENTS.md §6's `as` ban excepts it,
  `check-house-style.mjs:155`).
- **D-04 (TIDY-02 guard):** if no existing test decodes `dehydrateWith`'s output with the untrusted decode options
  (`onExcessProperty: "error"`) for both an allow and a deny, with and without `includeTrace`, add one to
  `HydrationEngine.test.ts`; it is the check that the two uses agree.
- **D-05 (TIDY-03):** `export const FAILURE_IS_NOT_A_DENIAL = "A lookup this evaluation depended on failed, so nothing was
  decided. This is not a denial."` in `packages/devtools/src/model/Verdict.ts` (package-private: not added to the named barrel),
  doc line one "What a panel says where a failed evaluation's verdict would be." Both panels (or wherever Phase 25 left the
  Simulator's copy) render `{FAILURE_IS_NOT_A_DENIAL}`. The existing literal assertions in the three tests stay unedited: they pin
  the words a reviewer reads, which a constant shared by both sides cannot.
- **D-06 (records):** ADR-QD-141 **unused** (no decision: locality only; D-02's narrowing is recorded in CCR-QD-419 and, as one
  dated note, in ADR-QD-094's description-fields section). BEH-QD-480..484 and INV-QD-302..303 unused (behaviour unchanged).
  CCR-QD-419. `spec/overview.md`: the `PortName, PredicatePortName, PortSpanName` row splits into `PortName`, `PortSpanName`,
  `PortSpanOf` (source `PortName.ts`) and `PredicatePortName` (source `PortMetrics.ts`); a Change History line. Changesets:
  `@qadi/core` minor (new export `PortSpanOf`; patch under the fallback), `@qadi/react` patch, `@qadi/devtools` patch.

### Claude's Discretion
- The constant names in D-03 and D-05.
- Whether the three items are three commits or one (three is preferred: one per package).
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/PortMetrics.ts`, `PortDescription.ts`, `PortServing.ts`, `Ports.ts`, `PortDerivation.ts`, `PortAccess.ts`,
  `PortDoubles.ts`, `PortRemote.ts`, `index.ts`; the five port modules (span literals)
- `packages/react/src/HydrationEngine.ts`, `test/HydrationEngine.test.ts`, `test/HydrationPayload.test.ts`
- `packages/devtools/src/react/Inspector.tsx`, `react/Simulator.tsx`, `model/Verdict.ts`
- ADR-QD-052 / ADR-QD-123 (metric registry keys: untouched, no metric moves), ADR-QD-094 (descriptions), ADR-QD-078 (payload),
  ADR-QD-099 (barrels); INV-QD-006 (failure is not denial)
- `stryker.config.mjs` (`reports/mutation/mutation.json`), `stryker.react.mjs` (`reports/mutation-react/mutation.json`),
  `stryker.devtools.mjs` (`reports/mutation-devtools/mutation.json`)
</canonical_refs>

<deferred>
## Deferred Ideas
- A shared `<FailureNote>` component for both panels (they differ in container and heading; the sentence is the shared fact).
- Deriving `PORT_NAMES_BY_NAME` from the leaf table (it needs a runtime value the type-only table does not give; the TS2741
  record is already compiler-checked).
</deferred>

---
*Phase: 29-restated-facts · Context gathered: 2026-11-11*
