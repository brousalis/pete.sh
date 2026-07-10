import { useCallback, useEffect, useRef, useState } from 'react';
import { playTimerCompleteChime } from '../utils/timer-chime';
import {
  getComputedRemainingMs,
  readCountdownState,
  readTimerPreferences,
  subscribeToTimerStorage,
  writeCountdownState,
  writeTimerPreferences,
  type CountdownState,
} from '../utils/timer-storage';

export function usePersistedCountdown() {
  const [state, setState] = useState<CountdownState>(() => readCountdownState());
  const [remainingMs, setRemainingMs] = useState(() =>
    getComputedRemainingMs(readCountdownState())
  );
  const completedRef = useRef(false);

  const syncFromStorage = useCallback(() => {
    const stored = readCountdownState();
    setState(stored);
    setRemainingMs(getComputedRemainingMs(stored));
    completedRef.current = stored.completed;
  }, []);

  useEffect(() => {
    return subscribeToTimerStorage(syncFromStorage);
  }, [syncFromStorage]);

  useEffect(() => {
    if (!state.running) {
      setRemainingMs(state.remainingMs);
      return;
    }

    const origin = state.originTimestamp ?? Date.now();
    const baseRemaining = state.remainingMs;

    const id = window.setInterval(() => {
      const elapsed = Date.now() - origin;
      const next = Math.max(0, baseRemaining - elapsed);
      setRemainingMs(next);

      if (next === 0 && !completedRef.current) {
        completedRef.current = true;
        const nextState: CountdownState = {
          ...readCountdownState(),
          running: false,
          remainingMs: 0,
          originTimestamp: null,
          completed: true,
        };
        writeCountdownState(nextState);
        setState(nextState);

        const prefs = readTimerPreferences();
        if (!prefs.muted) {
          playTimerCompleteChime();
        }
      }
    }, 50);

    return () => clearInterval(id);
  }, [state.running, state.originTimestamp, state.remainingMs]);

  const persist = useCallback((next: CountdownState) => {
    writeCountdownState(next);
    setState(next);
    setRemainingMs(getComputedRemainingMs(next));
    completedRef.current = next.completed;
  }, []);

  const setDuration = useCallback(
    (durationMs: number) => {
      const current = readCountdownState();
      if (current.running) return;
      const next: CountdownState = {
        ...current,
        durationMs,
        remainingMs: durationMs,
        completed: false,
      };
      persist(next);
    },
    [persist]
  );

  const start = useCallback(() => {
    const current = readCountdownState();
    if (current.running) return;

    const remainingMs =
      current.remainingMs <= 0 || current.completed
        ? current.durationMs
        : current.remainingMs;

    const next: CountdownState = {
      ...current,
      remainingMs,
      running: true,
      originTimestamp: Date.now(),
      lastStartedAt: Date.now(),
      completed: false,
    };
    persist(next);
    const prefs = readTimerPreferences();
    writeTimerPreferences({ ...prefs, lastActiveMode: 'countdown' });
  }, [persist]);

  const pause = useCallback(() => {
    const current = readCountdownState();
    if (!current.running) return;
    const remaining = getComputedRemainingMs(current);
    const next: CountdownState = {
      ...current,
      running: false,
      remainingMs: remaining,
      originTimestamp: null,
    };
    persist(next);
  }, [persist]);

  const reset = useCallback(() => {
    const current = readCountdownState();
    const next: CountdownState = {
      ...current,
      running: false,
      remainingMs: current.durationMs,
      originTimestamp: null,
      completed: false,
    };
    persist(next);
  }, [persist]);

  const toggle = useCallback(() => {
    const current = readCountdownState();
    if (current.running) {
      pause();
    } else {
      start();
    }
  }, [start, pause]);

  return {
    durationMs: state.durationMs,
    remainingMs,
    running: state.running,
    completed: state.completed,
    setDuration,
    start,
    pause,
    reset,
    toggle,
  };
}
