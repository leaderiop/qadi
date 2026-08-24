/**
 * JOB 6, 7 and 8 ledgers — E6.1 … E6.7, E7.1 … E7.6, E8.1 … E8.6.
 *
 * These tests are about the **rendering** and nothing else. Ordering, pairing,
 * verdict classification and the policy/trace zip are all properties of the
 * model and are proved in `test/model/` without a DOM; re-proving them through
 * a component would only make the test slower and vaguer (AGENTS.md §13).
 *
 * What is left, and what is here: that the three verdict classes are visually
 * distinct, that an absent column renders blank rather than "undefined", that a
 * short-circuited node says "never resolved", that a failed row gets an error
 * panel and not an empty tree, and that "no cache" is worded differently from
 * "miss".
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  allOf,
  AttributeResolverNone,
  currentSubjectLayer,
  Decided,
  DecisionHistoryUnknown,
  evaluate,
  EvaluationIdLive,
  Failed,
  fromRoles,
  hasPermission,
  MissingResource,
  obligation,
  obliged,
  permission,
  RelationshipResolverNever,
  role,
} from "@qadi/core";
import type { Decision, Policy, StoredRecord } from "@qadi/core";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import { sourceFromRecords } from "../../src/model/Source.ts";
import { decisionRecord, obligationRecord } from "../helpers.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const read = permission("doc", "read");
const write = permission("doc", "write");
const reader = role({ name: "reader", permissions: [read] });
const alice = fromRoles({ id: "alice", roles: [reader] });

const services = Layer.mergeAll(
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
);

const decide = (policy: Policy): Promise<Decision> =>
  Effect.runPromise(
    evaluate(policy).pipe(
      Effect.provide(currentSubjectLayer(alice)),
      Effect.provide(services),
    ),
  );

/** Mounts the dock over a fixed set of records and waits for the first paint. */
const mount = async (records: ReadonlyArray<StoredRecord>) => {
  const view = render(<DevtoolsDock source={sourceFromRecords(records)} />);
  // The backlog is read on an Effect fiber, so the rows arrive a tick later.
  if (records.length > 0) await screen.findAllByTestId("qadi-log-row");
  else await act(async () => {});
  return view;
};

const rows = () => screen.queryAllByTestId("qadi-log-row");

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

describe("the dock", () => {
  // E6.1
  it("mounted with no source renders an empty dock rather than throwing", async () => {
    render(<DevtoolsDock />);
    await act(async () => {});

    assert.isNotNull(screen.getByTestId("qadi-devtools"));
    assert.isNotNull(screen.getByTestId("qadi-log-empty"));
  });

  it("reports counts of the whole timeline", async () => {
    await mount([
      decisionRecord({ evaluationId: "a", at: 100 }),
      decisionRecord({
        evaluationId: "e",
        at: 200,
        outcome: new Failed({ error: new MissingResource({ attribute: "doc.owner" }) }),
      }),
      obligationRecord({ evaluationId: "ghost", at: 300 }),
    ]);

    const counts = screen.getByTestId("qadi-counts").textContent ?? "";
    assert.include(counts, "2 decisions");
    assert.include(counts, "1 errors");
    assert.include(counts, "1 unattached");
  });

  // E5.1 through the UI: the header must not follow the filter.
  it("the counts do not narrow when the filter does", async () => {
    await mount([
      decisionRecord({ evaluationId: "a", at: 100 }),
      decisionRecord({
        evaluationId: "e",
        at: 200,
        outcome: new Failed({ error: new MissingResource({ attribute: "doc.owner" }) }),
      }),
    ]);

    await click(screen.getByRole("button", { name: "Allow" }));

    assert.strictEqual(rows().length, 1);
    // A header reading "0 errors" because someone clicked a chip hides the one
    // thing they most need to see.
    assert.include(screen.getByTestId("qadi-counts").textContent ?? "", "1 errors");
  });

  it("offers exactly the environments present, not a fixed pair", async () => {
    await mount([
      decisionRecord({ evaluationId: "a", at: 100, environment: "eu-west" }),
      decisionRecord({ evaluationId: "b", at: 200, environment: "us-east" }),
    ]);

    assert.isNotNull(screen.getByRole("button", { name: "eu-west" }));
    assert.isNotNull(screen.getByRole("button", { name: "us-east" }));
    assert.isNull(screen.queryByRole("button", { name: "Client" }));
  });

  // E6.2
  it("pauses and resumes", async () => {
    await mount([decisionRecord({ evaluationId: "a", at: 100 })]);

    const toggle = screen.getByRole("button", { name: "live" });
    await click(toggle);
    assert.isNotNull(screen.getByRole("button", { name: "paused" }));

    await click(screen.getByRole("button", { name: "paused" }));
    assert.isNotNull(screen.getByRole("button", { name: "live" }));
  });

  // E6.3
  it("clearing empties the view", async () => {
    await mount([decisionRecord({ evaluationId: "a", at: 100 })]);
    assert.strictEqual(rows().length, 1);

    await click(screen.getByRole("button", { name: "clear view" }));
    assert.isNotNull(screen.getByTestId("qadi-log-empty"));
  });

  // E6.7 — stated as a test so it cannot quietly stop being true.
  it("renders only where the host puts it, and nothing on import", () => {
    // Importing the module has already happened by now. If anything in this
    // package self-mounted, the body would not be empty before `render`.
    assert.strictEqual(document.body.innerHTML, "");
  });

  // E6.5 — two open panels must not steal records from one another. The feed
  // guarantees it per subscriber; this checks the dock does not undo it.
  it("two docks mounted at once each render their own timeline", async () => {
    render(
      <>
        <DevtoolsDock source={sourceFromRecords([decisionRecord({ evaluationId: "a", at: 100 })])} />
        <DevtoolsDock
          source={sourceFromRecords([
            decisionRecord({ evaluationId: "b", at: 100 }),
            decisionRecord({ evaluationId: "c", at: 200 }),
          ])}
        />
      </>,
    );
    await screen.findAllByTestId("qadi-log-row");

    const docks = screen.getAllByTestId("qadi-devtools");
    assert.strictEqual(docks.length, 2);
    assert.strictEqual(within(docks[0] ?? fail()).getAllByTestId("qadi-log-row").length, 1);
    assert.strictEqual(within(docks[1] ?? fail()).getAllByTestId("qadi-log-row").length, 2);
  });

  /**
   * E6.6 — the dock carries its own appearance.
   *
   * A host page's stylesheet inherits into anything that does not set its own
   * font, colour and background, and an overlay that picked those up would be
   * unreadable on half the applications it is mounted in. There is no
   * stylesheet to fall back on, so every one of them is set inline.
   */
  it("carries its own typography and colours rather than inheriting the host's", async () => {
    await mount([decisionRecord({ evaluationId: "a", at: 100 })]);
    const style = screen.getByTestId("qadi-devtools").getAttribute("style") ?? "";

    for (const property of ["font-family", "font-size", "color", "background"]) {
      assert.include(style, property, `the dock sets ${property} itself`);
    }
  });
});

describe("screen 1 — the decision log", () => {
  it("shows one row per record, with the environment as a badge", async () => {
    await mount([
      decisionRecord({ evaluationId: "a", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "b", at: 200, environment: "Client" }),
    ]);

    assert.deepStrictEqual(
      rows().map((row) => row.getAttribute("data-evaluation")),
      ["a", "b"],
    );
    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-log").length,
      1,
    );
  });

  // E7.1 and the vocabulary rule, seen in the DOM.
  it("renders three distinct verdict classes", async () => {
    const allowed = await decide(hasPermission(read));
    const denied = await decide(hasPermission(write));

    await mount([
      decisionRecord({ evaluationId: "a", at: 100, outcome: new Decided({ decision: allowed }) }),
      decisionRecord({ evaluationId: "d", at: 200, outcome: new Decided({ decision: denied }) }),
      decisionRecord({
        evaluationId: "e",
        at: 300,
        outcome: new Failed({ error: new MissingResource({ attribute: "doc.owner" }) }),
      }),
    ]);

    const verdicts = rows().map(
      (row) => within(row).getByText(/ALLOW|DENY|ERROR/).getAttribute("data-verdict"),
    );
    assert.deepStrictEqual(verdicts, ["Allow", "Deny", "Error"]);
  });

  // E7.1's second half.
  it("a failed row invents no duration", async () => {
    await mount([
      decisionRecord({
        evaluationId: "e",
        at: 100,
        outcome: new Failed({ error: new MissingResource({ attribute: "doc.owner" }) }),
      }),
    ]);

    const cells = within(rows()[0] ?? fail()).getAllByRole("cell");
    // A zero would read as "instantaneous" rather than as "never finished".
    assert.strictEqual(cells[5]?.textContent, "");
  });

  // E7.2 — the failure mode is a reader believing a field held the string.
  it("an absent action or resource renders blank, never 'undefined'", async () => {
    await mount([decisionRecord({ evaluationId: "a", at: 100 })]);

    const row = rows()[0] ?? fail();
    assert.notInclude(row.textContent ?? "", "undefined");
    const cells = within(row).getAllByRole("cell");
    assert.strictEqual(cells[2]?.textContent, "");
    assert.strictEqual(cells[3]?.textContent, "");
  });

  it("shows the action and the resource when there are any", async () => {
    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        action: "publish",
        resource: { id: "invoice-42" },
      }),
    ]);

    const cells = within(rows()[0] ?? fail()).getAllByRole("cell");
    assert.strictEqual(cells[2]?.textContent, "publish");
    assert.strictEqual(cells[3]?.textContent, "invoice-42");
  });

  // E7.4 — nothing branches on `environment`, so an unfamiliar one is fine.
  it("an unfamiliar environment renders as itself", async () => {
    await mount([decisionRecord({ evaluationId: "a", at: 100, environment: "lambda-eu-3" })]);

    assert.isNotNull(within(rows()[0] ?? fail()).getByText("lambda-eu-3"));
  });

  // E7.5 — either direction.
  it("the pair badge moves to the partner, from either end", async () => {
    await mount([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
    ]);

    const badges = screen.getAllByTestId("qadi-pair");
    assert.strictEqual(badges.length, 2);

    // From the origin, to the continuation.
    await click(badges[0] ?? fail());
    assert.include(screen.getByTestId("qadi-inspector").textContent ?? "", "Client");

    // Back to the log, and from the continuation to the origin.
    await click(screen.getByRole("button", { name: "Log" }));
    await click(screen.getAllByTestId("qadi-pair")[1] ?? fail());
    assert.include(screen.getByTestId("qadi-inspector").textContent ?? "", "Server");
  });

  /**
   * A pair whose halves disagree is the single most interesting thing this tool
   * can show — a server allow that no longer holds client-side — so it is
   * marked differently from an agreeing pair rather than merely linked.
   */
  it("a disagreeing pair is marked on both rows", async () => {
    const allowed = await decide(hasPermission(read));
    const denied = await decide(hasPermission(write));

    await mount([
      decisionRecord({
        evaluationId: "ev-7",
        at: 100,
        environment: "Server",
        outcome: new Decided({ decision: allowed }),
      }),
      decisionRecord({
        evaluationId: "ev-7",
        at: 200,
        environment: "Client",
        outcome: new Decided({ decision: denied }),
      }),
    ]);

    const badges = screen.getAllByTestId("qadi-pair");
    assert.deepStrictEqual(
      badges.map((badge) => badge.textContent),
      ["⇅ differs", "⇅ differs"],
    );
  });

  it("an agreeing pair reads as one story with a direction", async () => {
    await mount([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
    ]);

    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-pair").map((badge) => badge.textContent),
      ["⇅ continued", "⇅ continues"],
    );
  });

  it("a resource with no id falls back to naming its keys", async () => {
    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        resource: { tenantId: "acme", stage: "draft" },
      }),
    ]);

    const cells = within(rows()[0] ?? fail()).getAllByRole("cell");
    // Better than blank: it at least says what the resource *was*.
    assert.strictEqual(cells[3]?.textContent, "tenantId, stage");
  });

  it("an orphan row has no subject, resource or duration to show", async () => {
    await mount([obligationRecord({ evaluationId: "ghost", at: 100 })]);

    const cells = within(rows()[0] ?? fail()).getAllByRole("cell");
    assert.strictEqual(cells[1]?.textContent, "");
    assert.strictEqual(cells[3]?.textContent, "");
    assert.strictEqual(cells[5]?.textContent, "");
  });

  it("free text narrows the table", async () => {
    await mount([
      decisionRecord({ evaluationId: "alpha", at: 100 }),
      decisionRecord({ evaluationId: "beta", at: 200 }),
    ]);

    // `fireEvent.change` rather than setting `.value` and dispatching by hand:
    // React tracks the previous value on the node and ignores an event whose
    // value it believes it already saw.
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Filter decisions"), {
        target: { value: "alpha" },
      });
    });

    assert.deepStrictEqual(
      rows().map((row) => row.getAttribute("data-evaluation")),
      ["alpha"],
    );
  });

  it("an environment chip narrows, and the reset chip widens again", async () => {
    await mount([
      decisionRecord({ evaluationId: "s", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "c", at: 200, environment: "Client" }),
    ]);

    await click(screen.getByRole("button", { name: "Client" }));
    assert.deepStrictEqual(
      rows().map((row) => row.getAttribute("data-evaluation")),
      ["c"],
    );

    await click(screen.getByRole("button", { name: "All" }));
    assert.strictEqual(rows().length, 2);
  });

  it("an unpaired row shows no badge at all", async () => {
    await mount([decisionRecord({ evaluationId: "solo", at: 100 })]);
    assert.deepStrictEqual(screen.queryAllByTestId("qadi-pair"), []);
  });

  /**
   * E7.3 — a subject id or a resource path can be arbitrarily long, and one
   * long cell must not widen the table past the viewport and push the verdict
   * column off the side of the dock.
   */
  it("contains a long value instead of letting it widen the table", async () => {
    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        resource: { id: "urn:acme:tenant:0123456789:invoice:9876543210:revision:42" },
      }),
    ]);

    const cells = within(rows()[0] ?? fail()).getAllByRole("cell");
    const style = cells[3]?.getAttribute("style") ?? "";
    assert.include(style, "text-overflow: ellipsis");
    assert.include(style, "max-width");
  });

  // E7.6 — bounded by the timeline, so the DOM is bounded too.
  it("renders no more rows than the capacity allows", async () => {
    const records = Array.from({ length: 20 }, (_, index) =>
      decisionRecord({ evaluationId: `ev-${index}`, at: 100 + index }),
    );
    render(<DevtoolsDock source={sourceFromRecords(records)} capacity={5} />);
    await screen.findAllByTestId("qadi-log-row");

    assert.strictEqual(rows().length, 5);
  });
});

describe("screen 2 — the inspector", () => {
  // E8.1
  it("with nothing selected it invites a selection", async () => {
    await mount([decisionRecord({ evaluationId: "a", at: 100 })]);
    await click(screen.getByRole("button", { name: "Inspector" }));

    assert.isNotNull(screen.getByTestId("qadi-inspector-empty"));
  });

  it("a row click opens it on that evaluation", async () => {
    await mount([decisionRecord({ evaluationId: "chosen", at: 100 })]);
    await click(rows()[0] ?? fail());

    assert.strictEqual(screen.getByTestId("qadi-inspector-id").textContent, "chosen");
  });

  it("renders the explanation tree, marked node by node", async () => {
    const policy = allOf([hasPermission(write), hasPermission(read)]);
    const decision = await decide(policy);

    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        policy,
        outcome: new Decided({ decision }),
      }),
    ]);
    await click(rows()[0] ?? fail());

    const nodes = screen.getAllByTestId("qadi-node");
    assert.deepStrictEqual(
      nodes.map((node) => node.getAttribute("data-status")),
      // The root, the child that denied, and the child never reached.
      ["Denied", "Denied", "NeverResolved"],
    );
  });

  /**
   * The load-bearing rendering rule.
   *
   * A branch the evaluator never reached must say so in words. Rendering it as
   * a cross would tell a reviewer their policy rejected something it never
   * examined — the display half of INV-QD-005.
   */
  it("a short-circuited node says 'never resolved' rather than showing a cross", async () => {
    const policy = allOf([hasPermission(write), hasPermission(read)]);
    const decision = await decide(policy);

    await mount([
      decisionRecord({ evaluationId: "a", at: 100, policy, outcome: new Decided({ decision }) }),
    ]);
    await click(rows()[0] ?? fail());

    const skipped = screen.getAllByTestId("qadi-node").filter(
      (node) => node.getAttribute("data-status") === "NeverResolved",
    );
    assert.strictEqual(skipped.length, 1);
    assert.isNotNull(screen.getByTestId("qadi-never-resolved"));
  });

  // E8.5, and the inversion it guards against.
  it("a failed row gets an error panel and no explanation tree", async () => {
    await mount([
      decisionRecord({
        evaluationId: "e",
        at: 100,
        outcome: new Failed({ error: new MissingResource({ attribute: "doc.owner" }) }),
      }),
    ]);
    await click(rows()[0] ?? fail());

    assert.strictEqual(screen.getByTestId("qadi-failure-tag").textContent, "MissingResource");
    assert.include(screen.getByTestId("qadi-failure").textContent ?? "", "not a denial");
    // An empty requirement tree reads as "no requirements", which reads as
    // "allowed".
    assert.isNull(screen.queryByTestId("qadi-explanation"));
  });

  // E4.5 in the DOM: the direction of this error matters.
  it("undefined visible fields render as 'every field', not as none", async () => {
    const decision = await decide(hasPermission(read));

    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        policy: hasPermission(read),
        outcome: new Decided({ decision }),
      }),
    ]);
    await click(rows()[0] ?? fail());

    assert.isNotNull(screen.getByTestId("qadi-fields-all"));
    assert.isNull(screen.queryByTestId("qadi-fields-none"));
  });

  it("a narrowed grant lists what stayed visible", async () => {
    const policy = hasPermission(read, { fields: ["id", "title"] });
    const decision = await decide(policy);

    await mount([
      decisionRecord({ evaluationId: "a", at: 100, policy, outcome: new Decided({ decision }) }),
    ]);
    await click(rows()[0] ?? fail());

    assert.strictEqual(screen.getByTestId("qadi-fields-some").textContent, "id, title");
  });

  it("a denial has no field panel: it grants nothing to narrow", async () => {
    const decision = await decide(hasPermission(write));

    await mount([
      decisionRecord({
        evaluationId: "d",
        at: 100,
        policy: hasPermission(write),
        outcome: new Decided({ decision }),
      }),
    ]);
    await click(rows()[0] ?? fail());

    assert.isNull(screen.queryByTestId("qadi-fields"));
  });

  // E8.2 and E8.6.
  it("lists duties, marks advisory from binding, and names the state as unobservable", async () => {
    const policy = obliged(
      obligation("audit"),
      obliged(obligation("notify", {}, { advisory: true }), hasPermission(read)),
    );
    const decision = await decide(policy);

    await mount([
      decisionRecord({ evaluationId: "a", at: 100, policy, outcome: new Decided({ decision }) }),
    ]);
    await click(rows()[0] ?? fail());

    const duties = screen.getByTestId("qadi-obligations").textContent ?? "";
    assert.include(duties, "audit");
    assert.include(duties, "binding");
    assert.include(duties, "notify");
    assert.include(duties, "advisory");
    // Per-duty state would be an invention: a handler receives the whole set
    // and reports once.
    assert.include(screen.getByTestId("qadi-obligation-state").textContent ?? "", "not yet");
  });

  // E8.4
  it("shows the gate outcome once it has arrived", async () => {
    const policy = obliged(obligation("audit"), hasPermission(read));
    const decision = await decide(policy);

    await mount([
      decisionRecord({ evaluationId: "ev-7", at: 100, policy, outcome: new Decided({ decision }) }),
      obligationRecord({ evaluationId: "ev-7", at: 101, outcome: "Refused" }),
    ]);
    await click(rows()[0] ?? fail());

    const state = screen.getByTestId("qadi-obligation-state").textContent ?? "";
    assert.include(state, "Refused");
    assert.include(state, "not observable");
  });

  // E8.3 — two different facts, two different sentences.
  it("no cache consulted is worded differently from a miss", async () => {
    await mount([
      decisionRecord({ evaluationId: "none", at: 100 }),
      decisionRecord({ evaluationId: "missed", at: 200, cache: "miss" }),
      decisionRecord({ evaluationId: "hit", at: 300, cache: "hit" }),
    ]);

    const cacheTextFor = async (index: number) => {
      await click(screen.getByRole("button", { name: "Log" }));
      await click(rows()[index] ?? fail());
      return screen.getByTestId("qadi-cache-state").textContent ?? "";
    };

    // Absent means no cache was consulted at all; "miss" means one was asked
    // and did not have it. Collapsing them loses a real fact.
    assert.strictEqual(await cacheTextFor(0), "no cache was consulted");
    assert.include(await cacheTextFor(1), "miss");
    assert.include(await cacheTextFor(2), "hit");
  });

  /**
   * E4.8 in the DOM — a disclosure boundary, worded as one.
   *
   * The record's policy is an `AllOf` while its decision carries the trace of a
   * bare leaf, which is the shape a reduced dehydration produces: a root that
   * was resolved and no children at all. That is *not* short-circuiting — a
   * composite that short-circuits always evaluates its first child — so it must
   * not be worded as "never resolved".
   */
  it("a decision whose trace stops at the root says it was not disclosed", async () => {
    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        policy: allOf([hasPermission(read), hasPermission(write)]),
        outcome: new Decided({ decision: await decide(hasPermission(read)) }),
      }),
    ]);
    await click(rows()[0] ?? fail());

    assert.include(
      screen.getByTestId("qadi-trace-undisclosed").textContent ?? "",
      "not disclosed",
    );
  });

  it("a short-circuited tree is not reported as undisclosed", async () => {
    // The first child *was* evaluated, so the trace reached the reader — this
    // is the evaluator saving work, not a payload withholding evidence.
    const policy = allOf([hasPermission(write), hasPermission(read)]);
    await mount([
      decisionRecord({
        evaluationId: "a",
        at: 100,
        policy,
        outcome: new Decided({ decision: await decide(policy) }),
      }),
    ]);
    await click(rows()[0] ?? fail());

    assert.isNull(screen.queryByTestId("qadi-trace-undisclosed"));
    assert.isNotNull(screen.getByTestId("qadi-never-resolved"));
  });

  // E3.3 through the UI.
  it("an orphaned outcome explains why there is nothing to explain", async () => {
    await mount([obligationRecord({ evaluationId: "ghost", at: 100, outcome: "Refused" })]);
    await click(rows()[0] ?? fail());

    assert.include(screen.getByTestId("qadi-orphan").textContent ?? "", "never did");
  });

  /**
   * E5.7 — the partner of a filtered-out row stays reachable.
   *
   * The filter narrows the *table*; it does not narrow pairing, which is
   * computed over the whole timeline, and it does not narrow the selection. So
   * a reader filtered to one environment can still follow a pair badge into the
   * other one — which is the whole point of the badge.
   */
  it("a pair badge reaches a partner the filter has hidden", async () => {
    await mount([
      decisionRecord({ evaluationId: "ev-7", at: 100, environment: "Server" }),
      decisionRecord({ evaluationId: "ev-7", at: 200, environment: "Client" }),
    ]);

    await click(screen.getByRole("button", { name: "Server" }));
    assert.strictEqual(rows().length, 1);

    // The badge is still there, and still points at the hidden partner.
    await click(screen.getAllByTestId("qadi-pair")[0] ?? fail());
    assert.include(screen.getByTestId("qadi-inspector").textContent ?? "", "Client");
  });

  // E5.6
  it("a selection dropped by capacity says the buffer moved on", async () => {
    const first = decisionRecord({ evaluationId: "old", at: 100 });
    const view = render(
      <DevtoolsDock source={sourceFromRecords([first])} capacity={1} />,
    );
    await screen.findAllByTestId("qadi-log-row");
    await click(screen.getAllByTestId("qadi-log-row")[0] ?? fail());
    assert.strictEqual(screen.getByTestId("qadi-inspector-id").textContent, "old");

    view.rerender(
      <DevtoolsDock
        source={sourceFromRecords([first, decisionRecord({ evaluationId: "new", at: 900 })])}
        capacity={1}
      />,
    );
    await screen.findByTestId("qadi-inspector-evicted");

    // Not a silent return to the placeholder.
    assert.include(
      screen.getByTestId("qadi-inspector-evicted").textContent ?? "",
      "scrolled out of the log",
    );
  });
});

const fail = (): never => {
  throw new Error("expected an element");
};
