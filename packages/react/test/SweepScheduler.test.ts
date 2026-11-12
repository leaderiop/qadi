/**
 * The sweep coalescer and its construction path, with plain functions and a
 * recording fork: no atoms, no React.
 *
 * The normative test home of the rule that one pressure episode is one fiber and
 * one sweep, however many requests it carries, and that the sweep runs after the
 * request's call has returned.
 */
import { hasPermission, permission } from "@qadi/core";
import * as Effect from "effect/Effect";
import type * as Fiber from "effect/Fiber";
import { describe, expect, it } from "vitest";
import type { AskedQuestion } from "../src/QuestionBook.ts";
import { makeQuestionBook } from "../src/QuestionBook.ts";
import type { SweepFork, SweepScheduler } from "../src/SweepScheduler.ts";
import { makeSweepScheduler, sweepForkOf, withSweepFork } from "../src/SweepScheduler.ts";
import { settle } from "./support/settle.ts";

const q = (name: string): AskedQuestion => ({ policy: hasPermission(permission("doc", name)) });

interface Handle {
  readonly live: () => () => void;
}

const recorder = () => {
  const fibers: Array<Fiber.Fiber<void>> = [];
  const fork: SweepFork = (effect) => {
    const fiber = Effect.runFork(effect);
    fibers.push(fiber);
    return fiber;
  };
  return { fibers, fork };
};

describe("makeSweepScheduler", () => {
  it("C1 a request sweeps after the call returns, never during it", async () => {
    let sweeps = 0;
    const scheduler = makeSweepScheduler(() => {
      sweeps += 1;
    });

    scheduler.request();
    expect(sweeps).toBe(0);

    await settle();
    expect(sweeps).toBe(1);
  });

  it("C2 many requests in one synchronous span fork one fiber and sweep once", async () => {
    let sweeps = 0;
    const { fibers, fork } = recorder();
    const scheduler = makeSweepScheduler(() => {
      sweeps += 1;
    }, fork);

    for (let i = 0; i < 5; i++) scheduler.request();
    expect(fibers.length).toBe(1);

    await settle();
    expect(fibers.length).toBe(1);
    expect(sweeps).toBe(1);
  });

  it("C3 a request after a sweep starts a new episode", async () => {
    let sweeps = 0;
    const { fibers, fork } = recorder();
    const scheduler = makeSweepScheduler(() => {
      sweeps += 1;
    }, fork);

    scheduler.request();
    await settle();
    scheduler.request();
    await settle();

    expect(fibers.length).toBe(2);
    expect(sweeps).toBe(2);
  });

  it("C4 a request raised by the sweep itself schedules exactly one more", async () => {
    let sweeps = 0;
    const scheduler: SweepScheduler = makeSweepScheduler(() => {
      sweeps += 1;
      if (sweeps === 1) scheduler.request();
    });

    scheduler.request();
    await settle();

    expect(sweeps).toBe(2);
  });

  it("C5 pending is true from the first request until the sweep runs", async () => {
    const scheduler = makeSweepScheduler(() => undefined);

    expect(scheduler.pending()).toBe(false);
    scheduler.request();
    expect(scheduler.pending()).toBe(true);
    await settle();
    expect(scheduler.pending()).toBe(false);
  });

  it("C6 a scheduler never requested forks nothing", async () => {
    let sweeps = 0;
    const { fibers, fork } = recorder();
    makeSweepScheduler(() => {
      sweeps += 1;
    }, fork);

    await settle();

    expect(fibers.length).toBe(0);
    expect(sweeps).toBe(0);
  });

  it("C7 three hundred schedulers over real books leave every fiber done and none pending", async () => {
    const { fibers, fork } = recorder();
    const schedulers: Array<SweepScheduler> = [];
    const books: Array<{ readonly asked: () => ReadonlyArray<AskedQuestion> }> = [];
    for (let i = 0; i < 300; i++) {
      const scheduler = makeSweepScheduler(() => book.sweep(), fork);
      const book = makeQuestionBook<Handle>({
        capacity: 1,
        build: (_question, live) => ({ live }),
        signal: scheduler.request,
      });
      for (const name of ["a", "b"]) {
        const release = book.open(q(name)).live();
        release();
      }
      schedulers.push(scheduler);
      books.push(book);
    }

    await settle();

    expect(fibers.length).toBe(300);
    expect(fibers.every((fiber) => fiber.pollUnsafe() !== undefined)).toBe(true);
    expect(schedulers.some((scheduler) => scheduler.pending())).toBe(false);
    expect(books.every((book) => book.asked().length === 1)).toBe(true);
  });

  it("C8 the default fork runs the sweep after a settle", async () => {
    let sweeps = 0;
    const scheduler = makeSweepScheduler(() => {
      sweeps += 1;
    });

    scheduler.request();
    await settle();

    expect(sweeps).toBe(1);
  });

  it("C9 four readers released in one turn over one book raise four signals and one sweep", async () => {
    let signals = 0;
    let sweeps = 0;
    const scheduler = makeSweepScheduler(() => {
      sweeps += 1;
      book.sweep();
    });
    const book = makeQuestionBook<Handle>({
      capacity: 2,
      build: (_question, live) => ({ live }),
      signal: () => {
        signals += 1;
        scheduler.request();
      },
    });
    const releases = ["a", "b", "c", "d", "e", "f"].map((name) => book.open(q(name)).live());
    await settle();
    signals = 0;
    sweeps = 0;

    for (const release of releases.slice(0, 4)) release();
    expect(signals).toBe(4);

    await settle();
    expect(sweeps).toBe(1);
    expect(book.asked().length).toBe(2);
  });

  it("C10 withSweepFork hands a fork to the one options object it returns, unreachable by reflection or a spread copy", () => {
    const { fork } = recorder();
    const carried = withSweepFork({ maxTrackedQuestions: 2 }, fork);

    expect(sweepForkOf(carried)).toBe(fork);
    expect(carried.maxTrackedQuestions).toBe(2);
    expect(Object.keys(carried)).toEqual(["maxTrackedQuestions"]);
    expect(Object.getOwnPropertySymbols(carried)).toEqual([]);
    expect(sweepForkOf({ ...carried })).toBeUndefined();
    expect(sweepForkOf({ maxTrackedQuestions: 2 })).toBeUndefined();
    expect(sweepForkOf(undefined)).toBeUndefined();
  });
});
