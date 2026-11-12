/**
 * A structural depth check over raw, not-yet-`Schema`-walked JSON: the walk
 * `UntrustedDecode.ts` runs before every strict decode.
 *
 * `Schema`'s own recursive descent through a suspended schema has no depth
 * cap: an adversarial payload nested past the call stack's limit raises a raw
 * `RangeError` mid-decode (confirmed at 60,000 levels) rather than a typed
 * `Effect` failure. The walk uses an explicit array-backed stack rather than
 * recursion, so the guard itself cannot be the thing that overflows.
 *
 * Package-private since ADR-QD-143: it is no longer in `@qadi/core`'s barrel, so
 * the decoder is the only way to run it ahead of a decode, and a seam cannot
 * assemble guard-then-decode by hand.
 */
/**
 * True for a plain object — arrays excluded, matching `FieldPath.ts`'s
 * identically-named predicate. `exceedsJsonDepth` below dispatches arrays
 * first (via `Array.isArray`) before ever reaching this check, so the
 * missing exclusion was never reachable from here — but the predicate's own
 * type claim (`value is Record<string, unknown>`) was false for the arrays
 * it admitted, and a future caller reusing this name without that call-order
 * discipline would have inherited a lying narrowing (NS-01).
 */
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** `true` once any value in `root` is nested deeper than `maxDepth`. */
export const exceedsJsonDepth = (root: unknown, maxDepth: number): boolean => {
  const stack: Array<{ readonly value: unknown; readonly depth: number }> = [
    { value: root, depth: 0 },
  ];
  while (stack.length > 0) {
    const frame = stack.pop();
    if (frame === undefined) break;
    if (frame.depth > maxDepth) return true;
    if (Array.isArray(frame.value)) {
      for (const item of frame.value) stack.push({ value: item, depth: frame.depth + 1 });
    } else if (isPlainObject(frame.value)) {
      for (const key of Object.keys(frame.value)) {
        stack.push({ value: frame.value[key], depth: frame.depth + 1 });
      }
    }
  }
  return false;
};
