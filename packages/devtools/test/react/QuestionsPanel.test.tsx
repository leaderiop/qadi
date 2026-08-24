/**
 * JOB 5 ledger — E5.1 … E5.7: what the panel says has been **asked**.
 *
 * `Atom.family` keys structurally, so ten `<Can policy={isAdmin}>` in different
 * places are one atom, and one row is what this view must show for them. That
 * has not changed and is still asserted here.
 *
 * What changed is the conclusion drawn from it. A second view lists the guards
 * asking each question, and it lives in `GatesPanel.test.tsx` — kept apart
 * deliberately, because the failure worth catching is one view silently
 * replacing the other.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { hasPermission, hasRole, permission } from "@qadi/core";
import type { HydrationActivity } from "../../src/model/Hydration.ts";
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

  describe("hydration, counted by the host", () => {
    // The shape from before anything counted for itself. Kept working, and
    // superseded by `hydration` below.
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

    it("says when nothing is wired, rather than showing zero", () => {
      render(<QuestionsPanel questions={[]} />);
      // Zero would claim there were no mismatches; there is simply nobody
      // counting. And it names the fix, which is now a real one.
      const text = screen.getByTestId("qadi-hydration-unwired").textContent ?? "";
      assert.include(text, "hydrationActivity");
      assert.include(text, "needs no wiring");
      assert.isNull(screen.queryByTestId("qadi-hydration-mismatches"));
    });
  });

  describe("hydration, read from the metrics", () => {
    const reading = (fields: Partial<HydrationActivity>): HydrationActivity => ({
      dehydrated: 0,
      seeded: 0,
      rechecked: 0,
      mismatched: 0,
      drops: [],
      ...fields,
    });

    it("shows all four counts", () => {
      render(
        <QuestionsPanel
          questions={[]}
          hydration={reading({ dehydrated: 12, seeded: 10, rechecked: 8, mismatched: 1 })}
        />,
      );

      assert.include(screen.getByTestId("qadi-hydration-dehydrated").textContent ?? "", "12");
      assert.include(screen.getByTestId("qadi-hydration-seeded").textContent ?? "", "10");
      assert.include(screen.getByTestId("qadi-hydration-rechecked").textContent ?? "", "8");
      assert.include(screen.getByTestId("qadi-hydration-mismatched").textContent ?? "", "1");
    });

    it("supersedes a host-counted mismatch rather than showing both", () => {
      // Both count the same thing, so showing both invites a reader to
      // reconcile one number with itself.
      render(
        <QuestionsPanel
          questions={[]}
          hydration={reading({ rechecked: 3, mismatched: 1 })}
          hydrationMismatches={1}
        />,
      );
      assert.isNull(screen.queryByTestId("qadi-hydration-mismatches"));
      assert.isNotNull(screen.getByTestId("qadi-hydration-mismatched"));
    });

    it("states the rate where anything was re-checked", () => {
      render(<QuestionsPanel questions={[]} hydration={reading({ rechecked: 4, mismatched: 1 })} />);
      assert.include(screen.getByTestId("qadi-hydration-rate").textContent ?? "", "1 of 4");
    });

    it("offers no rate where nothing was re-checked", () => {
      // "0 of 0 disagreed" is a sentence about nothing.
      render(<QuestionsPanel questions={[]} hydration={reading({ seeded: 3 })} />);
      assert.isNull(screen.queryByTestId("qadi-hydration-rate"));
    });

    it("says nothing was dropped, rather than leaving it blank", () => {
      render(
        <QuestionsPanel
          questions={[]}
          hydration={reading({
            seeded: 3,
            drops: [{ reason: "ForeignSubject", count: 0, meaning: "mixed payload" }],
          })}
        />,
      );
      // An empty area reads as "not implemented"; this reads as "watched, and
      // clean", which is the finding.
      assert.include(screen.getByTestId("qadi-hydration-no-drops").textContent ?? "", "Nothing was dropped");
      assert.isNull(screen.queryByTestId("qadi-hydration-drops"));
    });

    it("lists only the reasons that fired, with what each means", () => {
      render(
        <QuestionsPanel
          questions={[]}
          hydration={reading({
            drops: [
              { reason: "ForeignSubject", count: 0, meaning: "mixed payload" },
              { reason: "UndecodablePolicy", count: 2, meaning: "usually version skew" },
            ],
          })}
        />,
      );

      const rows = screen.getAllByTestId("qadi-hydration-drop").map((row) => row.textContent ?? "");
      assert.strictEqual(rows.length, 1);
      assert.include(rows[0] ?? "", "UndecodablePolicy");
      // The meaning, not just the count — a number alone is not a diagnosis.
      assert.include(rows[0] ?? "", "version skew");
    });

    it("says the totals are process-wide before a reader subtracts them", () => {
      render(<QuestionsPanel questions={[]} hydration={reading({ dehydrated: 10, seeded: 4 })} />);
      const scope = screen.getByTestId("qadi-hydration-scope").textContent ?? "";

      assert.include(scope, "Process-wide");
      assert.include(scope, "6 dehydrated entries");
    });

    it("does not report a negative shortfall in a browser", () => {
      // A client seeds from payloads it did not build, so this is the ordinary
      // case there rather than a fault to hunt.
      render(<QuestionsPanel questions={[]} hydration={reading({ dehydrated: 0, seeded: 4 })} />);
      const scope = screen.getByTestId("qadi-hydration-scope").textContent ?? "";

      assert.include(scope, "seeded more than it built");
      assert.notInclude(scope, "-4");
    });

    it("reads naturally for a shortfall of one", () => {
      render(<QuestionsPanel questions={[]} hydration={reading({ dehydrated: 1, seeded: 0 })} />);
      assert.include(screen.getByTestId("qadi-hydration-scope").textContent ?? "", "1 dehydrated entry ");
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
