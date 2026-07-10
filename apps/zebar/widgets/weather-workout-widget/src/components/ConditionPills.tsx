import { CloudRain, Droplets, Thermometer, Wind } from 'lucide-react';
import type { ScoredDay, ScoredHour } from '../lib/workout-weather-score';
import { cn } from '../utils/cn';

interface ConditionPillsProps {
  day: ScoredDay;
  compact?: boolean;
}

function bestHour(day: ScoredDay): ScoredHour {
  return day.hours.reduce((best, hour) => (hour.score > best.score ? hour : best));
}

export function ConditionPills({ day, compact = false }: ConditionPillsProps) {
  const hour = bestHour(day);
  const rain = hour.precipProbability ?? 0;
  const humidity = hour.humidity;
  const dewPoint = hour.dewPointF;
  const windLabel = hour.windGustMph
    ? `${hour.windSpeedMph}-${hour.windGustMph} mph ${hour.windDirection}`
    : `${hour.windSpeedMph} mph ${hour.windDirection}`;

  const items = [
    {
      label: `${hour.temperatureF}°F`,
      Icon: Thermometer,
      tone: hour.temperatureF > 80 ? 'danger' : hour.temperatureF > 72 ? 'warning' : 'good',
    },
    {
      label: windLabel,
      Icon: Wind,
      tone:
        hour.windRelationship === 'tailwind'
          ? 'good'
          : hour.windSpeedMph >= 13 || (hour.windGustMph ?? 0) >= 20
            ? 'danger'
            : 'warning',
    },
    {
      label: `${rain}% rain`,
      Icon: CloudRain,
      tone: rain > 50 ? 'danger' : rain > 30 ? 'warning' : 'good',
    },
    {
      label: dewPoint === null ? 'dew n/a' : `${dewPoint}° dew`,
      Icon: Droplets,
      tone: dewPoint !== null && dewPoint > 65 ? 'danger' : dewPoint !== null && dewPoint > 60 ? 'warning' : 'good',
    },
    {
      label: humidity === null ? 'humidity n/a' : `${humidity}% humid`,
      Icon: Droplets,
      tone: humidity !== null && humidity > 75 ? 'danger' : humidity !== null && humidity > 65 ? 'warning' : 'good',
    },
  ] as const;

  return (
    <div className={cn('flex flex-wrap gap-1.5', compact && 'gap-1')}>
      {items.map(({ label, Icon, tone }) => (
        <div
          key={label}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-transparent px-2 py-1 text-xs font-medium',
            compact && 'px-1.5 py-0.5 text-[11px]',
            tone === 'good' && 'bg-success/10 text-success/85',
            tone === 'warning' && 'bg-warning/10 text-warning/85',
            tone === 'danger' && 'bg-danger/10 text-danger/85'
          )}
        >
          <Icon className="size-3" strokeWidth={2.5} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
