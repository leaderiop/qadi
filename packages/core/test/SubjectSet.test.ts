import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Tracer from "effect/Tracer";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { currentSubjectLayer } from "../src/CurrentSubject.ts";
import { isAllowed } from "../src/Decision.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { decideSubjects, filterSubjects } from "../src/SubjectSet.ts";
import { subjectSetLayer, subjectWith, testLayer } from "./helpers.ts";

const read = permission("doc", "read");
const canRead = P.hasPermission(read);

const reader = (id: string) => subjectWith({ id, permissions: ["doc:read"] });
const nobody = (id: string) => subjectWith({ id });

const ids = (subjects: ReadonlyArray<{ readonly id: string }>) =>
  subjects.map((s) => s.id);

describe("filterSubjects", () => {
  it.effect("keeps the subjects the policy allows", () =>
    Effect.gen(function* () {
      const allowed = yield* filterSubjects(canRead, [
        reader("a"),
        nobody("b"),
        reader("c"),
      ]);
      assert.deepStrictEqual(ids(allowed), ["a", "c"]);
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("preserves input order rather than grouping the allows", () =>
    Effect.gen(function* () {
      const allowed = yield* filterSubjects(canRead, [
        nobody("a"),
        reader("b"),
        nobody("c"),
        reader("d"),
      ]);
      // A review is read beside the list it was asked about, so position is
      // the join key.
      assert.deepStrictEqual(ids(allowed), ["b", "d"]);
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("does not deduplicate", () =>
    Effect.gen(function* () {
      const alice = reader("alice");
      const allowed = yield* filterSubjects(canRead, [alice, alice]);
      // Two rows in, two rows out. Collapsing them would be a helpful-looking
      // transform that silently drops a row the caller expects to see.
      assert.deepStrictEqual(ids(allowed), ["alice", "alice"]);
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("an empty set is an empty answer, not an error", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* filterSubjects(canRead, []), []);
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("nobody passing is a denial for each, not a failure", () =>
    Effect.gen(function* () {
      const allowed = yield* filterSubjects(canRead, [nobody("a"), nobody("b")]);
      assert.deepStrictEqual(allowed, []);
    }).pipe(Effect.provide(subjectSetLayer())));
});

describe("decideSubjects", () => {
  it.effect("pairs every subject with its own decision", () =>
    Effect.gen(function* () {
      const results = yield* decideSubjects(canRead, [reader("a"), nobody("b")]);

      assert.deepStrictEqual(
        results.map((r) => [r.subject.id, r.decision._tag]),
        [
          ["a", "Allow"],
          ["b", "Deny"],
        ],
      );
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("keeps the denial reason, because a review needs the why", () =>
    Effect.gen(function* () {
      const results = yield* decideSubjects(canRead, [nobody("b")]);
      const [only] = results;
      assert.isDefined(only);
      if (only === undefined) return;
      assert.strictEqual(only.decision._tag, "Deny");
      if (only.decision._tag !== "Deny") return;
      assert.include(only.decision.reason, "doc:read");
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("every subject gets its own evaluation id", () =>
    Effect.gen(function* () {
      const results = yield* decideSubjects(canRead, [
        reader("a"),
        reader("b"),
        reader("c"),
      ]);
      assert.deepStrictEqual(
        results.map((r) => r.decision.evaluationId),
        ["eval-1", "eval-2", "eval-3"],
      );
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("filterSubjects agrees with decideSubjects", () =>
    Effect.gen(function* () {
      const set = [reader("a"), nobody("b"), reader("c"), nobody("d")];
      const results = yield* decideSubjects(canRead, set);
      const allowed = yield* filterSubjects(canRead, set);

      // Derived, not reimplemented: the version that disagreed by allowing
      // would not announce itself.
      assert.deepStrictEqual(
        ids(allowed),
        results.filter((r) => isAllowed(r.decision)).map((r) => r.subject.id),
      );
    }).pipe(Effect.provide(subjectSetLayer())));
});

describe("INV-QD-016: a batch decision is the decision made alone", () => {
  const policy = P.anyOf([
    P.hasRole("admin"),
    P.hasAttribute("level", M.gte(3)),
    P.hasPermission(read),
  ]);

  const set = [
    subjectWith({ id: "a", roles: ["admin"] }),
    subjectWith({ id: "b", attributes: { level: 5 } }),
    subjectWith({ id: "c", attributes: { level: 1 } }),
    subjectWith({ id: "d", permissions: ["doc:read"] }),
    subjectWith({ id: "e" }),
  ];

  it.effect("each element matches an evaluation run on its own", () =>
    Effect.gen(function* () {
      const batched = yield* decideSubjects(policy, set).pipe(
        Effect.provide(subjectSetLayer()),
      );

      for (const [index, subject] of set.entries()) {
        const alone = yield* evaluate(policy).pipe(
          Effect.provide(testLayer(subject)),
        );
        const row = batched[index];
        assert.isDefined(row);
        if (row === undefined) continue;

        assert.strictEqual(row.subject.id, subject.id);
        assert.strictEqual(row.decision._tag, alone._tag);
        assert.deepStrictEqual(row.decision.trace, alone.trace);
      }
    }));

  it.effect("an attribute resolver is asked about the subject in hand", () =>
    Effect.gen(function* () {
      const asked: Array<string> = [];
      // The leak this invariant is really about. With one subject per
      // environment, a resolver that ignored its `subjectId` argument was
      // merely redundant; over a batch it hands one subject another's
      // attributes, and the result is a grant nobody wrote.
      const recording = Layer.succeed(AttributeResolver, {
        resolve: (subjectId, attribute) =>
          Effect.sync(() => {
            asked.push(`${subjectId}/${attribute}`);
            return subjectId === "cleared" ? 9 : 0;
          }),
      });

      const allowed = yield* filterSubjects(P.hasAttribute("level", M.gte(3)), [
        nobody("cleared"),
        nobody("uncleared"),
      ]).pipe(Effect.provide(subjectSetLayer({ attributes: recording })));

      assert.deepStrictEqual(asked, ["cleared/level", "uncleared/level"]);
      assert.deepStrictEqual(ids(allowed), ["cleared"]);
    }));

  it.effect("a subject's own attributes never reach the next one", () =>
    Effect.gen(function* () {
      // `level` is on the first subject and absent from the second, which then
      // falls through to a resolver that has nothing. If any state carried
      // between elements, the second would allow.
      const allowed = yield* filterSubjects(P.hasAttribute("level", M.gte(3)), [
        subjectWith({ id: "a", attributes: { level: 7 } }),
        subjectWith({ id: "b" }),
      ]);
      assert.deepStrictEqual(ids(allowed), ["a"]);
    }).pipe(Effect.provide(subjectSetLayer())));
});

describe("the ambient subject is replaced, not read", () => {
  it.effect("a wired current subject does not decide the batch", () =>
    Effect.gen(function* () {
      // The layer names a subject holding nothing. Every element still gets its
      // own answer, because `provideService` wins over what the environment
      // already had.
      const allowed = yield* filterSubjects(canRead, [reader("a"), nobody("b")]);
      assert.deepStrictEqual(ids(allowed), ["a"]);
    }).pipe(Effect.provide(testLayer(nobody("ambient")))));

  it.effect("the decisions are attributed to the elements, not the ambient one", () =>
    Effect.gen(function* () {
      const results = yield* decideSubjects(canRead, [reader("a")]);
      const [only] = results;
      assert.isDefined(only);
      if (only === undefined) return;
      assert.strictEqual(only.decision.subjectId, "a");
    }).pipe(Effect.provide(testLayer(nobody("ambient")))));

  it.effect("a subject supplied only as a layer is still usable as an element", () =>
    Effect.gen(function* () {
      // Nothing forbids the two coinciding — this is the shape a request-time
      // "can my teammates see this too?" takes.
      const allowed = yield* filterSubjects(canRead, [reader("me")]).pipe(
        Effect.provide(currentSubjectLayer(nobody("me"))),
      );
      assert.deepStrictEqual(ids(allowed), ["me"]);
    }).pipe(Effect.provide(subjectSetLayer())));
});

describe("reporting, not enforcing", () => {
  const logAccess = obligation("log-access", { channel: "audit" });
  const auditedRead = P.obliged(logAccess, canRead);

  it.effect("a binding obligation does not remove a subject from the answer", () =>
    Effect.gen(function* () {
      // `filter` would fail here: it hands over data, so it must refuse an
      // allow nobody discharged. This hands over identities, to an
      // administrator rather than to the subjects named, so there is no
      // permission for the duty to condition (ADR-QD-022).
      const allowed = yield* filterSubjects(auditedRead, [reader("a"), nobody("b")]);
      assert.deepStrictEqual(ids(allowed), ["a"]);
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("the duty is readable on the decision", () =>
    Effect.gen(function* () {
      const results = yield* decideSubjects(auditedRead, [reader("a")]);
      const [only] = results;
      assert.isDefined(only);
      if (only === undefined) return;
      assert.strictEqual(only.decision._tag, "Allow");
      if (only.decision._tag !== "Allow") return;
      assert.deepStrictEqual(only.decision.obligations.map((o) => o.id), [
        "log-access",
      ]);
    }).pipe(Effect.provide(subjectSetLayer())));
});

describe("request inputs and failures", () => {
  it.effect("the resource and action apply to every element", () =>
    Effect.gen(function* () {
      const policy = P.allOf([
        P.hasAction("read"),
        P.hasResourceAttribute("owner", M.eq(M.subjectId())),
      ]);

      const allowed = yield* filterSubjects(
        policy,
        [nobody("alice"), nobody("bob")],
        { resource: { id: "doc-1", owner: "bob" }, action: "read" },
      );
      assert.deepStrictEqual(ids(allowed), ["bob"]);
    }).pipe(Effect.provide(subjectSetLayer())));

  it.effect("a resolver failure fails the batch rather than denying an element", () =>
    Effect.gen(function* () {
      // INV-QD-006 over a set: one broken lookup must not read as "that person
      // cannot see it", which is exactly how an outage becomes an access
      // review finding.
      const broken = Layer.succeed(AttributeResolver, {
        resolve: (_subjectId, attribute) =>
          Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
      });

      const r = yield* Effect.result(
        filterSubjects(P.hasAttribute("level", M.gte(3)), [
          nobody("a"),
          nobody("b"),
        ]).pipe(Effect.provide(subjectSetLayer({ attributes: broken }))),
      );

      assert.strictEqual(r._tag, "Failure");
    }));

  it.effect("evaluates one subject at a time", () =>
    Effect.gen(function* () {
      const log: Array<string> = [];
      // A resolver that yields between entering and answering. Sequentially the
      // log interleaves not at all; under any concurrency every element would
      // have started before the first finished. The default is sequential
      // because a batch multiplies the load on the caller's store by its own
      // length, and that fan-out is not ours to choose (ADR-QD-022).
      const slow = Layer.succeed(AttributeResolver, {
        resolve: (subjectId) =>
          Effect.gen(function* () {
            log.push(`start:${subjectId}`);
            yield* Effect.yieldNow;
            log.push(`end:${subjectId}`);
            return 0;
          }),
      });

      yield* filterSubjects(P.hasAttribute("level", M.gte(3)), [
        nobody("a"),
        nobody("b"),
      ]).pipe(Effect.provide(subjectSetLayer({ attributes: slow })));

      assert.deepStrictEqual(log, ["start:a", "end:a", "start:b", "end:b"]);
    }));

  it.effect("stops at the first failing element", () =>
    Effect.gen(function* () {
      let calls = 0;
      const brokenAfterFirst = Layer.succeed(AttributeResolver, {
        resolve: (subjectId, attribute) => {
          calls += 1;
          return subjectId === "a"
            ? Effect.succeed(9)
            : Effect.fail(new AttributeResolveError({ attribute, cause: "down" }));
        },
      });

      yield* Effect.result(
        filterSubjects(P.hasAttribute("level", M.gte(3)), [
          nobody("a"),
          nobody("b"),
          nobody("c"),
        ]).pipe(Effect.provide(subjectSetLayer({ attributes: brokenAfterFirst }))),
      );

      // Two, not three: sequential means the third element is never reached.
      assert.strictEqual(calls, 2);
    }));
});

describe("observability", () => {
  const collectingTracer = (spans: Array<Tracer.Span>) =>
    Layer.succeed(
      Tracer.Tracer,
      Tracer.make({
        span: (options) => {
          const span = new Tracer.NativeSpan(options);
          spans.push(span);
          return span;
        },
      }),
    );

  it.effect("the batch reports its size, and each element its own decision", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];

      yield* decideSubjects(canRead, [reader("a"), nobody("b")]).pipe(
        Effect.provide(subjectSetLayer()),
        Effect.provide(collectingTracer(spans)),
      );

      const batch = spans.find((s) => s.name === "qadi.decideSubjects");
      assert.isDefined(batch);
      if (batch === undefined) return;
      assert.deepStrictEqual(Object.fromEntries(batch.attributes), {
        "qadi.subject_count": 2,
        "qadi.policy_tag": "HasPermission",
      });

      const perSubject = spans
        .filter((s) => s.name === "qadi.evaluate")
        .map((s) => Object.fromEntries(s.attributes)["qadi.subject_id"]);
      assert.deepStrictEqual(perSubject, ["a", "b"]);
    }));
});
