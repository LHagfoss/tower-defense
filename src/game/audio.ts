import type { GameEvent } from './types';

const POP_URL = '/sounds/balloon_pop.wav';

/**
 * WebAudio sound service. The engine emits GameEvents through this boundary;
 * this maps them to decoded buffers and plays them. Sound is on by default;
 * the UI layer toggles it via setEnabled.
 */
export class AudioService {
  private enabled = true;
  private ctx: AudioContext | null = null;
  private popBuffer: AudioBuffer | null = null;
  private loadingPop = false;

  setEnabled(on: boolean) {
    this.enabled = on;
  }

  isEnabled() {
    return this.enabled;
  }

  /**
   * Call from a user gesture (e.g. first key press) so the AudioContext is
   * created and resumed while the gesture is still active — browsers block
   * audio until then. Safe to call repeatedly.
   */
  prime() {
    this.ensureCtx();
  }

  /** Lazily create the AudioContext (browsers require a user gesture first). */
  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** Fetch + decode the pop sound once; stays silent if the asset is missing. */
  private ensurePopBuffer(ctx: AudioContext) {
    if (this.popBuffer || this.loadingPop) return;
    this.loadingPop = true;
    fetch(POP_URL)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => ctx.decodeAudioData(data))
      .then((buf) => {
        this.popBuffer = buf;
      })
      .catch(() => {
        // Missing/corrupt asset — remain silent rather than spamming errors.
      })
      .finally(() => {
        this.loadingPop = false;
      });
  }

  private playPop() {
    const ctx = this.ensureCtx();
    if (!ctx) return;
    this.ensurePopBuffer(ctx);
    if (!this.popBuffer) return;
    const src = ctx.createBufferSource();
    src.buffer = this.popBuffer;
    // Random pitch so rapid pops don't sound machine-gunned.
    src.playbackRate.value = 0.85 + Math.random() * 0.3;
    src.connect(ctx.destination);
    src.start();
  }

  /** Subscribe to game events. Kept as the single audio entry point. */
  handle(event: GameEvent) {
    if (!this.enabled) return;
    if (event.type === 'pop') this.playPop();
    // Future: map more events (shot, leak, wave-clear, ...) to sounds here.
  }
}

export const audio = new AudioService();
