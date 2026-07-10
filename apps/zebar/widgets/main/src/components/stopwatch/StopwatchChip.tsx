import {
  Chip,
  formatChipMs,
  usePersistedCountdown,
  usePersistedStopwatch,
  useTimerPreferences,
} from '@petehome/ui';
import { Timer } from 'lucide-react';
import { useRef } from 'react';
import * as zebar from 'zebar';
import { calculateWidgetPlacementFromRight } from '../../utils/calculateWidgetPlacement';

const POPUP_SIZE = { width: 380, height: 440 };

export function StopwatchChip() {
  const chipRef = useRef<HTMLDivElement | null>(null);
  const stopwatch = usePersistedStopwatch();
  const countdown = usePersistedCountdown();
  const { lastActiveMode } = useTimerPreferences();

  let label: string | null = null;
  if (stopwatch.running && countdown.running) {
    label =
      lastActiveMode === 'countdown'
        ? formatChipMs(countdown.remainingMs)
        : formatChipMs(stopwatch.elapsedMs);
  } else if (countdown.running) {
    label = formatChipMs(countdown.remainingMs);
  } else if (stopwatch.running) {
    label = formatChipMs(stopwatch.elapsedMs);
  }

  return (
    <Chip
      ref={chipRef}
      as="button"
      className="flex items-center gap-1.5 h-full pl-2.5 pr-2.5 min-w-[2.5rem]"
      title="Stopwatch / Timer"
      onClick={async () => {
        const placement = await calculateWidgetPlacementFromRight(
          chipRef,
          POPUP_SIZE
        );
        await zebar.startWidget('stopwatch-widget', placement, {});
      }}
    >
      <Timer className="h-3.5 w-3.5 text-icon shrink-0" strokeWidth={2.5} />
      {label && (
        <span className="font-medium text-sm tabular-nums">{label}</span>
      )}
    </Chip>
  );
}
