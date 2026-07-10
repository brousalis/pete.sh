import { useWidgetSetting } from '@petehome/config';
import { useEffect, useState } from 'react';

export function TimeDisplay() {
  const [now, setNow] = useState(() => new Date());
  const [timeFormat] = useWidgetSetting('main', 'timeFormat');
  const [timeLocale] = useWidgetSetting('main', 'timeLocale');

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Ensure we have valid values (useWidgetSetting might return undefined initially)
  const safeTimeFormat = timeFormat || 'EEE d MMM t';
  const safeTimeLocale = timeLocale || 'en-GB';

  // If custom settings are configured, format manually with configured locale
  // Otherwise use provider output
  const isCustomConfigured =
    safeTimeFormat !== 'EEE d MMM t' || safeTimeLocale !== 'en-GB';

  if (isCustomConfigured) {
    // Parse ICU format string to Intl.DateTimeFormat options
    let formatOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: 'numeric',
    };

    // Add date components based on format string
    if (safeTimeFormat.includes('E')) formatOptions.weekday = 'short';
    if (safeTimeFormat.includes('d')) formatOptions.day = 'numeric';
    if (safeTimeFormat.includes('M')) formatOptions.month = 'short';
    if (safeTimeFormat.includes('y')) formatOptions.year = 'numeric';
    if (safeTimeFormat.includes('s')) formatOptions.second = 'numeric';

    // Check for 12-hour format (h = 12-hour, a = AM/PM marker)
    if (safeTimeFormat.includes('h') || safeTimeFormat.includes('a')) {
      formatOptions.hour12 = true;
    }

    try {
      return (
        <div className="h-full flex items-center justify-center px-1">
          {new Intl.DateTimeFormat(safeTimeLocale, formatOptions)
            .format(now)
            .replace(/,/g, '')}
        </div>
      );
    } catch (e) {
      // Fallback if format parsing fails - use safe defaults
      try {
        return (
          <div className="h-full flex items-center justify-center px-1">
            {now.toLocaleTimeString(safeTimeLocale)}
          </div>
        );
      } catch (fallbackError) {
        // Ultimate fallback - no locale
        return (
          <div className="h-full flex items-center justify-center px-1">
            {now.toLocaleTimeString()}
          </div>
        );
      }
    }
  }

  return (
    <div className="h-full flex items-center justify-center px-1">
      {new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: 'numeric',
      })
        .format(now)
        .replace(/,/g, '')}
    </div>
  );
}
