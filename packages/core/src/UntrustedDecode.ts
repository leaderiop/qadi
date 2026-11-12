/**
 * The one way untrusted JSON is decoded: parse (for text), depth guard, an
 * optional seam-supplied preparation, strict decode.
 *
 * Each untrusted seam used to assemble the guard and the strict decode by hand
 * (ADR-QD-143, INV-QD-305): a policy, a sink record, the two port wires, a
 * hydration payload, an audit archive. A seam that forgot the guard let
 * `Schema`'s recursive descent exhaust the stack on hostile nesting; one that
 * forgot the options silently dropped a typo'd field. The bound and the strict
 * options are tuned together, so they live together, and `decode`/`decodeText`
 * are the only way in: a decoder built here cannot skip the guard.
 *
 * Synchronous and `Result`-valued; a seam adapts it in one line
 * (`Effect.fromResult`, `Result.getOrUndefined`) and keeps only a total mapping
 * from {@link UntrustedRefusal} into its own error. Build each decoder once, at
 * module scope.
 *
 * A leaf: it imports `effect`, `DecodeDepthGuard.ts` and `JsonShape.ts` only, never
 * `Policy.ts` (ADR-QD-037, which counts type-only edges), so `Policy.ts` and
 * every other seam can import it.
 */
import * as Data from "effect/Data";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type * as SchemaAST from "effect/SchemaAST";
import { exceedsJsonDepth } from "./DecodeDepthGuard.ts";
import { isPlainObject } from "./JsonShape.ts";

/**
 * A generous structural ceiling on the raw JSON an untrusted seam decodes from,
 * checked before `Schema` ever recurses into it.
 *
 * `Policy.ts`'s `DEFAULT_MAX_DEPTH` bounds a *decoded* `Policy` at evaluation
 * time (`Evaluate.ts`), but nothing bounded the decode itself: `Schema`'s own
 * recursive descent through `PolicyRef` has no cap, so an adversarial JSON
 * string nesting `{"_tag":"Not","policy":...}` tens of thousands deep
 * exhausts the call stack *during decode*, before the 64-deep evaluation
 * guard is ever consulted — confirmed empirically at 60,000 levels, where it
 * throws a raw `RangeError`, not a typed `Effect` failure.
 * {@link exceedsJsonDepth} (`DecodeDepthGuard.ts`) walks the parsed JSON with
 * an explicit array-backed stack rather than recursion, so the guard itself
 * cannot be the thing that overflows.
 *
 * The bound is 4x `DEFAULT_MAX_DEPTH` — headroom for the extra JSON nesting an
 * array-valued node (`AllOf`/`AnyOf`/`Rules`) adds around each `Policy`
 * position — so no policy `evaluate` would ever accept is rejected here first.
 * It is stated as a literal, and a test pins it to `DEFAULT_MAX_DEPTH * 4`,
 * because importing `DEFAULT_MAX_DEPTH` from `Policy.ts` would be a cycle.
 * This was 8x until `UNTRUSTED_DECODE_OPTIONS` started setting
 * `onExcessProperty: "error"`: that option forces `Schema`'s struct decoder
 * onto its generic, per-node-generator code path rather than the tight loop
 * used when no `ParseOptions` are given (v4-rc.112, `SchemaAST.ts`'s
 * object-parser "fast path" comment), and that path costs enough additional
 * stack per recursive level that decode itself started raising the same raw
 * `RangeError` well *inside* the old 8x bound — confirmed empirically: nesting
 * between roughly 430 and 440 levels deep, comfortably under the old
 * `DEFAULT_MAX_DEPTH * 8` (512), already overflowed. 4x (256) leaves the guard
 * itself with headroom under that new, lower ceiling while still exceeding the
 * ~128 raw JSON levels a maximally `AllOf`/`AnyOf`-nested `evaluate`-depth-64
 * policy needs.
 */
export const MAX_DECODE_DEPTH: number = 256;

/**
 * Untrusted-input decode options, applied by every decoder this module builds.
 *
 * `onExcessProperty: "error"` is the deliberate stance (ADR-QD-002's trust-
 * boundary framing): a `Policy` is persisted and re-parsed JSON, and the
 * v4 default (`"ignore"`) would silently strip an unrecognized key from an
 * otherwise-valid tag — `{"_tag":"HasPermission","permision":…}` decodes to
 * `{ _tag: "HasPermission", permission: undefined }`'s *absence* of the typo'd
 * grant, not a decode failure naming it. That is exactly the class of silent
 * data loss this ADT was rewritten to make unrepresentable, just one field
 * later than the `fieldStrategy` case the ADR already covers. `ParseOptions` is
 * a decode-call option, not a schema-construction one (v4 has no per-struct
 * excess-property switch), and `options` propagates through every nested
 * struct a decode recurses into — `Matcher`, `Obligation`, `RuleStruct` — so
 * setting it once when the decoder is built covers the whole tree.
 *
 * Private to this module: {@link untrustedDecoder} is the only way to use it, so
 * no decode call can pass options of its own, and nothing can decode strictly
 * without the depth guard first (INV-QD-305).
 */
const UNTRUSTED_DECODE_OPTIONS: SchemaAST.ParseOptions = { onExcessProperty: "error" };

/**
 * Why an untrusted input was refused.
 *
 * - `NotJson`: the text is not JSON. Only {@link UntrustedDecoder.decodeText}
 *   raises it; `message` is the parser's own text.
 * - `TooDeep`: the input nests deeper than {@link MAX_DECODE_DEPTH} over the
 *   part the guard walks. Raised before anything recurses into it.
 * - `Malformed`: the strict decode refused it — a wrong type, an unknown tag,
 *   an excess key. `error` is the `Schema.SchemaError` with its issue tree, for
 *   a seam whose own channel carries it.
 *
 * Closed, so a seam maps it with `Match.tagsExhaustive` and a new arm is a
 * compile error at every seam.
 */
export type UntrustedRefusal = Data.TaggedEnum<{
  NotJson: { readonly message: string };
  TooDeep: { readonly maxDepth: number };
  Malformed: { readonly message: string; readonly error: Schema.SchemaError };
}>;

/** Constructors and guards for {@link UntrustedRefusal}. */
export const UntrustedRefusal = Data.taggedEnum<UntrustedRefusal>();

/** {@link UntrustedRefusal} without `NotJson`: what a decode of an already-parsed value can say. */
export type UntrustedValueRefusal = Exclude<UntrustedRefusal, { readonly _tag: "NotJson" }>;

/**
 * The top-level keys of `A` whose type is `unknown` or `ReadonlyArray<unknown>`:
 * the only slots {@link UntrustedDecoderOptions.unwalked} may name, so naming a key
 * the schema does decode is a compile error. `A` is the schema's `Encoded` side,
 * because the guard filters the raw input's own keys, not decoded ones.
 */
export type UnwalkedKey<A> = {
  [K in keyof A]-?: unknown extends A[K]
    ? K
    : [A[K]] extends [ReadonlyArray<unknown>]
      ? [ReadonlyArray<unknown>] extends [A[K]]
        ? K
        : never
      : never;
}[keyof A] &
  string;

/**
 * What a seam adds to the fixed recipe.
 *
 * `unwalked` names top-level keys the depth guard leaves out because a second
 * decoder guards them from its own root (hydration's `entries`, the audit
 * envelope's `entries`, the audit row's `record`); each must be typed `unknown` or
 * `ReadonlyArray<unknown>` in the schema (INV-QD-306). `prepare` runs after the guard and before the
 * strict decode, and what it returns is what the decode reads; its failure is
 * returned as it is. The order is fixed: guard, prepare, decode.
 */
export interface UntrustedDecoderOptions<A, R extends { readonly _tag: string }> {
  readonly unwalked?: ReadonlyArray<UnwalkedKey<A>>;
  readonly prepare?: (input: unknown) => Result.Result<unknown, R>;
}

/** `unknown` when a prepare refusal's `_tag` is free, `never` when it collides with {@link UntrustedRefusal}'s. */
type FreeRefusalTag<R extends { readonly _tag: string }> = [
  Extract<R["_tag"], UntrustedRefusal["_tag"]>,
] extends [never]
  ? unknown
  : never;

/** What {@link untrustedDecoder} builds. */
export interface UntrustedDecoder<A, R extends { readonly _tag: string }> {
  /** Decodes an already-parsed value: guard, `prepare`, strict decode. */
  readonly decode: (input: unknown) => Result.Result<A, UntrustedValueRefusal | R>;
  /** Decodes text: `JSON.parse`, then {@link UntrustedDecoder.decode}. */
  readonly decodeText: (text: string) => Result.Result<A, UntrustedRefusal | R>;
}

/**
 * Builds the untrusted decoder for `schema`.
 *
 * A throw from the strict decode is never caught: past the guard it would be a
 * library defect, and reporting it as a refusal would hide it. Only
 * `JSON.parse`, which throws on non-JSON text by contract, is wrapped.
 */
export const untrustedDecoder = <
  S extends Schema.ConstraintDecoder<unknown>,
  R extends { readonly _tag: string } = never,
>(
  schema: S,
  options?: UntrustedDecoderOptions<S["Encoded"], R> & FreeRefusalTag<R>,
): UntrustedDecoder<S["Type"], R> => {
  const strict = Schema.decodeUnknownResult(schema, UNTRUSTED_DECODE_OPTIONS);
  const unwalked: ReadonlySet<string> = new Set(options?.unwalked);
  const prepare = options?.prepare;

  const walked = (input: unknown): unknown =>
    unwalked.size > 0 && isPlainObject(input)
      ? Object.fromEntries(Object.entries(input).filter(([key]) => !unwalked.has(key)))
      : input;

  const decode = (input: unknown): Result.Result<S["Type"], UntrustedValueRefusal | R> => {
    if (exceedsJsonDepth(walked(input), MAX_DECODE_DEPTH)) {
      return Result.fail(UntrustedRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
    }
    const prepared: Result.Result<unknown, R> = prepare === undefined ? Result.succeed(input) : prepare(input);
    return Result.flatMap(prepared, (value) =>
      Result.mapError(strict(value), (error) =>
        UntrustedRefusal.Malformed({ message: error.message, error }),
      ),
    );
  };

  const decodeText = (text: string): Result.Result<S["Type"], UntrustedRefusal | R> =>
    Result.flatMap(
      Result.try({
        try: (): unknown => JSON.parse(text),
        // A `catch` binding is `unknown`, so reading `.message` needs a narrowing. `JSON.parse` throws only a
        // `SyntaxError`; the constant arm is defensive, keeping any other thrown value free of a `String(error)` prefix.
        catch: (error) =>
          UntrustedRefusal.NotJson({ message: Predicate.isError(error) ? error.message : "not JSON" }),
      }),
      decode,
    );

  return { decode, decodeText };
};
