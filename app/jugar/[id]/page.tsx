"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useRef, useState } from "react";
import { GAMES } from "@/data";
import { GAME_REGISTRY, type GameEngineHandle, type GameSnapshot } from "@/lib/games/registry";

export default function GamePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  const GameComponent = GAME_REGISTRY[id];
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const handleRef = useRef<GameEngineHandle | null>(null);
  const [paused, setPaused] = useState(false);

  const togglePause = () => {
    const handle = handleRef.current;
    if (!handle) return;
    if (paused) {
      handle.resume();
    } else {
      handle.pause();
    }
    setPaused((p) => !p);
  };

  const endGame = () => {
    handleRef.current?.end();
  };

  const lives = snapshot ? "♥ ".repeat(snapshot.lives).trim() : "♥ ♥ ♥";
  const level = snapshot ? String(snapshot.level).padStart(2, "0") : "03";
  const score = snapshot ? snapshot.score.toLocaleString("es-AR") : "12.450";

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>INVITADO</div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{lives}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{level}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={GameComponent ? togglePause : undefined}>
            {GameComponent && paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={GameComponent ? endGame : undefined}>
            FIN
          </button>
          <Link className="btn ghost" href={`/juego/${game.id}`}>SALIR</Link>
        </div>
      </div>

      <div className="crt" style={GameComponent ? { maxWidth: "90%", margin: "0 auto" } : undefined}>
        <div className="crt-screen">
          {GameComponent ? (
            <GameComponent
              onSnapshot={setSnapshot}
              onReady={(handle) => {
                handleRef.current = handle;
              }}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>
    </div>
  );
}
