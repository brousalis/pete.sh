import { cn } from '../utils/cn';

interface CircularTimerRingProps {
  /** 0-100 progress for countdown depletion, or stopwatch lap progress */
  progressPercent: number;
  /** Dot angle in degrees (0 = top, clockwise) */
  dotAngle?: number;
  size?: number;
  className?: string;
}

export function CircularTimerRing({
  progressPercent,
  dotAngle,
  size = 220,
  className,
}: CircularTimerRingProps) {
  const strokeWidth = 3;
  const radius = 50 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progressPercent / 100) * circumference;

  const angle = dotAngle ?? (progressPercent / 100) * 360 - 90;
  const dotRad = (angle * Math.PI) / 180;
  const dotX = 50 + radius * Math.cos(dotRad);
  const dotY = 50 + radius * Math.sin(dotRad);

  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        className="absolute inset-0"
        width={size}
        height={size}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-border"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-primary"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          strokeLinecap="round"
        />
        <circle
          cx={dotX}
          cy={dotY}
          r={3}
          className="fill-primary"
        />
      </svg>
    </div>
  );
}
