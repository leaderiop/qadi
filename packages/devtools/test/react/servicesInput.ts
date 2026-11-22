/**
 * The panel tests' one input seam: what `ServicesPanel` is handed to read.
 *
 * `ServicesPanel.test.tsx` spreads `servicesInput(view)` onto every panel it renders, so the
 * panel is exercised through the store's own two methods and a test writes down the view it
 * wants rendered. The store double returns the view it was given, as the dock model's
 * `services` store returns the cards of the shown reading.
 *
 * It does not call `portCards`. The join is pinned by `PortCards.test.ts` and by the model's
 * reference rules, and a panel test that built its input with it would take a defect in the
 * join as input and not as a failure. The view is written out here, as `questionsPanelInput.ts`
 * writes out its snapshot.
 */
import { CallsView } from "../../src/model/PortCards.ts";
import type { PortCardRow, ServicesView } from "../../src/model/PortCards.ts";
import type { WiredServiceName } from "../../src/model/Wiring.ts";

export const servicesInput = (
  view: ServicesView,
): {
  readonly services: {
    readonly subscribe: (listener: () => void) => () => void;
    readonly getSnapshot: () => ServicesView;
  };
} => ({ services: { subscribe: () => () => {}, getSnapshot: () => view } });

/** One card row with plain defaults, the fields a test cares about spread over them. */
export const cardRow = (
  port: WiredServiceName,
  fields?: Partial<Omit<PortCardRow, "port">>,
): PortCardRow => ({
  port,
  defaulted: "false",
  state: "wired, unnamed",
  activity: "never called",
  consequence: "",
  tone: "Plain",
  calls: CallsView.Hidden(),
  ...fields,
});
