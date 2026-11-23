/**
 * What the gate tests share: the count of notifications a gate registry makes
 * (`listenTo`, `notificationsOf`), and a policy that is new on every call (`newCanRead`).
 *
 * Tests that state how many times a registry told its subscribers share this one
 * counter, so the subscription and the running count are written once and every test
 * reads them the same way.
 */
import { hasPermission, permission } from "@qadi/core";
import type { GateRegistry } from "../../src/GateRegistry.ts";

/** What one subscription to a registry has heard, and the way to end it. */
interface Notifications {
  /** The count of notifications heard since the subscription. */
  readonly told: () => number;
  readonly unsubscribe: () => void;
}

/** Subscribes to `registry` once, for a test that also ends the subscription. */
export const listenTo = (registry: GateRegistry): Notifications => {
  let heard = 0;
  const unsubscribe = registry.subscribe(() => {
    heard += 1;
  });
  return { told: () => heard, unsubscribe };
};

/** Subscribes to `registry` once; the reader returned gives the count heard since. */
export const notificationsOf = (registry: GateRegistry): (() => number) =>
  listenTo(registry).told;

/**
 * A new `doc:read` policy on every call, so a test can tell an equal policy from the
 * same one.
 */
export const newCanRead = () => hasPermission(permission("doc", "read"));
