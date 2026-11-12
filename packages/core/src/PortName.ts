/**
 * A port's identity: its name and the span its read opens, stated once.
 *
 * Both unions were declared in `PortMetrics.ts`, so every port module imported
 * what a port *is* from the module that counts what it *did* (ARCH-77). They
 * are read from one table here instead: a sixth port is one row, and its name
 * and its span cannot be added separately and drift apart.
 *
 * `PortSpans` is not exported, so no other module can augment it and the union
 * stays closed. `PortDescription.span` is {@link PortSpanOf}, so a description
 * can name only its own port's span; before this it was the whole
 * {@link PortSpanName} union, and `attributeResolverPort` could have claimed
 * `"qadi.acted"` and compiled.
 *
 * A leaf: no imports, no metric. `PortMetrics.ts` imports the name type from
 * here, never the reverse, so a metric's registry key (ADR-QD-052) cannot move
 * with a port's identity.
 */
interface PortSpans {
  readonly AttributeResolver: "qadi.attribute";
  readonly DecisionHistory: "qadi.acted";
  readonly RelationshipResolver: "qadi.hasRelationship";
  readonly CustomPredicate: "qadi.hasCustom";
  readonly SignatureHistory: "qadi.hasSignature";
}

/**
 * Every port `Evaluate.ts` can call into: the closed domain of
 * `portCallsTotal`, `portRetriesTotal` and `portTimeoutsTotal`.
 *
 * `PORT_NAMES_BY_NAME` (`PortMetrics.ts`) is a `Record<PortName, true>`, so a
 * sixth port added here without a matching entry there is a compile error
 * (TS2741) rather than an unregistered word silently missing from a snapshot.
 */
export type PortName = keyof PortSpans;

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
