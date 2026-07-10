import type { WeatherWorkoutSummary } from './workout-weather-score';

export const WEATHER_WORKOUT_CACHE_KEY = 'petehome.weatherWorkout.summary';
export const WEATHER_WORKOUT_CACHE_EVENT = 'weather-workout-summary-changed';
export const WEATHER_WORKOUT_CACHE_TTL_MS = 45 * 60 * 1000;
export const WEATHER_WORKOUT_MODEL_VERSION = 3;

export function readWeatherWorkoutSummary(): WeatherWorkoutSummary | null {
  try {
    const raw = localStorage.getItem(WEATHER_WORKOUT_CACHE_KEY);
    if (!raw) return null;
    const summary = JSON.parse(raw) as WeatherWorkoutSummary;
    if (summary.modelVersion !== WEATHER_WORKOUT_MODEL_VERSION) {
      localStorage.removeItem(WEATHER_WORKOUT_CACHE_KEY);
      return null;
    }
    return summary;
  } catch {
    return null;
  }
}

export function writeWeatherWorkoutSummary(summary: WeatherWorkoutSummary): void {
  localStorage.setItem(WEATHER_WORKOUT_CACHE_KEY, JSON.stringify(summary));
  window.dispatchEvent(new CustomEvent(WEATHER_WORKOUT_CACHE_EVENT));
}

export function isWeatherWorkoutSummaryStale(
  summary: WeatherWorkoutSummary | null
): boolean {
  if (!summary) return true;
  if (summary.modelVersion !== WEATHER_WORKOUT_MODEL_VERSION) return true;
  return Date.now() - summary.fetchedAt > WEATHER_WORKOUT_CACHE_TTL_MS;
}

export function formatCacheAge(fetchedAt: number): string {
  const minutes = Math.max(0, Math.round((Date.now() - fetchedAt) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} min ago`;
}
