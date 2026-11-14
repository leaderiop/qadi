/**
 * The JSON text of a value, or `undefined` when it has none. It never throws.
 *
 * `JSON.stringify` answers `undefined` for a function, a symbol and `undefined`,
 * and throws on a bigint, a cycle, a `toJSON` or getter that throws and a revoked
 * proxy. Every place that turns a caller's value into text for a reader reads
 * through this one function (`explain`'s literals, and `@qadi/devtools`' remedy
 * labels, search text and simulator form), so none of them can be the thing that
 * falls over, and each keeps its own reading of no text.
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
