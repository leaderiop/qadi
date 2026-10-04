/**
 * A seeded denial, rendered through a function fallback.
 *
 * `<Can fallback={(deny) => deny.reason}>` used to show the literal "hydrated"
 * for a denial the server had withheld, because a seed was rebuilt as a `Deny`
 * with a stand-in reason. A seed now says what it is, so a fallback can render
 * "withheld" honestly — and has to narrow before it can read a reason at all.
 */
import { Deny, EvaluationServicesNone, hasRole, makeSubject, makeSubjectId } from "@qadi/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Can, QadiProvider, dehydrateDecisions, hydrateDecisions, isSeeded, makeQadiAtoms } from "../src/index.ts";

const isAdmin = hasRole("admin");
const atoms = makeQadiAtoms(EvaluationServicesNone);
const reader = makeSubject({ id: "u1" });

const serverDeny = new Deny({
  evaluationId: "eval-2",
  subjectId: makeSubjectId("u1"),
  durationMillis: 1,
  trace: {
    policyTag: "HasRole",
    allowed: false,
    reason: "subject lacks role 'admin'",
    children: [],
    obligations: [],
  },
  reason: "subject lacks role 'admin'",
});

afterEach(() => {
  document.body.innerHTML = "";
});

const renderSeeded = (includeTrace: boolean) => {
  const payload = dehydrateDecisions([{ policy: isAdmin, decision: serverDeny }], {
    includeTrace,
  });
  // No subject yet, so the client cannot answer and the seed is what renders.
  render(
    <QadiProvider
      atoms={atoms}
      subject={undefined}
      initialValues={Array.from(hydrateDecisions(atoms, payload, reader))}
    >
      <Can
        policy={isAdmin}
        fallback={(deny) => (
          <span data-testid="why">
            {isSeeded(deny)
              ? deny.disclosure._tag === "Disclosed"
                ? deny.disclosure.reason
                : "withheld"
              : deny.reason}
          </span>
        )}
      >
        admin only
      </Can>
    </QadiProvider>,
  );
};

describe("a seeded denial through a function fallback", () => {
  it("renders the withheld state, never the old stand-in", () => {
    renderSeeded(false);

    const text = screen.getByTestId("why").textContent;
    expect(text).toBe("withheld");
    expect(document.body.innerHTML).not.toContain("hydrated");
  });

  it("renders the server's reason when the server chose to disclose it", () => {
    renderSeeded(true);

    expect(screen.getByTestId("why").textContent).toBe("subject lacks role 'admin'");
  });
});
