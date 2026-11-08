/**
 * What a port serves, stated once on its description: the host's declaration,
 * and the facet each port states about it (ARCH-53).
 *
 * "Which policy leaf asks which port, under what name, and how a host's
 * allowlist admits it" was stated six times — an admission table, a per-leaf
 * name collector, a collector interface and `servingFor`'s five hand-written
 * sets in `PortRemote.ts`, plus each wire's `asked`. Only two of those were
 * compile-checked. A {@link PortServingFacet} states it once, beside the port's
 * wire; `answerRemotely` admits through it and `servingFor` collects and
 * declares through it (ADR-QD-114, which amends ADR-QD-094 and ADR-QD-107; the
 * amendment was approved at the D-01 checkpoint of 2026-11-08).
 *
 * {@link PortServing} stays written out rather than derived. It is the public
 * declaration a host writes by hand, and each facet is typed against its slot,
 * so a facet whose allowlist word disagrees with the slot does not compile.
 *
 * This module is a **leaf**: it imports only `Policy.ts` and `PortMetrics.ts`
 * as types. `PortDescription.ts` must name these types, and `PortRemote.ts`
 * imports `Ports.ts`, which imports every port module, which imports
 * `PortDescription.ts`; the declaration living in `PortRemote.ts` closed that
 * cycle.
 */
import type { Policy } from "./Policy.ts";
import type { PortName } from "./PortMetrics.ts";

/**
 * What a host agrees to answer, port by port.
 *
 * A port that is not named is not served at all. Where a question is
 * open-ended and its answer is a value (an attribute) or a client-chosen
 * resource (a custom predicate), the allowlist is **required**: a host that
 * served any attribute name would serve `constructor` and `__proto__` too
 * (ARCH-31 C13). A relation or an event may be left open, because its answer is
 * a closed three-valued word that discloses no more than a policy tag does
 * (INV-QD-044). The signature port answers full `Signature` records — more than
 * evaluation reads — so serving it is an explicit one-member opt-in.
 */
export interface PortServing {
  readonly AttributeResolver?: { readonly attributes: ReadonlyArray<string> } | undefined;
  readonly RelationshipResolver?: { readonly relations?: ReadonlyArray<string> | undefined } | undefined;
  readonly DecisionHistory?: { readonly events?: ReadonlyArray<string> | undefined } | undefined;
  readonly CustomPredicate?: { readonly names: ReadonlyArray<string> } | undefined;
  readonly SignatureHistory?: { readonly signatures: "own-records" } | undefined;
}

/** The serving declaration of the one port named `K`. */
export type PortServingOf<K extends PortName> = NonNullable<PortServing[K]>;

/** Each policy tag mapped to its own node type, so a handler is typed by the tag it is stored under. */
type LeafOf = { readonly [T in Policy["_tag"]]: Extract<Policy, { readonly _tag: T }> };

/**
 * The word a port's `PortServing` slot earns: a field that admits `undefined`
 * is `"open"`, a list field is `"required"`, and anything else (the
 * `"own-records"` literal) is `"opt-in"`.
 */
type AllowlistOf<S> = undefined extends S[keyof S]
  ? "open"
  : S[keyof S] extends ReadonlyArray<string>
    ? "required"
    : "opt-in";

/**
 * The policy leaves one port answers, each with the name it asks.
 *
 * Keyed by policy tag and optional, so a port lists only the tags it reads. A
 * handler receives the node of the tag it is stored under, typed by that tag,
 * and returns the one name the leaf asks the port.
 */
export type ServedLeaves = { readonly [T in Policy["_tag"]]?: (leaf: LeafOf[T]) => string };

/**
 * What one port states about being served: the allowlist term, the leaves that
 * ask it, the name a request asks, how a declaration admits, and how one is
 * declared.
 *
 * `N` and `Args` are the description's own, so `admitted` and `declare` are
 * typed by the same `PortServingOf<N>` an `answerRemotely` parameter has, and
 * generic code reading `d.serving.admitted(serving)` stays correlated without a
 * cast.
 */
export interface PortServingFacet<N extends PortName, Args extends ReadonlyArray<unknown>> {
  /**
   * The allowlist's terms: `"required"` (a host must name every name it
   * serves), `"open"` (a host may leave the port unrestricted) or `"opt-in"`
   * (the port is served only when declared, and has no names). Checked against
   * the port's `PortServing` slot, so a word that disagrees with it does not
   * compile.
   */
  readonly allowlist: AllowlistOf<PortServingOf<N>>;
  /** The policy leaf tags that read this port, each with the name it asks. */
  readonly leaves: ServedLeaves;
  /**
   * The one name an allowlist admits or refuses for a request: the attribute,
   * the relation, the event, the predicate's name; `undefined` where the port
   * has none.
   */
  readonly asked: (args: Args) => string | undefined;
  /**
   * The names a declaration admits, or `undefined` when it leaves the port
   * open. A required list declared empty admits nothing.
   */
  readonly admitted: (declaration: PortServingOf<N>) => ReadonlyArray<string> | undefined;
  /**
   * The declaration that serves exactly `names`, as this port's own member of
   * a {@link PortServing}. An opt-in port declares itself only when `names` is
   * not empty and contributes nothing otherwise.
   */
  readonly declare: (names: ReadonlyArray<string>) => Pick<PortServing, N>;
}
