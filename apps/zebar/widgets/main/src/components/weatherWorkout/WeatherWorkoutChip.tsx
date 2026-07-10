import { Chip } from '@petehome/ui';
import { CloudRain, CloudSun, ThumbsDown, ThumbsUp, Wind } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as zebar from 'zebar';
import { calculateWidgetPlacementFromRight } from '../../utils/calculateWidgetPlacement';
import { cn } from '../../utils/cn';

const POPUP_SIZE = { width: 540, height: 800 };
const CACHE_KEY = 'petehome.weatherWorkout.summary';

type ScoreCategory = 'excellent' | 'good' | 'okay' | 'tough' | 'avoid';

interface CachedWeatherWorkoutDay {
  dayLabel: string;
  category: ScoreCategory;
  bestWindow: string;
  hours?: Array<{
    score: number;
    temperatureF: number;
    windSpeedMph: number;
    windGustMph: number | null;
    precipProbability: number | null;
  }>;
}

interface CachedWeatherWorkoutSummary {
  fetchedAt: number;
  workoutType: 'run' | 'bike';
  bestDay: CachedWeatherWorkoutDay | null;
  days?: CachedWeatherWorkoutDay[];
}

function readSummary(): CachedWeatherWorkoutSummary | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedWeatherWorkoutSummary;
  } catch {
    return null;
  }
}

function shortDay(dayLabel: string): string {
  return dayLabel.split(' ')[0] ?? dayLabel;
}

function currentDayForSummary(
  summary: CachedWeatherWorkoutSummary | null
): CachedWeatherWorkoutDay | null {
  return summary?.days?.[0] ?? summary?.bestDay ?? null;
}

function bestHourForDay(day: CachedWeatherWorkoutDay | null) {
  return day?.hours?.reduce((best, hour) => (hour.score > best.score ? hour : best));
}

function isRecommended(category: ScoreCategory | undefined): boolean {
  return category === 'excellent' || category === 'good';
}

function summaryStats(day: CachedWeatherWorkoutDay | null): string | null {
  const hour = bestHourForDay(day);
  if (!hour) return null;

  const rain = hour.precipProbability ?? 0;
  const wind = hour.windGustMph
    ? `${hour.windSpeedMph}-${hour.windGustMph}`
    : `${hour.windSpeedMph}`;

  return `${hour.temperatureF}° · ${wind}mph · ${rain}%`;
}

function labelForSummary(summary: CachedWeatherWorkoutSummary | null): string | null {
  const day = currentDayForSummary(summary);
  if (!day) return null;
  return summaryStats(day) ?? shortDay(day.dayLabel);
}

export function WeatherWorkoutChip() {
  const chipRef = useRef<HTMLDivElement | null>(null);
  const [summary, setSummary] = useState<CachedWeatherWorkoutSummary | null>(() =>
    readSummary()
  );

  useEffect(() => {
    const sync = () => setSummary(readSummary());
    window.addEventListener('storage', sync);
    const id = window.setInterval(sync, 60_000);
    return () => {
      window.removeEventListener('storage', sync);
      window.clearInterval(id);
    };
  }, []);

  const label = labelForSummary(summary);
  const currentDay = currentDayForSummary(summary);
  const category = currentDay?.category;
  const recommended = isRecommended(category);
  const statParts = label?.split(' · ');

  return (
    <Chip
      ref={chipRef}
      as="button"
      className={cn(
        'flex items-center gap-2 h-full pl-2.5 pr-2.5 min-w-[2.5rem]',
        category === 'excellent' && 'border-success/40',
        category === 'good' && 'border-primary/40',
        category === 'okay' && 'border-border',
        (category === 'tough' || category === 'avoid') && 'border-danger/40'
      )}
      title={
        currentDay
          ? `Outdoor workout: ${label} · ${currentDay.bestWindow}`
          : 'Outdoor weather'
      }
      onClick={async () => {
        const placement = await calculateWidgetPlacementFromRight(
          chipRef,
          POPUP_SIZE
        );
        await zebar.startWidget('weather-workout-widget', placement, {});
      }}
    >
      {label ? (
        recommended ? (
          <ThumbsUp className="h-3.5 w-3.5 text-success shrink-0" strokeWidth={2.5} />
        ) : (
          <ThumbsDown className="h-3.5 w-3.5 text-warning shrink-0" strokeWidth={2.5} />
        )
      ) : (
        <CloudSun className="h-3.5 w-3.5 text-icon shrink-0" strokeWidth={2.5} />
      )}
      {statParts?.length === 3 ? (
        <div className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
          <span>{statParts[0]}</span>
          <Wind className="h-3 w-3 text-icon" strokeWidth={2.5} />
          <span>{statParts[1]}</span>
          <CloudRain className="h-3 w-3 text-icon" strokeWidth={2.5} />
          <span>{statParts[2]}</span>
        </div>
      ) : (
        label && <span className="text-sm font-medium">{label}</span>
      )}
    </Chip>
  );
}
