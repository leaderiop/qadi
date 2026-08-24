/**
 * Style tokens, as plain objects.
 *
 * **Inline styles, and no stylesheet of any kind.** This package ships through
 * `tsc` and nothing else — there is no bundler in this repository, no CSS
 * pipeline, and adding one for a devtools panel would put a second build graph
 * beside `tsconfig.build.json` for the sake of a dozen colours. Inline styles
 * also survive a host page whose own CSS would otherwise inherit into the dock,
 * which is the failure mode an overlay hits first.
 *
 * A `<style>` tag injected at import time would be smaller to write and is
 * rejected on purpose: the package declares `"sideEffects": false`, so a
 * bundler is entitled to drop a module whose only job is a side effect, and the
 * dock would lose its styling in exactly the production build nobody tests.
 */
import type { CSSProperties } from "react";

/**
 * Dark by default, and not themed.
 *
 * A devtools panel sits over a host application whose own palette is unknown,
 * so *matching* it is not on the table; being unmistakably not-the-application
 * is the more useful property.
 */
export const colors = {
  surface: "#14161a",
  surfaceRaised: "#1c1f26",
  border: "#2a2f39",
  text: "#e6e8ec",
  textMuted: "#8b93a3",
  accent: "#4ea1ff",
  /** ALLOW — a tint, so the common case does not shout. */
  allow: "#3fb950",
  allowTint: "rgba(63, 185, 80, 0.16)",
  /** DENY — solid, because a refusal is what a reader is usually hunting. */
  deny: "#f0f3f6",
  denySolid: "#8b1a1a",
  /** ERROR — outlined, so it cannot be mistaken for either of the other two. */
  error: "#e3a008",
  /** A row whose partners disagree. */
  disagree: "rgba(227, 160, 8, 0.12)",
} as const;

export const font = {
  family:
    'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  size: 12,
  sizeSmall: 11,
} as const;

export const dock: CSSProperties = {
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  height: "45vh",
  display: "flex",
  flexDirection: "column",
  background: colors.surface,
  color: colors.text,
  borderTop: `1px solid ${colors.border}`,
  fontFamily: font.family,
  fontSize: font.size,
  lineHeight: 1.5,
  zIndex: 2_147_483_000,
};

export const toolbar: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "6px 10px",
  borderBottom: `1px solid ${colors.border}`,
  background: colors.surfaceRaised,
  flexWrap: "wrap",
};

export const body: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: "auto",
};

export const button = (active: boolean): CSSProperties => ({
  appearance: "none",
  background: active ? colors.accent : "transparent",
  color: active ? colors.surface : colors.textMuted,
  border: `1px solid ${active ? colors.accent : colors.border}`,
  borderRadius: 4,
  padding: "2px 8px",
  font: "inherit",
  fontSize: font.sizeSmall,
  cursor: "pointer",
});

export const input: CSSProperties = {
  appearance: "none",
  background: colors.surface,
  color: colors.text,
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "2px 8px",
  font: "inherit",
  fontSize: font.sizeSmall,
  minWidth: 160,
};

export const muted: CSSProperties = { color: colors.textMuted };

/** A bordered card. Every screen that groups related facts uses this one. */
export const panel: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 4,
  padding: "8px 10px",
  marginBottom: 8,
};

export const heading: CSSProperties = {
  color: colors.textMuted,
  fontSize: font.sizeSmall,
  textTransform: "uppercase",
  letterSpacing: 0.6,
  marginBottom: 6,
};

/** One removable value in a set the reviewer is editing. */
export const chip: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: colors.surfaceRaised,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  padding: "1px 4px 1px 8px",
  fontSize: font.sizeSmall,
  marginRight: 4,
  marginBottom: 4,
};

/** Keeps a long subject id or resource path from widening the whole table. */
export const truncate: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  maxWidth: 220,
};
