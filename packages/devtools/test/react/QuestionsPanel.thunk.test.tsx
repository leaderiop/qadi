/**
 * A questions thunk that throws is stated in the questions panel, and the diagnostics poll keeps running.
 *
 * Written RED on the phase base, where the thunk was a field of the poll's sample and a
 * throw in it stopped every tab's readings: the notice read `Stopped` and the panel said
 * nothing about the thunk. ADR-QD-169 moves the thunk to the gates feed, which states a
 * throw the way the registry's is stated (`qadi-gates-failed`), under its own paragraph
 * and its own reason. This is the one deliberate behaviour change of that move, so it has
 * a test of its own and is not part of the characterisation.
 *
 * Every case hands the thunk through `questionsProp`, so the test does not change when
 * the seam flips. Never weakened after its commit: the move makes it green unedited.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactElement } from "react";
import { hasPermission, hasRole, permission } from "@qadi/core";
import type { AskedQuestionLike, GateInstanceLike } from "../../src/index.ts";
import { DevtoolsDock } from "../../src/react/index.ts";
import { makeGateRegistryDouble } from "../gateRegistryDouble.ts";
import { questionsProp } from "./questionsProp.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

/** The locked sentence of 56-UI-SPEC's Copywriting Contract, up to the reason. */
const QUESTIONS_FAILED = "The questions handed to the dock threw, so what has been asked cannot be shown: ";

/** A page element a guard can be located at. */
const marker = (): HTMLElement => {
  const element = document.createElement("span");
  document.body.appendChild(element);
  return element;
};

const guardA: GateInstanceLike = {
  id: "a",
  kind: "Can",
  policy: canRead,
  state: "Allowed",
  element: marker(),
};

/** A thunk that throws `thrown` on every call, with a count of the calls made. */
const throwing = (thrown: unknown) => {
  const state = { calls: 0 };
  const thunk = (): ReadonlyArray<AskedQuestionLike> => {
    state.calls += 1;
    throw thrown;
  };
  return { state, thunk };
};

/** The panel, once the dock has built its model and the React tab is open. */
const openPanel = async (ui: ReactElement) => {
  render(ui);
  await act(async () => {});
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "React" }));
  });
};

const failedText = () => screen.queryByTestId("qadi-questions-failed")?.textContent ?? undefined;

const eventuallyFailed = () =>
  vi.waitFor(() => {
    assert.isDefined(failedText());
  });

const status = () => screen.getByTestId("qadi-questions").getAttribute("data-diagnostics-status");

describe("a questions thunk that throws (D-03)", () => {
  it("Q1 a thunk that throws is stated in the questions panel, and the poll keeps running", async () => {
    const guards = makeGateRegistryDouble([guardA]);
    const { state, thunk } = throwing("questions down");
    await openPanel(
      <DevtoolsDock
        {...questionsProp({ gates: guards.registry, diagnostics: { intervalMillis: 10 } }, thunk)}
      />,
    );
    await eventuallyFailed();
    const text = failedText() ?? "";
    assert.isTrue(text.startsWith(QUESTIONS_FAILED), text);
    assert.include(text, "questions down");
    await vi.waitFor(() => {
      assert.isAtLeast(state.calls, 3);
    });
    assert.strictEqual(status(), "Live");
    assert.isNull(screen.queryByTestId("qadi-diagnostics-stopped"));
    assert.isEmpty(screen.queryAllByTestId("qadi-question-block"));
    assert.isNotNull(screen.getByTestId("qadi-pick"));
  });

  it("Q2 a thunk that throws what cannot be described names the questions, not the registry", async () => {
    const unrenderable = new Proxy(
      {},
      {
        get: () => {
          throw new Error("a getter that throws");
        },
        getPrototypeOf: () => {
          throw new Error("a trap that throws");
        },
        ownKeys: () => {
          throw new Error("a trap that throws");
        },
      },
    );
    const guards = makeGateRegistryDouble([guardA]);
    await openPanel(
      <DevtoolsDock
        {...questionsProp(
          { gates: guards.registry, diagnostics: { intervalMillis: 10 } },
          throwing(unrenderable).thunk,
        )}
      />,
    );
    await eventuallyFailed();
    assert.strictEqual(
      failedText(),
      `${QUESTIONS_FAILED}The questions threw a value that could not be described.`,
    );
  });

  it("Q3 a registry and a thunk that both throw are both stated, the registry first", async () => {
    const guards = makeGateRegistryDouble([guardA]);
    guards.failReads("registry down");
    await openPanel(
      <DevtoolsDock
        {...questionsProp(
          { gates: guards.registry, diagnostics: { intervalMillis: 10 } },
          throwing("questions down").thunk,
        )}
      />,
    );
    await eventuallyFailed();
    const gatesFailed = screen.getByTestId("qadi-gates-failed");
    const questionsFailed = screen.getByTestId("qadi-questions-failed");
    assert.isAbove(
      gatesFailed.compareDocumentPosition(questionsFailed) & Node.DOCUMENT_POSITION_FOLLOWING,
      0,
    );
    assert.include(gatesFailed.textContent ?? "", "registry down");
    assert.notInclude(gatesFailed.textContent ?? "", "questions down");
    assert.include(questionsFailed.textContent ?? "", "questions down");
    assert.notInclude(questionsFailed.textContent ?? "", "registry down");
    assert.isEmpty(screen.queryAllByTestId("qadi-question-block"));
  });

  it("Q4 a thunk that throws and then answers mends with no residue", async () => {
    const guards = makeGateRegistryDouble([guardA]);
    const sick = { failing: true };
    await openPanel(
      <DevtoolsDock
        {...questionsProp({ gates: guards.registry, diagnostics: { intervalMillis: 10 } }, () => {
          if (sick.failing) throw "questions down";
          return [{ policy: canRead }];
        })}
      />,
    );
    await eventuallyFailed();
    sick.failing = false;
    await vi.waitFor(() => {
      assert.isUndefined(failedText());
      assert.lengthOf(screen.queryAllByTestId("qadi-question-block"), 1);
    });
    assert.strictEqual(status(), "Live");
  });

  it("Q5 a supplied reading's questions win over a throwing thunk, and no failure is stated", async () => {
    const guards = makeGateRegistryDouble([guardA]);
    await openPanel(
      <DevtoolsDock
        {...questionsProp(
          { gates: guards.registry, diagnostics: { intervalMillis: 10 }, reading: { questions: [{ policy: isAdmin }] } },
          throwing("questions down").thunk,
        )}
      />,
    );
    await vi.waitFor(() => {
      assert.strictEqual(status(), "Live");
    });
    assert.lengthOf(screen.queryAllByTestId("qadi-question-block"), 1);
    assert.isUndefined(failedText());
  });
});
