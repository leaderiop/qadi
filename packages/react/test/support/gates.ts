/**
 * Counts the notifications a gate registry makes.
 *
 * Tests that state how many times a registry told its subscribers share this one counter,
 * so the subscription and the running count are written once and every test reads them
 * the same way.
 */
import type { GateRegistry } from "../../src/GateRegistry.ts";

/** Subscribes to `registry` once; the reader returned gives the count heard since. */
export const notificationsOf = (registry: GateRegistry): (() => number) => {
  let told = 0;
  registry.subscribe(() => {
    told += 1;
  });
  return () => told;
};
