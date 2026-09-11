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
import * as Layer from "effect/Layer";
import * as ManagedRuntime from "effect/ManagedRuntime";
import { test } from "vitest";
import { fromRoles } from "../src/AuthSubject.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { decisionCacheLayer } from "../src/DecisionCache.ts";
import { evaluate } from "../src/Evaluate.ts";
import { EvaluationServicesNone } from "../src/EvaluationServicesNone.ts";
import { permission } from "../src/Permission.ts";
import { hasPermission } from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import { role } from "../src/Role.ts";

const read = permission("document", "read");
const editor = role({ name: "editor", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [editor] });

const services = Layer.mergeAll(EvaluationServicesNone, currentSubjectLayer(alice));

const options = { time: 1000, warmupTime: 300 };

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
