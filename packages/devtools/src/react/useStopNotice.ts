"use client";
/**
 * Holds one feed's stop ledger and hands its notice the props it reads.
 *
 * The dock calls it once per feed, so each feed has its own history and a second stop
 * re-announces only its own notice. The memo follows the feed's `restart`, not the model:
 * each feed's `restart` is one closure per feed, so a model rebuilt after a hidden
 * `Activity` is a new `restart` and the notice moves with it.
 *
 * Package-private: it is in no barrel and so not importable (AGENTS.md §9, ADR-QD-099).
 */
import { useMemo, useRef } from "react";
import { noStops, type StopLedger, type StopNoticeProps } from "./StoppedBox.tsx";

export const useStopNotice = <S,>(status: S, onRestart: () => void): StopNoticeProps<S> => {
  // Records only which stop was announced, never what the status says (AGENTS.md §13).
  const announced = useRef<StopLedger<S>>(noStops);
  return useMemo(() => ({ status, onRestart, announced }), [status, onRestart]);
};
