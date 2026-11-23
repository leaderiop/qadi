/**
 * Pins the key and the parents `makeDerivedStore` accepts.
 *
 * A key type with an optional field, an empty parent list and a compute reading a
 * field outside its key are each a compile error. Each negative is a
 * `@ts-expect-error` checked twice, as in `CompilePredicate.tst.ts`: under
 * `pnpm typecheck` an unused directive is TS2578, and under `pnpm test:tstyche` the
 * text after it is a fragment of the one suppressed error's message. Each refused
 * call is held in a `const` that `expect` reads, so no Effect is left floating for
 * the language service to report in place of the refusal.
 *
 * Each refusal differs from the accepted call in one argument: the key's declared
 * type, the parents, or the field the compute reads. The compute's parameter and
 * result are annotated in every call, because a call with a refused argument infers
 * its result type as `unknown` from an unannotated compute, and `expect` would then
 * fail on the result type instead of the refusal.
 */
import { expect, test } from "tstyche";
import type * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { makeDerivedStore } from "../../src/model/ExternalStore.ts";
import type { DerivedStore, ReadableStore } from "../../src/model/ExternalStore.ts";

interface Three {
  readonly a: string;
  readonly b: number | undefined;
  readonly c: boolean;
}

interface WithOptional {
  readonly a: string;
  readonly b?: number | undefined;
  readonly c: boolean;
}

declare const parent: ReadableStore<string>;

type Expected = Effect.Effect<DerivedStore<number>, never, Scope.Scope>;

test("a three-field key, one parent and a compute reading its key are accepted", () => {
  const built = makeDerivedStore({
    parents: [parent],
    key: (): Three => ({ a: parent.getSnapshot(), b: undefined, c: true }),
    compute: (key: Three): number => key.a.length,
  });
  expect(built).type.toBe<Expected>();
});

test("a key type with an optional field is refused", () => {
  const built = makeDerivedStore({
    parents: [parent],
    // @ts-expect-error is optional in type
    key: (): WithOptional => ({ a: parent.getSnapshot(), b: undefined, c: true }),
    compute: (key: WithOptional): number => key.a.length,
  });
  expect(built).type.toBe<Expected>();
});

test("an empty parent list is refused", () => {
  const built = makeDerivedStore({
    // @ts-expect-error but target requires 1
    parents: [],
    key: (): Three => ({ a: parent.getSnapshot(), b: undefined, c: true }),
    compute: (key: Three): number => key.a.length,
  });
  expect(built).type.toBe<Expected>();
});

test("a compute reading a field outside its key is refused", () => {
  const built = makeDerivedStore({
    parents: [parent],
    key: (): Three => ({ a: parent.getSnapshot(), b: undefined, c: true }),
    // @ts-expect-error does not exist on type
    compute: (key: Three): number => key.other,
  });
  expect(built).type.toBe<Expected>();
});
