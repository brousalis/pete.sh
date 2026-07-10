import { useCallback, useEffect, useState } from 'react';
import {
  getComputedElapsedMs,
  readStopwatchState,
  subscribeToTimerStorage,
  writeStopwatchState,
  writeTimerPreferences,
  readTimerPreferences,
  type StopwatchState,
} from '../utils/timer-storage';

export function usePersistedStopwatch() {
  const [state, setState] = useState<StopwatchState>(() => readStopwatchState());
  const [elapsedMs, setElapsedMs] = useState(() =>
    getComputedElapsedMs(readStopwatchState())
  );

  const syncFromStorage = useCallback(() => {
    const stored = readStopwatchState();
    setState(stored);
    setElapsedMs(getComputedElapsedMs(stored));
  }, []);

  useEffect(() => {
    return subscribeToTimerStorage(syncFromStorage);
  }, [syncFromStorage]);

  useEffect(() => {
    if (!state.running) {
      setElapsedMs(state.elapsedMs);
      return;
    }

    const origin = state.originTimestamp ?? Date.now() - state.elapsedMs;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - origin);
    }, 50);

    return () => clearInterval(id);
  }, [state.running, state.originTimestamp, state.elapsedMs]);

  const persist = useCallback((next: StopwatchState) => {
    writeStopwatchState(next);
    setState(next);
    setElapsedMs(getComputedElapsedMs(next));
  }, []);

  const start = useCallback(() => {
    const current = readStopwatchState();
    if (current.running) return;
    const originTimestamp = Date.now() - current.elapsedMs;
    const next: StopwatchState = {
      ...current,
      running: true,
      originTimestamp,
      lastStartedAt: Date.now(),
    };
    persist(next);
    const prefs = readTimerPreferences();
    writeTimerPreferences({ ...prefs, lastActiveMode: 'stopwatch' });
  }, [persist]);

  const pause = useCallback(() => {
    const current = readStopwatchState();
    if (!current.running) return;
    const elapsed = getComputedElapsedMs(current);
    const next: StopwatchState = {
      ...current,
      running: false,
      elapsedMs: elapsed,
      originTimestamp: null,
    };
    persist(next);
  }, [persist]);

  const reset = useCallback(() => {
    const next: StopwatchState = {
      elapsedMs: 0,
      running: false,
      originTimestamp: null,
      lastStartedAt: null,
    };
    persist(next);
  }, [persist]);

  const toggle = useCallback(() => {
    const current = readStopwatchState();
    if (current.running) {
      pause();
    } else {
      start();
    }
  }, [start, pause]);

  return {
    elapsedMs,
    running: state.running,
    start,
    pause,
    reset,
    toggle,
  };
}
