import { useEffect, useState } from 'react';
import { StatusAction } from '../components/media/components/Status';

interface PlayPauseState {
  isPlaying: boolean;
  statusAction: StatusAction | null;
}

export function usePlayPause(isPlaying: boolean) {
  const [playPauseState, setPlayPauseState] = useState<PlayPauseState>({
    isPlaying,
    statusAction: null,
  });

  const keyActionMap: Record<string, StatusAction> = {
    Shift: StatusAction.Previous,
    Control: StatusAction.Next,
    Alt: StatusAction.Switch,
  };

  useEffect(() => {
    setPlayPauseState((prev) => ({
      ...prev,
      isPlaying,
    }));
  }, [isPlaying]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const action = keyActionMap[e.key];
      if (action) {
        setPlayPauseState((prev) => ({
          ...prev,
          statusAction: action,
        }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (keyActionMap[e.key]) {
        setPlayPauseState((prev) => ({ ...prev, statusAction: null }));
      }
    };

    const handleBlur = () => {
      setPlayPauseState((prev) => ({ ...prev, statusAction: null }));
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [keyActionMap]);

  return playPauseState;
}
