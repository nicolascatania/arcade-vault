"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { seededScores, type Game, type ScoreRow } from "@/data";
import { createClient } from "@/lib/supabase/client";
import { GAME_REGISTRY } from "@/lib/games/registry";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export default function SalonTabs({ games }: { games: Game[] }) {
  const [tab, setTab] = useState(games[0].id);
  const mockRows = useMemo(() => seededScores(tab.length * 23 + 7, 12), [tab]);
  const [realRowsByTab, setRealRowsByTab] = useState<Record<string, ScoreRow[]>>({});

  useEffect(() => {
    if (!(tab in GAME_REGISTRY)) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("scores")
          .select("name, score, created_at")
          .eq("game_id", tab)
          .order("score", { ascending: false })
          .limit(12);
        if (error || !data) throw error ?? new Error("no data");
        if (!cancelled) {
          setRealRowsByTab((prev) => ({
            ...prev,
            [tab]: data.map((row, i) => ({
              rank: i + 1,
              name: row.name,
              score: row.score,
              date: formatDate(row.created_at),
            })),
          }));
        }
      } catch (err) {
        console.error("SalonTabs real fetch fallback to seededScores:", err);
        if (!cancelled) setRealRowsByTab((prev) => ({ ...prev, [tab]: seededScores(tab.length * 23 + 7, 12) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const rows = tab in GAME_REGISTRY ? realRowsByTab[tab] ?? [] : mockRows;

  if (tab in GAME_REGISTRY && !(tab in realRowsByTab)) {
    return (
      <div className="av-hall fade-in">
        <div className="hall-head">
          <h1>SALÓN DE LA FAMA</h1>
          <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
        </div>
        <div className="hall-tabs">
          {games.map((g) => (
            <button key={g.id} className={"chip" + (tab === g.id ? " active" : "")} onClick={() => setTab(g.id)}>
              {g.title}
            </button>
          ))}
        </div>
        <div style={{ textAlign: "center", padding: 60 }}>
          <span className="spinner"></span>
        </div>
      </div>
    );
  }

  const podium = rows.slice(0, 3);
  const hasPodium = podium.length === 3;

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA</p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <button key={g.id} className={"chip" + (tab === g.id ? " active" : "")} onClick={() => setTab(g.id)}>
            {g.title}
          </button>
        ))}
      </div>

      {hasPodium && (
        <div className="podium">
          <div className="podium-slot silver">
            <div className="rank-num">02</div>
            <div className="name">{rows[1].name}</div>
            <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
            <div className="date">{rows[1].date}</div>
          </div>
          <div className="podium-slot gold">
            <div className="pixel" style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}>CAMPEÓN</div>
            <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>01</div>
            <div className="name">{rows[0].name}</div>
            <div className="score" style={{ fontSize: 20 }}>{rows[0].score.toLocaleString("es-ES")}</div>
            <div className="date">{rows[0].date}</div>
          </div>
          <div className="podium-slot bronze">
            <div className="rank-num">03</div>
            <div className="name">{rows[2].name}</div>
            <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
            <div className="date">{rows[2].date}</div>
          </div>
        </div>
      )}

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-faint)" }}>
            AÚN NO HAY PUNTAJES REGISTRADOS
          </div>
        )}
        {rows.map((r, i) => (
          <div
            key={r.rank}
            className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
            <div className="pl">{r.name}</div>
            <div className="sc">{r.score.toLocaleString("es-ES")}</div>
            <div className="dt">{r.date}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link className="btn lg" href="/games">VOLVER A LA BIBLIOTECA</Link>
      </div>
    </div>
  );
}
