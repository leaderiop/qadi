/**
 * How many sweepers a provider forks across React's lifecycle.
 *
 * The sweep lives in the provider today, so its count follows the number of
 * providers and React's effect lifecycle rather than the atom set. These cases
 * count it through a per-test atom set whose `sweepEvictions` is replaced, so a
 * later change to who sweeps shows up here only as a visible, deliberate edit.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Effect from "effect/Effect";
import { Activity, StrictMode } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";

const canRead = hasPermission(permission("doc", "read"));
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });

/** An atom set that counts its sweeps instead of running them. */
const countingAtoms = (count: { sweeps: number }) => ({
  ...makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 }),
  sweepEvictions: Effect.sync(() => {
    count.sweeps += 1;
  }),
});

describe("the provider's sweeper", () => {
  it("P1 one provider forks one sweeper, which sweeps once at mount", () => {
    const count = { sweeps: 0 };
    const atoms = countingAtoms(count);

    const { unmount } = render(
      <QadiProvider atoms={atoms} subject={reader} sweepIntervalMillis={60_000}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(count.sweeps).toBe(1);

    unmount();
    expect(count.sweeps).toBe(1);
  });

  it("P2 three providers over one atom set fork three sweepers", () => {
    const count = { sweeps: 0 };
    const atoms = countingAtoms(count);

    render(
      <>
        {[1, 2, 3].map((key) => (
          <QadiProvider key={key} atoms={atoms} subject={reader} sweepIntervalMillis={60_000}>
            <Can policy={canRead}>allowed</Can>
          </QadiProvider>
        ))}
      </>,
    );
    expect(count.sweeps).toBe(3);
  });

  it("P3 under StrictMode the provider forks its sweeper twice", () => {
    const count = { sweeps: 0 };
    const atoms = countingAtoms(count);

    render(
      <StrictMode>
        <QadiProvider atoms={atoms} subject={reader} sweepIntervalMillis={60_000}>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>
      </StrictMode>,
    );
    expect(count.sweeps).toBe(2);
  });

  it("P4 a provider hidden then shown inside an Activity forks a second sweeper", () => {
    const count = { sweeps: 0 };
    const atoms = countingAtoms(count);
    const ui = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <QadiProvider atoms={atoms} subject={reader} sweepIntervalMillis={60_000}>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>
      </Activity>
    );

    const { rerender } = render(ui("visible"));
    expect(count.sweeps).toBe(1);

    rerender(ui("hidden"));
    expect(count.sweeps).toBe(1);

    rerender(ui("visible"));
    expect(count.sweeps).toBe(2);
  });
});
