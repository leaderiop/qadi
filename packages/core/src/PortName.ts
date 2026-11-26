/**
 * A port's identity: its name and the span its read opens, each stated once.
 *
 * The names are one tuple, {@link PORT_NAMES}, and {@link PortName} is its
 * element type, so the list a metric preregisters (`PortMetrics.ts`) and the
 * union every registry-indexed type reads cannot disagree. A port module
 * imports what a port *is* from here, not from the module that counts what it
 * *did*.
 *
 * `PortSpans`, the span table keyed by those names, is not exported, so no other module can augment it and the union
 * stays closed. `PortDescription.span` is {@link PortSpanOf}, so a description
 * can name only its own port's span; before this it was the whole
 * {@link PortSpanName} union, and `attributeResolverPort` could have claimed
 * `"qadi.acted"` and compiled.
 *
 * A leaf: no imports, no metric. `PortMetrics.ts` imports the tuple from here,
 * never the reverse, so a metric's registry key (ADR-QD-052) cannot move with a
 * port's identity.
 */
interface PortSpans {
  readonly AttributeResolver: "qadi.attribute";
  readonly DecisionHistory: "qadi.acted";
  readonly RelationshipResolver: "qadi.hasRelationship";
  readonly CustomPredicate: "qadi.hasCustom";
  readonly SignatureHistory: "qadi.hasSignature";
}

/**
 * Every port the evaluator's walk (`Walk.ts`, through `PortAccess.ts`) can call
 * into, in the order the registry and its tables list them: the closed domain
 * of `portCallsTotal`, `portRetriesTotal` and `portTimeoutsTotal`.
 *
 * A tuple and not a record, so a sixth name is one edit here and the metric
 * domain follows it. A registry-indexed type (`PortTypes`, `PortSpans`) then
 * has no entry for it, which is a compile error at each place a port's fact
 * is still missing.
 */
export const PORT_NAMES = [
  "AttributeResolver",
  "DecisionHistory",
  "RelationshipResolver",
  "CustomPredicate",
  "SignatureHistory",
] as const;

/** One port's name: an element of {@link PORT_NAMES}. */
export type PortName = (typeof PORT_NAMES)[number];

/**
 * The span port `N`'s read opens: one per port, and no other port's.
 *
 * Each port's description (`PortDescription.ts`) names its own, and both
 * readers take it from there.
 */
export type PortSpanOf<N extends PortName> = PortSpans[N];

/**
 * The span each port's read opens, as one closed union: one per port.
 *
 * `PortAccess.ts` opens these spans and `@qadi/devtools` decodes them
 * (BEH-QD-227), so the set is a closed union rather than five string literals
 * kept in step by hand.
 */
export type PortSpanName = PortSpans[PortName];
