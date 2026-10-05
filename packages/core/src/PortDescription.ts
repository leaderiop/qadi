/**
 * One port, described once: everything a wrapper, a default, a double or an
 * environment needs to know about it.
 *
 * Five evaluation ports (`AttributeResolver`, `RelationshipResolver`,
 * `CustomPredicate`, `DecisionHistory`, `SignatureHistory`) each had their
 * error constructor, request key and fail-closed answer restated wherever
 * something wrapped, replayed, defaulted, doubled or enumerated them — in the
 * three hand-written `*Retrying`/`*Bounded`/`*TimingOut` families (two of
 * which had drifted apart, ARCH-10 E1/E2), in `@qadi/devtools`' capture and
 * replay (which copied every fail-closed answer by hand, E14), and in a test
 * double per port. A description states those facts once, beside the service
 * it describes; `PortDerivation.ts` and `PortDoubles.ts` derive the wrappers,
 * the named default and the scriptable doubles from it, and `Ports.ts` holds
 * the closed registry of all five (ADR-QD-901).
 *
 * The description is a **lens over the Shape, not a replacement for it**
 * (ADR-QD-010 is unchanged). The five Shapes keep their own method names and
 * arities — `resolve(subjectId, attribute)` and
 * `evaluate(name, subject, resource, params)` are positional, the other three
 * take one request object — and `invoke`/`make` translate between a Shape and
 * a single `(...args: Args) => Effect<A, E>` call, which is all a generic
 * derivation needs (D-10-a).
 */
import type * as Cause from "effect/Cause";
import type * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { PortName, PortSpanName } from "./PortMetrics.ts";

/**
 * What every port Shape has in common: an optional implementation label.
 *
 * A label only — see `AttributeResolverShape.name` for the "nothing branches
 * on it" rule. Derived wrappers compose it (`"<inner> (retrying)"`), which is
 * the only reason the generic machinery needs to see it.
 */
export interface PortShape {
  readonly name?: string | undefined;
}

/**
 * One port's description.
 *
 * - `N` — the port's name, a member of the closed `PortName`.
 * - `Self`/`Shape` — the `Context.Service` class and its Shape.
 * - `Args` — the port method's parameters, as a labelled tuple. Written
 *   mutable (`[subjectId: SubjectId, attribute: string]`), not `readonly`:
 *   a script or observer written with positional parameters,
 *   `(subjectId, attribute) => …`, is then assignable to `(...args: Args)`.
 * - `A`/`E` — the method's answer and typed error.
 */
export interface PortDescription<
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
> {
  /** The port's name — the word its metrics are keyed by. */
  readonly port: N;
  /**
   * The Shape's one method, by name (`"resolve"`). Read by the timing-out
   * wrapper's deadline message, `"<port>.<method> did not settle within the
   * configured deadline"`.
   */
  readonly method: string;
  /** The span `PortAccess.ts` opens around a read of this port (BEH-QD-227). */
  readonly span: PortSpanName;
  /** The service key. */
  readonly service: Context.Key<Self, Shape>;
  /**
   * The lens onto the method. Must call the method **through** the shape
   * (`(shape) => (s, a) => shape.resolve(s, a)`), never hand back the method
   * unbound: an adapter written as a class would lose its `this`.
   */
  readonly invoke: (shape: Shape) => (...args: Args) => Effect.Effect<A, E>;
  /** Builds a Shape from a label and one call — the inverse of `invoke`. */
  readonly make: (name: string, call: (...args: Args) => Effect.Effect<A, E>) => Shape;
  /**
   * The port's own typed error for a call that failed with `cause`: a
   * deadline (`timingOutPort`), a scripted `Fail` (`scriptedPort`), a replayed
   * outage (`@qadi/devtools`). Every derived layer fails only with an error
   * this builds (INV-QD-901).
   */
  readonly failure: (args: Args, cause: unknown) => E;
  /**
   * The port's own typed error for a call that **died** — what
   * `PortAccess.ts`'s `catchPortDefect` turns a defect into (ADR-QD-077).
   * Separate from `failure` because `CustomPredicateError` renders a defect
   * with `Cause.pretty`, not as the squashed value (D-10-e).
   */
  readonly defect: (args: Args, cause: Cause.Cause<unknown>) => E;
  /**
   * A collision-safe key for one request: `JSON.stringify` of a tuple that
   * always includes the subject, so a capture taken for one subject never
   * answers a question about another. `JSON.stringify` throws on a circular or
   * `BigInt` value; a double or replay keyed by it then dies, which
   * `PortAccess.ts` turns into this port's typed error like any other defect.
   */
  readonly key: (args: Args) => string;
  /**
   * The fail-closed default: its name and the answer it gives to every
   * request (INV-QD-007, ADR-QD-040). The only statement of that answer — the
   * named default layer, an unscripted double and a replay's unseen request
   * all read it here.
   */
  readonly none: { readonly name: string; readonly answer: A };
}

/**
 * What a scripted port does with one request (D-10-l).
 *
 * Closed and tagged: `Answer` succeeds with a value; `Fail` fails with the
 * port's own error, built by the description's `failure` from `cause`; `Die`
 * dies with `defect`; `Throw` throws `error` synchronously from the method
 * body, the way a careless adapter does — `PortAccess.ts` turns both of the
 * last two into the port's typed error.
 */
export type PortReply<A> =
  | { readonly _tag: "Answer"; readonly value: A }
  | { readonly _tag: "Fail"; readonly cause: unknown }
  | { readonly _tag: "Die"; readonly defect: unknown }
  | { readonly _tag: "Throw"; readonly error: unknown };

/** Constructors for {@link PortReply}. */
export const PortReply = {
  answer: <A>(value: A): PortReply<A> => ({ _tag: "Answer", value }),
  fail: (cause: unknown): PortReply<never> => ({ _tag: "Fail", cause }),
  die: (defect: unknown): PortReply<never> => ({ _tag: "Die", defect }),
  throw: (error: unknown): PortReply<never> => ({ _tag: "Throw", error }),
};

/**
 * A script for one port: what to do with each request. `undefined` falls
 * through to the description's `none` answer — the fail-closed default — so a
 * script states only the requests it cares about.
 */
export type PortScript<Args extends ReadonlyArray<unknown>, A> = (
  ...args: Args
) => PortReply<A> | undefined;
