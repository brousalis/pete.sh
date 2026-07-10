import type { NormalizedForecastHour } from './weather-gov';

export type WorkoutType = 'run' | 'bike';
export type ScoreCategory = 'excellent' | 'good' | 'okay' | 'tough' | 'avoid';

export interface ScoredHour extends NormalizedForecastHour {
  score: number;
  category: ScoreCategory;
  windRelationship: 'tailwind' | 'crosswind' | 'headwind' | 'variable';
  routeAdvice: string;
  coachNote: string;
  reasons: string[];
  limiters: string[];
}

export interface ScoredDay {
  dateKey: string;
  dayLabel: string;
  category: ScoreCategory;
  score: number;
  bestWindow: string;
  routeAdvice: string;
  summary: string;
  coachNote: string;
  reasons: string[];
  limiters: string[];
  hours: ScoredHour[];
}

export interface WeatherWorkoutSummary {
  modelVersion: number;
  fetchedAt: number;
  workoutType: WorkoutType;
  bestDay: ScoredDay | null;
  days: ScoredDay[];
}

const WORKOUT_HOURS = new Set([11, 12, 13, 14]);

const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  excellent: 'Excellent',
  good: 'Good',
  okay: 'Okay',
  tough: 'Tough',
  avoid: 'Avoid',
};

function categoryForScore(score: number): ScoreCategory {
  if (score >= 88) return 'excellent';
  if (score >= 74) return 'good';
  if (score >= 58) return 'okay';
  if (score >= 42) return 'tough';
  return 'avoid';
}

export function labelForCategory(category: ScoreCategory): string {
  return CATEGORY_LABELS[category];
}

function normalizeDirection(direction: string): string {
  return direction.toUpperCase().replace(/[^A-Z]/g, '');
}

function windRelationship(direction: string): ScoredHour['windRelationship'] {
  const normalized = normalizeDirection(direction);
  if (!normalized || normalized === 'VRB') return 'variable';
  if (['N', 'NNE', 'NNW'].includes(normalized)) return 'tailwind';
  if (['S', 'SSE', 'SSW'].includes(normalized)) return 'headwind';
  return 'crosswind';
}

function scoreWind(
  speed: number,
  gust: number | null,
  relationship: ScoredHour['windRelationship'],
  workoutType: WorkoutType
) {
  const reasons: string[] = [];
  const limiters: string[] = [];
  let score = 100;
  const effectiveWind = gust && gust > speed ? Math.round((speed + gust) / 2) : speed;

  if (effectiveWind <= 5 && effectiveWind >= 1) {
    reasons.push('Ideal wind');
  } else if (effectiveWind <= 8) {
    score -= 8;
    reasons.push('Light wind');
  } else if (effectiveWind <= 12) {
    score -= workoutType === 'bike' ? 18 : 14;
    reasons.push('Workable wind');
    limiters.push('noticeable wind');
  } else if (effectiveWind <= 17) {
    score -= workoutType === 'bike' ? 34 : 26;
    reasons.push('Gusty feel');
    limiters.push(workoutType === 'bike' ? 'bike handling' : 'wind effort');
  } else {
    score -= workoutType === 'bike' ? 52 : 40;
    reasons.push('High wind');
    limiters.push('high wind');
  }

  if (gust && gust - speed >= 8) {
    score -= workoutType === 'bike' ? 14 : 8;
    reasons.push(`${gust} mph gusts`);
    limiters.push('gust swings');
  }

  if (relationship === 'tailwind') {
    score += workoutType === 'bike' ? 8 : 5;
    reasons.push('Southbound tailwind');
  } else if (relationship === 'headwind') {
    score -= workoutType === 'bike' ? 16 : 10;
    reasons.push('Southbound headwind');
    limiters.push('headwind southbound');
  } else if (relationship === 'crosswind') {
    score -= workoutType === 'bike' ? 8 : 4;
    reasons.push('Crosswind');
    if (workoutType === 'bike' && effectiveWind >= 10) limiters.push('crosswind handling');
  }

  return { score, reasons, limiters };
}

function dewPointLoad(dewPointF: number | null): {
  score: number;
  reasons: string[];
  limiters: string[];
} {
  if (dewPointF === null) return { score: 92, reasons: [], limiters: [] };
  if (dewPointF < 50) return { score: 100, reasons: ['Dry air'], limiters: [] };
  if (dewPointF <= 55) return { score: 94, reasons: ['Comfortable dew point'], limiters: [] };
  if (dewPointF <= 60) {
    return { score: 82, reasons: [`${dewPointF}° dew point`], limiters: ['sticky air'] };
  }
  if (dewPointF <= 65) {
    return { score: 66, reasons: [`${dewPointF}° dew point`], limiters: ['heat load'] };
  }
  return {
    score: 45,
    reasons: [`${dewPointF}° dew point`],
    limiters: ['oppressive dew point'],
  };
}

function scoreTemperature(
  tempF: number,
  humidity: number | null,
  dewPointF: number | null,
  workoutType: WorkoutType
) {
  const reasons: string[] = [];
  const limiters: string[] = [];
  let score = 100;
  const humidityPenalty =
    humidity && tempF >= 70 ? Math.max(0, Math.round((humidity - 55) * 0.75)) : 0;
  const dewPointPenalty =
    dewPointF && tempF >= 70 ? Math.max(0, Math.round((dewPointF - 55) * 1.4)) : 0;

  if (tempF >= 45 && tempF <= 65) {
    reasons.push('Cool');
  } else if ((tempF >= 35 && tempF <= 44) || (tempF >= 66 && tempF <= 72)) {
    score -= 8;
    reasons.push(tempF < 45 ? 'Chilly' : 'Mildly warm');
  } else if (tempF >= 73 && tempF <= 80) {
    score -= 20 + humidityPenalty + dewPointPenalty;
    reasons.push('Warm');
    limiters.push('heat buildup');
  } else if (tempF > 80) {
    score -= 36 + humidityPenalty + dewPointPenalty;
    reasons.push('Hot');
    limiters.push('heat stress');
  } else {
    score -= workoutType === 'bike' ? 28 : 22;
    reasons.push('Cold');
    limiters.push('cold start');
  }

  return { score, reasons, limiters };
}

function scoreHumidity(humidity: number | null, tempF: number) {
  if (humidity === null) return { score: 92, reasons: [] as string[] };

  if (humidity < 55) return { score: 100, reasons: ['Low humidity'] };
  if (humidity <= 65) return { score: 90, reasons: ['Some humidity'] };
  if (humidity <= 75) {
    return {
      score: tempF >= 70 ? 72 : 82,
      reasons: ['Humid'],
    };
  }
  return {
    score: tempF >= 70 ? 52 : 66,
    reasons: ['Very humid'],
  };
}

function scoreRain(hour: NormalizedForecastHour) {
  const reasons: string[] = [];
  const limiters: string[] = [];
  const forecast = `${hour.shortForecast} ${hour.gridWeather.join(' ')} ${hour.hazards.join(' ')}`.toLowerCase();
  const stormy = /thunder|heavy rain|showers likely|squall/.test(forecast);
  const poorVisibility = /fog|haze|smoke/.test(forecast);
  const thunder = hour.thunderProbability ?? 0;
  const qpf = hour.quantitativePrecipInches ?? 0;
  const rain =
    hour.precipProbability ??
    (forecast.includes('rain') || forecast.includes('showers') ? 35 : 0);
  let score = 100;

  if (stormy || thunder >= 25) {
    score -= 60;
    reasons.push(thunder > 0 ? `${thunder}% thunder` : 'Storm risk');
    limiters.push('storm risk');
  } else if (rain <= 15) {
    reasons.push('Dry');
  } else if (rain <= 30) {
    score -= 14;
    reasons.push('Rain watch');
    limiters.push('rain watch');
  } else if (rain <= 50) {
    score -= 30;
    reasons.push('Rain risk');
    limiters.push('rain risk');
  } else {
    score -= 50;
    reasons.push('Likely rain');
    limiters.push('likely rain');
  }

  if (qpf >= 0.1) {
    score -= 20;
    reasons.push(`${qpf}" rain`);
    limiters.push('wet surface');
  } else if (qpf >= 0.03) {
    score -= 10;
    reasons.push(`${qpf}" rain`);
    limiters.push('damp surface');
  }

  if (poorVisibility) {
    score -= 12;
    reasons.push('Visibility watch');
    limiters.push('visibility');
  }

  return { score, reasons, limiters };
}

function routeAdviceForHour(hour: NormalizedForecastHour, relationship: ScoredHour['windRelationship']) {
  if (relationship === 'tailwind' && hour.windSpeedMph <= 12) {
    return 'Go south first toward Oak Street, then keep the return easy';
  }
  if (relationship === 'tailwind') {
    return 'Trail day, but expect stronger wind on the return';
  }
  if (relationship === 'headwind') {
    return 'Go north first; southbound will cost extra effort';
  }
  if (relationship === 'crosswind') {
    return 'Crosswind on the trail; keep handling and effort smooth';
  }
  return 'Variable wind, use feel once outside';
}

function coachNoteForHour(
  hour: NormalizedForecastHour,
  workoutType: WorkoutType,
  category: ScoreCategory,
  limiters: string[],
  relationship: ScoredHour['windRelationship']
): string {
  if (category === 'excellent') {
    return workoutType === 'bike'
      ? 'Green light for quality miles; stay aero and use the wind intelligently.'
      : 'Green light for quality work; this is a good window for tempo or intervals.';
  }
  if (category === 'good') {
    return 'Good outdoor window; keep the first half controlled and adjust by feel.';
  }
  if (category === 'okay') {
    const limiter = limiters[0] ?? 'weather';
    return `Aerobic day is fine, but cap intensity because of ${limiter}.`;
  }
  if (category === 'tough') {
    const limiter = limiters[0] ?? (relationship === 'headwind' ? 'headwind' : 'conditions');
    return `Keep it easy or shorten the route; ${limiter} is the main limiter.`;
  }
  const limiter = limiters[0] ?? 'conditions';
  return `Avoid hard outdoor work; ${limiter} makes this a better indoor/recovery window.`;
}

export function scoreHour(hour: NormalizedForecastHour, workoutType: WorkoutType): ScoredHour {
  const relationship = windRelationship(hour.windDirection);
  const wind = scoreWind(
    hour.windSpeedMph,
    hour.windGustMph,
    relationship,
    workoutType
  );
  const temp = scoreTemperature(
    hour.temperatureF,
    hour.humidity,
    hour.dewPointF,
    workoutType
  );
  const dewPoint = dewPointLoad(hour.dewPointF);
  const humidity = scoreHumidity(hour.humidity, hour.temperatureF);
  const rain = scoreRain(hour);

  const weights =
    workoutType === 'bike'
      ? { wind: 0.38, temp: 0.22, dewPoint: 0.12, humidity: 0.08, rain: 0.2 }
      : { wind: 0.24, temp: 0.28, dewPoint: 0.18, humidity: 0.1, rain: 0.2 };

  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        wind.score * weights.wind +
          temp.score * weights.temp +
          dewPoint.score * weights.dewPoint +
          humidity.score * weights.humidity +
          rain.score * weights.rain
      )
    )
  );

  const category = categoryForScore(score);
  const limiters = [
    ...wind.limiters,
    ...temp.limiters,
    ...dewPoint.limiters,
    ...rain.limiters,
  ].slice(0, 4);

  return {
    ...hour,
    score,
    category,
    windRelationship: relationship,
    routeAdvice: routeAdviceForHour(hour, relationship),
    coachNote: coachNoteForHour(hour, workoutType, category, limiters, relationship),
    reasons: [
      ...wind.reasons,
      ...temp.reasons,
      ...dewPoint.reasons,
      ...humidity.reasons,
      ...rain.reasons,
    ].slice(0, 5),
    limiters,
  };
}

function bestContiguousWindow(hours: ScoredHour[]): string {
  if (!hours.length) return 'No 11am-2pm data';

  const sorted = [...hours].sort((a, b) => a.hour24 - b.hour24);
  const keep = sorted.filter((hour) => hour.category !== 'avoid');
  const source = keep.length ? keep : sorted;
  const bestHour = source.reduce((best, hour) => (hour.score > best.score ? hour : best));
  const start = bestHour.hourLabel;
  const endDate = new Date(bestHour.endTime);
  const end = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
  })
    .format(endDate)
    .toLowerCase()
    .replace(' ', '');

  return `${start}-${end}`;
}

function summarizeReasons(hours: ScoredHour[]): string[] {
  const counts = new Map<string, number>();
  for (const hour of hours) {
    for (const reason of hour.reasons) {
      counts.set(reason, (counts.get(reason) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason]) => reason)
    .slice(0, 4);
}

function summarizeLimiters(hours: ScoredHour[]): string[] {
  const counts = new Map<string, number>();
  for (const hour of hours) {
    for (const limiter of hour.limiters) {
      counts.set(limiter, (counts.get(limiter) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([limiter]) => limiter)
    .slice(0, 3);
}

function summarizeDay(hours: ScoredHour[]): ScoredDay {
  const score = Math.round(
    hours.reduce((sum, hour) => sum + hour.score, 0) / Math.max(1, hours.length)
  );
  const bestHour = hours.reduce((best, hour) => (hour.score > best.score ? hour : best));
  const category = categoryForScore(score);
  const reasons = summarizeReasons(hours);
  const limiters = summarizeLimiters(hours);

  return {
    dateKey: bestHour.dateKey,
    dayLabel: bestHour.dayLabel,
    category,
    score,
    bestWindow: bestContiguousWindow(hours),
    routeAdvice: bestHour.routeAdvice,
    summary: `${labelForCategory(category)} for ${bestHour.hourLabel}; ${bestHour.routeAdvice.toLowerCase()}.`,
    coachNote: bestHour.coachNote,
    reasons,
    limiters,
    hours,
  };
}

export function buildWorkoutSummary(
  hours: NormalizedForecastHour[],
  workoutType: WorkoutType
): WeatherWorkoutSummary {
  const windowHours = hours
    .filter((hour) => WORKOUT_HOURS.has(hour.hour24))
    .map((hour) => scoreHour(hour, workoutType));

  const byDate = new Map<string, ScoredHour[]>();
  for (const hour of windowHours) {
    const existing = byDate.get(hour.dateKey) ?? [];
    existing.push(hour);
    byDate.set(hour.dateKey, existing);
  }

  const days = [...byDate.values()].map((dayHours) =>
    summarizeDay(dayHours.sort((a, b) => a.hour24 - b.hour24))
  );

  const bestDay =
    days.length > 0
      ? days.reduce((best, day) => (day.score > best.score ? day : best))
      : null;

  return {
    modelVersion: 3,
    fetchedAt: Date.now(),
    workoutType,
    bestDay,
    days,
  };
}
