import { useEffect, useRef } from 'react';

type ActivityState = 'sit' | 'stand' | 'walk';

interface TransitionMessage {
  title: string;
  body: string;
}

const TRANSITION_MESSAGES: Record<ActivityState, TransitionMessage> = {
  sit: {
    title: 'Time to Sit',
    body: 'Sit down and focus for 40 minutes',
  },
  stand: {
    title: 'Time to Stand',
    body: 'Stand up and stretch for 15 minutes',
  },
  walk: {
    title: 'Time to Walk',
    body: 'Take a 5-minute walk break',
  },
};

const CHIME_FREQUENCIES: Record<ActivityState, [number, number]> = {
  sit: [660, 440],
  stand: [440, 660],
  walk: [523, 784],
};

const CHIME_DURATION = 0.12;
const CHIME_GAP = 0.08;
const CHIME_GAIN = 0.15;

function playChime(audioCtx: AudioContext, state: ActivityState) {
  const [freq1, freq2] = CHIME_FREQUENCIES[state];
  const now = audioCtx.currentTime;

  for (const [i, freq] of [freq1, freq2].entries()) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(CHIME_GAIN, now);

    const start = now + i * (CHIME_DURATION + CHIME_GAP);
    gain.gain.setValueAtTime(CHIME_GAIN, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + CHIME_DURATION);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + CHIME_DURATION + 0.01);
  }
}

function showNotification(state: ActivityState): Notification | null {
  if (typeof Notification === 'undefined') return null;
  if (Notification.permission !== 'granted') return null;

  const msg = TRANSITION_MESSAGES[state];
  try {
    return new Notification(msg.title, { body: msg.body, silent: true });
  } catch {
    return null;
  }
}

export function useTransitionNotifier(
  currentState: ActivityState,
  enabled: boolean,
) {
  const prevStateRef = useRef<ActivityState | null>(null);
  const activeNotificationRef = useRef<Notification | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const prevState = prevStateRef.current;
    prevStateRef.current = currentState;

    if (prevState === null || prevState === currentState || !enabled) return;

    if (activeNotificationRef.current) {
      activeNotificationRef.current.close();
    }
    activeNotificationRef.current = showNotification(currentState);

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => playChime(ctx, currentState));
    } else {
      playChime(ctx, currentState);
    }
  }, [currentState, enabled]);

  useEffect(() => {
    return () => {
      activeNotificationRef.current?.close();
      audioCtxRef.current?.close();
    };
  }, []);
}
