/**
 * JOB 7 ledger — E7.1 … E7.8.
 *
 * The one screen that runs an evaluation, so these tests do too: every result
 * below comes out of `simulate` rather than out of a hand-built outcome, because
 * the claim the screen makes is about what the evaluator says and a fabricated
 * decision would prove only that the renderer agrees with the test author.
 *
 * Runs are forked, and a fixture run settles synchronously inside `runFork` —
 * so `act` around the click is enough and nothing here waits on a timer.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  AttributeResolver,
  Failed,
  gte,
  hasAction,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  MissingAction,
  obligation,
  obliged,
  permission,
  scriptedPort,
  PortReply,
  attributeResolverPort,
  portsLayer,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { Simulator } from "../../src/react/Simulator.tsx";
import { decisionRecord, failedRecord, obligationRecord } from "../helpers.ts";

const read = permission("doc", "read");

const sighting = (policy: Policy): PolicySighting => ({
  policy,
  label: policyLabel(policy),
  count: 1,
  allows: 1,
  denies: 0,
  errors: 0,
  lastAt: 100,
});

const brokenPorts = portsLayer({
  AttributeResolver: scriptedPort(attributeResolverPort, () => PortReply.fail("the store is down"), "broken").layer,
});

const entryOf = (record: Parameters<typeof ingestAll>[1][number]): TimelineEntry => {
  const [entry] = ingestAll(emptyTimeline(), [record]).entries;
  if (entry === undefined) throw new Error("expected an entry");
  return entry;
};

/** Adds a chip to the named editor and commits it with Enter. */
const chip = (label: string, value: string) => {
  const field = screen.getByLabelText(`Add ${label}`);
  act(() => {
    fireEvent.change(field, { target: { value } });
    fireEvent.keyDown(field, { key: "Enter" });
  });
};

/**
 * Clicks the run button and lets a real async tick pass before returning.
 *
 * `DecisionCache.getOrCompute` forks `compute` onto a detached fiber (H2,
 * ticket #46) so a coalesced waiter's own interruption never cancels
 * everyone else's answer — but forking always schedules through a real
 * microtask boundary, even for an otherwise fully-synchronous evaluation
 * Effect's trampoline used to run to completion inline. A plain sync
 * `act(() => fireEvent.click(...))`, with no await, no longer sees the
 * result: the click's `act` batch closes before the forked fiber's
 * `Deferred` ever resolves. `setTimeout(0)` — a macrotask, not just another
 * microtask — reliably drains that and any other pending scheduling. A
 * "what if" sweep chains several such evaluations (`Simulator.tsx`'s own
 * "a sweep runs N evaluations" cost line), so one tick is not always
 * enough — several, back to back, is what actually settles every case
 * rather than tuning a fragile exact count per call site.
 */
const run = async (testId = "qadi-simulator-run") => {
  await act(async () => {
    fireEvent.click(screen.getByTestId(testId));
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
};

describe("the empty state — E7.1", () => {
  it("explains rather than showing a form nothing can run", async () => {
    render(<Simulator sightings={[]} />);

    assert.isNotNull(screen.queryByTestId("qadi-simulator-empty"));
    assert.isNull(screen.queryByTestId("qadi-simulator-run"));
    assert.include(
      screen.getByTestId("qadi-simulator-empty").textContent ?? "",
      "replay in simulator",
    );
  });
});

describe("running one simulation", () => {
  it("allows once the reviewer grants what the policy asks for", async () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    chip("permissions", "doc:read");
    await run();

    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

});

describe("the check card", () => {
  // E7.3
  it("reports malformed resource JSON inline and keeps running", async () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), { target: { value: "{oops" } });
    });

    assert.isNotNull(screen.queryByTestId("qadi-resource-error"));
    // The panel survives, and the run button still works.
    await run();
    assert.isNotNull(screen.queryByTestId("qadi-simulator-result"));
  });

});

describe("the result", () => {
  // E7.4
  it("marks a result stale once the form has moved", async () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    await run();
    assert.isNull(screen.queryByTestId("qadi-simulator-stale"));

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-subject-id"), { target: { value: "bob" } });
    });

    assert.isNotNull(screen.queryByTestId("qadi-simulator-stale"));
  });

  // E7.5
  it("shows an error panel and no requirement tree when the evaluation broke", async () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} ports={brokenPorts} />);

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    await run();

    const result = screen.getByTestId("qadi-simulator-result");
    assert.isNotNull(within(result).queryByTestId("qadi-simulator-error"));
    assert.isEmpty(within(result).queryAllByTestId("qadi-node"));
    assert.include(result.textContent ?? "", "This is not a denial");
  });

  // E7.6
  it("lists duties and says no handler ran", async () => {
    render(
      <Simulator sightings={[sighting(obliged(obligation("audit"), hasPermission(read)))]} />,
    );
    chip("permissions", "doc:read");
    await run();

    const duties = screen.getByTestId("qadi-simulator-obligations");
    assert.include(duties.textContent ?? "", "audit");
    assert.include(duties.textContent ?? "", "binding");
    assert.include(duties.textContent ?? "", "runs no obligation handler");
  });

  // E7.7 — `undefined` is the top of the lattice, and rendering it as an empty
  // list would understate a full grant into a grant of nothing.
  it("renders absent visible fields as every field, and a narrowed set as the fields", async () => {
    const view = render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    chip("permissions", "doc:read");
    await run();

    assert.isNotNull(screen.queryByTestId("qadi-fields-all"));
    assert.isNull(screen.queryByTestId("qadi-fields-none"));
    view.unmount();

    render(<Simulator sightings={[sighting(hasPermission(read, { fields: ["title"] }))]} />);
    chip("permissions", "doc:read");
    await run();

    assert.strictEqual(screen.getByTestId("qadi-fields-some").textContent, "title");
  });

  // E6.1 / E6.2 — labelled, never inferred from the number.
  it("says which clock measured the duration", async () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    await run();
    assert.include(
      screen.getByTestId("qadi-simulator-duration").textContent ?? "",
      "in this browser",
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "deterministic clock" }));
    });
    await run();
    assert.include(screen.getByTestId("qadi-simulator-duration").textContent ?? "", "not measured");
  });
});

describe("a source that cannot be honoured — C2", () => {
  it("shows Live disabled with its reason, then refuses a run once the host drops the ports", async () => {
    const policy = sighting(hasAttribute("clearance", gte(5)));
    const view = render(<Simulator sightings={[policy]} />);
    const live = screen.getByTestId("qadi-source-Live");
    assert.isTrue(live.hasAttribute("disabled"));
    assert.include(live.getAttribute("title") ?? "", "did not pass a `ports` layer");

    view.rerender(<Simulator sightings={[policy]} ports={brokenPorts} />);
    chip("resolver attributes", "clearance:9");
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    view.rerender(<Simulator sightings={[policy]} />);
    await run();

    // Fixtures would have answered ALLOW; nothing was evaluated instead.
    assert.isNull(screen.queryByTestId("qadi-simulator-result"));
    const refused = screen.getByTestId("qadi-simulator-refused");
    assert.include(refused.textContent ?? "", "Live");
    assert.include(refused.textContent ?? "", "`ports` layer");
    assert.include(screen.getByTestId("qadi-simulator-cost").textContent ?? "", "would be refused");
  });
});

describe("the cost line is the cost — C7", () => {
  it("states what it runs, with pairs off and on, and warns before a live sweep", async () => {
    const view = render(<Simulator sightings={[sighting(allOf([hasRole("a"), hasRole("b")]))]} ports={brokenPorts} />);
    chip("roles", "a");
    chip("roles", "b");
    const stated = (): number =>
      Number(/runs (\d+) evaluations/.exec(screen.getByTestId("qadi-simulator-cost").textContent ?? "")?.[1]);
    const ranCount = (): number =>
      Number(/of (\d+) evaluations/.exec(screen.getByTestId("qadi-whatif-count").textContent ?? "")?.[1]);

    const off = stated();
    await run("qadi-simulator-sweep");
    assert.strictEqual(ranCount(), off);

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-simulator-pairs"));
    });
    const on = stated();
    assert.isAbove(on, off);
    await run("qadi-simulator-sweep");
    assert.strictEqual(ranCount(), on);

    // Before the sweep, never after it.
    assert.include(screen.getByTestId("qadi-simulator-cost").textContent ?? "", "in this process");
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    assert.include(
      screen.getByTestId("qadi-simulator-cost").textContent ?? "",
      "against your live resolvers",
    );
    view.unmount();
  });
});

describe("a run left behind — C4", () => {
  it("is dropped when the policy changes while it runs", async () => {
    const slowPorts = portsLayer({
      AttributeResolver: Layer.succeed(AttributeResolver, {
        name: "slow",
        resolve: () => Effect.sleep("40 millis").pipe(Effect.as(9)),
      }),
    });
    render(
      <Simulator
        sightings={[sighting(hasAttribute("clearance", gte(5))), sighting(hasRole("x"))]}
        ports={slowPorts}
      />,
    );
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-simulator-run"));
    });
    act(() => {
      fireEvent.change(screen.getByTestId("qadi-simulator-policy"), { target: { value: "1" } });
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120));
    });

    assert.isNull(screen.queryByTestId("qadi-simulator-result"));
    // And the buttons are not left disabled by the run that never reported.
    assert.isFalse(screen.getByTestId("qadi-simulator-run").hasAttribute("disabled"));
  });
});

describe("the fixtures as the codec writes them — C5, C6", () => {
  it("keeps a renamed subject's edges, shows a colon and a string value faithfully, and edits signatures", async () => {
    render(<Simulator sightings={[sighting(hasRelationship("org:admin"))]} />);
    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), { target: { value: '{"id":"doc-1"}' } });
    });
    chip("relationships", '{"subjectId":"someone","relation":"org:admin","resourceId":"doc-1"}');
    act(() => {
      fireEvent.change(screen.getByTestId("qadi-subject-id"), { target: { value: "bob" } });
    });
    // An unrelated edit rewrites nothing, and the edge followed the rename.
    chip("relationships", "viewer:doc-9");
    await run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    chip("attributes", 'level:"7"');
    assert.include(screen.getByTestId("qadi-subject-attributes").textContent ?? "", 'level="7"');

    // `signatures` has a control, which a replay's "yours to supply" points at.
    chip("signatures", "approved:doc-1");
    assert.include(screen.getByTestId("qadi-signatures").textContent ?? "", "approved:doc-1");
    chip("signatures", "approved:doc-1");
    assert.isNotNull(screen.queryByTestId("qadi-signatures-error"));
  });
});

describe("the what-if table", () => {
  it("runs a sweep and names the node that flipped", async () => {
    render(<Simulator sightings={[sighting(allOf([hasRole("a"), hasRole("b")]))]} />);
    chip("roles", "a");
    chip("roles", "b");
    // The sweep honours the toggle: pairs are off by default, so a pair row
    // is asked for.
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-simulator-pairs"));
    });
    await run("qadi-simulator-sweep");

    const rows = screen.getAllByTestId("qadi-whatif-row");
    assert.strictEqual(rows.length, 3); // two drops plus their pair
    assert.isNotEmpty(screen.queryAllByTestId("qadi-whatif-flipped"));
  });

});

describe("seeding from a logged row — JOB 5 on screen", () => {
  const decided = entryOf(
    decisionRecord({ evaluationId: "ev-91", policy: hasPermission(read), action: "read" }),
  );

  it("fills the policy, the action and the fields it could not fill", async () => {
    render(<Simulator sightings={[]} seed={decided} />);

    assert.strictEqual(screen.getByTestId("qadi-action").getAttribute("value"), "read");
    const unseeded = screen.getByTestId("qadi-unseeded");
    assert.include(unseeded.textContent ?? "", "roles");
    assert.include(unseeded.textContent ?? "", "relationships");
    assert.include(unseeded.textContent ?? "", "carries nothing else about them");
  });

  it("reports a reconstruction that reproduces the row, and one that does not", async () => {
    const view = render(<Simulator sightings={[]} seed={decided} />);
    chip("permissions", "doc:read");
    await run();

    const baseline = screen.getByTestId("qadi-baseline");
    assert.include(baseline.textContent ?? "", "ev-91");
    assert.include(baseline.textContent ?? "", "reproduces the logged decision");
    view.unmount();

    render(<Simulator sightings={[]} seed={decided} />);
    await run();

    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "differs");
    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "HasPermission");
  });
});

describe("unmounting mid-run — E7.8", () => {
  /**
   * A fixture run settles inside `runFork`, so this cannot catch a late
   * `setState` by timing. What it does check is that the cleanup path runs
   * without throwing and that nothing is written afterwards — which is the
   * observable half. The interrupt itself is what matters for a live source,
   * and it is the reason this is a fiber rather than a promise.
   */
  it("unmounts cleanly while a result is on screen", async () => {
    const view = render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    await run();
    assert.isNotNull(screen.queryByTestId("qadi-simulator-result"));

    act(() => {
      view.unmount();
    });

    assert.isNull(screen.queryByTestId("qadi-simulator-result"));
  });
});

describe("the fixtures card", () => {
  it("removes a chip and a pair again", async () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} />);
    chip("attributes", "clearance:9");
    await run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    act(() => {
      fireEvent.click(screen.getByLabelText("Remove clearance"));
    });
    await run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");
  });

});

describe("choosing a policy", () => {
  it("runs whichever one the rail names", async () => {
    render(
      <Simulator sightings={[sighting(hasRole("a")), sighting(hasPermission(read))]} />,
    );
    chip("permissions", "doc:read");
    await run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-simulator-policy"), { target: { value: "1" } });
    });
    await run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

});

describe("the baseline card, in each of its states", () => {
  const seedOf = (policy: Policy, options?: { readonly failed?: boolean }) =>
    entryOf(
      options?.failed === true
        ? failedRecord({ evaluationId: "ev-7" })
        : decisionRecord({ evaluationId: "ev-91", policy }),
    );

  it("caveats a row whose evaluation failed, and claims no match", async () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} seed={seedOf(hasPermission(read), { failed: true })} />);
    await run();

    assert.include(
      screen.getByTestId("qadi-baseline-caveat").textContent ?? "",
      "produced no trace to compare against",
    );
    assert.include(
      screen.getByTestId("qadi-baseline-state").textContent ?? "",
      "decided where the logged one failed",
    );
  });

  it("reports a reconstruction that broke where the logged row decided", async () => {
    render(
      <Simulator
        sightings={[sighting(hasAttribute("clearance", gte(5)))]}
        seed={seedOf(hasAttribute("clearance", gte(5)))}
        ports={brokenPorts}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    await run();

    assert.include(
      screen.getByTestId("qadi-baseline-state").textContent ?? "",
      "failed with AttributeResolveError",
    );
  });

  /**
   * Replaying an outage: the logged run failed and so does the reconstruction.
   * The two agree, and the card still refuses to call it a match — the record
   * has no trace to vouch for one.
   */
  it("reports the same failure twice without calling it a match", async () => {
    const failedOnAction = entryOf(
      decisionRecord({
        evaluationId: "ev-7",
        policy: hasAction("publish"),
        // The very error `hasAction("publish")` raises when nothing was
        // supplied, so the reconstruction reproduces it field for field.
        outcome: new Failed({ error: new MissingAction({ expected: "publish" }) }),
      }),
    );
    render(<Simulator sightings={[]} seed={failedOnAction} />);
    await run();

    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "the same failure");
    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "MissingAction");
    assert.isNotNull(screen.queryByTestId("qadi-baseline-caveat"));
  });

  it("says a comparison is unavailable for a row that carries no decision", async () => {
    render(
      <Simulator
        sightings={[sighting(hasPermission(read))]}
        seed={entryOf(obligationRecord({ evaluationId: "ev-9" }))}
      />,
    );
    await run();

    assert.include(
      screen.getByTestId("qadi-baseline").textContent ?? "",
      "an orphan carries no decision",
    );
  });
});

describe("a defect in the layer the host supplied", () => {
  /**
   * `simulate` cannot fail — a broken resolver is a `Failed` *outcome* — so the
   * only way to reach the fiber's failure path is a defect, and a `ports` layer
   * that dies while building is the realistic one. A panel that showed nothing
   * would look merely unresponsive.
   */
  it("is reported rather than swallowed", async () => {
    const dying = portsLayer({
      AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))),
    });
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} ports={dying} />);

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    await run();

    assert.include(
      screen.getByTestId("qadi-simulator-broke").textContent ?? "",
      "the layer exploded",
    );
  });
});
