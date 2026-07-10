import { Button } from '@petehome/ui';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { cn } from '../utils/cn';

interface StopwatchControlsProps {
  running: boolean;
  onToggle: () => void;
  onReset: () => void;
  resetDisabled?: boolean;
  className?: string;
}

export function StopwatchControls({
  running,
  onToggle,
  onReset,
  resetDisabled = false,
  className,
}: StopwatchControlsProps) {
  return (
    <div className={cn('flex gap-3 w-full px-4', className)}>
      <Button
        variant="default"
        size="lg"
        className="flex-1 rounded-full h-11"
        onClick={onToggle}
      >
        {running ? (
          <Pause className="size-4" strokeWidth={2.5} />
        ) : (
          <Play className="size-4" strokeWidth={2.5} />
        )}
      </Button>
      <Button
        variant="default"
        size="lg"
        className="flex-1 rounded-full h-11"
        onClick={onReset}
        disabled={resetDisabled}
      >
        <RotateCcw className="size-4" strokeWidth={2.5} />
      </Button>
    </div>
  );
}
