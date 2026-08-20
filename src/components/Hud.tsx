import type { GameSnapshot } from '../game/types';

interface Props {
  snap: GameSnapshot;
  onPause: () => void;
  onSpeed: (s: 1 | 2) => void;
  onAutoStart: () => void;
  onStartWave: () => void;
}

/** Top HUD bar: lives, money, wave info, pause/speed/auto-start controls. */
export function Hud({ snap, onPause, onSpeed, onAutoStart, onStartWave }: Props) {
  const waveLabel =
    snap.wave === 0
      ? 'Ready'
      : snap.wave >= snap.totalWaves && snap.enemiesRemaining === 0
        ? 'Final wave'
        : `Wave ${snap.wave}/${snap.totalWaves}`;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 bg-[#f6ead2] border-b-4 border-[#8a6a42] shadow-[0_3px_0_rgba(90,60,30,0.25)]">
      <div className="flex items-center gap-1.5" aria-label={`${snap.lives} lives remaining`}>
        <span aria-hidden className="text-xl">❤️</span>
        <span className="font-bold text-[#7a2e20] tabular-nums">{snap.lives}</span>
        <span className="text-xs text-[#8a6a42]">/ {snap.maxLives}</span>
      </div>

      <div className="flex items-center gap-1.5" aria-label={`${snap.money} money`}>
        <span aria-hidden className="text-xl">💰</span>
        <span className="font-bold text-[#3d6b35] tabular-nums">${snap.money}</span>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-[#5d4527]">{waveLabel}</span>
        {snap.waveName && <span className="text-xs text-[#8a6a42] truncate">{snap.waveName}</span>}
        <span className="text-xs text-[#8a6a42] tabular-nums" aria-label="Enemies remaining">
          🎈 {snap.enemiesRemaining} left
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {snap.countdown > 0 && (
          <span className="text-sm font-bold text-[#b03a2e] tabular-nums" role="status">
            Next wave in {Math.ceil(snap.countdown)}s
          </span>
        )}
        {snap.countdown === 0 && snap.wave < snap.totalWaves && !snap.paused && (
          <button className="btn btn-primary text-sm" onClick={onStartWave}>
            ▶ Start wave (Enter)
          </button>
        )}

        <button
          className={`btn ${snap.paused ? 'btn-primary' : ''}`}
          onClick={onPause}
          aria-pressed={snap.paused}
          aria-label={snap.paused ? 'Resume game' : 'Pause game'}
        >
          {snap.paused ? '▶ Resume' : '⏸ Pause'}
        </button>

        <div className="flex rounded-lg overflow-hidden border-2 border-[#8a6a42]" role="group" aria-label="Game speed">
          {([1, 2] as const).map((s) => (
            <button
              key={s}
              className={`px-3 py-1.5 text-sm font-bold transition-colors ${
                snap.speed === s ? 'bg-[#8a6a42] text-[#fff8ea]' : 'bg-[#e8d5b0] text-[#5d4527] hover:bg-[#dcc49a]'
              }`}
              aria-pressed={snap.speed === s}
              onClick={() => onSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        <button
          className={`btn text-sm ${snap.autoStart ? 'btn-selected' : ''}`}
          aria-pressed={snap.autoStart}
          onClick={onAutoStart}
          title="Automatically start the next wave after a short countdown"
        >
          Auto-start {snap.autoStart ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
