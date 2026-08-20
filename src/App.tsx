import { useCallback, useEffect } from 'react';
import { useGame } from './hooks/useGame';
import { Hud } from './components/Hud';
import { Shop } from './components/Shop';
import { TowerPanel } from './components/TowerPanel';
import { Overlays } from './components/Overlays';
import { GameEngine } from './game/engine';
import { BOARD_H, BOARD_W } from './game/config/map';

export default function App() {
  const { engine, renderer, canvasRef, snap, actions } = useGame();

  // Keyboard shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        // Prevent page scroll; Space toggles game speed.
        e.preventDefault();
        if (snap.phase === 'playing') {
          actions.setSpeed(snap.speed === 1 ? 2 : 1);
        }
      } else if (e.key === 'Enter') {
        if (snap.phase === 'playing' && !snap.paused && snap.countdown === 0 && snap.wave < snap.totalWaves) {
          actions.startWave();
        }
      } else if (e.key === 'Escape') {
        if (engine.placingKind) actions.cancelPlacing();
        else if (engine.selectedTowerId !== null) actions.selectTower(null);
        else actions.togglePause();
      } else if (e.key === 'p' || e.key === 'P') {
        actions.togglePause();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [engine, snap.phase, snap.paused, snap.countdown, snap.wave, snap.totalWaves, actions]);

  // Canvas pointer interaction.
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = GameEngine.toBoard(e.clientX, e.clientY, canvas);
      renderer.setHoverCell(engine.cellAtPoint(x, y));
    },
    [canvasRef, engine, renderer],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const { x, y } = GameEngine.toBoard(e.clientX, e.clientY, canvas);
      const cell = engine.cellAtPoint(x, y);
      if (engine.placingKind) {
        actions.placeAtCell(cell);
        return;
      }
      // Select a tower under the cursor (within its footprint).
      const hit = engine.towers.find((t) => Math.hypot(t.x - x, t.y - y) < 26);
      actions.selectTower(hit ? hit.id : null);
    },
    [canvasRef, engine, actions],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (engine.placingKind) actions.cancelPlacing();
      else if (engine.selectedTowerId !== null) actions.selectTower(null);
    },
    [engine, actions],
  );

  const selectedTower = engine.getTower(snap.selectedTowerId);

  return (
    <div className="min-h-screen bg-[#3a2c1c] flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-[1500px] bg-[#f6ead2] rounded-2xl border-8 border-[#8a6a42] shadow-[0_16px_0_rgba(0,0,0,0.35)] overflow-hidden flex flex-col lg:flex-row">
        {/* Gameplay column. */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Hud
            snap={snap}
            onPause={actions.togglePause}
            onSpeed={actions.setSpeed}
            onAutoStart={actions.toggleAutoStart}
            onStartWave={actions.startWave}
          />

          {/* Board area (fixed aspect ratio, scales responsively). */}
          <div className="relative w-full" style={{ aspectRatio: `${BOARD_W} / ${BOARD_H}` }}>
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full block cursor-crosshair"
              style={{ imageRendering: 'auto' }}
              onPointerMove={handlePointerMove}
              onPointerLeave={() => renderer.setHoverCell(-1)}
              onClick={handleClick}
              onContextMenu={handleContextMenu}
              aria-label="Game board"
            />

            {snap.paused && snap.phase === 'playing' && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(62,45,25,0.4)] pointer-events-none">
                <div className="bg-[#f6ead2] border-4 border-[#8a6a42] rounded-xl px-8 py-4 text-2xl font-bold text-[#5d4527] shadow-[0_8px_0_rgba(90,60,30,0.4)]">
                  ⏸ Paused
                </div>
              </div>
            )}

            {selectedTower && snap.phase === 'playing' && (
              <TowerPanel
                snap={snap}
                tower={selectedTower}
                onUpgrade={actions.buyUpgrade}
                onSell={actions.sellTower}
                onTargeting={actions.setTargeting}
                onClose={() => actions.selectTower(null)}
              />
            )}

            <Overlays snap={snap} onStart={actions.startGame} onRestart={actions.restart} />
          </div>
        </div>

        {/* External shop sidebar (moves below the board on narrow screens). */}
        <Shop snap={snap} onBeginPlacing={actions.beginPlacing} />
      </div>
    </div>
  );
}
