import type { AuthSubject } from "@qadi/core";
import { EvaluationServicesNone, hasRole, isAllowed, makeSubject, makeSubjectId } from "@qadi/core";
import { assert, describe, it } from "@effect/vitest";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach } from "vitest";
import type { HydrationMismatch } from "../src/DeveloperSignals.ts";
import { SeededAllow, SeededDeny, permits } from "../src/SeededDecision.ts";
import { makeSeededQuestion } from "../src/SeededQuestion.ts";

const subjectId = makeSubjectId("u1");
const policy = hasRole("admin");
const allow = new SeededAllow({
  evaluationId: "e1",
  subjectId,
  durationMillis: 0,
  obligations: [],
  disclosure: { _tag: "Withheld" },
});

/** A real atom runtime and a real subject atom: the way an atom set builds every question. */
const runtime = Atom.runtime(EvaluationServicesNone);
const admin = makeSubject({ id: "u1", roles: ["admin"] });
const visitor = makeSubject({ id: "u1" });

const registries: Array<AtomRegistry.AtomRegistry> = [];
const makeRegistry = (options?: Parameters<typeof AtomRegistry.make>[0]) => {
  const registry = AtomRegistry.make(options);
  registries.push(registry);
  return registry;
};
afterEach(() => {
  for (const registry of registries.splice(0)) registry.dispose();
});

const questionOf = (input?: {
  readonly report?: (m: HydrationMismatch) => void;
  readonly live?: () => () => void;
}) => {
  const subject = Atom.make<AuthSubject | undefined>(undefined).pipe(Atom.keepAlive);
  const q = makeSeededQuestion({
    policy,
    resource: undefined,
    runtime,
    subject,
    report: input?.report,
    live: input?.live ?? (() => () => {}),
  });
  return { q, subject };
};

const decisionIn = (registry: AtomRegistry.AtomRegistry, q: ReturnType<typeof questionOf>["q"]) => {
  const result = registry.get(q.read);
  return AsyncResult.isSuccess(result) ? result.value : undefined;
};

describe("makeSeededQuestion, through a real atom runtime", () => {
  it("counts the question live before its computation reads the subject, once per computation", () => {
    const order: Array<string> = [];
    const registry = makeRegistry();
    const { q, subject } = questionOf({
      live: () => {
        order.push(registry.getNodes().has(subject) ? "live after subject" : "live");
        return () => order.push("release");
      },
    });
    registry.mount(q.read);
    assert.deepStrictEqual(order, ["live"]);
    registry.set(subject, visitor);
    registry.get(q.read);
    // The recompute disposes the reader (release) and reads it again (live), in that order.
    assert.deepStrictEqual(order, ["live", "release", "live after subject"]);
  });

  it("announces a disagreement once per registry, not once per question", () => {
    const reports: Array<HydrationMismatch> = [];
    const { q, subject } = questionOf({ report: (m) => reports.push(m) });
    const first = makeRegistry({ initialValues: [q.seed.hold(allow), [subject, visitor]] });
    const second = makeRegistry({ initialValues: [q.seed.hold(allow), [subject, visitor]] });
    first.mount(q.read);
    second.mount(q.read);
    first.get(q.read);
    first.get(q.read);

    assert.strictEqual(reports.length, 2);
    assert.strictEqual(reports[0]?.seeded, allow);
    assert.isFalse(reports[0] === undefined || isAllowed(reports[0].decided));
  });

  it("reads the seed while the subject is unknown, and drops it once the client answers", () => {
    const { q, subject } = questionOf();
    const registry = makeRegistry({ initialValues: [q.seed.hold(allow)] });
    registry.mount(q.read);
    assert.strictEqual(decisionIn(registry, q), allow);

    registry.set(subject, visitor);
    const after = decisionIn(registry, q);
    assert.isDefined(after);
    assert.isFalse(after === undefined ? true : permits(after));
  });

  it("carries the seed's evaluation id into the client's own evaluation (BEH-QD-186)", () => {
    const { q, subject } = questionOf();
    const registry = makeRegistry({ initialValues: [q.seed.hold(allow), [subject, admin]] });
    registry.mount(q.read);
    const decided = decisionIn(registry, q);
    assert.strictEqual(decided?.evaluationId, "e1");
    assert.isTrue(decided === undefined ? false : permits(decided));
  });

  it("a seed given after the first read does not re-run the computation", () => {
    let lives = 0;
    const { q, subject } = questionOf({
      live: () => {
        lives += 1;
        return () => {};
      },
    });
    const registry = makeRegistry({ initialValues: [[subject, admin]] });
    registry.mount(q.read);
    const first = decisionIn(registry, q);
    const [grantAtom, grant] = q.seed.hold(allow);
    // The grant arrives in a registry that has already answered: a late seed.
    if (!Atom.isWritable(grantAtom)) return assert.fail("the grant atom is writable");
    registry.set(grantAtom, grant);
    assert.strictEqual(decisionIn(registry, q), first);
    assert.strictEqual(lives, 1);
  });

  it("an unhydrated question leaves no grant node, after a computation has run", () => {
    const { q, subject } = questionOf();
    const [grantAtom] = q.seed.hold(allow);
    const registry = makeRegistry({ initialValues: [[subject, admin]] });
    registry.mount(q.read);
    assert.isDefined(decisionIn(registry, q));
    assert.isFalse(registry.getNodes().has(grantAtom));
  });
});

describe("a seed slot gives each registry its own grant", () => {
  it("returns one grant atom for a question and a distinct grant per call", () => {
    const { q } = questionOf();
    const [atomA, grantA] = q.seed.hold(allow);
    const [atomB, grantB] = q.seed.hold(allow);
    assert.strictEqual(atomA, atomB);
    assert.notStrictEqual(grantA, grantB);
  });

  it("reads the decision of the grant a registry was given", () => {
    const { q } = questionOf();
    const other = new SeededDeny({
      evaluationId: "e3",
      subjectId,
      durationMillis: 0,
      disclosure: { _tag: "Withheld" },
    });
    const first = makeRegistry({ initialValues: [q.seed.hold(allow)] });
    const second = makeRegistry({ initialValues: [q.seed.hold(other)] });
    assert.strictEqual(decisionIn(first, q), allow);
    assert.strictEqual(decisionIn(second, q), other);
  });

  it("reads none in a registry given no grant, and creates no node for it", () => {
    const { q } = questionOf();
    const [grantAtom] = q.seed.hold(allow);
    const unseeded = makeRegistry();
    assert.isUndefined(decisionIn(unseeded, q));
    assert.isFalse(unseeded.getNodes().has(grantAtom));
  });
});
