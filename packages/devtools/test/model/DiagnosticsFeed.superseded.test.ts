/**
 * Pins that a superseded run's sample does not mark the feed as having sampled.
 *
 * `Stopped` states whether the reading shown holds an accepted sample, from a flag the
 * sink sets. The sink checks that its run is current before it reads, folds or sets the
 * flag, so a sample from a run that was replaced marks nothing. The rows that pin the
 * dropped sample (`DiagnosticsFeed.characterisation.test.ts` FC9 and
 * `DiagnosticsFeed.test.ts` F33) observe only what is published, and the newest run takes
 * a real sample after, which sets the flag anyway; here the newest run stops before its
 * first sample, so a flag set by the superseded sample is the only way `Stopped` could
 * say it had sampled.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { makeDiagnosticsFeed, type PortCallCollector } from "../../src/index.ts";
import { diagnosticsOff } from "../../src/model/DiagnosticsFeed.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { settleTurns } from "../helpers.ts";

describe("a superseded run's sample and the stop flag", () => {
  it.effect(
    "SR1 a sample the superseded run takes does not mark the feed sampled, so a stop before the newest run's first sample says so",
    () =>
      Effect.gen(function* () {
        // The newest run reads for a second and then dies, after the superseded run has
        // sampled.
        const dying: PortCallCollector = {
          layer: Layer.empty,
          snapshot: Effect.sleep("1 second").pipe(
            Effect.andThen(Effect.die(new Error("boom"))),
          ),
        };
        const feed = yield* makeDiagnosticsFeed();
        const heard: Array<string> = [];
        feed.subscribe(() => {
          const { status } = feed.getSnapshot();
          heard.push(
            status._tag === "Stopped" ? `Stopped, sampled ${status.sampled}` : status._tag,
          );
        });
        const superseded = makeCollectorDouble((call) => {
          if (call === 1) feed.configure({ collector: dying });
          return { calls: [], dropped: 1, capacity: 10 };
        });

        feed.configure({ collector: superseded.collector });
        yield* settleTurns;

        assert.strictEqual(superseded.state.calls, 1);
        assert.deepStrictEqual(heard, ["Starting"]);

        yield* TestClock.adjust("1 second");
        yield* settleTurns;

        assert.deepStrictEqual(heard, ["Starting", "Stopped, sampled false"]);
        assert.strictEqual(feed.getSnapshot().reading, diagnosticsOff.reading);
      }),
  );
});
