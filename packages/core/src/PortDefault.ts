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
 * `shape` with the mark naming `port` set, as an own, enumerable, symbol-keyed property.
 *
 * An extensible `shape` is marked in place and returned as it is, so `#private` fields, internal slots
 * (a `Map`) and prototype methods keep working. A frozen, sealed or otherwise non-extensible one cannot
 * take a property, so it is copied with its prototype and its own descriptors (a getter stays a getter,
 * where a spread would freeze it); state outside own properties does not survive that copy, so a
 * decorator that wants it kept returns an extensible object.
 */
export const markDefault = <N extends PortName, Shape extends object>(
  port: N,
  shape: Shape,
): Shape & DefaultMark<N> =>
  Object.isExtensible(shape)
    ? Object.assign(shape, { [DEFAULT_OF]: port })
    : Object.create(Object.getPrototypeOf(shape), {
        ...Object.getOwnPropertyDescriptors(shape),
        ...Object.getOwnPropertyDescriptors({ [DEFAULT_OF]: port }),
      });

/**
 * Whether `service` carries the mark naming `port`.
 *
 * Reads the own property, never an inherited one (an `in`-based test would also
 * see a prototype's mark), and is total over any value.
 */
export const isMarkedDefault = (port: PortName, service: unknown): boolean => {
  if (typeof service !== "object" || service === null) return false;
  try {
    return Object.getOwnPropertyDescriptor(service, DEFAULT_OF)?.value === port;
  } catch {
    // A hostile or revoked proxy is not the default, and a diagnostic read must not throw.
    return false;
  }
};

/** `made` is a wrapper around `inner`: it is the port's default exactly when `inner` is. */
export const carryDefault = <N extends PortName, Shape extends object>(
  port: N,
  inner: unknown,
  made: Shape,
): Shape => (isMarkedDefault(port, inner) ? markDefault(port, made) : made);
