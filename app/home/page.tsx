import HomePage from "@/components/HomePage";
import { GAMES } from "@/data";

export default function Home() {
  return <HomePage games={GAMES.slice(0, 6)} />;
}
