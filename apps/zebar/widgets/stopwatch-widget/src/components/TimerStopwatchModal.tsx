import {
  formatCompactMs,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  usePersistedCountdown,
  usePersistedStopwatch,
  useTimerPreferences,
} from '@petehome/ui';
import {
  Check,
  Hourglass,
  Maximize2,
  Minimize2,
  Timer,
  Volume2,
  VolumeOff,
} from 'lucide-react';
import { useState } from 'react';
import * as zebar from 'zebar';
import { cn } from '../utils/cn';
import { CircularTimerRing } from './CircularTimerRing';
import { StopwatchControls } from './StopwatchControls';
import { TimerSetup } from './TimerSetup';

const NORMAL_SIZE = { width: 380, height: 440 };
const EXPANDED_SIZE = { width: 600, height: 600 };

export function TimerStopwatchModal() {
  const stopwatch = usePersistedStopwatch();
  const countdown = usePersistedCountdown();
  const { activeTab, muted, setActiveTab, toggleMuted } = useTimerPreferences();
  const [expanded, setExpanded] = useState(false);

  const handleExpandToggle = async () => {
    const widget = zebar.currentWidget();
    const size = expanded ? NORMAL_SIZE : EXPANDED_SIZE;
    await widget.tauriWindow.setSize({
      type: 'Logical',
      width: size.width,
      height: size.height,
    });
    setExpanded(!expanded);
  };

  const stopwatchProgress = ((stopwatch.elapsedMs % 60000) / 60000) * 100;
  const stopwatchDotAngle = (stopwatchProgress / 100) * 360 - 90;

  const countdownProgress =
    countdown.durationMs > 0
      ? (countdown.remainingMs / countdown.durationMs) * 100
      : 0;

  const timerIdle =
    !countdown.running &&
    !countdown.completed &&
    countdown.remainingMs === countdown.durationMs;

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as 'timer' | 'stopwatch')}
      variant="capsule"
      className="flex flex-col h-full w-full p-4 gap-4"
    >
      <div className="flex items-center justify-between">
        <TabsList className="h-8">
          <TabsTrigger value="timer" className="gap-1.5 px-3">
            <Hourglass className="size-3.5" />
            Timer
            {activeTab === 'timer' && (
              <Check className="size-3 text-primary" strokeWidth={3} />
            )}
          </TabsTrigger>
          <TabsTrigger value="stopwatch" className="gap-1.5 px-3">
            <Timer className="size-3.5" />
            Stopwatch
            {activeTab === 'stopwatch' && (
              <Check className="size-3 text-primary" strokeWidth={3} />
            )}
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-1">
          <button
            onClick={toggleMuted}
            className="p-1.5 rounded-md text-icon hover:text-text transition-colors"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? (
              <VolumeOff className="size-4" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
          <button
            onClick={handleExpandToggle}
            className="p-1.5 rounded-md text-icon hover:text-text transition-colors"
            title={expanded ? 'Shrink' : 'Expand'}
          >
            {expanded ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </button>
        </div>
      </div>

      <TabsContent value="stopwatch" className="flex-1 flex flex-col gap-6">
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <CircularTimerRing
            progressPercent={stopwatchProgress}
            dotAngle={stopwatchDotAngle}
            size={expanded ? 320 : 220}
          />
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center tabular-nums font-semibold text-text',
              expanded ? 'text-6xl' : 'text-5xl'
            )}
          >
            {formatCompactMs(stopwatch.elapsedMs)}
          </div>
        </div>
        <StopwatchControls
          running={stopwatch.running}
          onToggle={stopwatch.toggle}
          onReset={stopwatch.reset}
        />
      </TabsContent>

      <TabsContent value="timer" className="flex-1 flex flex-col gap-4">
        {timerIdle && (
          <TimerSetup
            durationMs={countdown.durationMs}
            onSelectDuration={countdown.setDuration}
          />
        )}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          <CircularTimerRing
            progressPercent={countdownProgress}
            size={expanded ? 320 : 220}
          />
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center tabular-nums font-semibold text-text',
              expanded ? 'text-6xl' : 'text-5xl'
            )}
          >
            {formatCompactMs(countdown.remainingMs)}
          </div>
        </div>
        <StopwatchControls
          running={countdown.running}
          onToggle={countdown.toggle}
          onReset={countdown.reset}
        />
      </TabsContent>
    </Tabs>
  );
}
