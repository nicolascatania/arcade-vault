"use client";

import { useEffect, useRef } from "react";
import { ArkanoidEngine, H, W } from "@/lib/games/arkanoid/engine";
import type { GameComponentProps, GameEngineHandle } from "@/lib/games/registry";

export function ArkanoidGame({ onSnapshot, onReady }: GameComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new ArkanoidEngine(ctx);
    engine.init();

    let rafId = 0;
    let lastTime: number | null = null;

    const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "Space"]);
    const handleKeydown = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      engine.handleKeydown(e.code);
    };
    const handleKeyup = (e: KeyboardEvent) => {
      if (GAME_KEYS.has(e.code)) e.preventDefault();
      engine.handleKeyup(e.code);
    };
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("keyup", handleKeyup);

    const loop = (ts: number) => {
      const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
      lastTime = ts;
      engine.update(dt);
      engine.draw();
      onSnapshot(engine.getSnapshot());
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const handle: GameEngineHandle = {
      pause() {
        engine.pause();
      },
      resume() {
        engine.resume();
      },
      end() {
        engine.end();
      },
      destroy() {
        cancelAnimationFrame(rafId);
        window.removeEventListener("keydown", handleKeydown);
        window.removeEventListener("keyup", handleKeyup);
      },
    };
    onReady(handle);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("keyup", handleKeyup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ width: "100%", height: "auto", aspectRatio: "4 / 3", display: "block" }}
    />
  );
}
