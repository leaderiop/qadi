/**
 * JOB 5 ledger — E5.1 … E5.7.
 *
 * Two halves. `replayInput` seeds a form from a logged row, and the thing worth
 * testing hardest is what it **cannot** seed: a form that filled itself in
 * reads as a faithful reproduction when half of it was guessed. `baselineDiff`
 * checks the reconstruction back against the row, and the thing worth testing
 * hardest there is that it declines to claim a match it cannot attest to.
 *
 * The end-to-end case at the bottom is the one that proves the feature: a real
 * evaluation is logged, replayed, and reconstructed with the right grants —
 * with no live resolver anywhere, because the record already carries the trace.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  SignatureHistoryNone,
  Decided,
  decisionSinkRing,
  DecisionHistoryUnknown,
  evaluate,
  evaluationIdSequential,
  Failed,
  fromRoles,
  hasPermission,
  hasRole,
  MissingResource,
  permission,
  RelationshipResolverNever,
  role,
} from "@qadi/core";
import type { DecisionOutcome, StoredRecord, Trace } from "@qadi/core";
import {
  baselineDiff,
  emptyTimeline,
  ingestAll,
  matchesBaseline,
  replayInput,
  simulate,
  unseededByReplay,
  verdictOfOutcome,
} from "../../src/index.ts";
import type { Baseline, Replay, TimelineEntry } from "../../src/index.ts";
import {
  allow,
  allowTrace,
  decisionRecord,
  deny,
  failedRecord,
  obligationRecord,
  readPolicy,
} from "../helpers.ts";

const read = permission("doc", "read");

const entryOf = (record: StoredRecord): TimelineEntry => {
  const [entry] = ingestAll(emptyTimeline(), [record]).entries;
  if (entry === undefined) throw new Error("expected an entry");
  return entry;
};

const replayable = (self: Replay) => {
  if (self._tag !== "Replayable") throw new Error(`expected Replayable: ${self.reason}`);
  return self;
};

const checked = (self: Baseline) => {
  if (self._tag !== "Checked") throw new Error(`expected Checked: ${self.reason}`);
  return self;
};

describe("replayInput", () => {
  // E5.1
  it("seeds the policy, the subject id, the action and the resource", () => {
    const seeded = replayable(
      replayInput(
        entryOf(
          decisionRecord({
            evaluationId: "ev-91",
            policy: readPolicy,
            action: "read",
            resource: { id: "doc-1", owner: "bob" },
            outcome: new Decided({ decision: allow({ subjectId: "alice" }) }),
          }),
        ),
      ),
    );

    assert.strictEqual(seeded.evaluationId, "ev-91");
    assert.deepStrictEqual(seeded.policy, readPolicy);
    assert.strictEqual(seeded.input.subject.id, "alice");
    assert.strictEqual(seeded.input.action, "read");
    assert.deepStrictEqual(seeded.input.resource, { id: "doc-1", owner: "bob" });
  });

  it("leaves out an action or resource the row did not carry", () => {
    const seeded = replayable(replayInput(entryOf(decisionRecord({}))));

    // Absent, not present-and-undefined. The distinction is invisible to
    // `evaluate`, which reads `options?.action` either way, but it is exactly
    // what `exactOptionalPropertyTypes` is switched on to keep honest — and a
    // form binding to `"action" in input` would render an empty control for a
    // question the row never asked.
    assert.isFalse(Object.hasOwn(seeded.input, "action"));
    assert.isFalse(Object.hasOwn(seeded.input, "resource"));
  });

  /**
   * E5.2, and the point of the whole `unseeded` list. A record names the
   * subject by id and carries nothing else about them, and it carries what the
   * ports answered only inside its trace. Seeding the form and staying quiet
   * about that would present a reconstruction the reviewer largely invented as
   * a reproduction of what happened.
   */
  it("seeds no grant at all, and names every field it could not fill", () => {
    const seeded = replayable(replayInput(entryOf(decisionRecord({}))));

    assert.isUndefined(seeded.input.subject.roles);
    assert.isUndefined(seeded.input.subject.permissions);
    assert.isUndefined(seeded.input.subject.attributes);
    assert.isUndefined(seeded.input.attributes);
    assert.isUndefined(seeded.input.relationships);
    assert.isUndefined(seeded.input.history);

    assert.deepStrictEqual(
      seeded.unseeded.map((one) => one.field),
      [
        "roles",
        "permissions",
        "subject attributes",
        "resolver attributes",
        "relationships",
        "history",
      ],
    );
    assert.isTrue(seeded.unseeded.every((one) => one.reason.length > 0));
    assert.deepStrictEqual(seeded.unseeded, unseededByReplay);
  });

  /**
   * E5.5's first half. `subjectId` lives on the `Decision`, so a failed row
   * carries no subject at all — the row is still worth replaying, and the blank
   * is one more thing to say rather than a reason to refuse.
   */
  it("names the subject id too when the logged evaluation never decided", () => {
    const seeded = replayable(replayInput(entryOf(failedRecord({ evaluationId: "ev-7" }))));

    assert.strictEqual(seeded.input.subject.id, "");
    assert.deepStrictEqual(seeded.unseeded[0], {
      field: "subject id",
      reason: "the evaluation failed before deciding, and the id lives on the decision",
    });
    assert.strictEqual(seeded.unseeded.length, unseededByReplay.length + 1);
  });

  // E5.6
  it("refuses an orphan, which carries no policy to run", () => {
    const refused = replayInput(entryOf(obligationRecord({ evaluationId: "ev-orphan" })));

    assert.deepStrictEqual(refused, {
      _tag: "NotReplayable",
      reason: "this row is an obligation outcome with no decision on it, so it carries no policy",
    });
  });
});

describe("baselineDiff", () => {
  const simulated = (outcome: DecisionOutcome) => outcome;

  // E5.3
  it("reports a reconstruction that matches, and names the row it matched", () => {
    const entry = entryOf(decisionRecord({ evaluationId: "ev-91" }));
    const result = baselineDiff(entry, new Decided({ decision: allow({ evaluationId: "ev-2" }) }));

    assert.strictEqual(checked(result).evaluationId, "ev-91");
    assert.strictEqual(checked(result).comparison._tag, "Compared");
    assert.isUndefined(checked(result).caveat);
    assert.isTrue(matchesBaseline(result));
  });

  // E5.4
  it("names the node when a reconstruction does not match, with before and after", () => {
    const entry = entryOf(decisionRecord({ evaluationId: "ev-91" }));
    const result = baselineDiff(entry, new Decided({ decision: deny() }));
    const comparison = checked(result).comparison;

    if (comparison._tag !== "Compared") throw new Error("expected Compared");
    assert.deepStrictEqual(comparison.flipped?.path, []);
    assert.strictEqual(comparison.flipped?.policyTag, "HasPermission");
    assert.isTrue(comparison.flipped?.before);
    assert.isFalse(comparison.flipped?.after);
    assert.isFalse(matchesBaseline(result));
  });

  /**
   * E5.5. The logged run produced no trace at all, so there is nothing to
   * compare against — and reproducing the *outcome* is not evidence of
   * reproducing the evaluation. The caveat is what stops the row reading as a
   * confirmed match.
   */
  it("caveats a comparison against a row that failed", () => {
    const entry = entryOf(failedRecord({}));
    const result = baselineDiff(
      entry,
      new Failed({ error: new MissingResource({ attribute: "doc.ownerId" }) }),
    );

    assert.deepStrictEqual(checked(result).caveat, {
      _tag: "BaselineFailed",
      reason: "the logged evaluation failed, so it produced no trace to compare against",
    });
    // The two failures agree, so nothing *differs* — and it still must not read
    // as a match, because the record cannot attest to one.
    assert.strictEqual(checked(result).comparison._tag, "StillFailed");
    assert.isFalse(matchesBaseline(result));
  });

  it("reports a reconstruction that decided where the logged run broke", () => {
    const result = baselineDiff(
      entryOf(failedRecord({})),
      new Decided({ decision: allow() }),
    );

    assert.strictEqual(checked(result).comparison._tag, "Recovered");
    assert.isFalse(matchesBaseline(result));
  });

  it("reports a reconstruction that broke where the logged run decided", () => {
    const result = baselineDiff(
      entryOf(decisionRecord({})),
      new Failed({ error: new MissingResource({ attribute: "doc.ownerId" }) }),
    );

    assert.strictEqual(checked(result).comparison._tag, "BecameError");
    assert.isUndefined(checked(result).caveat);
    assert.isFalse(matchesBaseline(result));
  });

  /**
   * E5.7. `dehydrateDecisions` ships a reduced trace unless `includeTrace` is
   * set, so a hydrated row arrives with a root and no children. Diffing that
   * against a full reconstruction reports a shape change — which reads as
   * behavioural to anybody not told it is a disclosure boundary. The caveat
   * tells them, and `matchesBaseline` refuses to claim either way.
   */
  it("caveats a comparison against a trace that was truncated before it arrived", () => {
    const policy = allOf([hasPermission(read), hasRole("editor")]);
    const rootOnly: Trace = {
      policyTag: "AllOf",
      allowed: true,
      children: [],
      obligations: [],
    };
    const entry = entryOf(
      decisionRecord({
        evaluationId: "ev-91",
        policy,
        outcome: new Decided({ decision: allow({ trace: rootOnly }) }),
      }),
    );

    const result = baselineDiff(
      entry,
      new Decided({
        decision: allow({
          trace: {
            policyTag: "AllOf",
            allowed: true,
            obligations: [],
            children: [allowTrace, { ...allowTrace, policyTag: "HasRole" }],
          },
        }),
      }),
    );

    assert.deepStrictEqual(checked(result).caveat, {
      _tag: "TraceUndisclosed",
      reason:
        "the logged trace stops at the root, so any difference below it is a disclosure boundary rather than a change",
    });
    assert.isFalse(matchesBaseline(result));
  });

  /**
   * The near miss the caveat must not fire on: a genuine leaf also has no
   * children, and calling that "undisclosed" would put a warning on every
   * single-requirement policy in the log.
   */
  it("does not caveat a leaf policy, whose trace has no children to disclose", () => {
    const result = baselineDiff(
      entryOf(decisionRecord({})),
      new Decided({ decision: allow() }),
    );

    assert.isUndefined(checked(result).caveat);
    assert.isTrue(matchesBaseline(result));
  });

  it("is unavailable for an orphan", () => {
    const result = baselineDiff(
      entryOf(obligationRecord({})),
      new Decided({ decision: allow() }),
    );

    assert.deepStrictEqual(result, {
      _tag: "Unavailable",
      reason: "an orphan carries no decision to compare against",
    });
    assert.isFalse(matchesBaseline(result));
  });

  it("compares whatever it is given, decided or not", () => {
    assert.isFalse(matchesBaseline({ _tag: "Unavailable", reason: "anything" }));
    assert.strictEqual(
      verdictOfOutcome(simulated(new Decided({ decision: deny() }))),
      "Deny",
    );
  });
});

/**
 * The end-to-end proof, and the workflow the module exists for: a real
 * evaluation is logged, the row is replayed, the reviewer supplies the grants
 * they believe the subject held, and the diff says whether that belief
 * reproduces what happened.
 *
 * **No live resolver takes part.** The record carries the trace, so the thing
 * to compare against is already in hand — which is why replay needs no capture
 * and no snapshot.
 */
describe("replay, reconstruct, and check — end to end", () => {
  const reader = role({ name: "reader", permissions: [read] });
  const policy = hasPermission(read);

  const logged = (subject: ReturnType<typeof fromRoles>): Effect.Effect<TimelineEntry> =>
    Effect.gen(function* () {
      const ring = decisionSinkRing({ environment: "Server" });

      yield* evaluate(policy).pipe(
        Effect.result,
        Effect.provide(
          Layer.mergeAll(
            ring.layer,
            currentSubjectLayer(subject),
            AttributeResolverNone,
            DecisionHistoryUnknown,
            RelationshipResolverNever,
            evaluationIdSequential("ev"),
            CustomPredicateNone,
            SignatureHistoryNone,
          ),
        ),
      );

      const [record] = yield* ring.snapshot;
      if (record === undefined) throw new Error("expected a record");
      return entryOf(record);
    });

  it.effect("confirms a reconstruction with the right grant", () =>
    Effect.gen(function* () {
      const entry = yield* logged(fromRoles({ id: "alice", roles: [reader] }));
      const seeded = replayable(replayInput(entry));

      // The reviewer's guess: the one grant the policy names. Everything else
      // the form left blank, because a record could not fill it.
      const rerun = yield* simulate(seeded.policy, {
        ...seeded.input,
        subject: { ...seeded.input.subject, permissions: ["doc:read"] },
      });

      const result = baselineDiff(entry, rerun);

      assert.strictEqual(verdictOfOutcome(rerun), "Allow");
      assert.isTrue(matchesBaseline(result), JSON.stringify(checked(result).comparison));
    }));

  it.effect("refutes a reconstruction with the wrong grant", () =>
    Effect.gen(function* () {
      const entry = yield* logged(fromRoles({ id: "alice", roles: [reader] }));
      const seeded = replayable(replayInput(entry));

      // The reviewer guessed a neighbouring permission. The verdict flips, and
      // the diff names the node it flipped at.
      const rerun = yield* simulate(seeded.policy, {
        ...seeded.input,
        subject: { ...seeded.input.subject, permissions: ["doc:write"] },
      });

      const result = baselineDiff(entry, rerun);

      assert.isFalse(matchesBaseline(result));
      const comparison = checked(result).comparison;
      if (comparison._tag !== "Compared") throw new Error("expected Compared");
      assert.deepStrictEqual(comparison.flipped?.path, []);
    }));

  it.effect("reproduces a logged denial exactly", () =>
    Effect.gen(function* () {
      const entry = yield* logged(fromRoles({ id: "bob", roles: [] }));
      const seeded = replayable(replayInput(entry));
      const rerun = yield* simulate(seeded.policy, seeded.input);

      assert.strictEqual(verdictOfOutcome(rerun), "Deny");
      assert.isTrue(matchesBaseline(baselineDiff(entry, rerun)));
    }));
});
