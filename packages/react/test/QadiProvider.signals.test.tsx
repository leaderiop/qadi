/**
 * What `QadiProvider` tells a supplied `onDeveloperSignal`, and that it then
 * writes nothing to the console.
 *
 * The three situations are the provider's own detections; each used to call
 * `console.warn` directly and could not be routed anywhere (ARCH-37). The
 * once-per-process console latch for `InstrumentedInProduction` is not asserted
 * here, because a supplied reporter bypasses it: it lives in
 * `QadiProvider.production.test.tsx`, alone in its file.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";
import type { ProviderSignal } from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const atoms = makeQadiAtoms(EvaluationServicesNone);
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const tags = (seen: ReadonlyArray<ProviderSignal>) => seen.map((signal) => signal._tag);

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("QadiProvider onDeveloperSignal", () => {
  it("is told InstrumentedInProduction once per mount, and the console stays quiet", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const seen: Array<ProviderSignal> = [];
      const ui = (
        <QadiProvider atoms={atoms} subject={reader} instrument onDeveloperSignal={(s) => seen.push(s)}>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>
      );
      const view = render(ui);
      view.rerender(ui);
      expect(tags(seen)).toEqual(["InstrumentedInProduction"]);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("does not call InstrumentedInProduction in development", () => {
    const seen: Array<ProviderSignal> = [];
    render(
      <QadiProvider atoms={atoms} subject={reader} instrument onDeveloperSignal={(s) => seen.push(s)}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(seen).toEqual([]);
  });

  it("is told AtomsReplaced, and the console stays quiet", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const other = makeQadiAtoms(EvaluationServicesNone);
    const seen: Array<ProviderSignal> = [];
    const view = render(
      <QadiProvider atoms={atoms} subject={reader} onDeveloperSignal={(s) => seen.push(s)}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(seen).toEqual([]);
    view.rerender(
      <QadiProvider atoms={other} subject={reader} onDeveloperSignal={(s) => seen.push(s)}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(tags(seen)).toEqual(["AtomsReplaced"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("is told AtomsReplaced in production too", () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const other = makeQadiAtoms(EvaluationServicesNone);
      const seen: Array<ProviderSignal> = [];
      const view = render(
        <QadiProvider atoms={atoms} subject={reader} onDeveloperSignal={(s) => seen.push(s)}>
          x
        </QadiProvider>,
      );
      view.rerender(
        <QadiProvider atoms={other} subject={reader} onDeveloperSignal={(s) => seen.push(s)}>
          x
        </QadiProvider>,
      );
      expect(tags(seen)).toEqual(["AtomsReplaced"]);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });

  it("is told UnwritableGateRegistry, and the console stays quiet", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const foreign = { instances: () => [], subscribe: () => () => {} };
    const seen: Array<ProviderSignal> = [];
    render(
      <QadiProvider
        atoms={atoms}
        subject={reader}
        instrument
        gates={foreign}
        onDeveloperSignal={(s) => seen.push(s)}
      >
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(tags(seen)).toEqual(["UnwritableGateRegistry"]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("an inline reporter that changes identity every render does not re-fire anything", () => {
    const other = makeQadiAtoms(EvaluationServicesNone);
    const first: Array<ProviderSignal> = [];
    const second: Array<ProviderSignal> = [];
    const third: Array<ProviderSignal> = [];
    const view = render(
      <QadiProvider atoms={atoms} subject={reader} onDeveloperSignal={(s) => first.push(s)}>
        x
      </QadiProvider>,
    );
    view.rerender(
      <QadiProvider atoms={other} subject={reader} onDeveloperSignal={(s) => second.push(s)}>
        x
      </QadiProvider>,
    );
    // The same atoms and a third, new function: nothing changed, so nothing is told.
    view.rerender(
      <QadiProvider atoms={other} subject={reader} onDeveloperSignal={(s) => third.push(s)}>
        x
      </QadiProvider>,
    );
    expect(first).toEqual([]);
    expect(tags(second)).toEqual(["AtomsReplaced"]);
    expect(third).toEqual([]);
  });

  it("writes the console once for an unwritable registry when no reporter is supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const foreign = { instances: () => [], subscribe: () => () => {} };
    render(
      <QadiProvider atoms={atoms} subject={reader} instrument gates={foreign}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]?.[0])).toContain("not built by makeGateRegistry()");
  });
});
