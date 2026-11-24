/**
 * How the session's runs end, pinned through its interface.
 *
 * A run whose resolver interrupts itself is a defect the session must show: it
 * maps every non-success exit of a current run to `Broke`, so a panel never sits
 * on `Running` for a run that is gone. And a command that stops a run when none
 * is in flight must do nothing a host can see: no resolver is asked, no run span
 * is opened, and the command's own commit is the only notification. Both were
 * unpinned until the session's run protocol moved into a shared module, so they
 * are stated here against `makeSimulationSession` and nothing else.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import type * as Tracer from "effect/Tracer";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver, gte, hasAttribute, portsLayer } from "@qadi/core";
import { collectingTracer } from "@qadi/testing";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type { SimulationSession } from "../../src/model/SimulationSession.ts";
import { settleTurns, thrownBy } from "../helpers.ts";
import { counted, sighting, slow } from "../simulationFixtures.ts";

const clearance = hasAttribute("clearance", gte(5));
const lowClearance = hasAttribute("clearance", gte(1));

/** What a fixture answers: enough that `clearance` allows, so a wrong source would show. */
const withClearance: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 9 },
};

/** How many run spans a tracer collected. */
const runSpans = (spans: ReadonlyArray<Tracer.Span>): number =>
  spans.filter((s) => s.name === "qadi.devtools.simulationSession.run").length;

/** A Live session over two sightings with the slow resolver, built under a collecting tracer. */
const liveSession = (spans: Array<Tracer.Span>, scope?: Scope.Scope) =>
  Effect.gen(function* () {
    const { ports, tally } = slow();
    const build = makeSimulationSession({
      sightings: [sighting(clearance), sighting(lowClearance)],
      ports,
    }).pipe(Effect.provide(collectingTracer(spans)));
    const session = yield* scope === undefined ? build : Scope.provide(build, scope);
    session.chooseSource("Live");
    session.edit(withClearance);
    return { session, tally };
  });

describe("how the session ends a run", () => {
  it.effect("SR1 a resolver that interrupts itself reads Broke, not Running", () =>
    Effect.gen(function* () {
      const ports = portsLayer({
        AttributeResolver: Layer.succeed(AttributeResolver, {
          name: "self-interrupt",
          resolve: () => Effect.interrupt,
        }),
      });
      const session = yield* makeSimulationSession({ sightings: [sighting(clearance)], ports });
      session.chooseSource("Live");
      session.edit(withClearance);

      session.run("Run");
      yield* settleTurns;

      const run = session.getSnapshot().run;
      assert.strictEqual(run._tag, "Broke");
      assert.isTrue(run._tag === "Broke" && run.message.includes("Interrupt"));
    }));

  it.effect(
    "SR2 a superseding command on a session that never ran notifies once, asks no resolver and opens no run span",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        const { session, tally } = yield* liveSession(spans);
        const seen = counted(session);

        session.choosePolicy(lowClearance);
        yield* TestClock.adjust("2 seconds");

        assert.strictEqual(seen.notified, 1);
        assert.strictEqual(tally.started, 0);
        assert.strictEqual(runSpans(spans), 0);
        assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      }),
  );

  it.effect(
    "SR3 a superseding command after a finished run notifies once, asks no resolver again and opens no second run span",
    () =>
      Effect.gen(function* () {
        const spans: Array<Tracer.Span> = [];
        const { session, tally } = yield* liveSession(spans);
        session.run("Run");
        yield* TestClock.adjust("2 seconds");
        assert.strictEqual(session.getSnapshot().run._tag, "Ran");
        assert.strictEqual(tally.started, 1);
        assert.strictEqual(runSpans(spans), 1);
        const seen = counted(session);

        session.choosePolicy(lowClearance);
        yield* TestClock.adjust("2 seconds");

        assert.strictEqual(seen.notified, 1);
        assert.strictEqual(tally.started, 1);
        assert.strictEqual(runSpans(spans), 1);
        assert.strictEqual(session.getSnapshot().run._tag, "Idle");
      }),
  );

  it.effect("SR4 a superseding command on a closed session asks no resolver and opens no run span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const scope = Scope.makeUnsafe();
      const { session, tally } = yield* liveSession(spans, scope);
      yield* Scope.close(scope, Exit.void);

      session.choosePolicy(lowClearance);
      yield* TestClock.adjust("2 seconds");

      assert.strictEqual(tally.started, 0);
      assert.strictEqual(runSpans(spans), 0);
    }));

  it.effect("SR5 a ports layer that starts a run while it is built leaves the newest run live", () =>
    Effect.gen(function* () {
      const { tally, ports } = slow();
      // Built after the session, because the hook closes over it. Constructed in the
      // run's synchronous prefix, so the nested `run` starts a newer run before the
      // outer fork has installed anything.
      const holder: { session: SimulationSession | undefined; nested: boolean } = {
        session: undefined,
        nested: false,
      };
      const hooked = Layer.merge(
        ports,
        Layer.effectDiscard(
          Effect.sync(() => {
            if (holder.nested) return;
            holder.nested = true;
            holder.session?.run("Run");
          }),
        ),
      );
      const session = yield* makeSimulationSession({ sightings: [sighting(clearance)] });
      holder.session = session;
      session.chooseSource("Live");
      session.edit(withClearance);
      session.setPorts(hooked);

      session.run("Run");
      yield* settleTurns;
      yield* TestClock.adjust("5 seconds");
      yield* settleTurns;

      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
      assert.strictEqual(tally.finished, 1);
    }));

  it.effect("SR6 a subscriber that throws on the Running a run publishes is rethrown once the run has started, and the run lands", () =>
    Effect.gen(function* () {
      const { session, tally } = yield* liveSession([]);
      const boom = new Error("boom");
      let throws = 1;
      session.subscribe(() => {
        if (throws === 0) return;
        throws -= 1;
        throw boom;
      });

      const outcome = thrownBy(() => session.run("Run"));
      yield* TestClock.adjust("2 seconds");
      yield* settleTurns;

      assert.isTrue(outcome.threw);
      assert.strictEqual(outcome.thrown, boom);
      assert.strictEqual(tally.started, 1);
      assert.strictEqual(session.getSnapshot().run._tag, "Ran");
    }));
});
