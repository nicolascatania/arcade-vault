import GamesGrid from "@/components/GamesGrid";
import { getGames } from "@/lib/supabase/games";

export default async function Home() {
  const games = await getGames();
  return <GamesGrid games={games} />;
}
