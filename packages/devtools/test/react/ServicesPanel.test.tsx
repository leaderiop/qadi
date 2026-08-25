/**
 * JOB 4 ledger, rendered half.
 *
 * The wording is the feature. "Unwired" is a category error for the five
 * services in `EvaluationServices` — a program that has not provided them does
 * not run — and a TTL control would imply a cache design the library does not
 * have. Both are asserted as *absences of words*, because that is what they are.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ServicesPanel } from "../../src/react/ServicesPanel.tsx";
import type { PortCall, PortCallLog } from "../../src/model/PortCalls.ts";
import type { PortActivity, WiringReport } from "../../src/model/Wiring.ts";

afterEach(() => {
  document.body.innerHTML = "";
});

const wiring: WiringReport = {
  ports: [
    {
      port: "AttributeResolver",
      name: "attributeResolverFromRecord",
      required: true,
      present: true,
      consequence: "a missing attribute resolves to undefined, so an attribute policy denies",
    },
    {
      port: "RelationshipResolver",
      name: undefined,
      required: true,
      present: true,
      consequence: "an unanswered relationship denies",
    },
    {
      port: "DecisionCache",
      name: undefined,
      required: false,
      present: false,
      consequence: "every evaluation is computed",
    },
  ],
  cache: { present: false, size: undefined },
};

const cardFor = (port: string) =>
  screen.getAllByTestId("qadi-port").find((card) => card.getAttribute("data-port") === port);

describe("the services panel", () => {
  // E4.1
  it("names a wired implementation", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    assert.strictEqual(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-port-state").textContent,
      "attributeResolverFromRecord",
    );
  });

  // E4.2 — the distinction the whole card exists for.
  it("an unnamed but present port says 'wired, unnamed', never 'unwired'", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    const card = cardFor("RelationshipResolver") ?? fail();

    assert.strictEqual(within(card).getByTestId("qadi-port-state").textContent, "wired, unnamed");
    assert.notInclude(card.textContent ?? "", "unwired");
  });

  // E4.3 — the word must not appear for a required port at all.
  it("never uses the word 'unwired' anywhere", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    assert.notInclude(screen.getByTestId("qadi-services").textContent ?? "", "unwired");
  });

  it("states what being defaulted costs", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    assert.include(
      cardFor("AttributeResolver")?.textContent ?? "",
      "an attribute policy denies",
    );
  });

  // E4.7 — the two facts that look like one.
  it("distinguishes a port never called from one that is absent", () => {
    const activity: ReadonlyArray<PortActivity> = [
      { port: "AttributeResolver", calls: 12, retries: 2 },
    ];
    render(<ServicesPanel wiring={wiring} activity={activity} />);

    assert.include(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-port-activity")
        .textContent ?? "",
      "12 calls · 2 retried",
    );
    // Wired, and nothing reached it — a different problem with the same symptom.
    assert.strictEqual(
      within(cardFor("RelationshipResolver") ?? fail()).getByTestId("qadi-port-activity")
        .textContent,
      "never called",
    );
  });

  it("does not mention retries when there were none", () => {
    render(
      <ServicesPanel wiring={wiring} activity={[{ port: "AttributeResolver", calls: 1, retries: 0 }]} />,
    );
    assert.strictEqual(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-port-activity").textContent,
      "1 call",
    );
  });

  it("says the counts are process-wide, not per decision", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    // A reader who attributed one of these numbers to one row would be wrong,
    // and nothing else on the screen would tell them.
    assert.include(
      screen.getByTestId("qadi-activity-scope").textContent ?? "",
      "process-wide aggregates",
    );
  });

  // E4.6
  it("with no layer handed to it, still renders the metrics and says why the rest is missing", () => {
    render(<ServicesPanel wiring={undefined} activity={[]} />);

    assert.include(screen.getByTestId("qadi-wiring-absent").textContent ?? "", "wiring");
    assert.deepStrictEqual(screen.queryAllByTestId("qadi-port"), []);
    // Not an error state: the aggregate note needs no wiring at all.
    assert.isNotNull(screen.getByTestId("qadi-activity-scope"));
  });

  // E4.4 and E4.9
  it("an absent cache says absent", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    assert.strictEqual(screen.getByTestId("qadi-cache-size").textContent, "absent");
  });

  it("a wired cache reports its completed entries", () => {
    render(
      <ServicesPanel
        wiring={{ ...wiring, cache: { present: true, size: 7 } }}
        activity={[]}
      />,
    );
    assert.strictEqual(screen.getByTestId("qadi-cache-size").textContent, "7 completed entries");
  });

  // E4.10 — two different buttons for two different things.
  it("says a cache flush is not the same as clearing the log", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    assert.include(
      screen.getByTestId("qadi-cache-card").textContent ?? "",
      "differs from clearing",
    );
  });

  // E4.11 — the bound is capacity, evicted by insertion order.
  it("offers no TTL, and says the bound is capacity", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);
    const card = screen.getByTestId("qadi-cache-card").textContent ?? "";

    assert.include(card.replace(/\s+/g, " "), "there is no time-to-live");
    assert.include(card, "Bounded by capacity");
  });
});

const fail = (): never => {
  throw new Error("expected an element");
};

/**
 * JOB 3's ledger — the calls beneath each card.
 *
 * These rows are the point of the whole increment: a count says a store was
 * asked, and a row says what it was asked and what it said. The panel's job is
 * to keep the blanks legible — a field a span did not record must read as *not
 * recorded*, because a reader chasing a wiring problem needs to tell "it said
 * nothing" from "nobody asked".
 */
describe("recent port calls", () => {
  const logOf = (calls: ReadonlyArray<PortCall>): PortCallLog => ({
    calls,
    dropped: 0,
    capacity: 200,
  });

  const attributeCall = (over?: Partial<Extract<PortCall, { _tag: "AttributeResolver" }>>) => ({
    _tag: "AttributeResolver" as const,
    span: "qadi.attribute",
    at: 1_000,
    durationMillis: 1.25,
    subjectId: "alice",
    attribute: "clearance",
    resolved: true,
    ...over,
  });

  // E3.1 — a card with no list looks exactly like a port nothing asked.
  it("says what the detail would take when no collector is wired", () => {
    render(<ServicesPanel wiring={wiring} activity={[]} />);

    assert.include(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-calls-uncollected")
        .textContent ?? "",
      "collectPortCalls",
    );
    assert.isEmpty(screen.queryAllByTestId("qadi-port-call"));
  });

  it("puts each call under the port that made it", () => {
    render(
      <ServicesPanel
        wiring={wiring}
        activity={[]}
        portCalls={logOf([
          attributeCall(),
          {
            _tag: "RelationshipResolver",
            span: "qadi.hasRelationship",
            at: 1_001,
            durationMillis: 0.5,
            subjectId: "alice",
            relation: "owner",
            resourceId: "doc-1",
            depth: undefined,
            answer: "Related",
          },
        ])}
      />,
    );

    const attributes = within(cardFor("AttributeResolver") ?? fail());
    assert.strictEqual(attributes.getAllByTestId("qadi-port-call").length, 1);
    assert.include(attributes.getByTestId("qadi-port-call").textContent ?? "", "clearance");

    const relationships = within(cardFor("RelationshipResolver") ?? fail());
    assert.include(relationships.getByTestId("qadi-port-call").textContent ?? "", "owner on doc-1");
    assert.include(relationships.getByTestId("qadi-port-call").textContent ?? "", "Related");
  });

  it("says whether a value came back, and never what it was", () => {
    render(
      <ServicesPanel
        wiring={wiring}
        activity={[]}
        portCalls={logOf([
          attributeCall({ attribute: "a", resolved: true }),
          attributeCall({ attribute: "b", resolved: false }),
          attributeCall({ attribute: "c", resolved: undefined }),
        ])}
      />,
    );

    const rows = within(cardFor("AttributeResolver") ?? fail())
      .getAllByTestId("qadi-port-call")
      .map((row) => row.textContent ?? "");

    // Newest first.
    assert.include(rows[0] ?? "", "c → no answer");
    assert.include(rows[1] ?? "", "b → nothing");
    assert.include(rows[2] ?? "", "a → a value");
  });

  it("reads an unrecorded field as not recorded, rather than blank", () => {
    render(
      <ServicesPanel
        wiring={wiring}
        activity={[]}
        portCalls={logOf([attributeCall({ attribute: undefined })])}
      />,
    );

    assert.include(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-port-call").textContent ?? "",
      "not recorded",
    );
  });

  // E2.4's rendered half: never a zero, which is a call that finished instantly.
  it("marks a call still in flight rather than timing it at zero", () => {
    render(
      <ServicesPanel
        wiring={wiring}
        activity={[]}
        portCalls={logOf([attributeCall({ durationMillis: undefined })])}
      />,
    );

    assert.strictEqual(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-port-call-duration")
        .textContent,
      "in flight",
    );
  });

  it("shows a handful and says how many it did not", () => {
    render(
      <ServicesPanel
        wiring={wiring}
        activity={[]}
        portCalls={logOf(
          Array.from({ length: 8 }, (_, index) => attributeCall({ attribute: `a${index}` })),
        )}
      />,
    );

    const card = within(cardFor("AttributeResolver") ?? fail());
    assert.strictEqual(card.getAllByTestId("qadi-port-call").length, 5);
    assert.include(card.getByTestId("qadi-port-calls-more").textContent ?? "", "3 earlier");
  });

  it("adds nothing to a port that was never called", () => {
    render(
      <ServicesPanel wiring={wiring} activity={[]} portCalls={logOf([attributeCall()])} />,
    );

    assert.isEmpty(
      within(cardFor("RelationshipResolver") ?? fail()).queryAllByTestId("qadi-port-call"),
    );
  });

  // E3.2 / E3.4 — the counts and the calls are differently scoped, and the
  // footer now says which is which rather than describing only the first.
  it("keeps the counts and the calls apart in words", () => {
    const activity: ReadonlyArray<PortActivity> = [
      { port: "AttributeResolver", calls: 91, retries: 0 },
    ];
    render(
      <ServicesPanel wiring={wiring} activity={activity} portCalls={logOf([attributeCall()])} />,
    );

    const card = within(cardFor("AttributeResolver") ?? fail());
    assert.include(card.getByTestId("qadi-port-activity").textContent ?? "", "91 calls");
    assert.strictEqual(card.getAllByTestId("qadi-port-call").length, 1);

    const footer = screen.getByTestId("qadi-activity-scope").textContent ?? "";
    assert.include(footer, "process-wide aggregates");
    assert.include(footer, "read from spans");
  });
});
