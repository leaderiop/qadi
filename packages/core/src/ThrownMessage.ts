import * as Cause from "effect/Cause";

/** The words a value that cannot be read is written as; they carry none of it. */
const UNDESCRIBABLE = "a value that could not be described";

/**
 * A caught value as text a reader sees. It never throws.
 *
 * An `Error` is its `message` when that is a string, anything else is its `String`
 * form (a string comes back unchanged), and where neither can be read, because a
 * getter, a `toString` or a proxy trap throws or the value has no string form, it is
 * the fixed words. Every place that turns a caught value into text reads through
 * this one function (core's encode, key and custom predicate refusals, and
 * `@qadi/http`, `@qadi/react` and `@qadi/devtools`), so none of them can be the thing
 * that falls over on the value a caller's code threw. It is the thrown-value sibling
 * of `valueText` (ADR-QD-154), and public because the packages above core need it
 * (ADR-QD-099, ADR-QD-182).
 */
export const thrownMessage = (thrown: unknown): string => {
  try {
    if (thrown instanceof Error) {
      const message: unknown = thrown.message;
      if (typeof message === "string") return message;
    }
  } catch {
    // A throwing `instanceof` (a proxy's prototype trap) or `message` getter: fall to the string form.
  }
  try {
    return String(thrown);
  } catch {
    // A throwing `toString`, a value with none, a revoked proxy: the fixed words.
  }
  return UNDESCRIBABLE;
};

/**
 * An Effect `Cause` as text a reader sees. It never throws.
 *
 * A cause that renders keeps its `Cause.pretty` text. `Cause.pretty` throws for a
 * cause that failed or died with a value whose `message` getter, `toString` or proxy
 * traps throw, and then the text is `thrownMessage` of the value `Cause.squash`
 * returns, which is the failed or died value itself, so the fallback is the same rule
 * as for a caught value. Every place that renders a cause to text reads through it
 * (core's custom predicate defect and `@qadi/devtools`' feeds), so a defect the
 * caller's code raised cannot become a defect of ours (ADR-QD-182).
 */
export const causeMessage = (cause: Cause.Cause<unknown>): string => {
  try {
    return Cause.pretty(cause);
  } catch {
    // The rendering read a member of the failed or died value that threw.
  }
  return thrownMessage(Cause.squash(cause));
};
