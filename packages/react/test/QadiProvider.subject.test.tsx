/**
 * The provider's subject reaches every gate, whenever it mounts.
 *
 * The registry removes a node nothing holds one macrotask after it is created, and
 * only gates hold the subject. A gate that mounted after a quiet macrotask, or
 * under an Activity hidden and shown below the provider, used to find no subject
 * and stayed pending. Each case waits a real turn between steps because the
 * removal is a real macrotask no test clock controls, and observes the rendered
 * gate rather than the subject atom.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { Activity } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Can, QadiProvider, makeQadiAtoms } from "../src/index.ts";
import { settle } from "./support/settle.ts";

const canRead = hasPermission(permission("doc", "read"));
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const nobody: AuthSubject = makeSubject({ id: "u2" });

const turn = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

describe("the provider's subject after a quiet macrotask", () => {
  it("SUBJ1 a provider outside a hidden-then-shown Activity keeps its subject for the gate below", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const ui = (mode: "visible" | "hidden") => (
      <QadiProvider atoms={atoms} subject={reader}>
        <Activity mode={mode}>
          <Can policy={canRead} pending="pending">
            allowed
          </Can>
        </Activity>
      </QadiProvider>
    );

    const { rerender } = render(ui("visible"));
    await settle();
    await turn();
    rerender(ui("hidden"));
    await settle();
    await turn();
    rerender(ui("visible"));
    await settle();
    await turn();

    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("SUBJ2 a gate mounted a macrotask after the provider still sees its subject", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const ui = (withGate: boolean) => (
      <QadiProvider atoms={atoms} subject={reader}>
        {withGate ? (
          <Can policy={canRead} pending="pending">
            allowed
          </Can>
        ) : null}
      </QadiProvider>
    );

    const { rerender } = render(ui(false));
    await settle();
    await turn();
    rerender(ui(true));
    await settle();
    await turn();

    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("SUBJ3 a subject changed while no gate is mounted reaches the next gate", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const ui = (subject: AuthSubject, withGate: boolean) => (
      <QadiProvider atoms={atoms} subject={subject}>
        {withGate ? (
          <Can policy={canRead} pending="pending">
            allowed
          </Can>
        ) : null}
      </QadiProvider>
    );

    const { rerender } = render(ui(nobody, true));
    await settle();
    rerender(ui(nobody, false));
    await turn();
    rerender(ui(reader, false));
    await settle();
    await turn();
    rerender(ui(reader, true));
    await settle();
    await turn();

    expect(screen.getByText("allowed")).toBeDefined();
  });
});
