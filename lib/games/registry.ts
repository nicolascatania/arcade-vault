import type { ComponentType } from "react";
import { AsteroidsGame } from "@/components/games/AsteroidsGame";

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

export const GAME_REGISTRY: Record<string, GameComponent> = {
  rocas: AsteroidsGame,
};
