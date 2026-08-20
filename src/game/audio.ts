import type { GameEvent } from './types';

/**
 * No-op audio service. The engine emits GameEvents through this boundary so
 * real sound effects can be dropped in later without touching game logic.
 * This version intentionally plays nothing.
 */
export class AudioService {
  private enabled = false;

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  isEnabled() {
    return this.enabled;
  }

  /** Subscribe to game events. Kept as the single audio entry point. */
  handle(_event: GameEvent) {
    if (!this.enabled) return;
    // Future: map events to WebAudio buffers / Howl sounds here.
  }
}

export const audio = new AudioService();
