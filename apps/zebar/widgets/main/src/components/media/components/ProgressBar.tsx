import { useState, useEffect } from 'react';
import { MediaSession } from 'zebar';

export function ProgressBar({
  currentSession,
}: {
  currentSession: MediaSession | undefined;
}) {
  const [progress, setProgress] = useState<number>(
    currentSession?.position ?? 0
  );

  useEffect(() => {
    if (!currentSession?.position) {
      setProgress(0);
      return;
    }

    setProgress(currentSession.position);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < currentSession.endTime) {
          if (!currentSession.isPlaying) {
            return prev;
          }
          return prev + 1;
        } else {
          setProgress(0);
          clearInterval(interval);
          return prev;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession, currentSession?.position]);

  return (
    <div
      className="absolute h-[1.5px] bg-primary bottom-0 left-0 transition-[width] duration-200 ease-out"
      style={{
        width: currentSession
          ? `${(progress / currentSession?.endTime) * 100 || 0}%`
          : '0',
      }}
    ></div>
  );
}
