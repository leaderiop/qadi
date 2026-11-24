/**
 * The highlight lens's rules, tested with no DOM.
 *
 * What is drawn, whether the reader is picking and the guard they picked are one
 * snapshot, and each command publishes only when it changed that snapshot: a
 * no-op keeps the snapshot reference and calls no listener, so a reader of the
 * store does not render for a command that moved nothing. The click a pick
 * consumes, and the one reveal a pick arms, are answers of the session rather
 * than state a component holds.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import {
  isPicking,
  LensSnapshot,
  makeLensSession,
  pickedOf,
  type LensSession,
} from "../../src/model/LensSession.ts";
import { heardOn } from "../helpers.ts";

const idle = (highlighted: ReadonlyArray<string>, picked: string | undefined) =>
  LensSnapshot.Idle({ highlighted, picked });

const make = () => {
  const session = makeLensSession();
  return { session, heard: heardOn(session) };
};

/** A session where the reader picked `id` off the page and is back to idle. */
const pickedOff = (id: string) => {
  const { session, heard } = make();
  session.toggle();
  session.hover(id);
  session.choose(id);
  return { session, heard };
};

describe("the lens session", () => {
  it("a new session is idle, draws nothing and holds no pick", () => {
    const { session, heard } = make();
    assert.deepStrictEqual(session.getSnapshot(), idle([], undefined));
    assert.isUndefined(pickedOf(session.getSnapshot()));
    assert.isFalse(isPicking(session.getSnapshot()));
    assert.strictEqual(heard.calls, 0);
  });

  it("toggle from idle enters picking with nothing drawn and drops the pick; toggle while picking returns to idle with nothing drawn and nothing picked", () => {
    const { session, heard } = pickedOff("a");
    assert.deepStrictEqual(session.getSnapshot(), idle([], "a"));
    const before = heard.calls;

    session.toggle();
    assert.deepStrictEqual(session.getSnapshot(), LensSnapshot.Picking({ highlighted: [] }));
    assert.isTrue(isPicking(session.getSnapshot()));
    assert.isUndefined(pickedOf(session.getSnapshot()));
    assert.strictEqual(heard.calls, before + 1);

    session.hover("b");
    session.toggle();
    assert.deepStrictEqual(session.getSnapshot(), idle([], undefined));
    assert.isFalse(isPicking(session.getSnapshot()));
    assert.strictEqual(heard.calls, before + 3);

    session.toggle();
    session.toggle();
    assert.deepStrictEqual(session.getSnapshot(), idle([], undefined));
    assert.strictEqual(heard.calls, before + 5);
  });

  it("a hover while idle changes nothing and publishes nothing; a hover while picking draws the guard under the pointer, or nothing; a hover over the guard already drawn publishes nothing", () => {
    const { session, heard } = pickedOff("a");
    session.highlight(["b", "c"]);
    const idled = session.getSnapshot();
    const before = heard.calls;

    session.hover("b");
    session.hover(undefined);
    assert.strictEqual(session.getSnapshot(), idled);
    assert.strictEqual(heard.calls, before);

    const fresh = make();
    fresh.session.toggle();
    const started = fresh.session.getSnapshot();
    fresh.session.hover(undefined);
    assert.strictEqual(fresh.session.getSnapshot(), started);
    assert.strictEqual(fresh.heard.calls, 1);

    fresh.session.hover("a");
    assert.deepStrictEqual(fresh.session.getSnapshot(), LensSnapshot.Picking({ highlighted: ["a"] }));
    assert.strictEqual(fresh.heard.calls, 2);

    const drawn = fresh.session.getSnapshot();
    fresh.session.hover("a");
    assert.strictEqual(fresh.session.getSnapshot(), drawn);
    assert.strictEqual(fresh.heard.calls, 2);

    fresh.session.hover("b");
    assert.deepStrictEqual(fresh.session.getSnapshot(), LensSnapshot.Picking({ highlighted: ["b"] }));
    assert.strictEqual(fresh.heard.calls, 3);

    fresh.session.hover(undefined);
    assert.deepStrictEqual(fresh.session.getSnapshot(), LensSnapshot.Picking({ highlighted: [] }));
    assert.strictEqual(fresh.heard.calls, 4);
  });

  it("a choose while idle consumes nothing and publishes nothing; a choose over nothing while picking consumes nothing and keeps picking; a choose over a guard while picking consumes the click, picks it and leaves picking", () => {
    const { session, heard } = make();
    const first = session.getSnapshot();
    assert.isFalse(session.choose("a"));
    assert.isFalse(session.choose(undefined));
    assert.strictEqual(session.getSnapshot(), first);
    assert.strictEqual(heard.calls, 0);

    session.toggle();
    session.hover("b");
    const drawn = session.getSnapshot();
    assert.isFalse(session.choose(undefined));
    assert.strictEqual(session.getSnapshot(), drawn);
    assert.isTrue(isPicking(session.getSnapshot()));
    assert.strictEqual(heard.calls, 2);

    assert.isTrue(session.choose("a"));
    assert.deepStrictEqual(session.getSnapshot(), idle([], "a"));
    assert.isFalse(isPicking(session.getSnapshot()));
    assert.strictEqual(pickedOf(session.getSnapshot()), "a");
    assert.strictEqual(heard.calls, 3);

    const picked = session.getSnapshot();
    assert.isFalse(session.choose("b"));
    assert.strictEqual(session.getSnapshot(), picked);
    assert.strictEqual(heard.calls, 3);
  });

  it("cancel while picking returns to idle with nothing drawn and nothing picked; cancel while idle clears the drawing and keeps the pick; cancel while idle with nothing drawn publishes nothing", () => {
    const { session, heard } = make();
    const first = session.getSnapshot();
    session.cancel();
    assert.strictEqual(session.getSnapshot(), first);
    assert.strictEqual(heard.calls, 0);

    session.toggle();
    session.hover("a");
    session.cancel();
    assert.deepStrictEqual(session.getSnapshot(), idle([], undefined));
    assert.strictEqual(heard.calls, 3);

    const held = pickedOff("a");
    held.session.highlight(["b"]);
    const before = held.heard.calls;
    held.session.cancel();
    assert.deepStrictEqual(held.session.getSnapshot(), idle([], "a"));
    assert.strictEqual(held.heard.calls, before + 1);

    const cleared = held.session.getSnapshot();
    held.session.cancel();
    assert.strictEqual(held.session.getSnapshot(), cleared);
    assert.strictEqual(held.heard.calls, before + 1);
  });

  it("highlight while idle draws the guards asked for and keeps the pick; highlight with the same guards publishes nothing; highlight with the same guards in another order publishes; highlight while picking ends picking and draws the guards asked for", () => {
    const { session, heard } = pickedOff("a");
    const before = heard.calls;

    session.highlight(["b", "c"]);
    assert.deepStrictEqual(session.getSnapshot(), idle(["b", "c"], "a"));
    assert.strictEqual(heard.calls, before + 1);

    const drawn = session.getSnapshot();
    session.highlight(["b", "c"]);
    assert.strictEqual(session.getSnapshot(), drawn);
    assert.strictEqual(heard.calls, before + 1);

    session.highlight(["c", "b"]);
    assert.deepStrictEqual(session.getSnapshot(), idle(["c", "b"], "a"));
    assert.strictEqual(heard.calls, before + 2);

    session.highlight(["c"]);
    assert.deepStrictEqual(session.getSnapshot(), idle(["c"], "a"));
    assert.strictEqual(heard.calls, before + 3);

    session.toggle();
    session.hover("b");
    session.highlight(["c", "b"]);
    assert.deepStrictEqual(session.getSnapshot(), idle(["c", "b"], undefined));
    assert.isFalse(isPicking(session.getSnapshot()));
    assert.strictEqual(heard.calls, before + 6);

    const fresh = make();
    fresh.session.toggle();
    fresh.session.highlight([]);
    assert.deepStrictEqual(fresh.session.getSnapshot(), idle([], undefined));
    assert.strictEqual(fresh.heard.calls, 2);
  });

  it("highlight with no guards while idle draws nothing and keeps the pick", () => {
    const { session, heard } = pickedOff("a");
    const picked = session.getSnapshot();
    const before = heard.calls;
    session.highlight([]);
    assert.strictEqual(session.getSnapshot(), picked);
    assert.strictEqual(pickedOf(session.getSnapshot()), "a");
    assert.strictEqual(heard.calls, before);

    session.highlight(["b"]);
    session.highlight([]);
    assert.deepStrictEqual(session.getSnapshot(), idle([], "a"));
    assert.strictEqual(heard.calls, before + 2);
  });

  it("a published snapshot keeps the array it was given", () => {
    const { session } = make();
    const ids = ["a", "b"];
    session.highlight(ids);
    const snapshot = session.getSnapshot();
    assert.isTrue(snapshot._tag === "Idle" && snapshot.highlighted === ids);

    const other = ["b", "a"];
    session.highlight(other);
    const next = session.getSnapshot();
    assert.isTrue(next._tag === "Idle" && next.highlighted === other);

    session.toggle();
    session.highlight(ids);
    const ended = session.getSnapshot();
    assert.isTrue(ended._tag === "Idle" && ended.highlighted === ids);
  });

  it("a repeated cancel, hover or highlight publishes once", () => {
    const { session, heard } = make();
    session.highlight(["a"]);
    session.highlight(["a"]);
    session.cancel();
    session.cancel();
    assert.strictEqual(heard.calls, 2);

    session.toggle();
    session.hover("a");
    session.hover("a");
    assert.strictEqual(heard.calls, 4);
  });

  it("a pick reveals its row once, and only for its own guard; toggle, cancel and highlight disarm a reveal that was not taken, and a hover, which moves nothing from idle, does not; takeReveal publishes nothing", () => {
    const { session, heard } = pickedOff("a");
    const picked = session.getSnapshot();
    const before = heard.calls;
    assert.isFalse(session.takeReveal("b"));
    assert.isTrue(session.takeReveal("a"));
    assert.isFalse(session.takeReveal("a"));
    assert.strictEqual(session.getSnapshot(), picked);
    assert.strictEqual(heard.calls, before);

    const kept = pickedOff("a");
    // Idle between the pick and the listeners coming off: a hover moves nothing and leaves it.
    kept.session.hover("b");
    assert.isFalse(kept.session.choose("b"));
    assert.isFalse(kept.session.takeReveal("b"));
    assert.isTrue(kept.session.takeReveal("a"));

    const cancelled = pickedOff("a");
    cancelled.session.cancel();
    assert.isFalse(cancelled.session.takeReveal("a"));

    const drawnThenCancelled = pickedOff("a");
    drawnThenCancelled.session.highlight(["b"]);
    drawnThenCancelled.session.cancel();
    assert.isFalse(drawnThenCancelled.session.takeReveal("a"));

    const highlighted = pickedOff("a");
    highlighted.session.highlight(["b"]);
    assert.isFalse(highlighted.session.takeReveal("a"));

    const unchanged = pickedOff("a");
    unchanged.session.highlight([]);
    assert.isFalse(unchanged.session.takeReveal("a"));

    const toggled = pickedOff("a");
    toggled.session.toggle();
    assert.isFalse(toggled.session.takeReveal("a"));

    const returned = pickedOff("a");
    returned.session.toggle();
    returned.session.toggle();
    assert.isFalse(returned.session.takeReveal("a"));

    const repicked = pickedOff("a");
    repicked.session.toggle();
    repicked.session.choose("b");
    assert.isFalse(repicked.session.takeReveal("a"));
    assert.isTrue(repicked.session.takeReveal("b"));
    assert.isFalse(repicked.session.takeReveal("b"));

    const untaken = pickedOff("a");
    untaken.session.toggle();
    untaken.session.hover("b");
    untaken.session.choose("b");
    untaken.session.takeReveal("b");
    untaken.session.toggle();
    untaken.session.hover("a");
    untaken.session.choose("a");
    assert.isTrue(untaken.session.takeReveal("a"));
  });

  it("a listener told of a pick can take its reveal", () => {
    const { session } = make();
    session.toggle();
    session.hover("a");
    const taken: Array<boolean> = [];
    session.subscribe(() => {
      taken.push(session.takeReveal("a"));
    });
    session.choose("a");
    assert.deepStrictEqual(taken, [true]);
    assert.isFalse(session.takeReveal("a"));
  });

  it("a command run from inside a listener sees the snapshot already published", () => {
    const { session } = make();
    const seen: Array<LensSnapshot> = [];
    let ran = false;
    session.subscribe(() => {
      if (ran) return;
      ran = true;
      seen.push(session.getSnapshot());
      session.cancel();
      seen.push(session.getSnapshot());
    });
    session.toggle();
    assert.deepStrictEqual(seen, [LensSnapshot.Picking({ highlighted: [] }), idle([], undefined)]);
  });

  it("pickedOf reads the pick of an idle snapshot and nothing while picking; isPicking is true only while picking", () => {
    assert.strictEqual(pickedOf(idle([], "a")), "a");
    assert.strictEqual(pickedOf(idle(["b"], "c")), "c");
    assert.isUndefined(pickedOf(idle(["b"], undefined)));
    assert.isUndefined(pickedOf(LensSnapshot.Picking({ highlighted: ["a"] })));
    assert.isTrue(isPicking(LensSnapshot.Picking({ highlighted: [] })));
    assert.isFalse(isPicking(idle([], "a")));
    assert.isFalse(isPicking(idle([], undefined)));
  });

  /** One command of the session, with the name a failing run prints. */
  interface Command {
    readonly name: string;
    readonly run: (session: LensSession) => unknown;
  }

  const ids = FastCheck.constantFrom("a", "b", "c");
  const maybeId = FastCheck.constantFrom<string | undefined>("a", "b", "c", undefined);
  const commands: FastCheck.Arbitrary<Command> = FastCheck.oneof(
    FastCheck.constant<Command>({ name: "toggle", run: (session) => session.toggle() }),
    FastCheck.constant<Command>({ name: "cancel", run: (session) => session.cancel() }),
    maybeId.map((id): Command => ({ name: `hover ${id}`, run: (session) => session.hover(id) })),
    maybeId.map((id): Command => ({ name: `choose ${id}`, run: (session) => session.choose(id) })),
    FastCheck.array(ids, { maxLength: 3 }).map(
      (these): Command => ({ name: `highlight ${these.join(",")}`, run: (session) => session.highlight(these) }),
    ),
    ids.map((id): Command => ({ name: `takeReveal ${id}`, run: (session) => session.takeReveal(id) })),
  );

  it("every sequence of commands keeps picking free of a pick and draws at most one guard while picking", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.array(commands, { maxLength: 40 }), (sequence) => {
        const { session } = make();
        for (const command of sequence) {
          command.run(session);
          const snapshot = session.getSnapshot();
          if (snapshot._tag === "Picking") {
            assert.isFalse("picked" in snapshot, command.name);
            assert.isAtMost(snapshot.highlighted.length, 1, command.name);
            assert.isUndefined(pickedOf(snapshot), command.name);
          }
        }
      }),
    );
  });

  it("a command publishes exactly when the snapshot changes", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.array(commands, { maxLength: 40 }), (sequence) => {
        const { session, heard } = make();
        for (const command of sequence) {
          const before = session.getSnapshot();
          const text = JSON.stringify(before);
          const heardBefore = heard.calls;
          const answer = command.run(session);
          const after = session.getSnapshot();
          const changed = JSON.stringify(after) !== text;
          assert.strictEqual(heard.calls - heardBefore, changed ? 1 : 0, command.name);
          assert.strictEqual(after !== before, changed, command.name);
          if (command.name.startsWith("choose ")) {
            assert.strictEqual(answer, changed, command.name);
          }
        }
      }),
    );
  });
});
