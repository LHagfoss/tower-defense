import type { GameSnapshot } from '../game/types';

interface Props {
  snap: GameSnapshot;
  onStart: () => void;
  onRestart: () => void;
}

/** Full-board overlays for menu / win / lose states. */
export function Overlays({ snap, onStart, onRestart }: Props) {
  if (snap.phase === 'menu') {
    return (
      <Overlay>
        <h1 className="text-4xl font-bold text-[#5d4527] mb-2">🎈 Cardboard Balloons</h1>
        <p className="text-[#8a6a42] max-w-md text-center mb-1">
          A handmade tower defense. Balloons drift along the path — build cardboard towers to pop them before they escape.
        </p>
        <p className="text-sm text-[#8a6a42] max-w-md text-center mb-4">
          Balloon color = layers left (red 1 → pink 5). Damage pops layers. Survive all 10 waves!
        </p>
        {snap.bestWave > 0 && (
          <p className="text-sm font-bold text-[#3d6b35] mb-4">Best: wave {snap.bestWave}</p>
        )}
        <button className="btn btn-primary text-xl px-8 py-3" onClick={onStart} autoFocus>
          ▶ Start Game
        </button>
        <div className="mt-4 text-xs text-[#8a6a42]">
          Click a tower card, then the board to place · Esc cancels / pauses · Space toggles 1×/2× · Enter starts a wave
        </div>
      </Overlay>
    );
  }

  if (snap.phase === 'won') {
    return (
      <Overlay>
        <h1 className="text-4xl font-bold text-[#3d6b35] mb-2">🎉 You Win!</h1>
        <p className="text-[#8a6a42] mb-4">
          All {snap.totalWaves} waves cleared with {snap.lives} lives to spare.
        </p>
        <button className="btn btn-primary text-xl px-8 py-3" onClick={onRestart} autoFocus>
          ↻ Play Again
        </button>
      </Overlay>
    );
  }

  if (snap.phase === 'lost') {
    return (
      <Overlay>
        <h1 className="text-4xl font-bold text-[#b03a2e] mb-2">💥 Out of Lives</h1>
        <p className="text-[#8a6a42] mb-4">
          The balloons got away on wave {snap.wave}.
          {snap.bestWave > 0 && ` Best: wave ${snap.bestWave}.`}
        </p>
        <button className="btn btn-primary text-xl px-8 py-3" onClick={onRestart} autoFocus>
          ↻ Try Again
        </button>
      </Overlay>
    );
  }

  return null;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(62,45,25,0.55)]">
      <div className="bg-[#f6ead2] border-4 border-[#8a6a42] rounded-2xl shadow-[0_10px_0_rgba(90,60,30,0.4)] px-10 py-8 flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
