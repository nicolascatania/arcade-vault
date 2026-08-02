"use client";

import { useEffect, useRef } from "react";
import { AsteroidsEngine, H, W } from "@/lib/games/asteroids/engine";
import type { GameComponentProps, GameEngineHandle } from "@/lib/games/registry";

export function AsteroidsGame({ onSnapshot, onReady }: GameComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new AsteroidsEngine(ctx);
    engine.init();

    let rafId = 0;
    let lastTime: number | null = null;

    const handleKeydown = (e: KeyboardEvent) => engine.handleKeydown(e.code);
    const handleKeyup = (e: KeyboardEvent) => engine.handleKeyup(e.code);
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
