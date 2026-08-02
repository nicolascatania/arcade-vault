import SalonTabs from "@/components/SalonTabs";
import { getGames } from "@/lib/supabase/games";

export default async function HallOfFamePage() {
  const games = await getGames();
  return <SalonTabs games={games} />;
}
