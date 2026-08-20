/** Lightweight localStorage persistence for settings + best wave. */

const KEY = 'cardboard-balloons-v1';

export interface PersistedState {
  bestWave: number;
  autoStart: boolean;
  speed: 1 | 2;
}

const DEFAULTS: PersistedState = { bestWave: 0, autoStart: true, speed: 2 };

export function loadPersisted(): PersistedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      bestWave: typeof parsed.bestWave === 'number' ? parsed.bestWave : 0,
      autoStart: typeof parsed.autoStart === 'boolean' ? parsed.autoStart : true,
      speed: parsed.speed === 1 || parsed.speed === 2 ? parsed.speed : 2,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePersisted(state: PersistedState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode etc.) — ignore.
  }
}
