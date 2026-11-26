/**
 * The stop ledger a feed holds, and the three functions over it.
 *
 * A stop notice announces each stop once, keyed on the identity of the feed's stop value.
 * The rule lives here, React-free, so it is measured and not left to the component that
 * shows the notice (ADR-QD-201). Package-private (ADR-QD-099).
 */

/**
 * The last stop a box showed, and how many distinct stops boxes have shown.
 *
 * It records only which stop was announced, never what the reading says (AGENTS.md section 13),
 * so it holds an identity and a count and nothing else.
 */
export interface StopLedger<S> {
  readonly stop: S | undefined;
  readonly count: number;
}

/** A ledger with no stop in it: what a dock starts from. */
export const noStops: StopLedger<never> = { stop: undefined, count: 0 };

/**
 * One key per stop, so a second stop remounts the box and its alert is announced as it arrives.
 *
 * The key of a stop is the same before and after it is recorded, so recording it never
 * remounts the box that showed it (INV-QD-421).
 */
export const stoppedKey = <S>(ledger: StopLedger<S>, status: S): number =>
  ledger.stop === status ? ledger.count : ledger.count + 1;

/**
 * Whether a stop is new to the ledger and so announces.
 *
 * A stop is its identity: an equal-field value that is another object is a new stop.
 */
export const announcesStop = <S>(ledger: StopLedger<S>, status: S): boolean => ledger.stop !== status;

/**
 * The ledger after a stop is recorded.
 *
 * It returns the same ledger for a known stop, so a repeated record makes no new state. It is
 * still not free: `useReducer` has no eager bail-out, so the component that holds the ledger
 * is called once more and React renders nothing below it (ADR-QD-201, decision 7).
 */
export const recordStop = <S>(ledger: StopLedger<S>, status: S): StopLedger<S> =>
  ledger.stop === status ? ledger : { stop: status, count: ledger.count + 1 };
