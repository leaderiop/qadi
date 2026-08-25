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
import { afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  anyOf,
  AttributeResolveError,
  AttributeResolver,
  DecisionHistoryUnknown,
  Failed,
  gte,
  hasActed,
  hasAction,
  hasAttribute,
  hasPermission,
  hasRelationship,
  hasRole,
  MissingAction,
  obligation,
  obliged,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import type { Policy } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import type { TimelineEntry } from "../../src/model/Timeline.ts";
import { Simulator } from "../../src/react/Simulator.tsx";
import { decisionRecord, failedRecord, obligationRecord } from "../helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

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

const brokenPorts = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    name: "broken",
    resolve: (_subjectId: string, attribute: string) =>
      Effect.fail(new AttributeResolveError({ attribute, cause: "the store is down" })),
  }),
  RelationshipResolverNever,
  DecisionHistoryUnknown,
);

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

const run = (testId = "qadi-simulator-run") => {
  act(() => {
    fireEvent.click(screen.getByTestId(testId));
  });
};

describe("the empty state — E7.1", () => {
  it("explains rather than showing a form nothing can run", () => {
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
  it("denies a subject holding nothing, and shows the requirement tree", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    run();

    const result = screen.getByTestId("qadi-simulator-result");
    assert.include(result.textContent ?? "", "DENY");
    assert.isNotEmpty(within(result).queryAllByTestId("qadi-node"));
  });

  it("allows once the reviewer grants what the policy asks for", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    chip("permissions", "doc:read");
    run();

    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

  it("drops a chip again — E7.2", () => {
    render(<Simulator sightings={[sighting(hasRole("editor"))]} />);
    chip("roles", "editor");
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    // The removal does not touch the result already on screen; it changes what
    // the *next* run will answer.
    act(() => {
      fireEvent.click(screen.getByLabelText("Remove editor"));
    });
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");
  });

  /**
   * A value typed into an attribute field is JSON first and a string second.
   * `gte(5)` compares numerically, so the string `"7"` would deny — and the
   * reviewer would have no way to see why.
   */
  it("reads an attribute value as JSON where it parses", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} />);
    chip("attributes", "clearance:7");
    run();

    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

  it("keeps a value that is not JSON as the string it was typed as", () => {
    render(<Simulator sightings={[sighting(hasAttribute("dept", gte(5)))]} />);
    chip("attributes", "dept:legal");
    run();

    // A string does not satisfy `gte`, which is the truthful answer rather than
    // a parse error the reviewer never asked about.
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");
  });
});

describe("the check card", () => {
  it("takes an action, and treats an emptied field as no action at all", () => {
    render(<Simulator sightings={[sighting(hasAction("publish"))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-action"), { target: { value: "publish" } });
    });
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-action"), { target: { value: "" } });
    });
    run();
    // Absent, not empty: `hasAction` fails with `MissingAction` when nothing was
    // supplied, which is an ERROR and never a denial (INV-QD-011, INV-QD-006).
    assert.isNotNull(screen.queryByTestId("qadi-simulator-error"));
    assert.include(screen.getByTestId("qadi-simulator-error").textContent ?? "", "MissingAction");
  });

  // E7.3
  it("reports malformed resource JSON inline and keeps running", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), { target: { value: "{oops" } });
    });

    assert.isNotNull(screen.queryByTestId("qadi-resource-error"));
    // The panel survives, and the run button still works.
    run();
    assert.isNotNull(screen.queryByTestId("qadi-simulator-result"));
  });

  it("refuses a JSON value that is not an object, because a resource is read by path", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), { target: { value: "7" } });
    });

    assert.strictEqual(
      screen.getByTestId("qadi-resource-error").textContent,
      "expected a JSON object",
    );
  });

  it("accepts a resource object", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(1)))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), {
        target: { value: '{"id":"doc-1"}' },
      });
    });

    assert.isNull(screen.queryByTestId("qadi-resource-error"));
  });
});

describe("the result", () => {
  // E7.4
  it("marks a result stale once the form has moved", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    run();
    assert.isNull(screen.queryByTestId("qadi-simulator-stale"));

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-subject-id"), { target: { value: "bob" } });
    });

    assert.isNotNull(screen.queryByTestId("qadi-simulator-stale"));
  });

  // E7.5
  it("shows an error panel and no requirement tree when the evaluation broke", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} ports={brokenPorts} />);

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    run();

    const result = screen.getByTestId("qadi-simulator-result");
    assert.isNotNull(within(result).queryByTestId("qadi-simulator-error"));
    assert.isEmpty(within(result).queryAllByTestId("qadi-node"));
    assert.include(result.textContent ?? "", "This is not a denial");
  });

  // E7.6
  it("lists duties and says no handler ran", () => {
    render(
      <Simulator sightings={[sighting(obliged(obligation("audit"), hasPermission(read)))]} />,
    );
    chip("permissions", "doc:read");
    run();

    const duties = screen.getByTestId("qadi-simulator-obligations");
    assert.include(duties.textContent ?? "", "audit");
    assert.include(duties.textContent ?? "", "binding");
    assert.include(duties.textContent ?? "", "runs no obligation handler");
  });

  // E7.7 — `undefined` is the top of the lattice, and rendering it as an empty
  // list would understate a full grant into a grant of nothing.
  it("renders absent visible fields as every field", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    chip("permissions", "doc:read");
    run();

    assert.isNotNull(screen.queryByTestId("qadi-fields-all"));
    assert.isNull(screen.queryByTestId("qadi-fields-none"));
  });

  it("renders a narrowed field set as the fields themselves", () => {
    render(<Simulator sightings={[sighting(hasPermission(read, { fields: ["title"] }))]} />);
    chip("permissions", "doc:read");
    run();

    assert.strictEqual(screen.getByTestId("qadi-fields-some").textContent, "title");
  });

  // E6.1 / E6.2 — labelled, never inferred from the number.
  it("says which clock measured the duration", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    run();
    assert.include(
      screen.getByTestId("qadi-simulator-duration").textContent ?? "",
      "in this browser",
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "deterministic clock" }));
    });
    run();
    assert.include(screen.getByTestId("qadi-simulator-duration").textContent ?? "", "not measured");
  });
});

describe("the source selector — T7.4", () => {
  it("offers Live disabled, with the reason, when the host passed no ports", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);

    const live = screen.getByTestId("qadi-source-Live");
    assert.isTrue(live.hasAttribute("disabled"));
    assert.include(live.getAttribute("title") ?? "", "did not pass a `ports` layer");
  });

  it("offers Snapshot disabled until a Live run has captured something", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} ports={brokenPorts} />);

    assert.isTrue(screen.getByTestId("qadi-source-Snapshot").hasAttribute("disabled"));

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    run();

    // A live run always captures, which is what makes Snapshot reachable at all
    // — and a captured *failure* replays as a failure, not as a miss.
    assert.isFalse(screen.getByTestId("qadi-source-Snapshot").hasAttribute("disabled"));
  });

  it("warns before a sweep that would perform I/O, not after", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} ports={brokenPorts} />);
    assert.include(screen.getByTestId("qadi-simulator-cost").textContent ?? "", "in this process");

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });

    assert.include(
      screen.getByTestId("qadi-simulator-cost").textContent ?? "",
      "against your live resolvers",
    );
  });

  it("counts the evaluations a sweep would run, before it runs one", () => {
    render(<Simulator sightings={[sighting(hasRole("editor"))]} />);
    chip("roles", "editor");

    // One baseline, one weakening. The remedy is skipped because the subject
    // already holds the role.
    assert.include(screen.getByTestId("qadi-simulator-cost").textContent ?? "", "2 evaluations");
  });
});

describe("the what-if table", () => {
  it("runs a sweep and names the node that flipped", () => {
    render(<Simulator sightings={[sighting(allOf([hasRole("a"), hasRole("b")]))]} />);
    chip("roles", "a");
    chip("roles", "b");
    run("qadi-simulator-sweep");

    const rows = screen.getAllByTestId("qadi-whatif-row");
    assert.strictEqual(rows.length, 3); // two drops plus their pair
    assert.isNotEmpty(screen.queryAllByTestId("qadi-whatif-flipped"));
  });

  /**
   * The case second-order sweeps exist for: neither grant is load-bearing on
   * its own, so only the pair turns the verdict.
   */
  it("shows a pair flipping what no single edit could", () => {
    render(<Simulator sightings={[sighting(anyOf([hasRole("a"), hasRole("b")]))]} />);
    chip("roles", "a");
    chip("roles", "b");
    run("qadi-simulator-sweep");

    const flipped = screen.getAllByTestId("qadi-whatif-row").filter(
      (row) => row.getAttribute("data-changed") === "true",
    );
    assert.isTrue(flipped.some((row) => (row.textContent ?? "").includes("without role a + without role b")));
  });

  it("filters to the rows that changed", () => {
    render(<Simulator sightings={[sighting(anyOf([hasRole("a"), hasRole("b")]))]} />);
    chip("roles", "a");
    chip("roles", "b");
    run("qadi-simulator-sweep");

    const all = screen.getAllByTestId("qadi-whatif-row").length;
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-whatif-only-changed"));
    });

    assert.isBelow(screen.getAllByTestId("qadi-whatif-row").length, all);
  });

  it("offers the remedy for a denial, marked as a strengthening", () => {
    render(<Simulator sightings={[sighting(hasRole("editor"))]} />);
    run("qadi-simulator-sweep");

    const row = screen
      .getAllByTestId("qadi-whatif-row")
      .find((one) => (one.textContent ?? "").includes("with role editor"));
    assert.isDefined(row);
    assert.include(row?.textContent ?? "", "+");
    assert.include(row?.textContent ?? "", "ALLOW");
  });

  it("names what no remedy could be built for", () => {
    // `hasRelationship` needs a resource id, and the check names no resource.
    render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    run("qadi-simulator-sweep");

    assert.isNull(screen.queryByTestId("qadi-whatif-skipped"));
  });
});

describe("seeding from a logged row — JOB 5 on screen", () => {
  const decided = entryOf(
    decisionRecord({ evaluationId: "ev-91", policy: hasPermission(read), action: "read" }),
  );

  it("fills the policy, the action and the fields it could not fill", () => {
    render(<Simulator sightings={[]} seed={decided} />);

    assert.strictEqual(screen.getByTestId("qadi-action").getAttribute("value"), "read");
    const unseeded = screen.getByTestId("qadi-unseeded");
    assert.include(unseeded.textContent ?? "", "roles");
    assert.include(unseeded.textContent ?? "", "relationships");
    assert.include(unseeded.textContent ?? "", "carries nothing else about them");
  });

  it("reports a reconstruction that reproduces the row", () => {
    render(<Simulator sightings={[]} seed={decided} />);
    chip("permissions", "doc:read");
    run();

    const baseline = screen.getByTestId("qadi-baseline");
    assert.include(baseline.textContent ?? "", "ev-91");
    assert.include(baseline.textContent ?? "", "reproduces the logged decision");
  });

  it("reports one that does not, and names the node", () => {
    render(<Simulator sightings={[]} seed={decided} />);
    run();

    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "differs");
    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "HasPermission");
  });

  it("shows no form at all for an orphan, which carries no policy", () => {
    render(<Simulator sightings={[]} seed={entryOf(obligationRecord({ evaluationId: "ev-9" }))} />);

    assert.isNotNull(screen.queryByTestId("qadi-simulator-empty"));
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
  it("unmounts cleanly while a result is on screen", () => {
    const view = render(<Simulator sightings={[sighting(hasPermission(read))]} />);
    run();
    assert.isNotNull(screen.queryByTestId("qadi-simulator-result"));

    act(() => {
      view.unmount();
    });

    assert.isNull(screen.queryByTestId("qadi-simulator-result"));
  });
});

describe("the fixtures card", () => {
  it("answers a relationship policy from an edge attributed to the subject", () => {
    render(<Simulator sightings={[sighting(hasRelationship("owner"))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), {
        target: { value: '{"id":"doc-1"}' },
      });
    });
    chip("relationships", "owner:doc-1");
    run();

    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

  it("answers a history policy from an event", () => {
    render(<Simulator sightings={[sighting(hasActed("raised"))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), {
        target: { value: '{"id":"doc-1"}' },
      });
    });
    chip("history", "raised:doc-1");
    run();

    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

  /**
   * A resolver attribute is consulted only on a subject miss, exactly as a real
   * one is — so the two editors are not interchangeable and the labels say so.
   */
  it("consults a resolver attribute when the subject has none", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} />);
    chip("resolver attributes", "clearance:9");
    run();

    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

  it("prefers the subject's own attribute over the resolver's", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} />);
    chip("attributes", "clearance:1");
    chip("resolver attributes", "clearance:9");
    run();

    // INV-QD-025: the subject wins, so the fixture is never reached.
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");
  });

  it("ignores a chip with no colon in it, rather than inventing half an edge", () => {
    render(<Simulator sightings={[sighting(hasRelationship("owner"))]} />);
    chip("relationships", "owner");

    assert.isNull(screen.queryByLabelText("Remove owner"));
  });

  it("removes a chip and a pair again", () => {
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} />);
    chip("attributes", "clearance:9");
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    act(() => {
      fireEvent.click(screen.getByLabelText("Remove clearance"));
    });
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");
  });

  it("refuses a duplicate chip and an empty one", () => {
    render(<Simulator sightings={[sighting(hasRole("a"))]} />);
    chip("roles", "a");
    chip("roles", "a");
    chip("roles", "  ");

    assert.strictEqual(screen.getAllByLabelText(/^Remove /).length, 1);
  });

  it("clears the resource when the field is emptied", () => {
    render(<Simulator sightings={[sighting(hasRelationship("owner"))]} />);

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), {
        target: { value: '{"id":"doc-1"}' },
      });
    });
    chip("relationships", "owner:doc-1");
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-resource"), { target: { value: "" } });
    });
    run();
    // No resource means no resource id to ask about, which `hasRelationship`
    // reports as an error rather than a denial.
    assert.isNotNull(screen.queryByTestId("qadi-simulator-error"));
  });
});

describe("choosing a policy", () => {
  it("runs whichever one the rail names", () => {
    render(
      <Simulator sightings={[sighting(hasRole("a")), sighting(hasPermission(read))]} />,
    );
    chip("permissions", "doc:read");
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "DENY");

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-simulator-policy"), { target: { value: "1" } });
    });
    run();
    assert.include(screen.getByTestId("qadi-simulator-result").textContent ?? "", "ALLOW");
  });

  it("leaves a replayed row behind when another policy is chosen", () => {
    const decided = entryOf(decisionRecord({ evaluationId: "ev-91", policy: hasPermission(read) }));
    render(<Simulator sightings={[sighting(hasRole("a"))]} seed={decided} />);
    assert.isNotNull(screen.queryByTestId("qadi-unseeded"));

    act(() => {
      fireEvent.change(screen.getByTestId("qadi-simulator-policy"), { target: { value: "0" } });
    });

    assert.isNull(screen.queryByTestId("qadi-unseeded"));
  });

  it("toggles the pair sweep, which changes what a sweep would cost", () => {
    render(<Simulator sightings={[sighting(hasRole("a"))]} />);
    chip("roles", "a");
    chip("roles", "b");
    const before = screen.getByTestId("qadi-simulator-cost").textContent;

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-simulator-pairs"));
    });

    assert.notStrictEqual(screen.getByTestId("qadi-simulator-cost").textContent, before);
  });
});

describe("the baseline card, in each of its states", () => {
  const seedOf = (policy: Policy, options?: { readonly failed?: boolean }) =>
    entryOf(
      options?.failed === true
        ? failedRecord({ evaluationId: "ev-7" })
        : decisionRecord({ evaluationId: "ev-91", policy }),
    );

  it("caveats a row whose evaluation failed, and claims no match", () => {
    render(<Simulator sightings={[sighting(hasPermission(read))]} seed={seedOf(hasPermission(read), { failed: true })} />);
    run();

    assert.include(
      screen.getByTestId("qadi-baseline-caveat").textContent ?? "",
      "produced no trace to compare against",
    );
    assert.include(
      screen.getByTestId("qadi-baseline-state").textContent ?? "",
      "decided where the logged one failed",
    );
  });

  it("reports a reconstruction that broke where the logged row decided", () => {
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
    run();

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
  it("reports the same failure twice without calling it a match", () => {
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
    run();

    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "the same failure");
    assert.include(screen.getByTestId("qadi-baseline-state").textContent ?? "", "MissingAction");
    assert.isNotNull(screen.queryByTestId("qadi-baseline-caveat"));
  });

  it("says a comparison is unavailable for a row that carries no decision", () => {
    render(
      <Simulator
        sightings={[sighting(hasPermission(read))]}
        seed={entryOf(obligationRecord({ evaluationId: "ev-9" }))}
      />,
    );
    run();

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
  it("is reported rather than swallowed", () => {
    const dying = Layer.mergeAll(
      Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))),
      RelationshipResolverNever,
      DecisionHistoryUnknown,
    );
    render(<Simulator sightings={[sighting(hasAttribute("clearance", gte(5)))]} ports={dying} />);

    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    run();

    assert.include(
      screen.getByTestId("qadi-simulator-broke").textContent ?? "",
      "the layer exploded",
    );
  });
});
