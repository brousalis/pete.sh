import { useCallback, useEffect, useState } from 'react';
import {
  readTimerPreferences,
  subscribeToTimerStorage,
  writeTimerPreferences,
  type TimerPreferences,
  type TimerTab,
} from '../utils/timer-storage';

export function useTimerPreferences() {
  const [prefs, setPrefs] = useState<TimerPreferences>(() =>
    readTimerPreferences()
  );

  const syncFromStorage = useCallback(() => {
    setPrefs(readTimerPreferences());
  }, []);

  useEffect(() => {
    return subscribeToTimerStorage(syncFromStorage);
  }, [syncFromStorage]);

  const setActiveTab = useCallback((activeTab: TimerTab) => {
    const current = readTimerPreferences();
    const next = { ...current, activeTab };
    writeTimerPreferences(next);
    setPrefs(next);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    const current = readTimerPreferences();
    const next = { ...current, muted };
    writeTimerPreferences(next);
    setPrefs(next);
  }, []);

  const toggleMuted = useCallback(() => {
    const current = readTimerPreferences();
    setMuted(!current.muted);
  }, [setMuted]);

  return {
    activeTab: prefs.activeTab,
    muted: prefs.muted,
    lastActiveMode: prefs.lastActiveMode,
    setActiveTab,
    setMuted,
    toggleMuted,
  };
}
