/**
 * The page frame: who you are, where you can go, and the dock.
 *
 * A Server Component. It reads the session, decides whatever the page asked for,
 * projects the answers into a payload and hands that to the one client component
 * that needs it. Everything guarded below is a client component reading seeded
 * atoms — which is what "no flash" means in practice.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthSubject } from "@qadi/core";
import type { DehydratedDecisions } from "@qadi/react";
import { switchUser } from "../server/actions.ts";
import { users } from "../domain/subjects.ts";
import { DockMount } from "../client/DockMount.tsx";
import { Providers } from "../client/Providers.tsx";
import { button, colors, h1, mono, muted, navLink, note, page } from "./theme.ts";

const ROUTES = [
  ["/", "index"],
  ["/newsroom", "newsroom"],
  ["/spa", "spa"],
  ["/edge/divergent", "divergent"],
  ["/edge/wrong-subject", "wrong-subject"],
  ["/edge/version-skew", "version-skew"],
  ["/edge/mixed-payload", "mixed-payload"],
  ["/edge/unregistered", "unregistered"],
  ["/edge/middleware", "middleware"],
  ["/edge/leakage", "leakage"],
  ["/edge/action", "action"],
  ["/edge/suspense", "suspense"],
  ["/edge/invalidate", "invalidate"],
  ["/edge/double-count", "double-count"],
] as const;

export interface ShellProps {
  readonly title: string;
  readonly lede: ReactNode;
  readonly subject: AuthSubject;
  readonly currentUserId: string;
  readonly payload: DehydratedDecisions;
  /** Off means absent: no gate registers and no marker element is rendered. */
  readonly instrument?: boolean;
  /** Mount the dock. Off on the routes whose point is what happens without it. */
  readonly dock?: boolean;
  readonly children: ReactNode;
}

export const Shell = ({
  title,
  lede,
  subject,
  currentUserId,
  payload,
  instrument = true,
  dock = true,
  children,
}: ShellProps) => (
  <main style={page}>
    <nav style={{ marginBottom: "1rem" }}>
      {ROUTES.map(([href, label]) => (
        <Link key={href} href={href} style={navLink}>
          {label}
        </Link>
      ))}
    </nav>

    <h1 style={h1}>{title}</h1>
    <div style={muted}>{lede}</div>

    <form action={switchUser} style={{ ...note, display: "flex", gap: 8, alignItems: "center" }}>
      <span style={mono}>viewing as</span>
      <select name="user" defaultValue={currentUserId} style={{ ...button, cursor: "default" }}>
        <option value="">anonymous</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.label}
          </option>
        ))}
      </select>
      <button type="submit" style={button}>
        switch
      </button>
      <span style={{ ...mono, color: colors.muted }}>
        the session is a cookie; every surface re-reads it
      </span>
    </form>

    <Providers subject={subject} payload={payload} instrument={instrument}>
      {children}
      <DockMount enabled={dock} />
    </Providers>
  </main>
);
