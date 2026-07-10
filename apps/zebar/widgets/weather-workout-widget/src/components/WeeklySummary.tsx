import type { ScoredDay } from '../lib/workout-weather-score';
import { cn } from '../utils/cn';

interface WeeklySummaryProps {
  days: ScoredDay[];
  bestDateKey: string | null;
  selectedDateKey: string | null;
  onSelectDay: (dateKey: string) => void;
}

const categoryClass: Record<ScoredDay['category'], string> = {
  excellent: 'border-transparent bg-success/10 text-success/85',
  good: 'border-transparent bg-primary/10 text-primary/85',
  okay: 'border-transparent bg-warning/5 text-text-muted',
  tough: 'border-transparent bg-warning/10 text-warning/85',
  avoid: 'border-transparent bg-danger/10 text-danger/85',
};

const dotClass: Record<ScoredDay['category'], string> = {
  excellent: 'bg-success',
  good: 'bg-primary',
  okay: 'bg-warning',
  tough: 'bg-warning/70',
  avoid: 'bg-danger',
};

function shortDay(dayLabel: string): string {
  return dayLabel.split(' ')[0] ?? dayLabel;
}

function bestTemp(day: ScoredDay): string {
  const bestHour = day.hours.reduce((best, hour) =>
    hour.score > best.score ? hour : best
  );
  return `${bestHour.temperatureF}°`;
}

export function WeeklySummary({
  days,
  bestDateKey,
  selectedDateKey,
  onSelectDay,
}: WeeklySummaryProps) {
  const visibleDays = days.slice(0, 7);

  if (visibleDays.length === 0) return null;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
          7-day quick view
        </h2>
        <p className="text-[10px] text-text-muted">tap a day for details</p>
      </div>
      <div className="rounded-xl border border-border/50 bg-background-deeper/40 p-1.5">
        <div className="grid grid-cols-7 gap-1.5">
          {visibleDays.map((day) => {
            const selected = selectedDateKey === day.dateKey;
            const best = bestDateKey === day.dateKey;

            return (
              <button
                key={day.dateKey}
                className={cn(
                  'relative min-w-0 rounded-lg border px-1.5 py-2 text-center transition-all hover:translate-y-[-1px] focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-primary/35',
                  categoryClass[day.category],
                  selected
                    ? 'border-primary/15 bg-primary/10 shadow-[inset_0_0_0_1px_rgba(147,197,253,0.10),0_0_12px_rgba(59,130,246,0.08)]'
                    : 'opacity-85 hover:opacity-100'
                )}
                onClick={() => onSelectDay(day.dateKey)}
                title={`${day.dayLabel}: ${day.summary}`}
              >
                {best && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full border border-transparent bg-primary/10 px-1.5 text-[8px] uppercase tracking-wide text-primary/85">
                    best
                  </span>
                )}
                <p className="truncate text-[11px] font-semibold leading-tight">
                  {shortDay(day.dayLabel)}
                </p>
                <div
                  className={cn(
                    'mx-auto mt-1 size-2 rounded-full',
                    dotClass[day.category]
                  )}
                />
                <p className="mt-1 text-[11px] font-medium tabular-nums">{day.score}</p>
                <p className="text-[11px] tabular-nums opacity-80">
                  {bestTemp(day)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
