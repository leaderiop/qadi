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
 * the closed registry of all five (ADR-QD-094).
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
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import type * as Result from "effect/Result";
import type { AuthSubject } from "./AuthSubject.ts";
import type { WirePath } from "./JsonRefusal.ts";
import type { Policy } from "./Policy.ts";
import type { PortName, PortSpanName } from "./PortMetrics.ts";
import type { PortSpanAttributesLike, SpanFields, SpanStruct, SpanType } from "./PortSpan.ts";
import type { PortServingFacet } from "./PortServing.ts";
import type { PortWire } from "./PortWire.ts";
import type { Resource } from "./Resource.ts";

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
 * Which kind of value a request key cannot represent.
 *
 * `Equal.equals` compares each of these by identity, or by a rule no text can
 * reproduce, so a key either collides two requests the evaluator tells apart
 * or splits two it treats as one (`PortKey.ts` says which, case by case):
 *
 * - `function`: a function, compared by identity.
 * - `symbol`: a symbol value, compared by identity.
 * - `symbol-key`: an object with a symbol-keyed property, which `Equal`
 *   reads and text cannot name.
 * - `instance`: an object that is neither plain (`Object.prototype` or `null`
 *   prototype) nor a `Date`, `RegExp`, array, `Set` or `Map`, or one that
 *   implements `Equal` itself — a class instance, a boxed primitive, binary
 *   data, an `Error`, a `Promise`, an Effect data type.
 */
export type UnkeyableKind = "function" | "symbol" | "symbol-key" | "instance";

/**
 * Why a request has no key: a value inside it lies outside the key's domain.
 *
 * A closed union, mirroring `EncodeRefusal` (`JsonRefusal.ts`), so a reporter
 * matching on it with `Match.tagsExhaustive` is a compile error away from a
 * new reason.
 *
 * - `Circular`: an object is its own ancestor at `path`.
 * - `Unkeyable`: the value at `path` is of a {@link UnkeyableKind}; `brand`
 *   is its constructor's name (`"Uint8Array"`, `"Point"`), or `"Function"`,
 *   `"Symbol"`.
 * - `Unreadable`: reading the value at `path` threw (a getter, a proxy trap);
 *   `message` is what it threw.
 */
export type KeyRefusal = Data.TaggedEnum<{
  Circular: { readonly path: WirePath };
  Unkeyable: { readonly path: WirePath; readonly kind: UnkeyableKind; readonly brand: string };
  Unreadable: { readonly path: WirePath; readonly message: string };
}>;

/** Constructors and guards for {@link KeyRefusal}. */
export const KeyRefusal = Data.taggedEnum<KeyRefusal>();

/** `params.when`, or `the request` for a refusal found at the root. */
const where = (path: WirePath): string => (path.length === 0 ? "the request" : path.join("."));

/**
 * One sentence per {@link KeyRefusal}: where in the request, and what kind of
 * value — never the value itself.
 *
 * `Unreadable`'s sentence carries the thrown message, which can be text a host
 * wrote, so a sentence is never a span annotation (INV-QD-044).
 */
export const describeKeyRefusal: (self: KeyRefusal) => string = Match.type<KeyRefusal>().pipe(
  Match.tagsExhaustive({
    Circular: (refusal) => `${where(refusal.path)}: a circular reference has no request key`,
    Unkeyable: (refusal) => `${where(refusal.path)}: an unkeyable ${refusal.kind} (${refusal.brand}) has no request key`,
    Unreadable: (refusal) => `${where(refusal.path)}: reading it threw: ${refusal.message}`,
  }),
);

/**
 * Each policy tag mapped to its own node type, so a handler stored under a tag
 * receives exactly that tag's node.
 *
 * Stated once, here: the serving facet's leaf map and `servingFor` each kept a
 * copy of this index before ARCH-70 (ADR-QD-134). The mapped form, and not
 * `Extract<Policy, …>` at each use, is what lets a function generic in the tag
 * apply the handler stored under it (TS #47109).
 */
export type LeafOf = { readonly [T in Policy["_tag"]]: Extract<Policy, { readonly _tag: T }> };

/**
 * Where a read is made: the subject asking and the resource asked about, if
 * there is one.
 *
 * What a policy leaf cannot say for itself and a request needs. A leaf names
 * the question (`hasActed("approved")`); the site names who is asking and about
 * what, so the same leaf makes a different request at each.
 */
export interface ReadSite {
  readonly subject: AuthSubject;
  readonly resource: Resource | undefined;
}

/**
 * The request each policy leaf puts to one port, keyed by the leaf's tag, and
 * only for the tags that port reads.
 *
 * `P` is the request **as far as the site supplies it**: the port method's own
 * `Args` for four ports, and for `RelationshipResolver` the request whose
 * `resourceId` may still be absent, which is what a read with no resource id
 * annotates before it fails (ARCH-70, ADR-QD-134).
 */
export type LeafRequests<P extends ReadonlyArray<unknown>> = {
  readonly [T in Policy["_tag"]]?: (leaf: LeafOf[T], site: ReadSite) => P;
};

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
 * - `P` — the request as far as a read site supplies it: what `asks` build,
 *   and what `serving.asked` and the span's `pose` accept beside `Args`.
 *   Defaulted to `Args`, which is what it is for every port whose request has
 *   no part a site can leave out.
 * - `Span` — the span's attributes, exactly typed per port. Defaulted to the
 *   structural bound, so the generic derivations (`PortDerivation.ts`,
 *   `PortDoubles.ts`) need not name a port's fields.
 * - `Asks` — the leaves that read the port, exactly typed per port, so a read
 *   can call the entry for its own tag without asking whether there is one.
 *   Defaulted to the structural bound at `P`, which is all generic code needs.
 */
export interface PortDescription<
  N extends PortName,
  Self,
  Shape extends PortShape,
  Args extends ReadonlyArray<unknown>,
  A,
  E,
  P extends ReadonlyArray<unknown> = Args,
  Span extends PortSpanAttributesLike = PortSpanAttributesLike,
  Asks extends LeafRequests<P> = LeafRequests<P>,
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
  /**
   * What that span says: the question annotated before the call, the answer
   * annotated after it, and the two projections that fill them, `pose` from a
   * request to its question and `disclose` from the port's answer and its
   * request to the answer's fields (ADR-QD-051, BEH-QD-227, ADR-QD-109).
   * `PortAccess.ts` writes through it, local read and served read alike, and
   * `@qadi/devtools` reads through it, so a key and a projection are spelled
   * once, here. Every field is a `SpanValue`, which is INV-QD-044 as a type.
   *
   * `pose` also takes the request as far as the site supplies it (`P`), so a read that has no resource id can state its question
   * before it fails (ARCH-70).
   *
   * Typed `Span` for the exact per-port fields, intersected with the two
   * functions typed by *this description's* request and answer: a function
   * generic in the port (`readPort`) cannot call `Span`'s own `pose`, whose
   * parameter is `never`, but it can call these, the same correlation `wire`
   * gets from `PortWire<Args, A>`. Only the two functions are intersected, so
   * `Span`'s `question` and `answer` structs stay exact for `PortSpanRowOf`.
   */
  readonly attributes: Span & {
    readonly pose: (args: Args | P) => SpanType<SpanStruct<SpanFields>>;
    readonly disclose: (answer: A, args: Args) => SpanType<SpanStruct<SpanFields>>;
  };
  /**
   * What the port's question and answer look like on a wire: the only
   * statement of them off-process (ARCH-31, ADR-QD-107). `answerRemotely`
   * serves a port through it and `askRemotely` asks one through it, so a host
   * writes neither half by hand and a sixth port is a compile error until it
   * states its wire.
   *
   * Separate from {@link attributes} on purpose (INV-QD-044): a span field
   * cannot hold an attribute's value, and a wire must — to the session's own
   * subject.
   */
  readonly wire: PortWire<Args, A>;
  /**
   * The request each policy leaf puts to this port, as far as the read site
   * supplies it. The only place a leaf becomes a request: every read in
   * `PortAccess.ts` builds its request through it, and `servingFor` reads the
   * name each leaf asks from the same request (ARCH-70, ADR-QD-134), so a
   * served name and a read cannot disagree.
   *
   * A port lists only the tags it reads, and the entry's tag is the leaf's:
   * `asks.HasActed` receives a `HasActed` node. Building a request is cheap and
   * allocates nothing a read would not; serving work never runs here.
   */
  readonly asks: Asks;
  /**
   * What a host may answer about this port (ADR-QD-114). `answerRemotely`
   * admits a request through it and `servingFor` declares through it; which
   * name a leaf asks is `asked` of the request `asks` builds, not a statement
   * of its own.
   *
   * Typed by the description's own name `N`, so generic code reading
   * `d.serving.admitted(serving)` stays correlated with the port's
   * `PortServing` slot, the same way {@link wire} stays correlated with
   * `Args`.
   */
  readonly serving: PortServingFacet<N, Args, P>;
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
   * this builds (INV-QD-095).
   */
  readonly failure: (args: Args, cause: unknown) => E;
  /**
   * The port's own typed error for a call that **died** — what
   * `PortAccess.ts`'s `catchPortDefect` turns a defect into (ADR-QD-077).
   * Separate from `failure` because `CustomPredicateError` renders a defect
   * with `Cause.pretty`, not as the squashed value (D-10-e). A port built with
   * `makePortDescription` derives it as `failure(args, Cause.squash(cause))`
   * (ADR-QD-133); `CustomPredicate` states its own.
   */
  readonly defect: (args: Args, cause: Cause.Cause<unknown>) => E;
  /**
   * The text that identifies one request, or why it has none: two requests
   * share a key exactly when every argument is `Equal.equals`.
   *
   * A derived port's key is `canonicalKey` (`PortKey.ts`) over its wire
   * question (`makePortDescription`, ADR-QD-133), so a member the question
   * names cannot be left out of the key; `CustomPredicate` states its own,
   * over everything it receives (ADR-QD-094, ARCH-65). A capture taken for
   * one subject, resource, depth or param therefore never answers a question
   * about another, and two equal requests built in another order still share
   * one.
   * A request holding a value outside the key's domain (a cycle, a function,
   * a class instance) is refused with a {@link KeyRefusal} rather than
   * collided with another or thrown. A consumer branches on the `Result`;
   * the `Result` itself is never a map key.
   *
   * `PortKey.test.ts` checks the key's law once, the ARCH-69 describe of
   * `PortDescription.test.ts` checks that a derived key is its question's, and
   * the per-port rows of `PortConformance.test.ts` check only that each
   * argument reaches the key.
   */
  readonly key: (args: Args) => Result.Result<string, KeyRefusal>;
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
