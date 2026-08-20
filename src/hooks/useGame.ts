import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine } from '../game/engine';
import { Renderer } from '../game/renderer';
import { audio } from '../game/audio';
import { loadPersisted, savePersisted } from '../game/persist';
import { TOWERS } from '../game/config/towers';
import { BOARD_H, BOARD_W } from '../game/config/map';
import type { GameSnapshot, TargetingMode, TowerKind, UpgradePathId } from '../game/types';

/**
 * Bridges the imperative engine to React. The rAF loop drives engine.update +
 * renderer.render directly (no React state per frame). React re-renders only
 * from a throttled snapshot (~10Hz) and explicit action calls.
 */
export function useGame() {
  const persisted = useMemo(loadPersisted, []);
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) {
    const e = new GameEngine();
    e.autoStart = persisted.autoStart;
    e.speed = persisted.speed;
    e.bestWave = persisted.bestWave;
    engineRef.current = e;
  }
  const rendererRef = useRef<Renderer | null>(null);
  if (!rendererRef.current) rendererRef.current = new Renderer();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [snap, setSnap] = useState<GameSnapshot>(() => engineRef.current!.getSnapshot());
  const snapRef = useRef<GameSnapshot>(snap);
  snapRef.current = snap;

  const refresh = useCallback(() => {
    setSnap(engineRef.current!.getSnapshot());
  }, []);

  // Persist settings when they change.
  useEffect(() => {
    const e = engineRef.current!;
    savePersisted({ bestWave: e.bestWave, autoStart: e.autoStart, speed: e.speed });
  }, [snap.autoStart, snap.speed, snap.bestWave]);

  // Main loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSnap = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const engine = engineRef.current!;
      engine.update(dt);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          if (canvas.width !== BOARD_W * dpr || canvas.height !== BOARD_H * dpr) {
            canvas.width = BOARD_W * dpr;
            canvas.height = BOARD_H * dpr;
          }
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          rendererRef.current!.render(ctx, engine, now / 1000);
        }
      }
      // Throttled snapshot for React (~10Hz) + immediate on phase changes.
      const s = engine.getSnapshot();
      if (now - lastSnap > 100 || s.phase !== snapRef.current.phase) {
        lastSnap = now;
        snapRef.current = s;
        setSnap(s);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Wire the audio boundary.
  useEffect(() => {
    const engine = engineRef.current!;
    engine.onEvent = (e) => audio.handle(e);
  }, []);

  // ------------------------------------------------------------- actions

  const startGame = useCallback(() => {
    engineRef.current!.reset();
    refresh();
  }, [refresh]);

  const restart = useCallback(() => {
    engineRef.current!.reset();
    refresh();
  }, [refresh]);

  const togglePause = useCallback(() => {
    const e = engineRef.current!;
    if (e.phase === 'playing') e.paused = !e.paused;
    refresh();
  }, [refresh]);

  const setSpeed = useCallback((s: 1 | 2) => {
    engineRef.current!.speed = s;
    refresh();
  }, [refresh]);

  const toggleAutoStart = useCallback(() => {
    const e = engineRef.current!;
    e.autoStart = !e.autoStart;
    refresh();
  }, [refresh]);

  const startWave = useCallback(() => {
    engineRef.current!.startNextWave();
    refresh();
  }, [refresh]);

  const beginPlacing = useCallback((kind: TowerKind) => {
    const e = engineRef.current!;
    if (e.phase !== 'playing') return;
    if (e.money < TOWERS[kind].cost) return;
    e.placingKind = e.placingKind === kind ? null : kind;
    e.selectedTowerId = null;
    refresh();
  }, [refresh]);

  const cancelPlacing = useCallback(() => {
    const e = engineRef.current!;
    if (e.placingKind) {
      e.placingKind = null;
      refresh();
    }
  }, [refresh]);

  const selectTower = useCallback((id: number | null) => {
    const e = engineRef.current!;
    e.selectedTowerId = id;
    e.placingKind = null;
    refresh();
  }, [refresh]);

  const placeAtCell = useCallback((cell: number) => {
    const e = engineRef.current!;
    if (!e.placingKind) return;
    const t = e.placeTower(cell, e.placingKind);
    if (t) refresh();
  }, [refresh]);

  const buyUpgrade = useCallback((towerId: number, path: UpgradePathId) => {
    const e = engineRef.current!;
    if (e.buyUpgrade(towerId, path)) refresh();
  }, [refresh]);

  const sellTower = useCallback((towerId: number) => {
    const e = engineRef.current!;
    e.sellTower(towerId);
    refresh();
  }, [refresh]);

  const setTargeting = useCallback((towerId: number, mode: TargetingMode) => {
    engineRef.current!.setTargeting(towerId, mode);
    refresh();
  }, [refresh]);

  return {
    engine: engineRef.current!,
    renderer: rendererRef.current!,
    canvasRef,
    snap,
    actions: {
      startGame,
      restart,
      togglePause,
      setSpeed,
      toggleAutoStart,
      startWave,
      beginPlacing,
      cancelPlacing,
      selectTower,
      placeAtCell,
      buyUpgrade,
      sellTower,
      setTargeting,
    },
  };
}
