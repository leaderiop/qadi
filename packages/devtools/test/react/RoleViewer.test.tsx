/**
 * JOB 3 ledger, rendered half — E3.7, E3.8, E3.9, and the tinting.
 *
 * E3.8 is the one that matters. A cycle is only representable through
 * name-referenced definitions, which `resolveRoleGraph` rejects; a by-value
 * `Role` cannot express one at all. So an "acyclic ✓" here would be a
 * reassurance about a check that never ran — worse than saying nothing, which
 * is why the screen says something else instead.
 */
import { assert, describe, it } from "@effect/vitest";
import { afterEach } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { permission, role } from "@qadi/core";
import { RoleViewer } from "../../src/react/RoleViewer.tsx";

afterEach(() => {
  document.body.innerHTML = "";
});

const read = permission("doc", "read");
const write = permission("doc", "write");
const comment = permission("doc", "comment");

const commenter = role({ name: "commenter", permissions: [comment] });
const viewer = role({ name: "viewer", permissions: [read], inherits: [commenter] });
const editor = role({ name: "editor", permissions: [write], inherits: [viewer] });

const click = async (element: HTMLElement) => {
  await act(async () => {
    element.click();
  });
};

describe("the role viewer", () => {
  // E3.7 — a role is a value the application holds, not something the log sees.
  it("with no roles, says where roles come from", () => {
    render(<RoleViewer roles={[]} />);
    const empty = screen.getByTestId("qadi-roles-empty").textContent ?? "";
    assert.include(empty, "not something the log can observe");
    assert.include(empty, "catalogue");
  });

  it("draws the inheritance chain, indented", () => {
    render(<RoleViewer roles={[editor]} />);

    assert.deepStrictEqual(
      screen.getAllByTestId("qadi-role-node").map((n) => n.getAttribute("data-role")),
      ["editor", "viewer", "commenter"],
    );
  });

  it("counts own against inherited", () => {
    render(<RoleViewer roles={[editor]} />);
    assert.include(screen.getByTestId("qadi-role-counts").textContent ?? "", "1 own · 2 inherited");
  });

  it("marks every permission with where it came from", () => {
    render(<RoleViewer roles={[editor]} />);

    const grants = screen.getAllByTestId("qadi-grant").map((g) => g.textContent ?? "");
    assert.strictEqual(grants.length, 3);
    assert.isTrue(grants.some((g) => g.includes("doc:write") && g.includes("own")));
    assert.isTrue(grants.some((g) => g.includes("doc:read") && g.includes("via viewer")));
    assert.isTrue(
      grants.some((g) => g.includes("doc:comment") && g.includes("via viewer → commenter")),
    );
  });

  it("switches between roles", async () => {
    render(<RoleViewer roles={[editor, commenter]} />);
    assert.include(screen.getByTestId("qadi-role-counts").textContent ?? "", "editor");

    await click(screen.getAllByTestId("qadi-role-chip")[1] ?? fail());
    assert.include(screen.getByTestId("qadi-role-counts").textContent ?? "", "commenter");
    assert.strictEqual(screen.getAllByTestId("qadi-grant").length, 1);
  });

  it("offers no chips when there is only one role to show", () => {
    render(<RoleViewer roles={[editor]} />);
    assert.deepStrictEqual(screen.queryAllByTestId("qadi-role-chip"), []);
  });

  // E3.3, rendered.
  it("marks a diamond's second arm as already reached", () => {
    render(<RoleViewer roles={[role({ name: "both", inherits: [viewer, editor] })]} />);

    const repeated = screen
      .getAllByTestId("qadi-role-node")
      .filter((n) => n.getAttribute("data-repeated") === "true")
      .map((n) => n.getAttribute("data-role"));

    assert.deepStrictEqual(repeated, ["viewer", "commenter"]);
    assert.isNotNull(screen.getAllByTestId("qadi-role-repeated")[0]);
  });

  // E3.9 — dropping is right; doing it silently was not.
  it("surfaces a parent name that was dropped", () => {
    render(<RoleViewer roles={[editor]} unknownParents={["reviewer"]} />);

    const warning = screen.getByTestId("qadi-unknown-parents").textContent ?? "";
    assert.include(warning, "reviewer");
    assert.include(warning, "grant less than their author wrote");
  });

  it("says nothing when no parent was dropped", () => {
    render(<RoleViewer roles={[editor]} unknownParents={[]} />);
    assert.isNull(screen.queryByTestId("qadi-unknown-parents"));

    render(<RoleViewer roles={[commenter]} />);
    assert.isNull(screen.queryByTestId("qadi-unknown-parents"));
  });

  /**
   * E3.8 — the false assurance this screen refuses to give.
   */
  it("claims no cycle check, and explains why there is none to claim", () => {
    render(<RoleViewer roles={[editor]} />);

    const note = screen.getByTestId("qadi-cycle-note").textContent ?? "";
    assert.include(note, "cannot express a cycle");
    // Not "acyclic ✓" anywhere: the check is vacuous for a by-value role, and a
    // tick would report a check that never ran.
    assert.notInclude(screen.getByTestId("qadi-roles").textContent ?? "", "acyclic");
    assert.notInclude(screen.getByTestId("qadi-roles").textContent ?? "", "✓");
  });

  it("a role with no permissions renders its name and nothing more", () => {
    render(<RoleViewer roles={[role({ name: "bare" })]} />);

    assert.strictEqual(screen.getAllByTestId("qadi-role-node").length, 1);
    assert.deepStrictEqual(screen.queryAllByTestId("qadi-grant"), []);
    const node = screen.getAllByTestId("qadi-role-node")[0] ?? fail();
    assert.strictEqual(within(node).queryByText(/own$/), null);
  });
});

const fail = (): never => {
  throw new Error("expected an element");
};
