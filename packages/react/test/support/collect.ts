/**
 * Forces a garbage collection from inside a test, with no CLI flag.
 *
 * `effect`'s `Atom.family` holds its values in `WeakRef`s, so "the same
 * question gets the same atom" is only as strong as something else holding the
 * atom. A test that wants to see that gap has to collect, and a vitest run is
 * not started with `--expose-gc`; `v8.setFlagsFromString` plus a fresh `vm`
 * context hands back the collector anyway.
 *
 * The macrotask yield between collections is required: a `WeakRef` target is
 * kept alive for the rest of the job that created or dereferenced it, so a
 * collection in the same turn collects nothing. If a future Node stops
 * exposing the collector this throws, rather than letting a collection test
 * pass without having collected.
 */
import * as v8 from "node:v8";
import * as vm from "node:vm";

v8.setFlagsFromString("--expose-gc");
const gc: unknown = vm.runInNewContext("gc");

export const collect = async (): Promise<void> => {
  if (typeof gc !== "function") {
    throw new Error("collect: the garbage collector is not exposed; a collection test cannot run");
  }
  for (let i = 0; i < 5; i += 1) {
    gc();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  }
};
