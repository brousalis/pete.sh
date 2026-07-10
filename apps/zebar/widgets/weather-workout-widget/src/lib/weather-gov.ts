export const BELMONT_HARBOR = {
  latitude: 41.9409,
  longitude: -87.636,
  label: 'Belmont Harbor',
};

export interface NormalizedForecastHour {
  startTime: string;
  endTime: string;
  dateKey: string;
  dayLabel: string;
  hourLabel: string;
  hour24: number;
  temperatureF: number;
  dewPointF: number | null;
  humidity: number | null;
  windSpeedMph: number;
  windGustMph: number | null;
  windDirection: string;
  precipProbability: number | null;
  thunderProbability: number | null;
  quantitativePrecipInches: number | null;
  hazards: string[];
  gridWeather: string[];
  shortForecast: string;
}

interface WeatherGovValue<T> {
  value: T | null;
}

interface WeatherGovPointResponse {
  properties: {
    forecastHourly: string;
    forecastGridData: string;
    timeZone: string;
  };
}

interface WeatherGovHourlyPeriod {
  startTime: string;
  endTime: string;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  dewpoint?: WeatherGovValue<number>;
  probabilityOfPrecipitation?: WeatherGovValue<number>;
  relativeHumidity?: WeatherGovValue<number>;
  windGust?: WeatherGovValue<number>;
}

interface WeatherGovHourlyResponse {
  properties: {
    periods: WeatherGovHourlyPeriod[];
  };
}

interface WeatherGovGridValue<T> {
  validTime: string;
  value: T | null;
}

interface WeatherGovGridResponse {
  properties: {
    probabilityOfThunder?: {
      values: WeatherGovGridValue<number>[];
    };
    quantitativePrecipitation?: {
      uom: string;
      values: WeatherGovGridValue<number>[];
    };
    hazards?: {
      values: WeatherGovGridValue<Array<{ headline?: string; phenomenon?: string; significance?: string }>>[];
    };
    weather?: {
      values: WeatherGovGridValue<
        Array<{
          coverage: string | null;
          weather: string | null;
          intensity: string | null;
          attributes?: string[];
        }>
      >[];
    };
  };
}

const WEATHER_HEADERS = {
  Accept: 'application/geo+json',
  'User-Agent': 'petehome-zebar-weather-workout/1.0',
};

function parseWindMph(value: string): number {
  const matches = value.match(/\d+/g);
  if (!matches?.length) return 0;
  const speeds = matches.map(Number);
  return Math.round(speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length);
}

function toFahrenheit(temperature: number, unit: string): number {
  if (unit.toUpperCase() === 'C') {
    return Math.round((temperature * 9) / 5 + 32);
  }
  return temperature;
}

function celsiusToFahrenheit(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Math.round((value * 9) / 5 + 32);
}

function millimetersToInches(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number((value / 25.4).toFixed(2));
}

function intervalContains(validTime: string, date: Date): boolean {
  const [startRaw, durationRaw] = validTime.split('/');
  const start = new Date(startRaw);
  const hours = Number(durationRaw?.match(/PT(\d+)H/)?.[1] ?? 1);
  const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
  return date >= start && date < end;
}

function valueAtTime<T>(
  values: WeatherGovGridValue<T>[] | undefined,
  date: Date
): T | null {
  return values?.find((entry) => intervalContains(entry.validTime, date))?.value ?? null;
}

function summarizeGridWeather(
  values: WeatherGovGridValue<
    Array<{
      coverage: string | null;
      weather: string | null;
      intensity: string | null;
      attributes?: string[];
    }>
  >[] | undefined,
  date: Date
): string[] {
  const weather = valueAtTime(values, date) ?? [];
  return weather
    .filter((entry) => entry.weather)
    .map((entry) =>
      [entry.coverage, entry.intensity, entry.weather]
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
    );
}

function summarizeHazards(
  values: WeatherGovGridValue<
    Array<{ headline?: string; phenomenon?: string; significance?: string }>
  >[] | undefined,
  date: Date
): string[] {
  const hazards = valueAtTime(values, date) ?? [];
  return hazards
    .map((hazard) => hazard.headline ?? hazard.phenomenon)
    .filter((hazard): hazard is string => Boolean(hazard));
}

function formatParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    hour12: true,
    hourCycle: 'h12',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  const hour = Number(get('hour'));
  const dayPeriod = get('dayPeriod');
  const hour24 =
    dayPeriod === 'PM' && hour !== 12
      ? hour + 12
      : dayPeriod === 'AM' && hour === 12
        ? 0
        : hour;

  return {
    dateKey: `${get('month')} ${get('day')}`,
    dayLabel: `${get('weekday')} ${get('month')} ${get('day')}`,
    hourLabel: `${hour}${dayPeriod.toLowerCase()}`,
    hour24,
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: WEATHER_HEADERS });
  if (!response.ok) {
    throw new Error(`Weather.gov request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchHourlyForecast(
  latitude = BELMONT_HARBOR.latitude,
  longitude = BELMONT_HARBOR.longitude
): Promise<NormalizedForecastHour[]> {
  const point = await fetchJson<WeatherGovPointResponse>(
    `https://api.weather.gov/points/${latitude},${longitude}`
  );
  const hourly = await fetchJson<WeatherGovHourlyResponse>(
    point.properties.forecastHourly
  );
  const grid = await fetchJson<WeatherGovGridResponse>(
    point.properties.forecastGridData
  );
  const timeZone = point.properties.timeZone || 'America/Chicago';

  return hourly.properties.periods.map((period) => {
    const date = new Date(period.startTime);
    const parts = formatParts(date, timeZone);

    return {
      startTime: period.startTime,
      endTime: period.endTime,
      ...parts,
      temperatureF: toFahrenheit(period.temperature, period.temperatureUnit),
      dewPointF: celsiusToFahrenheit(period.dewpoint?.value),
      humidity: period.relativeHumidity?.value ?? null,
      windSpeedMph: parseWindMph(period.windSpeed),
      windGustMph: period.windGust?.value ?? null,
      windDirection: period.windDirection,
      precipProbability: period.probabilityOfPrecipitation?.value ?? null,
      thunderProbability: valueAtTime(
        grid.properties.probabilityOfThunder?.values,
        date
      ),
      quantitativePrecipInches: millimetersToInches(
        valueAtTime(grid.properties.quantitativePrecipitation?.values, date)
      ),
      hazards: summarizeHazards(grid.properties.hazards?.values, date),
      gridWeather: summarizeGridWeather(grid.properties.weather?.values, date),
      shortForecast: period.shortForecast,
    };
  });
}
