import { CloudRain, ShieldAlert, Umbrella } from 'lucide-react';
import type { ScoredDay, ScoredHour } from '../lib/workout-weather-score';

interface RainStormSectionProps {
  day: ScoredDay;
}

function hasRainSignal(hour: ScoredHour): boolean {
  const forecast = `${hour.shortForecast} ${hour.gridWeather.join(' ')}`.toLowerCase();
  return (
    (hour.precipProbability ?? 0) >= 20 ||
    (hour.thunderProbability ?? 0) > 0 ||
    (hour.quantitativePrecipInches ?? 0) > 0 ||
    /rain|showers|thunder|storm|drizzle/.test(forecast)
  );
}

function rainIntensity(amount: number): string {
  if (amount >= 0.15) return 'meaningful rain';
  if (amount >= 0.05) return 'light rain';
  if (amount > 0) return 'trace rain';
  return 'no measurable accumulation';
}

function hourRange(hours: ScoredHour[]): string {
  if (!hours.length) return 'No rain in workout window';
  const first = hours[0];
  const last = hours[hours.length - 1];
  const end = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: true,
  })
    .format(new Date(last.endTime))
    .toLowerCase()
    .replace(' ', '');

  return `${first.hourLabel}-${end}`;
}

export function RainStormSection({ day }: RainStormSectionProps) {
  const rainyHours = day.hours.filter(hasRainSignal);

  if (rainyHours.length === 0) return null;

  const peakPop = Math.max(
    ...rainyHours.map((hour) => hour.precipProbability ?? 0)
  );
  const peakThunder = Math.max(
    ...rainyHours.map((hour) => hour.thunderProbability ?? 0)
  );
  const totalQpf = rainyHours.reduce(
    (sum, hour) => sum + (hour.quantitativePrecipInches ?? 0),
    0
  );
  const wettestHour = rainyHours.reduce((wettest, hour) =>
    (hour.quantitativePrecipInches ?? 0) >
    (wettest.quantitativePrecipInches ?? 0)
      ? hour
      : wettest
  );
  const hazards = [...new Set(rainyHours.flatMap((hour) => hour.hazards))];
  const weather = [
    ...new Set(
      rainyHours.flatMap((hour) =>
        hour.gridWeather.length ? hour.gridWeather : [hour.shortForecast]
      )
    ),
  ].filter(Boolean);
  const windDuringRain = rainyHours.reduce((strongest, hour) =>
    hour.windSpeedMph > strongest.windSpeedMph ? hour : strongest
  );
  const avoidOutdoor = peakThunder >= 15 || peakPop >= 60 || totalQpf >= 0.12;

  return (
    <section className="mt-3 rounded-xl bg-primary/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <CloudRain className="mt-0.5 size-4 text-primary/85" strokeWidth={2.5} />
          <div>
            <h4 className="text-sm font-semibold text-text">Rain / storm detail</h4>
            <p className="mt-0.5 text-sm leading-relaxed text-text-muted">
              Most likely {hourRange(rainyHours)} · peak {peakPop}% rain
              {peakThunder > 0 ? ` · ${peakThunder}% thunder` : ''}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-background/60 px-2 py-1 text-[11px] font-medium text-text-muted">
          {rainIntensity(totalQpf)}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-background/45 px-2 py-2">
          <p className="text-text-muted">Amount</p>
          <p className="mt-1 font-semibold text-text">
            {totalQpf > 0 ? `${totalQpf.toFixed(2)}"` : 'Trace/none'}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            wettest {wettestHour.hourLabel}
          </p>
        </div>
        <div className="rounded-lg bg-background/45 px-2 py-2">
          <p className="text-text-muted">Storm risk</p>
          <p className="mt-1 font-semibold text-text">
            {peakThunder > 0 ? `${peakThunder}%` : 'Low'}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            Weather.gov grid
          </p>
        </div>
        <div className="rounded-lg bg-background/45 px-2 py-2">
          <p className="text-text-muted">Wind in rain</p>
          <p className="mt-1 font-semibold text-text">
            {windDuringRain.windSpeedMph} mph {windDuringRain.windDirection}
          </p>
          <p className="mt-0.5 text-[11px] text-text-muted">
            {windDuringRain.hourLabel}
          </p>
        </div>
      </div>

      {weather.length > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-text-muted">
          Forecast: {weather.slice(0, 3).join(', ')}
        </p>
      )}

      {hazards.length > 0 && (
        <div className="mt-2 flex items-start gap-2 text-sm text-warning/90">
          <ShieldAlert className="mt-0.5 size-4" />
          <p>{hazards.join(', ')}</p>
        </div>
      )}

      <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-text">
        {avoidOutdoor ? (
          <ShieldAlert className="mt-0.5 size-4 text-warning/90" />
        ) : (
          <Umbrella className="mt-0.5 size-4 text-primary/85" />
        )}
        <p>
          {avoidOutdoor
            ? 'Coach call: keep intensity indoors or wait for a cleaner window.'
            : 'Coach call: outdoor is workable, but keep traction and visibility in mind.'}
        </p>
      </div>
    </section>
  );
}
