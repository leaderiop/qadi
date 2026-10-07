/**
 * The canonical text of a value, for a port description's request `key`.
 *
 * `JSON.stringify` alone cannot key a request that carries an `AuthSubject`:
 * it writes a `Set` as `{}`, so a subject's roles and permissions would
 * vanish from the key, and it writes an object's keys in insertion order, so
 * two structurally equal subjects could key apart. A `PortDescription.key` is
 * injective over every argument the port receives (ADR-QD-094), which needs
 * both fixed.
 *
 * A `Set` is written as its members sorted by their own canonical text, a
 * `Map` as its entries sorted by key text, and an object with its keys in
 * sorted order. Everything else is `JSON.stringify`'s. It throws exactly where
 * `JSON.stringify` does (a circular structure, a `BigInt`), which the `key`
 * contract already routes to the port's typed error.
 *
 * Package-private: not in the barrel.
 */
import * as Predicate from "effect/Predicate";

const byText = (a: readonly [string, unknown], b: readonly [string, unknown]): number =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;

const canonicalReplacer = (_key: string, value: unknown): unknown => {
  if (Predicate.isSet(value)) {
    const members: Array<readonly [string, unknown]> = Array.from(value, (member) => [
      canonicalKey(member),
      member,
    ]);
    return members.toSorted(byText).map(([, member]) => member);
  }
  if (Predicate.isMap(value)) {
    const entries: Array<readonly [string, unknown]> = Array.from(value, ([k, v]) => [
      canonicalKey(k),
      [k, v],
    ]);
    return entries.toSorted(byText).map(([, entry]) => entry);
  }
  if (Predicate.isObject(value)) {
    return Object.fromEntries(Object.entries(value).toSorted(byText));
  }
  return value;
};

/** The canonical JSON text of `value`: insertion order and `Set` order do not matter. */
export const canonicalKey = (value: unknown): string => JSON.stringify(value, canonicalReplacer);
