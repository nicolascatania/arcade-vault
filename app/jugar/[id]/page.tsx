"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GAMES } from "@/data";
import { GAME_REGISTRY, type GameEngineHandle, type GameSnapshot } from "@/lib/games/registry";
import ScoreModal from "@/components/ScoreModal";

const CRT_PADDING = 48; // .crt padding: 24px arriba + 24px abajo
const CRT_BOTTOM_MARGIN = 14; // .crt-bottom margin-top
const VIEWPORT_SAFETY_MARGIN = 56; // aire extra debajo de todo, antes del borde de la ventana

export default function GamePlayerPage() {
  const { id } = useParams<{ id: string }>();
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  const GameComponent = GAME_REGISTRY[id];
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const handleRef = useRef<GameEngineHandle | null>(null);
  const [paused, setPaused] = useState(false);
  const crtRef = useRef<HTMLDivElement>(null);
  const crtBottomRef = useRef<HTMLDivElement>(null);
  const [crtWidth, setCrtWidth] = useState<number | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const modalShownRef = useRef(false);

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.status === "gameover" && snapshot.score > 0 && !modalShownRef.current) {
      modalShownRef.current = true;
      setShowScoreModal(true);
    }
    if (snapshot.status === "playing") {
      modalShownRef.current = false;
    }
  }, [snapshot]);

  useLayoutEffect(() => {
    if (!GameComponent) return;

    const recalc = () => {
      const crt = crtRef.current;
      const crtBottom = crtBottomRef.current;
      if (!crt || !crtBottom) return;

      const avPlayer = crt.closest(".av-player");
      const parentWidth = crt.parentElement?.clientWidth ?? crt.clientWidth;
      const crtRect = crt.getBoundingClientRect();

      // El body es flex-col con el footer pegado abajo (min-h-full), así que su posición
      // no sirve como referencia: usamos su alto propio + el padding-bottom del contenedor,
      // que son constantes independientes del tamaño del crt.
      const avPlayerPaddingBottom = avPlayer ? parseFloat(getComputedStyle(avPlayer).paddingBottom) || 0 : 0;
      const footerEl = document.querySelector("footer");
      const footerHeight = footerEl ? footerEl.getBoundingClientRect().height : 0;
      const spaceBelowCrt = avPlayerPaddingBottom + footerHeight;

      const availableHeight = window.innerHeight - crtRect.top - spaceBelowCrt - VIEWPORT_SAFETY_MARGIN;

      // crtHeight = (crtWidth - CRT_PADDING) * 0.75 + CRT_PADDING + CRT_BOTTOM_MARGIN + crtBottomHeight
      // despejando crtWidth para availableHeight:
      const fixedVertical = CRT_PADDING * 0.25 + CRT_BOTTOM_MARGIN + crtBottom.getBoundingClientRect().height;
      const widthFromHeight = (availableHeight - fixedVertical) / 0.75;

      setCrtWidth(Math.max(280, Math.min(parentWidth, widthFromHeight)));
    };

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [GameComponent]);

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

      <div
        ref={crtRef}
        className="crt"
        style={GameComponent ? { width: crtWidth ? `${crtWidth}px` : "100%", margin: "0 auto" } : undefined}
      >
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
        <div className="crt-bottom" ref={crtBottomRef}>
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {showScoreModal && snapshot && (
        <ScoreModal gameId={game.id} score={snapshot.score} onClose={() => setShowScoreModal(false)} />
      )}
    </div>
  );
}
