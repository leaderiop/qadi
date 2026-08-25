/**
 * Compiles a `Predicate` into a Prisma `WhereInput`.
 *
 * `@qadi/core`'s `toPredicate` emits an abstract, dialect-free AST and
 * deliberately stops there (ADR-QD-024). `@qadi/core` still gains no
 * dependency on Prisma through this package existing — this is the companion
 * ADR-QD-054 authorizes: optional, separately versioned, installed only by a
 * caller who wants it.
 *
 * See `spec/behaviors/31-predicate-compilation.md`.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import type { CompareOp, Predicate } from "@qadi/core";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * A Prisma `where` filter, generic in the model.
 *
 * Not narrowed to a generated model's own `WhereInput` type — this package
 * never sees a schema, so it cannot claim a narrower one without generating
 * one, which is exactly the "acquire a schema-shaped dependency" cost
 * ADR-QD-054 keeps this package from taking on. This is a deliberate boundary
 * type, not unmonomorphized internal widening: a caller assigns the result to
 * their generated model's `WhereInput` at the call site, where the real shape
 * is known.
 */
export type PrismaWhereInput = Record<string, unknown>;

/**
 * A `Predicate` this package refuses to render — an unsafe value. Declared
 * independently of `@qadi/predicate-sql`'s error of the same name: neither
 * package shares it through `@qadi/core`, which has no reason to know either
 * exists.
 */
export class PredicateNotRenderable extends Data.TaggedError("PredicateNotRenderable")<{
  readonly predicateTag: string;
  readonly reason: string;
}> {}

/** `unknown`, safely: the only shapes safe to hand to Prisma's query engine as a value. */
const isSafeValue = (value: unknown): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value instanceof Date;

const compareFilter = (op: CompareOp, value: unknown): unknown =>
  Match.value(op).pipe(
    Match.when("Eq", () => value),
    Match.when("Neq", () => ({ not: value })),
    Match.when("Gte", () => ({ gte: value })),
    Match.when("Lt", () => ({ lt: value })),
    Match.exhaustive,
  );

/**
 * Renders one node.
 *
 * `True`/`False` map to Prisma's own vacuous identities — `{AND: []}` (all of
 * zero conditions: true) and `{OR: []}` (any of zero conditions: false) —
 * matching `evaluatePredicate`'s own `.every`/`.some` on an empty array, the
 * same choice `@qadi/predicate-sql` makes for its empty `And`/`Or` case.
 */
const renderNode = (predicate: Predicate): Effect.Effect<PrismaWhereInput, PredicateNotRenderable> =>
  Match.value(predicate).pipe(
    Match.tagsExhaustive({
      True: () => Effect.succeed({ AND: [] }),
      False: () => Effect.succeed({ OR: [] }),

      Compare: (p) => {
        if (!isSafeValue(p.value)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        return Effect.succeed({ [p.column]: compareFilter(p.op, p.value) });
      },

      MemberOf: (p) => {
        // [].includes(x) is always false — the correct, not degenerate,
        // translation.
        if (p.values.length === 0) return Effect.succeed({ OR: [] });
        if (p.values.some((value) => !isSafeValue(value))) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "MemberOf",
              reason: `a value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        return Effect.succeed({ [p.column]: { in: p.values } });
      },

      // An empty `predicates` array is unreachable through `toPredicate`, but
      // `Predicate` is directly constructible — `{AND: []}`/`{OR: []}` still
      // agree with `evaluatePredicate`'s `.every`/`.some` on that input.
      And: (p) =>
        Effect.map(Effect.forEach(p.predicates, renderNode), (parts) => ({ AND: parts })),

      Or: (p) => Effect.map(Effect.forEach(p.predicates, renderNode), (parts) => ({ OR: parts })),

      // No double-negation elimination — `Simplify.ts` never runs on a
      // `Predicate`, and this compiler renders exactly what the AST says.
      Negate: (p) => Effect.map(renderNode(p.predicate), (inner) => ({ NOT: inner })),
    }),
  );

/**
 * Compile volume and refusal rate, by outcome. Declared once, module scope —
 * mirrors `@qadi/predicate-sql`'s own precedent, itself mirroring
 * `@qadi/core`'s `Predicate.ts`. Effect's `Metric` registry keys on
 * `type:id:description` and memoizes per metric *object*; declaring either
 * inside `compilePrismaWhere`'s body would either fail to register the way
 * this does, or create an unscoped object per call nothing can aggregate.
 */
const compiledTotal = Metric.counter("qadi_predicate_prisma_compiled_total", {
  description: "Predicates compiled by @qadi/predicate-prisma's compilePrismaWhere, tagged by outcome.",
});
const compiledSucceededTotal = Metric.withAttributes(compiledTotal, { outcome: "compiled" });
const compiledRefusedTotal = Metric.withAttributes(compiledTotal, { outcome: "refused" });

/**
 * Compiles a `Predicate` into a Prisma `WhereInput`.
 *
 * Refuses rather than approximates: an unsafe `Compare`/`MemberOf` value fails
 * `PredicateNotRenderable` rather than being handed to Prisma's query engine.
 * Carries no `maxInValues` option — an `in` clause here is Prisma's own array
 * literal, and bounding it is a caller concern the same way bounding any
 * other array argument to Prisma already is. See
 * `spec/behaviors/31-predicate-compilation.md`.
 */
export const compilePrismaWhere = Effect.fn("qadi.predicatePrisma.compilePrismaWhere")(
  function* (predicate: Predicate) {
    const where = yield* renderNode(predicate).pipe(
      Effect.tapError(() => Metric.update(compiledRefusedTotal, 1)),
    );
    yield* Metric.update(compiledSucceededTotal, 1);
    return where;
  },
);
