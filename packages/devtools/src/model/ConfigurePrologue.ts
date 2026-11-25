/**
 * The one configure order the timeline feed, the diagnostics feed and the gates feed share.
 *
 * Each feed took its inputs only through `configure` (ADR-QD-192) and each restated the same
 * five lines before it did anything of its own, so the order drifted in places a test had to
 * catch one feed at a time. A feed supplies what differs, as a rule, and the steps it runs when
 * an input moved; this module owns the order, and each step is there for a reason.
 *
 * The closed guard comes first, so a configure after the scope closed reads and publishes
 * nothing, even for input the normaliser would refuse (BEH-QD-636). The normaliser comes
 * second, so a refused capacity throws before anything moves (ADR-QD-191). The identity gate
 * is a parameter: the diagnostics feed compares absent options, and the gates feed also
 * retries a failed watch, so each states what "the same" means for it. The held value is
 * written before the steps run, and the steps read it when they run, so a configure nested in
 * a step (a listener that configures again) decides, as ADR-QD-192 requires.
 *
 * ADR-QD-200 is the decision that gives the three feeds this one prologue, and ADR-QD-192 the
 * order it keeps. Package-private (ADR-QD-099).
 */

/** What differs between the feeds' configures: the held inputs, how they are normalised and when they are the same. */
export interface ConfigureRule<Raw, Held> {
  /** Whether the owning scope has closed; a configure after it does nothing. */
  readonly closed: () => boolean;
  /** The one normaliser: it throws a refused input before anything moves. */
  readonly complete: (raw: Raw) => Held;
  /** The inputs held now. */
  readonly held: () => Held;
  /** Whether the wanted inputs change nothing; it receives the held inputs first and the wanted ones second. */
  readonly same: (held: Held, wanted: Held) => boolean;
  /** Holds the wanted inputs; it runs before the steps. */
  readonly hold: (wanted: Held) => void;
}

/**
 * Builds a feed's `configure` from its rule and the steps that run when an input moved.
 *
 * The steps receive the wanted inputs and the ones held before.
 */
export const makeConfigure =
  <Raw, Held>(rule: ConfigureRule<Raw, Held>, steps: (wanted: Held, before: Held) => void) =>
  (raw: Raw): void => {
    if (rule.closed()) return;
    const wanted = rule.complete(raw);
    const before = rule.held();
    if (rule.same(before, wanted)) return;
    rule.hold(wanted);
    steps(wanted, before);
  };
