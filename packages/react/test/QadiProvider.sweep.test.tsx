/**
 * How the bound holds under any number of providers and React's own lifecycle.
 *
 * One atom set has one bound and one sweeper, however many providers share it or
 * however many times React runs an effect: the sweep is the atom set's own, so a
 * provider's mount, a StrictMode double effect, a hidden then shown Activity or a
 * second provider never adds a fork or a sweep. Each pressure episode is exactly
 * one fork and one sweep, counted through `withSweepFork` and `makeSweepCounter`
 * with the real sweep still running and nothing mocked. The count is read at three
 * points: synchronously after the call, at the fork (the release or admission has
 * run, the sweep has not) and after a settle.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { Activity, StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";
import { withSweepFork } from "../src/SweepScheduler.ts";
import { settle } from "./support/settle.ts";
import { makeSweepCounter } from "./support/sweepCounter.ts";

const canRead = hasPermission(permission("doc", "read"));
const extra = hasPermission(permission("doc", "extra"));
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });

/** A bounded atom set whose forks and sweeps are counted, and the asked() length at each fork. */
const countedAtoms = (maxTrackedQuestions: number) => {
  const askedAtFork: Array<number> = [];
  const counter = makeSweepCounter(() => {
    askedAtFork.push(atoms.asked().length);
  });
  const atoms = makeQadiAtoms(
    EvaluationServicesNone,
    withSweepFork({ maxTrackedQuestions }, counter.fork),
  );
  /** Forgets what mounting counted, so the pressure under test starts from zero. */
  const reset = (): void => {
    counter.reset();
    askedAtFork.length = 0;
  };
  return { atoms, counter, askedAtFork, reset };
};

describe("the bound under any number of providers", () => {
  it("P1 under one provider a cold question past the bound is evicted and the mounted gate's own is kept", async () => {
    const { atoms, counter, askedAtFork, reset } = countedAtoms(1);

    render(
      <QadiProvider atoms={atoms} subject={reader}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
    await settle();
    reset();

    atoms.decision(extra);
    expect(atoms.asked().length).toBe(2);
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(0);

    await settle();
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(1);
    expect(counter.counts.sweepsAtFork).toEqual([0]);
    expect(askedAtFork).toEqual([2]);
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
  });

  it("P2 three providers over one atom set hold its one bound", async () => {
    const { atoms, counter, askedAtFork, reset } = countedAtoms(2);
    const c1 = hasPermission(permission("doc", "c1"));
    const c2 = hasPermission(permission("doc", "c2"));
    const c3 = hasPermission(permission("doc", "c3"));

    render(
      <>
        {[1, 2, 3].map((key) => (
          <QadiProvider key={key} atoms={atoms} subject={reader}>
            <Can policy={canRead}>
              <span>allowed</span>
            </Can>
          </QadiProvider>
        ))}
      </>,
    );
    await waitFor(() => expect(screen.getAllByText("allowed").length).toBe(3));
    await settle();
    reset();

    atoms.decision(c1);
    atoms.decision(c2);
    atoms.decision(c3);
    expect(atoms.asked().length).toBe(4);
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(0);

    await settle();
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(1);
    expect(counter.counts.sweepsAtFork).toEqual([0]);
    // c2's admission is the first one past the bound.
    expect(askedAtFork).toEqual([3]);
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead, c3]);
  });

  it("P3 under StrictMode the bound holds and the mounted gate's question is kept", async () => {
    const { atoms, counter, askedAtFork, reset } = countedAtoms(1);

    render(
      <StrictMode>
        <QadiProvider atoms={atoms} subject={reader}>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>
      </StrictMode>,
    );
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
    await settle();
    reset();

    atoms.decision(extra);
    expect(atoms.asked().length).toBe(2);
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(0);

    await settle();
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(1);
    expect(counter.counts.sweepsAtFork).toEqual([0]);
    expect(askedAtFork).toEqual([2]);
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
    expect(atoms.asked().filter((q) => q.policy === canRead).length).toBe(1);
  });

  it("P4 a provider hidden then shown inside an Activity keeps its gate's question and the bound", async () => {
    const { atoms, counter, askedAtFork, reset } = countedAtoms(1);
    const ui = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <QadiProvider atoms={atoms} subject={reader}>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>
      </Activity>
    );

    const { rerender } = render(ui("visible"));
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
    rerender(ui("hidden"));
    rerender(ui("visible"));
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
    await settle();
    reset();

    atoms.decision(extra);
    expect(atoms.asked().length).toBe(2);
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(0);

    await settle();
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(1);
    expect(askedAtFork).toEqual([2]);
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
  });

  it("P5 two providers over one atom set, unmounted in one span, fork one sweep and return the book to its bound", async () => {
    const { atoms, counter, askedAtFork, reset } = countedAtoms(1);
    const first = hasPermission(permission("doc", "first"));
    const second = hasPermission(permission("doc", "second"));
    const both: AuthSubject = makeSubject({ id: "u2", permissions: ["doc:first", "doc:second"] });

    const { unmount } = render(
      <>
        <QadiProvider atoms={atoms} subject={both}>
          <Can policy={first}>
            <span>first-allowed</span>
          </Can>
        </QadiProvider>
        <QadiProvider atoms={atoms} subject={both}>
          <Can policy={second}>
            <span>second-allowed</span>
          </Can>
        </QadiProvider>
      </>,
    );
    await waitFor(() => {
      expect(screen.getByText("first-allowed")).toBeDefined();
      expect(screen.getByText("second-allowed")).toBeDefined();
    });
    await settle();
    expect(atoms.asked().length).toBe(2);
    reset();

    unmount();
    expect(counter.counts.forks).toBe(0);
    expect(counter.counts.sweeps).toBe(0);
    expect(atoms.asked().length).toBe(2);

    await waitFor(() => expect(counter.counts.sweeps).toBe(1));
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweepsAtFork).toEqual([0]);
    expect(askedAtFork).toEqual([2]);
    expect(atoms.asked().length).toBe(1);

    await settle();
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(1);
  });
});
