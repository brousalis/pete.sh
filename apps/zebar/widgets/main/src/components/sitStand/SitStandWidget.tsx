import { useWidgetSetting } from '@petehome/config';
import { Chip } from '@petehome/ui';
import { AnimatePresence, motion } from 'framer-motion';
import { Armchair, ArrowUpFromLine, Footprints, Volume2, VolumeOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../utils/cn';
import { useTransitionNotifier } from './useTransitionNotifier';

type ActivityState = 'sit' | 'stand' | 'walk';

interface ActivityInfo {
  state: ActivityState;
  progress: number;
  remainingSeconds: number;
  isUrgent: boolean;
}

const PHASE_SIT_END = 2400; // 40 minutes in seconds
const PHASE_STAND_END = 3300; // 55 minutes in seconds
const PHASE_WALK_END = 3600; // 60 minutes in seconds

const URGENCY_THRESHOLDS: Record<ActivityState, number> = {
  sit: 300, // last 5 minutes
  stand: 120, // last 2 minutes
  walk: 30, // last 30 seconds
};

const STATE_CONFIG: Record<
  ActivityState,
  {
    label: string;
    Icon: typeof Armchair;
    colorClass: string;
    strokeClass: string;
    borderClass: string;
  }
> = {
  sit: {
    label: 'SIT',
    Icon: Armchair,
    colorClass: 'text-success',
    strokeClass: 'stroke-success',
    borderClass: 'border-success',
  },
  stand: {
    label: 'STAND',
    Icon: ArrowUpFromLine,
    colorClass: 'text-warning',
    strokeClass: 'stroke-warning',
    borderClass: 'border-warning',
  },
  walk: {
    label: 'WALK',
    Icon: Footprints,
    colorClass: 'text-primary',
    strokeClass: 'stroke-primary',
    borderClass: 'border-primary',
  },
};

function getActivityInfo(totalSeconds: number): ActivityInfo {
  if (totalSeconds < PHASE_SIT_END) {
    const remaining = PHASE_SIT_END - totalSeconds;
    return {
      state: 'sit',
      progress: (totalSeconds / PHASE_SIT_END) * 100,
      remainingSeconds: remaining,
      isUrgent: remaining <= URGENCY_THRESHOLDS.sit,
    };
  }
  if (totalSeconds < PHASE_STAND_END) {
    const elapsed = totalSeconds - PHASE_SIT_END;
    const duration = PHASE_STAND_END - PHASE_SIT_END;
    const remaining = PHASE_STAND_END - totalSeconds;
    return {
      state: 'stand',
      progress: (elapsed / duration) * 100,
      remainingSeconds: remaining,
      isUrgent: remaining <= URGENCY_THRESHOLDS.stand,
    };
  }
  const elapsed = totalSeconds - PHASE_STAND_END;
  const duration = PHASE_WALK_END - PHASE_STAND_END;
  const remaining = PHASE_WALK_END - totalSeconds;
  return {
    state: 'walk',
    progress: (elapsed / duration) * 100,
    remainingSeconds: remaining,
    isUrgent: remaining <= URGENCY_THRESHOLDS.walk,
  };
}

function formatRemaining(seconds: number): string {
  const m = Math.ceil(seconds / 60);
  return `${m}m`;
}

function ProgressRing({
  percentage,
  strokeColorClass,
}: {
  percentage: number;
  strokeColorClass: string;
}) {
  const size = 100;
  const strokeWidth = 14;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center rounded-full overflow-hidden">
      <svg className="h-3.5 w-3.5" width={size} height={size} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius + strokeWidth / 2}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="stroke-background"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className={strokeColorClass}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
    </div>
  );
}

export default function SitStandWidget() {
  const [now, setNow] = useState(() => new Date());
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);
  const prevStateRef = useRef<ActivityState | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => setNow(new Date()), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const [notificationsEnabled] = useWidgetSetting('main', 'sitStandNotifications');
  const [muted, setMuted] = useState(false);

  const totalSeconds = now.getMinutes() * 60 + now.getSeconds();
  const activity = useMemo(() => getActivityInfo(totalSeconds), [totalSeconds]);
  const config = STATE_CONFIG[activity.state];

  useTransitionNotifier(activity.state, notificationsEnabled && !muted);

  const stateJustChanged =
    prevStateRef.current !== null && prevStateRef.current !== activity.state;
  if (prevStateRef.current !== activity.state) {
    prevStateRef.current = activity.state;
  }

  const tooltip = `Sit :00-:40 · Stand :40-:55 · Walk :55-:00\n${config.label} — ${formatRemaining(activity.remainingSeconds)} remaining`;

  return (
    <motion.div
      className="h-full flex items-center"
      animate={
        stateJustChanged ? { scale: [1, 1.08, 1] } : undefined
      }
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      <Chip
        className={cn(
          'flex items-center gap-1.5 h-full pl-2.5 pr-2',
          activity.isUrgent && 'animate-pulse',
          activity.isUrgent && config.borderClass
        )}
        title={tooltip}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activity.state}
            className={cn('flex items-center gap-1.5', config.colorClass)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2 }}
          >
            <config.Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
            <p className="font-medium">{config.label}</p>
          </motion.div>
        </AnimatePresence>
        <ProgressRing
          percentage={activity.progress}
          strokeColorClass={config.strokeClass}
        />
        <button
          onClick={() => setMuted(m => !m)}
          className={cn(
            'flex items-center justify-center transition-colors',
            muted ? 'text-text-muted' : config.colorClass,
          )}
          title={muted ? 'Unmute notifications' : 'Mute notifications'}
        >
          {muted
            ? <VolumeOff className="h-3 w-3" strokeWidth={2.5} />
            : <Volume2 className="h-3 w-3" strokeWidth={2.5} />
          }
        </button>
      </Chip>
    </motion.div>
  );
}
