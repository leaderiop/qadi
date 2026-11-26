/**
 * A port's identity: its name, stated once.
 *
 * The names are one tuple, {@link PORT_NAMES}, and {@link PortName} is its
 * element type, so the list a metric preregisters (`PortMetrics.ts`) and the
 * union every registry-indexed type reads cannot disagree. A port module
 * imports what a port *is* from here, not from the module that counts what it
 * *did*.
 *
 * A leaf: no imports, no metric. `PortMetrics.ts` imports the tuple from here,
 * never the reverse, so a metric's registry key (ADR-QD-052) cannot move with a
 * port's identity. The span each port's read opens is the port's own fact and
 * lives on its description (`PortDescription.ts`), not here.
 */

/**
 * Every port the evaluator's walk (`Walk.ts`, through `PortAccess.ts`) can call
 * into, in the order the registry and its tables list them: the closed domain
 * of `portCallsTotal`, `portRetriesTotal` and `portTimeoutsTotal`.
 *
 * A tuple and not a record, so a sixth name is one edit here and the metric
 * domain follows it. `PortTypes` (`Ports.ts`) is indexed by it, so a name with
 * no registry entry is a compile error at each place a port's fact is still
 * missing.
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
