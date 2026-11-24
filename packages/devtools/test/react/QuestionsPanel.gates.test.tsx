/**
 * The React panel's second view: who is asking, and where they are.
 *
 * Split from `QuestionsPanel.test.tsx`, which covers what has been *asked*.
 * These two views are the whole point of the increment and are deliberately
 * tested apart, because the failure worth catching is one silently replacing the
 * other.
 *
 * happy-dom performs no layout and no hit testing, so the pick interaction is
 * driven by stubbing `elementFromPoint` — the same seam `Lens.test.ts` uses.
 * What is asserted is which instance a point resolves to and what the panel then
 * does, never a measured pixel.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { hasRole } from "@qadi/core";
import { GatesView, QuestionsView } from "../../src/model/Gates.ts";
import type { GateInstanceLike, QuestionsSnapshot } from "../../src/model/Gates.ts";
import { makeLensSession } from "../../src/model/LensSession.ts";
import { QuestionsPanel } from "../../src/react/QuestionsPanel.tsx";
import type { AskedQuestionLike } from "../../src/react/QuestionsPanel.tsx";
import { liveNotice, readPolicy } from "../helpers.ts";
import { panelInput } from "./questionsPanelInput.ts";

const isAdmin = hasRole("admin");

const asked: ReadonlyArray<AskedQuestionLike> = [{ policy: readPolicy }];

const marker = (): HTMLElement => {
  const element = document.createElement("span");
  document.body.appendChild(element);
  return element;
};

const gate = (
  fields: Partial<GateInstanceLike> & { readonly id: string },
): GateInstanceLike => ({
  kind: "Can",
  policy: readPolicy,
  state: "Allowed",
  ...fields,
});

describe("the two views, side by side", () => {
  it("says where live guards come from when none were handed in", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked })} />);
    assert.include(
      screen.getByTestId("qadi-gates-absent").textContent ?? "",
      "atoms.gates, from @qadi/react",
    );
  });

  it("names the OTHER fix when the prop is present but empty", () => {
    // Two different missing props with two different fixes. A single message
    // would send half its readers to the wrong file.
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [] })} />);
    assert.include(screen.getByTestId("qadi-gates-absent").textContent ?? "", "instrument");
  });

  it("no longer claims a per-instance count would be invented", () => {
    // The sentence this screen used to end on. It was scoped on that belief and
    // the belief was narrower than it read.
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a" })] })} />);
    const note = screen.getByTestId("qadi-keying-note").textContent ?? "";

    assert.include(note, "per question");
    assert.notInclude(note, "would be invented");
    // Both halves said: the row count is questions, the nested count is
    // components, and they are different numbers on purpose.
    assert.include(note, "underneath");
  });

  it("lists each guard asking a question, with what it rendered", () => {
    render(
      <QuestionsPanel diagnostics={liveNotice}
        {...panelInput({ questions: asked, gates: [gate({ id: "a" }), gate({ id: "b", state: "Denied" })] })}
      />,
    );

    const rows = screen.getAllByTestId("qadi-instance");
    assert.strictEqual(rows.length, 2);
    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-instance-state").map((one) => one.textContent),
      ["Allowed", "Denied"],
    );
  });

  it("SHOWS A DENIAL AND A FAILURE DIFFERENTLY (INV-QD-006)", () => {
    // A failed guard never got an answer; drawing it like a denied one tells the
    // reader their policy refused when it never ran.
    render(
      <QuestionsPanel diagnostics={liveNotice}
        {...panelInput({ questions: asked, gates: [gate({ id: "a", state: "Denied" }), gate({ id: "b", state: "Failed" })] })}
      />,
    );

    const [denied, failed] = screen.getAllByTestId("qadi-instance-state");
    assert.strictEqual(denied?.textContent, "Denied");
    assert.strictEqual(failed?.textContent, "Failed");
    assert.notStrictEqual(denied?.style.color, failed?.style.color);
  });

  it("KEEPS ONE ROW PER QUESTION while listing two guards", () => {
    // BEH-QD-217's surviving requirement. Ten gates on one policy are one atom,
    // and the panel must not claim otherwise at the question level.
    render(
      <QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a" }), gate({ id: "b" })] })} />,
    );
    assert.strictEqual(screen.getAllByTestId("qadi-question").length, 1);
    assert.strictEqual(screen.getAllByTestId("qadi-instance").length, 2);
  });

  it("says a question is asked with nothing mounted, rather than looking broken", () => {
    // A component that asked and unmounted leaves its question behind in the
    // atom layer. Real and common, not an error.
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", policy: isAdmin })] })} />);
    assert.include(
      screen.getByTestId("qadi-question-unmounted").textContent ?? "",
      "nothing mounted",
    );
  });
});

describe("a registry that could not be read", () => {
  // The snapshot the model gives while the registry throws: a view, no guards and rows with no claim.
  const snapshot: QuestionsSnapshot = {
    gates: GatesView.Failed({ reason: "registry exploded" }),
    questions: QuestionsView.Rows({
      rows: [{ question: { policy: readPolicy }, asking: undefined }],
    }),
    instances: [],
  };
  const unreadable = {
    questions: { subscribe: () => () => {}, getSnapshot: () => snapshot },
    lens: makeLensSession(),
  };

  it("says it, with the reason, and offers no pick", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...unreadable} />);
    const note = screen.getByTestId("qadi-gates-failed");

    assert.include(note.textContent ?? "", "registry exploded");
    assert.include(note.textContent ?? "", "who is asking cannot be shown");
    assert.isNull(screen.queryByTestId("qadi-gates-absent"));
    assert.isNull(screen.queryByTestId("qadi-pick"));
  });

  it("keeps the question and claims nothing about who is asking", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...unreadable} />);

    assert.strictEqual(screen.getAllByTestId("qadi-question").length, 1);
    assert.isNull(screen.queryByTestId("qadi-question-unmounted"));
    assert.isNull(screen.queryByTestId("qadi-highlight"));
    assert.isNull(screen.queryByTestId("qadi-instance"));
  });
});

describe("questions that could not be read", () => {
  const failedQuestions = (reason: string, gates: GatesView): ReturnType<typeof render> => {
    const snapshot: QuestionsSnapshot = {
      gates,
      questions: QuestionsView.Failed({ reason }),
      instances: gates._tag === "Listed" ? [gate({ id: "a" })] : [],
    };
    return render(
      <QuestionsPanel
        diagnostics={liveNotice}
        questions={{ subscribe: () => () => {}, getSnapshot: () => snapshot }}
        lens={makeLensSession()}
      />,
    );
  };

  it("questions that could not be read: the paragraph, alone, with the reason", () => {
    failedQuestions("Error: questions down", GatesView.Listed());
    const note = screen.getByTestId("qadi-questions-failed");

    assert.strictEqual(
      note.textContent,
      "The questions handed to the dock threw, so what has been asked cannot be shown: Error: questions down",
    );
    assert.deepStrictEqual(note.getAttributeNames().sort(), ["data-testid", "style"]);
    assert.isNull(screen.queryByTestId("qadi-question-block"));
    assert.isNotNull(screen.queryByTestId("qadi-pick"));
  });

  it("both failures are stated, the registry's first", () => {
    failedQuestions("questions down", GatesView.Failed({ reason: "registry down" }));
    const gates = screen.getByTestId("qadi-gates-failed");
    const questions = screen.getByTestId("qadi-questions-failed");

    assert.strictEqual(
      gates.compareDocumentPosition(questions) & Node.DOCUMENT_POSITION_FOLLOWING,
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    assert.strictEqual(gates.getAttribute("style"), questions.getAttribute("style"));
  });

  it("a reason is shown as text", () => {
    failedQuestions("<b>x</b>", GatesView.Listed());
    const note = screen.getByTestId("qadi-questions-failed");

    assert.isNull(note.querySelector("b"));
    assert.include(note.textContent ?? "", "<b>x</b>");
  });
});

describe("highlight — the panel points at the page", () => {
  it("offers a highlight naming how many it can point at", () => {
    render(
      <QuestionsPanel diagnostics={liveNotice}
        {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() }), gate({ id: "b", element: marker() })] })}
      />,
    );
    assert.include(screen.getByTestId("qadi-highlight").textContent ?? "", "2");
  });

  it("draws an overlay per locatable guard", () => {
    render(
      <QuestionsPanel diagnostics={liveNotice}
        {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() }), gate({ id: "b", element: marker() })] })}
      />,
    );

    act(() => {
      screen.getByTestId("qadi-highlight").click();
    });
    assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 2);
  });

  it("counts only what it can point at", () => {
    // A hook is enumerable and not locatable. Counting it would promise a
    // highlight that cannot happen.
    render(
      <QuestionsPanel diagnostics={liveNotice}
        {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() }), gate({ id: "b", kind: "useCan" })] })}
      />,
    );
    assert.include(screen.getByTestId("qadi-highlight").textContent ?? "", "1");
  });

  it("REFUSES THE HIGHLIGHT where only hooks are asking, and says why", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", kind: "useCan" })] })} />);
    const control = screen.getByTestId<HTMLButtonElement>("qadi-highlight");

    // Disabled rather than absent, and with the reason on it: a button that
    // silently did nothing is the outcome this avoids.
    assert.isTrue(control.disabled);
    assert.include(control.getAttribute("title") ?? "", "no element");
  });

  it("says beside each hook that it has no element", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", kind: "useCan" })] })} />);
    assert.isDefined(screen.getByTestId("qadi-instance-unlocatable"));
  });

  it("removes its overlays when the panel unmounts", () => {
    const view = render(
      <QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() })] })} />,
    );
    act(() => {
      screen.getByTestId("qadi-highlight").click();
    });
    assert.isAbove(document.querySelectorAll("[data-qadi-lens]").length, 0);

    view.unmount();
    // A dock that left overlays behind would deface the page it was debugging.
    assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 0);
  });
});

describe("pick — the page points at the panel", () => {
  const pointingAt = (element: Element | null) => {
    const original = document.elementFromPoint;
    document.elementFromPoint = () => element;
    return () => {
      document.elementFromPoint = original;
    };
  };

  it("offers picking only when there are guards to pick", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [] })} />);
    assert.isNull(screen.queryByTestId("qadi-pick"));
  });

  it("enters and announces the mode", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() })] })} />);

    act(() => {
      screen.getByTestId("qadi-pick").click();
    });
    // Names the two exits, because a debugging mode that can be entered and not
    // left makes the page unusable until it is reloaded.
    assert.include(screen.getByTestId("qadi-pick").textContent ?? "", "Escape");
  });

  it("highlights whatever the pointer is over", () => {
    const element = marker();
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element })] })} />);
    const restore = pointingAt(element);

    try {
      act(() => {
        screen.getByTestId("qadi-pick").click();
      });
      act(() => {
        fireEvent.pointerMove(document, { clientX: 5, clientY: 5 });
      });
      assert.strictEqual(document.querySelectorAll("[data-qadi-lens]").length, 1);
    } finally {
      restore();
    }
  });

  it("SELECTS THE ROW and leaves the mode on a pick", () => {
    const element = marker();
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element })] })} />);
    const restore = pointingAt(element);

    try {
      act(() => {
        screen.getByTestId("qadi-pick").click();
      });
      act(() => {
        fireEvent.click(document, { clientX: 5, clientY: 5 });
      });

      assert.strictEqual(
        screen.getByTestId("qadi-instance").getAttribute("data-qadi-picked"),
        "true",
      );
      assert.notInclude(screen.getByTestId("qadi-pick").textContent ?? "", "Escape");
    } finally {
      restore();
    }
  });

  it("SWALLOWS THE CLICK, so picking a button does not press it", () => {
    // A lens that let the click through would activate the very control it was
    // asked to identify.
    const element = marker();
    let pressed = 0;
    element.addEventListener("click", () => {
      pressed += 1;
    });

    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element })] })} />);
    const restore = pointingAt(element);

    try {
      act(() => {
        screen.getByTestId("qadi-pick").click();
      });
      act(() => {
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      assert.strictEqual(pressed, 0);
    } finally {
      restore();
    }
  });

  it("lets a click through where it hit no guard, so the dock keeps working", () => {
    const stray = document.createElement("p");
    document.body.appendChild(stray);
    let pressed = 0;
    stray.addEventListener("click", () => {
      pressed += 1;
    });

    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() })] })} />);
    const restore = pointingAt(stray);

    try {
      act(() => {
        screen.getByTestId("qadi-pick").click();
      });
      act(() => {
        stray.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      assert.strictEqual(pressed, 1);
    } finally {
      restore();
    }
  });

  it("leaves the mode on Escape", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element: marker() })] })} />);

    act(() => {
      screen.getByTestId("qadi-pick").click();
    });
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    assert.notInclude(screen.getByTestId("qadi-pick").textContent ?? "", "Escape —");
  });

  it("stops listening when the panel unmounts", () => {
    const element = marker();
    let pressed = 0;
    element.addEventListener("click", () => {
      pressed += 1;
    });

    const view = render(
      <QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: asked, gates: [gate({ id: "a", element })] })} />,
    );
    const restore = pointingAt(element);

    try {
      act(() => {
        screen.getByTestId("qadi-pick").click();
      });
      view.unmount();
      act(() => {
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
      });
      // A dock that kept swallowing clicks after unmounting would break the page.
      assert.strictEqual(pressed, 1);
    } finally {
      restore();
    }
  });
});
