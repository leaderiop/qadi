/**
 * Inline style objects, and no CSS pipeline.
 *
 * The same choice `@qadi/devtools` made and for the same reason: this repository
 * has no bundler configuration to speak of, and adding one so an example could
 * have a stylesheet would be adding a build step to demonstrate an
 * authorization library. Every style here is a plain object, typed by React.
 */
import type { CSSProperties } from "react";

export const colors = {
  ink: "#101418",
  paper: "#fbfaf8",
  rule: "#d9d4cc",
  muted: "#6b6560",
  allow: "#1f7a4d",
  deny: "#a4303f",
  pending: "#8a7c2f",
  accent: "#2f5d8a",
} as const;

export const page: CSSProperties = {
  fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
  color: colors.ink,
  background: colors.paper,
  margin: 0,
  padding: "1.5rem 2rem 6rem",
  lineHeight: 1.5,
  maxWidth: 1100,
};

export const h1: CSSProperties = { fontSize: 22, margin: "0 0 0.25rem" };
export const h2: CSSProperties = { fontSize: 15, margin: "1.75rem 0 0.5rem", letterSpacing: 0.2 };

export const muted: CSSProperties = { color: colors.muted, fontSize: 13, margin: "0 0 1rem" };

export const card: CSSProperties = {
  border: `1px solid ${colors.rule}`,
  borderRadius: 6,
  padding: "0.75rem 1rem",
  margin: "0 0 0.75rem",
  background: "#fff",
};

export const note: CSSProperties = {
  ...card,
  background: "#fffdf5",
  borderColor: "#e6dcae",
  fontSize: 13,
};

export const mono: CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
};

export const pre: CSSProperties = {
  ...mono,
  background: "#f3f1ec",
  border: `1px solid ${colors.rule}`,
  borderRadius: 4,
  padding: "0.6rem 0.8rem",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

export const badge = (kind: "allow" | "deny" | "pending"): CSSProperties => ({
  ...mono,
  display: "inline-block",
  padding: "1px 6px",
  borderRadius: 3,
  color: "#fff",
  background: kind === "allow" ? colors.allow : kind === "deny" ? colors.deny : colors.pending,
});

export const button: CSSProperties = {
  font: "inherit",
  fontSize: 13,
  padding: "3px 10px",
  border: `1px solid ${colors.rule}`,
  borderRadius: 4,
  background: "#fff",
  cursor: "pointer",
};

export const navLink: CSSProperties = {
  ...mono,
  color: colors.accent,
  textDecoration: "none",
  marginRight: "0.9rem",
  whiteSpace: "nowrap",
};
