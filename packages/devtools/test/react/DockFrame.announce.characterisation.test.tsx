/**
 * Pins that a stop is announced once per stop through the dock, plain and under StrictMode.
 *
 * Every row reads only what the page shows, the announce attribute, the role and which
 * element is on the page, through `DevtoolsDock`, whose props are the only seam the rows
 * touch, so the same rows hold however the dock keeps each feed's ledger of announced
 * stops. This file is held byte for byte from its first commit, and a later row goes in a
 * new file.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render, screen } from "@testing-library/react";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { StrictMode, type ReactElement } from "react";
import { vi } from "vitest";
import type { Source } from "../../src/model/Source.ts";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import { makeCollectorDouble } from "../collectorDouble.ts";
import { decisionRecord } from "../helpers.ts";

/** A source whose read succeeds, then dies. */
const dyingSource = (): Source => ({
  read: Effect.succeed({
    backlog: [decisionRecord({ evaluationId: "a", at: 100 })],
    live: Stream.die(new Error("boom")),
  }),
});

/** A collector that throws on every call and counts the calls. */
const throwing = () =>
  makeCollectorDouble(() => {
    throw new Error("the collector blew up");
  });

const settle = async () => {
  await act(async () => {});
  await act(async () => {});
};

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

const goTo = (tab: "Log" | "Roles" | "Services") => click(screen.getByRole("button", { name: tab }));

const announce = (element: HTMLElement): string | null => element.getAttribute("data-announce");

const timelineBox = () => screen.getByTestId("qadi-timeline-stopped");

/** The diagnostics box, once the poll has stopped and the box is on the screen. */
const diagnosticsBox = async (): Promise<HTMLElement> => {
  await vi.waitFor(() => {
    assert.isNotNull(screen.queryByTestId("qadi-diagnostics-stopped"));
  });
  return screen.getByTestId("qadi-diagnostics-stopped");
};

/** The number of elements on the page with the alert role. */
const alerts = () => screen.queryAllByRole("alert").length;

/**
 * Records each distinct element the page is given that carries a stop box test id or the
 * alert role, so a box mounted twice is counted twice and a nested node is counted once.
 * An element handed over inside a larger subtree and replaced before the observer reads is
 * seen when it is removed, because an element that goes was first added.
 */
const watchAdded = () => {
  const boxes = new Set<HTMLElement>();
  const alerting = new Set<HTMLElement>();
  const take = (records: ReadonlyArray<MutationRecord>) => {
    for (const record of records) {
      for (const node of [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)]) {
        if (!(node instanceof HTMLElement)) continue;
        for (const element of [node, ...Array.from(node.querySelectorAll<HTMLElement>("[data-testid], [role]"))]) {
          const id = element.getAttribute("data-testid");
          if (id === "qadi-timeline-stopped" || id === "qadi-diagnostics-stopped") boxes.add(element);
          if (element.getAttribute("role") === "alert") alerting.add(element);
        }
      }
    }
  };
  const seen = new MutationObserver(take);
  seen.observe(document.body, { childList: true, subtree: true });
  return {
    count: (testId: string) => {
      take(seen.takeRecords());
      return Array.from(boxes).filter((element) => element.getAttribute("data-testid") === testId).length;
    },
    alerting: () => {
      take(seen.takeRecords());
      return alerting.size;
    },
    stop: () => seen.disconnect(),
  };
};

type Wrap = (element: ReactElement) => ReactElement;
const plain: Wrap = (element) => element;
const strict: Wrap = (element) => <StrictMode>{element}</StrictMode>;

const eachFeedStopIsAnnouncedOnce = async (wrap: Wrap) => {
  const { collector } = throwing();
  const watch = watchAdded();
  render(wrap(<DevtoolsDock source={dyingSource()} diagnostics={{ collector }} />));
  await settle();

  assert.strictEqual(announce(timelineBox()), "alert", "the timeline stop on Log, first mount");
  assert.strictEqual(alerts(), 1, "one alert on Log");
  await goTo("Services");
  assert.strictEqual(announce(await diagnosticsBox()), "alert", "the diagnostics stop on Services, first mount");
  assert.strictEqual(alerts(), 1, "one alert on Services");
  for (let round = 0; round < 2; round++) {
    await goTo("Log");
    assert.strictEqual(announce(timelineBox()), "none", `Log, revisit ${String(round)}`);
    assert.strictEqual(alerts(), 0, `no alert on Log, revisit ${String(round)}`);
    await goTo("Services");
    assert.strictEqual(announce(await diagnosticsBox()), "none", `Services, revisit ${String(round)}`);
    assert.strictEqual(alerts(), 0, `no alert on Services, revisit ${String(round)}`);
  }
  assert.strictEqual(watch.alerting(), 2, "one alert element per distinct stop across the run");
  watch.stop();
};

const aSecondStopAlertsOnItsOwnFeedOnly = async (wrap: Wrap) => {
  const { collector, state } = throwing();
  render(wrap(<DevtoolsDock source={dyingSource()} diagnostics={{ collector }} />));
  await settle();
  await goTo("Services");
  const firstDiagnostics = await diagnosticsBox();

  const before = state.calls;
  await click(screen.getByRole("button", { name: "Restart diagnostics" }));
  await vi.waitFor(() => {
    assert.isAbove(state.calls, before);
  });
  const secondDiagnostics = await diagnosticsBox();
  assert.notStrictEqual(secondDiagnostics, firstDiagnostics, "the second diagnostics stop is a new box");
  assert.strictEqual(announce(secondDiagnostics), "alert", "the second diagnostics stop is announced afresh");

  await goTo("Log");
  const firstTimeline = timelineBox();
  assert.strictEqual(announce(firstTimeline), "none", "the timeline stop is not announced again");

  await click(screen.getByTestId("qadi-timeline-restart"));
  await settle();
  const secondTimeline = timelineBox();
  assert.notStrictEqual(secondTimeline, firstTimeline, "the second timeline stop is a new box");
  assert.strictEqual(announce(secondTimeline), "alert", "the second timeline stop is announced afresh");
  assert.strictEqual(alerts(), 1);

  await goTo("Services");
  assert.strictEqual(announce(await diagnosticsBox()), "none", "the diagnostics stop is not announced again");
};

const aBoxMountedAgainIsSilentAndKept = async (wrap: Wrap) => {
  const source = dyingSource();
  const view = render(wrap(<DevtoolsDock source={source} />));
  await settle();
  assert.strictEqual(announce(timelineBox()), "alert", "the first mount");

  await goTo("Roles");
  await goTo("Log");
  const remounted = timelineBox();
  assert.strictEqual(announce(remounted), "none", "mounted again for the announced stop");

  view.rerender(wrap(<DevtoolsDock source={source} />));
  await settle();
  assert.strictEqual(timelineBox(), remounted, "a re-render keeps the box");
  assert.strictEqual(announce(remounted), "none", "and keeps it silent");

  await click(screen.getByTestId("qadi-timeline-restart"));
  await settle();
  const next = timelineBox();
  assert.notStrictEqual(next, remounted, "the next stop remounts the box");
  assert.strictEqual(announce(next), "alert", "and announces it");
};

const aStopWithNoNoticeMountedAlertsOnTheFirstVisit = async (wrap: Wrap) => {
  const timelineGate = Effect.runSync(Deferred.make<void>());
  const late: Source = {
    read: Deferred.await(timelineGate).pipe(
      Effect.map(() => ({ backlog: [], live: Stream.die(new Error("boom")) })),
    ),
  };
  const diagnosticsGate = { open: false };
  const { collector, state } = makeCollectorDouble(() => {
    if (diagnosticsGate.open) throw new Error("the collector blew up");
    return { calls: [], dropped: 0, capacity: 10 };
  });
  render(wrap(<DevtoolsDock source={late} diagnostics={{ collector, intervalMillis: 10 }} />));
  await goTo("Roles");

  const calls = state.calls;
  diagnosticsGate.open = true;
  await act(async () => {
    Effect.runSync(Deferred.succeed(timelineGate, undefined));
  });
  await vi.waitFor(() => {
    assert.isAbove(state.calls, calls);
  });
  await settle();
  assert.isNull(screen.queryByTestId("qadi-timeline-notice"), "no timeline notice on a screen without one");
  assert.isNull(screen.queryByTestId("qadi-diagnostics-notice"), "no diagnostics notice on a screen without one");

  await goTo("Log");
  assert.strictEqual(announce(timelineBox()), "alert", "the timeline stop on the first visit to Log");
  await goTo("Services");
  assert.strictEqual(announce(await diagnosticsBox()), "alert", "the diagnostics stop on the first visit to Services");
  await goTo("Log");
  assert.strictEqual(announce(timelineBox()), "none", "silent on the next visit");
};

const theCommitThatRecordsAStopDoesNotMountItsBoxAgain = async (wrap: Wrap) => {
  const { collector } = throwing();
  const watch = watchAdded();
  render(wrap(<DevtoolsDock source={dyingSource()} diagnostics={{ collector }} />));
  await settle();
  const box = timelineBox();
  assert.strictEqual(watch.count("qadi-timeline-stopped"), 1, "one box element for the one timeline stop");
  await settle();
  assert.strictEqual(timelineBox(), box, "the box on the page is the one the stop mounted");
  assert.strictEqual(announce(box), "alert");

  await goTo("Services");
  const diagnostics = await diagnosticsBox();
  await settle();
  assert.strictEqual(await diagnosticsBox(), diagnostics, "the box on the page is the one the stop mounted");
  assert.strictEqual(announce(diagnostics), "alert");
  assert.strictEqual(watch.count("qadi-diagnostics-stopped"), 1, "one box element for the one diagnostics stop");
  watch.stop();
};

describe("announce once, through the dock", () => {
  it("A1 [plain] each feed stop is announced once and silent on every revisit across tab switches", () => eachFeedStopIsAnnouncedOnce(plain));
  it("A1 [StrictMode] each feed stop is announced once and silent on every revisit across tab switches", () => eachFeedStopIsAnnouncedOnce(strict));
  it("A2 [plain] a second stop after Restart alerts again on its own feed only", () => aSecondStopAlertsOnItsOwnFeedOnly(plain));
  it("A2 [StrictMode] a second stop after Restart alerts again on its own feed only", () => aSecondStopAlertsOnItsOwnFeedOnly(strict));
  it("A3 [plain] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert", () => aBoxMountedAgainIsSilentAndKept(plain));
  it("A3 [StrictMode] a box mounted again for the announced stop is silent and kept by a re-render, and the next stop remounts it with the alert", () => aBoxMountedAgainIsSilentAndKept(strict));
  it("A4 [plain] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds", () => aStopWithNoNoticeMountedAlertsOnTheFirstVisit(plain));
  it("A4 [StrictMode] a stop that happened while no notice was mounted alerts on the first visit to a screen with one, for both feeds", () => aStopWithNoNoticeMountedAlertsOnTheFirstVisit(strict));
  it("A5 [plain] the commit that records a stop does not mount its box again", () => theCommitThatRecordsAStopDoesNotMountItsBoxAgain(plain));
  it("A5 [StrictMode] the commit that records a stop does not mount its box again", () => theCommitThatRecordsAStopDoesNotMountItsBoxAgain(strict));
});
