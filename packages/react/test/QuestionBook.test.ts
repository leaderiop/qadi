/**
 * The question book, with plain objects: no atoms, no registry, no React.
 *
 * The normative test home of BEH-QD-198's bound and INV-QD-105. Every liveness
 * rule is a property of counts and order, so none of it needs a scheduler.
 */
import { hasPermission, hasRole, permission } from "@qadi/core";
import { describe, expect, it } from "vitest";
import type { AskedQuestion } from "../src/QuestionBook.ts";
import { makeQuestionBook } from "../src/QuestionBook.ts";

const named = (name: string) => hasPermission(permission("doc", name));
const q = (name: string): AskedQuestion => ({ policy: named(name) });

interface Handle {
  readonly n: number;
  readonly live: () => () => void;
}

const makeBook = (capacity: number) => {
  let built = 0;
  const book = makeQuestionBook<Handle>({
    capacity,
    build: (_question, live) => {
      built += 1;
      return { n: built, live };
    },
  });
  return { book, built: () => built };
};

describe("makeQuestionBook", () => {
  it("returns the same handle for a structurally equal question", () => {
    const { book, built } = makeBook(10);

    const first = book.open({ policy: hasRole("admin") });
    const second = book.open({ policy: hasRole("admin") });

    expect(second).toBe(first);
    expect(built()).toBe(1);
    expect(book.asked().length).toBe(1);
  });

  it("keeps a bare question and a resource-scoped one apart", () => {
    const { book } = makeBook(10);

    const bare = book.open(q("read"));
    const scoped = book.open({ policy: named("read"), resource: { id: "d1" } });
    const other = book.open({ policy: named("read"), resource: { id: "d2" } });

    expect(new Set([bare, scoped, other]).size).toBe(3);
    expect(book.open({ policy: named("read"), resource: { id: "d1" } })).toBe(scoped);
  });

  it("lists a bare question without a resource key and a scoped one with it", () => {
    const { book } = makeBook(10);
    book.open(q("read"));
    book.open({ policy: named("read"), resource: { id: "d1" } });

    const [bare, scoped] = book.asked();
    expect(bare).toEqual({ policy: named("read") });
    expect("resource" in (bare ?? {})).toBe(false);
    expect(scoped).toEqual({ policy: named("read"), resource: { id: "d1" } });
  });

  it("hands back a copy from asked()", () => {
    const { book } = makeBook(10);
    book.open(q("a"));
    const first = book.asked();
    book.open(q("b"));

    expect(first.length).toBe(1);
    expect(book.asked().length).toBe(2);
  });

  it("evicts the oldest cold questions first", () => {
    const { book } = makeBook(2);
    book.open(q("a"));
    book.open(q("b"));
    book.open(q("c"));

    book.sweep();

    expect(book.asked().map((x) => x.policy)).toEqual([named("b"), named("c")]);
  });

  it("evicts several in one pass", () => {
    const { book } = makeBook(1);
    for (const name of ["a", "b", "c", "d"]) book.open(q(name));

    book.sweep();

    expect(book.asked().map((x) => x.policy)).toEqual([named("d")]);
  });

  it("does nothing at or under the bound", () => {
    const { book } = makeBook(2);
    book.open(q("a"));
    book.open(q("b"));

    book.sweep();

    expect(book.asked().length).toBe(2);
  });

  it("never evicts a question a reader holds open", () => {
    const { book } = makeBook(1);
    const held = book.open(q("a"));
    book.open(q("b"));
    book.open(q("c"));
    const release = held.live();

    book.sweep();

    expect(book.asked().map((x) => x.policy)).toEqual([named("a")]);
    release();
  });

  it("evicts the cold ones and keeps the live one wherever it sits in the order", () => {
    const { book } = makeBook(2);
    book.open(q("a"));
    const middle = book.open(q("b"));
    book.open(q("c"));
    book.open(q("d"));
    const release = middle.live();

    book.sweep();

    expect(book.asked().map((x) => x.policy)).toEqual([named("b"), named("d")]);
    release();
  });

  it("stops when every remaining question is live, rather than dropping one", () => {
    const { book } = makeBook(1);
    const a = book.open(q("a")).live();
    const b = book.open(q("b")).live();

    book.sweep();

    expect(book.asked().length).toBe(2);
    a();
    b();
  });

  it("makes a question eligible again once its last reader releases", () => {
    const { book } = makeBook(1);
    const a = book.open(q("a"));
    const first = a.live();
    const second = a.live();
    book.open(q("b"));

    first();
    book.sweep();
    // One reader is left: the cold `b` goes, `a` stays.
    expect(book.asked().map((x) => x.policy)).toEqual([named("a")]);

    book.open(q("c"));
    second();
    book.sweep();
    expect(book.asked().map((x) => x.policy)).toEqual([named("c")]);
  });

  it("makes a release idempotent", () => {
    const { book } = makeBook(1);
    const a = book.open(q("a"));
    const release = a.live();
    const other = a.live();
    book.open(q("b"));

    release();
    release();
    book.sweep();

    // `other` still holds `a`: a doubled release must not have driven the count to
    // zero, which would have made the older `a` the one swept.
    expect(book.asked().map((x) => x.policy)).toEqual([named("a")]);
    other();
  });

  it("re-admits a swept question when a reader of its old handle runs again", () => {
    const { book } = makeBook(1);
    const a = book.open(q("a"));
    book.open(q("b"));
    book.sweep();
    expect(book.asked().map((x) => x.policy)).toEqual([named("b")]);

    const release = a.live();

    expect(book.asked().map((x) => x.policy)).toEqual([named("b"), named("a")]);
    release();
  });

  it("builds a fresh handle when a swept question is asked again", () => {
    const { book, built } = makeBook(1);
    const a = book.open(q("a"));
    book.open(q("b"));
    book.sweep();

    const again = book.open(q("a"));

    expect(again).not.toBe(a);
    expect(built()).toBe(3);
  });

  it("never lists a question twice when an old handle outlives its replacement", () => {
    const { book } = makeBook(1);
    const old = book.open(q("a"));
    book.open(q("b"));
    book.sweep();
    book.open(q("a"));

    const release = old.live();

    expect(book.asked().map((x) => x.policy)).toEqual([named("b"), named("a")]);
    release();
  });

  it("lets an old handle that lost its key die with its readers", () => {
    const { book } = makeBook(1);
    const old = book.open(q("a"));
    book.open(q("b"));
    book.sweep();
    book.open(q("a"));
    const release = old.live();
    release();

    book.sweep();

    expect(book.asked().map((x) => x.policy)).toEqual([named("a")]);
  });

  it("rejects a capacity that is not a positive integer", () => {
    const build = () => ({ n: 0, live: () => () => undefined });
    for (const capacity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => makeQuestionBook<Handle>({ capacity, build })).toThrow(/maxTrackedQuestions/);
    }
    expect(() => makeQuestionBook<Handle>({ capacity: 1, build })).not.toThrow();
  });
});
