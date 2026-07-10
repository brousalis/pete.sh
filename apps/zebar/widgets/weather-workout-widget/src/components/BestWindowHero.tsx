import { Activity, Bike, Route } from 'lucide-react';
import type {
  ScoredDay,
  WorkoutType,
} from '../lib/workout-weather-score';
import { labelForCategory } from '../lib/workout-weather-score';
import { cn } from '../utils/cn';
import { ConditionPills } from './ConditionPills';

interface BestWindowHeroProps {
  day: ScoredDay | null;
  workoutType: WorkoutType;
}

const categoryClass: Record<ScoredDay['category'], string> = {
  excellent: 'border-transparent bg-success/10 text-success/85',
  good: 'border-transparent bg-primary/10 text-primary/85',
  okay: 'border-transparent bg-warning/5 text-text-muted',
  tough: 'border-transparent bg-warning/10 text-warning/85',
  avoid: 'border-transparent bg-danger/10 text-danger/85',
};

export function BestWindowHero({ day, workoutType }: BestWindowHeroProps) {
  if (!day) {
    return (
      <div className="rounded-xl border border-border bg-background-deeper/70 p-4">
        <p className="text-sm text-text-muted">No 11am-2pm forecast window found.</p>
      </div>
    );
  }

  const WorkoutIcon = workoutType === 'bike' ? Bike : Activity;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted">
            Recommended overall
          </p>
          <h2 className="mt-1 text-[26px] font-semibold leading-tight text-text">
            {day.dayLabel} · {day.bestWindow}
          </h2>
        </div>
        <div
          className={cn(
            'rounded-full border px-2.5 py-1 text-xs font-medium',
            categoryClass[day.category]
          )}
        >
          {labelForCategory(day.category)}
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-md leading-relaxed text-text">
        <WorkoutIcon className="mt-0.5 size-4 text-primary" strokeWidth={2.5} />
        <p>{day.summary}</p>
      </div>
      <p className="mt-2 rounded-lg border border-border/30 bg-background/45 px-3 py-2 text-sm leading-relaxed text-text">
        {day.coachNote}
      </p>
      <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-text-muted">
        <Route className="mt-0.5 size-4 text-icon" strokeWidth={2.5} />
        <p>{day.routeAdvice}</p>
      </div>

      <div className="mt-3">
        <ConditionPills day={day} />
      </div>
    </div>
  );
}
