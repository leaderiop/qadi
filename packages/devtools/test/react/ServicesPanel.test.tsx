/**
 * The Services panel's markup: what each view of the services store renders.
 *
 * The words are `PortCards.test.ts`'s: which state a port reads, what its activity says, what
 * being defaulted costs and how a call row is worded are decided in the model, and every case
 * that pinned one moved there with its title (ARCH-102). This file pins what the panel does with
 * a view it is handed: the tag each view renders, the warning colour, the attribute a card
 * carries, the notes, the overflow row and the order of a card's parts. The views are written out
 * through `servicesInput.ts` and never joined, so a defect in the join is not input here.
 */
import { assert, describe, it } from "@effect/vitest";
import { render, screen, within } from "@testing-library/react";
import { CallsView, ServicesView } from "../../src/model/PortCards.ts";
import type { CallRow } from "../../src/model/PortCards.ts";
import { ServicesPanel } from "../../src/react/ServicesPanel.tsx";
import { liveNotice } from "../helpers.ts";
import { cardRow, servicesInput } from "./servicesInput.ts";

const ATTRIBUTE_CONSEQUENCE =
  "a missing attribute resolves to undefined, so an attribute policy denies";

const fail = (): never => {
  throw new Error("expected an element");
};

const cardFor = (port: string) =>
  screen.getAllByTestId("qadi-port").find((card) => card.getAttribute("data-port") === port);

const callOf = (text: string, interpreter?: string): CallRow => ({
  key: text,
  text,
  interpreter,
  duration: "1.0 ms",
});

describe("the services panel", () => {
  it("renders each services view: nothing while withheld, the absent note, the failure in the warning colour, and a card per row", () => {
    const withheld = render(
      <ServicesPanel {...servicesInput(ServicesView.Withheld())} diagnostics={liveNotice} />,
    );
    assert.isNotNull(screen.getByTestId("qadi-services"));
    assert.isEmpty(screen.queryAllByTestId("qadi-wiring-absent"));
    assert.isEmpty(screen.queryAllByTestId("qadi-wiring-failed"));
    assert.isEmpty(screen.queryAllByTestId("qadi-port"));
    assert.isEmpty(screen.queryAllByTestId("qadi-cache-card"));
    withheld.unmount();

    const absent = render(
      <ServicesPanel {...servicesInput(ServicesView.NotHanded())} diagnostics={liveNotice} />,
    );
    assert.isNotNull(screen.getByTestId("qadi-wiring-absent"));
    assert.isEmpty(screen.queryAllByTestId("qadi-port"));
    absent.unmount();

    const failed = render(
      <ServicesPanel
        {...servicesInput(ServicesView.Failed({ reason: "the layer blew up" }))}
        diagnostics={liveNotice}
      />,
    );
    const note = screen.getByTestId("qadi-wiring-failed");
    assert.include(note.textContent ?? "", "the layer blew up");
    assert.notStrictEqual(note.style.color, "");
    assert.isEmpty(screen.queryAllByTestId("qadi-port"));
    failed.unmount();

    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [cardRow("AttributeResolver"), cardRow("RelationshipResolver")],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );
    assert.strictEqual(screen.getAllByTestId("qadi-port").length, 2);
    assert.strictEqual(screen.getAllByTestId("qadi-cache-card").length, 1);
  });

  // C7 — a fail-closed default must not read as just another implementation.
  it("a defaulted port says so, in the warning tone, with its cost", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [
              cardRow("AttributeResolver", {
                defaulted: "true",
                state: "defaulted — AttributeResolverNone",
                consequence: ATTRIBUTE_CONSEQUENCE,
                tone: "Warning",
              }),
              cardRow("RelationshipResolver", { consequence: "an unanswered relationship denies" }),
            ],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );
    const card = cardFor("AttributeResolver") ?? fail();

    assert.strictEqual(card.getAttribute("data-defaulted"), "true");
    assert.include(within(card).getByTestId("qadi-port-state").textContent ?? "", "defaulted");
    assert.include(within(card).getByTestId("qadi-port-state").textContent ?? "", "AttributeResolverNone");
    const consequence = within(card).getByTestId("qadi-port-consequence");
    assert.include(consequence.textContent ?? "", "an attribute policy denies");
    assert.notInclude(consequence.textContent ?? "", "if defaulted");
    // The warning is a colour of its own on the defaulted card: another card keeps the muted one.
    const plain = within(cardFor("RelationshipResolver") ?? fail()).getByTestId("qadi-port-consequence");
    assert.notStrictEqual(consequence.style.color, "");
    assert.notStrictEqual(consequence.style.color, plain.style.color);
  });

  it("says nothing about defaulting for a row that is not a port", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [cardRow("DecisionCache", { defaulted: undefined })],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );

    assert.isNull((cardFor("DecisionCache") ?? fail()).getAttribute("data-defaulted"));
  });

  it("says the counts are process-wide, not per decision", () => {
    render(
      <ServicesPanel
        {...servicesInput(ServicesView.Read({ rows: [], cache: "absent" }))}
        diagnostics={liveNotice}
      />,
    );
    // A reader who attributed one of these numbers to one row would be wrong,
    // and nothing else on the screen would tell them.
    assert.include(
      screen.getByTestId("qadi-activity-scope").textContent ?? "",
      "process-wide aggregates",
    );
  });

  // E4.6
  it("with no layer handed to it, still renders the metrics and says why the rest is missing", () => {
    render(<ServicesPanel {...servicesInput(ServicesView.NotHanded())} diagnostics={liveNotice} />);

    assert.include(screen.getByTestId("qadi-wiring-absent").textContent ?? "", "wiring");
    assert.deepStrictEqual(screen.queryAllByTestId("qadi-port"), []);
    // Not an error state: the aggregate note needs no wiring at all.
    assert.isNotNull(screen.getByTestId("qadi-activity-scope"));
  });

  // E4.10 — two different buttons for two different things.
  it("says a cache flush is not the same as clearing the log", () => {
    render(
      <ServicesPanel
        {...servicesInput(ServicesView.Read({ rows: [], cache: "absent" }))}
        diagnostics={liveNotice}
      />,
    );
    assert.include(
      screen.getByTestId("qadi-cache-card").textContent ?? "",
      "differs from clearing",
    );
  });

  // E4.11 — the bound is capacity, evicted by insertion order.
  it("offers no TTL, and says the bound is capacity", () => {
    render(
      <ServicesPanel
        {...servicesInput(ServicesView.Read({ rows: [], cache: "absent" }))}
        diagnostics={liveNotice}
      />,
    );
    const card = screen.getByTestId("qadi-cache-card").textContent ?? "";

    assert.include(card.replace(/\s+/g, " "), "there is no time-to-live");
    assert.include(card, "Bounded by capacity");
  });

  // E3.1 — a card with no list looks exactly like a port nothing asked.
  it("says what the detail would take when no collector is wired", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [cardRow("AttributeResolver", { calls: CallsView.Uncollected() })],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );

    assert.include(
      within(cardFor("AttributeResolver") ?? fail()).getByTestId("qadi-calls-uncollected")
        .textContent ?? "",
      "collectPortCalls",
    );
    assert.isEmpty(screen.queryAllByTestId("qadi-port-call"));
  });

  it("renders an interpreter label only when the call row carries one", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [
              cardRow("AttributeResolver", {
                calls: CallsView.Listed({
                  calls: [callOf("a → a value", "translation"), callOf("b → a value")],
                  earlier: undefined,
                }),
              }),
            ],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );

    const labels = screen.queryAllByTestId("qadi-port-call-interpreter");
    assert.strictEqual(labels.length, 1);
    assert.strictEqual(labels[0]?.textContent, "translation");
    assert.strictEqual(screen.getAllByTestId("qadi-port-call").length, 2);
  });

  it("shows a handful and says how many it did not", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [
              cardRow("AttributeResolver", {
                calls: CallsView.Listed({
                  calls: [1, 2, 3, 4, 5].map((n) => callOf(`a${n} → a value`)),
                  earlier: "and 3 earlier",
                }),
              }),
            ],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );

    const card = within(cardFor("AttributeResolver") ?? fail());
    assert.strictEqual(card.getAllByTestId("qadi-port-call").length, 5);
    assert.include(card.getByTestId("qadi-port-calls-more").textContent ?? "", "3 earlier");
  });

  // E3.2 / E3.4 — the counts and the calls are differently scoped, and the
  // footer now says which is which rather than describing only the first.
  it("keeps the counts and the calls apart in words", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [
              cardRow("AttributeResolver", {
                activity: "91 calls",
                calls: CallsView.Listed({ calls: [callOf("clearance → a value")], earlier: undefined }),
              }),
            ],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );

    const card = within(cardFor("AttributeResolver") ?? fail());
    assert.include(card.getByTestId("qadi-port-activity").textContent ?? "", "91 calls");
    assert.strictEqual(card.getAllByTestId("qadi-port-call").length, 1);

    const footer = screen.getByTestId("qadi-activity-scope").textContent ?? "";
    assert.include(footer, "process-wide aggregates");
    assert.include(footer, "read from spans");
  });

  it("renders a card's parts in order: name, state, activity, consequence, calls", () => {
    render(
      <ServicesPanel
        {...servicesInput(
          ServicesView.Read({
            rows: [
              cardRow("AttributeResolver", {
                state: "attributeResolverFromRecord",
                activity: "2 calls",
                consequence: "a consequence",
                calls: CallsView.Listed({ calls: [callOf("tier → a value")], earlier: undefined }),
              }),
            ],
            cache: "absent",
          }),
        )}
        diagnostics={liveNotice}
      />,
    );
    const card = cardFor("AttributeResolver") ?? fail();
    const [header, consequence, calls] = Array.from(card.children);

    assert.strictEqual(card.children.length, 3);
    assert.deepStrictEqual(
      Array.from(header?.children ?? []).map((part) => part.getAttribute("data-testid")),
      [null, "qadi-port-state", "qadi-port-activity"],
    );
    assert.strictEqual(header?.firstElementChild?.tagName, "STRONG");
    assert.deepStrictEqual(
      Array.from(header?.children ?? []).map((part) => part.textContent),
      ["AttributeResolver", "attributeResolverFromRecord", "2 calls"],
    );
    assert.strictEqual(consequence?.getAttribute("data-testid"), "qadi-port-consequence");
    assert.strictEqual(consequence?.textContent, "a consequence");
    assert.strictEqual(calls?.getAttribute("data-testid"), "qadi-port-calls");
  });
});
