import { Chip } from '@petehome/ui';
import { cn } from '../utils/cn';

const PRESETS = [
  { label: '1m', ms: 60 * 1000 },
  { label: '5m', ms: 5 * 60 * 1000 },
  { label: '10m', ms: 10 * 60 * 1000 },
  { label: '25m', ms: 25 * 60 * 1000 },
] as const;

interface TimerSetupProps {
  durationMs: number;
  onSelectDuration: (ms: number) => void;
  className?: string;
}

export function TimerSetup({
  durationMs,
  onSelectDuration,
  className,
}: TimerSetupProps) {
  return (
    <div className={cn('flex flex-wrap justify-center gap-2 px-4', className)}>
      {PRESETS.map((preset) => (
        <Chip
          key={preset.label}
          as="button"
          className={cn(
            'px-3 py-1 text-sm cursor-pointer',
            durationMs === preset.ms &&
              'border-primary text-primary bg-primary/10'
          )}
          onClick={() => onSelectDuration(preset.ms)}
        >
          {preset.label}
        </Chip>
      ))}
    </div>
  );
}
