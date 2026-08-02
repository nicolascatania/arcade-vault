"use client";

import { useState } from "react";
import { insertScore } from "@/lib/supabase/scores-client";

export default function ScoreModal({
  gameId,
  score,
  onClose,
}: {
  gameId: string;
  score: number;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const valid = name.trim().length >= 3 && name.trim().length <= 12;

  const handleSave = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await insertScore(gameId, name.trim(), score);
      setSaved(true);
      setTimeout(onClose, 1600);
    } catch (err) {
      console.error("ScoreModal: failed to save score:", err);
      setSaving(false);
    }
  };

  return (
    <div className="modal-bd">
      <div className="modal">
        <h2>GAME OVER</h2>
        <div className="final-label">PUNTAJE FINAL</div>
        <div className="final">{score.toLocaleString("es-AR")}</div>

        {saved ? (
          <div className="toast-saved">PUNTAJE GUARDADO ✓</div>
        ) : (
          <>
            <div className="input-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="TU ALIAS (3-12 caracteres)"
                maxLength={12}
                autoFocus
              />
            </div>
            <div className="actions">
              <button className="btn" onClick={handleSave} disabled={!valid || saving}>
                {saving ? "GUARDANDO…" : "GUARDAR"}
              </button>
              <button className="btn ghost" onClick={onClose} disabled={saving}>
                CANCELAR
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
