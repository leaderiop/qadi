/**
 * The JSON text of a value, or `undefined` when it has none. It never throws.
 *
 * `JSON.stringify` answers `undefined` for a function, a symbol and `undefined`,
 * and throws on a bigint, a cycle, a `toJSON` or getter that throws and a revoked
 * proxy. Every place that turns a caller's value into text for a reader reads
 * through this one function (`explain`'s literals, and `@qadi/devtools`' remedy
 * labels, search text and simulator form), so none of them can be the thing that
 * falls over. The search text and the form each keep their own reading of no text;
 * the label reading is `valueLabel`, below.
 */
export const valueText = (value: unknown): string | undefined => {
  try {
    const text: string | undefined = JSON.stringify(value);
    return text;
  } catch {
    // A bigint, a cycle, a throwing `toJSON` or getter, a revoked proxy: no text.
  }
  return undefined;
};

/** The words a value with no JSON form is written as; they carry none of it. */
const NO_JSON_FORM = "a value with no JSON form";

/**
 * A value as a label a reader sees. It never throws.
 *
 * A bigint is its digits and `n` (`10n`), anything else is `valueText`'s JSON. Where
 * there is none, an object (a cycle, an array holding a bigint, a `toJSON` or getter
 * that throws or gives nothing, a revoked proxy) is the fixed words, and `undefined`,
 * a function or a symbol is the word `undefined`. The rule lives here once, so
 * `explain` and `@qadi/devtools`' remedy labels cannot word it differently.
 */
export const valueLabel = (value: unknown): string =>
  typeof value === "bigint"
    ? `${String(value)}n`
    : // `typeof null` is "object", but `null` has text (`"null"`), so it never reaches the words.
      (valueText(value) ?? (typeof value === "object" ? NO_JSON_FORM : "undefined"));
