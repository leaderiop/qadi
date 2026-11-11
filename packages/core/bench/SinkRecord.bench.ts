/**
 * What constructing a sink record costs under the candidate record shapes (ARCH-71).
 *
 * Three constructors build the same record from the same fields:
 *
 * - today's `DecisionRecord` / `ObligationRecord`, a `Data.TaggedClass` whose field type is written by hand;
 * - (A) a `Data.TaggedClass` whose field type is a shared `Schema.Struct`'s `Type`, so the class
 *   and the wire struct can state their fields once and `new` stays a plain assignment;
 * - (B) a `Schema.TaggedClass` over the same fields, the way ADR-QD-060 made an error class its own
 *   wire schema.
 *
 * `evaluate` builds a record on every evaluation, with a sink wired or not (`Lifecycle.ts` constructs
 * it before `emit`, which is a no-op when nothing is listening), so a constructor that parses its
 * input is paid on the evaluation path. `Schema.TaggedClass`'s constructor calls `struct.make(input)`
 * on every `new` (`makeClass`, `Schema.ts`), and for a decision that walks the whole `Policy`. This
 * file measures that cost on a one-node, an `allOf`×8 and an `allOf`×64 policy, so the choice between
 * A and B is made with numbers (SREC-01) rather than by taste.
 *
 * The classes below are bench-local and never exported: nothing in `packages/*` imports them.
 *
 * This is the frozen record of ADR-QD-135's measurement. Option A won, so "today" and A now
 * measure the same shape, and `decisionFields` / `obligationFields` below are copies of
 * `SinkRecordFields.ts` kept independent on purpose: re-deriving them from the leaf would change
 * what the comparison measured. They are not kept in step with the leaf.
 */
import * as Data from "effect/Data";
import * as Schema from "effect/Schema";
import { test } from "vitest";
import { Allow } from "../src/Decision.ts";
import type { AllowingTrace } from "../src/Decision.ts";
import { Decided, DecisionRecord, Failed, ObligationRecord } from "../src/DecisionRecord.ts";
import type { DecisionOutcome } from "../src/DecisionRecord.ts";
import { makeResourceId, makeSubjectId, ResourceIdSchema, SubjectIdSchema } from "../src/Identity.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";

const read = permission("doc", "read");

// Bound once: reading a class through the module's export getter on every call is overhead
// vitest's module runner adds to the measurement (its "accessed module export getters" warning),
// and it would count against one row alone.
const TodayDecision = DecisionRecord;
const TodayObligation = ObligationRecord;
const IsDecided = Decided;
const IsFailed = Failed;

/** The decision envelope's fields in wire order; the outcome stays out, as it does on the wire. */
const decisionFields = Schema.Struct({
  evaluationId: Schema.String,
  at: Schema.Finite,
  subjectId: SubjectIdSchema,
  policy: P.Policy,
  resource: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  action: Schema.optional(Schema.String),
  cache: Schema.optional(Schema.Literals(["hit", "coalesced", "miss"])),
});

const obligationFields = Schema.Struct({
  evaluationId: Schema.String,
  at: Schema.Finite,
  outcome: Schema.Literals(["Discharged", "HandlerFailed", "Refused", "NotRequired"]),
  obligationIds: Schema.Array(Schema.String),
  subjectId: Schema.optional(SubjectIdSchema),
  action: Schema.optional(Schema.String),
  resourceId: Schema.optional(ResourceIdSchema),
});

class DecisionA extends Data.TaggedClass("Decision")<
  typeof decisionFields.Type & { readonly outcome: DecisionOutcome }
> {}

class ObligationA extends Data.TaggedClass("Obligations")<typeof obligationFields.Type> {}

class DecisionB extends Schema.TaggedClass<DecisionB>()("Decision", {
  ...decisionFields.fields,
  outcome: Schema.declare((u: unknown): u is DecisionOutcome => u instanceof IsDecided || u instanceof IsFailed),
}) {}

class ObligationB extends Schema.TaggedClass<ObligationB>()("Obligations", obligationFields.fields) {}

const leafTrace: AllowingTrace = { policyTag: "HasPermission", allowed: true, children: [], obligations: [] };

const outcome = new Decided({
  decision: new Allow({
    evaluationId: "bench",
    subjectId: makeSubjectId("u1"),
    durationMillis: 1,
    trace: leafTrace,
  }),
});

const nested = (levels: number): P.Policy => {
  let policy: P.Policy = P.hasPermission(read);
  for (let i = 0; i < levels; i++) policy = P.allOf([policy]);
  return policy;
};

const policies: ReadonlyArray<readonly [string, P.Policy]> = [
  ["one node", P.hasPermission(read)],
  ["allOf×8", P.allOf(Array.from({ length: 8 }, () => P.hasPermission(read)))],
  ["allOf×64", nested(64)],
];

const resource = { id: "doc-1", owner: "u1" };
const subjectId = makeSubjectId("u1");
const resourceId = makeResourceId("doc-1");

const options = { time: 1000, warmupTime: 300 };

for (const [name, policy] of policies) {
  test(`construct a decision record — ${name}`, async ({ bench }) => {
    await bench.compare(
      bench("today: DecisionRecord", () =>
        new TodayDecision({
          evaluationId: "bench",
          at: 1,
          subjectId,
          policy,
          resource,
          action: "read",
          outcome,
        })),
      bench("A: Data.TaggedClass over a shared struct", () =>
        new DecisionA({
          evaluationId: "bench",
          at: 1,
          subjectId,
          policy,
          resource,
          action: "read",
          outcome,
        })),
      bench("B: Schema.TaggedClass", () =>
        new DecisionB({
          evaluationId: "bench",
          at: 1,
          subjectId,
          policy,
          resource,
          action: "read",
          outcome,
        })),
      options,
    );
  });
}

test("construct an obligation record — all identity keys", async ({ bench }) => {
  await bench.compare(
    bench("today: ObligationRecord", () =>
      new TodayObligation({
        evaluationId: "bench",
        at: 1,
        outcome: "Discharged",
        obligationIds: ["audit.log"],
        subjectId,
        action: "approve",
        resourceId,
      })),
    bench("A: Data.TaggedClass over a shared struct", () =>
      new ObligationA({
        evaluationId: "bench",
        at: 1,
        outcome: "Discharged",
        obligationIds: ["audit.log"],
        subjectId,
        action: "approve",
        resourceId,
      })),
    bench("B: Schema.TaggedClass", () =>
      new ObligationB({
        evaluationId: "bench",
        at: 1,
        outcome: "Discharged",
        obligationIds: ["audit.log"],
        subjectId,
        action: "approve",
        resourceId,
      })),
    options,
  );
});
