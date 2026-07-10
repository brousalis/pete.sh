import * as zebar from 'zebar';

export type TimerTab = 'timer' | 'stopwatch';

export interface StopwatchState {
  elapsedMs: number;
  running: boolean;
  originTimestamp: number | null;
  lastStartedAt: number | null;
}

export interface CountdownState {
  durationMs: number;
  remainingMs: number;
  running: boolean;
  originTimestamp: number | null;
  lastStartedAt: number | null;
  completed: boolean;
}

export interface TimerPreferences {
  activeTab: TimerTab;
  muted: boolean;
  lastActiveMode: 'stopwatch' | 'countdown' | null;
}

const KEYS = {
  stopwatch: 'petehome.timer.stopwatch',
  countdown: 'petehome.timer.countdown',
  preferences: 'petehome.timer.preferences',
} as const;

const DEFAULT_STOPWATCH: StopwatchState = {
  elapsedMs: 0,
  running: false,
  originTimestamp: null,
  lastStartedAt: null,
};

const DEFAULT_COUNTDOWN: CountdownState = {
  durationMs: 5 * 60 * 1000,
  remainingMs: 5 * 60 * 1000,
  running: false,
  originTimestamp: null,
  lastStartedAt: null,
  completed: false,
};

const DEFAULT_PREFERENCES: TimerPreferences = {
  activeTab: 'stopwatch',
  muted: false,
  lastActiveMode: null,
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  try {
    zebar.currentWidget().tauriWindow.emit('timer-changed', { key });
  } catch {
    // zebar not available outside widget context
  }
}

export function readStopwatchState(): StopwatchState {
  return readJson(KEYS.stopwatch, DEFAULT_STOPWATCH);
}

export function writeStopwatchState(state: StopwatchState): void {
  writeJson(KEYS.stopwatch, state);
}

export function readCountdownState(): CountdownState {
  return readJson(KEYS.countdown, DEFAULT_COUNTDOWN);
}

export function writeCountdownState(state: CountdownState): void {
  writeJson(KEYS.countdown, state);
}

export function readTimerPreferences(): TimerPreferences {
  return readJson(KEYS.preferences, DEFAULT_PREFERENCES);
}

export function writeTimerPreferences(prefs: TimerPreferences): void {
  writeJson(KEYS.preferences, prefs);
}

export function subscribeToTimerStorage(
  callback: (key: string) => void
): () => void {
  const handler = (event: StorageEvent) => {
    if (
      event.key === KEYS.stopwatch ||
      event.key === KEYS.countdown ||
      event.key === KEYS.preferences
    ) {
      callback(event.key);
    }
  };

  window.addEventListener('storage', handler);

  let unlisten: (() => void) | undefined;
  zebar
    .currentWidget()
    .tauriWindow.listen('timer-changed', (event: { payload: { key: string } }) => {
      callback(event.payload.key);
    })
    .then((fn) => {
      unlisten = fn;
    })
    .catch(() => {});

  return () => {
    window.removeEventListener('storage', handler);
    unlisten?.();
  };
}

export function getComputedElapsedMs(state: StopwatchState): number {
  if (!state.running || state.originTimestamp === null) {
    return state.elapsedMs;
  }
  return Date.now() - state.originTimestamp;
}

export function getComputedRemainingMs(state: CountdownState): number {
  if (!state.running || state.originTimestamp === null) {
    return state.remainingMs;
  }
  const elapsed = Date.now() - state.originTimestamp;
  return Math.max(0, state.remainingMs - elapsed);
}
