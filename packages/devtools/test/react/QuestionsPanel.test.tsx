/**
 * JOB 5 ledger — E5.1 … E5.7: what the panel says has been **asked**.
 *
 * `Atom.family` keys structurally, so ten `<Can policy={isAdmin}>` in different
 * places are one atom, and one row is what this view must show for them. That
 * has not changed and is still asserted here.
 *
 * What changed is the conclusion drawn from it. A second view lists the guards
 * asking each question, and it lives in `QuestionsPanel.gates.test.tsx` — kept apart
 * deliberately, because the failure worth catching is one view silently
 * replacing the other.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render, screen } from "@testing-library/react";
import { hasPermission, hasRole } from "@qadi/core";
import { HydrationView } from "../../src/model/HydrationView.ts";
import type { ReadableStore } from "../../src/model/ExternalStore.ts";
import { QuestionsPanel } from "../../src/react/QuestionsPanel.tsx";
import type { AskedQuestionLike } from "../../src/react/QuestionsPanel.tsx";
import { liveNotice, read } from "../helpers.ts";
import { panelInput } from "./questionsPanelInput.ts";

describe("the questions panel", () => {
  // E5.1 — an empty state that explains, rather than a blank panel.
  it("with no atom set, says where questions come from", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: undefined })} />);
    assert.include(screen.getByTestId("qadi-questions-absent").textContent ?? "", "asked()");
  });

  it("with an atom set that has been asked nothing, says so differently", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: [] })} />);
    // A different fact from "no atom set": one is unwired, the other is idle.
    assert.include(screen.getByTestId("qadi-questions-empty").textContent ?? "", "Nothing has been asked");
    assert.isNull(screen.queryByTestId("qadi-questions-absent"));
  });

  // E5.4 — stated up front, because a reader counting rows against their
  // component tree would otherwise conclude the panel is broken.
  it("explains the keying before showing anything", () => {
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: [] })} />);
    const note = screen.getByTestId("qadi-keying-note").textContent ?? "";

    assert.include(note, "per question");
    assert.include(note, "one atom");
    // This assertion used to require the sentence "a per-instance count would
    // be invented", which was the screen's original scoping and is now wrong:
    // a per-instance view exists and is listed underneath (ADR-QD-053). What
    // still has to be said is what a *row* counts, because that is what a
    // reader compares against their component tree.
    assert.include(note, "that is what the evaluator sees");
    assert.notInclude(note, "would be invented");
  });

  it("lists one row per question", () => {
    const questions: ReadonlyArray<AskedQuestionLike> = [
      { policy: hasPermission(read) },
      { policy: hasRole("editor") },
    ];
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions })} />);

    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-question").map((q) => q.textContent?.split("no resource")[0]),
      ["doc:read", "editor"],
    );
  });

  // E5.3 — the same policy with and without a resource are two questions.
  it("separates a question with a resource from one without", () => {
    const questions: ReadonlyArray<AskedQuestionLike> = [
      { policy: hasPermission(read) },
      { policy: hasPermission(read), resource: { id: "invoice-42" } },
    ];
    render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions })} />);

    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-question-scope").map((s) => s.textContent),
      ["no resource", "invoice-42"],
    );
  });

  it("names a resource by its keys when it has no id", () => {
    render(
      <QuestionsPanel diagnostics={liveNotice}
        {...panelInput({ questions: [{ policy: hasPermission(read), resource: { tenantId: "acme", stage: "draft" } }] })}
      />,
    );
    assert.strictEqual(
      screen.getByTestId("qadi-question-scope").textContent,
      "tenantId, stage",
    );
  });

  describe("hydration, with nothing read", () => {
    it("says when nothing is wired, rather than showing zero", () => {
      render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: [] })} />);
      // Zero would claim there were no mismatches; there is simply nobody
      // counting. And it names the fix, which is a real one.
      const text = screen.getByTestId("qadi-hydration-unwired").textContent ?? "";
      assert.include(text, "hydrationActivity");
      assert.include(text, "needs no wiring");
    });
  });

  describe("hydration, rendered from its view", () => {
    // The view is written out by hand, as `questionsPanelInput.ts` writes out its snapshot: a
    // panel test that built it with `hydrationView` would take a defect there as input. The
    // drops are tagged literals for the same reason, and `HydrationView.Counts` types them.
    const storeOf = (view: HydrationView): ReadableStore<HydrationView> => ({
      subscribe: () => () => {},
      getSnapshot: () => view,
    });

    it("renders a view still waiting for its first sample as no counts read yet", () => {
      render(
        <QuestionsPanel diagnostics={liveNotice}
          {...panelInput({ questions: [] })}
          hydration={storeOf(HydrationView.Pending())}
        />,
      );

      assert.strictEqual(screen.getByTestId("qadi-hydration-pending").textContent, "no counts read yet.");
      assert.isNull(screen.queryByTestId("qadi-hydration-unwired"));
    });

    it("renders an unwired view with the fix it names", () => {
      render(
        <QuestionsPanel diagnostics={liveNotice}
          {...panelInput({ questions: [] })}
          hydration={storeOf(HydrationView.Unwired())}
        />,
      );

      assert.strictEqual(
        screen.getByTestId("qadi-hydration-unwired").textContent,
        "no counts read. Pass diagnostics={{}} to sample them, or hydration — the result of hydrationActivity, which needs no wiring — to fill this in.",
      );
      assert.isNull(screen.queryByTestId("qadi-hydration-pending"));
    });

    it("renders the four counts, the rate, each raised drop and the scope under their test ids", () => {
      render(
        <QuestionsPanel diagnostics={liveNotice}
          {...panelInput({ questions: [] })}
          hydration={storeOf(
            HydrationView.Counts({
              dehydrated: 12,
              seeded: 10,
              rechecked: 8,
              mismatched: 1,
              rate: "1 of 8 re-checked questions disagreed with the server.",
              drops: {
                _tag: "Raised",
                rows: [{ reason: "UndecodablePolicy", count: 2, meaning: "usually version skew" }],
              },
              scope: "Process-wide totals, not this page's. 2 dehydrated entries have no seeding counted in this process.",
            }),
          )}
        />,
      );

      assert.strictEqual(screen.getByTestId("qadi-hydration-dehydrated").textContent, "12dehydrated");
      assert.strictEqual(screen.getByTestId("qadi-hydration-seeded").textContent, "10seeded");
      assert.strictEqual(screen.getByTestId("qadi-hydration-rechecked").textContent, "8re-checked");
      assert.strictEqual(screen.getByTestId("qadi-hydration-mismatched").textContent, "1mismatched");
      assert.strictEqual(
        screen.getByTestId("qadi-hydration-rate").textContent,
        "1 of 8 re-checked questions disagreed with the server.",
      );
      assert.deepStrictEqual(
        screen.getAllByTestId("qadi-hydration-drop").map((drop) => drop.textContent),
        ["2UndecodablePolicy— usually version skew"],
      );
      assert.isNull(screen.queryByTestId("qadi-hydration-no-drops"));
      assert.strictEqual(
        screen.getByTestId("qadi-hydration-scope").textContent,
        "Process-wide totals, not this page's. 2 dehydrated entries have no seeding counted in this process.",
      );
    });

    it("renders a counts view with no rate as nothing dropped, without a rate line", () => {
      render(
        <QuestionsPanel diagnostics={liveNotice}
          {...panelInput({ questions: [] })}
          hydration={storeOf(
            HydrationView.Counts({
              dehydrated: 0,
              seeded: 3,
              rechecked: 0,
              mismatched: 0,
              rate: undefined,
              drops: { _tag: "None", text: "Nothing was dropped. All 1 reasons are watched." },
              scope: "Process-wide totals, not this page's. This process seeded more than it built, so it is a client reading payloads rendered elsewhere.",
            }),
          )}
        />,
      );

      assert.isNull(screen.queryByTestId("qadi-hydration-rate"));
      assert.isNull(screen.queryByTestId("qadi-hydration-drops"));
      assert.strictEqual(
        screen.getByTestId("qadi-hydration-no-drops").textContent,
        "Nothing was dropped. All 1 reasons are watched.",
      );
    });

    it("renders each drop's reason as text", () => {
      render(
        <QuestionsPanel diagnostics={liveNotice}
          {...panelInput({ questions: [] })}
          hydration={storeOf(
            HydrationView.Counts({
              dehydrated: 0,
              seeded: 0,
              rechecked: 0,
              mismatched: 0,
              rate: undefined,
              drops: {
                _tag: "Raised",
                rows: [{ reason: "<b>bold</b>", count: 1, meaning: "<i>meaning</i>" }],
              },
              scope: "",
            }),
          )}
        />,
      );

      const drop = screen.getByTestId("qadi-hydration-drop");
      assert.strictEqual(drop.textContent, "1<b>bold</b>— <i>meaning</i>");
      assert.strictEqual(drop.querySelector("b, i"), null);
    });
  });

  describe("invalidate", () => {
    // E5.6 — absent, not inert.
    it("offers no button when no handler was supplied", () => {
      render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: [] })} />);
      assert.isNull(screen.queryByTestId("qadi-invalidate"));
    });

    it("calls the handler it was given", async () => {
      let invalidated = 0;
      render(<QuestionsPanel diagnostics={liveNotice} {...panelInput({ questions: [] })} onInvalidate={() => (invalidated += 1)} />);

      await act(async () => {
        screen.getByTestId("qadi-invalidate").click();
      });
      assert.strictEqual(invalidated, 1);
    });
  });
});
