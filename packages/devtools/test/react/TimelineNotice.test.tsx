/**
 * The timeline's stop, as the dock shows it.
 *
 * Four screens show timeline entries, and a dead read leaves them looking live, so the
 * stop is stated above them, once per stop, with the way to read again. These cases go
 * through the real dock because the rule is a placement: which of the seven tabs carry
 * the notice, and that moving between the four keeps it mounted.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render, screen } from "@testing-library/react";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { Activity, StrictMode, type RefObject } from "react";
import { vi } from "vitest";
import { sourceFromRecords, type Source } from "../../src/model/Source.ts";
import { TimelineStatus } from "../../src/model/TimelineFeed.ts";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import { noStops, type StopLedger } from "../../src/react/StoppedBox.tsx";
import { TimelineNotice } from "../../src/react/TimelineNotice.tsx";
import { colors } from "../../src/react/theme.ts";
import { decisionRecord } from "../helpers.ts";

const STOPPED_BODY =
  "The source failed with an unexpected error and is no longer delivering decisions. What it delivered before it stopped is kept, and nothing new will arrive.";

/** A backlog of one, then a live half that dies. */
const dying: Source = {
  read: Effect.succeed({
    backlog: [decisionRecord({ evaluationId: "a", at: 100 })],
    live: Stream.die(new Error("boom")),
  }),
};

/** Dies on its first read; every later read delivers its backlog and stays open. */
const flaky = (): Source => {
  let reads = 0;
  return {
    read: Effect.sync(() => {
      reads += 1;
      return reads === 1
        ? { backlog: [decisionRecord({ evaluationId: "a", at: 100 })], live: Stream.die(new Error("boom")) }
        : { backlog: [decisionRecord({ evaluationId: "a", at: 100 })], live: Stream.never };
    }),
  };
};

/** The outline a style property gives `value`, normalised the way the element's own style is. */
const outlineOf = (value: string): string => {
  const probe = document.createElement("span");
  probe.style.outline = value;
  return probe.style.outline;
};

const TABS = ["Log", "Inspector", "Policies", "Roles", "Services", "Simulator", "React"] as const;
const READING_TABS = ["Log", "Inspector", "Policies", "Simulator"] as const;
const OTHER_TABS = ["Roles", "Services", "React"] as const;

const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

const goTo = (tab: (typeof TABS)[number]) => click(screen.getByRole("button", { name: tab }));

/** A ledger with no stop in it, in the shape the dock hands the notice. */
const ledger = (): RefObject<StopLedger<TimelineStatus>> => ({ current: noStops });

const notice = () => screen.queryByTestId("qadi-timeline-notice");
const stopped = () => screen.getByTestId("qadi-timeline-stopped");

describe("the timeline notice", () => {
  it("TN1 a living source shows no notice on any tab", async () => {
    render(<DevtoolsDock source={sourceFromRecords([decisionRecord({ evaluationId: "a", at: 100 })])} />);
    await settle();

    for (const tab of TABS) {
      await goTo(tab);
      assert.isNull(notice(), tab);
    }
  });

  it("TN2 a stop shows the notice above the four timeline screens and nowhere else", async () => {
    render(<DevtoolsDock source={dying} />);
    await settle();

    for (const tab of READING_TABS) {
      await goTo(tab);
      assert.isNotNull(notice(), tab);
      assert.strictEqual(screen.getByTestId("qadi-dock-body").firstElementChild, screen.getByTestId("qadi-timeline-notice-slot"), tab);
    }
    for (const tab of OTHER_TABS) {
      await goTo(tab);
      assert.isNull(notice(), tab);
      assert.isNull(screen.queryByTestId("qadi-timeline-notice-slot"), tab);
    }
  });

  it("TN3 the notice says what stopped, why, and how to start it again", async () => {
    render(<DevtoolsDock source={dying} />);
    await settle();

    const alert = screen.getByRole("alert");
    assert.strictEqual(alert.textContent, `Timeline stopped. ${STOPPED_BODY}`);
    const reason = screen.getByRole("group", { name: "Why the timeline stopped" });
    assert.include(reason.textContent ?? "", "boom");
    assert.isFalse(alert.contains(reason));
    assert.isNotNull(screen.getByRole("button", { name: "Restart timeline" }));
  });

  it("TN4 a stop alerts once, and a move between timeline tabs keeps the same notice", async () => {
    render(<DevtoolsDock source={dying} />);
    await settle();

    const first = stopped();
    assert.strictEqual(first.getAttribute("data-announce"), "alert");

    await goTo("Inspector");
    assert.strictEqual(stopped(), first);

    await goTo("Roles");
    await goTo("Log");
    const again = stopped();
    assert.strictEqual(again.getAttribute("data-announce"), "none");
    assert.isNull(again.getAttribute("role"));
  });

  it("TN5 restart reads again, removes the notice and puts focus on the dock body", async () => {
    render(<DevtoolsDock source={flaky()} />);
    await settle();
    assert.isNotNull(notice());

    await click(screen.getByTestId("qadi-timeline-restart"));
    await settle();

    assert.isNull(notice());
    assert.strictEqual(document.activeElement, screen.getByTestId("qadi-dock-body"));
  });

  it("TN6 a second stop after a restart alerts again", async () => {
    render(<DevtoolsDock source={dying} />);
    await settle();
    assert.strictEqual(stopped().getAttribute("data-announce"), "alert");

    await click(screen.getByTestId("qadi-timeline-restart"));
    await settle();

    assert.strictEqual(stopped().getAttribute("data-announce"), "alert");
  });

  it("TN7 a strict-mode first render still alerts", async () => {
    render(
      <StrictMode>
        <DevtoolsDock source={dying} />
      </StrictMode>,
    );
    await settle();

    assert.strictEqual(stopped().getAttribute("data-announce"), "alert");
  });

  it("TN8 a stop first seen on services alerts at the first timeline tab visited", async () => {
    const gate = Effect.runSync(Deferred.make<void>());
    const late: Source = {
      read: Deferred.await(gate).pipe(
        Effect.map(() => ({ backlog: [], live: Stream.die(new Error("boom")) })),
      ),
    };
    render(<DevtoolsDock source={late} />);
    await goTo("Services");

    await act(async () => {
      Effect.runSync(Deferred.succeed(gate, undefined));
    });
    await settle();
    assert.isNull(notice());

    await goTo("Log");
    assert.strictEqual(stopped().getAttribute("data-announce"), "alert");
  });

  it("TN9 the dock body is a focus target with the dock's own ring", async () => {
    render(<DevtoolsDock source={sourceFromRecords([])} />);
    await settle();

    const body = screen.getByTestId("qadi-dock-body");
    assert.strictEqual(body.getAttribute("tabindex"), "-1");

    act(() => body.focus());
    assert.strictEqual(body.style.outline, outlineOf(`2px solid ${colors.accent}`));
    assert.strictEqual(body.style.outlineOffset, "-2px");

    act(() => body.blur());
    assert.strictEqual(body.style.outline, "");
    assert.strictEqual(body.style.outlineOffset, "");
  });

  it("TN10 a hidden-then-shown dock rebuilds at Reading and alerts afresh on a new stop", async () => {
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <DevtoolsDock source={dying} />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    await settle();
    assert.strictEqual(stopped().getAttribute("data-announce"), "alert");

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);
    await settle();

    assert.strictEqual(stopped().getAttribute("data-announce"), "alert");
  });

  it("TN11 a restart outside the dock body runs once and moves no focus", async () => {
    const calls = { restarts: 0 };
    render(
      <TimelineNotice
        status={TimelineStatus.Stopped({ reason: "boom" })}
        onRestart={() => {
          calls.restarts += 1;
        }}
        announced={ledger()}
      />,
    );
    await settle();

    await click(screen.getByTestId("qadi-timeline-restart"));

    assert.strictEqual(calls.restarts, 1);
    assert.strictEqual(document.activeElement, document.body);
  });

  it("TN12 a stop is drawn with its slot spacing, a bold lead and no sampled attribute", async () => {
    render(<TimelineNotice status={TimelineStatus.Stopped({ reason: "boom" })} onRestart={() => {}} announced={ledger()} />);
    await settle();

    const probe = document.createElement("div");
    probe.style.padding = "12px 12px 0";
    assert.strictEqual(screen.getByTestId("qadi-timeline-notice-slot").style.padding, probe.style.padding);
    assert.strictEqual(screen.getByText("Timeline stopped.").style.fontWeight, "600");
    assert.isFalse(stopped().hasAttribute("data-sampled"));
  });

  it("TN13 the dock body draws no ring for a focus that is not focus-visible", async () => {
    render(<DevtoolsDock source={sourceFromRecords([])} />);
    await settle();
    const body = screen.getByTestId("qadi-dock-body");
    vi.spyOn(body, "matches").mockReturnValue(false);

    act(() => body.focus());

    assert.strictEqual(body.style.outline, "");
    assert.strictEqual(body.style.outlineOffset, "");
  });

  it("TN14 a notice mounted again for the stop already announced does not count it twice", async () => {
    const announced = ledger();
    const status = TimelineStatus.Stopped({ reason: "boom" });
    const view = render(<TimelineNotice status={status} onRestart={() => {}} announced={announced} />);
    await settle();
    assert.strictEqual(announced.current.count, 1);
    view.unmount();

    render(<TimelineNotice status={status} onRestart={() => {}} announced={announced} />);
    await settle();

    assert.strictEqual(announced.current.count, 1);
    assert.strictEqual(stopped().getAttribute("data-announce"), "none");
  });

  it("TN15 a notice handed another ledger records its stop there", async () => {
    const status = TimelineStatus.Stopped({ reason: "boom" });
    const first = ledger();
    const view = render(<TimelineNotice status={status} onRestart={() => {}} announced={first} />);
    await settle();
    const second = ledger();

    view.rerender(<TimelineNotice status={status} onRestart={() => {}} announced={second} />);
    await settle();

    assert.strictEqual(second.current.stop, status);
  });
});
