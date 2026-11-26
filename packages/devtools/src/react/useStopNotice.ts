"use client";
/**
 * Holds one feed's stop ledger and hands its notice the props it reads.
 *
 * The dock's frame calls it once per feed, so each feed has its own reducer and a second stop
 * re-announces only its own notice, and the ledger outlives every screen. It is a hook
 * because the reducer and the memo are. The memo follows the feed's `restart` as well as
 * its status: each feed's `restart` is one closure per feed, so a model rebuilt after a
 * hidden `Activity` is a new `restart` and the notice moves with it (ADR-QD-197, ADR-QD-201).
 *
 * Package-private: it is in no barrel and so not importable (AGENTS.md §9, ADR-QD-099).
 */
import { useMemo, useReducer } from "react";
import { noStops, recordStop, type StopLedger } from "../model/StopLedger.ts";
import type { StopNoticeProps } from "./StoppedBox.tsx";

export const useStopNotice = <S>(status: S, onRestart: () => void): StopNoticeProps<S> => {
  // Records only which stop was announced, never what the status says (AGENTS.md §13).
  const [ledger, record] = useReducer<StopLedger<S>, [S]>(recordStop, noStops);
  return useMemo(
    () => ({ status, onRestart, announced: { ledger, record } }),
    [status, onRestart, ledger, record],
  );
};
