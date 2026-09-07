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
 *
 * The two declarations also share the identical `_tag` string (ticket 95) —
 * deliberately, not an oversight ADR-QD-008's "the `_tag` is the identity"
 * would otherwise flag. Both carry the same shape (`predicateTag`, `reason`),
 * and this collision is benign: the two packages are mutually exclusive in
 * practice — a caller compiles to SQL or to Prisma, not both from the same
 * predicate — so no single `Effect.catchTag`/`Match` site is expected to see
 * both at once. If one ever did, the two are structurally indistinguishable
 * at that site by tag alone, which is the cost of this choice, accepted
 * rather than renaming either and breaking a public API for a situation
 * neither package's callers hit.
 */
export class PredicateNotRenderable extends Data.TaggedError("PredicateNotRenderable")<{
  readonly predicateTag: string;
  readonly reason: string;
}> {}

/**
 * `unknown`, safely: the only shapes safe to hand to Prisma's query engine as
 * a value.
 *
 * Deliberately excludes `Date`, unlike an earlier version of this function —
 * `evaluatePredicate`'s `compare` (`@qadi/core`'s `Predicate.ts`) requires
 * `typeof value === "number"` for `Gte`/`Lt`, so a `Date` there is always
 * `false` in the reference evaluator, while Prisma's `{gte: date}`/`{lt:
 * date}` performs a real date comparison against the row — INV-QD-048
 * disagreement, and in the direction that matters: Prisma would admit rows
 * the reference evaluator denies. `Eq`'s `===` has the same problem from the
 * other side — two distinct `Date` instances holding the same instant are
 * never `===`, so a `Date` `Eq` is reference-evaluator-false for any row a
 * caller would actually construct, while Prisma's `{equals: date}` matches
 * correctly. Refusing to compile a `Date`-valued `Compare`/`MemberOf` is the
 * ADR-QD-024 "refuse rather than approximate" answer to a comparison the
 * reference evaluator does not actually support.
 *
 * The `number` branch requires `Number.isFinite` too (ticket 138), not bare
 * `typeof value === "number"` — `NaN`/`Infinity`/`-Infinity` all satisfy that
 * `typeof` check but are unsound in both directions against
 * `evaluatePredicate`: `NaN === NaN` is `false` in JS, so an `Eq`/`MemberOf`
 * against `NaN` is reference-evaluator-false for every row, while Prisma's
 * equality/`in` filters compile it into a real, engine-dependent comparison
 * that can admit rows the reference evaluator denies. `Infinity`/`-Infinity`
 * are ordinary numbers to a `>=`/`<` comparison in both `evaluatePredicate`
 * and Prisma's `gte`/`lt`, so a real disagreement needs an actual database to
 * confirm either way — refusing all three here is the same "refuse rather
 * than approximate" answer as the `Date` case above, applied before either
 * question needs answering empirically.
 *
 * `@qadi/predicate-sql`'s own `isSafeValue` now carries the same check
 * (CCR-QD-120), so the two dialect packages do agree on which values compile.
 *
 * > Until CCR-QD-120 this paragraph read: "`@qadi/predicate-sql`'s own
 * > `isSafeValue` does not carry this check — only its `Gte`/`Lt`-specific
 * > render guard excludes `NaN`, and only for those two operators, leaving
 * > `Eq`/`MemberOf` against `NaN` unaddressed there. This is a deliberate
 * > widening at the `isSafeValue` gate itself, ahead of, and covering more
 * > ground than, that precedent — not a claim that the two packages agree."
 * > That gap was the INV-QD-047 divergence issue #65 closed: a `NaN`-valued
 * > `Eq` bound a real parameter, and PostgreSQL's `NaN = NaN` is true where
 * > `evaluatePredicate`'s `===` is false.
 */
const isSafeValue = (value: unknown): boolean =>
  value === null ||
  typeof value === "string" ||
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean";

/**
 * A column name safe to interpolate as a `WhereInput` key.
 *
 * `renderNode` builds `{[p.column]: …}` from `Predicate.column`, a plain
 * `string` on an AST that crosses a trust boundary (AGENTS.md §7) — this
 * package has no generated schema to validate a column against, unlike a
 * caller who assigns the result to their model's own `WhereInput` type.
 * `AND`/`OR`/`NOT` are Prisma's own combinator keys at every `WhereInput`
 * level: a column literally named one changes what the object means instead
 * of failing to render — `{NOT: "t-1"}` negates rather than comparing, and
 * `{AND: …}`/`{OR: …}` collide with the array forms this compiler emits for
 * `Predicate.And`/`Or`.
 *
 * The rest of the set (ticket 136) is Prisma's scalar-filter operator
 * vocabulary — `equals`/`not`/`in`/`notIn`/`lt`/`lte`/`gt`/`gte`/`is`/
 * `isNot` — the keys a nested filter object uses one level below a field
 * name. A column literally named one of these does not fail to render:
 * `renderNode` still emits a structurally valid `WhereInput` fragment, e.g.
 * `{gte: {gte: value}}` for a `Compare` on a column named `"gte"`. Prisma
 * then either rejects it at query time (no such model field, a failure this
 * package could have given a clearer reason for at compile time) or, if the
 * model happens to have a field by that name, resolves it as an ordinary
 * field rather than the operator the column name suggests — compiling
 * successfully to something the column name did not mean, the same failure
 * mode `AND`/`OR`/`NOT` already guard against. Refused here rather than
 * escaped, since there is no escaping a JS object key — only choosing not to
 * use it as one. Matching is case-sensitive, as it already was for
 * `AND`/`OR`/`NOT`: Prisma's own keys are exact-case, and so is this check.
 */
const RESERVED_PRISMA_KEYS = new Set([
  "AND",
  "OR",
  "NOT",
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "is",
  "isNot",
]);
const isSafeColumn = (column: string): boolean => !RESERVED_PRISMA_KEYS.has(column);

/**
 * `renderNode`'s own vacuous-identity shapes — `{AND: []}` (always matches,
 * `True`'s and an empty `And`'s rendering) and `{OR: []}` (never matches,
 * `False`'s and an empty `Or`'s rendering, and `MemberOf`'s own empty-values
 * case).
 *
 * `And`, `Or` and `Negate` all special-case these — not `Negate` alone —
 * because the real Prisma query-compiler does not treat a vacuous identity
 * *reached below the top level of the compiled query* as its designed
 * meaning. Verified against Prisma 7.10's engine source: `extract_filter`
 * (query-compiler/core/src/query_graph_builder/extractors/filters/mod.rs)
 * strips an empty `AND`/`OR` filter reached below the top level to
 * `Filter::Empty` ("no restriction"), regardless of which of the two it is
 * or which combinator contains it — confirmed black-box against a live
 * engine, not merely read from source: Prisma issue #17367's own repro is
 * `{AND: [{email: "…"}, {OR: []}]}` returning the `email` row (the `{OR:
 * []}` member is *dropped* from the `AND` list rather than forcing it
 * false), and a comment on that issue confirms an empty `AND` array
 * nested the same way is dropped identically, not merely `OR`'s. Issue
 * #21856 shows the `NOT` case: `{NOT: {AND: []}}}` — a `Filter::not([])`
 * once the inner empty `AND` strips to nothing — incorrectly returns every
 * row instead of none (`filter/visitor.rs` maps `Filter::not([])` to
 * `ConditionTree::NoCondition`, not a negation of the stripped filter), and
 * `{AND: {OR: []}}}` (an `AND` wrapping a single vacuous-false operand)
 * incorrectly returns every row too, the same "stripped to no restriction"
 * mechanism from the other combinator.
 *
 * `renderNode`'s answer is to never let a vacuous identity be *reached*
 * below the top level in the first place, rather than lean on the engine to
 * survive folding it does not perform correctly: `And`/`Or` constant-fold
 * every child immediately (see the `And`/`Or` arms below) so a `{AND: []}`/
 * `{OR: []}` produced anywhere in the tree either collapses the whole
 * combinator at that level or is dropped from it before the result is ever
 * handed to a caller — a vacuous identity in this compiler's output can
 * only ever be the very shape returned to the caller, never a member deeper
 * in it. `Negate` still special-cases its own immediate child on top of
 * that, for the same reason: `And`/`Or` fold what they build themselves,
 * but `Negate`'s child could independently already reduce to a bare `True`/
 * `False`/empty `MemberOf` leaf, which nothing else folds.
 */
const isVacuousTrue = (where: PrismaWhereInput): boolean => {
  const keys = Object.keys(where);
  return keys.length === 1 && Array.isArray(where.AND) && where.AND.length === 0;
};
const isVacuousFalse = (where: PrismaWhereInput): boolean => {
  const keys = Object.keys(where);
  return keys.length === 1 && Array.isArray(where.OR) && where.OR.length === 0;
};

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
 * **This is only ever the emitted shape at the top of the compiled query.**
 * A vacuous identity is never left nested inside `AND`/`OR`/`NOT` in this
 * compiler's output — see `isVacuousTrue`/`isVacuousFalse` above for why a
 * nested one is not safe to hand to Prisma's real query engine (CCR-QD-111):
 * `And`/`Or` constant-fold every rendered child before
 * returning, and `Negate` folds its own child on top of that, so the only
 * place `{AND: []}`/`{OR: []}` can appear in a value this function returns
 * is the value itself, never inside one of its own `AND`/`OR`/`NOT` members.
 * An earlier version of this function nested children verbatim — correct
 * against `evaluatePredicate`'s own semantics, wrong against Prisma's, which
 * silently drops a nested vacuous identity or fails to negate it (Prisma
 * issues #17367, #21856) — so e.g. `allOf([hasResourceAttribute("role",
 * inArray([])), tenantEq])`, meant to deny role-less users unconditionally,
 * compiled to a query that admitted them.
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
        if (!isSafeColumn(p.column)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `column '${p.column}' is not a safe identifier`,
            }),
          );
        }
        if (!isSafeValue(p.value)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        // evaluatePredicate's compare requires typeof === "number" on BOTH
        // sides for Gte/Lt and is otherwise always False — a string or
        // boolean slips past isSafeValue's allowlist (built for Eq/Neq's
        // `===`, where any of those compare validly) straight into a real
        // Prisma range filter: `{gte: "10"}`/`{lt: true}` still executes
        // against the row rather than refusing, admitting rows the reference
        // evaluator denies. `NaN` is excluded earlier, by `isSafeValue` itself
        // (ticket 138), so only the `typeof` check is left doing work here;
        // it stays a plain `typeof` guard, not `Number.isFinite`, because
        // `isSafeValue` having already run means anything reaching this line
        // that is `typeof === "number"` is already finite. Mirrors
        // `@qadi/predicate-sql`'s identical guard (ticket 157) and this
        // file's own `{OR: []}` for a null-literal Gte/Lt just below.
        if ((p.op === "Gte" || p.op === "Lt") && typeof p.value !== "number") {
          return Effect.succeed({ OR: [] });
        }
        if (p.value === null) {
          if (p.op === "Eq") return Effect.succeed({ [p.column]: null });
          if (p.op === "Neq") return Effect.succeed({ [p.column]: { not: null } });
          // Gte/Lt against a null literal is handled by the numeric guard
          // above (typeof null !== "number").
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
        if (!isSafeColumn(p.column)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "MemberOf",
              reason: `column '${p.column}' is not a safe identifier`,
            }),
          );
        }
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
      // agree with `evaluatePredicate`'s `.every`/`.some` on that input, and
      // is exactly the case `nonVacuousTrue`/`nonVacuousFalse` below reduce
      // an all-vacuous or already-empty `parts` list to.
      //
      // Constant-folds every rendered child rather than nesting `parts`
      // verbatim (C1, CCR-QD-111) — see `isVacuousTrue`/`isVacuousFalse`
      // above for why a nested `{AND: []}`/`{OR: []}` is not safe to hand to
      // Prisma's real query engine. A genuinely-false child forces the
      // whole `And` false unconditionally, so it is reported at THIS level
      // (`{OR: []}`) rather than left nested where the engine silently
      // drops it; a genuinely-true child changes nothing about an `And`, so
      // it is dropped from the array — both are recursive by construction,
      // since each child was itself already fully folded by this same arm
      // (or `Or`'s) before `renderNode` returns it here.
      And: (p) =>
        Effect.map(Effect.forEach(p.predicates, renderNode), (parts) => {
          if (parts.some(isVacuousFalse)) return { OR: [] };
          const nonVacuousTrue = parts.filter((part) => !isVacuousTrue(part));
          return nonVacuousTrue.length === 0 ? { AND: [] } : { AND: nonVacuousTrue };
        }),

      // The `Or` mirror of `And` above: a genuinely-true child forces the
      // whole `Or` true unconditionally (reported at this level, `{AND:
      // []}`), and a genuinely-false child is dropped, since it changes
      // nothing about an `Or`.
      Or: (p) =>
        Effect.map(Effect.forEach(p.predicates, renderNode), (parts) => {
          if (parts.some(isVacuousTrue)) return { AND: [] };
          const nonVacuousFalse = parts.filter((part) => !isVacuousFalse(part));
          return nonVacuousFalse.length === 0 ? { OR: [] } : { OR: nonVacuousFalse };
        }),

      // No double-negation elimination — `Simplify.ts` never runs on a
      // `Predicate`, and this compiler renders exactly what the AST says.
      // The one exception is the vacuous-identity shapes themselves: see
      // `isVacuousTrue`/`isVacuousFalse` for why `{NOT: {AND: []}}`/`{NOT:
      // {OR: []}}` cannot be left for the real Prisma engine to fold. Folding
      // here only ever sees `p.predicate`'s own top-level shape — `And`/`Or`
      // above already guarantee nothing nested inside it is vacuous, so this
      // check is exactly as much as `Negate` needs, not a partial guard.
      Negate: (p) =>
        Effect.map(renderNode(p.predicate), (inner) => {
          if (isVacuousTrue(inner)) return { OR: [] };
          if (isVacuousFalse(inner)) return { AND: [] };
          return { NOT: inner };
        }),
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
