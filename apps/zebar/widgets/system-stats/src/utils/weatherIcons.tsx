import {
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from 'lucide-react';
import { WeatherOutput } from 'zebar';

export const getWeatherIcon = (
  weatherOutput: WeatherOutput,
  iconClass: string
) => {
  switch (weatherOutput.status) {
    case 'clear_day':
      return <Sun strokeWidth={3} className={iconClass} size={16} />;
    case 'clear_night':
      return <Moon strokeWidth={3} className={iconClass} size={16} />;
    case 'cloudy_day':
      return <CloudSun strokeWidth={3} className={iconClass} size={16} />;
    case 'cloudy_night':
      return <CloudMoon strokeWidth={3} className={iconClass} size={16} />;
    case 'light_rain_day':
    case 'light_rain_night':
    case 'thunder_night':
      return <CloudDrizzle strokeWidth={3} className={iconClass} size={16} />;
    case 'heavy_rain_day':
      return <CloudRain strokeWidth={3} className={iconClass} size={16} />;
    case 'heavy_rain_night':
      return <CloudRain strokeWidth={3} className={iconClass} size={16} />;
    case 'snow_day':
      return <CloudSnow strokeWidth={3} className={iconClass} size={16} />;
    case 'snow_night':
      return <CloudSnow strokeWidth={3} className={iconClass} size={16} />;
    case 'thunder_day':
      return <CloudLightning strokeWidth={3} className={iconClass} size={16} />;
    default:
      return <Cloud strokeWidth={3} className={iconClass} size={16} />;
  }
};
