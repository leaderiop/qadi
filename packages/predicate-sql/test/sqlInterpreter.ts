/**
 * A test-only reader for the SQL `compileSql` renders — nothing more.
 *
 * Understands exactly the productions `renderNode` in `../src/index.ts` ever
 * emits — including `IS [NOT] NULL`, the `(x != ? OR x IS NULL)` shape
 * `Neq`/`MemberOf` render for a NULL-valued column, and `Negate`'s
 * `CASE WHEN (<inner>) THEN FALSE ELSE TRUE END` — tolerant to both quoting
 * styles (`"col"`/`` `col` ``) and both placeholder styles (`$1, $2, …`/
 * repeated `?`). It reads the actual rendered
 * `text`, not a bypass of it — the differential property this drives
 * (INV-QD-047) is only meaningful because this interprets what `compileSql`
 * really produced.
 *
 * `CASE WHEN` is interpreted by evaluating its condition and picking the
 * matching literal branch — it re-derives the answer from `row`, exactly as
 * `compare`/`isNull` already do for every other production, rather than
 * modeling SQL's own three-valued UNKNOWN. That is a real limitation, not an
 * oversight: this interpreter cannot by itself catch a NULL-safety regression
 * in what `renderNode` emits (a real engine can, and did — see AGENTS.md's
 * citations of prior NULL-handling fixes found that way); it only proves the
 * *AST-level* structure it parses agrees with `evaluatePredicate`, which is
 * why the fixed `Negate` shape is additionally pinned by an exact-text golden
 * test in `CompileSql.test.ts` rather than resting on this interpreter alone.
 *
 * Placeholders are consumed by a single left-to-right counter regardless of
 * style: `renderNode` calls `params.push(value)` immediately before emitting
 * each placeholder, so the k-th placeholder encountered scanning the text
 * left to right is always `params[k]`, in both the numbered ($N) and
 * positional (?) dialects.
 */
import type { SqlFragment } from "../src/index.ts";

type Token =
  | {
      readonly kind:
        | "lparen"
        | "rparen"
        | "comma"
        | "and"
        | "or"
        | "not"
        | "in"
        | "is"
        | "null"
        | "true"
        | "false"
        | "case"
        | "when"
        | "then"
        | "else"
        | "end";
    }
  | { readonly kind: "ident"; readonly name: string }
  | { readonly kind: "op"; readonly op: "=" | "!=" | ">=" | "<" }
  | { readonly kind: "placeholder" };

const tokenize = (text: string): ReadonlyArray<Token> => {
  const tokens: Array<Token> = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === " ") {
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ kind: "comma" });
      i++;
      continue;
    }
    if (ch === "?") {
      tokens.push({ kind: "placeholder" });
      i++;
      continue;
    }
    if (ch === "$") {
      const match = /^\$\d+/.exec(text.slice(i));
      if (match === null) throw new Error(`malformed placeholder at ${i}: ${text.slice(i)}`);
      tokens.push({ kind: "placeholder" });
      i += match[0].length;
      continue;
    }
    if (ch === '"' || ch === "`") {
      const close = text.indexOf(ch, i + 1);
      if (close === -1) throw new Error(`unterminated identifier at ${i}: ${text.slice(i)}`);
      tokens.push({ kind: "ident", name: text.slice(i + 1, close) });
      i = close + 1;
      continue;
    }
    if (ch === "!" && text[i + 1] === "=") {
      tokens.push({ kind: "op", op: "!=" });
      i += 2;
      continue;
    }
    if (ch === ">" && text[i + 1] === "=") {
      tokens.push({ kind: "op", op: ">=" });
      i += 2;
      continue;
    }
    if (ch === "=") {
      tokens.push({ kind: "op", op: "=" });
      i++;
      continue;
    }
    if (ch === "<") {
      tokens.push({ kind: "op", op: "<" });
      i++;
      continue;
    }
    const word = /^[A-Z]+/.exec(text.slice(i));
    if (word !== null) {
      const keyword = word[0];
      i += keyword.length;
      if (keyword === "TRUE") {
        tokens.push({ kind: "true" });
      } else if (keyword === "FALSE") {
        tokens.push({ kind: "false" });
      } else if (keyword === "AND") {
        tokens.push({ kind: "and" });
      } else if (keyword === "OR") {
        tokens.push({ kind: "or" });
      } else if (keyword === "NOT") {
        tokens.push({ kind: "not" });
      } else if (keyword === "IN") {
        tokens.push({ kind: "in" });
      } else if (keyword === "IS") {
        tokens.push({ kind: "is" });
      } else if (keyword === "NULL") {
        tokens.push({ kind: "null" });
      } else if (keyword === "CASE") {
        tokens.push({ kind: "case" });
      } else if (keyword === "WHEN") {
        tokens.push({ kind: "when" });
      } else if (keyword === "THEN") {
        tokens.push({ kind: "then" });
      } else if (keyword === "ELSE") {
        tokens.push({ kind: "else" });
      } else if (keyword === "END") {
        tokens.push({ kind: "end" });
      } else {
        throw new Error(`unexpected keyword: ${keyword}`);
      }
      continue;
    }
    throw new Error(`unexpected character at ${i}: ${text.slice(i)}`);
  }
  return tokens;
};

type Ast =
  | { readonly type: "true" }
  | { readonly type: "false" }
  | { readonly type: "not"; readonly inner: Ast }
  | { readonly type: "and"; readonly parts: ReadonlyArray<Ast> }
  | { readonly type: "or"; readonly parts: ReadonlyArray<Ast> }
  | {
      readonly type: "compare";
      readonly column: string;
      readonly op: "=" | "!=" | ">=" | "<";
      readonly paramIndex: number;
    }
  | { readonly type: "in"; readonly column: string; readonly paramIndex: number; readonly count: number }
  | { readonly type: "isNull"; readonly column: string; readonly negated: boolean }
  | {
      readonly type: "case";
      readonly cond: Ast;
      readonly thenValue: boolean;
      readonly elseValue: boolean;
    };

/**
 * Recursive-descent parser over the closed grammar above; `at` is mutated as a
 * token cursor, `nextParam` as a placeholder cursor.
 *
 * Placeholder indices are assigned **here**, during a single left-to-right
 * scan of the text — not during interpretation. `And`/`Or` short-circuit at
 * runtime (`.every`/`.some`), so a cursor advanced only as branches are
 * actually evaluated would skip the placeholders belonging to a branch never
 * reached — e.g. an `Or` whose second part is `TRUE` never evaluates its
 * third part, but that third part's placeholder was still bound in `params`
 * at render time. Assigning indices once, unconditionally, while parsing is
 * what keeps a short-circuited branch from misreading a later one's value.
 */
const parse = (tokens: ReadonlyArray<Token>): Ast => {
  let at = 0;
  let nextParam = 0;

  const peek = (): Token | undefined => tokens[at];

  const expectBoolLiteral = (): boolean => {
    const token = peek();
    if (token?.kind !== "true" && token?.kind !== "false") {
      throw new Error("expected TRUE or FALSE");
    }
    at++;
    return token.kind === "true";
  };

  const expectExpr = (): Ast => {
    const token = peek();
    if (token === undefined) throw new Error("unexpected end of input");

    if (token.kind === "true") {
      at++;
      return { type: "true" };
    }
    if (token.kind === "false") {
      at++;
      return { type: "false" };
    }
    if (token.kind === "not") {
      at++;
      if (peek()?.kind !== "lparen") throw new Error("expected '(' after NOT");
      at++;
      const inner = expectExpr();
      if (peek()?.kind !== "rparen") throw new Error("expected ')' closing NOT");
      at++;
      return { type: "not", inner };
    }
    if (token.kind === "case") {
      // The only shape `renderNode`'s `Negate` ever emits:
      // `CASE WHEN (<inner>) THEN FALSE ELSE TRUE END`.
      at++;
      if (peek()?.kind !== "when") throw new Error("expected WHEN after CASE");
      at++;
      if (peek()?.kind !== "lparen") throw new Error("expected '(' after WHEN");
      at++;
      const cond = expectExpr();
      if (peek()?.kind !== "rparen") throw new Error("expected ')' closing WHEN condition");
      at++;
      if (peek()?.kind !== "then") throw new Error("expected THEN");
      at++;
      const thenValue = expectBoolLiteral();
      if (peek()?.kind !== "else") throw new Error("expected ELSE");
      at++;
      const elseValue = expectBoolLiteral();
      if (peek()?.kind !== "end") throw new Error("expected END");
      at++;
      return { type: "case", cond, thenValue, elseValue };
    }
    if (token.kind === "lparen") {
      at++;
      const parts = [expectExpr()];
      let combinator: "and" | "or" | undefined;
      while (peek()?.kind === "and" || peek()?.kind === "or") {
        const next = peek();
        // A single And/Or level never mixes AND and OR — `renderNode` joins
        // one node's `predicates` with exactly one operator.
        combinator = next?.kind === "or" ? "or" : "and";
        at++;
        parts.push(expectExpr());
      }
      if (peek()?.kind !== "rparen") throw new Error("expected ')' closing group");
      at++;
      return combinator === "or" ? { type: "or", parts } : { type: "and", parts };
    }
    if (token.kind === "ident") {
      at++;
      const column = token.name;
      const next = peek();
      if (next?.kind === "in") {
        at++;
        if (peek()?.kind !== "lparen") throw new Error("expected '(' after IN");
        at++;
        const paramIndex = nextParam;
        let count = 0;
        while (peek()?.kind !== "rparen") {
          if (peek()?.kind === "comma") {
            at++;
            continue;
          }
          if (peek()?.kind !== "placeholder") throw new Error("expected placeholder in IN list");
          at++;
          nextParam++;
          count++;
        }
        at++;
        return { type: "in", column, paramIndex, count };
      }
      if (next?.kind === "is") {
        at++;
        const negated = peek()?.kind === "not";
        if (negated) at++;
        if (peek()?.kind !== "null") throw new Error("expected NULL after IS[ NOT]");
        at++;
        return { type: "isNull", column, negated };
      }
      if (next?.kind !== "op") throw new Error(`expected an operator after '${column}'`);
      at++;
      if (peek()?.kind !== "placeholder") throw new Error("expected placeholder after operator");
      const paramIndex = nextParam;
      nextParam++;
      at++;
      return { type: "compare", column, op: next.op, paramIndex };
    }
    throw new Error(`unexpected token: ${JSON.stringify(token)}`);
  };

  const result = expectExpr();
  if (at !== tokens.length) throw new Error("trailing tokens after a complete expression");
  return result;
};

const compareValue = (op: "=" | "!=" | ">=" | "<", value: unknown, against: unknown): boolean => {
  if (op === "=") return value === against;
  if (op === "!=") return value !== against;
  if (op === ">=") return typeof value === "number" && typeof against === "number" && value >= against;
  return typeof value === "number" && typeof against === "number" && value < against;
};

const interpret = (
  ast: Ast,
  params: ReadonlyArray<unknown>,
  row: Readonly<Record<string, unknown>>,
): boolean => {
  if (ast.type === "true") return true;
  if (ast.type === "false") return false;
  if (ast.type === "not") return !interpret(ast.inner, params, row);
  if (ast.type === "and") return ast.parts.every((part) => interpret(part, params, row));
  if (ast.type === "or") return ast.parts.some((part) => interpret(part, params, row));
  if (ast.type === "case") {
    return interpret(ast.cond, params, row) ? ast.thenValue : ast.elseValue;
  }
  if (ast.type === "compare") {
    return compareValue(ast.op, row[ast.column], params[ast.paramIndex]);
  }
  if (ast.type === "isNull") {
    return ast.negated ? row[ast.column] !== null : row[ast.column] === null;
  }
  const members = params.slice(ast.paramIndex, ast.paramIndex + ast.count);
  return members.includes(row[ast.column]);
};

/** Interprets a rendered `SqlFragment` against one row. Test-only. */
export const interpretSqlFragment = (
  fragment: SqlFragment,
  row: Readonly<Record<string, unknown>>,
): boolean => interpret(parse(tokenize(fragment.text)), fragment.params, row);
