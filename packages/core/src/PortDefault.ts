/**
 * Whether a port's service is that port's fail-closed default, as a fact the
 * service carries.
 *
 * A name cannot say it: a wrapper composes `"<inner> (<suffix>)"` for display
 * (BEH-QD-196), and a host's own wrapper may call itself anything. Package-private
 * (not in the barrel): the key is not exported and cannot be minted with `Symbol.for`,
 * so a wrapper carries the mark by spreading `inner`. It can be read off an existing
 * default with `Object.getOwnPropertySymbols`, so copying it is possible but deliberate:
 * the mark labels a diagnostic and guards nothing (ARCH-94, ADR-QD-099).
 */
import type { PortName } from "./PortName.ts";

/**
 * The mark's key: unique to this module instance, never the global registry's
 * `Symbol.for`, which anyone could mint.
 */
const DEFAULT_OF: unique symbol = Symbol("qadi.PortDefault");

/** The mark: the name of the port whose fail-closed default the shape is. */
export interface DefaultMark<N extends PortName> {
  readonly [DEFAULT_OF]: N;
}

/**
 * Defines `mark` on `shape` itself, and whether it took.
 *
 * `Reflect.defineProperty` answers `false` for a non-extensible object and for a proxy whose trap
 * refuses, and ignores an inherited read-only mark, where an assignment would throw. A trap that
 * throws is a refusal too: marking never fails the layer that built the shape.
 */
const defineMark = <N extends PortName, Shape extends object>(
  shape: Shape,
  mark: TypedPropertyDescriptor<N>,
): shape is Shape & DefaultMark<N> => {
  try {
    return Reflect.defineProperty(shape, DEFAULT_OF, mark);
  } catch {
    return false;
  }
};

/**
 * `shape` with the mark naming `port` set, as an own, enumerable, symbol-keyed property.
 *
 * A `shape` that accepts the property is marked in place and returned as it is, so `#private` fields,
 * internal slots (a `Map`) and prototype methods keep working. One that does not (frozen, sealed or
 * otherwise non-extensible, or a proxy that refuses the define) is copied with its prototype and its
 * own descriptors (a getter stays a getter, where a spread would freeze it); state outside own
 * properties does not survive that copy, so a decorator that wants it kept returns an object that
 * accepts the property.
 */
export const markDefault = <N extends PortName, Shape extends object>(
  port: N,
  shape: Shape,
): Shape & DefaultMark<N> => {
  const mark = Object.getOwnPropertyDescriptors({ [DEFAULT_OF]: port });
  return defineMark(shape, mark[DEFAULT_OF])
    ? shape
    : Object.create(Object.getPrototypeOf(shape), {
        ...Object.getOwnPropertyDescriptors(shape),
        ...mark,
      });
};

/** The own mark descriptor of `service`, or `undefined` when it has none or the read throws. */
const ownMark = (service: unknown): PropertyDescriptor | undefined => {
  try {
    return Object.getOwnPropertyDescriptor(service, DEFAULT_OF);
  } catch {
    // A hostile or revoked proxy, or a value that is not an object, has no mark to read.
    return undefined;
  }
};

/**
 * Whether `service` carries the mark naming `port`.
 *
 * Reads the own property, never an inherited one (an `in`-based test would also
 * see a prototype's mark), and is total over any value.
 */
export const isMarkedDefault = (port: PortName, service: unknown): boolean =>
  ownMark(service)?.value === port;

/** `made` is a wrapper around `inner`: it is the port's default exactly when `inner` is. */
export const carryDefault = <N extends PortName, Shape extends object>(
  port: N,
  inner: unknown,
  made: Shape,
): Shape => (isMarkedDefault(port, inner) ? markDefault(port, made) : made);
