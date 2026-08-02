import HomePage from "@/components/HomePage";
import { getGames } from "@/lib/supabase/games";

export default async function Home() {
  const games = await getGames();
  return <HomePage games={games.slice(0, 6)} />;
}
