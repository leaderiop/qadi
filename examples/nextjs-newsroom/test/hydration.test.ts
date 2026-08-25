/**
 * The round trip this app depends on, and every way it declines to make it.
 *
 * These are the fast tests — no browser, no server, no Next. They cover the part
 * where regressions actually happen: the shape of what the server builds and
 * whether the client can use it. The end-to-end suite covers what only a real
 * engine can answer.
 *
 * Nothing here imports a page. A route file pulls in `next/headers` and a
 * request scope; the logic worth testing was deliberately put where it can be
 * called without one.
 */
import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  decide,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  isAllowed,
  project,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { dehydrateDecisions, hydrateDecisions, makeQadiAtoms } from "@qadi/react";
import type { DecisionEntry, DehydratedDecisions, HydrationDrop } from "@qadi/react";
import { articles } from "../src/domain/articles.ts";
import { policyResource } from "../src/domain/resource.ts";
import { canReadArticle, readSourceContact, viewArticle } from "../src/domain/policies.ts";
import { users } from "../src/domain/subjects.ts";

const userNamed = (id: string): AuthSubject => {
  const found = users.find((user) => user.id === id);
  if (found === undefined) throw new Error(`no demo user named ${id}`);
  return found.subject;
};

const yasmine = userNamed("yasmine");
const omar = userNamed("omar");
const nadia = userNamed("nadia");

/** The server's layer, minus the sinks — nothing here reads a record. */
const ports = Layer.mergeAll(
  AttributeResolverNone,
  relationshipResolverFromEdges(
    articles.map((article) => ({
      subjectId: article.authorId,
      relation: "author-of",
      resourceId: article.id,
    })),
  ),
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

const decideAs = (subject: AuthSubject, entries: ReadonlyArray<{
  readonly policy: Parameters<typeof decide>[0];
  readonly resource?: Record<string, unknown>;
}>): Promise<ReadonlyArray<DecisionEntry>> =>
  Effect.runPromise(
    Effect.forEach(entries, (entry) =>
      decide(entry.policy, entry.resource === undefined ? undefined : { resource: entry.resource })
        .pipe(Effect.map((decision) => ({
          policy: entry.policy,
          ...(entry.resource === undefined ? {} : { resource: entry.resource }),
          decision,
        })))).pipe(
      Effect.provide(Layer.mergeAll(ports, currentSubjectLayer(subject))),
      Effect.orDie,
    ),
  );

const freshAtoms = () =>
  makeQadiAtoms(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  );

const published = articles.find((article) => article.status === "published");
const draft = articles.find((article) => article.status === "draft");
if (published === undefined || draft === undefined) {
  throw new Error("the fixtures must contain a published article and a draft");
}
const publishedResource = policyResource(published, 0);
const draftResource = policyResource(draft, 0);

describe("the payload the server builds", () => {
  it("is plain JSON, so it can cross the RSC boundary", async () => {
    const entries = await decideAs(yasmine, [{
      policy: canReadArticle,
      resource: publishedResource,
    }]);
    const payload = dehydrateDecisions(entries);

    // The real assertion, and the reason this is not a formality: a `Decision`
    // is a `Data.TaggedClass`, and React refuses class instances as props. If
    // one ever survived into the payload this round trip would throw here and
    // the page would fail at runtime with a message about serialization.
    expect(() => structuredClone(payload)).not.toThrow();
    expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
  });

  it("withholds a denial's reason unless asked", async () => {
    const entries = await decideAs(yasmine, [{ policy: canReadArticle, resource: draftResource }]);

    const withheld = dehydrateDecisions(entries);
    const disclosed = dehydrateDecisions(entries, { includeTrace: true });

    expect(withheld.entries[0]?.allowed).toBe(false);
    expect(withheld.entries[0]?.reason).toBe("hydrated");
    // The real reason names a branch of the policy; the default does not.
    expect(disclosed.entries[0]?.reason).not.toBe("hydrated");
    expect(disclosed.entries[0]?.trace?.children.length).toBeGreaterThan(0);
  });

  it("drops another subject's decisions and reports the drop", async () => {
    const mine = await decideAs(yasmine, [{ policy: readSourceContact }]);
    const theirs = await decideAs(omar, [{ policy: readSourceContact }]);

    let dropped = 0;
    const payload = dehydrateDecisions([...mine, ...theirs], {
      onDropped: (entries) => {
        dropped = entries.length;
      },
    });

    expect(payload.subjectId).toBe("yasmine");
    expect(payload.entries).toHaveLength(1);
    expect(dropped).toBe(1);
  });
});

describe("what the client does with it", () => {
  it("seeds every entry of a payload that names it", async () => {
    const entries = await decideAs(omar, [
      { policy: readSourceContact },
      { policy: canReadArticle, resource: publishedResource },
    ]);
    const seeded = Array.from(hydrateDecisions(freshAtoms(), dehydrateDecisions(entries), omar));

    expect(seeded).toHaveLength(2);
  });

  it("refuses a payload minted for someone else, whole, without throwing", async () => {
    const entries = await decideAs(omar, [{ policy: readSourceContact }]);
    const drops: Array<HydrationDrop<unknown>> = [];

    const seeded = Array.from(
      hydrateDecisions(freshAtoms(), dehydrateDecisions(entries), yasmine, {
        onDropped: (drop) => drops.push(drop),
      }),
    );

    expect(seeded).toHaveLength(0);
    expect(drops.map((drop) => drop.reason)).toEqual(["PayloadSubjectMismatch"]);
  });

  it("reports undecodable entries once, not once each, and seeds the rest", async () => {
    const entries = await decideAs(omar, [{ policy: readSourceContact }]);
    const real = dehydrateDecisions(entries);
    const payload: DehydratedDecisions = {
      subjectId: real.subjectId,
      entries: [
        ...real.entries,
        ...[1, 2, 3].map((n) => ({
          policy: { _tag: "HasQuantumClearance", threshold: n },
          allowed: true,
          evaluationId: `skew-${n}`,
          durationMillis: 0,
        })),
      ],
    };

    const drops: Array<HydrationDrop<unknown>> = [];
    const seeded = Array.from(
      hydrateDecisions(freshAtoms(), payload, omar, { onDropped: (drop) => drops.push(drop) }),
    );

    expect(drops).toHaveLength(1);
    expect(drops[0]?.reason).toBe("UndecodablePolicy");
    expect(drops[0]?.entries).toHaveLength(3);
    // A refused entry does not take the payload with it.
    expect(seeded).toHaveLength(1);
  });

  it("seeds nothing into a copy of the atom set", async () => {
    const entries = await decideAs(omar, [{ policy: readSourceContact }]);
    const payload = dehydrateDecisions(entries);
    const atoms = freshAtoms();

    const drops: Array<HydrationDrop<unknown>> = [];
    const registered = Array.from(hydrateDecisions(atoms, payload, omar));
    // Every property, a different object. The seed lookup is a `WeakMap` keyed
    // by identity, so a faithful copy is not the thing it copied.
    const foreign = Array.from(
      hydrateDecisions({ ...atoms }, payload, omar, { onDropped: (drop) => drops.push(drop) }),
    );

    expect(registered).toHaveLength(1);
    expect(foreign).toHaveLength(0);
    expect(drops.map((drop) => drop.reason)).toEqual(["UnregisteredAtoms"]);
  });
});

describe("what crosses with the content", () => {
  it("removes the fields the decision did not make visible", async () => {
    const [entry] = await decideAs(yasmine, [{ policy: viewArticle, resource: publishedResource }]);
    if (entry === undefined) throw new Error("no decision");

    const visible = project(entry.decision, published);

    expect(isAllowed(entry.decision)).toBe(true);
    expect(visible["body"]).toBeDefined();
    // The two fields this reader may not see are **absent**, not empty and not
    // hidden behind a guard. A guard chooses what to render; a prop crosses
    // before anything is rendered.
    expect("sourceContact" in visible).toBe(false);
    expect("legalNotes" in visible).toBe(false);
  });

  it("leaves an Editor's projection whole", async () => {
    const [entry] = await decideAs(omar, [{ policy: viewArticle, resource: publishedResource }]);
    if (entry === undefined) throw new Error("no decision");

    const visible = project(entry.decision, published);

    expect(visible["sourceContact"]).toBe(published.sourceContact);
  });

  it("keys a decision on attributes only, so no content is in the atom key", () => {
    // The rule this app learned by leaking. Everything the server decides
    // against is what the client must hold for the seed to land, so the
    // resource must carry nothing worth reading.
    expect(Object.keys(publishedResource).sort()).toEqual([
      "authorId",
      "classification",
      "embargoLifted",
      "embargoUntil",
      "id",
      "status",
    ]);
  });
});

describe("the relationship path", () => {
  it("lets an author reach her own draft, and no one else's", async () => {
    const [hers] = await decideAs(nadia, [{ policy: canReadArticle, resource: draftResource }]);
    const [theirs] = await decideAs(yasmine, [{ policy: canReadArticle, resource: draftResource }]);

    expect(hers === undefined ? false : isAllowed(hers.decision)).toBe(true);
    expect(theirs === undefined ? true : isAllowed(theirs.decision)).toBe(false);
  });
});
