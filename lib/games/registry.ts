import type { ComponentType } from "react";
import { AsteroidsGame } from "@/components/games/AsteroidsGame";
import { TetrisGame } from "@/components/games/TetrisGame";
import { ArkanoidGame } from "@/components/games/ArkanoidGame";
import { SerpentinaGame } from "@/components/games/SerpentinaGame";
import { W as ROCAS_W, H as ROCAS_H } from "@/lib/games/asteroids/engine";
import { W as CAIDA_W, H as CAIDA_H } from "@/lib/games/tetris/engine";
import { W as BLOQUE_BUSTER_W, H as BLOQUE_BUSTER_H } from "@/lib/games/arkanoid/engine";
import { W as SERPENTINA_W, H as SERPENTINA_H } from "@/lib/games/serpentina/engine";

export interface GameEngineHandle {
  pause(): void;
  resume(): void;
  end(): void;
  destroy(): void;
}

export interface GameSnapshot {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface GameComponentProps {
  onSnapshot: (snapshot: GameSnapshot) => void;
  onReady: (handle: GameEngineHandle) => void;
}

export type GameComponent = ComponentType<GameComponentProps>;

// La resolución interna real de cada motor es la única fuente de verdad para el
// aspect-ratio del CRT en /jugar/[id] — así el layout se calcula solo, sin un
// mapa de ratios hardcodeado por id que hay que recordar actualizar en cada
// juego nuevo (eso fue justamente lo que rompió el encuadre de serpentina).
export interface GameRegistryEntry {
  component: GameComponent;
  width: number;
  height: number;
}

export const GAME_REGISTRY: Record<string, GameRegistryEntry> = {
  rocas: { component: AsteroidsGame, width: ROCAS_W, height: ROCAS_H },
  caida: { component: TetrisGame, width: CAIDA_W, height: CAIDA_H },
  "bloque-buster": { component: ArkanoidGame, width: BLOQUE_BUSTER_W, height: BLOQUE_BUSTER_H },
  serpentina: { component: SerpentinaGame, width: SERPENTINA_W, height: SERPENTINA_H },
};
