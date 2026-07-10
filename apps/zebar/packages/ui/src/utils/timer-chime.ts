const CHIME_FREQUENCIES: [number, number] = [523, 784];
const CHIME_DURATION = 0.15;
const CHIME_GAP = 0.1;
const CHIME_GAIN = 0.2;

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playTimerCompleteChime(): void {
  const ctx = getAudioContext();

  const play = () => {
    const now = ctx.currentTime;
    for (const [i, freq] of CHIME_FREQUENCIES.entries()) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * (CHIME_DURATION + CHIME_GAP);
      gain.gain.setValueAtTime(CHIME_GAIN, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + CHIME_DURATION);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + CHIME_DURATION + 0.01);
    }
  };

  if (ctx.state === 'suspended') {
    ctx.resume().then(play);
  } else {
    play();
  }
}
