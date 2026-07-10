/** Google-style compact display: minutes.seconds (e.g. 3.51 = 3m 51s) */
export function formatCompactMs(ms: number): string {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);

  if (h > 0) {
    const pad2 = (n: number) => String(n).padStart(2, '0');
    return `${h}:${pad2(m)}:${pad2(s)}`;
  }

  if (m > 0) {
    return `${m}.${String(s).padStart(2, '0')}`;
  }

  return `${s}.${String(cs).padStart(2, '0')}`;
}

/** Full precision: m:ss.cs or h:mm:ss.cs */
export function formatFullMs(ms: number): string {
  const totalCs = Math.floor(ms / 10);
  const cs = totalCs % 100;
  const totalSec = Math.floor(totalCs / 100);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad2 = (n: number) => String(n).padStart(2, '0');

  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}.${pad2(cs)}`;
  return `${m}:${pad2(s)}.${pad2(cs)}`;
}

/** Compact chip display: m:ss when >= 1 min, else s */
export function formatChipMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60);
  const h = Math.floor(m / 60);

  if (h > 0) {
    return `${h}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  if (m > 0) {
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${s}s`;
}
