/**
 * JOB 5 ledger — E5.1 … E5.7.
 *
 * The rescoping is the feature. `Atom.family` keys structurally, so ten
 * `<Can policy={isAdmin}>` in different places are one atom; a panel listing
 * ten rows would invent a distinction the architecture does not have. This one
 * lists questions, says so, and never claims a per-instance count.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { hasPermission, hasRole, permission } from "@qadi/core";
import { QuestionsPanel } from "../../src/react/QuestionsPanel.tsx";
import type { AskedQuestionLike } from "../../src/react/QuestionsPanel.tsx";

afterEach(() => {
  document.body.innerHTML = "";
});

const read = permission("doc", "read");

describe("the questions panel", () => {
  // E5.1 — an empty state that explains, rather than a blank panel.
  it("with no atom set, says where questions come from", () => {
    render(<QuestionsPanel questions={undefined} />);
    assert.include(screen.getByTestId("qadi-questions-absent").textContent ?? "", "asked()");
  });

  it("with an atom set that has been asked nothing, says so differently", () => {
    render(<QuestionsPanel questions={[]} />);
    // A different fact from "no atom set": one is unwired, the other is idle.
    assert.include(screen.getByTestId("qadi-questions-empty").textContent ?? "", "Nothing has been asked");
    assert.isNull(screen.queryByTestId("qadi-questions-absent"));
  });

  // E5.4 — stated up front, because a reader counting rows against their
  // component tree would otherwise conclude the panel is broken.
  it("explains the keying before showing anything", () => {
    render(<QuestionsPanel questions={[]} />);
    const note = screen.getByTestId("qadi-keying-note").textContent ?? "";

    assert.include(note, "per question");
    assert.include(note, "one atom");
    // "instance" appears exactly once and only to disclaim it: the panel must
    // never *claim* a per-instance count, and saying so is how a reader stops
    // looking for one.
    assert.include(note, "a per-instance count would be invented");
  });

  it("lists one row per question", () => {
    const questions: ReadonlyArray<AskedQuestionLike> = [
      { policy: hasPermission(read) },
      { policy: hasRole("editor") },
    ];
    render(<QuestionsPanel questions={questions} />);

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
    render(<QuestionsPanel questions={questions} />);

    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-question-scope").map((s) => s.textContent),
      ["no resource", "invoice-42"],
    );
  });

  it("names a resource by its keys when it has no id", () => {
    render(
      <QuestionsPanel
        questions={[{ policy: hasPermission(read), resource: { tenantId: "acme", stage: "draft" } }]}
      />,
    );
    assert.strictEqual(
      screen.getByTestId("qadi-question-scope").textContent,
      "tenantId, stage",
    );
  });

  describe("hydration", () => {
    // E5.7 — one number is obtainable; the others are named as not.
    it("reports mismatches when a reporter is wired", () => {
      render(<QuestionsPanel questions={[]} hydrationMismatches={2} />);
      const text = screen.getByTestId("qadi-hydration-mismatches").textContent ?? "";

      assert.include(text, "2 mismatches");
      assert.include(text, "no longer holds client-side");
    });

    it("reads naturally for a single mismatch", () => {
      render(<QuestionsPanel questions={[]} hydrationMismatches={1} />);
      assert.include(screen.getByTestId("qadi-hydration-mismatches").textContent ?? "", "1 mismatch");
      assert.notInclude(
        screen.getByTestId("qadi-hydration-mismatches").textContent ?? "",
        "1 mismatches",
      );
    });

    it("says when no reporter is wired, rather than showing zero", () => {
      render(<QuestionsPanel questions={[]} />);
      // Zero would claim there were no mismatches; there is simply nobody
      // counting.
      assert.isNotNull(screen.getByTestId("qadi-hydration-unwired"));
      assert.isNull(screen.queryByTestId("qadi-hydration-mismatches"));
    });

    it("names the counts that are not obtainable", () => {
      render(<QuestionsPanel questions={[]} />);
      const limits = screen.getByTestId("qadi-hydration-limits").textContent ?? "";

      assert.include(limits, "not obtainable");
      assert.include(limits, "does not retain them");
    });
  });

  describe("invalidate", () => {
    // E5.6 — absent, not inert.
    it("offers no button when no handler was supplied", () => {
      render(<QuestionsPanel questions={[]} />);
      assert.isNull(screen.queryByTestId("qadi-invalidate"));
    });

    it("calls the handler it was given", async () => {
      let invalidated = 0;
      render(<QuestionsPanel questions={[]} onInvalidate={() => (invalidated += 1)} />);

      await act(async () => {
        screen.getByTestId("qadi-invalidate").click();
      });
      assert.strictEqual(invalidated, 1);
    });
  });
});
