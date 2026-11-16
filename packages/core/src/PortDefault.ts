/**
 * Whether a port's service is that port's fail-closed default, as a fact the
 * service carries.
 *
 * A name cannot say it: a wrapper composes `"<inner> (<suffix>)"` for display
 * (BEH-QD-196), and a host's own wrapper may call itself anything. Package-private
 * (not in the barrel): the symbol cannot be minted outside core, so a wrapper can
 * only carry the mark forward by spreading `inner` (ARCH-94, ADR-QD-099).
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
 * A copy of `shape` with the mark naming `port` set, as an own, enumerable, symbol-keyed property.
 *
 * The copy keeps `shape`'s prototype and its own descriptors, so a decorator that returns a class
 * instance keeps its prototype methods and a getter stays a getter (a spread would drop the first
 * and freeze the second).
 */
export const markDefault = <N extends PortName, Shape extends object>(
  port: N,
  shape: Shape,
): Shape & DefaultMark<N> =>
  Object.create(Object.getPrototypeOf(shape), {
    ...Object.getOwnPropertyDescriptors(shape),
    [DEFAULT_OF]: { value: port, enumerable: true, writable: true, configurable: true },
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
