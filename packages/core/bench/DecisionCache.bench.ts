/**
 * What `getOrCompute` costs on each of its three outcomes.
 *
 * ADR-QD-031 built the cache around a structural key — `Equal.equals` walks
 * subject, policy and resource whenever the reference shortcut misses — and
 * ADR-QD-051's own standard is that a claim carries a figure. This is the
 * figure: `Evaluate.bench.ts` measures a bare evaluation, this file measures
 * what the cache adds or saves around one.
 *
 * Two workloads, not three: a genuine `coalesced` join needs two fibers
 * racing on the same in-flight key, which is a different unit of work from a
 * single call and does not compare against `hit`/`miss` on the same axis
 * without its own separate baseline — DecisionCache.test.ts's own
 * `coalesced join` tests already prove the mechanism works, and a benchmark
 * that cannot be read against the other two rows is not worth the words this
 * file's own precedent (`Evaluate.bench.ts`) would need to explain it.
 *
 *   hit    the same policy/subject/resource looked up again — every
 *          comparison the structural key does, on the shortest path through it
 *   miss   a distinct policy per call, so every lookup inserts rather than
 *          finds — the HashMap grows across the run, the way an
 *          application-scoped cache serving many distinct requests does
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { test } from "vitest";
import { fromRoles } from "../src/AuthSubject.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { decisionCacheLayer } from "../src/DecisionCache.ts";
import { evaluate } from "../src/Evaluate.ts";
import { EvaluationServicesNone } from "../src/EvaluationServicesNone.ts";
import { permission } from "../src/Permission.ts";
import { allOf, hasPermission, hasRole } from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import { role } from "../src/Role.ts";

const read = permission("document", "read");
const editor = role({ name: "editor", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [editor] });

const services = Layer.mergeAll(EvaluationServicesNone, currentSubjectLayer(alice));

const options = { time: 1000, warmupTime: 300 };

/**
 * An eight-leaf `allOf` tree, not a single `HasPermission` node — the `hit`
 * workload below's own reason for existing (measuring "every comparison the
 * structural key does") is understated by a one-node policy, since
 * `Equal.equals`'s structural walk is exactly as deep as the tree it walks
 * (CO-04).
 */
const realisticTree: Policy = allOf([
  hasPermission(read),
  hasPermission(permission("document", "write")),
  hasRole("editor"),
  hasRole("reviewer"),
  hasPermission(permission("document", "archive")),
  hasPermission(permission("document", "share")),
  hasRole("admin"),
  hasPermission(permission("document", "delete")),
]);

test("DecisionCache.getOrCompute — hit", async ({ bench }) => {
  // One cache, built once — every iteration below looks up the *same* key,
  // structurally, so after the first call every one of these is a hit.
  const runtime = ManagedRuntime.make(Layer.mergeAll(services, decisionCacheLayer()));
  const policy = hasPermission(read);
  runtime.runSync(evaluate(policy)); // warm the entry once, outside the timed loop

  await bench.compare(
    bench("repeated lookup, same subject/policy/resource", () => {
      runtime.runSync(evaluate(policy));
    }),
    options,
  );
});

test("DecisionCache.getOrCompute — hit, realistic tree", async ({ bench }) => {
  // Same shape as the one-node `hit` bench above, against `realisticTree`
  // instead — same object reference every call, so this isolates tree size
  // from the "fresh object" cost the next bench measures separately (CO-04).
  const runtime = ManagedRuntime.make(Layer.mergeAll(services, decisionCacheLayer()));
  runtime.runSync(evaluate(realisticTree));

  await bench.compare(
    bench("repeated lookup, same subject/tree/resource", () => {
      runtime.runSync(evaluate(realisticTree));
    }),
    options,
  );
});

test("DecisionCache.getOrCompute — hit, fresh-but-equal subject per lookup", async ({
  bench,
}) => {
  // The gap CO-04 named: `@qadi/http`'s `SubjectExtractor` rebuilds an
  // `AuthSubject` per request, so the normal shape in that deployment is a
  // NEW object, structurally equal to the previous one, on every lookup —
  // never the same reference twice. `getOrCompute`'s key is the whole
  // subject plus the whole policy (`DecisionCache.ts`), so a fresh subject
  // defeats the reference shortcut and pays the full structural hash+equals
  // walk every time, even though the two subjects are `Equal.equals`-equal.
  // effect rc.116 caches per-object hashes in a `WeakMap` and pairwise
  // equality results in an `equalityCache` (confirmed against the installed
  // build, `Hash.js`/`Equal.js`) — a recurring object is cheap after first
  // contact, but a genuinely fresh one on every call is not a "recurring
  // object" and cannot benefit from either cache. If a future `effect`
  // upgrade drops or narrows that memoization, this is the bench that would
  // show it, which is the point of measuring it rather than only asserting
  // it in a doc comment.
  // One runtime and one cache, reused across every iteration — only the
  // subject is rebuilt per call, via `Effect.provide` layered on top, so this
  // isolates "fresh subject" from "fresh cache"/"fresh runtime", which a
  // rebuilt-runtime-per-call version would conflate.
  const runtime = ManagedRuntime.make(Layer.mergeAll(EvaluationServicesNone, decisionCacheLayer()));
  const freshAlice = () => fromRoles({ id: "alice", roles: [editor] });
  runtime.runSync(evaluate(realisticTree).pipe(Effect.provide(currentSubjectLayer(freshAlice()))));

  await bench.compare(
    bench("distinct-but-equal subject object per call", () => {
      runtime.runSync(evaluate(realisticTree).pipe(Effect.provide(currentSubjectLayer(freshAlice()))));
    }),
    options,
  );
});

test("DecisionCache.getOrCompute — miss", async ({ bench }) => {
  // One runtime, reused — only the cache's own HashMap grows per call, never
  // the layer. A distinct role name per policy makes each lookup structurally
  // new, so every call inserts rather than finds.
  const runtime = ManagedRuntime.make(Layer.mergeAll(services, decisionCacheLayer()));
  let counter = 0;
  const nextPolicy = (): Policy => hasPermission(permission("document", `read-${counter++}`));

  await bench.compare(
    bench("distinct policy per call, cache grows across the run", () => {
      runtime.runSync(evaluate(nextPolicy()));
    }),
    options,
  );
});
