import "server-only";
/**
 * One Effect runtime for this server process.
 *
 * **Pinned to `globalThis`, and it is load-bearing.** Next's dev server
 * re-evaluates module graphs on every edit, so a plain module-scope
 * `ManagedRuntime.make` gives you a second runtime — a second decision cache, a
 * second sink, a second ring — while the first is still referenced by whatever
 * imported it earlier. The symptom is a devtools log that goes empty after a hot
 * reload and a cache that never hits, which reads as a Qadi bug and is not one.
 *
 * Every published Effect-and-Next recipe reaches for `globalValue` from
 * `effect/GlobalValue` here. **That module does not exist in Effect v4** — it
 * was a v3 API, and `effect@4.0.0-rc.110` ships no `GlobalValue` at all. So the
 * two lines it would have saved are written out, and this comment exists so the
 * next person does not spend an afternoon on the import.
 *
 * Disposed on SIGINT and SIGTERM. Neither fires in a serverless invocation,
 * which is why `/api/edge` uses a forwarding sink instead of relying on
 * teardown: a ring in a process that ends without notice takes its records with
 * it ([ADR-QD-045](../../../../spec/decisions/045-the-topology-is-a-choice-of-sink.md)).
 */
import * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { currentSubjectLayer } from "@qadi/core";
import type { AuthSubject, CurrentSubject } from "@qadi/core";
import { AppLayer } from "./layer.ts";

/** Everything `AppLayer` provides, named once so `runAs` can say it. */
export type AppServices = Layer.Success<typeof AppLayer>;

// Declared rather than reached through a cast: `globalThis` is typed, so this
// costs one `declare global` and no `as`.
declare global {
  // eslint-disable-next-line no-var
  var __qadiNewsroomRuntime: ManagedRuntime.ManagedRuntime<AppServices, never> | undefined;
}

const make = (): ManagedRuntime.ManagedRuntime<AppServices, never> => {
  const made = ManagedRuntime.make(AppLayer);
  const dispose = () => {
    void made.dispose();
  };
  process.once("SIGINT", dispose);
  process.once("SIGTERM", dispose);
  return made;
};

export const runtime: ManagedRuntime.ManagedRuntime<AppServices, never> =
  (globalThis.__qadiNewsroomRuntime ??= make());

/**
 * Runs one effect for one subject.
 *
 * `CurrentSubject` is supplied here rather than baked into `AppLayer`, which is
 * the same split `makeQadiAtoms` makes and for the same reason: the subject
 * changes per request and the resolvers do not, so a login must not rebuild the
 * attribute resolver or empty the decision cache.
 */
export const runAs = <A, E>(
  subject: AuthSubject,
  effect: Effect.Effect<A, E, AppServices | CurrentSubject>,
): Promise<A> => runtime.runPromise(Effect.provide(effect, currentSubjectLayer(subject)));
