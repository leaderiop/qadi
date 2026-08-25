"use client";
/**
 * Screen 4 — the role viewer.
 *
 * Inheritance as an indented tree, and every permission with the path that
 * granted it: own permissions tinted, inherited ones dimmed and marked
 * *via …*. The set shown is `permissionProvenance`'s, which INV-QD-038 holds
 * equal to `flattenPermissions`' — so this screen cannot display a different
 * permission set from the one that decides.
 *
 * **No "acyclic ✓".** A cycle is only representable through name-referenced
 * `RoleDefinition[]`, which `resolveRoleGraph` rejects; a by-value `Role`
 * cannot express one at all (ADR-QD-015). Showing a tick here would be a
 * reassurance about a check that never ran, which is worse than showing
 * nothing.
 */
import { useState, type CSSProperties, type FC } from "react";
import type { Role } from "@qadi/core";
import { grantPath, roleSummary, type RoleNode } from "../model/RoleTree.ts";
import { button, colors, font, muted } from "./theme.ts";

export interface RoleViewerProps {
  readonly roles: ReadonlyArray<Role>;
  /**
   * Parent names `resolveRoleGraph` dropped because no definition supplied them.
   *
   * Surfaced because dropping is right and doing it silently was not: a typo in
   * one parent name produces a role granting fewer permissions than its author
   * wrote.
   */
  readonly unknownParents?: ReadonlyArray<string>;
}

const chip = (own: boolean): CSSProperties => ({
  color: own ? colors.allow : colors.textMuted,
  fontSize: font.sizeSmall,
});

export const RoleViewer: FC<RoleViewerProps> = ({ roles, unknownParents }) => {
  const [selected, setSelected] = useState(0);
  const role = roles[selected];

  if (role === undefined) {
    return (
      <p style={{ ...muted, padding: 16 }} data-testid="qadi-roles-empty">
        No roles to show. A role is a value your application holds, not something
        the log can observe — pass one through the <code>catalogue</code> prop.
      </p>
    );
  }

  const summary = roleSummary(role);

  return (
    <div style={{ padding: 12 }} data-testid="qadi-roles">
      {roles.length === 1 ? null : (
        <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
          {roles.map((candidate, index) => (
            <button
              key={candidate.name}
              type="button"
              data-testid="qadi-role-chip"
              style={button(index === selected)}
              onClick={() => setSelected(index)}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 8 }} data-testid="qadi-role-counts">
        <strong>{role.name}</strong>
        <span style={{ ...muted, marginLeft: 8 }}>
          {summary.ownCount} own · {summary.inheritedCount} inherited
        </span>
      </div>

      {unknownParents === undefined || unknownParents.length === 0 ? null : (
        <p style={{ color: colors.error }} data-testid="qadi-unknown-parents">
          ⚠ dropped unknown parent{unknownParents.length === 1 ? "" : "s"}:{" "}
          {unknownParents.join(", ")} — those roles grant less than their author wrote.
        </p>
      )}

      <Branch node={summary.tree} depth={0} />

      <div style={{ marginTop: 10 }}>
        <div
          style={{
            ...muted,
            fontSize: font.sizeSmall,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 4,
          }}
        >
          permissions
        </div>
        {summary.grants.map((grant) => (
          <div key={grant.permission} data-testid="qadi-grant">
            <span style={chip(grant.path.length === 1)}>{grant.permission}</span>
            <span style={{ ...muted, marginLeft: 8, fontSize: font.sizeSmall }}>
              {grantPath(grant)}
            </span>
          </div>
        ))}
      </div>

      {/* Stated rather than implied by the absence of a tick. */}
      <p style={{ ...muted, fontSize: font.sizeSmall, marginBottom: 0 }} data-testid="qadi-cycle-note">
        A by-value role cannot express a cycle, so there is no cycle check to
        report here. Cycles are only representable through name-referenced
        definitions, and `resolveRoleGraph` refuses those.
      </p>
    </div>
  );
};

const Branch: FC<{ readonly node: RoleNode; readonly depth: number }> = ({ node, depth }) => (
  <div data-testid="qadi-role-node" data-role={node.name} data-repeated={node.repeated}>
    <div style={{ paddingLeft: depth * 14 }}>
      <span>{node.name}</span>
      {node.own.length === 0 ? null : (
        <span style={{ ...muted, marginLeft: 6, fontSize: font.sizeSmall }}>
          {node.own.length} own
        </span>
      )}
      {node.repeated ? (
        // A diamond's second arm. The structure is real; the permissions under
        // it were already counted once, and a reader summing the rows would
        // otherwise double-count.
        <span style={{ ...muted, marginLeft: 6 }} data-testid="qadi-role-repeated">
          already reached above
        </span>
      ) : null}
    </div>
    {node.children.map((child) => (
      <Branch key={child.path} node={child} depth={depth + 1} />
    ))}
  </div>
);
