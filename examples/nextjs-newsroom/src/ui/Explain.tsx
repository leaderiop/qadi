/**
 * The prose block every edge route opens with.
 *
 * Each of those routes exists to make one thing go wrong on purpose, and a
 * reader looking at a page that is deliberately broken needs to be told which
 * part is the demonstration and which part is the bug.
 */
import type { ReactNode } from "react";
import { colors, h2, mono, note } from "./theme.ts";

export interface ExplainProps {
  readonly what: string;
  readonly how: ReactNode;
  readonly watch: ReactNode;
}

export const Explain = ({ what, how, watch }: ExplainProps) => (
  <section style={note}>
    <h2 style={{ ...h2, marginTop: 0 }}>{what}</h2>
    <p style={{ margin: "0 0 0.5rem" }}>{how}</p>
    <p style={{ margin: 0, color: colors.muted }}>
      <span style={mono}>watch for:</span> {watch}
    </p>
  </section>
);
