/**
 * Pins the questions panel's hydration block, whole, for the states the two older
 * panel characterisations do not byte-pin.
 *
 * Written on the base, before the block's decision moved out of the panel. It is
 * needed because the panel sits outside the devtools mutation glob, so no mutant
 * catches a changed word, a changed plural or a dropped row there. Every cell
 * compares the block root's `outerHTML` whole, never by substring, through the
 * public dock only: the counts reach the panel as the dock's `reading.hydration`,
 * under each state of the poll that can sit beside them.
 *
 * Held byte for byte from the commit that adds it: a later cell goes in another file.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement } from "react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { PortCallCollector } from "../../src/index.ts";
import { DevtoolsDock } from "../../src/react/index.ts";
import { makeCollectorDouble } from "../collectorDouble.ts";

/** A diagnostics layer that never builds, so the poll stays `Starting`: unsampled. */
const neverBuilt = { layer: Layer.effectDiscard(Effect.never) };

/** A collector whose first snapshot throws, so the poll stops before it samples. */
const dying: PortCallCollector = {
  layer: Layer.empty,
  snapshot: Effect.sync(() => {
    throw new Error("collector down");
  }),
};

/** The dock with the React tab open, once it has built its model. */
const openPanel = async (ui: ReactElement) => {
  render(ui);
  await act(async () => {});
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "React" }));
  });
};

const settledAs = (status: string) =>
  vi.waitFor(() => {
    assert.strictEqual(
      screen.getByTestId("qadi-questions").getAttribute("data-diagnostics-status"),
      status,
    );
  });

const pin = (title: string): void => {
  assert.strictEqual(screen.getByTestId("qadi-hydration").outerHTML, GOLDEN[title]);
};

const GOLDEN: Readonly<Record<string, string>> = {
  "H1 rechecked 1, mismatched 1: the singular rate":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">1</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">1</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">1 of 1 re-checked question disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 6 dehydrated entries have no seeding counted in this process.</div></div>",
  "H2 rechecked 4, mismatched 1: the plural rate":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">1</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">1 of 4 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 6 dehydrated entries have no seeding counted in this process.</div></div>",
  "H3 rechecked 0 with seeded 3: no rate":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">3</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 7 dehydrated entries have no seeding counted in this process.</div></div>",
  "H4 dehydrated equals seeded: 0 dehydrated entries":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">0 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 0 dehydrated entries have no seeding counted in this process.</div></div>",
  "H5 a shortfall of 1: 1 dehydrated entry":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">11</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">0 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 1 dehydrated entry have no seeding counted in this process.</div></div>",
  "H6 a shortfall of 6: 6 dehydrated entries":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">0 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 6 dehydrated entries have no seeding counted in this process.</div></div>",
  "H7 seeded more than dehydrated: a client reading payloads":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">0 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. This process seeded more than it built, so it is a client reading payloads rendered elsewhere.</div></div>",
  "H8 a raised drop beside a zero one: one row, no all-clear":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">0 of 2 re-checked questions disagreed with the server.</div><div style=\"margin-top: 4px;\" data-testid=\"qadi-hydration-drops\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\" data-testid=\"qadi-hydration-drop\"><span style=\"color: #e3a008;\">2</span><span>ForeignSubject</span><span style=\"color: #8b93a3; font-size: 11px;\">— two subjects in one payload</span></div></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 6 dehydrated entries have no seeding counted in this process.</div></div>",
  "H9 a foreign reason holding markup is text":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">10</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">4</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">0 of 2 re-checked questions disagreed with the server.</div><div style=\"margin-top: 4px;\" data-testid=\"qadi-hydration-drops\"><div style=\"display: flex; gap: 8px; align-items: baseline; padding: 3px 0px; border-bottom-width: initial; border-bottom-style: none; border-bottom-color: none;\" data-testid=\"qadi-hydration-drop\"><span style=\"color: #e3a008;\">1</span><span>&lt;b&gt;stray&lt;/b&gt;</span><span style=\"color: #8b93a3; font-size: 11px;\">— something else writes here</span></div></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 6 dehydrated entries have no seeding counted in this process.</div></div>",
  "H10 no drops, all counts zero: All 0 reasons":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">0</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 0 dehydrated entries have no seeding counted in this process.</div></div>",
  "H11 supplied counts while the poll is Starting":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">5</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">1</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">1 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 3 dehydrated entries have no seeding counted in this process.</div></div>",
  "H12 supplied counts while the poll stopped unsampled":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">5</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">1</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">1 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 3 dehydrated entries have no seeding counted in this process.</div></div>",
  "H13 supplied counts win over a live poll's":
    "<div style=\"margin-top: 10px;\" data-testid=\"qadi-hydration\"><div style=\"color: #8b93a3; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px;\">hydration</div><div style=\"display: flex; gap: 14px; flex-wrap: wrap; padding: 2px 0px;\"><span data-testid=\"qadi-hydration-dehydrated\"><span style=\"font-weight: 600;\">5</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">dehydrated</span></span><span data-testid=\"qadi-hydration-seeded\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">seeded</span></span><span data-testid=\"qadi-hydration-rechecked\"><span style=\"font-weight: 600;\">2</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">re-checked</span></span><span data-testid=\"qadi-hydration-mismatched\"><span style=\"font-weight: 600;\">1</span><span style=\"color: #8b93a3; margin-left: 4px; font-size: 11px;\">mismatched</span></span></div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-rate\">1 of 2 re-checked questions disagreed with the server.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-no-drops\">Nothing was dropped. All 0 reasons are watched.</div><div style=\"color: #8b93a3; font-size: 11px;\" data-testid=\"qadi-hydration-scope\">Process-wide totals, not this page's. 3 dehydrated entries have no seeding counted in this process.</div></div>",
};

describe("the questions panel's hydration block, byte for byte", () => {
  it("H1 rechecked 1, mismatched 1: the singular rate", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 4,
            rechecked: 1,
            mismatched: 1,
            drops: [],
          },
        }}
      />,
    );
    pin("H1 rechecked 1, mismatched 1: the singular rate");
  });

  it("H2 rechecked 4, mismatched 1: the plural rate", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 4,
            rechecked: 4,
            mismatched: 1,
            drops: [],
          },
        }}
      />,
    );
    pin("H2 rechecked 4, mismatched 1: the plural rate");
  });

  it("H3 rechecked 0 with seeded 3: no rate", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 3,
            rechecked: 0,
            mismatched: 0,
            drops: [],
          },
        }}
      />,
    );
    pin("H3 rechecked 0 with seeded 3: no rate");
  });

  it("H4 dehydrated equals seeded: 0 dehydrated entries", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 10,
            rechecked: 2,
            mismatched: 0,
            drops: [],
          },
        }}
      />,
    );
    pin("H4 dehydrated equals seeded: 0 dehydrated entries");
  });

  it("H5 a shortfall of 1: 1 dehydrated entry", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 11,
            seeded: 10,
            rechecked: 2,
            mismatched: 0,
            drops: [],
          },
        }}
      />,
    );
    pin("H5 a shortfall of 1: 1 dehydrated entry");
  });

  it("H6 a shortfall of 6: 6 dehydrated entries", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 4,
            rechecked: 2,
            mismatched: 0,
            drops: [],
          },
        }}
      />,
    );
    pin("H6 a shortfall of 6: 6 dehydrated entries");
  });

  it("H7 seeded more than dehydrated: a client reading payloads", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 0,
            seeded: 4,
            rechecked: 2,
            mismatched: 0,
            drops: [],
          },
        }}
      />,
    );
    pin("H7 seeded more than dehydrated: a client reading payloads");
  });

  it("H8 a raised drop beside a zero one: one row, no all-clear", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 4,
            rechecked: 2,
            mismatched: 0,
            drops: [
              {
                reason: "ForeignSubject",
                count: 2,
                meaning: "two subjects in one payload",
              },
              {
                reason: "MalformedEntry",
                count: 0,
                meaning: "an entry of the wrong shape",
              },
            ],
          },
        }}
      />,
    );
    pin("H8 a raised drop beside a zero one: one row, no all-clear");
  });

  it("H9 a foreign reason holding markup is text", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 10,
            seeded: 4,
            rechecked: 2,
            mismatched: 0,
            drops: [
              { reason: "<b>stray</b>", count: 1, meaning: "something else writes here" },
            ],
          },
        }}
      />,
    );
    pin("H9 a foreign reason holding markup is text");
  });

  it("H10 no drops, all counts zero: All 0 reasons", async () => {
    await openPanel(
      <DevtoolsDock
        reading={{
          hydration: {
            dehydrated: 0,
            seeded: 0,
            rechecked: 0,
            mismatched: 0,
            drops: [],
          },
        }}
      />,
    );
    pin("H10 no drops, all counts zero: All 0 reasons");
  });

  it("H11 supplied counts while the poll is Starting", async () => {
    await openPanel(
      <DevtoolsDock
        diagnostics={neverBuilt}
        reading={{
          hydration: {
            dehydrated: 5,
            seeded: 2,
            rechecked: 2,
            mismatched: 1,
            drops: [],
          },
        }}
      />,
    );
    await settledAs("Starting");
    pin("H11 supplied counts while the poll is Starting");
  });

  it("H12 supplied counts while the poll stopped unsampled", async () => {
    await openPanel(
      <DevtoolsDock
        diagnostics={{ collector: dying }}
        reading={{
          hydration: {
            dehydrated: 5,
            seeded: 2,
            rechecked: 2,
            mismatched: 1,
            drops: [],
          },
        }}
      />,
    );
    await settledAs("Stopped");
    pin("H12 supplied counts while the poll stopped unsampled");
  });

  it("H13 supplied counts win over a live poll's", async () => {
    await openPanel(
      <DevtoolsDock
        diagnostics={{ collector: makeCollectorDouble().collector }}
        reading={{
          hydration: {
            dehydrated: 5,
            seeded: 2,
            rechecked: 2,
            mismatched: 1,
            drops: [],
          },
        }}
      />,
    );
    await settledAs("Live");
    pin("H13 supplied counts win over a live poll's");
  });
});
