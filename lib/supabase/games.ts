import { createClient as createServerClient } from "@/lib/supabase/server";
import { GAMES, seededScores, type Game, type ScoreRow } from "@/data";

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getGames(): Promise<Game[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from("games").select("*");
    if (error || !data || data.length === 0) throw error ?? new Error("no data");
    return data as Game[];
  } catch (err) {
    console.error("getGames() fallback to static GAMES:", err);
    return GAMES;
  }
}

export async function getGame(id: string): Promise<Game | null> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.from("games").select("*").eq("id", id).single();
    if (error || !data) throw error ?? new Error("no data");
    return data as Game;
  } catch (err) {
    console.error("getGame() fallback to static GAMES:", err);
    return GAMES.find((g) => g.id === id) ?? null;
  }
}

export async function getTopScores(gameId: string, limit: number): Promise<ScoreRow[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("scores")
      .select("name, score, created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: false })
      .limit(limit);
    if (error || !data) throw error ?? new Error("no data");
    return data.map((row, i) => ({
      rank: i + 1,
      name: row.name,
      score: row.score,
      date: formatDate(row.created_at),
    }));
  } catch (err) {
    console.error("getTopScores() fallback to seededScores:", err);
    return seededScores(gameId.length * 17 + 3, limit);
  }
}
