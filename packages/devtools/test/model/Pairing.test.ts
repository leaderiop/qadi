/**
 * JOB 3 ledger — E3.1 … E3.7, and the verdict vocabulary the whole tool rests
 * on.
 *
 * The load-bearing case is E3.5: a failed evaluation must never render as a
 * denial. That is the one UI defect that becomes a security misreading — a
 * reviewer who reads "DENY" on a row where the attribute store was unreachable
 * concludes their policy is working when it never ran.
 */
import { assert, describe, it } from "@effect/vitest";
import { emptyTimeline, ingestAll, type TimelineEntry } from "../../src/model/Timeline.ts";
import { pairedEntries, pairsOf } from "../../src/model/Pairing.ts";
import { countsOf, verdictOf } from "../../src/model/Verdict.ts";
import { allow, decisionRecord, deny, failedRecord, obligationRecord } from "../helpers.ts";
import { Decided } from "@qadi/core";

const fold = (records: ReadonlyArray<Parameters<typeof ingestAll>[1][number]>) =>
  ingestAll(emptyTimeline(), records);

const allowRecord = (options: {
  readonly evaluationId: string;
  readonly at: number;
  readonly environment?: string;
}) =>
  decisionRecord({
    ...options,
    outcome: new Decided({ decision: allow({ evaluationId: options.evaluationId }) }),
  });

const denyRecord = (options: {
  readonly evaluationId: string;
  readonly at: number;
  readonly environment?: string;
}) =>
  decisionRecord({
    ...options,
    outcome: new Decided({ decision: deny({ evaluationId: options.evaluationId }) }),
  });

describe("verdictOf", () => {
  const verdicts = (entries: ReadonlyArray<TimelineEntry>) => entries.map(verdictOf);

  it("classifies an allow, a denial, a failure and an orphan apart", () => {
    const timeline = fold([
      allowRecord({ evaluationId: "a", at: 100 }),
      denyRecord({ evaluationId: "d", at: 200 }),
      failedRecord({ evaluationId: "e", at: 300 }),
      obligationRecord({ evaluationId: "ghost", at: 400 }),
    ]);

    assert.deepStrictEqual(verdicts(timeline.entries), ["Allow", "Deny", "Error", "Unknown"]);
  });

  // E3.5, stated at its source. INV-QD-006 seen from a reader's position.
  it("a failed evaluation is Error, never Deny", () => {
    const timeline = fold([failedRecord({ evaluationId: "e", at: 100 })]);
    assert.strictEqual(verdictOf(timeline.entries[0] ?? never()), "Error");
  });
});

describe("countsOf", () => {
  // E5.2 — three classes, never two.
  it("counts errors apart from denials", () => {
    const timeline = fold([
      allowRecord({ evaluationId: "a1", at: 100 }),
      allowRecord({ evaluationId: "a2", at: 200 }),
      denyRecord({ evaluationId: "d1", at: 300 }),
      failedRecord({ evaluationId: "e1", at: 400 }),
      failedRecord({ evaluationId: "e2", at: 500 }),
      obligationRecord({ evaluationId: "ghost", at: 600 }),
    ]);

    assert.deepStrictEqual(countsOf(timeline.entries), {
      // A header reading "3 decisions, 1 deny" while two lookups are failing is
      // worse than no header.
      decisions: 5,
      allows: 2,
      denies: 1,
      errors: 2,
      orphans: 1,
    });
  });

  it("an empty timeline counts zero of everything", () => {
    assert.deepStrictEqual(countsOf([]), {
      decisions: 0,
      allows: 0,
      denies: 0,
      errors: 0,
      orphans: 0,
    });
  });
});

describe("pairedEntries", () => {
  // E3.1 — the common case gets no badge.
  it("a decision with no partner is Alone, with no partners", () => {
    const paired = pairedEntries(fold([allowRecord({ evaluationId: "solo", at: 100 })]));

    assert.strictEqual(paired.length, 1);
    assert.strictEqual(paired[0]?.role, "Alone");
    assert.deepStrictEqual(paired[0]?.partners, []);
    assert.isFalse(paired[0]?.disagrees);
  });

  /**
   * Two unrelated evaluations must not become each other's partners — and a
   * disagreement between them is not a disagreement at all.
   *
   * The version of this suite without this case let two mutants live that made
   * every row a partner of every other, because the tests that had more than
   * one id never checked the roles and the tests that checked roles only had
   * one id.
   */
  it("rows with different ids are strangers, however much their verdicts differ", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "one", at: 100 }),
        denyRecord({ evaluationId: "two", at: 200 }),
        failedRecord({ evaluationId: "three", at: 300 }),
      ]),
    );

    assert.deepStrictEqual(paired.map((p) => p.role), ["Alone", "Alone", "Alone"]);
    assert.deepStrictEqual(paired.map((p) => p.partners.length), [0, 0, 0]);
    assert.isTrue(paired.every((p) => !p.disagrees));
  });

  it("a pair and a stranger do not contaminate each other", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        denyRecord({ evaluationId: "unrelated", at: 200 }),
        allowRecord({ evaluationId: "ev-7", at: 300, environment: "Client" }),
      ]),
    );

    assert.deepStrictEqual(paired.map((p) => p.role), ["Origin", "Alone", "Continuation"]);
    // The pair agrees; the stranger's denial is none of its business.
    assert.deepStrictEqual(paired.map((p) => p.disagrees), [false, false, false]);
  });

  it("the earlier row is the Origin and the later one Continues it", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        allowRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      ]),
    );

    assert.deepStrictEqual(
      paired.map((p) => [p.entry.environment, p.role]),
      [
        ["Server", "Origin"],
        ["Client", "Continuation"],
      ],
    );
  });

  it("the role comes from time, not from the environment label", () => {
    // A deployment labelling its processes "eu-west" and "us-east" must pair
    // exactly as one labelling them "Server" and "Client" does. Guessing which
    // label means "the client" is the mistake this avoids.
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 200, environment: "eu-west" }),
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "us-east" }),
      ]),
    );

    assert.deepStrictEqual(
      paired.map((p) => [p.entry.environment, p.role]),
      [
        ["us-east", "Origin"],
        ["eu-west", "Continuation"],
      ],
    );
  });

  it("each row's partners are every other row of its evaluation", () => {
    const paired = pairedEntries(
      fold(
        ["a", "b", "c"].map((environment, index) =>
          allowRecord({ evaluationId: "ev-7", at: 100 + index, environment }),
        ),
      ),
    );

    assert.deepStrictEqual(
      paired.map((p) => p.partners.map((q) => q.environment)),
      [
        ["b", "c"],
        ["a", "c"],
        ["a", "b"],
      ],
    );
  });

  // E3.4 — the single most interesting thing this tool can show.
  it("a server allow that no longer holds client-side is flagged on both rows", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        denyRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      ]),
    );

    assert.isTrue(paired.every((p) => p.disagrees));
  });

  it("agreeing partners are not flagged", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        allowRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      ]),
    );

    assert.isTrue(paired.every((p) => !p.disagrees));
  });

  // E3.5 through the pair, where mistaking it for a denial would be worst.
  it("an allow paired with a failure disagrees, and the failure stays an Error", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        failedRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      ]),
    );

    assert.isTrue(paired.every((p) => p.disagrees));
    assert.deepStrictEqual(paired.map((p) => verdictOf(p.entry)), ["Allow", "Error"]);
  });

  it("two failures agree: both say the same thing happened", () => {
    const paired = pairedEntries(
      fold([
        failedRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        failedRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      ]),
    );

    assert.isTrue(paired.every((p) => !p.disagrees));
  });

  // E3.6 — replicas. Nothing here assumes exactly two.
  it("three rows sharing an id are one family, and one dissenter flags them all", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "r1" }),
        allowRecord({ evaluationId: "ev-7", at: 200, environment: "r2" }),
        denyRecord({ evaluationId: "ev-7", at: 300, environment: "r3" }),
      ]),
    );

    assert.strictEqual(paired.length, 3);
    assert.isTrue(paired.every((p) => p.disagrees));
    assert.deepStrictEqual(paired.map((p) => p.role), ["Origin", "Continuation", "Continuation"]);
  });

  // E3.7 — a reused id in one process is still a family.
  it("one id reused in one environment pairs, rather than being ignored", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "reused", at: 100 }),
        denyRecord({ evaluationId: "reused", at: 200 }),
      ]),
    );

    assert.deepStrictEqual(paired.map((p) => p.role), ["Origin", "Continuation"]);
    assert.isTrue(paired.every((p) => p.disagrees));
  });

  it("an orphaned outcome pairs with the decision of the same id", () => {
    // The orphan has no verdict, so it disagrees with a decision that has one —
    // which is the honest reading: one row says a duty was refused and the
    // other cannot say what was decided.
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
        obligationRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
      ]),
    );

    assert.deepStrictEqual(paired.map((p) => p.entry._tag), [
      "TimelineDecision",
      "TimelineOrphan",
    ]);
    assert.isTrue(paired.every((p) => p.disagrees));
  });

  it("annotates the timeline in place rather than regrouping it", () => {
    const paired = pairedEntries(
      fold([
        allowRecord({ evaluationId: "ev-7", at: 100 }),
        allowRecord({ evaluationId: "other", at: 200 }),
        allowRecord({ evaluationId: "ev-7", at: 300, environment: "Client" }),
      ]),
    );

    // Clustering the pair together would destroy the one property a
    // chronological log has.
    assert.deepStrictEqual(paired.map((p) => p.entry.evaluationId), ["ev-7", "other", "ev-7"]);
  });

  it("an empty timeline pairs to nothing", () => {
    assert.deepStrictEqual(pairedEntries(emptyTimeline()), []);
  });
});

describe("pairsOf", () => {
  it("returns only the evaluations with more than one row", () => {
    const pairs = pairsOf(
      fold([
        allowRecord({ evaluationId: "solo", at: 100 }),
        allowRecord({ evaluationId: "ev-7", at: 200, environment: "Server" }),
        allowRecord({ evaluationId: "ev-7", at: 300, environment: "Client" }),
      ]),
    );

    assert.deepStrictEqual([...pairs.keys()], ["ev-7"]);
    assert.strictEqual(pairs.get("ev-7")?.length, 2);
  });

  it("is empty when nothing pairs", () => {
    assert.strictEqual(pairsOf(fold([allowRecord({ evaluationId: "solo", at: 100 })])).size, 0);
  });
});

const never = (): never => {
  throw new Error("expected an entry");
};
