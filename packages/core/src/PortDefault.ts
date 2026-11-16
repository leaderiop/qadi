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

/** `shape` with the mark naming `port` set, as an own, enumerable, symbol-keyed property. */
export const markDefault = <N extends PortName, Shape extends object>(
  port: N,
  shape: Shape,
): Shape & DefaultMark<N> => ({ ...shape, [DEFAULT_OF]: port });

/**
 * Whether `service` carries the mark naming `port`.
 *
 * Reads the own property, never an inherited one (an `in`-based test would also
 * see a prototype's mark), and is total over any value.
 */
export const isMarkedDefault = (port: PortName, service: unknown): boolean =>
  typeof service === "object" &&
  service !== null &&
  Object.getOwnPropertyDescriptor(service, DEFAULT_OF)?.value === port;

/** `made` is a wrapper around `inner`: it is the port's default exactly when `inner` is. */
export const carryDefault = <N extends PortName, Shape extends object>(
  port: N,
  inner: unknown,
  made: Shape,
): Shape => (isMarkedDefault(port, inner) ? markDefault(port, made) : made);
