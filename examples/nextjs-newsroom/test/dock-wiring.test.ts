/**
 * What the dock's Services panel reads, and whether it is the cache the atoms use.
 *
 * `decisionCacheLayer` keeps its state in the closure of a `Layer.effect`, so a
 * layer *value* built twice is two caches. The atoms build `browserLayer` in
 * their registry's memo map, and `Effect.provide` builds it again in a memo map
 * of its own: the dock then reported "0 completed entries" for as long as the
 * page was open, whatever the atoms had cached. These tests pin that the cache
 * both read is one instance.
 */
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as Layer from "effect/Layer";
import {
  currentSubjectLayer,
  DecisionCache,
  evaluate,
  EvaluationServicesNone,
  hasRole,
} from "@qadi/core";
import type { DecisionCacheShape } from "@qadi/core";
import { wiringReport } from "@qadi/devtools";
import { atoms, browserLayer } from "../src/client/atoms.ts";
import { diagnostics } from "../src/client/Dock.tsx";
import { users } from "../src/domain/subjects.ts";

/** The cache the atoms' own runtime built, read the way an atom reads it. */
const cacheOfAtoms = async (): Promise<DecisionCacheShape | undefined> => {
  const registry = AtomRegistry.make();
  const atom = atoms.runtime.atom(Effect.serviceOption(DecisionCache));
  const release = registry.mount(atom);
  try {
    for (let tries = 0; tries < 50; tries += 1) {
      const result = registry.get(atom);
      if (AsyncResult.isSuccess(result)) return Option.getOrUndefined(result.value);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    return undefined;
  } finally {
    release();
  }
};

/** The cache the dock reads: the same layer, provided to its own run. */
const cacheOfDock = () =>
  Effect.runPromise(Effect.provide(Effect.serviceOption(DecisionCache), browserLayer)).then(
    Option.getOrUndefined,
  );

describe("the dock's wiring read", () => {
  it("sees the cache the atoms use", async () => {
    const fromAtoms = await cacheOfAtoms();
    const fromDock = await cacheOfDock();
    expect(fromAtoms).toBeDefined();
    expect(fromDock).toBeDefined();
    expect(fromDock).toBe(fromAtoms);
  });

  it("hands the dock the layer the atoms are built from", () => {
    expect(diagnostics.layer).toBe(browserLayer);
  });

  it("reports an entry the atoms' cache computed", async () => {
    const cache = await cacheOfAtoms();
    const first = users[0];
    if (cache === undefined || first === undefined) throw new Error("nothing to evaluate with");

    await Effect.runPromise(
      evaluate(hasRole("Editor")).pipe(
        Effect.provideService(DecisionCache, cache),
        Effect.provide(Layer.mergeAll(EvaluationServicesNone, currentSubjectLayer(first.subject))),
      ),
    );

    const report = await Effect.runPromise(Effect.provide(wiringReport, browserLayer));
    expect(report.cache.size).toBeGreaterThanOrEqual(1);
  });
});
