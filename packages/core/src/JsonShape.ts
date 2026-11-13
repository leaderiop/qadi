/**
 * The one package-private plain-object predicate over raw, untrusted JSON.
 *
 * A leaf with no imports, so `DecodeDepthGuard.ts`, `UntrustedDecode.ts`,
 * `SinkCodec.ts` and `FieldPath.ts` can share it without an edge between them
 * (`pnpm circular`). Out of the barrel (ADR-QD-099): a module another package
 * needs is exported from the barrel instead. `JsonHazard.ts`'s same-named
 * predicate is a different check (a prototype test) and stays its own.
 */

/** True for a non-null, non-array object; arrays are excluded because no caller indexes into one by key. */
export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
