import { AlertTriangle, CheckCircle2, Circle, Wind } from 'lucide-react';
import type { ScoredDay, ScoredHour } from '../lib/workout-weather-score';
import { labelForCategory } from '../lib/workout-weather-score';
import { cn } from '../utils/cn';
import { ConditionPills } from './ConditionPills';
import { RainStormSection } from './RainStormSection';

interface ForecastDayCardProps {
  day: ScoredDay;
}

const categoryClass: Record<ScoredDay['category'], string> = {
  excellent: 'text-success/85 border-transparent bg-success/10',
  good: 'text-primary/85 border-transparent bg-primary/10',
  okay: 'text-text-muted border-transparent bg-warning/5',
  tough: 'text-warning/85 border-transparent bg-warning/10',
  avoid: 'text-danger/85 border-transparent bg-danger/10',
};

const dotClass: Record<ScoredHour['category'], string> = {
  excellent: 'bg-success',
  good: 'bg-primary',
  okay: 'bg-warning',
  tough: 'bg-warning/70',
  avoid: 'bg-danger',
};

function DayIcon({ category }: { category: ScoredDay['category'] }) {
  if (category === 'avoid') return <AlertTriangle className="size-4 text-danger" />;
  if (category === 'excellent' || category === 'good') {
    return <CheckCircle2 className="size-4 text-success" />;
  }
  return <Circle className="size-4 text-warning" />;
}

export function ForecastDayCard({ day }: ForecastDayCardProps) {
  const limiters = day.limiters ?? [];

  return (
    <div className="rounded-xl border border-border/50 bg-background-deeper/60 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <DayIcon category={day.category} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-md font-semibold leading-tight text-text">
                {day.dayLabel}
              </h3>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  categoryClass[day.category]
                )}
              >
                {labelForCategory(day.category)}
              </span>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-text-muted">
              {day.summary}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text">
              {day.coachNote}
            </p>
          </div>
        </div>
        <div className="text-right text-sm tabular-nums text-text-muted">
          {day.score}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {day.hours.map((hour) => (
          <div
            key={hour.startTime}
            className="rounded-lg border border-border/45 bg-background/60 px-2 py-1.5 text-center"
            title={`${hour.hourLabel}: ${hour.score} · ${hour.reasons.join(', ')}`}
          >
            <p className="text-xs font-medium text-text-muted">{hour.hourLabel}</p>
            <div
              className={cn('mx-auto mt-1 size-2 rounded-full', dotClass[hour.category])}
            />
            <p className="mt-1 text-sm font-medium tabular-nums text-text">
              {hour.temperatureF}°
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm leading-relaxed text-text-muted">
        <Wind className="size-3.5 text-icon" />
        <span>{day.routeAdvice}</span>
      </div>
      <RainStormSection day={day} />
      {limiters.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {limiters.map((limiter) => (
            <span
              key={limiter}
              className="rounded-full border border-transparent bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning/85"
            >
              {limiter}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2">
        <ConditionPills day={day} compact />
      </div>
    </div>
  );
}
