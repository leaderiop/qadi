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

/**
 * The non-null-value shape of a comparison filter.
 *
 * `null` is handled by `renderNode`'s `Compare` case before this is ever
 * called — Prisma's `{not: null}`/`{equals: null}` already mean `IS [NOT]
 * NULL` correctly, but `{gte: null}`/`{lt: null}` are a validation error
 * Prisma refuses outright, the same way it refuses `{in: [null, ...]}`
 * (found by running a compiled `WhereInput` against a real, SQLite-backed
 * Prisma client, not assumed).
 *
 * `Neq` is deliberately excluded from this function's domain too, not
 * merely unused: a non-null `Neq` never renders as `{not: value}` alone —
 * `renderNode`'s `Compare` case ORs in `{column: null}` before this is ever
 * reached, so the type is narrowed rather than left exhaustive-but-dead.
 */
const compareFilter = (op: Exclude<CompareOp, "Neq">, value: unknown): unknown =>
  Match.value(op).pipe(
    Match.when("Eq", () => value),
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
 *
 * `Neq`/`MemberOf` against a `null`-capable column need more than Prisma's
 * own filter shape: `{col: {not: value}}` alone excludes a row where `col`
 * is genuinely `NULL`, but `evaluatePredicate`'s `!==` admits it — `null !==
 * value` is true for any non-null `value`. This was a real defect, caught by
 * running the compiled `WhereInput` against a real, SQLite-backed Prisma
 * client and comparing its result set to `evaluatePredicate`'s, not designed
 * in from the start: `@qadi/predicate-sql`'s own differential property test
 * re-implements `!==` in JS and so agreed with the original, wrong
 * translation rather than catching it — the same lesson that compiler's own
 * fix already carries, one grammar over.
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
        if (p.value === null) {
          if (p.op === "Eq") return Effect.succeed({ [p.column]: null });
          if (p.op === "Neq") return Effect.succeed({ [p.column]: { not: null } });
          // Gte/Lt against a null literal: evaluatePredicate requires both
          // sides to be numbers, and null never is — always False, for any
          // row, and {gte: null}/{lt: null} is a Prisma validation error.
          return Effect.succeed({ OR: [] });
        }
        if (p.op === "Neq") {
          return Effect.succeed({
            OR: [{ [p.column]: { not: p.value } }, { [p.column]: null }],
          });
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
        // Prisma's `in` refuses a `null` member outright (a validation
        // error, not a silent miss), so a `null` member needs its own
        // `{col: null}`, split out of the `in` list.
        const hasNull = p.values.includes(null);
        const nonNull = p.values.filter((value) => value !== null);
        if (nonNull.length === 0) return Effect.succeed({ [p.column]: null });
        const inFilter = { [p.column]: { in: nonNull } };
        return Effect.succeed(hasNull ? { OR: [inFilter, { [p.column]: null }] } : inFilter);
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
