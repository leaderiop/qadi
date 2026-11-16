/**
 * The five states a guard reports it rendered, worst news first.
 *
 * `@qadi/react`'s `GateRenderState` is this type and `@qadi/devtools` keys its
 * display by it, so the words are stated here once and a sixth is a compile
 * error in both readers (ADR-QD-162 applying ADR-QD-152, ARCH-96).
 *
 * The rows are empty on purpose: display words (`Error`, `Deny`, `Allow`) are
 * devtools' vocabulary, and nothing else about a state is generic. The order is
 * the devtools panel's sort order, so a reader opening it sees the failures
 * first. The table is module-private; the type, the list and the guard are what
 * a reader needs, and a table with a row type would invite a second use.
 */

/** What one state carries: nothing yet. */
interface GateStateRow {}

const GATE_STATE_TABLE = {
  Failed: {},
  Denied: {},
  Rechecking: {},
  Pending: {},
  Allowed: {},
} as const satisfies { readonly [state: string]: GateStateRow };

/** The render state of one guard. */
export type GateState = keyof typeof GATE_STATE_TABLE;

/**
 * Whether a word is one of {@link gateStates}.
 *
 * A state arrives as `string` from a package that does not depend on this one;
 * this narrows it without a cast. Own keys only, so a name every object inherits
 * (`toString`, `__proto__`) is not a state.
 */
export const isGateState = (word: string): word is GateState =>
  Object.hasOwn(GATE_STATE_TABLE, word);

/**
 * Every state, as values, worst news first: Failed, Denied, Rechecking, Pending, Allowed.
 *
 * The table's keys in declaration order, narrowed by the own-key guard so no cast
 * is needed. Declared after the guard because it calls it at load: a `const`
 * read before its declaration throws.
 */
export const gateStates: ReadonlyArray<GateState> = Object.keys(GATE_STATE_TABLE).filter(
  isGateState,
);
