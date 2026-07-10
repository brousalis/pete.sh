import { Button, Chip } from '@petehome/ui';
import { Activity, Bike, CloudSun, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { fetchHourlyForecast } from '../lib/weather-gov';
import {
  buildWorkoutSummary,
  type WeatherWorkoutSummary,
  type WorkoutType,
} from '../lib/workout-weather-score';
import {
  formatCacheAge,
  isWeatherWorkoutSummaryStale,
  readWeatherWorkoutSummary,
  writeWeatherWorkoutSummary,
} from '../lib/weather-workout-cache';
import { cn } from '../utils/cn';
import { BestWindowHero } from './BestWindowHero';
import { ForecastDayCard } from './ForecastDayCard';
import { WeeklySummary } from './WeeklySummary';

export function WeatherWorkoutWidget() {
  const [workoutType, setWorkoutType] = useState<WorkoutType>('run');
  const [summary, setSummary] = useState<WeatherWorkoutSummary | null>(() =>
    readWeatherWorkoutSummary()
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(
    () => readWeatherWorkoutSummary()?.days[0]?.dateKey ?? null
  );

  const refresh = useCallback(
    async (force = false, type = workoutType) => {
      const cached = readWeatherWorkoutSummary();
      if (
        !force &&
        cached &&
        cached.workoutType === type &&
        !isWeatherWorkoutSummaryStale(cached)
      ) {
        setSummary(cached);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const hours = await fetchHourlyForecast();
        const next = buildWorkoutSummary(hours, type);
        writeWeatherWorkoutSummary(next);
        setSummary(next);
        setSelectedDateKey(next.days[0]?.dateKey ?? next.bestDay?.dateKey ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load forecast');
        if (cached && !isWeatherWorkoutSummaryStale(cached)) setSummary(cached);
      } finally {
        setLoading(false);
      }
    },
    [workoutType]
  );

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  const handleWorkoutType = (next: WorkoutType) => {
    setWorkoutType(next);
    refresh(true, next);
  };

  useEffect(() => {
    if (!summary?.days.length) {
      setSelectedDateKey(null);
      return;
    }

    const selectedStillExists = summary.days.some(
      (day) => day.dateKey === selectedDateKey
    );
    if (!selectedStillExists) {
      setSelectedDateKey(summary.days[0].dateKey);
    }
  }, [selectedDateKey, summary]);

  const selectedDay =
    summary?.days.find((day) => day.dateKey === selectedDateKey) ??
    summary?.days[0] ??
    summary?.bestDay ??
    null;

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <CloudSun className="size-4" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-md font-semibold leading-tight text-text">
              Outdoor Weather
            </h1>
            <p className="text-xs leading-snug text-text-muted">
              Belmont Harbor · 11am-2pm
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => refresh(true)}
          disabled={loading}
          title="Refresh forecast"
        >
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
        </Button>
      </header>

      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Chip
            as="button"
            onClick={() => handleWorkoutType('run')}
            className={cn(
              'h-7 gap-1.5 border-border/40 px-2 text-xs font-medium',
              workoutType === 'run' && 'border-primary/15 bg-primary/10 text-primary'
            )}
          >
            <Activity className="size-3.5" />
            Run
          </Chip>
          <Chip
            as="button"
            onClick={() => handleWorkoutType('bike')}
            className={cn(
              'h-7 gap-1.5 border-border/40 px-2 text-xs font-medium',
              workoutType === 'bike' && 'border-primary/15 bg-primary/10 text-primary'
            )}
          >
            <Bike className="size-3.5" />
            Bike
          </Chip>
        </div>
        <p className="text-xs text-text-muted">
          {summary ? `Updated ${formatCacheAge(summary.fetchedAt)}` : 'No cache yet'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          Forecast unavailable. Showing last good recommendation if available.
        </div>
      )}

      {loading && !summary ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-background-deeper/60 text-sm text-text-muted">
          Loading Weather.gov hourly forecast…
        </div>
      ) : (
        <>
          <BestWindowHero day={summary?.bestDay ?? null} workoutType={workoutType} />
          {summary && (
            <WeeklySummary
              days={summary.days}
              bestDateKey={summary.bestDay?.dateKey ?? null}
              selectedDateKey={selectedDay?.dateKey ?? null}
              onSelectDay={setSelectedDateKey}
            />
          )}

          <section className="min-h-0 flex-1">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                Selected forecast
              </h2>
              <p className="text-[10px] text-text-muted">
                {selectedDay?.dayLabel ?? 'score: wind · temp · humidity · rain'}
              </p>
            </div>
            <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1">
              {selectedDay && (
                <ForecastDayCard key={selectedDay.dateKey} day={selectedDay} />
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
