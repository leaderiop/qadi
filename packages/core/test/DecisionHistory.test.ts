/**
 * `Evaluate.test.ts` covers `decisionHistoryFromEvents` through full policy
 * evaluation; this is `DecisionHistory`'s own depth, matching
 * `RelationshipResolver.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import {
  DecisionHistory,
  DecisionHistoryUnknown,
  actedAnswerFromEvents,
  decisionHistoryFromEvents,
  decisionHistoryPort,
} from "../src/DecisionHistory.ts";
import type { ActedEventInput, ActedResult } from "../src/DecisionHistory.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import type { DecisionHistoryUnavailable, MissingResourceId } from "../src/Errors.ts";
import { hasActed, hasNotActed } from "../src/Policy.ts";
import { askActed } from "../src/PortAccess.ts";
import { describeKeyRefusal } from "../src/PortDescription.ts";
import type { LeafOf, ReadSite } from "../src/PortDescription.ts";
import {
  disagreement,
  leafOf,
  SITES,
  unkeyableRow,
  unkeyableSubject,
} from "./helpers.ts";

const query = (
  layer: Layer.Layer<DecisionHistory>,
  event: string,
  resourceId: string | undefined,
  subjectId = "u1",
) =>
  DecisionHistory.hasActed({
    subjectId: makeSubjectId(subjectId),
    event,
    resourceId: resourceId === undefined ? undefined : makeResourceId(resourceId),
  }).pipe(Effect.provide(layer));

describe("DecisionHistory", () => {
  describe("DecisionHistoryUnknown", () => {
    it.effect("says Unknown regardless of what's asked", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(DecisionHistoryUnknown, "raised", "inv-1"), "Unknown");
        assert.strictEqual(yield* query(DecisionHistoryUnknown, "raised", undefined), "Unknown");
      }));
  });

  describe("decisionHistoryFromEvents", () => {
    const history = decisionHistoryFromEvents([
      { subjectId: "alice", event: "raised", resourceId: "inv-1" },
      { subjectId: "bob", event: "approved", resourceId: "inv-2" },
    ]);

    it.effect("Acted for an exact (subject, event, resource) match", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(history, "raised", "inv-1", "alice"), "Acted");
      }));

    it.effect("NotActed — closed world, not Unknown — for anything unlisted", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(history, "raised", "inv-9", "alice"), "NotActed");
        assert.strictEqual(yield* query(history, "approved", "inv-1", "alice"), "NotActed");
        assert.strictEqual(yield* query(history, "raised", "inv-1", "mallory"), "NotActed");
      }));

    it.effect("Acted for 'ever, at all' (resourceId undefined) when any matching event exists", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* query(history, "raised", undefined, "alice"), "Acted");
        assert.strictEqual(yield* query(history, "approved", undefined, "alice"), "NotActed");
      }));

    it.effect(
      "collision-immune: a subject/event split that would collide under a space-joined key does not",
      () =>
        Effect.gen(function* () {
          // The previous implementation joined `${subjectId} ${event}` /
          // `${subjectId} ${event} ${resourceId}` with a plain space and no
          // escaping — `subjectId="a b", event="c"` and `subjectId="a",
          // event="b c"` both joined to `"a b c"`. HashSet membership over a
          // Data.Class compares subjectId/event/resourceId as independent
          // structural fields, so no character is a delimiter anymore.
          const collidable = decisionHistoryFromEvents([
            { subjectId: "a b", event: "raised", resourceId: "c" },
          ]);
          assert.strictEqual(yield* query(collidable, "b raised", "c", "a"), "NotActed");
          assert.strictEqual(
            yield* query(collidable, "b raised", undefined, "a"),
            "NotActed",
          );
        }),
    );
  });
});

describe("decisionHistoryPort's wire", () => {
  it("writes an Any-scoped question with no resourceId key, rather than refusing it", () => {
    const encoded = decisionHistoryPort.wire.encodeQuestion([
      { subjectId: makeSubjectId("alice"), event: "approved", resourceId: undefined },
    ]);
    if (Result.isFailure(encoded)) return assert.fail(encoded.failure);
    assert.deepStrictEqual(encoded.success, { subjectId: "alice", event: "approved" });
  });
});

describe("a history read whose request or fixture row the key refuses", () => {
  // `JSON.parse` returns `any`, which is what an untyped JavaScript caller hands
  // over (no `as`); a symbol or a revoked proxy is what it cannot carry, so it is
  // set on the parsed object afterwards.
  const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });
  const approved = leafOf("HasActed", hasActed("approved", { scope: "Any" }));
  const approvedOnDoc = leafOf("HasActed", hasActed("approved", { scope: "Resource" }));

  const unkeyableSubject = () => {
    const untyped = JSON.parse('{"roles":[],"permissions":[],"attributes":{}}');
    untyped.id = Symbol("alice");
    return makeSubject(untyped);
  };

  const unkeyableRow = (json: string) => {
    const untyped = JSON.parse(json);
    untyped.subjectId = Symbol("alice");
    return untyped;
  };

  /** The sentence the description's key gives for a request it refuses. */
  const refusalSentence = (request: Parameters<typeof decisionHistoryPort.key>[0]) => {
    const refusal = decisionHistoryPort.key(request);
    if (Result.isSuccess(refusal)) return assert.fail("the key admitted the request");
    return describeKeyRefusal(refusal.failure);
  };

  /** A read, as a result, so that a defect fails the row rather than being caught. */
  const unavailable = (
    result: Result.Result<unknown, DecisionHistoryUnavailable | MissingResourceId>,
  ) => {
    if (Result.isSuccess(result)) return assert.fail("the read answered");
    if (result.failure._tag !== "DecisionHistoryUnavailable") {
      return assert.fail(result.failure._tag);
    }
    return result.failure;
  };

  it.effect(
    "a subject whose id is a symbol fails as \
DecisionHistoryUnavailable, never answering NotActed",
    () =>
      Effect.gen(function* () {
        const subject = unkeyableSubject();
        const leaf = leafOf("HasNotActed", hasNotActed("approved", { scope: "Any" }));
        const [request] = decisionHistoryPort.asks.HasNotActed(leaf, {
          subject,
          resource: undefined,
        });
        const result = yield* Effect.result(
          askActed("evaluate", subject, leaf, undefined).pipe(
            Effect.provide(decisionHistoryFromEvents([])),
          ),
        );
        const failure = unavailable(result);
        assert.strictEqual(failure.event, "approved");
        assert.strictEqual(failure.cause, refusalSentence([request]));
      }),
  );

  it.effect(
    "an event that is a symbol fails with no event and the refusal as \
its cause, never answering NotActed",
    () =>
      Effect.gen(function* () {
        const untyped = JSON.parse('{"_tag":"HasActed","event":"x","scope":"Any"}');
        untyped.event = Symbol("approved");
        const leaf = leafOf("HasActed", untyped);
        const [request] = decisionHistoryPort.asks.HasActed(leaf, {
          subject: alice,
          resource: undefined,
        });
        const result = yield* Effect.result(
          askActed("evaluate", alice, leaf, undefined).pipe(
            Effect.provide(decisionHistoryFromEvents([])),
          ),
        );
        const failure = unavailable(result);
        assert.isFalse(Object.hasOwn(failure, "event"));
        assert.strictEqual(failure.cause, refusalSentence([request]));
      }),
  );

  it.effect(
    "a fixture row whose subject id is a symbol fails every read, never answering \
NotActed",
    () =>
      Effect.gen(function* () {
        const row = unkeyableRow('{"event":"approved","resourceId":"doc-1"}');
        const layer = decisionHistoryFromEvents([
          { subjectId: "bob", event: "approved", resourceId: "doc-2" },
          row,
        ]);
        const sentence = refusalSentence([row]);
        for (const [leaf, resource] of [
          [approvedOnDoc, { id: "doc-1" }],
          [approved, undefined],
        ] as const) {
          const result = yield* Effect.result(
            askActed("evaluate", alice, leaf, resource).pipe(Effect.provide(layer)),
          );
          const failure = unavailable(result);
          assert.strictEqual(failure.event, "approved");
          assert.strictEqual(failure.cause, sentence);
        }
      }),
  );

  it.effect(
    "a fixture row whose event cannot be read fails every read, never throwing",
    () =>
      Effect.gen(function* () {
        const row = JSON.parse('{"subjectId":"alice","resourceId":"doc-1"}');
        const revoked = Proxy.revocable({}, {});
        revoked.revoke();
        row.event = revoked.proxy;
        const result = yield* Effect.result(
          Effect.suspend(() =>
            askActed("evaluate", alice, approvedOnDoc, { id: "doc-1" }).pipe(
              Effect.provide(decisionHistoryFromEvents([row])),
            ),
          ),
        );
        const failure = unavailable(result);
        assert.strictEqual(failure.event, "approved");
        assert.strictEqual(failure.cause, refusalSentence([row]));
      }),
  );
});

/** What a judgement or a read gave: an answer, or one of the two failures. */
type Judged = Result.Result<ActedResult, MissingResourceId | DecisionHistoryUnavailable>;

const failureOf = Match.type<MissingResourceId | DecisionHistoryUnavailable>().pipe(
  Match.tagsExhaustive({
    MissingResourceId: (failure) => ({
      _tag: failure._tag,
      relation: failure.relation,
    }),
    DecisionHistoryUnavailable: (failure) => ({
      _tag: failure._tag,
      hasEvent: Object.hasOwn(failure, "event"),
      event: failure.event,
      cause: failure.cause,
    }),
  }),
);

const answerOf = (result: Judged) =>
  Result.match(result, {
    onSuccess: (answer) => ({ _tag: "Answered", answer }) as const,
    onFailure: failureOf,
  });

const readOf = (
  events: ReadonlyArray<ActedEventInput>,
  leaf: LeafOf["HasActed"],
  site: ReadSite,
) =>
  Effect.result(askActed("evaluate", site.subject, leaf, site.resource)).pipe(
    Effect.provide(decisionHistoryFromEvents(events)),
  );

describe("actedAnswerFromEvents", () => {
  // `JSON.parse` returns `any`, which is what an untyped JavaScript caller hands
  // over (no `as`); a symbol is the one value it cannot carry, so it is set on the
  // parsed object afterwards.
  const untypedLeaf = (scope: "Any" | "Resource") => {
    const untyped = JSON.parse('{"event":"approved"}');
    untyped.event = Symbol("approved");
    return leafOf("HasActed", hasActed(untyped.event, { scope }));
  };

  const SUBJECTS = ["alice", "bob"];
  const EVENTS = ["approved", "reviewed"];
  const RESOURCE_IDS = ["doc-1", "doc-2"];

  const SINGLES = SUBJECTS.flatMap((subjectId) =>
    EVENTS.flatMap((event) =>
      RESOURCE_IDS.map((resourceId) => ({
        name: `${subjectId} ${event} ${resourceId}`,
        row: { subjectId, event, resourceId } satisfies ActedEventInput,
      })),
    ),
  );

  const DECOY: ActedEventInput = {
    subjectId: "alice",
    event: "reviewed",
    resourceId: "doc-1",
  };

  const LISTS: ReadonlyArray<{
    readonly name: string;
    readonly rows: ReadonlyArray<ActedEventInput>;
  }> = [
    { name: "an empty list", rows: [] },
    ...SINGLES.map(({ name, row }) => ({ name, rows: [row] })),
    ...SINGLES.map(({ name, row }) => ({
      name: `the decoy, then ${name}`,
      rows: [DECOY, row],
    })),
  ];

  /** The two leaves, named by their scope, so a test picks one by what it is. */
  const LEAVES = {
    resource: {
      name: "hasActed approved at scope Resource",
      leaf: leafOf("HasActed", hasActed("approved", { scope: "Resource" })),
    },
    any: {
      name: "hasActed approved at scope Any",
      leaf: leafOf("HasActed", hasActed("approved", { scope: "Any" })),
    },
  };

  it.effect(
    "answers as \
askActed over the fixture layer does, on every case of the product",
    () =>
      Effect.gen(function* () {
        const sites = Object.entries(SITES);
        const leaves = Object.values(LEAVES);
        assert.strictEqual(SINGLES.length, 8);
        assert.strictEqual(LISTS.length, 17);
        assert.strictEqual(sites.length * leaves.length * LISTS.length, 136);
        const mismatches: Array<string> = [];
        let compared = 0;
        for (const [siteName, site] of sites) {
          for (const { name: leafName, leaf } of leaves) {
            for (const { name: listName, rows } of LISTS) {
              compared += 1;
              const found = disagreement(
                `${siteName} | ${leafName} | ${listName}`,
                answerOf(actedAnswerFromEvents(rows, leaf, site)),
                answerOf(yield* readOf(rows, leaf, site)),
              );
              if (found !== undefined) mismatches.push(found);
            }
          }
        }
        assert.strictEqual(compared, 136);
        assert.deepStrictEqual(mismatches, [], mismatches.join("\n"));
      }),
  );

  /**
   * What each site gives each leaf when the check is refused: a Resource leaf with
   * no usable resource id fails for want of one, and the rest fail as the history
   * port does.
   */
  const UNAVAILABLE = "DecisionHistoryUnavailable";
  const REFUSED = [
    { site: SITES.withId, Resource: "DecisionHistoryUnavailable", Any: UNAVAILABLE },
    { site: SITES.withoutId, Resource: "MissingResourceId", Any: UNAVAILABLE },
    { site: SITES.withNonStringId, Resource: "MissingResourceId", Any: UNAVAILABLE },
    { site: SITES.withoutResource, Resource: "MissingResourceId", Any: UNAVAILABLE },
  ] as const;

  it.effect(
    "a site whose subject id is a symbol fails as \
the read does, with the refusal and never NotActed",
    () =>
      Effect.gen(function* () {
        const rows = [{ subjectId: "alice", event: "approved", resourceId: "doc-1" }];
        for (const { site, ...tags } of REFUSED) {
          const at = { ...site, subject: unkeyableSubject() };
          for (const [scope, { leaf }] of [
            ["Resource", LEAVES.resource],
            ["Any", LEAVES.any],
          ] as const) {
            const judged = answerOf(actedAnswerFromEvents(rows, leaf, at));
            assert.deepStrictEqual(judged, answerOf(yield* readOf(rows, leaf, at)));
            assert.strictEqual(judged._tag, tags[scope]);
            if (judged._tag === "DecisionHistoryUnavailable") {
              assert.strictEqual(judged.event, "approved");
            }
          }
        }
      }),
  );

  it.effect(
    "an event row whose subject id is a symbol fails as \
the read does, with the refusal and never NotActed",
    () =>
      Effect.gen(function* () {
        const rows = [unkeyableRow('{"event":"approved","resourceId":"doc-1"}')];
        for (const { site, ...tags } of REFUSED) {
          for (const [scope, { leaf }] of [
            ["Resource", LEAVES.resource],
            ["Any", LEAVES.any],
          ] as const) {
            const judged = answerOf(actedAnswerFromEvents(rows, leaf, site));
            assert.deepStrictEqual(judged, answerOf(yield* readOf(rows, leaf, site)));
            assert.strictEqual(judged._tag, tags[scope]);
            if (judged._tag === "DecisionHistoryUnavailable") {
              assert.strictEqual(judged.event, "approved");
            }
          }
        }
      }),
  );

  it.effect(
    "a refused event fails as \
the read does, with no event and never NotActed",
    () =>
      Effect.gen(function* () {
        const rows = [{ subjectId: "alice", event: "approved", resourceId: "doc-1" }];
        for (const scope of ["Any", "Resource"] as const) {
          const leaf = untypedLeaf(scope);
          const judged = answerOf(actedAnswerFromEvents(rows, leaf, SITES.withId));
          const read = answerOf(yield* readOf(rows, leaf, SITES.withId));
          assert.deepStrictEqual(judged, read);
          assert.strictEqual(judged._tag, "DecisionHistoryUnavailable");
          if (judged._tag === "DecisionHistoryUnavailable") {
            assert.isFalse(judged.hasEvent);
          }
        }
      }),
  );
});
