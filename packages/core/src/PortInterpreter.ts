/**
 * Who is asking a port: the closed set `qadi.interpreter` is annotated with.
 *
 * Stated once, as a schema, with the type derived (AGENTS.md §7): the span's
 * question field (`PortSpanEncode.ts`) decodes through it and `PortSpan.ts`
 * re-exports the type. It was stated twice — a type and a literal list — until
 * the third member was added (ARCH-31, ADR-QD-051).
 *
 * - `evaluate` — the evaluator, reading a port while it walks a policy.
 * - `toPredicate` — the translator, reading the ports it can fold.
 * - `remote` — a host answering another process's question
 *   (`servePortRead`), which counts in its own sibling metric,
 *   `qadi_port_served_calls_total`.
 *
 * Package-private: the type is public through `PortSpan.ts`, the schema is not.
 */
import * as Schema from "effect/Schema";

export const portInterpreter = Schema.Literals(["evaluate", "toPredicate", "remote"]);

export type PortInterpreter = typeof portInterpreter.Type;
